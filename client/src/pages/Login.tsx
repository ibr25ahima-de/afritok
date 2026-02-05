import { useState } from "react";
import { useNavigate } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState(""); // For development

  const requestOtpMutation = trpc.auth.requestOtp.useMutation({
    onSuccess: (data) => {
      setGeneratedOtp(data.code); // Store for development
      setStep("otp");
      setError("");
    },
    onError: (error) => {
      setError(error.message || "Failed to send OTP");
    },
  });

  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation({
    onSuccess: () => {
      navigate("/feed");
    },
    onError: (error) => {
      setError(error.message || "Failed to verify OTP");
    },
  });

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone || phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    requestOtpMutation.mutate({ phone });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otp || otp.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    verifyOtpMutation.mutate({ phone, code: otp });
  };

  const handleBack = () => {
    setStep("phone");
    setOtp("");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 px-4">
      <Card className="w-full max-w-md p-8 bg-slate-900 border-purple-500/20">
        {/* Header */}
        <div className="text-center mb-8">
          {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="w-12 h-12 mx-auto mb-4" />}
          <h1 className="text-2xl font-bold text-white">{APP_TITLE}</h1>
          <p className="text-purple-300 text-sm mt-2">
            {step === "phone" ? "Enter your phone number" : "Enter the code we sent"}
          </p>
        </div>

        {/* Phone Step */}
        {step === "phone" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <Input
                type="tel"
                placeholder="+225XXXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={requestOtpMutation.isPending}
                className="bg-slate-800 border-purple-500/30 text-white placeholder-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">Include country code (e.g., +1, +44, +33)</p>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              disabled={requestOtpMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {requestOtpMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {requestOtpMutation.isPending ? "Sending..." : "Send OTP Code"}
            </Button>

            <p className="text-xs text-gray-400 text-center">
              We'll send you a 6-digit code via SMS.
            </p>
          </form>
        )}

        {/* OTP Step */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
              <Input
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={verifyOtpMutation.isPending}
                maxLength={6}
                className="bg-slate-800 border-purple-500/30 text-white placeholder-gray-500 text-center text-2xl tracking-widest font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">Enter the 6-digit code sent to {phone}</p>
            </div>

            {/* Development: Show generated OTP */}
            {generatedOtp && (
              <div className="p-3 bg-blue-900/30 border border-blue-500/30 rounded text-blue-300 text-xs">
                <strong>Dev:</strong> Code is {generatedOtp}
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="submit"
              disabled={verifyOtpMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
            >
              {verifyOtpMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {verifyOtpMutation.isPending ? "Verifying..." : "Verify Code"}
            </Button>

            <Button
              type="button"
              onClick={handleBack}
              variant="outline"
              className="w-full border-purple-500/30 text-gray-300 hover:bg-slate-800"
            >
              Back
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Didn't receive the code? Check your spam folder or try again.
            </p>
          </form>
        )}

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center mt-8">
          By logging in, you accept our Terms of Use and Privacy Policy
        </p>
      </Card>
    </div>
  );
}
