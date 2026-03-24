"use client";

import React from "react";
import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface DialScore {
  dial: string;
  score: number;
  fullMark: 10;
}

interface RadarChartProps {
  scores: DialScore[];
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onDialClick?: (dial: string) => void;
}

export function FiveDialsRadarChart({
  scores,
  size = "md",
  interactive = false,
  onDialClick,
}: RadarChartProps) {
  const heights = { sm: 200, md: 300, lg: 400 };

  const CustomLabel = ({ x, y, value }: { x: number; y: number; value: string }) => {
    const score = scores.find((s) => s.dial === value)?.score;
    return (
      <g onClick={() => interactive && onDialClick?.(value)} className="cursor-pointer">
        <text
          x={x}
          y={y - 8}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-200 text-xs font-semibold"
        >
          {value}
        </text>
        <text
          x={x}
          y={y + 8}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-amber-400 text-[11px] font-bold"
        >
          {score != null ? `${score}/10` : ''}
        </text>
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={heights[size]}>
      <RechartsRadar data={scores} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid
          stroke="#334155"
          strokeDasharray="3 3"
          strokeOpacity={0.5}
        />
        <PolarAngleAxis
          dataKey="dial"
          tick={CustomLabel}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 10]}
          tick={{ fill: "#475569", fontSize: 10 }}
          tickCount={6}
          axisLine={false}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#f59e0b"
          strokeWidth={2.5}
          fill="#f59e0b"
          fillOpacity={0.2}
          dot={{
            r: 5,
            fill: "#f59e0b",
            stroke: "#0f172a",
            strokeWidth: 2,
          }}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
