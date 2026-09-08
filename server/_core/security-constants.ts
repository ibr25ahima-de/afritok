/** Central security limits. Keep secrets in environment variables, never here. */
export const SECURITY_LIMITS = {
  otpCodeLength: 6,
  otpMaxAttempts: 5,
  otpWindowMs: 15 * 60 * 1000,
  otpExpiryMs: 5 * 60 * 1000,
  sessionMaxAgeSeconds: 7 * 24 * 60 * 60,
} as const;
