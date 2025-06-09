import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerOfferLetter } from "./recruit/offerLetter.js";
import { registerWeather }     from "./misc/weather.js";
import { registerJobDescriptionTool } from "./candidate/jobDescriptionTool.js";
import { registerJobListTool } from "./candidate/jobListTool.js";
import { registerCandidateTools } from "./candidate/candidateTools.js";

export function registerTools(server: McpServer) {
  registerOfferLetter(server);
  registerWeather(server);
  // Register our new candidate endpoints:
  registerCandidateTools(server)
  registerJobListTool(server);
  registerJobDescriptionTool(server);
}
