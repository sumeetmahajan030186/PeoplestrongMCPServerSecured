import { z } from "zod";
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { transportSessionTokenContext, transportAccessTokenContext, streams } from "../../../server.js";
export function registerCourseList(server: McpServer) {
  server.tool(
    "getCourseList",
    "Guide users or AI agents to retrieve a learner's assigned or in-progress courses.",
    {},
    async (_params, extra) => {
      const sessionId = extra.sessionId;
      if (!sessionId) throw new Error("Missing sessionId in tool context");

      const transport = streams.get(sessionId);
      const sessionToken = transportSessionTokenContext.get(sessionId)?.sessionToken;
      const accessToken = transportAccessTokenContext.get(sessionId)?.accessToken;

      if (!sessionToken) throw new Error("No sessionToken available for session " + sessionId);

      const url = `${process.env.LEARNING_UAT_URL}/dashboard/courseList/`;

      const headers = {
        'os': 'Web',
        'sessiontoken': sessionToken,
      };

      const body = JSON.stringify({
        filterType: null,
        courseType: null,
        status: null
      });

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body
      });

      if (!res.ok) throw new Error(`Course List API responded with ${res.status}`);

      const json = await res.json();

      return {
        content: [
          {
            type: "text",
            text: `Fetched course list : ${JSON.stringify(json)}`
          }
        ]
      };
    }
  );
}
