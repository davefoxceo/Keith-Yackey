"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 max-w-[250px] rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-[13px] text-slate-200 shadow-xl animate-in fade-in-0 zoom-in-95",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * Simple info tooltip wrapper. Wrap any element and pass `tip` text.
 *
 * Usage:
 *   <InfoTip tip="Explanation here">
 *     <span>Leading Score</span>
 *   </InfoTip>
 */
function InfoTip({
  children,
  tip,
  side = "top",
}: {
  children: React.ReactNode;
  tip: string;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dotted border-slate-600">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side={side}>{tip}</TooltipContent>
    </Tooltip>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  InfoTip,
};
