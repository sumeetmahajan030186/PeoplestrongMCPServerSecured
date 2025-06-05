import fetch from "node-fetch";
import jwt from "jsonwebtoken";

interface TokenLoginResponse {
  token: string;
  // You can add other fields if needed
}

interface AccessTokenPayload {
  orgID?: string;
  preferred_username?: string;
  tenant_domain?: string;
  // Add more fields as required
}

/**
 * Decode JWT access token to extract payload information
 * @param token JWT token string
 * @returns Decoded payload object
 */
function decodeAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid access token payload");
  }

  return decoded as AccessTokenPayload;
}

/**
 * Generate session token by calling external API using decoded JWT info.
 */
export async function generateSessionToken(accessToken: string): Promise<string> {
  const decoded = decodeAccessToken(accessToken);
  const orgID = decoded.orgID;
  const userName = decoded.preferred_username;
  const domain = decoded.tenant_domain;

  if (!orgID || !userName || !domain) {
    throw new Error("Required fields (orgId or preferred_username or domain) missing in accessToken");
  }

  const response = await fetch("https://"+domain+"/api/v1/token/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      accessToken: null,
      refreshToken: null,
      orgID,
      userName,
      portalType: "WORKLIFE"
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get session token: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TokenLoginResponse;

  if (!data.token) {
    throw new Error("No session token found in response");
  }

  return data.token;
}
