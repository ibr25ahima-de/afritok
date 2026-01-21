# Configuration des Webhooks Stripe

## Vue d'ensemble

Les webhooks Stripe permettent à Afritok de recevoir des notifications en temps réel des événements Stripe (paiements, abonnements, factures, etc.).

## Types d'événements gérés

### Événements de paiement
- `payment_intent.succeeded` - Paiement réussi
- `payment_intent.payment_failed` - Paiement échoué

### Événements d'abonnement
- `customer.subscription.created` - Abonnement créé
- `customer.subscription.updated` - Abonnement mis à jour
- `customer.subscription.deleted` - Abonnement supprimé

### Événements de facturation
- `invoice.created` - Facture créée
- `invoice.paid` - Facture payée
- `invoice.payment_failed` - Paiement de facture échoué

### Événements de remboursement
- `charge.refunded` - Remboursement effectué

### Événements de litige
- `charge.dispute.created` - Litige créé

### Événements de source
- `customer.source.created` - Source de paiement créée
- `customer.source.deleted` - Source de paiement supprimée

## Installation

### 1. Ajouter l'endpoint webhook

Dans `server/_core/index.ts`, ajouter :

```typescript
import { handleStripeWebhook } from '../webhook-endpoint';

// Ajouter avant les autres routes
app.post('/api/webhooks/stripe', handleStripeWebhook);
```

### 2. Configurer le secret webhook

Ajouter dans `.env` :

```
STRIPE_WEBHOOK_SECRET=whsec_test_XXXXXXXXXX
```

### 3. Tester localement

Utiliser Stripe CLI pour tester les webhooks :

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Se connecter à Stripe
stripe login

# Forwarder les événements vers votre serveur local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Déclencher un événement de test
stripe trigger payment_intent.succeeded
```

## Configuration en production

### 1. Obtenir le secret webhook

1. Aller sur https://dashboard.stripe.com/webhooks
2. Créer un nouvel endpoint webhook
3. URL : `https://afritok.com/api/webhooks/stripe`
4. Événements à sélectionner :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.created`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
   - `customer.source.created`
   - `customer.source.deleted`

5. Copier le secret webhook (commence par `whsec_`)

### 2. Configurer le secret en production

Ajouter dans les variables d'environnement :

```
STRIPE_WEBHOOK_SECRET=whsec_live_XXXXXXXXXX
```

### 3. Vérifier la configuration

Tester l'endpoint :

```bash
curl -X POST https://afritok.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type": "payment_intent.succeeded"}'
```

## Implémentation des handlers

Chaque type d'événement a un handler dédié. Pour ajouter une action personnalisée :

### Exemple : Envoyer une notification au paiement réussi

Dans `server/stripe-webhooks.ts`, modifier `handlePaymentIntentSucceeded` :

```typescript
async handlePaymentIntentSucceeded(event: Stripe.Event): Promise<void> {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  // Récupérer les métadonnées
  const userId = paymentIntent.metadata?.userId;
  const recipientId = paymentIntent.metadata?.recipientId;

  // Mettre à jour la base de données
  await updatePaymentStatus(paymentIntent.id, 'succeeded');

  // Envoyer une notification
  await notifyUser(userId, 'Payment successful');
  await notifyCreator(recipientId, 'You received a payment');

  // Enregistrer dans les logs
  logger.info('Payment processed', {
    paymentIntentId: paymentIntent.id,
    userId,
    recipientId,
    amount: paymentIntent.amount,
  });
}
```

## Sécurité

### Vérification de signature

Tous les webhooks sont vérifiés avec une signature HMAC-SHA256. Cela garantit que les événements proviennent réellement de Stripe.

```typescript
const event = manager.verifyWebhookSignature(body, signature, secret);
if (!event) {
  // Signature invalide - rejeter l'événement
  return;
}
```

### Idempotence

Toujours implémenter l'idempotence dans les handlers pour gérer les retries :

```typescript
// Vérifier si l'événement a déjà été traité
const processed = await isEventProcessed(event.id);
if (processed) {
  return; // Ignorer les doublons
}

// Traiter l'événement
await processEvent(event);

// Marquer comme traité
await markEventAsProcessed(event.id);
```

## Monitoring

### Logs

Tous les événements webhook sont loggés :

```bash
# Voir les logs des webhooks
tail -f logs/webhooks.log

# Filtrer par type d'événement
grep "payment_intent.succeeded" logs/webhooks.log
```

### Alertes

Configurer des alertes pour les événements importants :

```typescript
// Alerte pour les paiements échoués
if (event.type === 'payment_intent.payment_failed') {
  await alertAdministrator('Payment failed', {
    paymentIntentId: paymentIntent.id,
    reason: paymentIntent.last_payment_error,
  });
}

// Alerte pour les litiges
if (event.type === 'charge.dispute.created') {
  await alertAdministrator('Dispute created', {
    disputeId: dispute.id,
    amount: dispute.amount,
  });
}
```

## Troubleshooting

### Webhook non reçu

1. Vérifier que l'endpoint est accessible :
   ```bash
   curl -X POST https://afritok.com/api/webhooks/stripe
   ```

2. Vérifier les logs Stripe :
   - Dashboard Stripe → Webhooks → Cliquer sur l'endpoint
   - Voir les événements et leurs réponses

3. Vérifier le secret webhook :
   ```bash
   echo $STRIPE_WEBHOOK_SECRET
   ```

### Erreur de signature

- Vérifier que le secret webhook est correct
- Vérifier que le body du webhook n'a pas été modifié
- Vérifier que le header `stripe-signature` est présent

### Événement traité deux fois

- Implémenter l'idempotence
- Vérifier les IDs d'événement uniques
- Utiliser une base de données pour tracker les événements traités

## Ressources

- [Documentation Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Événements Stripe](https://stripe.com/docs/api/events)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Sécurité des webhooks](https://stripe.com/docs/webhooks/signatures)
