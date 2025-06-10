import { z } from "zod";
import "dotenv/config";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { transportSessionTokenContext, transportAccessTokenContext, streams } from "../../../server.js";

const openCycleCache: Map<string, any> = new Map();

export function registerMyGoalList(mcp: McpServer) {
  mcp.tool(
    "getGoalList",
    `You are a goal management assistant designed to fetch an employee's goal list for a selected quarter. Follow the steps carefully, ensuring all necessary data is available before proceeding. Prompt the user when any information is missing.

    Step-by-step Instructions:
    Check if the OPEN cycle is already cached:
    
    If cached, use the cached data.
    
    If not cached, call the fetchConfiguration API to retrieve cycleList and related metadata.
    
    Determine which cycle to use:
    
    If the user provides a financialYear and/or cycleValue (e.g., "Q1"), use that to find the matching cycle from cycleList.
    
    If not provided, search cycleList for a cycle with cycleStatus === "OPEN".
    
    If no OPEN cycle is found, ask the user to choose from available financial years and cycle values using data from cycleList.
    
    Prepare the final payload:
    
    Use values from the selected cycle to construct this object:
    
    {
      "cycleValue": "<Selected cycleValue from cycleValueList>",
      "financialYear": "<Selected financialYear>",
      "goalSettingId": "<Selected goalSettingId>"
    }
    If any of the above values (cycleValue, financialYear, goalSettingId) are missing or undefined, ask the user for the missing value(s), providing available options from the configuration response as suggestions.
    
    Fetch goals:
    
    Once the payload is complete, call the API to fetch the employee’s goals for that quarter.
    
    Return the result as a well-formatted JSON.
    
    Notes:
    Ensure all prompts are context-aware and only ask the user for missing values.
    
    Handle edge cases such as:
    
    No OPEN cycles found
    
    Invalid or unsupported cycleValue
    
    Empty or null values in the payload
    
    Use a conversational tone when prompting for missing input, e.g.,
    “I couldn’t find an OPEN cycle. Please choose a financial year from the following: [Apr2023-Mar2024, Apr2024-Mar2025]”`,
    {
      cycleValue: z.string().optional(),
    },
    async (params: { cycleValue?: string }, extra: any) => {
      const sessionId = extra.sessionId;
      if (!sessionId) throw new Error("Missing sessionId in tool context");

      const transport = streams.get(sessionId);
      const sessionToken = transportSessionTokenContext.get(sessionId)?.sessionToken;
      const accessToken = transportAccessTokenContext.get(sessionId)?.accessToken;

      if (!sessionToken) throw new Error(`No sessionToken available for session ${sessionId}`);

      let openCycle = openCycleCache.get(sessionId);
      if (!openCycle) {
        const configUrl =
          `${process.env.PERFORMANCE_UAT_URL}/service/oneweb/api/goal/fetch-configuration`;
        const headers: Record<string, string> = {
          "content-type": "application/json; charset=utf-8",
          sessiontoken: sessionToken
        };

        const configRes = await fetch(configUrl, {
          method: "POST",
          headers,
          body: ""
        });
        if (!configRes.ok) {
          throw new Error(`fetch-configuration responded with ${configRes.status}`);
        }
        const configJson = await configRes.json() as { responseData?: { cycleList?: any[] } };
        const cycleList = configJson.responseData?.cycleList;
        if (!Array.isArray(cycleList)) {
          throw new Error("No cycleList found in configuration response");
        }

        const found = cycleList.find((c: any) => c.cycleStatus === "OPEN");
        if (!found) throw new Error("No OPEN cycle found in the fetched cycleList");

        openCycle = found;
        openCycleCache.set(sessionId, openCycle);
      }

      const { cycleValue } = params;
      if (!cycleValue) {
        const fy = openCycle.financialYear;
        const gs = openCycle.goalSettingId;
        const qList = Array.isArray(openCycle.cycleValueList) ? openCycle.cycleValueList as string[] : [];

        if (typeof fy !== "string" || typeof gs !== "string" || qList.length === 0) {
          throw new Error("OPEN cycle is missing financialYear, goalSettingId, or cycleValueList");
        }

        return {
          content: [
            {
              type: "text",
              text:
                `Current OPEN cycle:\n\n` +
                `  financialYear: "${fy}"\n` +
                `  goalSettingId: "${gs}"\n\n` +
                `Available quarter values:\n\n` +
                qList.map((q, idx) => `  ${idx}: "${q}"`).join("\n") +
                `\n\nInvoke getGoalList again with cycleValue set to one of those strings.`
            }
          ]
        };
      }

      const chosenValue = cycleValue.trim();
      const availableValues = Array.isArray(openCycle.cycleValueList) ? openCycle.cycleValueList as string[] : [];
      if (!availableValues.includes(chosenValue)) {
        throw new Error(
          `Invalid cycleValue "${chosenValue}". Must be one of: ${availableValues.map(v => `"${v}"`).join(", ")}.`
        );
      }

      const { goalSettingId, financialYear } = openCycle;
      if (typeof goalSettingId !== "string" || typeof financialYear !== "string") {
        throw new Error("OPEN cycle is missing goalSettingId or financialYear");
      }

      const url2 =
        `${process.env.PERFORMANCE_UAT_URL}/service/oneweb/api/goal/employee/myGoalList`;
      const headers2: Record<string, string> = {
        "content-type": "application/json; charset=utf-8",
        sessiontoken: sessionToken
      };
      const body2 = JSON.stringify({
        cycleValue: chosenValue,
        financialYear,
        goalSettingId,
        userId: null,
        from: null,
      });

      const res2 = await fetch(url2, {
        method: "POST",
        headers: headers2,
        body: body2,
      });
      if (!res2.ok) {
        throw new Error(`getMyGoalList responded with ${res2.status}`);
      }
      const jsonResponse = await res2.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(jsonResponse, null, 2),
          },
        ],
      };
    }
  );
}
