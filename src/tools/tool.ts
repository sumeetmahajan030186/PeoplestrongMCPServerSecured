import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export abstract class Tool {
  constructor(protected server: McpServer) {}

  abstract register(): void;
}
