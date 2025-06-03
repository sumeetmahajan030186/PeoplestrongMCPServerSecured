import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { transportContext } from "../../server.js";

export function registerOfferLetter(server: McpServer) {
  server.tool(
    "createOfferLetter",
    "Generate offer letter for a candidate",
    { candidateId: z.string() },
    async ({ candidateId }, context: any) => {
      const transport = context.transport as SSEServerTransport;
      const ctx = transportContext.get(transport);

      const sessionToken = ctx?.sessionToken ?? "[missing]";
      console.log("Session Token:", sessionToken);

      return {
        content: [
          { type: "text", text: `Offer letter created for candidate ${candidateId}` }
        ]
      };
    }
  );
}