/**
 * Système de traduction multilingue pour Afritok
 * Langues supportées :
 * - Français
 * - Anglais
 * - Swahili
 * - Yoruba
 * - Haoussa
 * - Zoulou
 * - Peul (Fulfulde - Guinée Conakry)
 */

export type Language =
  | 'fr'
  | 'en'
  | 'sw'
  | 'yo'
  | 'ha'
  | 'zu'
  | 'ff';

export const translations: Record<Language, Record<string, string>> = {
  fr: {
    'nav.home': 'Accueil',
    'nav.feed': 'Flux',
    'nav.search': 'Recherche',
    'nav.trending': 'Tendances',
    'nav.upload': 'Télécharger',
    'nav.profile': 'Profil',
    'nav.monetization': 'Monétisation',
    'nav.notifications': 'Notifications',
    'nav.logout': 'Déconnexion',

    'feed.loading': 'Chargement des vidéos...',
    'feed.no_videos': 'Aucune vidéo trouvée',
    'feed.like': 'J’aime',
    'feed.unlike': 'Je n’aime plus',
    'feed.comment': 'Commenter',
    'feed.share': 'Partager',
    'feed.follow': 'Suivre',
    'feed.unfollow': 'Ne plus suivre',

    'upload.title': 'Télécharger une vidéo',
    'upload.drag_drop': 'Glissez-déposez votre vidéo ici',
    'upload.select_file': 'Sélectionner un fichier',
    'upload.video_title': 'Titre de la vidéo',
    'upload.description': 'Description',
    'upload.add_sound': 'Ajouter un son',
    'upload.make_public': 'Rendre public',
    'upload.publish': 'Publier',
    'upload.uploading': 'Téléchargement en cours...',
    'upload.success': 'Vidéo publiée avec succès',

    'profile.followers': 'Abonnés',
    'profile.following': 'Abonnements',
    'profile.videos': 'Vidéos',
    'profile.edit': 'Modifier le profil',
    'profile.my_videos': 'Mes vidéos',
    'profile.earnings': 'Revenus',

    'monetization.title': 'Monétisation',
    'monetization.total_earnings': 'Revenus totaux',
    'monetization.available_balance': 'Solde disponible',
    'monetization.request_withdrawal': 'Demander un retrait',

    'common.loading': 'Chargement...',
    'common.error': 'Une erreur est survenue',
    'common.success': 'Succès',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.close': 'Fermer',
  },

  en: {
    'nav.home': 'Home',
    'nav.feed': 'Feed',
    'nav.search': 'Search',
    'nav.trending': 'Trending',
    'nav.upload': 'Upload',
    'nav.profile': 'Profile',
    'nav.monetization': 'Monetization',
    'nav.notifications': 'Notifications',
    'nav.logout': 'Logout',

    'feed.loading': 'Loading videos...',
    'feed.no_videos': 'No videos found',
    'feed.like': 'Like',
    'feed.unlike': 'Unlike',
    'feed.comment': 'Comment',
    'feed.share': 'Share',
    'feed.follow': 'Follow',
    'feed.unfollow': 'Unfollow',

    'upload.title': 'Upload video',
    'upload.drag_drop': 'Drag and drop your video here',
    'upload.select_file': 'Select file',
    'upload.video_title': 'Video title',
    'upload.description': 'Description',
    'upload.publish': 'Publish',

    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.close': 'Close',
  },

  sw: {
    'nav.home': 'Nyumbani',
    'nav.feed': 'Mtiririko',
    'nav.search': 'Tafuta',
    'nav.upload': 'Pakia',
    'nav.profile': 'Wasifu',

    'feed.loading': 'Inapakia video...',
    'feed.no_videos': 'Hakuna video',

    'common.loading': 'Inapakia...',
    'common.error': 'Hitilafu imetokea',
  },

  yo: {
    'nav.home': 'Ile',
    'nav.feed': 'Ifilọlẹ',
    'nav.search': 'Wa',
    'nav.upload': 'Gbe soke',
    'nav.profile': 'Profaili',

    'feed.loading': 'N gba fidio...',
    'feed.no_videos': 'Ko si fidio',

    'common.loading': 'N gba...',
    'common.error': 'Aṣiṣe kan ṣẹlẹ',
  },

  ha: {
    'nav.home': 'Gida',
    'nav.feed': 'Jeri',
    'nav.search': 'Nema',
    'nav.upload': 'Saka',
    'nav.profile': 'Bayanan',

    'feed.loading': 'Ana loda bidiyo...',
    'feed.no_videos': 'Babu bidiyo',

    'common.loading': 'Ana lodawa...',
    'common.error': 'Kuskure ya faru',
  },

  zu: {
    'nav.home': 'Ekhaya',
    'nav.feed': 'Ukulandelela',
    'nav.search': 'Sesha',
    'nav.upload': 'Layisha',
    'nav.profile': 'Iphrofayela',

    'feed.loading': 'Iyalayisha amavidiyo...',
    'feed.no_videos': 'Azikho izividiyo',

    'common.loading': 'Iyalayisha...',
    'common.error': 'Kwenzeke iphutha',
  },

  // 🌍 PEUL – FULFULDE (GUINÉE CONAKRY)
  ff: {
    'nav.home': 'Suudu',
    'nav.feed': 'Fil',
    'nav.search': 'Yiylo',
    'nav.upload': 'Naatude',
    'nav.profile': 'Profil',

    'feed.loading': 'Naatugol widewoo...',
    'feed.no_videos': 'Alaa widewoo',

    'upload.title': 'Naatude widewoo',
    'upload.publish': 'Naatu',

    'common.loading': 'Naatugol...',
    'common.error': 'Juumre waɗi',
    'common.success': 'Moƴƴii',
    'common.cancel': 'Haaytu',
    'common.save': 'Danndu',
    'common.close': 'Uddu',
  },
};

/**
 * Hook de traduction
 */
export function useTranslation(language: Language) {
  return (key: string, fallback?: string) =>
    translations[language]?.[key] ?? fallback ?? key;
    }
