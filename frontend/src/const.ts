// client/src/const.ts

export function getLoginUrl(): string {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  if (!oauthPortalUrl || !appId) {
    console.error("[Auth] Missing OAuth env variables", {
      oauthPortalUrl,
      appId,
    });
    return "#";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  const loginUrl = new URL(`${oauthPortalUrl}/app-auth`);
  loginUrl.searchParams.set("app_id", appId);
  loginUrl.searchParams.set("redirect_uri", redirectUri);

  return loginUrl.toString();
}
