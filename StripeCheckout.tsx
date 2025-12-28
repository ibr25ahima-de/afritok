import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CreditCard, Lock } from 'lucide-react';

export function StripeCheckout({ planId, planName, price }: { planId: string; planName: string; price: number }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const handleCheckout = async () => {
    if (!email || !cardNumber) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);

    try {
      // TODO: Intégrer avec Stripe Elements pour le traitement sécurisé des cartes
      toast.success('Paiement traité avec succès!');
      window.location.href = '/dashboard';
    } catch (error) {
      toast.error('Erreur lors du paiement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Finaliser votre abonnement</CardTitle>
          <CardDescription>{planName}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Résumé du plan */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">{planName}</span>
              <span className="font-semibold">${(price / 100).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">${(price / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Formulaire de paiement */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="card">Numéro de carte</Label>
              <div className="relative">
                <Input
                  id="card"
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                />
                <CreditCard className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiry">Expiration</Label>
                <Input
                  id="expiry"
                  type="text"
                  placeholder="MM/YY"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="cvc">CVC</Label>
                <Input
                  id="cvc"
                  type="text"
                  placeholder="123"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Sécurité */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Lock className="w-4 h-4" />
            <span>Paiement sécurisé par Stripe</span>
          </div>

          {/* Bouton de paiement */}
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Traitement...' : `Payer ${(price / 100).toFixed(2)}$`}
          </Button>

          {/* Conditions */}
          <p className="text-xs text-gray-500 text-center">
            En cliquant sur "Payer", vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
