import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeKeycloakProvider } from "../auth/keycloakProvider.js";
import { registerTools } from "../tools/registerTools.js";

export function createMcpServer(): McpServer {
  const auth = makeKeycloakProvider(new URL(process.env.OIDC_ISSUER!));
  const mcp = new McpServer({
    name: "PeoplestrongMCP",
    version: "2.0.0",
    authProvider: auth,
  });

  registerTools(mcp);
  return mcp;
}
