import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerWeather(server: McpServer) {
  server.tool(
    "getWeather",
    "Get current weather by city name",
    { city: z.string(), __meta__: z.any().optional() },
    async ({ city, __meta__ }) => {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      if (!res.ok) throw new Error(`Weather API responded with ${res.status}`);

      const { current_condition: [cur] } = await res.json() as any;

      return {
        content: [
          { type: "text", text: `Weather in ${city}: ${cur.temp_C} °C, ${cur.weatherDesc[0].value}` }
        ]
      };
    }
  );
}
