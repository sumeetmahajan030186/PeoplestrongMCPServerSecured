import { z } from "zod";
import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios from "axios";
import { transportSessionTokenContext, transportAccessTokenContext, streams } from "../../../server.js";

const openCycleCache: Map<string, any> = new Map();
const sessionConfigCache: Map<string, any> = new Map();

let ownerId = '';
let goalSettingId = '';
let goalPeriod = '';

function buildHeaders(sessionToken: string): Record<string, string> {
  return {
    "content-type": "application/json; charset=utf-8",
    sessiontoken: sessionToken,
  };
}

export function registerCreateGoal(mcp: McpServer) {
  mcp.tool(
    "createGoal",
    `Create a goal for an employee using the following workflow:

    Fetch Configuration: Call the fetch-configuration API to retrieve the current goal-setting configuration, including cycle details, goal categories, outcome types, and UOMs (units of measure).
    
    Cache Open Cycle: From the configuration, identify and cache the open goal-setting cycle to be reused across this session.
    
    Create Goal Configuration: Use the createGoalConfigurations2 API to get the supported outcome types and UOM suggestions based on the goal type.
    
    Determine Goal Period: Based on the selected financial year and goal-setting period (e.g., Q1, H1, Full Year), determine the correct start and end dates.
    
    If Impact area or UOM or type of Outcome are empty. Collect Goal Metadata: Ask the user for goal details like title, description, goal type (quantitative or qualitative), expected outcome, and UOM. Suggest values for outcome and UOM using the data fetched in Step 3.
    
    Build Payload: Construct a complete payload for goal creation including metadata, configuration values, employee identifiers, applicable dates, and outcome-related fields.
    
    Create Goal: Make a POST request to the goal creation API to persist the goal.
    
    Return Response: Return the created goal details including goal ID, title, status, and assigned period.
    
    This tool should orchestrate the above steps seamlessly, handling all necessary API interactions and prompting the user only where manual input is needed. It should gracefully handle errors, invalid inputs, and API failures.
    
    Return the JSON response`,
    {
      title: z.string().min(5),
      description: z.string().optional(),
      weightage: z.number().default(0),
      goalType: z.enum(["INDIVIDUAL", "TEAM", "ORGANIZATION"]).default("INDIVIDUAL"),
      progressType: z.enum(["BOOLEAN", "PROGRESS", "METRIC"]).default("BOOLEAN"),
      condition: z.enum(["AT_LEAST", "AT_MOST"]).optional().default("AT_LEAST"),
      startValue: z.number().optional().default(0),
      targetValue: z.number().optional().default(0),
      impactArea: z.string().optional(),
      milestoneTitle: z.string().min(5),
      effortOrOutcome: z.string().default("OUTCOME"),
      typeOfOutcome: z.string().optional(),
      uom: z.string().optional(),
    },
    async (input, extra: any) => {
      const sessionId = extra.sessionId;
      if (!sessionId) throw new Error("Missing sessionId in tool context");

      const sessionToken = transportSessionTokenContext.get(sessionId)?.sessionToken;
      const accessToken = transportAccessTokenContext.get(sessionId)?.accessToken;
      if (!sessionToken) throw new Error(`No sessionToken for session ${sessionId}`);

      const {
        title,
        milestoneTitle,
        description,
        weightage,
        goalType,
        progressType,
        condition,
        startValue,
        targetValue,
        effortOrOutcome,
        typeOfOutcome,
        uom,
        impactArea
      } = input;

      try {
        // Step 1-3: Fetch & cache configuration
        let cachedData = sessionConfigCache.get(sessionId);
        if (!cachedData) {
          const headersCfg = buildHeaders(sessionToken);
          const configRes = await axios.post(
            `${process.env.PERFORMANCE_UAT_URL}/service/oneweb/api/goal/fetch-configuration`,
            { entityId: 10 },
            { headers: headersCfg }
          );
          const configData = configRes.data.responseData;
          const openCycle = configData.selectedCycle;
          ownerId = configData.pmsUserId;
          goalSettingId = openCycle.goalSettingId;
          goalPeriod = openCycle.cycleValue;

          const cfg2Res = await axios.post(
            `${process.env.PERFORMANCE_UAT_URL}/service/oneweb/api/goal/employee/createGoalConfigurations2`,
            { cycleId: goalSettingId },
            { headers: headersCfg }
          );
          cachedData = { openCycle, options: cfg2Res.data, employeeList: configData.employeeList };
          sessionConfigCache.set(sessionId, cachedData);
        }
        const { openCycle, options: goalConfigOptions } = cachedData;
        if (!impactArea || !typeOfOutcome || !uom) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Please provide missing fields:\n` +
                  `${!impactArea ? `- Impact Area (options: ${JSON.stringify(goalConfigOptions.responseData.impactArea)})\n` : ''}` +
                  `${!typeOfOutcome ? `- Type of Outcome (options: ${JSON.stringify(goalConfigOptions.responseData.outcomeList)})\n` : ''}` +
                  `${!uom ? `- UOM (options: ${JSON.stringify(goalConfigOptions.responseData.UOM)})\n` : ''}`
              }
            ]
          };
        }
        const fyStartYear = openCycle.financialYear.split("-")[0].match(/\d{4}/)![0];
        let startDate = "", dueDate = "";
        switch (goalPeriod) {
          case "Q1": startDate = `${fyStartYear}-04-01`; dueDate = `${fyStartYear}-06-30`; break;
          case "Q2": startDate = `${fyStartYear}-07-01`; dueDate = `${fyStartYear}-09-30`; break;
          case "Q3": startDate = `${fyStartYear}-10-01`; dueDate = `${fyStartYear}-12-31`; break;
          case "Q4": startDate = `${+fyStartYear + 1}-01-01`; dueDate = `${+fyStartYear + 1}-03-31`; break;
        }


        const headers = buildHeaders(sessionToken);
        const payload = {
          ownerId,
          goalType,
          name: title,
          goalPeriod,
          description: description || "",
          weightage,
          visibility: "MANAGER",
          status: "ACTIVE",
          startDate,
          goalSettingId,
          dueDate,
          category: "DEFAULT",
          nature: "PERFORMANCE",
          impactArea,
          milestoneList: [{
            name: milestoneTitle,
            typeOfKR: effortOrOutcome,
            progressType,
            startDate,
            dueDate,
            ownerId,
            uom,
            typeOfOutcome,
            weightage: 100,
            startValue: progressType === "METRIC" ? startValue : undefined,
            targetValue: progressType === "METRIC" ? targetValue : undefined,
            targetCondition: condition,
            autoRatingList: [],
            customFields: []
          }]
        };

        const res = await axios.post(
          `${process.env.PERFORMANCE_UAT_URL}/service/oneweb/api/goal/employee/createGoal`,
          payload,
          { headers }
        );

        return {
          content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }]
        };
      } catch (error: any) {
        console.error("Error during createGoal:", error);
        return {
          content: [{ type: "text", text: `Error: ${error.message || JSON.stringify(error)}` }]
        };
      }
    }
  );
}
