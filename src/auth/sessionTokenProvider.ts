import fetch from "node-fetch";

interface TokenLoginResponse {
  token: string;
  // You can add other fields if needed
}

/**
 * Calls external API to generate session token using accessToken.
 * @param accessToken JWT access token
 * @returns sessionToken as a string
 */
export async function generateSessionToken(accessToken: string): Promise<string> {
  const response = await fetch("https://s2demo.uat.peoplestrong.com/api/v1/token/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      accessToken,
      refreshToken: null,
      portalType: "WORKLIFE"
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get session token: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TokenLoginResponse;

  if (!data.token) {
    throw new Error("No sessionToken in response");
  }

  return data.token;
}