import { Tool } from "../tool.js";
import { z } from "zod";
import { weatherService } from "./weatherService.js";

export class WeatherTools extends Tool {
  register(): void {
    this.registerGetWeather();
  }

  private registerGetWeather() {
    this.server.tool(
      "getWeather",
      "Get current weather by city name",
      { city: z.string() },
      async ({ city }, extras) => {
        const sessionToken = (extras as any)?.req?.sessionToken;
        console.log("SessionToken inside tool:", sessionToken);

        const text = await weatherService.getWeather(city)

        return {
          content: [
            {
              type: "text",
              text,
            },
          ],
        };
      }
    );
  }
}
