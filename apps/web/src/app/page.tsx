"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Crown,
  ArrowRight,
  Target,
  MessageCircle,
  Flame,
  Users,
  Star,
  ChevronDown,
  ChevronUp,
  Check,
  Play,
  Dumbbell,
  Heart,
  DollarSign,
  Sparkles,
  Gamepad2,
  Quote,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const dialData = [
  { name: "Parent", icon: Heart, color: "#3b82f6", value: 8, desc: "Active, present fatherhood and family leadership" },
  { name: "Partner", icon: Users, color: "#ec4899", value: 7, desc: "Her best friend and true teammate — not a roommate" },
  { name: "Producer", icon: DollarSign, color: "#10b981", value: 6, desc: "Financial provision and professional contribution" },
  { name: "Player", icon: Gamepad2, color: "#f59e0b", value: 9, desc: "Fun, playful, spontaneous — never boring" },
  { name: "Power", icon: Crown, color: "#8b5cf6", value: 7, desc: "Do what you say, when you say it — personal integrity" },
];

const testimonials = [
  {
    name: "Mike R.",
    role: "Married 12 years",
    text: "Coach Keith's framework saved my marriage. My wife literally asked me 'what happened to you?' after just 3 weeks. I'm finally the man I always wanted to be.",
    rating: 5,
  },
  {
    name: "James T.",
    role: "Married 8 years",
    text: "The Five Dials approach is genius. Having an AI coach that actually sounds like Keith — calling me out when I'm making excuses — is exactly what I needed.",
    rating: 5,
  },
  {
    name: "David K.",
    role: "Married 5 years",
    text: "I went from sleeping on the couch to date nights every week. The daily accountability check-ins keep me honest. Best investment I've ever made.",
    rating: 5,
  },
  {
    name: "Chris M.",
    role: "Married 15 years",
    text: "My marriage was on autopilot for years. This app woke me up. The Brotherhood community alone is worth the price — these guys get it.",
    rating: 5,
  },
];

const pricingTiers = [
  {
    name: "Core",
    price: "$29",
    period: "/month",
    description: "Start your transformation",
    features: [
      "AI Coach Keith (100 messages/month)",
      "Five Dials weekly assessment",
      "Daily morning kickstart prompts",
      "Content library access",
      "Progress tracking dashboard",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Premium",
    price: "$79",
    period: "/month",
    description: "Full access to everything",
    features: [
      "Unlimited AI Coach Keith",
      "Crisis mode coaching",
      "All frameworks unlocked",
      "Brotherhood community",
      "Accountability partner matching",
      "Micro-challenges system",
      "Five Dials Health Score",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Elite",
    price: "$199",
    period: "/month",
    description: "VIP transformation experience",
    features: [
      "Everything in Premium",
      "Monthly 1-on-1 with Keith (live)",
      "Custom coaching plan",
      "Couples mode (coming soon)",
      "VIP Brotherhood events",
      "Early access to new features",
    ],
    cta: "Apply Now",
    popular: false,
  },
];

const faqs = [
  {
    q: "Is this a replacement for marriage counseling?",
    a: "No. Coach Keith AI is a personal development tool that helps you become a better man. If your marriage needs professional help, we always recommend working with a licensed therapist. Our coaching focuses on the areas YOU can control.",
  },
  {
    q: "How is the AI different from ChatGPT?",
    a: "Coach Keith AI is trained specifically on Keith Yackey's frameworks, podcast content, and coaching style. It doesn't give generic advice — it gives you Keith's proven approach, in his voice, with his frameworks. It knows the Five Dials, the specific techniques, and how to push you the way Keith would.",
  },
  {
    q: "Is my data private?",
    a: "Absolutely. Your conversations with Coach Keith AI are encrypted and private. We never share your personal data or coaching conversations. You can export or delete your data at any time.",
  },
  {
    q: "Can my wife see what I talk about?",
    a: "No. Your conversations are completely private. However, we do plan to launch a Couples Mode in the future where both partners can optionally share insights.",
  },
  {
    q: "What if I'm not in a crisis — can I still benefit?",
    a: "100%. Most of our members aren't in crisis — they're good men who want to be GREAT. The Five Dials framework works for optimization, not just fixing problems. Whether you're scoring a 3 or an 8, there's always the next level.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  return (
    <div className="min-h-screen bg-brand-navy">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                <Crown className="w-4.5 h-4.5 text-slate-900" />
              </div>
              <span className="font-bold text-white text-lg">Coach Keith AI</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#dials" className="text-sm text-slate-400 hover:text-white transition-colors">The Five Dials</a>
              <a href="#story" className="text-sm text-slate-400 hover:text-white transition-colors">Keith&apos;s Story</a>
              <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">Pricing</a>
              <a href="#faq" className="text-sm text-slate-400 hover:text-white transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Log In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/generated/hero-couple.png"
            alt=""
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/60 via-brand-navy/80 to-brand-navy" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="gold" className="mb-6 text-sm py-1.5 px-4">
                AI-Powered Coaching for Married Men
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6 tracking-tight"
            >
              Become the Man{" "}
              <span className="text-gradient-gold">She Can&apos;t Resist</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Stop guessing. Start growing. Coach Keith AI gives you 24/7 access
              to the coaching framework that has transformed thousands of
              marriages — powered by AI, guided by Keith Yackey.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/register">
                <Button size="xl" className="text-base group w-full sm:w-auto">
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Button variant="secondary" size="xl" className="text-base w-full sm:w-auto">
                <Play className="w-5 h-5" />
                Watch the Story
              </Button>
            </motion.div>

            {/* Keith's face as trust element */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-10 flex flex-col items-center gap-4"
            >
              <div className="flex items-center gap-3 p-2 pr-5 rounded-full border border-slate-800 bg-surface-raised/60">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-500/40">
                  <Image
                    src="/images/keith/keith-dadedge-recent.jpg"
                    alt="Keith Yackey"
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <span className="text-sm text-slate-300">
                  Built by <span className="text-amber-400 font-semibold">Keith Yackey</span> — coach to thousands of men
                </span>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>7-day free trial</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>Cancel anytime</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>100% private</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature pills row */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {[
              { icon: MessageCircle, label: "AI Coach Keith", desc: "24/7 access" },
              { icon: Target, label: "Five Dials", desc: "Track growth" },
              { icon: Flame, label: "Daily Streaks", desc: "Stay consistent" },
              { icon: Users, label: "Brotherhood", desc: "Community" },
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -3 }}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-800 bg-surface-raised/50"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-sm font-semibold text-white">{item.label}</span>
                <span className="text-xs text-slate-500">{item.desc}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Five Dials Section */}
      <section id="dials" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="gold" className="mb-4">The Framework</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              The Five Dials
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Your marriage is a reflection of who you are. Master these five
              areas and watch everything transform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {dialData.map((dial, index) => (
              <motion.div
                key={dial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="relative overflow-hidden rounded-2xl border border-slate-800 bg-surface-raised p-6 text-center group"
              >
                <div
                  className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${dial.color}20` }}
                >
                  <dial.icon className="w-7 h-7" style={{ color: dial.color }} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{dial.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{dial.desc}</p>

                {/* Score preview bar */}
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(dial.value / 10) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.3 + index * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: dial.color }}
                  />
                </div>
                <p className="text-[10px] text-slate-600 mt-1">Sample score: {dial.value}/10</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Keith's Story */}
      <section id="story" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/generated/transformation.png"
            alt=""
            fill
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/85 to-brand-navy/70" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Badge variant="gold" className="mb-4">The Story</Badge>
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
                From Rock Bottom to{" "}
                <span className="text-gradient-gold">Unstoppable</span>
              </h2>
              <div className="space-y-4 text-slate-400 leading-relaxed">
                <p>
                  Keith Yackey wasn&apos;t always the coach. He was the guy who
                  almost lost everything — his marriage, his family, his sense
                  of self.
                </p>
                <p>
                  After years of running on autopilot, ignoring the warning
                  signs, and thinking &ldquo;this is just how marriage is,&rdquo;
                  Keith hit a wall. His wife was distant. His kids felt it. He
                  felt hollow inside.
                </p>
                <p>
                  But instead of checking out, he did something different. He
                  built a framework. He identified the five critical dials that
                  determine whether a man thrives or just survives. And he
                  started turning them — one by one.
                </p>
                <p className="text-white font-medium">
                  Today, Keith has coached thousands of men through the same
                  transformation. And now, with AI, that coaching is available to
                  you — 24/7, on demand, in Keith&apos;s own voice and
                  framework.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              {/* Main Keith photo */}
              <div className="aspect-[4/5] rounded-3xl border border-slate-800 overflow-hidden relative">
                <Image
                  src="/images/keith/keith-orderofman.png"
                  alt="Keith Yackey - Founder of The Married Game"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="text-2xl font-bold text-white mb-1">Keith Yackey</h3>
                  <p className="text-amber-400 font-medium mb-2">Husband. Father. Coach. Provocateur.</p>
                  <p className="text-sm text-slate-400">
                    &ldquo;The World&apos;s Most Expensive Relationship Coach&rdquo;
                  </p>
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl" />
              </div>

              {/* Keith & Jesse podcast artwork - smaller, overlapping */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="absolute -bottom-8 -right-8 w-44 h-44 rounded-2xl border-4 border-brand-navy shadow-2xl overflow-hidden"
              >
                <Image
                  src="/images/keith/podcast-artwork.jpg"
                  alt="Keith & Jesse - Married Game Podcast"
                  fill
                  className="object-cover"
                  sizes="176px"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="gold" className="mb-4">Testimonials</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Real Men, Real Results
            </h2>
            <p className="text-lg text-slate-400">
              Hear from guys who turned their lives around.
            </p>
          </motion.div>

          {/* Carousel */}
          <div className="relative max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-slate-800 bg-surface-raised p-8 sm:p-10"
              >
                <Quote className="w-10 h-10 text-amber-500/20 mb-4" />
                <p className="text-lg text-slate-300 leading-relaxed mb-6">
                  &ldquo;{testimonials[currentTestimonial].text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-sm font-bold text-slate-900">
                    {testimonials[currentTestimonial].name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">
                      {testimonials[currentTestimonial].name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {testimonials[currentTestimonial].role}
                    </p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({ length: testimonials[currentTestimonial].rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() =>
                  setCurrentTestimonial((p) =>
                    p === 0 ? testimonials.length - 1 : p - 1
                  )
                }
                className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentTestimonial(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentTestimonial
                        ? "bg-amber-500 w-6"
                        : "bg-slate-700 hover:bg-slate-600"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() =>
                  setCurrentTestimonial((p) =>
                    p === testimonials.length - 1 ? 0 : p + 1
                  )
                }
                className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/[0.03] to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="gold" className="mb-4">Pricing</Badge>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Invest in Yourself
            </h2>
            <p className="text-lg text-slate-400">
              Less than a date night. More impact than years of guessing.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className={`relative rounded-2xl border p-8 ${
                  tier.popular
                    ? "border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-surface-raised gold-glow"
                    : "border-slate-800 bg-surface-raised"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="tier" className="text-xs">Most Popular</Badge>
                  </div>
                )}

                <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{tier.description}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  <span className="text-slate-500">{tier.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link href="/register">
                  <Button
                    className="w-full"
                    variant={tier.popular ? "default" : "secondary"}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="gold" className="mb-4">FAQ</Badge>
            <h2 className="text-4xl font-bold text-white mb-4">
              Got Questions?
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-slate-800 bg-surface-raised overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex items-center justify-between w-full p-5 text-left"
                >
                  <span className="font-medium text-white pr-4">{faq.q}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-amber-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-surface-raised p-12 sm:p-16 relative overflow-hidden"
          >
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Your Best Chapter Starts Today
              </h2>
              <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
                Every day you wait is another day running on autopilot. Take
                the first step. Your future self will thank you.
              </p>
              <Link href="/register">
                <Button size="xl" className="text-base group">
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-slate-900" />
                </div>
                <span className="font-bold text-white">Coach Keith AI</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                AI-powered coaching for men who refuse to settle for average.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Product</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#dials" className="hover:text-white transition-colors">Five Dials</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AI Coaching</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-white transition-colors">Podcast</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-10 pt-8 text-center text-sm text-slate-600">
            &copy; {new Date().getFullYear()} Coach Keith AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
