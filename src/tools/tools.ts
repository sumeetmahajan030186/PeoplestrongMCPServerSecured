import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerWeather } from "./misc/weather.js";
import { registerOfferLetter } from "./recruit/offerLetter.js";
import { registerGetAttendanceStatusTool } from "./wfm/getAttendanceStatusTool.js";
import { registerGetLeaveBalanceTool } from "./wfm/getLeaveBalanceTool.js";
import { registerListHolidaysTool } from "./wfm/listHolidaysTool.js";
import { registerSubmitAttendanceRegularizationTool } from "./wfm/submitAttendanceRegularizationTool.js";

import { registerCandidateTools } from "./candidate/candidateTools.js";
import { registerJobDescriptionTool } from "./candidate/jobDescriptionTool.js";
import { registerJobListTool } from "./candidate/jobListTool.js";

export function registerTools(server: McpServer) {
    try{
        registerOfferLetter(server);
        registerWeather(server);

        // Register our new candidate endpoints:
        registerCandidateTools(server)
        registerJobListTool(server);
        registerJobDescriptionTool(server);

        registerListHolidaysTool(server);
        registerGetLeaveBalanceTool(server);
        registerGetAttendanceStatusTool(server);
        registerSubmitAttendanceRegularizationTool(server);
   } catch (err) {
          console.error("Error registering tools:", err);
      }
}
