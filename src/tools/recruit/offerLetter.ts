import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { transportSessionTokenContext } from "../../server.js";
import { transportAccessTokenContext } from "../../server.js";

export function registerOfferLetter(server: McpServer) {
  server.tool(
    "createOfferLetter",
    "Generate offer letter for a candidate",
    { candidateId: z.string() },
    async ({ candidateId }, context: any) => {
      const transport = context.transport as SSEServerTransport;
      console.log("All transportSessionTokenContext keys:");
      for (const [key, value] of Array.from(transportSessionTokenContext.entries())) {
          console.log("→", key.sessionId, value.sessionToken);
      }
      const sessionTokenCtx = transportSessionTokenContext.get(transport);
      const accessTokenCtx = transportAccessTokenContext.get(transport);

      const sessionToken = sessionTokenCtx?.sessionToken ?? "[missing]";
      const accessToken = accessTokenCtx?.accessToken ?? "[missing]";
      console.log("Session Token:", sessionToken);
      console.log("Access Token:", accessToken);

      return {
        content: [
          { type: "text", text: `Offer letter created for candidate ${candidateId}` }
        ]
      };
    }
  );
}