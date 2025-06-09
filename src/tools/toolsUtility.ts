import { getTenantDomainFromJwt } from "../auth/sessionTokenProvider.js";
import { transportAccessTokenContext } from "../server.js";


export function fetchDomain(accessToken: string) {
    let tenantDomain: string;
    try {
        tenantDomain = getTenantDomainFromJwt(accessToken);
    } catch (err: any) {
        throw new Error("Failed to decode tenant_domain from access token: " + err.message);
    }
    return tenantDomain;
}

export function fetchAccessToken(extra: any) {
    const sessionId = extra.sessionId;
    if (!sessionId) throw new Error("Missing sessionId in tool context");

    const accessToken = transportAccessTokenContext.get(sessionId)?.accessToken;
    if (!accessToken) {
        throw new Error("Missing accessToken, authorization failed.");
    }
    return accessToken;
}