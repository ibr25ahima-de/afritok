import { useEffect, useState } from "react";

export type AutoPlayMode = "Wi-Fi uniquement" | "Toujours" | "Jamais";
export type TextSizeMode = "Petite" | "Normale" | "Grande";
export type DarkMode = "Système" | "Sombre" | "Clair";

export interface AppRuntimeSettings {
  language: string;
  darkMode: DarkMode;
  dataSaver: boolean;
  autoPlay: AutoPlayMode;
  textSize: TextSizeMode;
  animations: boolean;
}

const DEFAULTS: AppRuntimeSettings = {
  language: "Français",
  darkMode: "Système",
  dataSaver: false,
  autoPlay: "Wi-Fi uniquement",
  textSize: "Normale",
  animations: true,
};

function readSettings(): AppRuntimeSettings {
  if (typeof window === "undefined") return DEFAULTS;
  return {
    language: localStorage.getItem("afritok:language") || DEFAULTS.language,
    darkMode: (localStorage.getItem("afritok:darkMode") as DarkMode) || DEFAULTS.darkMode,
    dataSaver: localStorage.getItem("afritok:dataSaver") === "true",
    autoPlay: (localStorage.getItem("afritok:autoPlay") as AutoPlayMode) || DEFAULTS.autoPlay,
    textSize: (localStorage.getItem("afritok:textSize") as TextSizeMode) || DEFAULTS.textSize,
    animations: localStorage.getItem("afritok:animations") !== "false",
  };
}

export function canAutoPlay(mode: AutoPlayMode): boolean {
  if (mode === "Toujours") return true;
  if (mode === "Jamais") return false;

  const connection = (navigator as Navigator & {
    connection?: { type?: string; saveData?: boolean };
  }).connection;

  // When the browser cannot expose the connection type, keep the normal
  // behavior instead of unexpectedly disabling playback.
  if (!connection?.type) return true;
  return connection.type !== "cellular";
}

export function useAppRuntimeSettings() {
  const [settings, setSettings] = useState<AppRuntimeSettings>(readSettings);

  useEffect(() => {
    const refresh = (event?: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      setSettings(detail && typeof detail === "object" ? { ...readSettings(), ...detail } : readSettings());
    };

    window.addEventListener("afritok:settings-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("afritok:settings-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return settings;
}
