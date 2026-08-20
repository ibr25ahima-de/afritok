export const PAYMENT_OPERATORS = [
  "orange",
  "mtn",
  "moov",
  "wave",
] as const;

export type PaymentOperator =
  (typeof PAYMENT_OPERATORS)[number];

export const PAYMENT_PURPOSES = [
  "wallet_recharge",
  "coin_purchase",
  "subscription",
  "advertisement",
  "service",
] as const;

export type PaymentPurpose =
  (typeof PAYMENT_PURPOSES)[number];
