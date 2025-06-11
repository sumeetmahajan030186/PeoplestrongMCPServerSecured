// server.ts — SSE-based MCP server behind OAuth

import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerTools } from "./tools/tools.js";
import { makeKeycloakProvider } from "./auth/keycloakProvider.js";
import { generateSessionToken, isValidSessionToken } from "./auth/sessionTokenProvider.js";

// Node’s built-in fs:
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1) Load your system prompt from an external file at startup:
const promptPath = join(__dirname, "prompts", "system.txt");
const systemPrompt = readFileSync(promptPath, "utf-8");


// 2) Validate the system prompt using zod
declare global {
  namespace Express {
    interface Request {
      sessionToken?: string;
      accessToken?: string;
    }
  }
}

const app = express();
app.use(express.json());

// ----- OAuth provider setup -----
const issuer = new URL(process.env.OIDC_ISSUER!);
const auth = makeKeycloakProvider(issuer);
let toolsRegistered = false;
let sessionTokenFound = false;
const sessionTokenCache = new Map<string, string>();

// Helper function to add timestamp to logs
const logWithTimestamp = (...args: any[]) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]`, ...args);
};

// Well-known endpoints for OAuth
app.get("/.well-known/oauth-protected-resource1", (_req, res) => {
  res.json({
    resource: process.env.PUBLIC_BASE_URL,
    authorization_servers: [issuer.href]
  });
});

app.get('/.well-known/oauth-authorization-server1', (_req, res) => {
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

const mcp = new McpServer({
  name: "PeoplestrongMCP",
  version: "2.0.0",
  authProvider: auth,
  prompt: {
    system: systemPrompt
  }
});

// ----- JWT middleware -----
app.use(async(req, res, next) => {
//   const authHeader = req.headers["authorization"];
//   logWithTimestamp("AuthHeader:",authHeader);
//   if (!authHeader?.startsWith("Bearer ")) {
//     res.set("WWW-Authenticate", `Bearer realm=\"OAuth\"`);
//     return res.status(401).end();
//   }
//  const accessToken = authHeader.slice(7);
   const accessToken = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJRSjVtQW9yN1dRV011TDcxUG5DMURTM2dGTzdvWVpoSnphUkYtelFVQ2lnIn0.eyJleHAiOjE3NDk1NDg3NTksImlhdCI6MTc0OTU0ODQ1OSwiYXV0aF90aW1lIjoxNzQ5NTQ3MDU4LCJqdGkiOiJjZjU2OTFiNi03Zjg3LTQ0YWQtODM0NC0zZDZhMzE3ZWIyMGUiLCJpc3MiOiJodHRwczovL3VhdC1hdXRoLnBlb3BsZXN0cm9uZy5jb20vYXV0aC9yZWFsbXMvcGVvcGxlc3Ryb25nLWlkcCIsImF1ZCI6ImFjY291bnQiLCJzdWIiOiJiOGQ0NTBlZC1hMWEyLTRjOGUtOTY2YS03MDk3OWQyZTI5YWMiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJ2WTFhcVFtZTRudlZVRUpKIiwic2Vzc2lvbl9zdGF0ZSI6IjNmZjA1ZmE1LTlkMmYtNDNhNC1iYmIzLTVmYTMyMGZjYjA0MyIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoiZW1haWwgcHJvZmlsZSIsIk9yZ0lEIjoiMTkiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInRlbmFudF9kb21haW4iOiJocm1zLnVhdC5wZW9wbGVzdHJvbmcuY29tIiwicHJlZmVycmVkX3VzZXJuYW1lIjoic3VtZWV0Lm1haGFqYW5AcGVvcGxlc3Ryb25nLmNvbSJ9.a5huGy9w2zYFNKvXJWhNp7TYNIfxv6bb9PvU-AkQkABQvfCgC7nccYBKFihSB2wnYcJBoapmi7AU-WPOcW-pr_PzY_Yq52DZwGi7wJysNd0tPHbBBNOuy2yJ5qDgDrSC3fD70ZSvLa7h5Z4HmvcxzcdzmdhkXmOFQGF-pzSaZo4UfOd7yO7AnsPwJSb7bbG8FLr3O0wbR71h5iDn3UXD-RMVOznL_j81p8L_3DoTotT2wembyAqTXtd2sLJovIniHJrN4Dra0c5TPb4E628aYK1p4ppWYTtFjLTNB7KHbogAk3Nx_8nJJXhL3cwcV9T5zWzW9Cm_IrKEiveEZgmNnQ";
   if (sessionTokenCache.has(accessToken)){
       const sessionToken = sessionTokenCache.get(accessToken);
       if(await isValidSessionToken(sessionToken!,accessToken)) {
        req.accessToken = accessToken;
        req.sessionToken = sessionToken;
        sessionTokenFound = true;
        logWithTimestamp("Session token from cache:", req.sessionToken);
     }
    }
    if(!sessionTokenFound){
        try {
            const sessionToken = await generateSessionToken(accessToken);
            sessionTokenCache.set(accessToken, sessionToken);
            req.sessionToken = sessionToken;
            req.accessToken = accessToken;
        } catch (err) {
            console.error("Failed to generate session token", err);
            return res.status(500).send("Session initialization failed");
        }
    }
  logWithTimestamp("sessionToken : ",req.sessionToken,"accessToken : ",req.accessToken);

  if (!toolsRegistered) {
    registerTools(mcp);
    toolsRegistered = true;
  }

  next();
});

export const streams = new Map<string, SSEServerTransport>();
export const transportSessionTokenContext = new Map<string, { sessionToken: string }>();
export const transportAccessTokenContext = new Map<string, { accessToken: string }>();

// SSE connection entry
app.get("/", (req, res) => {
    logWithTimestamp("SSE connection established", req.headers["authorization"] ? "with auth" : "without auth");
    const t = new SSEServerTransport("/messages", res);
    streams.set(t.sessionId, t);
    if (req.sessionToken) {
        //logWithTimestamp("transportSessionTokenContext is set ",req.sessionToken);
        transportSessionTokenContext.set(t.sessionId, { sessionToken: req.sessionToken });
    }
    if(req.accessToken) {
        //logWithTimestamp("transportAccessTokenContext is set ",req.accessToken);
        transportAccessTokenContext.set(t.sessionId, { accessToken: req.accessToken });
    }
    mcp.connect(t).catch(console.error);
    res.on("close", () => streams.delete(t.sessionId));
});

// Session reconnect endpoint (optional)
app.get("/sse", (req, res) => {
    logWithTimestamp("in app.get(/sse) GET");
    const id = String(req.query.id || "");
    if (!id) return res.status(400).send("session id required");
    const t = new SSEServerTransport("/messages", res);
    streams.set(id, t);
    mcp.connect(t).catch(console.error);
    res.on("close", () => streams.delete(id));
});

// Tool and chat messages
app.post("/messages", async (req, res) => {
    logWithTimestamp("in app.post(/messages) POST");
  const id = String(req.query.sessionId || req.query.id || req.body.sessionId || req.body.id || "");
  const t = streams.get(id);

  if (!t) return res.status(202).end();

  const sessionToken = transportSessionTokenContext.get(id)?.sessionToken;
  const accessToken  = transportAccessTokenContext.get(id)?.accessToken;

  logWithTimestamp("Request body : ", req.body);
  logWithTimestamp("accessToken : ", accessToken);
  logWithTimestamp("sessionToken : ", sessionToken);

try {
  await t.handlePostMessage(req, res, req.body);
} catch (err) {
  console.error("Tool call failed:", err);
  res.status(500).send("Tool call failed");
}
});

const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () => logWithTimestamp(`✅ SSE MCP server (OAuth) on port ${port}`));
