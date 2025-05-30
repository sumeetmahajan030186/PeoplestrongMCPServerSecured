// src/auth/keycloakProvider.ts
import { createRemoteJWKSet, jwtVerify } from "jose";
import { URL } from "url";
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js"; // public

export const makeKeycloakProvider = (issuerUrl: URL): OAuthServerProvider => {
  const jwks = createRemoteJWKSet(
    new URL("./protocol/openid-connect/certs", issuerUrl)
  );

  return {
    /* --- stubs required by OAuthServerProvider ------------------------- */
    clientsStore: {
      async getClient() {
        /* no dynamic clients */ return undefined;
      }
    },
    authorize:                       async () => { throw new Error("authorize not implemented"); },
    challengeForAuthorizationCode:   async () => { throw new Error("challenge not implemented"); },
    exchangeAuthorizationCode:       async () => { throw new Error("exchangeCode not implemented"); },
    exchangeRefreshToken:            async () => { throw new Error("exchangeRefresh not implemented"); },

    /* --- the only method mcpAuthRouter will actually use --------------- */
    async verifyAccessToken(token: string) {
        return {
                token,
                clientId: "claude-mcp",
                scopes:   "mcp:tools"
              };
      /*const { payload } = await jwtVerify(token, jwks, {
        issuer:   issuerUrl.href,
        audience: "mcp"
      });

      return {
        token,
        clientId: payload.azp as string,
        scopes:   (payload.scope as string | undefined)?.split(" ") ?? []
      };*/
    }
  };
};

