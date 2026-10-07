export type CountryConfig = {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  withdrawalMethods: string[];
};

export const AFRICAN_COUNTRIES: CountryConfig[] = [
  { code: "CI", name: "Côte d’Ivoire", currency: "XOF", currencySymbol: "F CFA", withdrawalMethods: ["Orange Money", "MTN MoMo", "Moov Money", "Wave"] },
  { code: "GN", name: "Guinée", currency: "GNF", currencySymbol: "FG", withdrawalMethods: ["Orange Money", "MTN MoMo", "Cellcom"] },
  { code: "SN", name: "Sénégal", currency: "XOF", currencySymbol: "F CFA", withdrawalMethods: ["Orange Money", "Wave", "Free Money"] },
  { code: "ML", name: "Mali", currency: "XOF", currencySymbol: "F CFA", withdrawalMethods: ["Orange Money", "Moov Money"] },
  { code: "BF", name: "Burkina Faso", currency: "XOF", currencySymbol: "F CFA", withdrawalMethods: ["Orange Money", "Moov Money", "Wave"] },
  { code: "TG", name: "Togo", currency: "XOF", currencySymbol: "F CFA", withdrawalMethods: ["Togocel TMoney", "Moov Money"] },
  { code: "BJ", name: "Bénin", currency: "XOF", currencySymbol: "F CFA", withdrawalMethods: ["MTN MoMo", "Moov Money"] },
  { code: "NG", name: "Nigeria", currency: "NGN", currencySymbol: "₦", withdrawalMethods: ["Bank Transfer", "OPay", "PalmPay"] },
  { code: "GH", name: "Ghana", currency: "GHS", currencySymbol: "₵", withdrawalMethods: ["MTN MoMo", "Telecel Cash", "AirtelTigo Money"] },
  { code: "KE", name: "Kenya", currency: "KES", currencySymbol: "KSh", withdrawalMethods: ["M-Pesa", "Airtel Money"] },
  { code: "TZ", name: "Tanzanie", currency: "TZS", currencySymbol: "TSh", withdrawalMethods: ["M-Pesa", "Airtel Money", "Tigo Pesa"] },
  { code: "UG", name: "Ouganda", currency: "UGX", currencySymbol: "USh", withdrawalMethods: ["MTN MoMo", "Airtel Money"] },
  { code: "ZA", name: "Afrique du Sud", currency: "ZAR", currencySymbol: "R", withdrawalMethods: ["Bank Transfer", "EFT"] },
  { code: "CM", name: "Cameroun", currency: "XAF", currencySymbol: "F CFA", withdrawalMethods: ["MTN MoMo", "Orange Money"] },
  { code: "CD", name: "RD Congo", currency: "CDF", currencySymbol: "FC", withdrawalMethods: ["Airtel Money", "Orange Money", "M-Pesa"] },
  { code: "EG", name: "Égypte", currency: "EGP", currencySymbol: "E£", withdrawalMethods: ["Bank Transfer", "Vodafone Cash", "Orange Money"] },
];

export function getCountryConfig(code?: string | null): CountryConfig | null {
  if (!code) return null;
  return AFRICAN_COUNTRIES.find((country) => country.code === code.toUpperCase()) ?? null;
}
