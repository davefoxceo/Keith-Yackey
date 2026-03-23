import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { dialColors } from '@/lib/theme';

interface RadarChartProps {
  values: number[];
  labels: string[];
  size?: number;
  maxValue?: number;
}

export default function RadarChart({
  values,
  labels,
  size = 200,
  maxValue = 10,
}: RadarChartProps) {
  const center = size / 2;
  const radius = size * 0.38;
  const sides = values.length;
  const angleStep = (2 * Math.PI) / sides;
  const offset = -Math.PI / 2; // Start from top

  function getPoint(value: number, index: number): { x: number; y: number } {
    const angle = angleStep * index + offset;
    const r = (value / maxValue) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  }

  function getLabelPoint(index: number): { x: number; y: number } {
    const angle = angleStep * index + offset;
    const r = radius + 24;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  }

  // Grid rings
  const gridLevels = [2, 4, 6, 8, 10];

  // Data polygon points
  const dataPoints = values.map((v, i) => getPoint(v, i));
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const DIAL_COLORS_ARRAY = [
    '#8b5cf6', // Parent
    '#ec4899', // Partner
    '#3b82f6', // Producer
    '#10b981', // Player
    '#f59e0b', // Power
  ];

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Grid rings */}
        {gridLevels.map((level) => {
          const ringPoints = Array.from({ length: sides }, (_, i) =>
            getPoint(level, i),
          );
          const polygonStr = ringPoints.map((p) => `${p.x},${p.y}`).join(' ');
          return (
            <Polygon
              key={`grid-${level}`}
              points={polygonStr}
              fill="none"
              stroke="#334155"
              strokeWidth={0.5}
              opacity={0.5}
            />
          );
        })}

        {/* Axis lines */}
        {Array.from({ length: sides }, (_, i) => {
          const outerPoint = getPoint(maxValue, i);
          return (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={outerPoint.x}
              y2={outerPoint.y}
              stroke="#334155"
              strokeWidth={0.5}
              opacity={0.5}
            />
          );
        })}

        {/* Data polygon - gradient fill effect */}
        <Polygon
          points={dataPolygon}
          fill="rgba(245, 158, 11, 0.15)"
          stroke="#f59e0b"
          strokeWidth={2}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <Circle
            key={`point-${i}`}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={DIAL_COLORS_ARRAY[i] ?? '#f59e0b'}
            stroke="#0f172a"
            strokeWidth={2}
          />
        ))}

        {/* Labels */}
        {labels.map((label, i) => {
          const pos = getLabelPoint(i);
          return (
            <SvgText
              key={`label-${i}`}
              x={pos.x}
              y={pos.y}
              fontSize={11}
              fontWeight="600"
              fill={DIAL_COLORS_ARRAY[i] ?? '#94a3b8'}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
