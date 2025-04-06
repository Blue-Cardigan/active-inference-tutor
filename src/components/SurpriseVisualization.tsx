'use client';

import { useState, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Text, Rect } from 'react-konva';

interface SurpriseVisualizationProps {
  probability?: number;
  width?: number;
  height?: number;
  onProbabilityChange?: (value: number) => void;
}

export default function SurpriseVisualization({
  probability = 0.5,
  width = 500,
  height = 300,
  onProbabilityChange,
}: SurpriseVisualizationProps) {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [currentProb, setCurrentProb] = useState(probability);
  const [currentSurprise, setCurrentSurprise] = useState(-Math.log(probability));
  const [isDragging, setIsDragging] = useState(false);
  const [maxY, setMaxY] = useState(1);

  // Padding for the plot area
  const padding = 40;
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;
  
  // Generate surprise function points: S(p) = -log(p) only when dimensions change
  useEffect(() => {
    const newPointsData = [];
    for (let p = 0.01; p <= 1; p += 0.01) {
      const x = p;
      const y = -Math.log(p);
      newPointsData.push({ x, y });
    }
    
    // Find max Y to scale points relative to canvas height
    const calculatedMaxY = Math.min(10, newPointsData.reduce((max, point) => Math.max(max, point.y), 0)); // Cap at 10 for very small probabilities
    setMaxY(calculatedMaxY); // Store maxY for marker calculation
    
    // Scale points to fit canvas
    const scaledPoints = newPointsData.map(point => ({
      x: padding + point.x * plotWidth,
      // Scale Y based on the calculated maxY
      y: height - padding - (Math.min(point.y, calculatedMaxY) / calculatedMaxY) * plotHeight
    }));
    
    setPoints(scaledPoints);
  }, [width, height, plotWidth, plotHeight, padding]);
  
  // Synchronize internal state with the probability prop from parent
  useEffect(() => {
    // Ensure probability stays within valid bounds for log
    const validProb = Math.max(0.001, Math.min(0.999, probability));
    setCurrentProb(validProb);
    setCurrentSurprise(-Math.log(validProb));
  }, [probability]);
  
  // Handle slider drag - only notify parent
  const handleDrag = (x: number) => {
    const clampedX = Math.max(padding, Math.min(width - padding, x));
    const newProb = (clampedX - padding) / plotWidth;
    // Ensure probability stays within valid bounds for log during drag
    const validNewProb = Math.max(0.001, Math.min(0.999, newProb));

    // Only call the callback, state update flows from parent
    if (onProbabilityChange) {
      onProbabilityChange(validNewProb);
    }
  };

  // Calculate marker position using the same scaling logic as the curve
  const markerX = padding + currentProb * plotWidth;
  // Calculate Y based on currentSurprise and the stored maxY, then clamp to plot area
  const calculatedMarkerY = height - padding - (Math.min(currentSurprise, maxY) / maxY) * plotHeight;
  const markerY = Math.max(padding, Math.min(height - padding, calculatedMarkerY));

  // Function to constrain dragging to the curve
  const dragBound = (pos: { x: number; y: number }) => {
    // Clamp x within the plot bounds
    const clampedX = Math.max(padding, Math.min(width - padding, pos.x));
    
    // Calculate probability from the clamped x
    const prob = (clampedX - padding) / plotWidth;
    const validProb = Math.max(0.001, Math.min(0.999, prob)); // Ensure valid log input
    
    // Calculate the corresponding surprise value
    const surpriseVal = -Math.log(validProb);
    
    // Calculate the y position on the scaled curve
    const calculatedY = height - padding - (Math.min(surpriseVal, maxY) / maxY) * plotHeight;
    const clampedY = Math.max(padding, Math.min(height - padding, calculatedY));
    
    return {
      x: clampedX,
      y: clampedY, // Return the calculated y based on x
    };
  };

  return (
    <div className="flex flex-col items-center">
      <Stage width={width} height={height}>
        <Layer>
          {/* Background and axes */}
          <Rect
            x={padding}
            y={padding}
            width={plotWidth}
            height={plotHeight}
            fill="#f9f9f9"
            stroke="#ddd"
            strokeWidth={1}
          />
          
          {/* X-axis */}
          <Line
            points={[padding, height - padding, width - padding, height - padding]}
            stroke="#666"
            strokeWidth={2}
          />
          <Text
            x={width / 2 - 40}
            y={height - 25}
            text="Probability p"
            fontSize={14}
            fill="#333"
          />
          
          {/* Y-axis */}
          <Line
            points={[padding, padding, padding, height - padding]}
            stroke="#666"
            strokeWidth={2}
          />
          <Text
            x={5}
            y={height / 2 + 50}
            text="Surprise"
            fontSize={14}
            fill="#333"
            rotation={270}
          />
          <Text
            x={5}
            y={height / 2 - 10}
            text="-log(p)"
            fontSize={14}
            fontStyle="italic"
            fill="#333"
            rotation={270}
          />
          
          {/* Surprise curve */}
          <Line
            points={points.flatMap(p => [p.x, p.y])}
            stroke="#3498db"
            strokeWidth={2}
            tension={0.1}
          />
          
          {/* Current probability marker (vertical line) */}
          <Line
            points={[markerX, height - padding, markerX, markerY]}
            stroke="#e74c3c"
            strokeWidth={1}
            dash={[5, 2]}
          />
          
          {/* Current surprise marker (horizontal line) */}
          <Line
            points={[padding, markerY, markerX, markerY]}
            stroke="#e74c3c"
            strokeWidth={1}
            dash={[5, 2]}
          />
          
          {/* Marker point */}
          <Circle
            x={markerX}
            y={markerY}
            radius={6}
            fill="#e74c3c"
            draggable
            dragBoundFunc={dragBound}
            onDragStart={() => setIsDragging(true)}
            onDragMove={e => handleDrag(e.target.x())}
            onDragEnd={() => setIsDragging(false)}
          />
          
          {/* Value labels */}
          <Text
            x={markerX + 5}
            y={markerY - 20}
            text={`S = ${currentSurprise.toFixed(2)}`}
            fontSize={14}
            fill="#333"
            padding={3}
            background="#fff"
          />
          <Text
            x={markerX - 25}
            y={height - padding + 5}
            text={`p = ${currentProb.toFixed(2)}`}
            fontSize={14}
            fill="#333"
            padding={3}
            background="#fff"
          />
        </Layer>
      </Stage>
      <div className="mt-3 text-sm text-gray-600">
        Drag the red point to see how surprise changes with probability
      </div>
    </div>
  );
} 