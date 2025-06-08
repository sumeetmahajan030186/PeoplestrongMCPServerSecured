import { Request, Response, NextFunction } from "express";
import { getSessionTokenFromCache, storeSessionTokenInCache } from "../cache/sessionTokenCache.js";
import { generateSessionToken } from "../auth/sessionTokenProvider.js";

declare module "express" {
  interface Request {
    sessionToken?: string;
  }
}

export const sessionTokenMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // skip auth for public endpoints
  if (req.path.startsWith("/.well-known")) return next();
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.set("WWW-Authenticate", `Bearer realm="OAuth"`);
    return res.status(401).end();
  }

  const accessToken = authHeader.slice(7);

  const cached = getSessionTokenFromCache(accessToken);
  if (cached) {
    req.sessionToken = cached;
    return next();
  }

  try {
    const sessionToken = await generateSessionToken(accessToken);
    storeSessionTokenInCache(accessToken, sessionToken);
    req.sessionToken = sessionToken;
    return next();
  } catch (err) {
    console.error("Failed to generate session token:", err);
    return res.status(500).send("Session initialization failed");
  }
};