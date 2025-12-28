/**
 * Instant Withdrawal Page
 * Ultra-simple 3-click withdrawal interface
 * 
 * Flow:
 * 1. Select country
 * 2. Select provider
 * 3. Enter phone number
 * 4. Click "Withdraw"
 * 5. Money arrives IMMEDIATELY
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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1=country, 2=provider, 3=phone, 4=confirm
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [withdrawalResult, setWithdrawalResult] = useState<any>(null);

  // Get supported countries
  const { data: countriesData } = trpc.instantWithdrawal.getSupportedCountries.useQuery();

  // Get providers for selected country
  const { data: providersData } = trpc.instantWithdrawal.getProviders.useQuery(
    { country: selectedCountry },
    { enabled: !!selectedCountry }
  );

  // Withdrawal mutation
  const withdrawMutation = trpc.instantWithdrawal.withdraw.useMutation();

  const handleWithdraw = async () => {
    if (!selectedCountry || !selectedProvider || !phoneNumber || !withdrawAmount) {
      show({
        type: 'error',
        title: 'Missing Information',
        message: 'Please fill in all fields',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await withdrawMutation.mutateAsync({
        amount: parseFloat(withdrawAmount),
        country: selectedCountry,
        provider: selectedProvider,
        phoneNumber,
      });

      setWithdrawalResult(result);

      if (result.success) {
        show({
          type: 'success',
          title: '✅ Money Sent!',
          message: `$${withdrawAmount} sent to ${phoneNumber}. Check your ${selectedProvider} account!`,
        });
        setStep(4);
      } else {
        show({
          type: 'error',
          title: 'Withdrawal Failed',
          message: result.error || 'Please try again',
        });
      }
    } catch (error) {
      show({
        type: 'error',
        title: 'Error',
        message: 'Failed to process withdrawal',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedCountry('');
    setSelectedProvider('');
    setPhoneNumber('');
    setWithdrawAmount('');
    setWithdrawalResult(null);
  };

  // Step 4: Success screen
  if (step === 4 && withdrawalResult?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-600 mb-2">✅ Success!</h1>
          <p className="text-gray-600 mb-6">
            ${withdrawalResult.withdrawal.amount} has been sent to your {selectedProvider} account
          </p>
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-600 mb-1">Phone: {phoneNumber}</p>
            <p className="text-sm text-gray-600 mb-1">Provider: {selectedProvider}</p>
            <p className="text-sm text-gray-600">Transaction ID: {withdrawalResult.withdrawal.transactionId}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Money should appear in your account within seconds. If not, it will arrive within 24 hours.
          </p>
          <Button onClick={handleReset} className="w-full bg-green-600 hover:bg-green-700">
            Withdraw Again
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
            <h1 className="text-3xl font-bold text-gray-900">Withdraw Money</h1>
          </div>
          <p className="text-gray-600">Get your earnings instantly to your mobile money account</p>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-colors ${
                step >= s ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Select Country */}
        {step === 1 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">1️⃣ Select Your Country</h2>
            <Select value={selectedCountry} onValueChange={(value) => {
              setSelectedCountry(value);
              setStep(2);
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose your country..." />
              </SelectTrigger>
              <SelectContent>
                {countriesData?.countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.code} ({country.count} providers)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-4">
              {countriesData?.total || 0} African countries supported
            </p>
          </Card>
        )}

        {/* Step 2: Select Provider */}
        {step === 2 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">2️⃣ Select Your Provider</h2>
            <p className="text-sm text-gray-600 mb-4">Available in {selectedCountry}:</p>
            <Select value={selectedProvider} onValueChange={(value) => {
              setSelectedProvider(value);
              setStep(3);
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose your provider..." />
              </SelectTrigger>
              <SelectContent>
                {providersData?.providers.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="w-full mt-4"
            >
              ← Back
            </Button>
          </Card>
        )}

        {/* Step 3: Enter Phone & Amount */}
        {step === 3 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">3️⃣ Enter Your Details</h2>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount to Withdraw (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <Input
                  type="number"
                  placeholder="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="pl-8"
                  min="0.01"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum: $0.01 | Maximum: $10,000</p>
            </div>

            {/* Phone Number */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedProvider} Phone Number
              </label>
              <Input
                type="tel"
                placeholder="+221771234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +221)</p>
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
                  Processing...
                </>
              ) : (
                <>
                  💸 Withdraw ${withdrawAmount || '0.00'}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="w-full mt-2"
            >
              ← Back
            </Button>
          </Card>
        )}

        {/* Info Box */}
        <Card className="p-4 mt-6 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">✅ Instant & Secure</p>
              <p>Money arrives immediately. No hidden fees. No waiting.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
