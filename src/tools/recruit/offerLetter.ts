import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerOfferLetter(server: McpServer) {
  server.tool(
    "createOfferLetter",
    "Generate offer letter for a candidate",
    { candidateId: z.string() },
    async ({ candidateId }) => ({
      content: [
        { type: "text", text: `Offer letter created for candidate ${candidateId}` }
      ]
    })
  );
}