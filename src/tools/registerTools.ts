import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OfferLetter } from "./recruit/offerLetter.js";
import { WeatherTools } from "./misc/weatherTools.js";

export function registerTools(server: McpServer) {
  new WeatherTools(server).register();
  new OfferLetter(server).register();
}
