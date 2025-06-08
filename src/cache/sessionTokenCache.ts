const sessionTokenCache = new Map<string, string>();

export const getSessionTokenFromCache = (authToken: string): string | undefined => {
  return sessionTokenCache.get(authToken);
};

export const storeSessionTokenInCache = (authToken: string, sessionToken: string): void => {
  sessionTokenCache.set(authToken, sessionToken);
};