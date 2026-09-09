const SANDBOX_FLAG = "true";

/**
 * Sandbox payments are strictly a non-production test feature.
 * A deployment must never be able to turn this on in production via a
 * mistaken environment variable, because the sandbox reports successful
 * provider payments without moving real money.
 */
export function isPremiumSandboxEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.AFRITOK_PREMIUM_SANDBOX === SANDBOX_FLAG;
}

export function getSandboxProviderReference(referenceId: string) {
  return `SANDBOX_${referenceId}_${Date.now()}`;
}
