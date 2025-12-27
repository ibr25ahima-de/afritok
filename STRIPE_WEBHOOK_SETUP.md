# Guide de Configuration des Webhooks Stripe

## Vue d'ensemble

Les webhooks Stripe permettent à Afritok de recevoir des notifications en temps réel pour tous les événements de paiement et d'abonnement.

## Architecture

```
Stripe API
    ↓
Webhook Event (POST)
    ↓
https://afritok.com/api/webhooks/stripe
    ↓
Vérification de signature
    ↓
Handler d'événement
    ↓
Mise à jour base de données
    ↓
Notifications utilisateur
```

## Configuration en développement

### 1. Installer Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl https://files.stripe.com/stripe-cli/install.sh -O
sudo bash install.sh

# Windows
choco install stripe
```

### 2. Authentifier Stripe CLI

```bash
stripe login
```

Cela va ouvrir votre navigateur pour vous connecter à Stripe.

### 3. Tester l'endpoint webhook

```bash
# Démarrer le forwarding local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Vous verrez un message comme :
# > Ready! Your webhook signing secret is: whsec_test_XXXXXXXXXX
```

### 4. Configurer la variable d'environnement

```bash
# Copier le secret webhook
export STRIPE_WEBHOOK_SECRET=whsec_test_XXXXXXXXXX
```

### 5. Tester avec un événement

```bash
# Dans un autre terminal
stripe trigger payment_intent.succeeded

# Vous devriez voir :
# 2024-01-15 10:30:45 → payment_intent.succeeded [evt_1XXXXXXXXXX]
```

## Configuration en production

### 1. Obtenir le secret webhook

1. Aller sur [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Cliquer sur "Add endpoint"
3. Entrer l'URL : `https://afritok.com/api/webhooks/stripe`
4. Sélectionner les événements à écouter (voir ci-dessous)
5. Cliquer sur "Add endpoint"
6. Copier le secret webhook (commence par `whsec_live_`)

### 2. Configurer les événements

Sélectionner les événements suivants :

#### Paiements
- `payment_intent.succeeded` - Paiement réussi
- `payment_intent.payment_failed` - Paiement échoué
- `charge.refunded` - Remboursement
- `charge.dispute.created` - Litige créé

#### Abonnements
- `customer.subscription.created` - Abonnement créé
- `customer.subscription.updated` - Abonnement mis à jour
- `customer.subscription.deleted` - Abonnement supprimé

#### Facturation
- `invoice.created` - Facture créée
- `invoice.paid` - Facture payée
- `invoice.payment_failed` - Paiement facture échoué

#### Clients
- `customer.source.created` - Source créée
- `customer.source.deleted` - Source supprimée

### 3. Ajouter le secret à l'environnement

```bash
# Dans votre fichier .env.production
STRIPE_WEBHOOK_SECRET=whsec_live_XXXXXXXXXX
```

### 4. Vérifier la configuration

```bash
# Tester l'endpoint
curl -X POST https://afritok.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"test.webhook"}'

# Réponse attendue :
# {"error":"Invalid signature"}  (c'est normal, on teste juste l'accessibilité)
```

## Événements gérés

### payment_intent.succeeded
Déclenché quand un paiement réussit.

**Actions** :
- Mettre à jour le statut du paiement à "completed"
- Envoyer une notification à l'utilisateur
- Envoyer une notification au créateur (si applicable)
- Créditer le compte du créateur

### payment_intent.payment_failed
Déclenché quand un paiement échoue.

**Actions** :
- Mettre à jour le statut du paiement à "failed"
- Envoyer une notification d'erreur à l'utilisateur
- Créer un token de retry
- Permettre à l'utilisateur de réessayer

### customer.subscription.created
Déclenché quand un abonnement est créé.

**Actions** :
- Mettre à jour le statut de l'utilisateur à "subscriber"
- Envoyer une notification de bienvenue
- Débloquer les fonctionnalités premium
- Enregistrer la date de début de l'abonnement

### customer.subscription.updated
Déclenché quand un abonnement est mis à jour (changement de plan, etc.).

**Actions** :
- Mettre à jour le plan de l'utilisateur
- Ajuster les fonctionnalités disponibles
- Envoyer une notification de confirmation

### customer.subscription.deleted
Déclenché quand un abonnement est annulé.

**Actions** :
- Mettre à jour le statut de l'utilisateur à "free"
- Révoquer les fonctionnalités premium
- Envoyer une notification de confirmation
- Proposer de réactiver l'abonnement

### invoice.paid
Déclenché quand une facture est payée.

**Actions** :
- Mettre à jour le statut de la facture
- Envoyer une notification de paiement
- Enregistrer la transaction

### invoice.payment_failed
Déclenché quand le paiement d'une facture échoue.

**Actions** :
- Mettre à jour le statut de la facture
- Envoyer une notification d'erreur
- Planifier un retry automatique

### charge.refunded
Déclenché quand un remboursement est traité.

**Actions** :
- Mettre à jour le statut du paiement à "refunded"
- Débiter le compte du créateur
- Envoyer une notification de remboursement

## Vérification de signature

Tous les webhooks sont vérifiés avec une signature HMAC-SHA256 :

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Vérifier la signature
const event = stripe.webhooks.constructEvent(
  body,           // Raw body (pas JSON.parse)
  signature,      // Header stripe-signature
  webhookSecret   // Secret webhook
);
```

**Important** : Le body DOIT être le raw body, pas une chaîne JSON parsée.

## Monitoring et débogage

### Voir les logs des webhooks

```bash
# Dans le dashboard Stripe
https://dashboard.stripe.com/webhooks
```

Cliquez sur votre endpoint pour voir :
- Les événements reçus
- Les réponses (succès/erreur)
- Les timestamps
- Les détails des événements

### Tester les webhooks

```bash
# Avec Stripe CLI
stripe trigger payment_intent.succeeded

# Avec curl
curl https://api.stripe.com/v1/events \
  -u sk_test_XXXXXXXXXX: \
  -d "type=payment_intent.succeeded"
```

### Voir les logs d'Afritok

```bash
# Logs en temps réel
tail -f logs/stripe.log

# Filtrer par événement
grep "payment_intent.succeeded" logs/stripe.log
```

## Troubleshooting

### Webhook non reçu

1. **Vérifier que l'endpoint est accessible**
   ```bash
   curl -X POST https://afritok.com/api/webhooks/stripe
   ```

2. **Vérifier le secret webhook**
   - Aller sur https://dashboard.stripe.com/webhooks
   - Cliquer sur l'endpoint
   - Vérifier que le secret correspond à `STRIPE_WEBHOOK_SECRET`

3. **Vérifier les logs Stripe**
   - Aller sur https://dashboard.stripe.com/webhooks
   - Cliquer sur l'endpoint
   - Voir les événements récents et leurs statuts

### Erreur "Invalid signature"

1. **Vérifier que le body est raw**
   - Le body NE DOIT PAS être JSON.parse()
   - Utiliser `express.raw({type: 'application/json'})`

2. **Vérifier le secret**
   - S'assurer que `STRIPE_WEBHOOK_SECRET` est correct
   - Copier-coller depuis le dashboard (pas de typo)

3. **Vérifier le header**
   - Vérifier que le header `stripe-signature` est présent
   - Vérifier que le header n'a pas été modifié

### Événement traité deux fois

Implémenter l'idempotence :

```typescript
// Vérifier si l'événement a déjà été traité
const processed = await isEventProcessed(event.id);
if (processed) {
  return; // Ignorer les doublons
}

// Traiter l'événement
await handleEvent(event);

// Marquer comme traité
await markEventAsProcessed(event.id);
```

## Ressources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Event Types](https://stripe.com/docs/api/events/types)
- [Stripe Testing](https://stripe.com/docs/testing)

## Support

Pour toute question ou problème :
- Consulter la [documentation Stripe](https://stripe.com/docs)
- Vérifier les [logs d'erreur](logs/)
- Contacter le [support Stripe](https://support.stripe.com)
