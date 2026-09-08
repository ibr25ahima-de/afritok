# Security hardening

Security limits are centralized in `security-constants.ts`. Authentication code must use these server-side values and must never accept OTP expiry, attempt limits, roles, balances, or permissions from the client.
