import axios from "axios";
import { WeatherResponse } from "./responses/weatherResponse.js";
class WeatherService {
  /**
   * Fetches the current weather for a given city.
   * @param city - The name of the city to get the weather for.
   * @returns A promise that resolves to a string containing the weather information.
   * @throws An error if the API call fails or if the response is not as expected.
   */
  async getWeather(
    city: string
  ): Promise<string> {
    try {
      const response = await axios.get<WeatherResponse>(
        `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
        {
          timeout: 5000, // timeout in milliseconds
        }
      );
      const {
        current_condition: [cur],
      } = response.data;
      return `Weather in ${city}: ${cur.temp_C} °C, ${cur.weatherDesc[0].value}`;
    } catch (error: any) {
      const status = error.response?.status || "unknown";
      throw new Error(`Weather API call failed with status ${status}`);
    }
  }
}

export const weatherService = new WeatherService();
