"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Baby,
  Heart,
  DollarSign,
  Gamepad2,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";

interface DialQuestion {
  dial: string;
  icon: React.ReactNode;
  color: string;
  question: string;
  anchors: { low: string; mid: string; high: string };
}

const dialQuestions: DialQuestion[] = [
  {
    dial: "Parent",
    icon: <Baby className="w-8 h-8" />,
    color: "#3b82f6",
    question:
      "How many days this week did you show up as an intentional, present father? Not just being in the room — actually leading, connecting, modeling the man you want your kids to become.",
    anchors: {
      low: "0 days — checked out all week",
      mid: "3-4 days — showed up but not consistent",
      high: "7 days — crushed it every day",
    },
  },
  {
    dial: "Partner",
    icon: <Heart className="w-8 h-8" />,
    color: "#ec4899",
    question:
      "How many days this week did you intentionally invest in your marriage? Not just coexisting — actually connecting, communicating, making her feel chosen. Be brutally honest, brother.",
    anchors: {
      low: "0 days — roommates all week",
      mid: "3-4 days — some effort, inconsistent",
      high: "7 days — she felt chosen every day",
    },
  },
  {
    dial: "Producer",
    icon: <DollarSign className="w-8 h-8" />,
    color: "#10b981",
    question:
      "How many days this week did you show up with purpose, ambition, and financial discipline? Not just clocking hours — building something, handling business, moving the needle.",
    anchors: {
      low: "0 days — coasted or stressed",
      mid: "3-4 days — productive but unfocused",
      high: "7 days — driven and disciplined daily",
    },
  },
  {
    dial: "Player",
    icon: <Gamepad2 className="w-8 h-8" />,
    color: "#f59e0b",
    question:
      "How many days this week did you move your body, have fun, or do something spontaneous? The Player dial is about staying alive — not becoming the boring, predictable guy she didn't marry.",
    anchors: {
      low: "0 days — couch all week",
      mid: "3-4 days — some movement, some fun",
      high: "7 days — active, fun, fully alive",
    },
  },
  {
    dial: "Power",
    icon: <Zap className="w-8 h-8" />,
    color: "#8b5cf6",
    question:
      "How many days this week did you keep every promise you made to yourself? Not to her, not to your boss — to YOU. Did you do what you said you'd do, when you said you'd do it?",
    anchors: {
      low: "0 days — broke commitments all week",
      mid: "3-4 days — mostly reliable",
      high: "7 days — word is bond, zero excuses",
    },
  },
];

export default function AssessmentPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [scores, setScores] = useState<number[]>([4, 4, 4, 4, 4]);
  const [submitted, setSubmitted] = useState(false);

  const isReview = currentStep === dialQuestions.length;
  const progress = ((currentStep) / (dialQuestions.length + 1)) * 100;

  const handleNext = () => {
    if (currentStep < dialQuestions.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleScoreChange = (value: number[]) => {
    const newScores = [...scores];
    newScores[currentStep] = value[0];
    setScores(newScores);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20"
          >
            <CheckCircle2 className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Assessment Complete!
          </h2>
          <p className="text-slate-400 mb-6">
            Great work, brother. Your dials have been updated. Coach Keith will
            analyze your scores and prepare personalized recommendations.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/five-dials">
              <Button variant="secondary">View My Dials</Button>
            </a>
            <a href="/coach">
              <Button>Discuss with Coach Keith</Button>
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">
            {isReview
              ? "Review"
              : `${currentStep + 1} of ${dialQuestions.length}`}
          </span>
          <span className="text-sm text-amber-500 font-medium">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isReview ? (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-7 h-7 text-slate-900" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Review Your Scores
                </h2>
                <p className="text-sm text-slate-400">
                  Take a final look before submitting. Be honest.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {dialQuestions.map((dq, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-surface"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${dq.color}20` }}
                      >
                        <span style={{ color: dq.color }}>{dq.icon}</span>
                      </div>
                      <span className="font-medium text-white">{dq.dial}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">
                        {scores[i]}
                      </span>
                      <span className="text-sm text-slate-500">/7</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </Button>
                <Button onClick={handleSubmit} className="flex-1">
                  Submit Assessment
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-8">
              {/* Dial header */}
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    backgroundColor: `${dialQuestions[currentStep].color}20`,
                  }}
                >
                  <span
                    style={{ color: dialQuestions[currentStep].color }}
                  >
                    {dialQuestions[currentStep].icon}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {dialQuestions[currentStep].dial}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Dial {currentStep + 1} of {dialQuestions.length}
                  </p>
                </div>
              </div>

              {/* Keith's question */}
              <div className="mb-8 p-4 rounded-xl bg-amber-500/5 border border-amber-500/7">
                <p className="text-[15px] text-slate-300 leading-relaxed italic">
                  &ldquo;{dialQuestions[currentStep].question}&rdquo;
                </p>
                <p className="text-xs text-amber-500/60 mt-2">
                  — Coach Keith
                </p>
              </div>

              {/* Score display */}
              <div className="text-center mb-6">
                <motion.span
                  key={scores[currentStep]}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-6xl font-bold text-gradient-gold"
                >
                  {scores[currentStep]}
                </motion.span>
                <span className="text-2xl text-slate-500 ml-1">/7</span>
              </div>

              {/* Slider */}
              <div className="mb-6 px-2">
                <Slider
                  value={[scores[currentStep]]}
                  onValueChange={handleScoreChange}
                  min={0}
                  max={7}
                  step={1}
                />
              </div>

              {/* Anchors */}
              <div className="flex justify-between text-[11px] text-slate-500 mb-8 px-1">
                <span className="max-w-[30%]">
                  {dialQuestions[currentStep].anchors.low}
                </span>
                <span className="max-w-[30%] text-center">
                  {dialQuestions[currentStep].anchors.mid}
                </span>
                <span className="max-w-[30%] text-right">
                  {dialQuestions[currentStep].anchors.high}
                </span>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button
                    variant="secondary"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                )}
                <Button onClick={handleNext} className="flex-1">
                  {currentStep === dialQuestions.length - 1
                    ? "Review"
                    : "Next Dial"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
