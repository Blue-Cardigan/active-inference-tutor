'use client';

import { useState, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Text } from 'react-konva';

interface FreeEnergyVisualizationProps {
  width: number;
  height: number;
  onEnergyChange?: (energy: number) => void;
}

export default function FreeEnergyVisualization({
  width,
  height,
  onEnergyChange,
}: FreeEnergyVisualizationProps) {
  const [position, setPosition] = useState({ x: width / 2, y: height / 2 });
  const [energy, setEnergy] = useState(0);

  useEffect(() => {
    // Calculate energy based on distance from center
    const centerX = width / 2;
    const centerY = height / 2;
    const distance = Math.sqrt(
      Math.pow(position.x - centerX, 2) + Math.pow(position.y - centerY, 2)
    );
    const maxDistance = Math.sqrt(Math.pow(width / 2, 2) + Math.pow(height / 2, 2));
    const newEnergy = (distance / maxDistance) * 100;
    setEnergy(newEnergy);
    if (onEnergyChange) {
      onEnergyChange(newEnergy);
    }
  }, [position, width, height, onEnergyChange]);

  return (
    <Stage width={width} height={height}>
      <Layer>
        {/* Draw energy contours */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((scale, i) => (
          <Circle
            key={i}
            x={width / 2}
            y={height / 2}
            radius={Math.min(width, height) * scale * 0.4}
            stroke="gray"
            strokeWidth={1}
            dash={[5, 5]}
          />
        ))}

        {/* Draw center point */}
        <Circle
          x={width / 2}
          y={height / 2}
          radius={5}
          fill="green"
        />

        {/* Draw draggable point */}
        <Circle
          x={position.x}
          y={position.y}
          radius={8}
          fill="red"
          draggable
          onDragMove={(e) => {
            setPosition({
              x: e.target.x(),
              y: e.target.y(),
            });
          }}
        />

        {/* Display energy value */}
        <Text
          x={10}
          y={10}
          text={`Free Energy: ${energy.toFixed(2)}`}
          fontSize={16}
          fill="black"
        />
      </Layer>
    </Stage>
  );
} 