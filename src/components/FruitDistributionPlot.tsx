'use client';

import { useState, useEffect } from 'react';
import { Stage, Layer, Circle, Rect, Text, Line } from 'react-konva';

interface FruitDistributionPlotProps {
  width?: number;
  height?: number;
  interactive?: boolean;
}

interface Fruit {
  x: number;  // sweetness (0-1)
  y: number;  // size (0-1)
  type: 'apple' | 'orange';
}

export default function FruitDistributionPlot({
  width = 500,
  height = 400,
  interactive = true,
}: FruitDistributionPlotProps) {
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [hoveredFruit, setHoveredFruit] = useState<Fruit | null>(null);
  const [highlightedType, setHighlightedType] = useState<'apple' | 'orange' | null>(null);
  const [message, setMessage] = useState('');

  // Generate random fruit data with normal distributions
  useEffect(() => {
    const generateNormalRandom = (mean: number, stdDev: number): number => {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return mean + z0 * stdDev;
    };

    const clamp = (value: number): number => Math.max(0, Math.min(1, value));

    const newFruits: Fruit[] = [];
    
    // Generate apples (more sweet, smaller)
    for (let i = 0; i < 30; i++) {
      newFruits.push({
        x: clamp(generateNormalRandom(0.7, 0.15)),  // sweetness
        y: clamp(generateNormalRandom(0.4, 0.15)),  // size
        type: 'apple',
      });
    }
    
    // Generate oranges (less sweet, larger)
    for (let i = 0; i < 30; i++) {
      newFruits.push({
        x: clamp(generateNormalRandom(0.4, 0.15)),  // sweetness
        y: clamp(generateNormalRandom(0.7, 0.15)),  // size
        type: 'orange',
      });
    }
    
    setFruits(newFruits);
  }, []);

  const handleFruitHover = (fruit: Fruit) => {
    if (!interactive) return;
    setHoveredFruit(fruit);
    setMessage(`${fruit.type.charAt(0).toUpperCase() + fruit.type.slice(1)}: Sweetness: ${fruit.x.toFixed(2)}, Size: ${fruit.y.toFixed(2)}`);
  };

  const handleFruitLeave = () => {
    if (!interactive) return;
    setHoveredFruit(null);
    setMessage('');
  };

  const handleLegendClick = (type: 'apple' | 'orange') => {
    if (!interactive) return;
    setHighlightedType(highlightedType === type ? null : type);
    if (type === 'apple') {
      setMessage('Apples tend to be sweeter and smaller');
    } else {
      setMessage('Oranges tend to be less sweet and larger');
    }
  };

  // Padding for the plot area
  const padding = 50;
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;

  return (
    <div className="flex flex-col items-center">
      <Stage width={width} height={height}>
        <Layer>
          {/* Plot background and axes */}
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
            x={width / 2 - 30}
            y={height - 30}
            text="Sweetness"
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
            x={15}
            y={height / 2 - 20}
            text="Size"
            fontSize={14}
            fill="#333"
            rotation={270}
          />
          
          {/* Plot the fruits */}
          {fruits.map((fruit, i) => {
            const shouldHighlight = highlightedType === null || fruit.type === highlightedType;
            return (
              <Circle
                key={i}
                x={padding + fruit.x * plotWidth}
                y={height - padding - fruit.y * plotHeight}
                radius={hoveredFruit === fruit ? 8 : 6}
                fill={fruit.type === 'apple' ? 
                  (shouldHighlight ? '#ff6b6b' : 'rgba(255, 107, 107, 0.3)') : 
                  (shouldHighlight ? '#fd7e14' : 'rgba(253, 126, 20, 0.3)')}
                stroke={fruit.type === 'apple' ? '#e03131' : '#e8590c'}
                strokeWidth={hoveredFruit === fruit ? 2 : 1}
                opacity={shouldHighlight ? 1 : 0.3}
                onMouseEnter={() => handleFruitHover(fruit)}
                onMouseLeave={handleFruitLeave}
              />
            );
          })}
          
          {/* Legend */}
          <Rect
            x={width - 120}
            y={padding}
            width={100}
            height={70}
            fill="rgba(255, 255, 255, 0.8)"
            stroke="#ddd"
            strokeWidth={1}
            cornerRadius={5}
          />
          
          {/* Apple legend item */}
          <Circle
            x={width - 100}
            y={padding + 20}
            radius={6}
            fill={highlightedType === 'apple' || highlightedType === null ? '#ff6b6b' : 'rgba(255, 107, 107, 0.3)'}
            stroke="#e03131"
            strokeWidth={1}
            onClick={() => handleLegendClick('apple')}
          />
          <Text
            x={width - 85}
            y={padding + 15}
            text="Apple"
            fontSize={14}
            fill="#333"
            onClick={() => handleLegendClick('apple')}
          />
          
          {/* Orange legend item */}
          <Circle
            x={width - 100}
            y={padding + 45}
            radius={6}
            fill={highlightedType === 'orange' || highlightedType === null ? '#fd7e14' : 'rgba(253, 126, 20, 0.3)'}
            stroke="#e8590c"
            strokeWidth={1}
            onClick={() => handleLegendClick('orange')}
          />
          <Text
            x={width - 85}
            y={padding + 40}
            text="Orange"
            fontSize={14}
            fill="#333"
            onClick={() => handleLegendClick('orange')}
          />
        </Layer>
      </Stage>
      {interactive && (
        <div className="mt-3 text-center text-sm text-gray-600 h-12">
          {message || 'Hover over fruits to see details or click legend items to filter'}
        </div>
      )}
    </div>
  );
} 