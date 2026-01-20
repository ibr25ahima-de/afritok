export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // 🔒 Sécurité absolue
  if (!oauthPortalUrl || !oauthPortalUrl.startsWith("http")) {
    console.warn("OAuth disabled: invalid VITE_OAUTH_PORTAL_URL");
    return "/"; // ← empêche le crash
  }

  if (!appId) {
    console.warn("OAuth disabled: missing VITE_APP_ID");
    return "/";
  }

  if (typeof window === "undefined") {
    return "/";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL("/app-auth", oauthPortalUrl);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
