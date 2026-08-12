/**
 * ============================================
 * 🪙 AFRITOK COINS
 * ============================================
 *
 * Système de pièces virtuelles AfriTok.
 *
 * IMPORTANT :
 * Les coins sont des crédits virtuels.
 * Ils ne représentent pas encore de l'argent réel.
 * L'argent réel entrera plus tard lorsqu'un
 * système de paiement sera branché.
 */

export const COIN_PACKAGES = [
  {
    id: "coins-100",
    name: "100 pièces",
    coins: 100,
    price: 1,
    currency: "USD",
  },
  {
    id: "coins-500",
    name: "500 pièces",
    coins: 500,
    price: 5,
    currency: "USD",
  },
  {
    id: "coins-1000",
    name: "1 000 pièces",
    coins: 1000,
    price: 10,
    currency: "USD",
  },
  {
    id: "coins-5000",
    name: "5 000 pièces",
    coins: 5000,
    price: 50,
    currency: "USD",
  },
];

export function getCoinPackage(packageId: string) {
  return COIN_PACKAGES.find((item) => item.id === packageId);
}
