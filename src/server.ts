// server.ts — SSE-based MCP server behind OAuth

import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import jwt from "jsonwebtoken";
import { registerTools } from "./tools/tools.js";
import { makeKeycloakProvider } from "./auth/keycloakProvider.js";

const app = express();
app.use(express.json());

// ----- OAuth provider setup -----
const issuer = new URL(process.env.OIDC_ISSUER!);
const auth = makeKeycloakProvider(issuer);

// Well-known endpoints for OAuth
app.get("/.well-known/oauth-protected-resource", (_req, res) => {
  res.json({
    resource: `${process.env.PUBLIC_BASE_URL}/`,
    authorization_servers: [issuer.href]
  });
});

app.get("/.well-known/oauth-authorization-server", (_req, res) => {
  res.redirect(307, `${issuer}/.well-known/openid-configuration`);
});

// ----- JWT middleware -----
app.use((req, res, next) => {
  const authHeader = req.headers["authorization"];
  console.log("AuthHeader:",authHeader);
  if (!authHeader?.startsWith("Bearer ")) {
    res.set("WWW-Authenticate", `Bearer realm=\"OAuth\"`);
    return res.status(401).end();
  }
  const token = authHeader.slice(7);
  auth.verifyAccessToken(token)
    .then(() => next())
    .catch(() => {
      res.set("WWW-Authenticate", `Bearer realm=\"OAuth\"`);
      return res.status(401).end();
    });
});

// ----- MCP Server -----
const mcp = new McpServer({
  name: "PeoplestrongMCP",
  version: "2.0.0",
  authProvider: auth
});

registerTools(mcp);

const streams = new Map<string, SSEServerTransport>();

// SSE connection entry
app.get("/", (req, res) => {
  const t = new SSEServerTransport("/messages", res);
  streams.set(t.sessionId, t);
  mcp.connect(t).catch(console.error);
  res.on("close", () => streams.delete(t.sessionId));
});

// Session reconnect endpoint (optional)
app.get("/sse", (req, res) => {
  const id = String(req.query.id || "");
  if (!id) return res.status(400).send("session id required");
  const t = new SSEServerTransport("/messages", res);
  streams.set(id, t);
  mcp.connect(t).catch(console.error);
  res.on("close", () => streams.delete(id));
});

// Tool and chat messages
app.post("/messages", async (req, res) => {
  const id = String(req.query.sessionId || req.query.id || req.body.sessionId || req.body.id || "");
  const t = streams.get(id);
  if (!t) return res.status(202).end();

  await t.handlePostMessage(req, res, req.body);
});



const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`✅ SSE MCP server (OAuth) on port ${port}`));
