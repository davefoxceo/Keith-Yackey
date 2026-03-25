"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";

interface OverviewData {
  totalUsers: number;
  averageLeadingScore: number;
  usersAtRisk: number;
  totalConversations: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  grade: "A" | "B" | "C" | "D" | "F";
  leadingScore: number;
  lastActive: string;
}

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

const gradeColors: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  B: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  C: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  D: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  F: "bg-rose-500/15 text-rose-400 border border-rose-500/20",
};

export default function AdminPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, clientsRes] = await Promise.all([
          api.get<OverviewData>("/admin/overview"),
          api.get<Client[]>("/admin/clients"),
        ]);
        setOverview(overviewRes);
        setClients(clientsRes);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (forbidden) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Admin access required
          </h2>
          <p className="text-slate-400">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  const overviewCards = overview
    ? [
        {
          label: "Total Users",
          value: overview.totalUsers,
          icon: Users,
          color: "text-blue-400",
        },
        {
          label: "Avg Leading Score",
          value: overview.averageLeadingScore.toFixed(1),
          icon: TrendingUp,
          color: "text-amber-400",
        },
        {
          label: "Users At Risk",
          value: overview.usersAtRisk,
          icon: AlertTriangle,
          color: "text-rose-400",
        },
        {
          label: "Total Conversations",
          value: overview.totalConversations,
          icon: MessageCircle,
          color: "text-emerald-400",
        },
      ]
    : [];

  return (
    <div className="relative">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <motion.div variants={item}>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Manage users and monitor platform health.
          </p>
        </motion.div>

        {/* Overview Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-6">
                  <div className="h-8 bg-slate-800 rounded w-16 mb-2" />
                  <div className="h-4 bg-slate-800 rounded w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewCards.map((card, i) => (
              <motion.div key={card.label} variants={item}>
                <Card>
                  <CardContent className="py-6">
                    <div className="flex items-center justify-between mb-2">
                      <card.icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {card.value}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{card.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Client List Table */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle>Clients</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-12 bg-slate-800 rounded animate-pulse"
                    />
                  ))}
                </div>
              ) : clients.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No clients found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left py-3 px-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Name
                        </th>
                        <th className="text-left py-3 px-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Email
                        </th>
                        <th className="text-left py-3 px-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Grade
                        </th>
                        <th className="text-left py-3 px-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Leading Score
                        </th>
                        <th className="text-left py-3 px-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
                          Last Active
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr
                          key={client.id}
                          className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-3 px-2 text-white font-medium">
                            {client.name}
                          </td>
                          <td className="py-3 px-2 text-slate-400">
                            {client.email}
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${gradeColors[client.grade] || ""}`}
                            >
                              {client.grade}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-amber-400 font-medium">
                            {client.leadingScore}/35
                          </td>
                          <td className="py-3 px-2 text-slate-400">
                            {client.lastActive}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
