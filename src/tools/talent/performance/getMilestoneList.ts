import { z } from "zod";
import "dotenv/config";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { transportSessionTokenContext, transportAccessTokenContext, streams } from "../../../server.js";

const openCycleCache: Map<string, any> = new Map();

export function registerGetMilestoneList(mcp: McpServer) {
  mcp.tool(
    "getMilestoneList",
    "Fetches milestones for a goal. 1) If no cycleValue/goalId, returns OPEN cycle info and available quarters. 2) If cycleValue but not goalId, fetches and lists goalIds for that quarter. 3) If goalId, fetches and returns milestone list.",
    {
      cycleValue: z.string().optional(),
      goalId: z.string().optional(),
    },
    async (
      params: { cycleValue?: string; goalId?: string },
      extra: any
    ) => {
      const { cycleValue, goalId } = params;
      const sessionId = extra.sessionId;

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
        const configBody = ""
        const configRes = await fetch(configUrl, { method: "POST", headers, body: configBody });
        if (!configRes.ok) throw new Error(`fetch-configuration responded with ${configRes.status}`);
        const configJson = await configRes.json();
        const cycleList = configJson.responseData?.cycleList;
        if (!Array.isArray(cycleList)) throw new Error("No cycleList found in configuration response");
        const found = cycleList.find((c: any) => c.cycleStatus === "OPEN");
        if (!found) throw new Error("No OPEN cycle found in the fetched cycleList");
        openCycle = found;
        openCycleCache.set(sessionId, openCycle);
      }

      if (goalId && typeof goalId === "string") {
        const url = `${process.env.PERFORMANCE_UAT_URL}/service/oneweb/api/goal/employee/myMilestoneList`;
        const headers = {
          "content-type": "application/json; charset=utf-8",
          sessiontoken: sessionToken
        };
        const body = JSON.stringify({ goalId });
        const res = await fetch(url, { method: "POST", headers, body });
        if (!res.ok) throw new Error(`myMilestoneList responded with ${res.status}`);
        const json = await res.json();
        return {
          content: [{ type: "text", text: `Milestones for goalId "${goalId}":\n\n${JSON.stringify(json, null, 2)}` }]
        };
      }


      if (cycleValue && typeof cycleValue === "string") {
        const chosenValue = cycleValue.trim();
        const availableValues: string[] = Array.isArray(openCycle.cycleValueList) ? (openCycle.cycleValueList as string[]) : [];
        if (!availableValues.includes(chosenValue)) {
          throw new Error(`Invalid cycleValue "${chosenValue}". Must be one of: ${availableValues.map(v => `"${v}"`).join(", ")}.`);
        }
        const goalSettingId = openCycle.goalSettingId;
        const financialYear = openCycle.financialYear;
        if (typeof goalSettingId !== "string" || typeof financialYear !== "string") {
          throw new Error("OPEN cycle is missing goalSettingId or financialYear");
        }
        const url2 = `${process.env.PERFORMANCE_UAT_URL}/service/oneweb/api/goal/employee/myGoalList`;
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
        const res2 = await fetch(url2, { method: "POST", headers: headers2, body: body2 });
        if (!res2.ok) throw new Error(`myGoalList responded with ${res2.status}`);
        const jsonResponse = await res2.json();

        const goalList = jsonResponse.responseData || [];
        const goalIds = goalList.map((g: any) => g.goalId);
        return {
          content: [{
            type: "text",
            text:
              `Goal list for quarter "${chosenValue}":\n\n` +
              (goalIds.length > 0
                ? goalIds.map((id: string, idx: number) => `  ${idx}: "${id}"`).join("\n")
                : "No goals found for this quarter.") +
              `\n\nInvoke getMilestoneList again with \`goalId\` set to one of these IDs.`
          }]
        };
      }

      const fy = openCycle.financialYear;
      const gs = openCycle.goalSettingId;
      const qList: string[] = Array.isArray(openCycle.cycleValueList)
        ? (openCycle.cycleValueList as string[])
        : [];
      if (typeof fy !== "string" || typeof gs !== "string" || qList.length === 0) {
        throw new Error("OPEN cycle is missing financialYear, goalSettingId, or cycleValueList");
      }
      return {
        content: [{
          type: "text",
          text:
            `Current OPEN cycle:\n` +
            `  financialYear: "${fy}"\n` +
            `  goalSettingId: "${gs}"\n` +
            `Available quarter values (cycleValueList):\n\n` +
            qList.map((q, idx) => `  ${idx}: "${q}"`).join("\n") +
            `\n\nInvoke getMilestoneList again with \`cycleValue\` set to one of those strings, for example:\n` +
            `  { sessionToken: "<yourToken>", cycleValue: "Q1" }`
        }]
      };
    }
  );
}
