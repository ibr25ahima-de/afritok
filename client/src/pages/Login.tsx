import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Phone, Lock } from "lucide-react";
import { toast } from "sonner";
import { APP_LOGO, APP_TITLE } from "@/const";

type LoginStep = "phone" | "otp";

/**
 * Login Page Component
 * Handles phone number entry and OTP verification for authentication
 * Flow: Phone Input → OTP Verification → Session Created → Redirect to Feed
 */
export default function Login() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [displayPhone, setDisplayPhone] = useState("");

  const requestOtpMutation = trpc.auth.requestOtp.useMutation();
  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation();
  const utils = trpc.useUtils();

  /**
   * Step 1: Request OTP
   * User enters phone number and we send them a code
   */
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    // Validate phone format (at least 10 digits)
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      toast.error("Phone number must be at least 10 digits");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestOtpMutation.mutateAsync({ phone });

      if (result.success) {
        setDisplayPhone(phone);
        setStep("otp");
        toast.success("OTP sent! Check your SMS.");

        // In development, show the code
        if (result.code) {
          toast.info(`Dev mode: OTP is ${result.code}`);
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send OTP. Please try again.";
      toast.error(errorMessage);
      console.error("[Login] Request OTP error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 2: Verify OTP
   * User enters the code they received and we create their session
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp.trim() || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyOtpMutation.mutateAsync({
        phone: displayPhone,
        code: otp,
      });

      if (result.success) {
        toast.success("Login successful! Redirecting...");

        // Refresh auth state
        await utils.auth.me.invalidate();

        // Redirect to feed
        setTimeout(() => {
          navigate("/feed");
        }, 500);
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Invalid OTP. Please try again.";
      toast.error(errorMessage);
      console.error("[Login] Verify OTP error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Format phone number for display
   */
  const formatPhoneDisplay = (p: string) => {
    const digits = p.replace(/\D/g, "");
    if (digits.length >= 10) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    }
    return p;
  };

  /**
   * Handle phone input change with formatting
   */
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only digits and common phone formatting characters
    const formatted = value.replace(/[^\d\s\-\+\(\)]/g, "");
    setPhone(formatted);
  };

  /**
   * Handle OTP input - only allow digits
   */
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
  };

  /**
   * Go back to phone input
   */
  const handleBackToPhone = () => {
    setStep("phone");
    setOtp("");
    setDisplayPhone("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-purple-800/50 backdrop-blur-md shadow-2xl">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
              <h1 className="text-2xl font-bold text-white">{APP_TITLE}</h1>
            </div>
            <p className="text-purple-300 text-sm">
              {step === "phone" ? "Enter your phone number to get started" : "Enter the code we sent you"}
            </p>
          </div>

          {/* Phone Input Step */}
          {step === "phone" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="bg-slate-700/50 border-purple-700/50 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500"
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-xs text-slate-400">
                  Include country code (e.g., +1 for USA, +44 for UK, +33 for France)
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-colors"
                disabled={isLoading || !phone.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                We'll send you a 6-digit code via SMS
              </p>
            </form>
          )}

          {/* OTP Input Step */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* Confirmed Phone Display */}
              <div className="bg-slate-700/30 border border-purple-700/30 rounded-lg p-4 text-center space-y-1">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Code sent to</p>
                <p className="text-lg font-semibold text-purple-300">{formatPhoneDisplay(displayPhone)}</p>
              </div>

              {/* OTP Code Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-200 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  OTP Code
                </label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={handleOtpChange}
                  maxLength={6}
                  className="bg-slate-700/50 border-purple-700/50 text-white placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500 text-center text-3xl tracking-widest font-mono font-bold"
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-xs text-slate-400">
                  Enter the 6-digit code sent to your phone
                </p>
              </div>

              {/* Verify Button */}
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-colors"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Login"
                )}
              </Button>

              {/* Back Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full border-purple-700/50 text-purple-300 hover:bg-purple-900/20 hover:text-purple-200 font-medium py-2 rounded-lg transition-colors"
                onClick={handleBackToPhone}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Use Different Number
              </Button>

              {/* Resend OTP Link */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-xs text-purple-400 hover:text-purple-300 underline"
                  onClick={handleBackToPhone}
                  disabled={isLoading}
                >
                  Didn't receive the code? Try again
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="border-t border-purple-800/30 pt-4">
            <p className="text-xs text-slate-500 text-center">
              By logging in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </Card>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
