import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const requiredCapacitorPackages = [
  "@capacitor/core",
  "@capacitor/android",
  "@capacitor/ios",
  "@capacitor/app",
  "@capacitor/camera",
  "@capacitor/filesystem",
  "@capacitor/network",
  "@capacitor/preferences",
  "@capacitor/push-notifications",
  "@capacitor/splash-screen",
];

const allDeps = {
  ...(packageJson.dependencies ?? {}),
  ...(packageJson.devDependencies ?? {}),
};

const missing = requiredCapacitorPackages.filter((name) => !allDeps[name]);
if (missing.length) {
  throw new Error(`Missing Capacitor packages: ${missing.join(", ")}`);
}

const versions = requiredCapacitorPackages.map((name) => {
  const version = allDeps[name];
  const match = String(version).match(/(\\d+)\\.(\\d+)\\./);
  if (!match) throw new Error(`Invalid Capacitor version for ${name}: ${version}`);
  return { name, version: String(version), major: Number(match[1]) };
});

const majors = new Set(versions.map((item) => item.major));
if (majors.size !== 1 || !majors.has(8)) {
  throw new Error(
    `Capacitor packages must stay on the same major version (expected 8): ${versions.map((item) => `${item.name}@${item.version}`).join(", ")}`
  );
}

if (allDeps["@capacitor/cli"] && !/^\\^?8\\./.test(String(allDeps["@capacitor/cli"]))) {
  throw new Error(`@capacitor/cli must remain on major 8: ${allDeps["@capacitor/cli"]}`);
}

const configText = fs.readFileSync("capacitor.config.ts", "utf8");
if (!/appId\\s*:\\s*["'][^"']+["']/.test(configText)) {
  throw new Error("capacitor.config.ts is missing appId.");
}
if (!/webDir\\s*:\\s*["']dist\\/public["']/.test(configText)) {
  throw new Error('capacitor.config.ts must keep webDir aligned with the Vite build output: dist/public');
}

if (packageJson.scripts?.["build:mobile"] !== "pnpm build && npx cap sync") {
  throw new Error("build:mobile must build the web app before Capacitor sync.");
}

console.log("Mobile dependency/config consistency check passed.");
console.log(versions.map((item) => `- ${item.name}: ${item.version}`).join("\n"));
