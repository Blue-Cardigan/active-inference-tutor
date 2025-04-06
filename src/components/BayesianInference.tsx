'use client';

import { useState, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Text } from 'react-konva';

interface BayesianInferenceProps {
  width: number;
  height: number;
  onUpdate?: (posterior: number) => void;
}

export default function BayesianInference({
  width,
  height,
  onUpdate,
}: BayesianInferenceProps) {
  const [prior, setPrior] = useState(0.5);
  const [likelihood, setLikelihood] = useState(0.5);
  const [posterior, setPosterior] = useState(0.5);
  const [evidence, setEvidence] = useState(1);

  useEffect(() => {
    // Calculate posterior using Bayes' theorem
    const newPosterior = (prior * likelihood) / evidence;
    setPosterior(newPosterior);
    if (onUpdate) {
      onUpdate(newPosterior);
    }
  }, [prior, likelihood, evidence, onUpdate]);

  // Generate points for probability distributions
  const generatePoints = (value: number) => {
    const points = [];
    for (let i = 0; i <= 1; i += 0.1) {
      const y = Math.exp(-Math.pow(i - value, 2) / 0.1);
      points.push({ x: i, y });
    }
    return points;
  };

  const priorPoints = generatePoints(prior);
  const likelihoodPoints = generatePoints(likelihood);
  const posteriorPoints = generatePoints(posterior);

  return (
    <Stage width={width} height={height}>
      <Layer>
        {/* Draw probability distributions */}
        <Line
          points={priorPoints.flatMap(p => [p.x * width, p.y * height])}
          stroke="blue"
          strokeWidth={2}
          tension={0.4}
        />
        <Line
          points={likelihoodPoints.flatMap(p => [p.x * width, p.y * height])}
          stroke="green"
          strokeWidth={2}
          tension={0.4}
        />
        <Line
          points={posteriorPoints.flatMap(p => [p.x * width, p.y * height])}
          stroke="red"
          strokeWidth={2}
          tension={0.4}
        />

        {/* Draw draggable points */}
        <Circle
          x={prior * width}
          y={height / 2}
          radius={8}
          fill="blue"
          draggable
          onDragMove={(e) => {
            const newPrior = Math.max(0, Math.min(1, e.target.x() / width));
            setPrior(newPrior);
          }}
        />
        <Circle
          x={likelihood * width}
          y={height / 2}
          radius={8}
          fill="green"
          draggable
          onDragMove={(e) => {
            const newLikelihood = Math.max(0, Math.min(1, e.target.x() / width));
            setLikelihood(newLikelihood);
          }}
        />

        {/* Display values */}
        <Text
          x={10}
          y={10}
          text={`Prior: ${prior.toFixed(3)}`}
          fontSize={16}
          fill="blue"
        />
        <Text
          x={10}
          y={30}
          text={`Likelihood: ${likelihood.toFixed(3)}`}
          fontSize={16}
          fill="green"
        />
        <Text
          x={10}
          y={50}
          text={`Posterior: ${posterior.toFixed(3)}`}
          fontSize={16}
          fill="red"
        />
      </Layer>
    </Stage>
  );
} 