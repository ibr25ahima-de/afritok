export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "Afritok";

export const APP_LOGO =
  import.meta.env.VITE_APP_LOGO ||
  "https://placehold.co/128x128/E1E7EF/1F2937?text=Afritok";

// 🔒 OAuth TEMPORAIREMENT DÉSACTIVÉ
export const getLoginUrl = () => {
  return "/"; // empêche toute redirection externe
};
