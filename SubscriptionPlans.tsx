import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

const SUBSCRIPTION_PLANS = [
  {
    id: 'creator-basic',
    name: 'Creator Basic',
    description: 'Parfait pour débuter',
    price: 999,
    currency: 'USD',
    interval: 'month',
    trialDays: 7,
    features: [
      'Accès aux analytics basiques',
      'Jusqu\'à 10 vidéos en direct par mois',
      'Support par email',
      'Monétisation standard',
    ],
    isPopular: false,
  },
  {
    id: 'creator-pro',
    name: 'Creator Pro',
    description: 'Pour les créateurs actifs',
    price: 2499,
    currency: 'USD',
    interval: 'month',
    trialDays: 14,
    features: [
      'Analytics avancées',
      'Jusqu\'à 50 vidéos en direct par mois',
      'Support prioritaire',
      'Monétisation premium (80/20)',
      'Accès aux filtres AR exclusifs',
      'Statistiques détaillées par vidéo',
      'Outils de planification',
    ],
    isPopular: true,
  },
  {
    id: 'creator-pro-annual',
    name: 'Creator Pro (Annuel)',
    description: 'Économisez 17% avec l\'abonnement annuel',
    price: 24999,
    currency: 'USD',
    interval: 'year',
    trialDays: 30,
    features: [
      'Tous les avantages Creator Pro',
      'Économies de 17%',
      'Priorité support 24/7',
      'Accès anticipé aux nouvelles fonctionnalités',
      'Badge créateur premium',
    ],
    isPopular: false,
  },
  {
    id: 'creator-elite',
    name: 'Creator Elite',
    description: 'Pour les créateurs de haut niveau',
    price: 4999,
    currency: 'USD',
    interval: 'month',
    trialDays: 14,
    features: [
      'Tous les avantages Creator Pro',
      'Vidéos en direct illimitées',
      'Support VIP 24/7',
      'Monétisation ultra-premium (90/10)',
      'Filtres AR personnalisés',
      'API d\'intégration',
      'Gestionnaire de compte dédié',
      'Accès aux événements exclusifs',
    ],
    isPopular: false,
  },
];

export function SubscriptionPlans() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);

    try {
      toast.success('Redirection vers le paiement...');
      // TODO: Intégrer avec Stripe Checkout
      window.location.href = `/checkout?plan=${planId}`;
    } catch (error) {
      toast.error('Erreur lors de la création de l\'abonnement');
      console.error(error);
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Choisissez votre plan</h2>
        <p className="text-gray-600">Débloquez des fonctionnalités premium pour développer votre audience</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {SUBSCRIPTION_PLANS.map((plan: any) => (
          <Card
            key={plan.id}
            className={`relative transition-all ${
              plan.isPopular ? 'ring-2 ring-blue-500 scale-105' : ''
            }`}
          >
            {plan.isPopular && (
              <Badge className="absolute top-4 right-4 bg-blue-500">Populaire</Badge>
            )}

            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-1">
                <div className="text-3xl font-bold">
                  ${(plan.price / 100).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  par {plan.interval === 'month' ? 'mois' : 'an'}
                </div>
                {plan.trialDays && (
                  <div className="text-xs text-green-600 font-semibold">
                    Essai gratuit {plan.trialDays} jours
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading}
                className="w-full"
                variant={plan.isPopular ? 'default' : 'outline'}
              >
                {loading && selectedPlan === plan.id
                  ? 'Traitement...'
                  : 'S\'abonner'}
              </Button>

              <div className="space-y-3 pt-4 border-t">
                {plan.features.map((feature: any, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
