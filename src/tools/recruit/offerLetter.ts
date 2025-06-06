import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { streams } from "../../server.js";

export function registerOfferLetter(server: McpServer) {
  server.tool(
    "createOfferLetter",
    "Generate offer letter for a candidate",
    { candidateId: z.string() },
    async ({ candidateId }, context: any) => {
    const sessionToken = context.sessionToken ?? "[missing]";
    const accessToken = context.accessToken ?? "[missing]";
    const transport = context.transport;

    console.log("Session Token:", sessionToken);
    console.log("Access Token:", accessToken);
    console.log("Transport:", transport);

      return {
        content: [
          { type: "text", text: `Offer letter created for candidate ${candidateId}` }
        ]
      };
    }
  );
}