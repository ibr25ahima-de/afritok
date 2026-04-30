/**
 * Instant Withdrawal Page
 * Ultra-simple 3-click withdrawal interface
 * 
 * Flow:
 * 1. Select provider
 * 2. Enter phone number
 * 3. Click "Withdraw"
 * 4. Money arrives within 24h
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotification } from '@/contexts/NotificationContext';
import { trpc } from '@/lib/trpc';
import { CheckCircle2, AlertCircle, Loader2, DollarSign } from 'lucide-react';

export default function InstantWithdraw() {
  const { show } = useNotification();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=provider, 2=phone, 3=success
  const [selectedProvider, setSelectedProvider] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [withdrawalResult, setWithdrawalResult] = useState<any>(null);

  // Static providers (MVP)
  const providers = ["MTN", "ORANGE", "WAVE"];

  // ✅ Correction 1: Utiliser .withdraw au lieu de .request
  const withdrawMutation = trpc.instantWithdrawal.withdraw.useMutation();

  const handleWithdraw = async () => {
    if (!selectedProvider || !phoneNumber || !withdrawAmount) {
      show({
        type: 'error',
        title: 'Missing Information',
        message: 'Please fill in all fields',
      });
      return;
    }

    setIsLoading(true);
    try {
      // ✅ Correction 2: Aligner les champs avec le backend (country, provider, phoneNumber)
      const result = await withdrawMutation.mutateAsync({
        amount: parseFloat(withdrawAmount),
        country: "ALL", // Valeur par défaut pour le MVP
        provider: selectedProvider,
        phoneNumber: phoneNumber,
      });

      setWithdrawalResult(result);

      if (result.success) {
        show({
          type: 'success',
          title: '✅ Demande envoyée !',
          message: `$${withdrawAmount} sera envoyé sur votre compte ${selectedProvider} (${phoneNumber}) sous 24h.`,
        });
        setStep(3);
      } else {
        show({
          type: 'error',
          title: 'Withdrawal Failed',
          message: result.error || 'Please try again',
        });
      }
    } catch (error: any) {
      show({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to process withdrawal',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedProvider('');
    setPhoneNumber('');
    setWithdrawAmount('');
    setWithdrawalResult(null);
  };

  // Step 3: Success screen
  if (step === 3 && withdrawalResult?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-600 mb-2">✅ Success!</h1>
          <p className="text-gray-600 mb-6">
            Votre demande de ${withdrawAmount} a été enregistrée.
          </p>
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-600 mb-1">Téléphone: {phoneNumber}</p>
            <p className="text-sm text-gray-600 mb-1">Méthode: {selectedProvider}</p>
            <p className="text-sm text-gray-600">Statut: En cours de traitement</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Paiement sous 24h. Assurez-vous que votre numéro est correct.
          </p>
          <Button onClick={handleReset} className="w-full bg-green-600 hover:bg-green-700">
            Faire un autre retrait
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 mt-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Retrait d'argent</h1>
          </div>
          <p className="text-gray-600">Recevez vos gains sur votre compte Mobile Money</p>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-colors ${
                step >= s ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Select Provider */}
        {step === 1 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">1️⃣ Choisissez votre opérateur</h2>
            <Select value={selectedProvider} onValueChange={(value) => {
              setSelectedProvider(value);
              setStep(2);
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Opérateur (MTN, Orange, Wave...)" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-4">
              Opérateurs disponibles pour votre région.
            </p>
          </Card>
        )}

        {/* Step 2: Enter Phone & Amount */}
        {step === 2 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">2️⃣ Vos informations</h2>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant à retirer (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <Input
                  type="number"
                  placeholder="1.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="pl-8"
                  min="1"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum: $1.00</p>
            </div>

            {/* Phone Number */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone {selectedProvider}
              </label>
              <Input
                type="tel"
                placeholder="+221771234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Inclure l'indicatif pays (ex: +221)</p>
            </div>

            {/* Confirm Button */}
            <Button
              onClick={handleWithdraw}
              disabled={isLoading || !withdrawAmount || !phoneNumber}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  💸 Retirer ${withdrawAmount || '0.00'}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="w-full mt-2"
            >
              ← Retour
            </Button>
          </Card>
        )}

        {/* Info Box */}
        <Card className="p-4 mt-6 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">✅ Sécurisé & Fiable</p>
              <p>Paiement sous 24h. Aucun frais caché.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
