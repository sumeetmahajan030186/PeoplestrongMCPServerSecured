import { z } from "zod";
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { transportSessionTokenContext, transportAccessTokenContext, streams } from "../../../server.js";

export function registerSaveCheckIn(server: McpServer) {
  server.tool(
    "saveCheckIn",
    "Saves a check-in update for a specific goal and milestone",
    {
      milestoneId: z.string().default("").optional(),
      goalId: z.string().default("").optional(),
      newValue: z.string(),
      oldValue: z.string(),
      empCheckInDate: z.string().default(Date.now().toString()).optional(),
      comment: z.string().default("").optional(),
    },
    async (
      { milestoneId = "", goalId = "", newValue, oldValue, empCheckInDate = Date.now().toString(), comment = "" },
      extra: any
    ) => {
      const sessionId = extra.sessionId;
      if (!sessionId) throw new Error("Missing sessionId in tool context");

      const sessionToken = transportSessionTokenContext.get(sessionId)?.sessionToken;
      const accessToken = transportAccessTokenContext.get(sessionId)?.accessToken;
      if (!sessionToken) throw new Error(`No sessionToken for session ${sessionId}`);

      const url = `${process.env.PERFORMANCE_UAT_URL}/service/oneweb/api/goal/employee/saveCheckIn`;
      const headers: Record<string, string> = {
        'content-type': 'application/json; charset=utf-8',
        'sessiontoken': sessionToken
      };

      const body = JSON.stringify({
        newValue,
        oldValue,
        goalId,
        milestoneId,
        empCheckInDate,
        comment
      });

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body
      });

      if (!res.ok) {
        throw new Error(`saveCheckIn API responded with ${res.status}`);
      }

      const json = await res.json();

      return {
        content: [
          {
            type: "text",
            text: `Check-in saved successfully: ${JSON.stringify(json)}`
          }
        ]
      };
    }
  );
}
