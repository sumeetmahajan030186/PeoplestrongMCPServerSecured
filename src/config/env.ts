import "dotenv/config";

export function loadEnv() {
  if (!process.env.OIDC_ISSUER) throw new Error("OIDC_ISSUER not set");
  if (!process.env.PUBLIC_BASE_URL) throw new Error("PUBLIC_BASE_URL not set");
  if (!process.env.PORT) console.warn("PORT not set, using default 3000");
}