"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

interface WeeklyChallengeData {
  id: string;
  title: string;
  description: string;
  targetDial: string;
  progress: number;
  totalDays: number;
  completedDays: number;
  completed: boolean;
}

export function WeeklyChallenge() {
  const [challenge, setChallenge] = useState<WeeklyChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    async function fetchChallenge() {
      try {
        const data = await api.get<WeeklyChallengeData>(
          "/coaching/weekly-challenge"
        );
        setChallenge(data);
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchChallenge();
  }, []);

  async function handleComplete() {
    if (!challenge || completing) return;
    setCompleting(true);
    try {
      await api.post("/coaching/weekly-challenge/complete");
      setChallenge((prev) => (prev ? { ...prev, completed: true } : prev));
    } catch {
      // Handle error silently
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-800 rounded w-full" />
            <div className="h-2 bg-slate-800 rounded w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!challenge) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base">Weekly Challenge</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            No active challenge this week.
          </p>
        </CardContent>
      </Card>
    );
  }

  const progressPercent = challenge.totalDays > 0
    ? Math.round((challenge.completedDays / challenge.totalDays) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <CardTitle className="text-base">Weekly Challenge</CardTitle>
          </div>
          {challenge.completed ? (
            <Badge variant="success" className="text-[10px]">
              Complete
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              {challenge.targetDial}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium text-white">{challenge.title}</p>
          <p className="text-xs text-slate-400 mt-1">
            {challenge.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className={`h-full rounded-full ${
                challenge.completed
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-amber-500 to-amber-400"
              }`}
            />
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {challenge.completedDays}/{challenge.totalDays}
          </span>
        </div>

        {!challenge.completed && (
          <Button
            onClick={handleComplete}
            disabled={completing}
            size="sm"
            className="w-full"
          >
            {completing ? "Completing..." : "Mark Complete"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
