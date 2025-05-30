import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerOfferLetter } from "./recruit/offerLetter.js";
import { registerWeather }     from "./misc/weather.js";

export function registerTools(server: McpServer) {
  registerOfferLetter(server);
  registerWeather(server);
}
