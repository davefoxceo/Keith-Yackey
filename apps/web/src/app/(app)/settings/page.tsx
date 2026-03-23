"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Bell,
  CreditCard,
  Shield,
  Download,
  Trash2,
  LogOut,
  ChevronRight,
  Check,
  Moon,
  Mail,
  Smartphone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function SettingsPage() {
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");
  const [notifications, setNotifications] = useState({
    morningKickstart: true,
    weeklyAssessment: true,
    streakReminder: true,
    communityUpdates: false,
    emailDigest: true,
    pushNotifications: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and preferences.</p>
      </motion.div>

      {/* Profile */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base">Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-lg">JD</AvatarFallback>
              </Avatar>
              <div>
                <Button variant="secondary" size="sm">
                  Change Photo
                </Button>
                <p className="text-[10px] text-slate-500 mt-1">
                  JPG, PNG. Max 2MB
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Full Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                />
              </div>
            </div>

            <Button size="sm">Save Changes</Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { key: "morningKickstart" as const, label: "Morning Kickstart", desc: "Daily coaching prompt at 6:00 AM", icon: Moon },
              { key: "weeklyAssessment" as const, label: "Weekly Assessment Reminder", desc: "Reminder to complete your Five Dials", icon: Bell },
              { key: "streakReminder" as const, label: "Streak Reminder", desc: "Don't lose your streak notification", icon: Bell },
              { key: "communityUpdates" as const, label: "Community Updates", desc: "New posts and replies in Brotherhood", icon: Bell },
              { key: "emailDigest" as const, label: "Weekly Email Digest", desc: "Summary of your progress via email", icon: Mail },
              { key: "pushNotifications" as const, label: "Push Notifications", desc: "Browser push notifications", icon: Smartphone },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleNotification(item.key)}
                  className={`w-11 h-6 rounded-full transition-all duration-200 flex items-center ${
                    notifications[item.key]
                      ? "bg-amber-500 justify-end"
                      : "bg-slate-700 justify-start"
                  }`}
                >
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-5 h-5 rounded-full bg-white mx-0.5 shadow-sm"
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Subscription */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base">Subscription</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    Premium Plan
                  </span>
                  <Badge variant="gold" className="text-[10px]">Active</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  $79/month - Renews April 15, 2026
                </p>
              </div>
              <Button variant="secondary" size="sm">
                Manage
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                Change Plan
              </Button>
              <Button variant="danger" size="sm">
                Cancel Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data & Privacy */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-base">Data & Privacy</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="secondary" size="sm" className="gap-2 w-full sm:w-auto">
              <Download className="w-4 h-4" />
              Export My Data
            </Button>
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-sm font-medium text-rose-400 mb-2">
                Danger Zone
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
              <Button variant="danger" size="sm" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sign Out */}
      <motion.div variants={item}>
        <Button variant="ghost" className="gap-2 text-slate-400 hover:text-white">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </motion.div>
    </motion.div>
  );
}
