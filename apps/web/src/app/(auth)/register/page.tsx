"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Crown,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Check,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { register } = useAuth();
  const router = useRouter();

  const passwordStrength = (() => {
    if (password.length === 0) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const strengthColors = ["bg-slate-700", "bg-rose-500", "bg-amber-500", "bg-amber-400", "bg-emerald-500"];
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await register(name, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(
        message.includes("409")
          ? "An account with this email already exists."
          : message.includes("400")
            ? "Password must have 8+ chars with uppercase, lowercase, and a number."
            : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy relative py-12">
      <div className="bg-hero-glow absolute inset-0" />
      <div className="bg-grid-pattern absolute inset-0 opacity-20" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
            <Crown className="w-7 h-7 text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Begin Your Transformation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            7-day free trial. No credit card required.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-slate-800 bg-surface-raised p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                First Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should Keith call you?"
                required
                autoComplete="given-name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {/* Password strength meter */}
              {password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2"
                >
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength >= level
                            ? strengthColors[passwordStrength]
                            : "bg-slate-800"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {strengthLabels[passwordStrength]}
                  </p>
                </motion.div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Trust signals */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>256-bit encryption</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>100% private</span>
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-amber-500 hover:text-amber-400 font-medium transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          By creating an account, you agree to our{" "}
          <a href="#" className="text-slate-500 hover:text-white transition-colors">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="text-slate-500 hover:text-white transition-colors">
            Privacy Policy
          </a>
        </p>
      </motion.div>
    </div>
  );
}
