import { z } from "zod";
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { transportSessionTokenContext, transportAccessTokenContext, streams } from "../../../server.js";

export function registerCourseEnroll(server: McpServer) {
  server.tool(
    "courseEnroll",
    "Enrolls the user into a course based on courseId and source.",
    {
      courseId: z.number(),
      source: z.string().optional().default("catalog"),
      courseLabel: z.number().optional(),
    },
    async ({ courseId, source = "catalog", courseLabel }, extra) => {
      const sessionId = extra.sessionId;

      if (!sessionId) throw new Error("Missing sessionId in tool context");

      const transport = streams.get(sessionId);
      const sessionToken = transportSessionTokenContext.get(sessionId)?.sessionToken;
      const accessToken = transportAccessTokenContext.get(sessionId)?.accessToken;

      if (!sessionToken) throw new Error("No sessionToken available for session " + sessionId);

      const url = `${process.env.LEARNING_UAT_URL}/course/courseEnroll/1`
        + `?courseId=${courseId}&source=${source}`
        + (courseLabel != null ? `&courseLabel=${courseLabel}` : "");

      const headers = {
        'os': 'Web',
        'sessiontoken': sessionToken
      };

      const res = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!res.ok) {
        throw new Error(`Course enrollment API responded with ${res.status}`);
      }

      const json = await res.json();

      return {
        content: [
          {
            type: "text",
            text: `Enrollment response: ${JSON.stringify(json)}`
          }
        ]
      };
    }
  );
}
