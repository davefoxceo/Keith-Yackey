"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendDataPoint {
  date: string;
  parent: number;
  partner: number;
  producer: number;
  player: number;
  power: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
}

const dialColors: Record<string, string> = {
  parent: "#8b5cf6",
  partner: "#ec4899",
  producer: "#3b82f6",
  player: "#10b981",
  power: "#f59e0b",
};

export function TrendChart({ data }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#475569"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 7]}
          stroke="#475569"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickCount={8}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "12px",
            color: "#e2e8f0",
            fontSize: "13px",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
          iconType="circle"
          iconSize={8}
        />
        {Object.entries(dialColors).map(([key, color]) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, stroke: "#0f172a", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            name={key.charAt(0).toUpperCase() + key.slice(1)}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
