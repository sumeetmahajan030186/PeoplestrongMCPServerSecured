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
import { registerCourseList } from "./talent/learning/courseList.js";
import { registerCatalogue } from "./talent/learning/catalogue.js";
import { registerCourseEnroll } from "./talent/learning/courseEnroll.js";
import { registerMyGoalList } from "./talent/performance/getGoalList.js";
import { registerSaveCheckIn } from "./talent/performance/checkinOnGoal.js";
import { registerGetMilestoneList } from "./talent/performance/getMilestoneList.js";
import { registerCreateGoal } from "./talent/performance/createGoal.js";

export function registerTools(server: McpServer) {
    try{
        registerOfferLetter(server);
        registerWeather(server);

        registerListHolidaysTool(server);
        registerGetLeaveBalanceTool(server);
        registerGetAttendanceStatusTool(server);
        registerSubmitAttendanceRegularizationTool(server);
        registerCourseList(server);
        registerCatalogue(server);
        registerCourseEnroll(server);
        registerMyGoalList(server);
        registerSaveCheckIn(server);
        registerGetMilestoneList(server);
        // Register our new candidate endpoints:
        registerCandidateTools(server)
        registerJobListTool(server);
        registerJobDescriptionTool(server);
        registerCreateGoal(server);
   } catch (err) {
          console.error("Error registering tools:", err);
      }
}
