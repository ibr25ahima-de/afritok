import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.afritok.app",
  appName: "BiYaloxi",
  webDir: "dist/public",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
    // Android test APK loads the live Render deployment so web updates arrive automatically.
    url: "https://afritok-x76n.onrender.com",
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
