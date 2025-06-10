// getAttendanceStatusTool.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "dotenv/config";
import { z } from "zod";
import { transportSessionTokenContext } from "../../server.js";
import { fetchAccessToken, fetchDomain } from "../toolsUtility.js";

/** ------------------ Schema ------------------ */
const attendanceStatusSchema = z.object({
  startDate: z.string().describe("Start date in format 'dd MMM yyyy'"),
  endDate: z.string().describe("End date in format 'dd MMM yyyy'")
});

type AttendanceStatusInput = z.infer<typeof attendanceStatusSchema>;

/** ------------------ Service ------------------ */
async function fetchAttendanceStatus(
  { startDate, endDate }: AttendanceStatusInput,
  sessionToken: string,
  endpoint: string
) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      sessiontoken: sessionToken
    },
    body: JSON.stringify({ startDate, endDate })
  });

  if (!response.ok) {
    throw new Error(`Attendance API request failed with status ${response.status}`);
  }

  return await response.json();
}

/** ------------------ Tool Registration ------------------ */
export function registerGetAttendanceStatusTool(server: McpServer) {
  server.tool(
    "getAttendanceStatus",
    "Fetch attendance status for the employee between startDate and endDate.",
    attendanceStatusSchema.shape,
    async (input: AttendanceStatusInput, extra: any) => {
      try {
        const sessionId = extra.sessionId;
        if (!sessionId) throw new Error("Missing sessionId in tool context");

        const sessionToken = transportSessionTokenContext.get(sessionId)?.sessionToken;
        if (!sessionToken) 
          throw new Error("Missing sessionToken in tool context");
        console.log("Session Token:", sessionToken);

        const accessToken = fetchAccessToken(extra);
        console.log("Access Token:", accessToken);

        const tenantDomain: string = fetchDomain(accessToken);
        console.log("Tenant Domain:", tenantDomain);

        const endpoint = `https://${tenantDomain}/api/worklife/time/private/homeCards/myAttendance`;
        console.log("Attendance API Endpoint:", endpoint);

        const data = await fetchAttendanceStatus(input, sessionToken, endpoint);

        return {
          content: [
            {
              type: "text",
              text: `📅 Attendance status from ${input.startDate} to ${input.endDate}:\n${JSON.stringify(
                data,
                null,
                2
              )}`
            }
          ]
        };
      } catch (error) {
        console.error("[getAttendanceStatus] Error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to fetch attendance status: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            }
          ]
        };
      }
    }
  );
}
