// src/server.ts ----------------------------------------------------
import "dotenv/config";
import express from "express";
import { z } from "zod";
import crypto from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport }
  from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpAuthRouter }
  from "@modelcontextprotocol/sdk/server/auth/router.js";
import { makeKeycloakProvider } from "./auth/keycloakProvider.js";

const app = express();
app.use(express.json());

// ------------------------------------------------------------------
// 1.  Auth-provider + router
// ------------------------------------------------------------------
const issuer  = new URL(process.env.OIDC_ISSUER!);
const baseUrl = new URL(process.env.PUBLIC_BASE_URL!);
const auth    = makeKeycloakProvider(issuer);

app.use(
  mcpAuthRouter({
    provider:  auth,
    issuerUrl: issuer,
    baseUrl
  })
);

// ------------------------------------------------------------------
// 2.  Discovery document  (.well-known/mcp-tools)
// ------------------------------------------------------------------
app.get(
  "/mcp/.well-known/mcp-tools",
  async (req, res, next) => {
    /* ① check for Bearer token */
    const authHeader = req.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      /* → not authenticated: challenge */
      res.set("WWW-Authenticate", `Bearer realm="OAuth"`);
      return res.status(401).end();
    }

    /* ② validate the token with your provider */
    try {
      // strip "Bearer "
      const info = await auth.verifyAccessToken(authHeader.slice(7));
      if (!info.scopes.includes("offer:write"))
      	throw new Error("insufficient_scope");
      return next(); // token OK → fall through to JSON below
    } catch {
      res.set("WWW-Authenticate", `realm="OAuth"`);
      return res.status(401).end();
    }
  },
  (_req, res) => {
    /* ③ authenticated response */
    res.json({
      version: "2025-03-26",
      tools: {
        createOfferLetter: {
          description: "Generate offer letter for a candidate",
          parameters: {
            type: "object",
            properties: { candidateId: { type: "string" } },
            required: ["candidateId"]
          },
          auth: { type: "oauth2", client_id: "claude-mcp", scopes: ["offer:write"] }
        }
      }
    });
  }
);

app.get("/mcp/.well-known/oauth-protected-resource", (_req, res) => {
  res.json({
    resource: "https://peoplestrongmcpserversecured.onrender.com/mcp",
    authorization_servers: [
      "https://uat-auth.peoplestrong.com/auth/realms/3"
    ]
  });
});
// ------------------------------------------------------------------
// 3.  Session-based /mcp endpoint (Streamable-HTTP)
// ------------------------------------------------------------------
const cache: Record<string, StreamableHTTPServerTransport> = {};

app.post("/mcp", async (req, res) => {

  const authHeader = req.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    /* → not authenticated: challenge */
    res.set("WWW-Authenticate", `Bearer realm="OAuth"`);
    return res.status(401).end();
  }
	
  const sid = req.headers["mcp-session-id"] as string | undefined;
  let transport = sid && cache[sid];

  if (!transport) {
    transport = new StreamableHTTPServerTransport({
      /* use caller-supplied session id or generate a new one */
      sessionIdGenerator: () => sid ?? crypto.randomUUID()
    });
    cache[transport.sessionId] = transport;

    const srv = new McpServer({
      name: "PeoplestrongMCP",
      version: "2.0.0",
      authProvider: auth
    });

    srv.tool(
      "createOfferLetter",
      "Generate offer letter for a candidate",
      { candidateId: z.string() },            // ZodRawShape
      async ({ candidateId }) => ({
        content: [
          { type: "text",
            text: `Offer letter created for candidate ${candidateId}` }
        ]
      })
    );

    await srv.connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", (req, res) => {

  const authHeader = req.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    /* → not authenticated: challenge */
    res.set("WWW-Authenticate", `Bearer realm="OAuth"`);
    return res.status(401).end();
  }

  const sid = req.headers["mcp-session-id"] as string;
  cache[sid]?.handleRequest(req, res);
});

// ------------------------------------------------------------------
const port = Number(process.env.PORT) || 8000;
app.listen(port, () =>
  console.log(`✅ MCP server running on port : ${process.env.PORT} or 8000`)
);

