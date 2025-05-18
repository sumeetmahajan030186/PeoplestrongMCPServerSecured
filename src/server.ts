// src/server.ts ----------------------------------------------------
import "dotenv/config";
import express from "express";
import { z } from "zod";
import crypto from "node:crypto";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport }
  from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { makeKeycloakProvider } from "./auth/keycloakProvider.js";

const app = express();
app.use(express.json());

// ------------------------------------------------------------------
// 1.  Auth-provider + router
// ------------------------------------------------------------------
const issuer  = new URL(process.env.OIDC_ISSUER!);
const baseUrl = new URL(process.env.PUBLIC_BASE_URL!);
const auth    = makeKeycloakProvider(issuer);

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
      `${issuer}`
    ]
  });
});

app.get('/.well-known/oauth-authorization-server', (_req, res) => {
  const base = issuer.replace(/\/$/, '');     // defensively trim trailing “/”

  res.json({
    issuer:                      base,
    authorization_endpoint:      `${base}/protocol/openid-connect/auth`,
    token_endpoint:              `${base}/protocol/openid-connect/token`,
    token_introspection_endpoint:`${base}/protocol/openid-connect/token/introspect`,
    userinfo_endpoint:           `${base}/protocol/openid-connect/userinfo`,
    end_session_endpoint:        `${base}/protocol/openid-connect/logout`,
    jwks_uri:                    `${base}/protocol/openid-connect/certs`,
    check_session_iframe:        `${base}/protocol/openid-connect/login-status-iframe.html`,
    grant_types_supported: [
      'authorization_code', 'implicit', 'refresh_token',
      'password', 'client_credentials'
    ],
    response_types_supported: [
      'code', 'none', 'id_token', 'token', 'id_token token',
      'code id_token', 'code token', 'code id_token token'
    ],
    subject_types_supported: ['public', 'pairwise'],
    id_token_signing_alg_values_supported: [
      'PS384','ES384','RS384','HS256','HS512','ES256',
      'RS256','HS384','ES512','PS256','PS512','RS512'
    ],
    id_token_encryption_alg_values_supported: ['RSA-OAEP','RSA1_5'],
    id_token_encryption_enc_values_supported: ['A128GCM','A128CBC-HS256'],
    userinfo_signing_alg_values_supported: [
      'PS384','ES384','RS384','HS256','HS512','ES256',
      'RS256','HS384','ES512','PS256','PS512','RS512','none'
    ],
    request_object_signing_alg_values_supported: [
      'PS384','ES384','RS384','HS256','HS512','ES256',
      'RS256','HS384','ES512','PS256','PS512','RS512','none'
    ],
    response_modes_supported: ['query','fragment','form_post'],
    registration_endpoint:       `${base}/clients-registrations/openid-connect`,
    token_endpoint_auth_methods_supported: [
      'private_key_jwt','client_secret_basic','client_secret_post',
      'tls_client_auth','client_secret_jwt'
    ],
    token_endpoint_auth_signing_alg_values_supported: [
      'PS384','ES384','RS384','HS256','HS512','ES256',
      'RS256','HS384','ES512','PS256','PS512','RS512'
    ],
    claims_supported: [
      'aud','sub','iss','auth_time','name','given_name','family_name',
      'preferred_username','email','acr'
    ],
    claim_types_supported: ['normal'],
    claims_parameter_supported:  false,
    scopes_supported: [
      'openid','offer:write','microprofile-jwt','web-origins','roles',
      'offline_access','phone','address','email','profile'
    ],
    request_parameter_supported:          true,
    request_uri_parameter_supported:      true,
    require_request_uri_registration:     true,
    code_challenge_methods_supported:     ['plain','S256'],
    tls_client_certificate_bound_access_tokens: true,
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

