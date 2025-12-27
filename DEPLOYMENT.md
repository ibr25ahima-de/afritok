# Guide de Déploiement Afritok

Ce document explique comment déployer Afritok en production.

## Table des matières

1. [Prérequis](#prérequis)
2. [Déploiement Docker](#déploiement-docker)
3. [Déploiement sur Heroku](#déploiement-sur-heroku)
4. [Déploiement sur AWS](#déploiement-sur-aws)
5. [Déploiement sur DigitalOcean](#déploiement-sur-digitalocean)
6. [Configuration des variables d'environnement](#configuration-des-variables-denvironnement)
7. [Sauvegardes et maintenance](#sauvegardes-et-maintenance)

## Prérequis

- Node.js 18+ ou 20+
- pnpm (ou npm/yarn)
- Docker et Docker Compose (pour déploiement Docker)
- Base de données MySQL 8.0+
- Compte Stripe (pour les paiements)
- Clés Manus OAuth

## Déploiement Docker

### 1. Préparer l'environnement

```bash
# Créer un fichier .env.production
cp .env.example .env.production

# Éditer le fichier avec vos variables
nano .env.production
```

### 2. Construire et lancer l'application

```bash
# Construire l'image Docker
docker build -t afritok:latest .

# Lancer avec docker-compose
docker-compose -f docker-compose.yml up -d

# Vérifier les logs
docker-compose logs -f app
```

### 3. Initialiser la base de données

```bash
# Appliquer les migrations
docker-compose exec app pnpm db:push

# Optionnel: Seeder les données
docker-compose exec app pnpm db:seed
```

## Déploiement sur Heroku

### 1. Créer une application Heroku

```bash
# Installer Heroku CLI
npm install -g heroku

# Se connecter
heroku login

# Créer l'app
heroku create afritok-app
```

### 2. Configurer les variables d'environnement

```bash
heroku config:set NODE_ENV=production
heroku config:set DATABASE_URL=<your-database-url>
heroku config:set JWT_SECRET=<your-jwt-secret>
heroku config:set STRIPE_SECRET_KEY=<your-stripe-key>
# ... ajouter toutes les variables nécessaires
```

### 3. Déployer

```bash
# Pousser le code
git push heroku main

# Vérifier les logs
heroku logs --tail
```

## Déploiement sur AWS

### Option 1: Elastic Container Service (ECS)

```bash
# Créer un repository ECR
aws ecr create-repository --repository-name afritok

# Construire et pousser l'image
docker build -t afritok:latest .
docker tag afritok:latest <account-id>.dkr.ecr.<region>.amazonaws.com/afritok:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/afritok:latest

# Créer un cluster ECS et déployer
# (Utiliser AWS Console ou AWS CLI)
```

### Option 2: Elastic Beanstalk

```bash
# Installer EB CLI
pip install awsebcli

# Initialiser
eb init -p docker afritok

# Créer l'environnement
eb create afritok-env

# Déployer
eb deploy
```

## Déploiement sur DigitalOcean

### 1. Créer une Droplet

```bash
# Créer une Droplet Ubuntu 22.04 avec Docker pré-installé
# Via DigitalOcean Console
```

### 2. Se connecter et configurer

```bash
# SSH dans la Droplet
ssh root@<droplet-ip>

# Cloner le repository
git clone <your-repo-url>
cd afritok

# Créer .env.production
nano .env.production

# Lancer l'application
docker-compose up -d
```

### 3. Configurer Nginx (reverse proxy)

```bash
# Installer Nginx
apt-get update && apt-get install -y nginx

# Créer la configuration
nano /etc/nginx/sites-available/afritok

# Configuration exemple:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Activer la configuration
ln -s /etc/nginx/sites-available/afritok /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 4. SSL avec Let's Encrypt

```bash
# Installer Certbot
apt-get install -y certbot python3-certbot-nginx

# Obtenir un certificat
certbot --nginx -d your-domain.com

# Renouvellement automatique
systemctl enable certbot.timer
```

## Configuration des variables d'environnement

### Variables obligatoires

```env
# Base de données
DATABASE_URL=mysql://user:password@host:3306/afritok

# Authentification
JWT_SECRET=<generate-a-strong-secret>
VITE_APP_ID=<your-manus-app-id>
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im

# Stripe (paiements)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stockage S3
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=us-east-1
S3_BUCKET_NAME=afritok-videos

# Application
NODE_ENV=production
PORT=3000
```

### Variables optionnelles

```env
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=<your-website-id>

# Redis (cache)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
```

## Sauvegardes et maintenance

### Sauvegarder la base de données

```bash
# Sauvegarde manuelle
mysqldump -u user -p database_name > backup.sql

# Sauvegarde automatique (cron job)
# Ajouter à crontab:
0 2 * * * mysqldump -u user -p password database_name > /backups/backup-$(date +\%Y\%m\%d).sql

# Restaurer une sauvegarde
mysql -u user -p database_name < backup.sql
```

### Monitoring et logs

```bash
# Vérifier les logs Docker
docker-compose logs -f app

# Vérifier l'état des services
docker-compose ps

# Redémarrer les services
docker-compose restart app

# Mettre à jour l'application
git pull origin main
docker-compose up -d --build
```

### Mise à jour de l'application

```bash
# Récupérer les derniers changements
git pull origin main

# Installer les dépendances
pnpm install

# Appliquer les migrations
pnpm db:push

# Reconstruire et redémarrer
docker-compose up -d --build
```

## Troubleshooting

### L'application ne démarre pas

```bash
# Vérifier les logs
docker-compose logs app

# Vérifier la connexion à la BD
docker-compose logs db

# Redémarrer tous les services
docker-compose restart
```

### Problèmes de base de données

```bash
# Vérifier la connexion
docker-compose exec db mysql -u user -p -e "SELECT 1"

# Vérifier les migrations
docker-compose exec app pnpm db:push --dry-run

# Réinitialiser la BD (ATTENTION!)
docker-compose exec db mysql -u root -p -e "DROP DATABASE afritok; CREATE DATABASE afritok;"
docker-compose exec app pnpm db:push
```

### Problèmes de performance

```bash
# Vérifier l'utilisation des ressources
docker stats

# Augmenter les limites de mémoire dans docker-compose.yml
# services:
#   app:
#     mem_limit: 2g
#     memswap_limit: 2g

# Activer le cache Redis
# Ajouter dans .env.production:
# REDIS_URL=redis://redis:6379
```

## Support

Pour plus d'aide, consultez:
- Documentation Afritok: [lien]
- Issues GitHub: [lien]
- Email: support@afritok.com
