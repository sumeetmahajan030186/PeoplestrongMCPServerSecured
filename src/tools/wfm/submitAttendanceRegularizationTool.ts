// submitAttendanceRegularizationTool.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import "dotenv/config";
import { z } from "zod";
import { transportSessionTokenContext } from "../../server.js";
import { fetchAccessToken, fetchDomain } from "../toolsUtility.js";

/** ------------------ Schema ------------------ */
const attendanceRegularizationSchema = z.object({
  date: z.string().describe("Date in DD-MM-YYYY format"),
  modifiedInTime: z.string().describe("Modified in-time (e.g., '07 May 2025 09:00')"),
  modifiedOutTime: z.string().describe("Modified out-time (e.g., '07 May 2025 18:00')"),
  comment: z.string().optional().describe("Optional comment provided by the user")
});

type AttendanceRegularizationInput = z.infer<typeof attendanceRegularizationSchema>;

/** ------------------ Service ------------------ */
async function submitAttendanceRegularization(
  input: AttendanceRegularizationInput,
  sessionToken: string,
  endpoint: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const payload = {
    regularizeInfo: [
      {
        date: input.date,
        modifiedInTime: input.modifiedInTime,
        modifiedOutTime: input.modifiedOutTime,
        ...(input.comment ? { comment: input.comment } : {})
      }
    ]
  };

  console.log("[submitAttendanceRegularization] Payload:", payload);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        sessiontoken: sessionToken
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Attendance regularization API failed with status ${response.status}`
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[submitAttendanceRegularization] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/** ------------------ Tool Registration ------------------ */
export function registerSubmitAttendanceRegularizationTool(server: McpServer) {
  server.tool(
    "submitAttendanceRegularization",
    "Submit attendance regularization request for an employee, including modified in/out time and an optional comment.",
    attendanceRegularizationSchema.shape,
    async (input: AttendanceRegularizationInput, extra: any) => {
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

        const endpoint = `https://${tenantDomain}/api/worklife/time/genAI/submit-regularization`;
        console.log("Attendance Regularization Endpoint:", endpoint);

        const result = await submitAttendanceRegularization(input, sessionToken, endpoint);

        return {
          content: [
            {
              type: "text",
              text: `✅ Attendance regularization submitted successfully:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      } catch (error) {
        console.error("[submitAttendanceRegularization] Error:", error);
        return {
          content: [
            {
              type: "text",
              text: `❌ Failed to submit attendance regularization: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            }
          ]
        };
      }
    }
  );
}
