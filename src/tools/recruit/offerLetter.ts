import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { transportSessionTokenContext, transportAccessTokenContext, streams } from "../../server.js";

export function registerOfferLetter(server: McpServer) {
  server.tool(
    "createOfferLetter",
    "Generate offer letter for a candidate",
    {
      candidateId: z.string()
    },
    async ({ candidateId }, extra) => {
      const sessionId = extra.sessionId;

      if (!sessionId) throw new Error("Missing sessionId in tool context");

      // Lookup transport from session ID
      const transport = streams.get(sessionId);
      const sessionToken = transportSessionTokenContext.get(sessionId)?.sessionToken;
      const accessToken  = transportAccessTokenContext.get(sessionId)?.accessToken;

      console.log("Tool called with candidateId:", candidateId);
      console.log("Session ID:", sessionId);
      console.log("Session Token:", sessionToken);
      console.log("Access Token:", accessToken);


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
