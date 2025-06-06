import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerOfferLetter } from "./recruit/offerLetter.js";
import { registerWeather }     from "./misc/weather.js";

export function registerTools(server: McpServer) {
    try{
        registerOfferLetter(server);
        registerWeather(server);
    } catch (err) {
        console.error("Error registering tools:", err);
    }
}