"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Dumbbell,
  Sparkles,
  DollarSign,
  Heart,
  Gamepad2,
  ArrowRight,
  Zap,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FiveDialsRadarChart } from "@/components/dials/radar-chart";
import { DialCard } from "@/components/dials/dial-card";
import { TrendChart } from "@/components/dials/trend-chart";
import { HealthScore } from "@/components/dials/health-score";

const dials = [
  {
    name: "Fitness",
    score: 7.5,
    previousScore: 6.8,
    description: "Physical health, energy, discipline. Your body is the vehicle for everything else.",
    icon: <Dumbbell className="w-5 h-5" style={{ color: "#f59e0b" }} />,
    color: "#f59e0b",
  },
  {
    name: "Faith",
    score: 6.0,
    previousScore: 5.5,
    description: "Purpose, mindset, spiritual grounding. The foundation of who you are.",
    icon: <Sparkles className="w-5 h-5" style={{ color: "#8b5cf6" }} />,
    color: "#8b5cf6",
  },
  {
    name: "Finances",
    score: 5.5,
    previousScore: 5.0,
    description: "Financial security and abundance. Providing and building wealth.",
    icon: <DollarSign className="w-5 h-5" style={{ color: "#10b981" }} />,
    color: "#10b981",
  },
  {
    name: "Family",
    score: 8.0,
    previousScore: 7.2,
    description: "Marriage, kids, and deep connection. The relationships that matter most.",
    icon: <Heart className="w-5 h-5" style={{ color: "#3b82f6" }} />,
    color: "#3b82f6",
  },
  {
    name: "Fun",
    score: 4.5,
    previousScore: 4.0,
    description: "Joy, adventure, and living fully. Don't forget to enjoy the ride.",
    icon: <Gamepad2 className="w-5 h-5" style={{ color: "#ec4899" }} />,
    color: "#ec4899",
  },
];

const radarData = dials.map((d) => ({
  dial: d.name,
  score: d.score,
  fullMark: 10 as const,
}));

const trendData = [
  { date: "Week 1", fitness: 5, faith: 4, finances: 3, family: 6, fun: 3 },
  { date: "Week 2", fitness: 5.5, faith: 4.5, finances: 3.5, family: 6.5, fun: 3 },
  { date: "Week 3", fitness: 6, faith: 5, finances: 4, family: 7, fun: 3.5 },
  { date: "Week 4", fitness: 6.8, faith: 5.5, finances: 5, family: 7.2, fun: 4 },
  { date: "Week 5", fitness: 7.5, faith: 6, finances: 5.5, family: 8, fun: 4.5 },
];

const challenges = [
  { name: "30 Pushups Daily", dial: "Fitness", progress: 71, daysLeft: 2 },
  { name: "10-Min Meditation", dial: "Faith", progress: 43, daysLeft: 4 },
  { name: "Budget Review", dial: "Finances", progress: 100, daysLeft: 0 },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function FiveDialsPage() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Five Dials
          </h1>
          <p className="text-slate-400 mt-1">
            Track, measure, and improve every area of your life.
          </p>
        </div>
        <Link href="/five-dials/assess">
          <Button className="gap-2">
            <Calendar className="w-4 h-4" />
            Take Weekly Assessment
          </Button>
        </Link>
      </motion.div>

      {/* Radar + Health Score */}
      <div className="grid lg:grid-cols-4 gap-6">
        <motion.div variants={item} className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Your Five Dials</CardTitle>
            </CardHeader>
            <CardContent>
              <FiveDialsRadarChart
                scores={radarData}
                size="lg"
                interactive
              />
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card className="flex items-center justify-center py-8 h-full">
            <HealthScore score={72} previousScore={65} />
          </Card>
        </motion.div>
      </div>

      {/* Dial Cards */}
      <motion.div variants={item}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {dials.map((dial) => (
            <DialCard key={dial.name} {...dial} />
          ))}
        </div>
      </motion.div>

      {/* Trend Chart + Challenges */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Progress Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={trendData} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <CardTitle className="text-base">Active Challenges</CardTitle>
              </div>
              <Badge variant="default">{challenges.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {challenges.map((ch, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{ch.name}</p>
                      <p className="text-[10px] text-slate-500">{ch.dial}</p>
                    </div>
                    {ch.progress === 100 ? (
                      <Badge variant="success" className="text-[10px]">
                        Complete
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-500">
                        {ch.daysLeft}d left
                      </span>
                    )}
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ch.progress}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                      className={`h-full rounded-full ${
                        ch.progress === 100
                          ? "bg-emerald-500"
                          : "bg-gradient-to-r from-amber-500 to-amber-400"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
