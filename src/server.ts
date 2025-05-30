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

app.get('/.well-known/oauth-authorization-server', (_req, res) => {
   //res.json({"issuer":"https://atlassian-remote-mcp-production.atlassian-remote-mcp-server-production.workers.dev","authorization_endpoint":"https://mcp.atlassian.com/v1/authorize","token_endpoint":"https://atlassian-remote-mcp-production.atlassian-remote-mcp-server-production.workers.dev/v1/token","registration_endpoint":"https://atlassian-remote-mcp-production.atlassian-remote-mcp-server-production.workers.dev/v1/register","response_types_supported":["code"],"response_modes_supported":["query"],"grant_types_supported":["authorization_code","refresh_token"],"token_endpoint_auth_methods_supported":["client_secret_basic","client_secret_post","none"],"revocation_endpoint":"https://atlassian-remote-mcp-production.atlassian-remote-mcp-server-production.workers.dev/v1/token","code_challenge_methods_supported":["plain","S256"]});

  res.json({
    issuer:                      issuer,
    authorization_endpoint:      `${issuer}/protocol/openid-connect/auth`,
    token_endpoint:              `${issuer}/protocol/openid-connect/token`,
    token_introspection_endpoint:`${issuer}/protocol/openid-connect/token/introspect`,
    userinfo_endpoint:           `${issuer}/protocol/openid-connect/userinfo`,
    end_session_endpoint:        `${issuer}/protocol/openid-connect/logout`,
    jwks_uri:                    `${issuer}/protocol/openid-connect/certs`,
    check_session_iframe:        `${issuer}/protocol/openid-connect/login-status-iframe.html`,
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
    registration_endpoint:       `${issuer}/clients-registrations/openid-connect`,
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
    console.log("in app.get(/)",req);
  const t = new SSEServerTransport("/messages", res);
  streams.set(t.sessionId, t);
  mcp.connect(t).catch(console.error);
  res.on("close", () => streams.delete(t.sessionId));
});

// Session reconnect endpoint (optional)
app.get("/sse", (req, res) => {
        console.log("in app.get(/sse)",req);
  const id = String(req.query.id || "");
  if (!id) return res.status(400).send("session id required");
  const t = new SSEServerTransport("/messages", res);
  streams.set(id, t);
  mcp.connect(t).catch(console.error);
  res.on("close", () => streams.delete(id));
});

// Tool and chat messages
app.post("/messages", async (req, res) => {
        console.log("in app.post(/messages)",req);

  const id = String(req.query.sessionId || req.query.id || req.body.sessionId || req.body.id || "");
  const t = streams.get(id);
  if (!t) return res.status(202).end();

  await t.handlePostMessage(req, res, req.body);
});



const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => console.log(`✅ SSE MCP server (OAuth) on port ${port}`));
