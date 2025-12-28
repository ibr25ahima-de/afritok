import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, Heart, Loader2 } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

interface DonateToCreatorProps {
  creatorId: number;
  creatorName?: string;
}

export default function DonateToCreator({
  creatorId,
  creatorName = "Creator",
}: DonateToCreatorProps) {
  const { user, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();
  const [amount, setAmount] = useState(5);
  const [currency, setCurrency] = useState("USD");
  const [customAmount, setCustomAmount] = useState("");
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const createDonationMutation = trpc.payment.createDonation.useMutation();

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const predefinedAmounts = [1, 5, 10, 25, 50, 100];
  const finalAmount = customAmount ? parseFloat(customAmount) : amount;

  const handleDonate = async () => {
    if (!finalAmount || finalAmount < 1) {
      setError("Please enter a valid amount");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const result = await createDonationMutation.mutateAsync({
        amount: finalAmount,
        currency,
        creatorId,
      });

      if (result.success) {
        // En production, vous redirigeriez vers Stripe pour compléter le paiement
        alert(`Donation of ${currency} ${finalAmount} initiated!`);
        navigate(`/profile/${creatorId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Donation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/feed")}
              className="text-purple-400 hover:text-purple-300"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
              <span className="text-xl font-bold text-white">{APP_TITLE}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Donation Form */}
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Support {creatorName}</h1>
            <p className="text-purple-300">
              Your donation helps creators earn and create better content
            </p>
          </div>

          {/* Currency Selection */}
          <div className="mb-6">
            <label className="block text-purple-300 font-semibold mb-2">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="ZAR">ZAR - South African Rand</option>
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="KES">KES - Kenyan Shilling</option>
              <option value="GHS">GHS - Ghanaian Cedi</option>
            </select>
          </div>

          {/* Predefined Amounts */}
          <div className="mb-6">
            <label className="block text-purple-300 font-semibold mb-3">
              Select Amount
            </label>
            <div className="grid grid-cols-3 gap-2">
              {predefinedAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    setAmount(amt);
                    setCustomAmount("");
                  }}
                  className={`py-2 rounded-lg font-semibold transition ${
                    amount === amt && !customAmount
                      ? "bg-purple-600 text-white"
                      : "bg-slate-800 text-purple-300 hover:bg-slate-700"
                  }`}
                >
                  {currency} {amt}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="mb-6">
            <label className="block text-purple-300 font-semibold mb-2">
              Custom Amount
            </label>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">{currency}</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setAmount(0);
                }}
                placeholder="Enter custom amount"
                min="1"
                step="0.01"
                className="flex-1 bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/30 border border-red-800/50 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Total */}
          <div className="mb-6 bg-slate-800/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-purple-300">Total Amount:</span>
              <span className="text-2xl font-bold text-white">
                {currency} {finalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Donate Button */}
          <Button
            onClick={handleDonate}
            disabled={!finalAmount || isProcessing || createDonationMutation.isPending}
            className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white py-3 font-semibold disabled:opacity-50"
          >
            {isProcessing || createDonationMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Heart className="w-5 h-5 mr-2" />
                Donate Now
              </>
            )}
          </Button>

          {/* Info */}
          <div className="mt-6 bg-slate-800/50 border border-purple-800/30 rounded-lg p-4 text-sm text-purple-300">
            <p>
              ✓ Secure payment via Stripe<br />
              ✓ Creator receives 85% of donation<br />
              ✓ Instant transfer to creator's account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
