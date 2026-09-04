import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type StoredMode = "Système" | "Sombre" | "Clair";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

function resolveTheme(mode: StoredMode, fallback: Theme): Theme {
  if (mode === "Sombre") return "dark";
  if (mode === "Clair") return "light";
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return fallback;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const storedMode = localStorage.getItem("afritok:darkMode") as StoredMode | null;
    if (storedMode) return resolveTheme(storedMode, defaultTheme);
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const applyMode = (mode: StoredMode) => {
      const nextTheme = resolveTheme(mode, defaultTheme);
      setTheme(nextTheme);
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
    };

    const onThemeChange = (event: Event) => {
      const mode = (event as CustomEvent<StoredMode>).detail;
      if (mode === "Système" || mode === "Sombre" || mode === "Clair") applyMode(mode);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== "afritok:darkMode" || !event.newValue) return;
      const mode = event.newValue as StoredMode;
      if (mode === "Système" || mode === "Sombre" || mode === "Clair") applyMode(mode);
    };

    const systemMedia = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      const mode = localStorage.getItem("afritok:darkMode") as StoredMode | null;
      if (!mode || mode === "Système") applyMode(mode || "Système");
    };

    window.addEventListener("afritok:theme-change", onThemeChange);
    window.addEventListener("storage", onStorage);
    systemMedia.addEventListener?.("change", onSystemChange);

    const savedMode = localStorage.getItem("afritok:darkMode") as StoredMode | null;
    if (savedMode === "Système" || savedMode === "Sombre" || savedMode === "Clair") applyMode(savedMode);

    return () => {
      window.removeEventListener("afritok:theme-change", onThemeChange);
      window.removeEventListener("storage", onStorage);
      systemMedia.removeEventListener?.("change", onSystemChange);
    };
  }, [defaultTheme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (switchable) localStorage.setItem("theme", theme);
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => setTheme(prev => (prev === "light" ? "dark" : "light"))
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
