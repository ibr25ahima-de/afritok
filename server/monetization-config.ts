/**
 * MONETIZATION CONFIG (SOURCE UNIQUE)
 * 
 * 👉 Backend + Frontend doivent utiliser ça
 */

export const MONETIZATION = {
  // 💰 Gains par action (Séparés par rôle)
  rewards: {
  like: 0.01,
  comment: 0.02,
  share: 0.05,
  favorite: 0.01,

  // 👤 viewer
  view: 0.001,

  // 🎬 creator
  creator_view: 0.002,
}, // créateur gagne + que viewer

  // 🔒 Limites journalières
  dailyLimits: {
    like: 20,
    comment: 10,
    share: 10,
    view: 200, // Augmenté de 50 à 200
    favorite: 20,
    creator: {
      maxDailyEarnings: 20, // plafond sécurité (nouveau)
    },
  },

  // 🚫 Anti-spam (en millisecondes)
  antiSpam: {
    like: 2000,
    comment: 5000,
    share: 10000,
    favorite: 3000,
    view: 1000,
  },

  // 👤 Conditions créateur
  creator: {
    minVideos: 1,
    minFollowers: 5000,
    minViews30Days: 50000, // Augmenté pour être crédible
    unlockMessage: "Atteins 5000 abonnés et 50 000 vues en 30 jours pour commencer à gagner de l’argent avec tes vidéos.",
  },

  // 💸 Retrait
  withdrawal: {
    minAmount: 1,
    delay: "24h",
  },

  // 🌍 Méthodes de paiement
  methods: ["MTN", "ORANGE", "WAVE"],

  // 📢 Règles affichées
  rules: [
    "Tu gagnes de l’argent en regardant et interagissant avec les vidéos.",
    "Les gains sont limités par jour pour éviter les abus.",
    "Les créateurs doivent publier au moins 1 vidéo.",
    "Les créateurs gagnent de l’argent en fonction des vues sur leurs vidéos.",
    "Paiement minimum : 1$",
    "Paiement sous 24h",
    "Un seul compte par utilisateur.",
  ],
};
