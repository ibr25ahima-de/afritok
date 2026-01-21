# Guide Complet de l'Intégration Stripe sur Afritok

## Vue d'ensemble

Afritok dispose d'une intégration complète de Stripe pour gérer :
- **Paiements ponctuels** : Cadeaux virtuels, tips, produits
- **Abonnements** : 4 plans d'abonnement flexibles
- **Webhooks** : Synchronisation en temps réel des événements
- **Interface utilisateur** : Composants React prêts à l'emploi

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ SubscriptionPlans│  │    StripeCheckout            │ │
│  │  - Affiche plans │  │  - Formulaire de paiement    │ │
│  │  - Sélection     │  │  - Validation des données    │ │
│  └──────────────────┘  └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│                  Backend (Node.js/tRPC)                  │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ Stripe Payments  │  │  Subscriptions Manager       │ │
│  │  - Customers     │  │  - Plans                     │ │
│  │  - Payment Intent│  │  - Gestion abonnements       │ │
│  │  - Charges       │  │  - Vérification accès        │ │
│  └──────────────────┘  └──────────────────────────────┘ │
│  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │ Stripe Webhooks  │  │  One-Time Payments           │ │
│  │  - Vérification  │  │  - Paiements ponctuels       │ │
│  │  - Événements    │  │  - Remboursements            │ │
│  │  - Handlers      │  │  - Historique                │ │
│  └──────────────────┘  └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│                   Stripe API (Cloud)                     │
│  - Traitement des paiements                             │
│  - Gestion des abonnements                              │
│  - Webhooks                                             │
└──────────────────────────────────────────────────────────┘
```

## Modules

### 1. stripe-payments.ts
Gère les paiements et les clients Stripe.

**Fonctions principales** :
- `createCustomer()` - Créer un client Stripe
- `createPaymentIntent()` - Créer une intention de paiement
- `createCheckoutSession()` - Créer une session de checkout
- `getCustomerSubscriptions()` - Obtenir les abonnements
- `createSubscription()` - Créer un abonnement
- `cancelSubscription()` - Annuler un abonnement

### 2. subscriptions.ts
Gère les plans d'abonnement et les abonnements utilisateur.

**Plans disponibles** :
- Creator Basic ($9.99/mois, essai 7j)
- Creator Pro ($24.99/mois, essai 14j)
- Creator Pro Annual ($249.99/an, essai 30j)
- Creator Elite ($49.99/mois, essai 14j)

**Fonctions principales** :
- `getPlans()` - Obtenir tous les plans
- `createSubscription()` - Créer un abonnement
- `cancelSubscription()` - Annuler un abonnement
- `updateSubscription()` - Changer de plan
- `hasFeatureAccess()` - Vérifier l'accès à une fonctionnalité

### 3. one-time-payments.ts
Gère les paiements ponctuels (cadeaux, tips, produits).

**Fonctions principales** :
- `createPayment()` - Créer un paiement
- `confirmPayment()` - Confirmer un paiement
- `refundPayment()` - Rembourser un paiement
- `getUserPaymentHistory()` - Historique des paiements

### 4. stripe-webhooks.ts
Gère les événements webhook de Stripe.

**Événements gérés** :
- `payment_intent.succeeded` - Paiement réussi
- `payment_intent.payment_failed` - Paiement échoué
- `customer.subscription.created` - Abonnement créé
- `customer.subscription.updated` - Abonnement mis à jour
- `customer.subscription.deleted` - Abonnement supprimé
- `invoice.paid` - Facture payée
- `invoice.payment_failed` - Paiement facture échoué
- Et 5 autres événements...

### 5. webhook-endpoint.ts
Endpoint Express pour recevoir les webhooks.

**Route** : `POST /api/webhooks/stripe`

## Configuration

### Variables d'environnement

```env
# Clés Stripe
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXX
```

### Installation

```bash
pnpm add stripe @stripe/stripe-js @stripe/react-stripe-js
```

## Utilisation

### Afficher les plans d'abonnement

```tsx
import { SubscriptionPlans } from '@/components/SubscriptionPlans';

export function PricingPage() {
  return <SubscriptionPlans />;
}
```

### Créer un abonnement

```tsx
const createSubscriptionMutation = trpc.subscriptions.createSubscription.useMutation();

const handleSubscribe = async (planId: string) => {
  const result = await createSubscriptionMutation.mutateAsync({
    customerId: 'cus_XXXXXXXXXX',
    planId,
  });
};
```

### Vérifier l'accès à une fonctionnalité

```tsx
const { data } = trpc.subscriptions.hasFeatureAccess.useQuery({
  customerId: 'cus_XXXXXXXXXX',
  featureId: 'advanced-analytics',
});

if (data?.hasAccess) {
  // Afficher la fonctionnalité
}
```

### Traiter un paiement ponctuel

```tsx
const createPaymentMutation = trpc.stripe.createPayment.useMutation();

const handlePayment = async (amount: number, recipientId: number) => {
  const result = await createPaymentMutation.mutateAsync({
    amount,
    currency: 'USD',
    recipientId,
    type: 'gift',
  });
};
```

## Flux utilisateur

### 1. Inscription et sélection de plan

```
Utilisateur → Inscription → Page de tarification → Sélection de plan
```

### 2. Paiement

```
Sélection → Checkout → Formulaire de paiement → Confirmation → Dashboard
```

### 3. Gestion de l'abonnement

```
Dashboard → Voir l'abonnement → Changer de plan / Annuler / Mettre à jour
```

## Tests

Exécuter les tests Stripe :

```bash
pnpm test stripe-integration
```

**Couverture** :
- 22 tests
- Tous les plans d'abonnement
- Calculs de prix
- Périodes d'essai
- Fonctionnalités

## Sécurité

### Vérification de signature

Tous les webhooks sont vérifiés avec une signature HMAC-SHA256 :

```typescript
const event = manager.verifyWebhookSignature(body, signature, secret);
if (!event) {
  // Signature invalide - rejeter
  return;
}
```

### Idempotence

Toujours implémenter l'idempotence pour gérer les retries :

```typescript
const processed = await isEventProcessed(event.id);
if (processed) {
  return; // Ignorer les doublons
}
```

### Validation des données

Valider toutes les entrées utilisateur :

```typescript
const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
});

const validated = schema.parse(input);
```

## Monitoring

### Logs

Tous les événements Stripe sont loggés :

```bash
tail -f logs/stripe.log
```

### Alertes

Configurer des alertes pour les événements importants :

```typescript
if (event.type === 'payment_intent.payment_failed') {
  await alertAdministrator('Payment failed', { ... });
}
```

## Troubleshooting

### Webhook non reçu

1. Vérifier que l'endpoint est accessible
2. Vérifier le secret webhook
3. Vérifier les logs Stripe

### Erreur de signature

- Vérifier le secret webhook
- Vérifier que le body n'a pas été modifié
- Vérifier le header `stripe-signature`

### Paiement échoué

- Vérifier la carte de test
- Vérifier le montant
- Vérifier les logs d'erreur

## Ressources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions)

## Prochaines étapes

1. **Configurer les clés Stripe** en production
2. **Tester les paiements** avec les cartes de test
3. **Configurer les webhooks** dans le dashboard Stripe
4. **Monitorer les événements** en production
5. **Optimiser les performances** si nécessaire

## Support

Pour toute question ou problème :
- Consulter la [documentation Stripe](https://stripe.com/docs)
- Vérifier les [logs d'erreur](logs/)
- Contacter le [support Stripe](https://support.stripe.com)
