'use client';

import { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Line, Circle, Group } from 'react-konva';

interface BayesUpdateVisualizationProps {
  priorBelief?: number;
  likelihood?: number;
  posteriorHistory?: number[];
  evidenceCount?: number;
  width?: number;
  height?: number;
  onUpdate?: (posterior: number) => void;
}

export default function BayesUpdateVisualization({
  priorBelief = 0.3,
  likelihood = 0.7,
  posteriorHistory = [0.3],
  evidenceCount = 0,
  width = 500,
  height = 400,
  onUpdate,
}: BayesUpdateVisualizationProps) {
  const [localPrior, setLocalPrior] = useState(priorBelief);
  const [localLikelihood, setLocalLikelihood] = useState(likelihood);
  const [localPosteriorHistory, setLocalPosteriorHistory] = useState(posteriorHistory);
  const [localEvidenceCount, setLocalEvidenceCount] = useState(evidenceCount);
  const [currentPosterior, setCurrentPosterior] = useState(() => {
    // Calculate initial posterior based on initial props
    const numerator = priorBelief * likelihood;
    const denominator = (priorBelief * likelihood) + ((1 - priorBelief) * (1 - likelihood));
    return numerator / denominator;
  });

  // Padding and layout settings
  const padding = 50;
  const chartWidth = width * 0.7 - padding * 2; // Chart takes 70% of total width
  const chartHeight = height - 2 * padding; // No extra space subtracted
  const legendX = padding + chartWidth + 20; // Legend starts 20px to the right of chart

  // Update posterior history if props change
  useEffect(() => {
    setLocalPosteriorHistory(posteriorHistory);
    setLocalEvidenceCount(evidenceCount);
    setLocalPrior(priorBelief);
    setLocalLikelihood(likelihood);
  }, [posteriorHistory, evidenceCount, priorBelief, likelihood]);

  // Calculate current posterior whenever prior or likelihood changes
  useEffect(() => {
    // Bayes rule: posterior = (prior * likelihood) / ((prior * likelihood) + (1 - prior) * (1 - likelihood))
    const numerator = localPrior * localLikelihood;
    const denominator = (localPrior * localLikelihood) + ((1 - localPrior) * (1 - localLikelihood));
    setCurrentPosterior(numerator / denominator);
  }, [localPrior, localLikelihood]);

  // Perform a Bayesian update - add the current posterior to history and make it the new prior
  const updatePosterior = () => {
    // Update state
    const newHistory = [...localPosteriorHistory, currentPosterior];
    setLocalPosteriorHistory(newHistory);
    setLocalPrior(currentPosterior); // Use posterior as new prior
    setLocalEvidenceCount(localEvidenceCount + 1);

    if (onUpdate) {
      onUpdate(currentPosterior);
    }
  };

  // Handle slider changes for likelihood
  const handleLikelihoodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalLikelihood(parseFloat(e.target.value));
  };

  // Format points for the history line
  const historyPoints = localPosteriorHistory.map((posterior, index) => {
    return {
      x: padding + (index / Math.max(10, localPosteriorHistory.length - 1)) * chartWidth,
      y: height - padding - posterior * chartHeight,
    };
  });

  // Calculate the next point position
  const nextPointX = padding + (localPosteriorHistory.length / Math.max(10, localPosteriorHistory.length)) * chartWidth;
  const nextPointY = height - padding - currentPosterior * chartHeight;

  return (
    <div className="flex flex-col items-center">
      <Stage width={width} height={height}>
        <Layer>
          {/* Title */}
          <Text
            x={width / 2 - 75}
            y={15}
            text="Bayesian Belief Update"
            fontSize={16}
            fontStyle="bold"
            fill="#333"
          />

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

          {/* X-axis */}
          <Line
            points={[padding, height - padding, padding + chartWidth, height - padding]}
            stroke="#666"
            strokeWidth={2}
          />
          <Text
            x={padding + chartWidth / 2 - 45}
            y={height - 25}
            text="Evidence Count"
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
            x={0}
            y={height / 2 + 40}
            text="Probability"
            fontSize={14}
            fill="#333"
            rotation={270}
          />

          {/* Y-axis ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <Group key={tick}>
              <Line
                points={[
                  padding - 5,
                  height - padding - tick * chartHeight,
                  padding,
                  height - padding - tick * chartHeight,
                ]}
                stroke="#666"
                strokeWidth={1}
              />
              <Text
                x={padding - 35}
                y={height - padding - tick * chartHeight - 7}
                text={tick.toString()}
                fontSize={12}
                fill="#333"
              />
            </Group>
          ))}

          {/* Posterior history line */}
          {localPosteriorHistory.length > 1 && (
            <Line
              points={historyPoints.flatMap((p) => [p.x, p.y])}
              stroke="#3498db"
              strokeWidth={2}
              tension={0.1}
            />
          )}

          {/* Posterior history points */}
          {historyPoints.map((point, i) => (
            <Circle
              key={i}
              x={point.x}
              y={point.y}
              radius={4}
              fill="#3498db"
              stroke="#2980b9"
              strokeWidth={1}
            />
          ))}

          {/* Add a visual indicator for the next posterior */}
          {/* Only show if we have at least one point in history */}
          {localPosteriorHistory.length > 0 && (
            <>
              <Line
                points={[
                  historyPoints[historyPoints.length - 1].x,
                  historyPoints[historyPoints.length - 1].y,
                  nextPointX,
                  nextPointY
                ]}
                stroke="#e74c3c"
                strokeWidth={1}
                dash={[2, 2]}
              />
              <Circle
                x={nextPointX}
                y={nextPointY}
                radius={4}
                fill="#e74c3c"
                stroke="#c0392b"
                strokeWidth={1}
              />
            </>
          )}

          {/* Legend/Info Panel */}
          <Rect
            x={legendX}
            y={padding}
            width={width - legendX}
            height={chartHeight}
            fill="rgba(255, 255, 255, 0.8)"
            stroke="#ddd"
            strokeWidth={1}
            cornerRadius={5}
          />

          {/* Legend title */}
          <Text
            x={legendX + 10}
            y={padding + 10}
            text="Current Values"
            fontSize={14}
            fontStyle="bold"
            fill="#333"
          />

          {/* Value displays */}
          <Text
            x={legendX + 10}
            y={padding + 40}
            text={`Prior: ${localPrior.toFixed(3)}`}
            fontSize={14}
            fill="#333"
          />
          
          <Text
            x={legendX + 10}
            y={padding + 65}
            text={`Likelihood: ${localLikelihood.toFixed(3)}`}
            fontSize={14}
            fill="#333"
          />
          
          <Text
            x={legendX + 10}
            y={padding + 90}
            text={`Current posterior: ${currentPosterior.toFixed(3)}`}
            fontSize={14}
            fill="#2980b9"
          />
          
          <Text
            x={legendX + 10}
            y={padding + 115}
            text={`Evidence count: ${localEvidenceCount}`}
            fontSize={14}
            fill="#333"
          />

          {/* Blue dot for history */}
          <Circle
            x={legendX + 20}
            y={padding + 175}
            radius={4}
            fill="#3498db"
            stroke="#2980b9"
            strokeWidth={1}
          />
          <Text
            x={legendX + 35}
            y={padding + 170}
            text="Past posteriors"
            fontSize={12}
            fill="#333"
          />
          
          {/* Red dot for predicted */}
          <Circle
            x={legendX + 20}
            y={padding + 195}
            radius={4}
            fill="#e74c3c"
            stroke="#c0392b"
            strokeWidth={1}
          />
          <Text
            x={legendX + 35}
            y={padding + 190}
            text="Predicted next update"
            fontSize={12}
            fill="#333"
          />
        </Layer>
      </Stage>
      
      {/* Slider for likelihood adjustment */}
      <div className="mt-4 w-full max-w-md">
        <label className="block text-base font-medium mb-1">Likelihood (P(o|s)): {localLikelihood.toFixed(2)}</label>
        <input
          type="range"
          min="0.01"
          max="0.99"
          step="0.01"
          value={localLikelihood}
          onChange={handleLikelihoodChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between mt-3">
          <button
            onClick={updatePosterior}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          >
            Add New Evidence ({localEvidenceCount})
          </button>
          <button
            onClick={() => {
              setLocalPrior(0.3); // Reset to initial prior
              setLocalPosteriorHistory([0.3]);
              setLocalEvidenceCount(0);
            }}
            className="ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
} 