export function isPremiumSandboxEnabled() {
  return process.env.AFRITOK_PREMIUM_SANDBOX === "true";
}

export function getSandboxProviderReference(referenceId: string) {
  return `SANDBOX_${referenceId}_${Date.now()}`;
}
