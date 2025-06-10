// submitLeaveTool.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "dotenv/config";
import { z } from "zod";
import { transportSessionTokenContext } from "../../server.js";
import { fetchAccessToken, fetchDomain } from "../toolsUtility.js";

/** ------------------ Types ------------------ */
const LeaveTypesEnum = ["PL", "SL", "CO"] as const;
type LeaveType = typeof LeaveTypesEnum[number];

interface SubmitLeaveInput {
  leaveType: LeaveType;
  leaveReason: string;
  startDate: string;
  endDate: string;
  remarks: string;
}

/** ------------------ Schema ------------------ */
const submitLeaveSchema = z.object({
  leaveType: z.enum(LeaveTypesEnum).describe("Type of leave: PL (Paid), SL (Sick), CO (Comp Off)"),
  leaveReason: z.string().describe("Reason for taking leave"),
  startDate: z.string().describe("Start date in DD-MM-YYYY format"),
  endDate: z.string().describe("End date in DD-MM-YYYY format"),
  remarks: z.string().describe("Optional remarks")
});

/** ------------------ Service ------------------ */
async function submitLeaveRequest(
  input: SubmitLeaveInput,
  sessionToken: string,
  endpoint: string
) {
  const enrichedData = {
    actionType: "apply-leave",
    ...input
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      sessiontoken: sessionToken
    },
    body: JSON.stringify(enrichedData)
  });

  if (!response.ok) {
    throw new Error(`Leave request failed with status ${response.status}`);
  }

  return await response.json();
}

/** ------------------ Tool Registration ------------------ */
export function registerSubmitLeaveTool(server: McpServer) {
  server.tool(
    "submitLeave",
    "Submit a leave request. Leave types: PL (Paid Leave), SL (Sick Leave), CO (Comp Off).",
    submitLeaveSchema.shape,
    async (input: SubmitLeaveInput, extra: any) => {
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

        const endpoint = `https://${tenantDomain}/api/worklife/timeoff/hackathon/applyLeave`;
        console.log("Leave Submit Endpoint:", endpoint);

        const result = await submitLeaveRequest(input, sessionToken, endpoint);

        return {
          content: [
            {
              type: "text",
              text: `✅ Leave submitted successfully:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      } catch (error) {
        console.error("[submitLeave] Error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to submit leave request: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            }
          ]
        };
      }
    }
  );
}
