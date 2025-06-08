import { Request, Response, NextFunction } from "express";
import { makeKeycloakProvider } from "../auth/keycloakProvider.js";


const issuer = new URL(process.env.OIDC_ISSUER!);
const auth = makeKeycloakProvider(issuer);


export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // skip auth for public endpoints
  if (req.path.startsWith("/.well-known")) return next();
  
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.set("WWW-Authenticate", `Bearer realm="OAuth"`);
    return res.status(401).end();
  }

  const token = authHeader.slice(7);
  next();
  // auth.verifyAccessToken(token)
  //   .then(() => next())
  //   .catch(() => {
  //     res.set("WWW-Authenticate", `Bearer realm=\"OAuth\"`);
  //     return res.status(401).end();
  //   });
};