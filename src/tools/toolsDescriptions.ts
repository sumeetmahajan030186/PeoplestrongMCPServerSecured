export const toolDescriptions = {
  createOfferLetter: {
    description: "Generate offer letter for a candidate",
    parameters: {
      type: "object",
      properties: { candidateId: { type: "string" } },
      required: ["candidateId"]
    },
    auth: {
      type: "oauth2",
      client_id: "claude-mcp",
      scopes: ["offer:write"]
    }
  },
  getWeather: {
    description: "Get current weather by city name",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"]
    },
    auth: {
      type: "oauth2",
      client_id: "claude-mcp",
      scopes: ["offer:write"]
    }
  }
};
