'use client';

import { useState } from 'react';
import { Stage, Layer, Arrow, Text, Circle, Group, Rect } from 'react-konva';

interface GenerativeModelDiagramProps {
  width?: number;
  height?: number;
  interactive?: boolean;
}

export default function GenerativeModelDiagram({
  width = 500,
  height = 300,
  interactive = true,
}: GenerativeModelDiagramProps) {
  const [highlightState, setHighlightState] = useState(false);
  const [highlightObservation, setHighlightObservation] = useState(false);
  const [highlightBrain, setHighlightBrain] = useState(false);
  const [message, setMessage] = useState('');

  // Layout calculations
  const centerX = width / 2;
  const stateX = width * 0.3;
  const observationX = width * 0.7;
  const nodeY = height * 0.5;
  const nodeRadius = 25;
  const brainWidth = width * 0.8;
  const brainHeight = height * 0.7;
  const brainX = (width - brainWidth) / 2;
  const brainY = (height - brainHeight) / 2;

  const handleStateClick = () => {
    if (!interactive) return;
    setHighlightState(true);
    setHighlightObservation(false);
    setHighlightBrain(true);
    setMessage('Belief about state (s): Brain\'s model of the hidden state (e.g., it might have rained)');
  };

  const handleObservationClick = () => {
    if (!interactive) return;
    setHighlightState(false);
    setHighlightObservation(true);
    setHighlightBrain(true);
    setMessage('Sensory observation (o): What the brain receives through senses (e.g., seeing wet grass)');
  };

  const handleArrowClick = () => {
    if (!interactive) return;
    setHighlightState(true);
    setHighlightObservation(true);
    setHighlightBrain(true);
    setMessage('Generative Model: Brain\'s probabilistic model of how states generate observations p(s,o)');
  };

  const handleBrainClick = () => {
    if (!interactive) return;
    setHighlightBrain(true);
    setHighlightState(true);
    setHighlightObservation(true);
    setMessage('The brain builds a model of the world p(s,o) to minimize surprise');
  };

  return (
    <div className="flex flex-col items-center">
      <Stage width={width} height={height}>
        <Layer>
          {/* Brain outline */}
          <Rect
            x={brainX}
            y={brainY}
            width={brainWidth}
            height={brainHeight}
            cornerRadius={20}
            fill={highlightBrain ? 'rgba(218, 247, 166, 0.3)' : 'rgba(240, 240, 240, 0.3)'}
            stroke={highlightBrain ? '#82c91e' : '#aaa'}
            strokeWidth={2}
            dash={[10, 5]}
            onClick={handleBrainClick}
          />
          
          <Text
            x={centerX - 55}
            y={brainY + 15}
            text="Brain's Model"
            fontSize={16}
            fontStyle="bold"
            fill={highlightBrain ? '#5c940d' : '#666'}
          />

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

          {/* Bidirectional Arrow connecting state to observation */}
          <Arrow
            points={[stateX + nodeRadius, nodeY, observationX - nodeRadius, nodeY]}
            stroke={highlightState && highlightObservation ? '#20c997' : '#666'}
            strokeWidth={3}
            fill={highlightState && highlightObservation ? '#20c997' : '#666'}
            onClick={handleArrowClick}
          />
          
          <Arrow
            points={[observationX - nodeRadius, nodeY + 10, stateX + nodeRadius, nodeY + 10]}
            stroke={highlightState && highlightObservation ? '#20c997' : '#666'}
            strokeWidth={3}
            fill={highlightState && highlightObservation ? '#20c997' : '#666'}
            onClick={handleArrowClick}
          />
          
          {/* Model equation */}
          <Text
            x={centerX - 35}
            y={nodeY + 40}
            text="p(s,o)"
            fontSize={20}
            fontStyle="italic"
            fill={highlightBrain ? '#5c940d' : '#666'}
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