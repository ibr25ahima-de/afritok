# Interface utilisateur Stripe

## Composants React

### 1. SubscriptionPlans

Affiche les plans d'abonnement disponibles.

```tsx
import { SubscriptionPlans } from '@/components/SubscriptionPlans';

export function PricingPage() {
  return <SubscriptionPlans />;
}
```

**Fonctionnalités** :
- Affichage de 4 plans d'abonnement
- Badge "Populaire" pour le plan recommandé
- Affichage des prix et des essais gratuits
- Liste des fonctionnalités par plan
- Bouton d'abonnement

### 2. StripeCheckout

Formulaire de paiement Stripe.

```tsx
import { StripeCheckout } from '@/components/StripeCheckout';

export function CheckoutPage() {
  return (
    <StripeCheckout
      planId="creator-pro"
      planName="Creator Pro"
      price={2499}
    />
  );
}
```

**Fonctionnalités** :
- Formulaire de paiement sécurisé
- Résumé du plan et du prix
- Champs email, carte, expiration, CVC
- Indicateur de sécurité Stripe

## Intégration avec Stripe Elements

Pour une sécurité optimale, utiliser Stripe Elements au lieu de champs HTML bruts.

### Installation

```bash
pnpm add @stripe/react-stripe-js @stripe/stripe-js
```

### Exemple d'utilisation

```tsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY);

export function CheckoutWithElements() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    const { token } = await stripe.createToken(elements.getElement(CardElement));

    if (token) {
      // Envoyer le token au serveur
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.id }),
      });

      const result = await response.json();
      // Gérer le résultat
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        Payer
      </button>
    </form>
  );
}
```

## Pages recommandées

### Page de tarification

```tsx
// client/src/pages/Pricing.tsx
import { SubscriptionPlans } from '@/components/SubscriptionPlans';

export default function PricingPage() {
  return (
    <div className="container py-12">
      <SubscriptionPlans />
    </div>
  );
}
```

### Page de checkout

```tsx
// client/src/pages/Checkout.tsx
import { useLocation } from 'wouter';
import { StripeCheckout } from '@/components/StripeCheckout';

export default function CheckoutPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1]);
  const planId = params.get('plan') || 'creator-pro';

  return (
    <div className="container py-12">
      <StripeCheckout
        planId={planId}
        planName="Creator Pro"
        price={2499}
      />
    </div>
  );
}
```

### Dashboard utilisateur

```tsx
// client/src/pages/Dashboard.tsx
import { useAuth } from '@/_core/hooks/useAuth';
import { SubscriptionPlans } from '@/components/SubscriptionPlans';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="container py-12">
      <h1>Bienvenue, {user?.name}</h1>
      
      {/* Afficher l'abonnement actif */}
      <div className="mt-8">
        <h2>Votre abonnement</h2>
        {/* TODO: Afficher les détails de l'abonnement */}
      </div>

      {/* Permettre de changer de plan */}
      <div className="mt-8">
        <h2>Changer de plan</h2>
        <SubscriptionPlans />
      </div>
    </div>
  );
}
```

## Flux utilisateur

### 1. Inscription

1. L'utilisateur s'inscrit via OAuth
2. Redirection vers la page de tarification
3. L'utilisateur choisit un plan

### 2. Paiement

1. L'utilisateur clique sur "S'abonner"
2. Redirection vers la page de checkout
3. L'utilisateur remplit le formulaire de paiement
4. Envoi du paiement à Stripe
5. Création de l'abonnement
6. Redirection vers le dashboard

### 3. Gestion de l'abonnement

1. L'utilisateur accède à son dashboard
2. Affichage de l'abonnement actif
3. Options pour :
   - Changer de plan
   - Annuler l'abonnement
   - Mettre à jour la méthode de paiement
   - Voir les factures

## Personnalisation

### Couleurs et styles

Modifier les couleurs dans `client/src/index.css` :

```css
:root {
  --stripe-primary: #3b82f6;
  --stripe-success: #10b981;
  --stripe-danger: #ef4444;
}
```

### Messages personnalisés

Modifier les messages dans les composants :

```tsx
// SubscriptionPlans.tsx
const messages = {
  title: 'Choisissez votre plan',
  description: 'Débloquez des fonctionnalités premium',
  subscribe: 'S\'abonner',
  popular: 'Populaire',
};
```

### Devise et localisation

Ajouter le support multi-devises :

```tsx
const CURRENCIES = {
  USD: '$',
  EUR: '€',
  XOF: 'CFA',
};

const formatPrice = (price: number, currency: string) => {
  return `${CURRENCIES[currency]} ${(price / 100).toFixed(2)}`;
};
```

## Ressources

- [Stripe React Documentation](https://stripe.com/docs/stripe-js/react)
- [Stripe Elements](https://stripe.com/docs/stripe-js/elements/the-card-element)
- [Stripe Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions)
