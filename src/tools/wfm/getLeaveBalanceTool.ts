// getLeaveBalanceTool.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "dotenv/config";
import { z } from "zod";
import { transportSessionTokenContext } from "../../server.js";
import { fetchAccessToken, fetchDomain } from "../toolsUtility.js";

/** ------------------ Schema ------------------ */
const leaveBalanceInputSchema = z.object({}).passthrough().describe("Flexible schema to pass employee context");

type LeaveBalanceInput = z.infer<typeof leaveBalanceInputSchema>;

/** ------------------ Service ------------------ */
async function fetchLeaveBalance(input: LeaveBalanceInput, sessionToken: string, endpoint: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      sessiontoken: sessionToken
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(`Leave balance API request failed with status ${response.status}`);
  }

  return await response.json();
}

/** ------------------ Tool Registration ------------------ */
export function registerGetLeaveBalanceTool(server: McpServer) {
  server.tool(
    "getLeaveBalance",
    "Fetches the leave balance for an employee. Input should contain identifying fields such as employeeId or session context.",
    leaveBalanceInputSchema.shape,
    async (input: LeaveBalanceInput, extra: any) => {
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

        const endpoint = `https://${tenantDomain}/api/worklife/timeoff/leave/genAI/leave-balance`;
        console.log("Leave Balance Endpoint:", endpoint);

        const result = await fetchLeaveBalance(input, sessionToken, endpoint);

        return {
          content: [
            {
              type: "text",
              text: `📊 Leave balance retrieved:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      } catch (error) {
        console.error("[getLeaveBalance] Error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to retrieve leave balance: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            }
          ]
        };
      }
    }
  );
}
