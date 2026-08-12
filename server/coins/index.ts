/**
 * ============================================
 * 🪙🎁 AFRITOK COINS SYSTEM
 * ============================================
 *
 * Point d'entrée du système Coins AfriTok.
 *
 * Ce fichier rassemble :
 * - les packs de pièces
 * - les cadeaux virtuels
 *
 * Pour le moment, aucun paiement réel
 * n'est branché ici.
 */

// 🪙 Pièces
export {
  COIN_PACKAGES,
  getCoinPackage,
} from "./coins";

// 🎁 Cadeaux
export {
  GIFTS,
  getGift,
} from "./gifts";
