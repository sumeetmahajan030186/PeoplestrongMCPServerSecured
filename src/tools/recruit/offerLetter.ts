import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { streams } from "../../server.js";

export function registerOfferLetter(server: McpServer) {
  server.tool(
    "createOfferLetter",
    "Generate offer letter for a candidate",
    { candidateId: z.string(), __meta__: z.any().optional() },
    async ({ candidateId }, __meta__) => {

    console.log("meta:", __meta__);

      return {
        content: [
          { type: "text", text: `Offer letter created for candidate ${candidateId}` }
        ]
      };
    }
  );
}