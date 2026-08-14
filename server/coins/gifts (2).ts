/**
 * ============================================
 * 🎁 AFRITOK GIFTS
 * ============================================
 *
 * Catalogue officiel des cadeaux virtuels AfriTok.
 *
 * IMPORTANT :
 * Ce fichier est la SOURCE du catalogue des cadeaux.
 *
 * Le client ne définit jamais les prix.
 * Le serveur utilise ce catalogue pour connaître :
 * - l'identifiant
 * - le nom
 * - l'icône
 * - le prix en Coins
 *
 * Aucun paiement réel ici.
 */

export type AfriTokGift = {
  id: string;
  name: string;
  icon: string;
  coins: number;
};

export const GIFTS: AfriTokGift[] = [

  // ============================================
  // 🌸 NATURE & FLEURS
  // ============================================

  {
    id: "rose",
    name: "Rose",
    icon: "🌹",
    coins: 10,
  },
  {
    id: "tulip",
    name: "Tulipe",
    icon: "🌷",
    coins: 20,
  },
  {
    id: "sunflower",
    name: "Tournesol",
    icon: "🌻",
    coins: 30,
  },
  {
    id: "tropical-flower",
    name: "Fleur tropicale",
    icon: "🌺",
    coins: 50,
  },
  {
    id: "tree",
    name: "Arbre",
    icon: "🌳",
    coins: 100,
  },
  {
    id: "palm-tree",
    name: "Palmier",
    icon: "🌴",
    coins: 150,
  },
  {
    id: "rainbow",
    name: "Arc-en-ciel",
    icon: "🌈",
    coins: 200,
  },

  // ============================================
  // 🐾 ANIMAUX
  // ============================================

  {
    id: "cat",
    name: "Chat",
    icon: "🐱",
    coins: 50,
  },
  {
    id: "dog",
    name: "Chien",
    icon: "🐶",
    coins: 80,
  },
  {
    id: "rabbit",
    name: "Lapin",
    icon: "🐰",
    coins: 100,
  },
  {
    id: "butterfly",
    name: "Papillon",
    icon: "🦋",
    coins: 120,
  },
  {
    id: "bird",
    name: "Oiseau",
    icon: "🐦",
    coins: 150,
  },
  {
    id: "fish",
    name: "Poisson",
    icon: "🐠",
    coins: 180,
  },
  {
    id: "horse",
    name: "Cheval",
    icon: "🐎",
    coins: 300,
  },
  {
    id: "lion",
    name: "Lion",
    icon: "🦁",
    coins: 500,
  },
  {
    id: "elephant",
    name: "Éléphant",
    icon: "🐘",
    coins: 800,
  },
  {
    id: "giraffe",
    name: "Girafe",
    icon: "🦒",
    coins: 1000,
  },
  {
    id: "zebra",
    name: "Zèbre",
    icon: "🦓",
    coins: 1200,
  },
  {
    id: "gorilla",
    name: "Gorille",
    icon: "🦍",
    coins: 1500,
  },
  {
    id: "tiger",
    name: "Tigre",
    icon: "🐅",
    coins: 1800,
  },
  {
    id: "eagle",
    name: "Aigle",
    icon: "🦅",
    coins: 2000,
  },

  // ============================================
  // 🍎 NOURRITURE
  // ============================================

  {
    id: "apple",
    name: "Pomme",
    icon: "🍎",
    coins: 20,
  },
  {
    id: "watermelon",
    name: "Pastèque",
    icon: "🍉",
    coins: 30,
  },
  {
    id: "banana",
    name: "Banane",
    icon: "🍌",
    coins: 40,
  },
  {
    id: "ice-cream",
    name: "Glace",
    icon: "🍦",
    coins: 70,
  },
  {
    id: "cake",
    name: "Gâteau",
    icon: "🍰",
    coins: 100,
  },
  {
    id: "pizza",
    name: "Pizza",
    icon: "🍕",
    coins: 150,
  },
  {
    id: "burger",
    name: "Burger",
    icon: "🍔",
    coins: 200,
  },
  {
    id: "birthday-cake",
    name: "Gros gâteau",
    icon: "🎂",
    coins: 500,
  },

  // ============================================
  // ❤️ AMOUR & ÉMOTIONS
  // ============================================

  {
    id: "heart",
    name: "Cœur",
    icon: "❤️",
    coins: 50,
  },
  {
    id: "hearts",
    name: "Deux cœurs",
    icon: "💕",
    coins: 100,
  },
  {
    id: "kiss",
    name: "Bisou",
    icon: "💋",
    coins: 150,
  },
  {
    id: "love-letter",
    name: "Lettre d'amour",
    icon: "💌",
    coins: 200,
  },
  {
    id: "broken-heart",
    name: "Cœur brisé",
    icon: "💔",
    coins: 100,
  },

  // ============================================
  // 🔥 EFFETS & CÉLÉBRATION
  // ============================================

  {
    id: "fire",
    name: "Feu",
    icon: "🔥",
    coins: 100,
  },
  {
    id: "star",
    name: "Étoile",
    icon: "⭐",
    coins: 150,
  },
  {
    id: "sparkles",
    name: "Étincelles",
    icon: "✨",
    coins: 200,
  },
  {
    id: "confetti",
    name: "Confettis",
    icon: "🎉",
    coins: 300,
  },
  {
    id: "party",
    name: "Fête",
    icon: "🥳",
    coins: 500,
  },
  {
    id: "fireworks",
    name: "Feux d'artifice",
    icon: "🎆",
    coins: 1000,
  },

  // ============================================
  // 💎 LUXE
  // ============================================

  {
    id: "ring",
    name: "Bague",
    icon: "💍",
    coins: 500,
  },
  {
    id: "diamond",
    name: "Diamant",
    icon: "💎",
    coins: 1000,
  },
  {
    id: "crown",
    name: "Couronne",
    icon: "👑",
    coins: 2000,
  },
  {
    id: "money-bag",
    name: "Sac d'argent",
    icon: "💰",
    coins: 3000,
  },
  {
    id: "luxury-gift",
    name: "Cadeau de luxe",
    icon: "🎁",
    coins: 5000,
  },

  // ============================================
  // 🚗 VÉHICULES
  // ============================================

  {
    id: "bicycle",
    name: "Vélo",
    icon: "🚲",
    coins: 200,
  },
  {
    id: "motorcycle",
    name: "Moto",
    icon: "🏍️",
    coins: 500,
  },
  {
    id: "car",
    name: "Voiture",
    icon: "🚗",
    coins: 1000,
  },
  {
    id: "sports-car",
    name: "Voiture de course",
    icon: "🏎️",
    coins: 2000,
  },
  {
    id: "helicopter",
    name: "Hélicoptère",
    icon: "🚁",
    coins: 3000,
  },
  {
    id: "airplane",
    name: "Avion",
    icon: "✈️",
    coins: 5000,
  },

  // ============================================
  // 🌍 AFRIQUE
  // ============================================

  {
    id: "drum",
    name: "Tam-tam",
    icon: "🥁",
    coins: 100,
  },
  {
    id: "african-mask",
    name: "Masque africain",
    icon: "🎭",
    coins: 300,
  },
  {
    id: "african-crown",
    name: "Couronne africaine",
    icon: "👑",
    coins: 500,
  },
  {
    id: "african-lion",
    name: "Lion d'Afrique",
    icon: "🦁",
    coins: 1000,
  },
  {
    id: "africa",
    name: "Afrique",
    icon: "🌍",
    coins: 2000,
  },
  {
    id: "african-trophy",
    name: "Trophée AfriTok",
    icon: "🏆",
    coins: 5000,
  },

  // ============================================
  // 🏆 RÉCOMPENSES
  // ============================================

  {
    id: "medal",
    name: "Médaille",
    icon: "🏅",
    coins: 300,
  },
  {
    id: "trophy",
    name: "Trophée",
    icon: "🏆",
    coins: 1000,
  },
  {
    id: "gold-trophy",
    name: "Trophée en or",
    icon: "🏆",
    coins: 3000,
  },
  {
    id: "afritok-star",
    name: "Étoile AfriTok",
    icon: "🌟",
    coins: 5000,
  },
  {
    id: "afritok-legend",
    name: "Légende AfriTok",
    icon: "👑",
    coins: 10000,
  },
];

/**
 * ============================================
 * 🔎 TROUVER UN CADEAU
 * ============================================
 */

export function getGift(giftId: string) {
  return GIFTS.find(
    (gift) => gift.id === giftId
  );
}

/**
 * ============================================
 * 🎁 TOUS LES CADEAUX ACTIFS
 * ============================================
 */

export function getAllGifts() {
  return GIFTS;
}