'use client';

import { useState } from 'react';
import { Stage, Layer, Arrow, Text, Circle, Group } from 'react-konva';

interface GenerativeProcessDiagramProps {
  width?: number;
  height?: number;
  interactive?: boolean;
}

export default function GenerativeProcessDiagram({
  width = 500,
  height = 300,
  interactive = true,
}: GenerativeProcessDiagramProps) {
  const [highlightState, setHighlightState] = useState(false);
  const [highlightObservation, setHighlightObservation] = useState(false);
  const [message, setMessage] = useState('');

  // Layout calculations
  const centerX = width / 2;
  const stateX = width * 0.3;
  const observationX = width * 0.7;
  const nodeY = height / 2;
  const nodeRadius = 30;

  const handleStateClick = () => {
    if (!interactive) return;
    setHighlightState(true);
    setHighlightObservation(false);
    setMessage('State (s): The hidden variable in the environment (e.g., it rained at night)');
  };

  const handleObservationClick = () => {
    if (!interactive) return;
    setHighlightState(false);
    setHighlightObservation(true);
    setMessage('Observation (o): What we can see (e.g., the grass is wet)');
  };

  const handleArrowClick = () => {
    if (!interactive) return;
    setHighlightState(true);
    setHighlightObservation(true);
    setMessage('Generative Process: The true cause-effect relationship P(s,o)');
  };

  return (
    <div className="flex flex-col items-center">
      <Stage width={width} height={height}>
        <Layer>
          {/* State Node */}
          <Group onClick={handleStateClick}>
            <Circle
              x={stateX}
              y={nodeY}
              radius={nodeRadius}
              fill={highlightState ? '#fad2e1' : '#f8f8f8'}
              stroke={highlightState ? '#e83e8c' : '#666'}
              strokeWidth={2}
              shadowBlur={highlightState ? 10 : 0}
              shadowColor="rgba(232, 62, 140, 0.5)"
            />
            <Text
              x={stateX - 15}
              y={nodeY - 10}
              text="s"
              fontSize={24}
              fontStyle="italic"
              fill={highlightState ? '#e83e8c' : '#333'}
            />
          </Group>

          {/* Observation Node */}
          <Group onClick={handleObservationClick}>
            <Circle
              x={observationX}
              y={nodeY}
              radius={nodeRadius}
              fill={highlightObservation ? '#d1ecf1' : '#f8f8f8'}
              stroke={highlightObservation ? '#17a2b8' : '#666'}
              strokeWidth={2}
              shadowBlur={highlightObservation ? 10 : 0}
              shadowColor="rgba(23, 162, 184, 0.5)"
            />
            <Text
              x={observationX - 15}
              y={nodeY - 10}
              text="o"
              fontSize={24}
              fontStyle="italic"
              fill={highlightObservation ? '#17a2b8' : '#333'}
            />
          </Group>

          {/* Arrow connecting state to observation */}
          <Arrow
            points={[stateX + nodeRadius, nodeY, observationX - nodeRadius, nodeY]}
            stroke={highlightState && highlightObservation ? '#20c997' : '#666'}
            strokeWidth={3}
            fill={highlightState && highlightObservation ? '#20c997' : '#666'}
            onClick={handleArrowClick}
          />
        </Layer>
      </Stage>
      {interactive && (
        <div className="mt-3 text-center text-sm text-gray-600 h-12">
          {message || 'Click on elements to learn more'}
        </div>
      )}
    </div>
  );
} 