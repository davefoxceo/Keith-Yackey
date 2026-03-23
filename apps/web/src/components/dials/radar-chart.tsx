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

  const CustomLabel = ({ x, y, value }: { x: number; y: number; value: string }) => (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-slate-300 text-xs font-medium cursor-pointer hover:fill-amber-400 transition-colors"
      onClick={() => interactive && onDialClick?.(value)}
    >
      {value}
    </text>
  );

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
          tick={interactive ? CustomLabel : { fill: "#94a3b8", fontSize: 12 }}
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
          strokeWidth={2}
          fill="#f59e0b"
          fillOpacity={0.15}
          dot={{
            r: 4,
            fill: "#f59e0b",
            stroke: "#0f172a",
            strokeWidth: 2,
          }}
          activeDot={{
            r: 6,
            fill: "#fbbf24",
            stroke: "#0f172a",
            strokeWidth: 2,
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "12px",
            color: "#e2e8f0",
            fontSize: "13px",
            padding: "8px 12px",
          }}
          formatter={(value: number) => [`${value}/10`, "Score"]}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
