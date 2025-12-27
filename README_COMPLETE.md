# Afritok - Social Video Platform for Africa

Afritok est une plateforme de partage vidéo inspirée de TikTok, conçue spécifiquement pour les créateurs africains. Elle offre une expérience complète de création, de partage et de monétisation de contenu vidéo.

## 🌍 Caractéristiques principales

### 📱 Plateforme vidéo complète
- **Feed vidéo infini** - Scroll vertical comme TikTok
- **Lecteur vidéo avancé** - Contrôles complets (play, pause, volume, barre de progression)
- **Upload vidéo** - Téléchargement avec validation et compression
- **Système de sons** - Bibliothèque de musique et d'effets sonores
- **Commentaires** - Système de commentaires en temps réel
- **Likes et partages** - Engagement complet avec les vidéos

### 👥 Système social
- **Profils utilisateurs** - Profils personnalisables avec bio, avatar, pays
- **Followers/Following** - Système de suivi des créateurs
- **Notifications** - Notifications en temps réel (likes, commentaires, follows)
- **Blocage et signalement** - Outils de modération et de sécurité
- **Recherche** - Recherche de vidéos et de créateurs

### 💰 Monétisation
- **Tableau de bord de revenus** - Suivi des gains en temps réel
- **Système de dons** - Les fans peuvent donner aux créateurs
- **Paiements Stripe** - Intégration sécurisée pour les paiements
- **Retraits** - Système de retrait d'argent vers les comptes bancaires
- **Support multi-devises** - USD, EUR, GBP, ZAR, NGN, KES, GHS

### 🛡️ Sécurité et administration
- **Tableau de bord admin** - Gestion des utilisateurs et du contenu
- **Rate limiting** - Protection contre les abus
- **Validation des entrées** - Sécurité des données
- **Logs de sécurité** - Suivi des activités suspectes
- **Authentification OAuth** - Connexion sécurisée via Manus

## 🚀 Stack technique

### Frontend
- **React 19** - Framework UI moderne
- **TypeScript** - Typage statique
- **Tailwind CSS 4** - Styling utility-first
- **Vite** - Build tool rapide
- **tRPC** - RPC typé end-to-end
- **Wouter** - Routeur léger

### Backend
- **Express 4** - Serveur web
- **tRPC 11** - API typée
- **Drizzle ORM** - Gestion de base de données
- **MySQL 8** - Base de données relationnelle
- **Stripe** - Paiements
- **Helmet** - Sécurité HTTP

### Infrastructure
- **Docker** - Containerisation
- **Docker Compose** - Orchestration locale
- **GitHub Actions** - CI/CD
- **Nginx** - Reverse proxy
- **Let's Encrypt** - SSL/TLS

## 📋 Fonctionnalités implémentées

### Phase 1-6: Fondations ✅
- [x] Authentification OAuth Manus
- [x] Base de données MySQL avec Drizzle
- [x] Feed vidéo avec scroll infini
- [x] Système de likes et commentaires
- [x] Profils utilisateurs
- [x] Tableau de bord de monétisation
- [x] Tableau de bord administrateur
- [x] Design sombre avec couleurs africaines

### Phase 7: Fonctionnalités critiques ✅
- [x] Upload vidéo avec validation
- [x] Lecteur vidéo avancé (HTML5)
- [x] Système de commentaires complet
- [x] Notifications (endpoints)
- [x] Recherche et hashtags
- [x] Vidéos tendances

### Phase 8: Fonctionnalités importantes ✅
- [x] Partage social (WhatsApp, Twitter, Facebook, Email)
- [x] Édition complète du profil
- [x] Gestion des vidéos (suppression, public/privé)
- [x] Système de blocage et signalement
- [x] Page de notifications

### Phase 9: Audio/Effets ✅
- [x] Service de gestion audio
- [x] Sélecteur de sons
- [x] Intégration audio dans l'upload
- [x] Contrôle du volume

### Phase 10: Monétisation ✅
- [x] Intégration Stripe
- [x] Endpoints de paiement
- [x] Page de donation
- [x] Support multi-devises

### Phase 11: Sécurité ✅
- [x] Rate limiting
- [x] Validation des entrées
- [x] Middlewares de sécurité
- [x] Gestion d'erreurs robuste
- [x] Logging de sécurité

### Phase 12: CI/CD ✅
- [x] Configuration GitHub Actions
- [x] Dockerfile et docker-compose
- [x] Guide de déploiement complet

## 🛠️ Installation et démarrage

### Prérequis
- Node.js 18+ ou 20+
- pnpm
- MySQL 8.0+

### Installation locale

```bash
# Cloner le repository
git clone <your-repo-url>
cd afritok

# Installer les dépendances
pnpm install

# Configurer les variables d'environnement
cp .env.example .env.local

# Initialiser la base de données
pnpm db:push

# Démarrer le serveur de développement
pnpm dev
```

L'application sera disponible à `http://localhost:3000`

### Variables d'environnement requises

```env
# Base de données
DATABASE_URL=mysql://user:password@localhost:3306/afritok

# Authentification
JWT_SECRET=your-secret-key
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Stripe (optionnel)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 📚 Documentation

- [Guide de déploiement](./DEPLOYMENT.md) - Instructions pour déployer en production
- [Guide utilisateur](./userGuide.md) - Guide d'utilisation pour les utilisateurs
- [Architecture](./docs/ARCHITECTURE.md) - Vue d'ensemble technique
- [API tRPC](./docs/API.md) - Documentation des endpoints

## 🔐 Sécurité

Afritok implémente plusieurs couches de sécurité:

- **Authentification** - OAuth 2.0 avec Manus
- **Rate limiting** - Protection contre les abus
- **Validation des entrées** - Nettoyage et validation de toutes les données
- **CORS** - Configuration sécurisée des origines
- **Helmet** - En-têtes de sécurité HTTP
- **Logs de sécurité** - Enregistrement des activités suspectes

## 📊 Performance

- **Lazy loading** - Chargement des vidéos à la demande
- **Caching** - Cache des requêtes fréquentes
- **Compression** - Compression des vidéos et des images
- **CDN** - Distribution de contenu via CDN (optionnel)

## 🚀 Déploiement

Afritok peut être déployée sur:

- **Docker** - Containerisation complète
- **Heroku** - Déploiement simple
- **AWS** - ECS, Elastic Beanstalk, EC2
- **DigitalOcean** - Droplets avec Docker
- **Vercel** - Frontend uniquement

Voir [DEPLOYMENT.md](./DEPLOYMENT.md) pour les instructions détaillées.

## 🤝 Contribution

Les contributions sont bienvenues! Veuillez:

1. Fork le repository
2. Créer une branche pour votre feature (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir [LICENSE](./LICENSE) pour plus de détails.

## 💬 Support

Pour obtenir de l'aide:

- **Issues GitHub** - Signaler des bugs ou demander des features
- **Discussions** - Poser des questions et discuter
- **Email** - support@afritok.com

## 🎯 Roadmap

### Court terme (1-2 mois)
- [ ] Intégration complète des APIs Mobile Money
- [ ] Système de recommandation avec IA
- [ ] Livestream en direct
- [ ] Stories (contenu temporaire)

### Moyen terme (3-6 mois)
- [ ] App mobile iOS/Android native
- [ ] Support multi-langue
- [ ] Système de vérification (badges bleus)
- [ ] Programme d'affiliation

### Long terme (6-12 mois)
- [ ] Marketplace pour les créateurs
- [ ] Système de NFT pour les vidéos
- [ ] Intégration Web3
- [ ] Expansion vers d'autres régions

## 👥 Équipe

Afritok a été créé par une équipe passionnée par l'empowerment des créateurs africains.

## 🙏 Remerciements

Merci à tous les contributeurs et à la communauté africaine pour leur soutien!

---

**Afritok - Donnez du pouvoir aux créateurs africains** 🌍🎬
