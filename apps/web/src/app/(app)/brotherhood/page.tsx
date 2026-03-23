"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ThumbsUp,
  MessageCircle,
  Pin,
  Eye,
  EyeOff,
  Send,
  Users,
  Crown,
  Flame,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Post {
  id: number;
  author: string;
  anonymous: boolean;
  content: string;
  timestamp: string;
  upvotes: number;
  comments: number;
  pinned: boolean;
  tier: string;
  tags: string[];
}

const mockPosts: Post[] = [
  {
    id: 1,
    author: "Coach Keith",
    anonymous: false,
    content:
      "Weekly challenge, gentlemen: This week, I want you to plan ONE intentional date with your wife. Not dinner and a movie on autopilot. Something that shows you KNOW her. What she loves. What lights her up. Report back. Let's go.",
    timestamp: "2 hours ago",
    upvotes: 47,
    comments: 23,
    pinned: true,
    tier: "coach",
    tags: ["Challenge", "Partner"],
  },
  {
    id: 2,
    author: "Mike R.",
    anonymous: false,
    content:
      "Just hit 30 days of consistent morning workouts. Player dial went from 4 to 7. My wife noticed the change before I even told her about this app. She said 'something's different about you.' Brothers, the framework WORKS. Don't give up.",
    timestamp: "5 hours ago",
    upvotes: 32,
    comments: 12,
    pinned: false,
    tier: "premium",
    tags: ["Win", "Player"],
  },
  {
    id: 3,
    author: "Anonymous",
    anonymous: true,
    content:
      "My wife told me last night she's been unhappy for a year. I'm devastated but also grateful she told me instead of just leaving. Starting the crisis coaching mode today. Any brothers been through this? Could use some encouragement.",
    timestamp: "8 hours ago",
    upvotes: 56,
    comments: 34,
    pinned: false,
    tier: "core",
    tags: ["Support", "Partner"],
  },
  {
    id: 4,
    author: "James T.",
    anonymous: false,
    content:
      "Producer dial update: Finally had THE money talk with my wife using Keith's Financial Peace Framework. For the first time in our marriage, we're on the same page about a budget. No fighting. Just teamwork. This is what it feels like.",
    timestamp: "1 day ago",
    upvotes: 28,
    comments: 8,
    pinned: false,
    tier: "premium",
    tags: ["Win", "Producer"],
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function BrotherhoodPage() {
  const [newPost, setNewPost] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [upvoted, setUpvoted] = useState<Set<number>>(new Set());

  const toggleUpvote = (postId: number) => {
    setUpvoted((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              The Brotherhood
            </h1>
            <p className="text-slate-400 mt-1">
              A community of men committed to growth. No judgment.
            </p>
          </div>
          <Badge variant="gold" className="gap-1">
            <Users className="w-3 h-3" />
            2,847 members
          </Badge>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Create Post */}
          <motion.div variants={item}>
            <Card>
              <CardContent className="p-4">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share a win, ask for advice, or just check in with the brotherhood..."
                  className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 resize-none focus:outline-none min-h-[80px]"
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isAnonymous
                        ? "bg-slate-700 text-white"
                        : "text-slate-500 hover:bg-slate-800"
                    }`}
                  >
                    {isAnonymous ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                    {isAnonymous ? "Anonymous" : "Public"}
                  </button>
                  <Button
                    size="sm"
                    disabled={!newPost.trim()}
                    className="gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pinned section */}
          {mockPosts.some((p) => p.pinned) && (
            <motion.div variants={item}>
              <div className="flex items-center gap-2 mb-2">
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
                  Pinned
                </span>
              </div>
            </motion.div>
          )}

          {/* Posts */}
          {mockPosts.map((post) => (
            <motion.div key={post.id} variants={item}>
              <Card
                className={
                  post.pinned ? "gold-border" : ""
                }
              >
                <CardContent className="p-4">
                  {/* Author row */}
                  <div className="flex items-center gap-3 mb-3">
                    {post.anonymous ? (
                      <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-slate-400" />
                      </div>
                    ) : post.tier === "coach" ? (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center ring-2 ring-amber-500/20">
                        <Crown className="w-4 h-4 text-slate-900" />
                      </div>
                    ) : (
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="text-xs">
                          {post.author.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {post.author}
                        </span>
                        {post.tier === "coach" && (
                          <Badge variant="tier" className="text-[9px] py-0 px-1.5">
                            Coach
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {post.timestamp}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {post.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] py-0 px-1.5"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-sm text-slate-300 leading-relaxed mb-4">
                    {post.content}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleUpvote(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        upvoted.has(post.id)
                          ? "bg-amber-500/15 text-amber-400"
                          : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      {post.upvotes + (upvoted.has(post.id) ? 1 : 0)}
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {post.comments}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Sidebar */}
        <motion.div variants={item} className="space-y-4">
          {/* Accountability Partner */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Accountability Partner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>DK</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-white">David K.</p>
                  <p className="text-xs text-slate-500">Matched 3 weeks ago</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-400 font-medium">
                  18-day check-in streak together
                </span>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <MessageCircle className="w-3.5 h-3.5" />
                Message David
              </Button>
            </CardContent>
          </Card>

          {/* Community Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Community Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Active Members", value: "2,847" },
                { label: "Posts This Week", value: "342" },
                { label: "Average Streak", value: "14 days" },
                { label: "Wins Shared", value: "1,203" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-slate-500">{stat.label}</span>
                  <span className="text-sm font-semibold text-white">
                    {stat.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Community Guidelines */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Brotherhood Code</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">1.</span>
                  What&apos;s shared here stays here
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">2.</span>
                  No judgment — only growth
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">3.</span>
                  Celebrate wins, support struggles
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">4.</span>
                  Be honest. Be accountable.
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
