export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const configuredAppTitle = import.meta.env.VITE_APP_TITLE?.trim();
export const APP_TITLE =
  configuredAppTitle && !/^afri\s?tok$/i.test(configuredAppTitle)
    ? configuredAppTitle
    : "biYaloxi";

export const APP_LOGO =
  import.meta.env.VITE_APP_LOGO ||
  "/biyaloxi-icon-192.png";
