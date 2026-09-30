import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.afritok.app",
  appName: "Afritok",
  webDir: "dist/public",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#000000",
  },
  ios: {
    backgroundColor: "#000000",
    contentInset: "automatic",
  },
};

export default config;
