import fetch from "node-fetch";
import jwt from "jsonwebtoken";

interface TokenLoginResponse {
  token: string;
  // You can add other fields if needed
}

interface AccessTokenPayload {
  OrgID?: string;
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

// Public helper: given a raw Keycloak JWT, return tenant_domain
export function getTenantDomainFromJwt(token: string): string {
  const { tenant_domain } = decodeAccessToken(token);
  if (!tenant_domain) {
    throw new Error("No tenant_domain found in accessToken");
  }
  return tenant_domain;
}

/**
 * Generate session token by calling external API using decoded JWT info.
 */
export async function generateSessionToken(accessToken: string): Promise<string> {
  const decoded = decodeAccessToken(accessToken);
  const orgID = decoded.OrgID;
  const userName = decoded.preferred_username;
  const domain = decoded.tenant_domain;

  if (!orgID || !userName || !domain) {
    throw new Error("Required fields (OrgID or preferred_username or tenant_domain) missing in accessToken");
  }
  const url = "https://"+domain+"/api/v1/token/login";
  const request = {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        accessToken: null,
                        refreshToken: null,
                        orgId: orgID,
                        userName: userName,
                        portalType: "WORKLIFE"
                      })
                    };

  console.log(JSON.stringify(request));
  const response = await fetch(url, request);

  if (!response.ok) {
    throw new Error(`Failed to get session token: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as TokenLoginResponse;

  if (!data.token) {
    throw new Error("No session token found in response");
  }

  return data.token;
}
