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
  fullMark: 7;
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
  const heights = { sm: 280, md: 420, lg: 500 };

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const CustomLabel = (props: any) => {
    const { x, y, payload } = props;
    const label = payload?.value || '';
    const score = scores.find((s) => s.dial === label)?.score;
    return (
      <g
        onClick={() => interactive && onDialClick?.(label)}
        style={{ cursor: interactive ? 'pointer' : 'default' }}
      >
        <text
          x={x}
          y={y - 9}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fill: '#e2e8f0', fontSize: 14, fontWeight: 600 }}
        >
          {label}
        </text>
        <text
          x={x}
          y={y + 11}
          textAnchor="middle"
          dominantBaseline="central"
          style={{ fill: '#f59e0b', fontSize: 13, fontWeight: 700 }}
        >
          {score != null ? `${score}/7` : ''}
        </text>
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={heights[size]}>
      <RechartsRadar data={scores} cx="50%" cy="50%" outerRadius="60%">
        <PolarGrid
          stroke="#334155"
          strokeDasharray="3 3"
          strokeOpacity={0.5}
        />
        <PolarAngleAxis
          dataKey="dial"
          tick={CustomLabel}
          tickLine={false}
          dy={5}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 7]}
          tick={{ fill: "#475569", fontSize: 10 }}
          tickCount={8}
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
