'use client';

import { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Line, Group, Circle } from 'react-konva';

interface Policy {
  id: number;
  name: string;
  expectedFreeEnergy: number;
  probability: number;
}

interface PolicySelectionVisualizationProps {
  policies?: Policy[];
  width?: number;
  height?: number;
  onPolicySelect?: (policy: Policy) => void;
}

export default function PolicySelectionVisualization({
  policies = [
    { id: 1, name: "Policy A", expectedFreeEnergy: 2.5, probability: 0.22 },
    { id: 2, name: "Policy B", expectedFreeEnergy: 1.8, probability: 0.41 },
    { id: 3, name: "Policy C", expectedFreeEnergy: 3.2, probability: 0.13 },
    { id: 4, name: "Policy D", expectedFreeEnergy: 2.1, probability: 0.24 }
  ],
  width = 500,
  height = 400,
  onPolicySelect,
}: PolicySelectionVisualizationProps) {
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [precision, setPrecision] = useState(1.0);
  const [localPolicies, setLocalPolicies] = useState(policies);

  // Padding and dimensions
  const padding = 50;
  const chartWidth = width - 2 * padding;
  const chartHeight = height - 2 * padding - 60; // Extra space for precision slider
  const barWidth = chartWidth / (localPolicies.length * 2);
  
  // Colors
  const colors = {
    efe: '#3498db',
    probability: '#e74c3c',
    selected: '#2ecc71'
  };

  // Update policy probabilities when precision changes
  useEffect(() => {
    // Recalculate probabilities based on Expected Free Energy and precision
    const efes = localPolicies.map(p => p.expectedFreeEnergy);
    const weightedEFEs = efes.map(efe => Math.exp(-precision * efe));
    const sumWeightedEFEs = weightedEFEs.reduce((a, b) => a + b, 0);
    const newProbabilities = weightedEFEs.map(w => w / sumWeightedEFEs);
    
    setLocalPolicies(localPolicies.map((policy, i) => ({
      ...policy,
      probability: newProbabilities[i]
    })));
  }, [precision]);

  const handlePolicyClick = (policy: Policy) => {
    setSelectedPolicy(policy);
    if (onPolicySelect) {
      onPolicySelect(policy);
    }
  };

  const handlePrecisionChange = (x: number) => {
    // Convert x position to precision value (0.1 to 3.0)
    const sliderStart = padding;
    const sliderWidth = chartWidth;
    const relativeX = Math.max(0, Math.min(1, (x - sliderStart) / sliderWidth));
    const newPrecision = 0.1 + relativeX * 2.9; // Scale to 0.1-3.0 range
    setPrecision(newPrecision);
  };

  // Find maximum values for scaling
  const maxEFE = Math.max(...localPolicies.map(p => p.expectedFreeEnergy));
  const maxProb = Math.max(...localPolicies.map(p => p.probability));

  return (
    <div className="flex flex-col items-center">
      <Stage width={width} height={height}>
        <Layer>
          {/* Chart area */}
          <Rect
            x={padding}
            y={padding}
            width={chartWidth}
            height={chartHeight}
            fill="#f9f9f9"
            stroke="#ddd"
            strokeWidth={1}
          />
          
          {/* Title */}
          <Text
            x={width / 2 - 80}
            y={15}
            text="Policy Selection Based on EFE"
            fontSize={16}
            fontStyle="bold"
            fill="#333"
          />
          
          {/* Render bars for each policy */}
          {localPolicies.map((policy, i) => {
            const xPos = padding + i * (chartWidth / localPolicies.length) + barWidth / 2;
            const efeHeight = (policy.expectedFreeEnergy / maxEFE) * chartHeight * 0.8;
            const probHeight = (policy.probability / maxProb) * chartHeight * 0.8;
            const isSelected = selectedPolicy?.id === policy.id;
            
            return (
              <Group key={policy.id} onClick={() => handlePolicyClick(policy)}>
                {/* Policy Name */}
                <Text
                  x={xPos - 25}
                  y={height - padding + 10}
                  text={policy.name}
                  fontSize={14}
                  fill={isSelected ? colors.selected : '#333'}
                  fontStyle={isSelected ? 'bold' : 'normal'}
                />
                
                {/* EFE Bar */}
                <Rect
                  x={xPos - barWidth * 0.8}
                  y={height - padding - efeHeight}
                  width={barWidth * 0.7}
                  height={efeHeight}
                  fill={isSelected ? colors.selected : colors.efe}
                  stroke="#333"
                  strokeWidth={1}
                  cornerRadius={3}
                />
                
                {/* EFE Value */}
                <Text
                  x={xPos - barWidth * 0.8}
                  y={height - padding - efeHeight - 20}
                  text={policy.expectedFreeEnergy.toFixed(1)}
                  fontSize={12}
                  fill="#333"
                />
                
                {/* Probability Bar */}
                <Rect
                  x={xPos + barWidth * 0.1}
                  y={height - padding - probHeight}
                  width={barWidth * 0.7}
                  height={probHeight}
                  fill={isSelected ? colors.selected : colors.probability}
                  stroke="#333"
                  strokeWidth={1}
                  cornerRadius={3}
                />
                
                {/* Probability Value */}
                <Text
                  x={xPos + barWidth * 0.1}
                  y={height - padding - probHeight - 20}
                  text={(policy.probability * 100).toFixed(0) + '%'}
                  fontSize={12}
                  fill="#333"
                />
              </Group>
            );
          })}
          
          {/* Legend */}
          <Rect
            x={width - 150}
            y={padding}
            width={120}
            height={70}
            fill="rgba(255, 255, 255, 0.8)"
            stroke="#ddd"
            strokeWidth={1}
            cornerRadius={5}
          />
          
          <Rect
            x={width - 140}
            y={padding + 15}
            width={15}
            height={15}
            fill={colors.efe}
            stroke="#333"
            strokeWidth={1}
          />
          <Text
            x={width - 120}
            y={padding + 15}
            text="EFE"
            fontSize={12}
            fill="#333"
          />
          
          <Rect
            x={width - 140}
            y={padding + 40}
            width={15}
            height={15}
            fill={colors.probability}
            stroke="#333"
            strokeWidth={1}
          />
          <Text
            x={width - 120}
            y={padding + 40}
            text="Probability"
            fontSize={12}
            fill="#333"
          />
          
          {/* Precision Slider */}
          <Text
            x={padding}
            y={height - 35}
            text="Precision:"
            fontSize={14}
            fill="#333"
          />
          
          <Rect
            x={padding + 70}
            y={height - 35}
            width={chartWidth - 70}
            height={10}
            fill="#f0f0f0"
            stroke="#999"
            strokeWidth={1}
            cornerRadius={5}
          />
          
          <Circle
            x={padding + 70 + ((precision - 0.1) / 2.9) * (chartWidth - 70)}
            y={height - 30}
            radius={8}
            fill="#3498db"
            draggable
            dragBoundFunc={(pos) => ({
              x: Math.max(padding + 70, Math.min(padding + chartWidth, pos.x)),
              y: height - 30
            })}
            onDragMove={(e) => handlePrecisionChange(e.target.x())}
          />
          
          <Text
            x={width - 100}
            y={height - 35}
            text={`γ = ${precision.toFixed(1)}`}
            fontSize={14}
            fill="#333"
          />
        </Layer>
      </Stage>
      <div className="mt-3 text-sm text-gray-600">
        {selectedPolicy ? 
          `Selected: ${selectedPolicy.name} - EFE: ${selectedPolicy.expectedFreeEnergy.toFixed(2)}, Probability: ${(selectedPolicy.probability * 100).toFixed(0)}%` : 
          'Click on a policy to select it. Adjust precision to see how it affects selection probabilities.'}
      </div>
    </div>
  );
} 