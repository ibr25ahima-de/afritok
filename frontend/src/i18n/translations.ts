/**
 * Système de traduction multilingue pour Afritok
 * Supporte le français, l'anglais et les langues africaines
 */

export type Language = 'fr' | 'en' | 'sw' | 'yo' | 'ha' | 'zu';

export const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.feed': 'Flux',
    'nav.search': 'Recherche',
    'nav.trending': 'Tendances',
    'nav.upload': 'Télécharger',
    'nav.profile': 'Profil',
    'nav.monetization': 'Monétisation',
    'nav.notifications': 'Notifications',
    'nav.logout': 'Déconnexion',

    // Feed
    'feed.loading': 'Chargement des vidéos...',
    'feed.no_videos': 'Aucune vidéo trouvée',
    'feed.like': 'J\'aime',
    'feed.unlike': 'Ne plus aimer',
    'feed.comment': 'Commenter',
    'feed.share': 'Partager',
    'feed.follow': 'Suivre',
    'feed.unfollow': 'Ne plus suivre',

    // Upload
    'upload.title': 'Télécharger une vidéo',
    'upload.drag_drop': 'Glissez-déposez votre vidéo ici',
    'upload.select_file': 'Sélectionner un fichier',
    'upload.video_title': 'Titre de la vidéo',
    'upload.description': 'Description',
    'upload.add_sound': 'Ajouter un son',
    'upload.make_public': 'Rendre public',
    'upload.publish': 'Publier',
    'upload.uploading': 'Téléchargement en cours...',
    'upload.success': 'Vidéo téléchargée avec succès!',

    // Profile
    'profile.followers': 'Abonnés',
    'profile.following': 'Abonnements',
    'profile.videos': 'Vidéos',
    'profile.edit': 'Modifier le profil',
    'profile.my_videos': 'Mes vidéos',
    'profile.earnings': 'Revenus',

    // Monetization
    'monetization.title': 'Monétisation',
    'monetization.total_earnings': 'Revenus totaux',
    'monetization.total_withdrawals': 'Retraits totaux',
    'monetization.available_balance': 'Solde disponible',
    'monetization.request_withdrawal': 'Demander un retrait',
    'monetization.amount': 'Montant',
    'monetization.payment_method': 'Méthode de paiement',
    'monetization.mtn_money': 'MTN Mobile Money',
    'monetization.orange_money': 'Orange Money',
    'monetization.wave': 'Wave',
    'monetization.airtel_money': 'Airtel Money',
    'monetization.bank_transfer': 'Virement bancaire',

    // Search
    'search.title': 'Recherche',
    'search.placeholder': 'Rechercher des vidéos ou des créateurs...',
    'search.videos': 'Vidéos',
    'search.creators': 'Créateurs',
    'search.hashtags': 'Hashtags',

    // Trending
    'trending.title': 'Tendances',
    'trending.videos': 'Vidéos tendances',
    'trending.hashtags': 'Hashtags tendances',
    'trending.creators': 'Créateurs en vogue',

    // Common
    'common.loading': 'Chargement...',
    'common.error': 'Une erreur s\'est produite',
    'common.success': 'Succès!',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.close': 'Fermer',
  },

  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.feed': 'Feed',
    'nav.search': 'Search',
    'nav.trending': 'Trending',
    'nav.upload': 'Upload',
    'nav.profile': 'Profile',
    'nav.monetization': 'Monetization',
    'nav.notifications': 'Notifications',
    'nav.logout': 'Logout',

    // Feed
    'feed.loading': 'Loading videos...',
    'feed.no_videos': 'No videos found',
    'feed.like': 'Like',
    'feed.unlike': 'Unlike',
    'feed.comment': 'Comment',
    'feed.share': 'Share',
    'feed.follow': 'Follow',
    'feed.unfollow': 'Unfollow',

    // Upload
    'upload.title': 'Upload a Video',
    'upload.drag_drop': 'Drag and drop your video here',
    'upload.select_file': 'Select a file',
    'upload.video_title': 'Video title',
    'upload.description': 'Description',
    'upload.add_sound': 'Add sound',
    'upload.make_public': 'Make public',
    'upload.publish': 'Publish',
    'upload.uploading': 'Uploading...',
    'upload.success': 'Video uploaded successfully!',

    // Profile
    'profile.followers': 'Followers',
    'profile.following': 'Following',
    'profile.videos': 'Videos',
    'profile.edit': 'Edit Profile',
    'profile.my_videos': 'My Videos',
    'profile.earnings': 'Earnings',

    // Monetization
    'monetization.title': 'Monetization',
    'monetization.total_earnings': 'Total Earnings',
    'monetization.total_withdrawals': 'Total Withdrawals',
    'monetization.available_balance': 'Available Balance',
    'monetization.request_withdrawal': 'Request Withdrawal',
    'monetization.amount': 'Amount',
    'monetization.payment_method': 'Payment Method',
    'monetization.mtn_money': 'MTN Mobile Money',
    'monetization.orange_money': 'Orange Money',
    'monetization.wave': 'Wave',
    'monetization.airtel_money': 'Airtel Money',
    'monetization.bank_transfer': 'Bank Transfer',

    // Search
    'search.title': 'Search',
    'search.placeholder': 'Search videos or creators...',
    'search.videos': 'Videos',
    'search.creators': 'Creators',
    'search.hashtags': 'Hashtags',

    // Trending
    'trending.title': 'Trending',
    'trending.videos': 'Trending Videos',
    'trending.hashtags': 'Trending Hashtags',
    'trending.creators': 'Popular Creators',

    // Common
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Success!',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
  },

  sw: {
    // Navigation
    'nav.home': 'Nyumbani',
    'nav.feed': 'Mtiririko',
    'nav.search': 'Tafuta',
    'nav.trending': 'Inaendelea',
    'nav.upload': 'Pakia',
    'nav.profile': 'Wasifu',
    'nav.monetization': 'Mapato',
    'nav.notifications': 'Arifa',
    'nav.logout': 'Toka',

    // Feed
    'feed.loading': 'Inapakia video...',
    'feed.no_videos': 'Hakuna video iliyopatikana',
    'feed.like': 'Penda',
    'feed.unlike': 'Usipende',
    'feed.comment': 'Komentisha',
    'feed.share': 'Shiriki',
    'feed.follow': 'Fuata',
    'feed.unfollow': 'Usifuate',

    // Upload
    'upload.title': 'Pakia Video',
    'upload.drag_drop': 'Buruta na kuangusha video yako hapa',
    'upload.select_file': 'Chagua faili',
    'upload.video_title': 'Jina la video',
    'upload.description': 'Maelezo',
    'upload.add_sound': 'Ongeza sauti',
    'upload.make_public': 'Fanya kuwa umma',
    'upload.publish': 'Chapisha',
    'upload.uploading': 'Inapakia...',
    'upload.success': 'Video imepakiwa kwa mafanikio!',

    // Profile
    'profile.followers': 'Wafuasi',
    'profile.following': 'Inafuata',
    'profile.videos': 'Video',
    'profile.edit': 'Hariri Wasifu',
    'profile.my_videos': 'Video Zangu',
    'profile.earnings': 'Mapato',

    // Monetization
    'monetization.title': 'Mapato',
    'monetization.total_earnings': 'Jumla ya Mapato',
    'monetization.total_withdrawals': 'Jumla ya Matoleo',
    'monetization.available_balance': 'Salio Linalotumika',
    'monetization.request_withdrawal': 'Omba Matoleo',
    'monetization.amount': 'Kiasi',
    'monetization.payment_method': 'Njia ya Malipo',
    'monetization.mtn_money': 'MTN Mobile Money',
    'monetization.orange_money': 'Orange Money',
    'monetization.wave': 'Wave',
    'monetization.airtel_money': 'Airtel Money',
    'monetization.bank_transfer': 'Hamisha Benki',

    // Search
    'search.title': 'Tafuta',
    'search.placeholder': 'Tafuta video au waundaji...',
    'search.videos': 'Video',
    'search.creators': 'Waundaji',
    'search.hashtags': 'Hashtags',

    // Trending
    'trending.title': 'Inaendelea',
    'trending.videos': 'Video Inaendelea',
    'trending.hashtags': 'Hashtags Inaendelea',
    'trending.creators': 'Waundaji Maarufu',

    // Common
    'common.loading': 'Inapakia...',
    'common.error': 'Kosa limetokea',
    'common.success': 'Mafanikio!',
    'common.cancel': 'Ghairi',
    'common.save': 'Hifadhi',
    'common.delete': 'Futa',
    'common.edit': 'Hariri',
    'common.close': 'Funga',
  },

  yo: {
    // Navigation
    'nav.home': 'Ile',
    'nav.feed': 'Ifitilaasi',
    'nav.search': 'Wa',
    'nav.trending': 'Ninu Inu',
    'nav.upload': 'Gbe Soke',
    'nav.profile': 'Itan Ara',
    'nav.monetization': 'Owo',
    'nav.notifications': 'Ifiranpe',
    'nav.logout': 'Jade',

    // Feed
    'feed.loading': 'N wo fidiyo...',
    'feed.no_videos': 'Fidiyo ko si',
    'feed.like': 'Fere',
    'feed.unlike': 'Ma fere',
    'feed.comment': 'Soro',
    'feed.share': 'Pin',
    'feed.follow': 'Tele',
    'feed.unfollow': 'Ma tele',

    // Upload
    'upload.title': 'Gbe Fidiyo Soke',
    'upload.drag_drop': 'Gbe fidiyo re sile',
    'upload.select_file': 'Yan faili',
    'upload.video_title': 'Oruko fidiyo',
    'upload.description': 'Alaye',
    'upload.add_sound': 'Fi orin',
    'upload.make_public': 'Jeki agbaye',
    'upload.publish': 'Tu',
    'upload.uploading': 'N gbe...',
    'upload.success': 'Fidiyo gbe pelu aanu!',

    // Profile
    'profile.followers': 'Olumulo',
    'profile.following': 'N tele',
    'profile.videos': 'Fidiyo',
    'profile.edit': 'Tun Itan Ara',
    'profile.my_videos': 'Fidiyo Mi',
    'profile.earnings': 'Owo',

    // Monetization
    'monetization.title': 'Owo',
    'monetization.total_earnings': 'Owo Lapapọ',
    'monetization.total_withdrawals': 'Owo Jade Lapapọ',
    'monetization.available_balance': 'Owo Wa Lilo',
    'monetization.request_withdrawal': 'Beere Owo Jade',
    'monetization.amount': 'Iye',
    'monetization.payment_method': 'Ọna Sanwo',
    'monetization.mtn_money': 'MTN Mobile Money',
    'monetization.orange_money': 'Orange Money',
    'monetization.wave': 'Wave',
    'monetization.airtel_money': 'Airtel Money',
    'monetization.bank_transfer': 'Sanwo Bank',

    // Search
    'search.title': 'Wa',
    'search.placeholder': 'Wa fidiyo tabi olupese...',
    'search.videos': 'Fidiyo',
    'search.creators': 'Olupese',
    'search.hashtags': 'Hashtags',

    // Trending
    'trending.title': 'Ninu Inu',
    'trending.videos': 'Fidiyo Ninu Inu',
    'trending.hashtags': 'Hashtags Ninu Inu',
    'trending.creators': 'Olupese Iyalode',

    // Common
    'common.loading': 'N wo...',
    'common.error': 'Aisan kan wa de',
    'common.success': 'Aanu!',
    'common.cancel': 'Fagile',
    'common.save': 'Fi',
    'common.delete': 'Pa',
    'common.edit': 'Tun',
    'common.close': 'Tii',
  },

  ha: {
    // Navigation
    'nav.home': 'Gida',
    'nav.feed': 'Jerin',
    'nav.search': 'Nemi',
    'nav.trending': 'Abin Jiya',
    'nav.upload': 'Saka',
    'nav.profile': 'Bayani',
    'nav.monetization': 'Kudin',
    'nav.notifications': 'Sanarwa',
    'nav.logout': 'Fita',

    // Feed
    'feed.loading': 'Yana karawa bidiyo...',
    'feed.no_videos': 'Babu bidiyo',
    'feed.like': 'Sani',
    'feed.unlike': 'Bada sani',
    'feed.comment': 'Sharhi',
    'feed.share': 'Raba',
    'feed.follow': 'Bi',
    'feed.unfollow': 'Bada bi',

    // Upload
    'upload.title': 'Saka Bidiyo',
    'upload.drag_drop': 'Jera bidiyo nan',
    'upload.select_file': 'Zaɓi fayil',
    'upload.video_title': 'Sunan bidiyo',
    'upload.description': 'Bayanai',
    'upload.add_sound': 'Ƙara sautin',
    'upload.make_public': 'Sanya jama\'a',
    'upload.publish': 'Buga',
    'upload.uploading': 'Yana saka...',
    'upload.success': 'Bidiyo an saka da nasara!',

    // Profile
    'profile.followers': 'Masu bi',
    'profile.following': 'Yana bi',
    'profile.videos': 'Bidiyo',
    'profile.edit': 'Gyara Bayani',
    'profile.my_videos': 'Bidiyon Ni',
    'profile.earnings': 'Kudin',

    // Monetization
    'monetization.title': 'Kudin',
    'monetization.total_earnings': 'Jimillar Kudin',
    'monetization.total_withdrawals': 'Jimillar Cire',
    'monetization.available_balance': 'Kudin da Ake Iya Amfani',
    'monetization.request_withdrawal': 'Nema Cire',
    'monetization.amount': 'Adadi',
    'monetization.payment_method': 'Hanyar Biya',
    'monetization.mtn_money': 'MTN Mobile Money',
    'monetization.orange_money': 'Orange Money',
    'monetization.wave': 'Wave',
    'monetization.airtel_money': 'Airtel Money',
    'monetization.bank_transfer': 'Cire Bank',

    // Search
    'search.title': 'Nemi',
    'search.placeholder': 'Nemi bidiyo ko marubuta...',
    'search.videos': 'Bidiyo',
    'search.creators': 'Marubuta',
    'search.hashtags': 'Hashtags',

    // Trending
    'trending.title': 'Abin Jiya',
    'trending.videos': 'Bidiyon Jiya',
    'trending.hashtags': 'Hashtags Jiya',
    'trending.creators': 'Marubuta Sani',

    // Common
    'common.loading': 'Yana karawa...',
    'common.error': 'Kuskure ya faru',
    'common.success': 'Nasara!',
    'common.cancel': 'Soke',
    'common.save': 'Ajiye',
    'common.delete': 'Gida',
    'common.edit': 'Gyara',
    'common.close': 'Rufe',
  },

  zu: {
    // Navigation
    'nav.home': 'Ekhaya',
    'nav.feed': 'Ukulandela',
    'nav.search': 'Sesha',
    'nav.trending': 'Okuthanda',
    'nav.upload': 'Layisha',
    'nav.profile': 'Umprofayili',
    'nav.monetization': 'Imali',
    'nav.notifications': 'Izaziso',
    'nav.logout': 'Phuma',

    // Feed
    'feed.loading': 'Ikulayisha amavidiyo...',
    'feed.no_videos': 'Akukho amavidiyo atholiwe',
    'feed.like': 'Thanda',
    'feed.unlike': 'Ungathandi',
    'feed.comment': 'Bhala umqulu',
    'feed.share': 'Yabelana',
    'feed.follow': 'Landela',
    'feed.unfollow': 'Ungalandeli',

    // Upload
    'upload.title': 'Layisha Ividiyo',
    'upload.drag_drop': 'Zulazula ividiyo yakho lapha',
    'upload.select_file': 'Khetha ifayili',
    'upload.video_title': 'Igama levidiyo',
    'upload.description': 'Incazelo',
    'upload.add_sound': 'Engeza umsindo',
    'upload.make_public': 'Yenza yomphakathi',
    'upload.publish': 'Phakamisa',
    'upload.uploading': 'Ikulayisha...',
    'upload.success': 'Ividiyo ilayishwe ngempumelelo!',

    // Profile
    'profile.followers': 'Aballandeli',
    'profile.following': 'Ilandelayo',
    'profile.videos': 'Amavidiyo',
    'profile.edit': 'Hlela Umprofayili',
    'profile.my_videos': 'Amavidiyo Ami',
    'profile.earnings': 'Imali',

    // Monetization
    'monetization.title': 'Imali',
    'monetization.total_earnings': 'Imali Ephelele',
    'monetization.total_withdrawals': 'Imali Eyasuswa Ephelele',
    'monetization.available_balance': 'Isikweletu Esitholiwe',
    'monetization.request_withdrawal': 'Cela Ukususa Imali',
    'monetization.amount': 'Inani',
    'monetization.payment_method': 'Indlela Yokubhala',
    'monetization.mtn_money': 'MTN Mobile Money',
    'monetization.orange_money': 'Orange Money',
    'monetization.wave': 'Wave',
    'monetization.airtel_money': 'Airtel Money',
    'monetization.bank_transfer': 'Ukudluliswa Kwentengo',

    // Search
    'search.title': 'Sesha',
    'search.placeholder': 'Sesha amavidiyo noma abakhi...',
    'search.videos': 'Amavidiyo',
    'search.creators': 'Abakhi',
    'search.hashtags': 'Hashtags',

    // Trending
    'trending.title': 'Okuthanda',
    'trending.videos': 'Amavidiyo Athanda',
    'trending.hashtags': 'Hashtags Athanda',
    'trending.creators': 'Abakhi Abalondolozile',

    // Common
    'common.loading': 'Ikulayisha...',
    'common.error': 'Kwenzeke iphutha',
    'common.success': 'Impumelelo!',
    'common.cancel': 'Khansela',
    'common.save': 'Londoloza',
    'common.delete': 'Susa',
    'common.edit': 'Hlela',
    'common.close': 'Vala',
  },
};

/**
 * Hook pour utiliser les traductions
 */
export function useTranslation(language: Language) {
  return (key: string, defaultValue?: string) => {
    return translations[language]?.[key] || defaultValue || key;
  };
}
