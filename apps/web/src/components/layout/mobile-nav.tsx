"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessageCircle,
  Target,
  BookOpen,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/coach", icon: MessageCircle, label: "Coach" },
  { href: "/five-dials", icon: Target, label: "Dials" },
  { href: "/content", icon: BookOpen, label: "Content" },
  { href: "/brotherhood", icon: Users, label: "Bros" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="glass-strong border-t border-slate-700/50">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-0.5 py-1 px-3"
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-active"
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-500 rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-amber-400" : "text-slate-500"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    isActive ? "text-amber-400" : "text-slate-500"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      {/* Safe area spacer */}
      <div className="h-[env(safe-area-inset-bottom)] bg-surface-raised" />
    </nav>
  );
}
