import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { transportSessionTokenContext, transportAccessTokenContext, streams } from "../../server.js";

export function registerWeather(server: McpServer) {
  server.tool(
    "getWeather",
    "Get current weather by city name",
    { city: z.string() },
    async ({ city }, extra ) => {

      const sessionId = extra.sessionId;
      if (!sessionId) throw new Error("Missing sessionId in tool context");

      // Lookup transport from session ID
      const transport = streams.get(sessionId);
      const sessionToken = transportSessionTokenContext.get(sessionId)?.sessionToken;
      const accessToken  = transportAccessTokenContext.get(sessionId)?.accessToken;

      console.log("Session ID:", sessionId);
      console.log("Session Token:", sessionToken);
      console.log("Access Token:", accessToken);
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
