export interface WeatherResponse {
  current_condition: {
    temp_C: string;
    weatherDesc: { value: string }[];
  }[];
}