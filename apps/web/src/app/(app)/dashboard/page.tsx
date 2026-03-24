"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { InfoTip } from "@/components/ui/tooltip";
import {
  MessageCircle,
  Target,
  BookOpen,
  ArrowRight,
  Zap,
  Trophy,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FiveDialsRadarChart } from "@/components/dials/radar-chart";
import { HealthScore } from "@/components/dials/health-score";
import { StreakCounter } from "@/components/engagement/streak-counter";
import { MilestoneBadge } from "@/components/engagement/milestone-badge";
import { DailyPrompt } from "@/components/engagement/daily-prompt";

const radarData = [
  { dial: "Parent", score: 5, fullMark: 7 as const },
  { dial: "Partner", score: 4, fullMark: 7 as const },
  { dial: "Producer", score: 6, fullMark: 7 as const },
  { dial: "Player", score: 7, fullMark: 7 as const },
  { dial: "Power", score: 3, fullMark: 7 as const },
];

// Leading Score = sum of all dials (max 35), Lagging Score = sex in last 7 days
const leadingScore = radarData.reduce((sum, d) => sum + d.score, 0);
const laggingScore = 3; // times in last 7 days

const milestones = [
  { title: "First Check-In", description: "Completed your first assessment", icon: "star" as const, achieved: true, date: "Mar 15" },
  { title: "7-Day Streak", description: "Logged in 7 days in a row", icon: "trophy" as const, achieved: true, date: "Mar 20" },
  { title: "Dial Mover", description: "Improved a dial by 2+ points", icon: "zap" as const, achieved: true, date: "Mar 21" },
  { title: "Brotherhood Member", description: "Posted in the community", icon: "shield" as const, achieved: false },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  return (
    <div className="relative">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/images/generated/dashboard-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.06,
        }}
      />
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
    >
      {/* Welcome + Streak Row */}
      <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Good morning, John
          </h1>
          <p className="text-slate-400 mt-1">
            Let&apos;s make today count. Here&apos;s your overview.
          </p>
        </div>
        <StreakCounter count={12} size="md" />
      </motion.div>

      {/* Top Row: Daily Prompt + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <DailyPrompt
            prompt="Before you start your day, look your wife in the eyes and tell her one specific thing you appreciate about her. Not generic — specific. Something she did yesterday that you noticed."
            onStart={() => {}}
          />
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/coach" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 h-11">
                  <MessageCircle className="w-4 h-4 text-amber-400" />
                  Talk to Coach Keith
                </Button>
              </Link>
              <Link href="/five-dials/assess" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 h-11">
                  <Target className="w-4 h-4 text-amber-400" />
                  Do My Check-In
                </Button>
              </Link>
              <Link href="/content" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 h-11">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  Browse Content
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Middle Row: Radar Chart + Health Score */}
      <div className="grid lg:grid-cols-3 gap-6 items-stretch">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Five Dials Overview</CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Last assessed: March 20, 2026
                </p>
              </div>
              <Link href="/five-dials">
                <Button variant="ghost" size="sm" className="gap-1 text-amber-500">
                  View Details
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <FiveDialsRadarChart
                scores={radarData}
                size="md"
                interactive
                onDialClick={(dial) => console.log("Clicked:", dial)}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="flex flex-col gap-6">
          <Card className="py-6 px-6 space-y-4 flex-1">
            <div className="text-center">
              <InfoTip tip="Your total across all 5 dials this week. Max 35 — one point for each day you showed up."><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Leading Score</p></InfoTip>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-amber-400">{leadingScore}</span>
                <span className="text-lg text-slate-500">/35</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Sum of all 5 dials this week</p>
            </div>
            <div className="h-px bg-slate-800" />
            <div className="text-center">
              <InfoTip tip="How many times you were intimate this week. This is the result that follows when your dials are high."><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Lagging Score</p></InfoTip>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-emerald-400">{laggingScore}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Intimacy in last 7 days</p>
            </div>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <CardTitle className="text-base">Active Challenge</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300 mb-2">
                Player Dial: 30 pushups every morning for 7 days
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "71%" }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                  />
                </div>
                <span className="text-xs text-slate-400 font-medium">5/7</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Milestones + Upcoming */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <CardTitle className="text-base">Recent Milestones</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                3 of 12
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {milestones.map((m, i) => (
                <MilestoneBadge key={i} {...m} />
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <CardTitle className="text-base">This Week</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { day: "Monday", task: "Morning kickstart completed", done: true },
                { day: "Tuesday", task: "Coached on communication", done: true },
                { day: "Wednesday", task: "Five Dials check-in", done: true },
                { day: "Thursday", task: "Brotherhood post", done: false },
                { day: "Friday", task: "Date night planning", done: false },
              ].map((entry, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    entry.done ? "opacity-100" : "opacity-50"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      entry.done ? "bg-emerald-400" : "bg-slate-600"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-white">{entry.task}</p>
                    <p className="text-[10px] text-slate-500">{entry.day}</p>
                  </div>
                  {entry.done && (
                    <Badge variant="success" className="text-[10px]">
                      Done
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
    </div>
  );
}
