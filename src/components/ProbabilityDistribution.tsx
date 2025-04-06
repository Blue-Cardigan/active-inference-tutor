'use client';

import { useState, useEffect } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';

interface Point {
  x: number;
  y: number;
}

interface ProbabilityDistributionProps {
  points: Point[];
  width: number;
  height: number;
  onPointClick?: (point: Point) => void;
}

export default function ProbabilityDistribution({
  points,
  width,
  height,
  onPointClick,
}: ProbabilityDistributionProps) {
  const [scaledPoints, setScaledPoints] = useState<Point[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

  useEffect(() => {
    // Scale points to fit the canvas
    const scaled = points.map(point => ({
      x: point.x * width,
      y: point.y * height,
    }));
    setScaledPoints(scaled);
  }, [points, width, height]);

  const handlePointClick = (point: Point) => {
    setSelectedPoint(point);
    if (onPointClick) {
      onPointClick(point);
    }
  };

  return (
    <Stage width={width} height={height}>
      <Layer>
        {/* Draw the probability curve */}
        <Line
          points={scaledPoints.flatMap(p => [p.x, p.y])}
          stroke="blue"
          strokeWidth={2}
          tension={0.4}
        />
        
        {/* Draw interactive points */}
        {scaledPoints.map((point, i) => (
          <Circle
            key={i}
            x={point.x}
            y={point.y}
            radius={5}
            fill={selectedPoint === point ? 'red' : 'blue'}
            onClick={() => handlePointClick(point)}
          />
        ))}
      </Layer>
    </Stage>
  );
} 