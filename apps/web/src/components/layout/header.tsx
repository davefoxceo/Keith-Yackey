"use client";

import React from "react";
import { Bell, Search, Flame, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="h-16 border-b border-slate-800 bg-surface-raised/50 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search content, frameworks..."
            className="w-full h-9 pl-10 pr-4 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Streak (mobile) */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 lg:hidden">
          <Flame className="w-4 h-4 text-amber-400 animate-flame" />
          <span className="text-sm font-bold text-amber-400">12</span>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-slate-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
        </Button>

        {/* User (mobile) */}
        <div className="flex items-center gap-2 lg:hidden">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">JD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
