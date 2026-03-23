"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Play,
  Clock,
  Headphones,
  BookOpen,
  Lightbulb,
  Star,
  ExternalLink,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

const episodes = [
  {
    id: 1,
    title: "Why She Lost Respect (And How to Get It Back)",
    duration: "47 min",
    date: "Mar 15, 2026",
    topics: ["Family", "Communication"],
    description: "Keith breaks down the #1 reason wives lose respect and the counterintuitive way to earn it back.",
    plays: 12400,
  },
  {
    id: 2,
    title: "The Morning Routine That Changed Everything",
    duration: "32 min",
    date: "Mar 8, 2026",
    topics: ["Faith", "Fitness"],
    description: "How a simple 60-minute morning routine can transform every area of your life.",
    plays: 9800,
  },
  {
    id: 3,
    title: "Money Fights Are Never About Money",
    duration: "41 min",
    date: "Mar 1, 2026",
    topics: ["Finances", "Family"],
    description: "The real reason you and your wife fight about money — and how to fix it for good.",
    plays: 8200,
  },
  {
    id: 4,
    title: "Stop Being Mr. Nice Guy",
    duration: "55 min",
    date: "Feb 22, 2026",
    topics: ["Faith", "Family"],
    description: "Why being 'nice' is killing your marriage and what authentic strength looks like.",
    plays: 15600,
  },
  {
    id: 5,
    title: "The Five Dials: A Complete Guide",
    duration: "1h 12min",
    date: "Feb 15, 2026",
    topics: ["Fitness", "Faith", "Finances", "Family", "Fun"],
    description: "The definitive deep dive into Keith's Five Dials framework.",
    plays: 22300,
  },
];

const frameworks = [
  {
    name: "The Five Dials",
    description: "The core framework for measuring and improving every area of your life as a man.",
    icon: "target",
    tier: "free",
  },
  {
    name: "Mirror Technique",
    description: "How to really hear your wife and make her feel understood in 3 simple steps.",
    icon: "heart",
    tier: "core",
  },
  {
    name: "The 10-Second Rule",
    description: "Before you react in conflict, use this technique to respond with power instead of emotion.",
    icon: "shield",
    tier: "core",
  },
  {
    name: "Date Night Protocol",
    description: "A structured approach to planning intentional date nights that actually connect.",
    icon: "calendar",
    tier: "premium",
  },
  {
    name: "Morning Warrior Routine",
    description: "The exact morning routine Keith uses to dominate every day.",
    icon: "sunrise",
    tier: "free",
  },
  {
    name: "Financial Peace Framework",
    description: "How to get on the same financial page with your wife and build wealth together.",
    icon: "dollar",
    tier: "premium",
  },
];

const recommended = [
  { title: "No More Mr. Nice Guy", author: "Robert Glover", type: "Book" },
  { title: "The Way of the Superior Man", author: "David Deida", type: "Book" },
  { title: "Hold Me Tight", author: "Dr. Sue Johnson", type: "Book" },
  { title: "Atomic Habits", author: "James Clear", type: "Book" },
  { title: "The Huberman Lab", author: "Andrew Huberman", type: "Podcast" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function ContentPage() {
  const [searchQuery, setSearchQuery] = useState("");

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
            Content Library
          </h1>
          <p className="text-slate-400 mt-1">
            Keith&apos;s teachings, frameworks, and recommended resources.
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={item} className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search episodes, frameworks, topics..."
          className="pl-10"
        />
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs defaultValue="podcasts">
          <TabsList>
            <TabsTrigger value="podcasts" className="gap-1.5">
              <Headphones className="w-3.5 h-3.5" />
              Podcasts
            </TabsTrigger>
            <TabsTrigger value="frameworks" className="gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Frameworks
            </TabsTrigger>
            <TabsTrigger value="recommended" className="gap-1.5">
              <Star className="w-3.5 h-3.5" />
              Recommended
            </TabsTrigger>
          </TabsList>

          {/* Podcasts */}
          <TabsContent value="podcasts">
            <div className="space-y-3">
              {episodes
                .filter(
                  (ep) =>
                    !searchQuery ||
                    ep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    ep.topics.some((t) =>
                      t.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                )
                .map((episode, i) => (
                  <motion.div
                    key={episode.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="hover:border-slate-700 transition-all group cursor-pointer">
                      <CardContent className="flex items-center gap-4 p-4">
                        {/* Play button */}
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                          <Play className="w-5 h-5 text-amber-400" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors truncate">
                            {episode.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {episode.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="w-3 h-3" />
                              {episode.duration}
                            </div>
                            <span className="text-xs text-slate-600">
                              {episode.date}
                            </span>
                            <div className="flex gap-1">
                              {episode.topics.map((topic) => (
                                <Badge
                                  key={topic}
                                  variant="secondary"
                                  className="text-[10px] py-0 px-1.5"
                                >
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Plays */}
                        <div className="hidden sm:block text-right shrink-0">
                          <p className="text-xs text-slate-500">
                            {(episode.plays / 1000).toFixed(1)}k plays
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
            </div>
          </TabsContent>

          {/* Frameworks */}
          <TabsContent value="frameworks">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {frameworks.map((fw, i) => (
                <motion.div
                  key={fw.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="hover:border-slate-700 transition-all cursor-pointer h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-amber-400" />
                        </div>
                        <Badge
                          variant={
                            fw.tier === "free"
                              ? "success"
                              : fw.tier === "core"
                                ? "default"
                                : "gold"
                          }
                          className="text-[10px]"
                        >
                          {fw.tier}
                        </Badge>
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">
                        {fw.name}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {fw.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Recommended */}
          <TabsContent value="recommended">
            <div className="space-y-3">
              {recommended.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="hover:border-slate-700 transition-all cursor-pointer">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {item.author}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.type}
                      </Badge>
                      <ExternalLink className="w-4 h-4 text-slate-600" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
