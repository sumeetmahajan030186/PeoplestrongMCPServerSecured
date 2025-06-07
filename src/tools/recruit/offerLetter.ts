import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerOfferLetter(server: McpServer) {
  server.tool(
    "createOfferLetter",
    "Generate offer letter for a candidate",
    {
      candidateId: z.string()
    },
    async ({ candidateId }, extra) => {
      console.log("Tool called with candidateId:", candidateId);
      console.log("Extra meta passed:", extra);

      return {
        content: [
          {
            type: "text",
            text: `Offer letter created for ${candidateId} `
          }
        ]
      };
    }
  );
}
