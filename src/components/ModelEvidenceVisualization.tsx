'use client';

import React, { useState, useMemo } from 'react';

// Helper function for Gaussian Probability Density Function
const gaussianPDF = (x: number, mean: number, stdDev: number): number => {
  if (stdDev <= 0) return 0;
  const variance = stdDev * stdDev;
  const exponent = -((x - mean) ** 2) / (2 * variance);
  const coefficient = 1 / Math.sqrt(2 * Math.PI * variance);
  return coefficient * Math.exp(exponent);
};

interface ModelEvidenceVisualizationProps {
  width?: number;
  height?: number;
}

const ModelEvidenceVisualization: React.FC<ModelEvidenceVisualizationProps> = ({
  width = 600,
  height = 450,
}) => {
  // State for interactive parameters
  const [priorApple, setPriorApple] = useState(0.3);
  const [meanApple, setMeanApple] = useState(0.3);
  const [stdApple, setStdApple] = useState(0.1);
  const [meanOrange, setMeanOrange] = useState(0.7);
  const [stdOrange, setStdOrange] = useState(0.15);
  const [observation, setObservation] = useState(0.5);

  // Calculate likelihoods at the current observation
  const likelihoodApple = useMemo(() => gaussianPDF(observation, meanApple, stdApple), [
    observation,
    meanApple,
    stdApple,
  ]);
  const likelihoodOrange = useMemo(() => gaussianPDF(observation, meanOrange, stdOrange), [
    observation,
    meanOrange,
    stdOrange,
  ]);

  // Calculate Model Evidence: p(o) = sum_s p(o|s)p(s)
  const modelEvidence = useMemo(() => {
      // Recalculate likelihoods needed for this specific calculation
      const currentLikelihoodApple = gaussianPDF(observation, meanApple, stdApple);
      const currentLikelihoodOrange = gaussianPDF(observation, meanOrange, stdOrange);
      // Recalculate priorOrange based on the current priorApple state
      const currentPriorOrange = 1 - priorApple;
      // Calculate p(o) = p(o|s=A)p(s=A) + p(o|s=O)p(s=O)
      const result = currentLikelihoodApple * priorApple + currentLikelihoodOrange * currentPriorOrange;
      return result;
  } , [
      // Depend explicitly on all state variables used in the calculation
      observation, 
      meanApple, 
      stdApple, 
      meanOrange, 
      stdOrange, 
      priorApple 
  ]);

  // --- SVG Visualization Parameters ---
  const padding = { top: 20, right: 30, bottom: 80, left: 40 }; // Increased bottom padding for labels
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const numPoints = 100; // Number of points to plot for curves
  const xMax = 1.0;

  // Find max Y value for scaling curves nicely within the plot area
  const maxYValue = useMemo(() => {
      let max = 0;
      for (let i = 0; i <= numPoints; i++) {
          const x = (i / numPoints) * xMax;
          max = Math.max(max, gaussianPDF(x, meanApple, stdApple), gaussianPDF(x, meanOrange, stdOrange));
      }
      return max > 0 ? max * 1.1 : 1; // Add some headroom, prevent 0
  }, [meanApple, stdApple, meanOrange, stdOrange]);

  // Generate points for the Gaussian curves
  const generateCurvePoints = (mean: number, stdDev: number): string => {
    let points = '';
    for (let i = 0; i <= numPoints; i++) {
      const xVal = (i / numPoints) * xMax;
      const yVal = gaussianPDF(xVal, mean, stdDev);
      
      const svgX = padding.left + (xVal / xMax) * plotWidth;
      const svgY = padding.top + plotHeight - (yVal / maxYValue) * plotHeight; // Invert Y
      points += `${svgX},${svgY} `;
    }
    return points.trim();
  };

  const appleCurvePoints = useMemo(() => generateCurvePoints(meanApple, stdApple), [meanApple, stdApple, plotWidth, plotHeight, maxYValue, padding]);
  const orangeCurvePoints = useMemo(() => generateCurvePoints(meanOrange, stdOrange), [meanOrange, stdOrange, plotWidth, plotHeight, maxYValue, padding]);

  // Calculate SVG position for the observation line
  const observationX = padding.left + (observation / xMax) * plotWidth;
  const observationYApple = padding.top + plotHeight - (likelihoodApple / maxYValue) * plotHeight;
  const observationYOrange = padding.top + plotHeight - (likelihoodOrange / maxYValue) * plotHeight;

  return (
    <div className="flex flex-col items-center text-sm">
      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-4 p-4 border rounded bg-gray-50">
        {/* Priors */}
        <div>
          <label className="block font-medium mb-1">Prior P(s)</label>
          <input
            type="range"
            min="0.01"
            max="0.99"
            step="0.01"
            value={priorApple}
            onChange={(e) => setPriorApple(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs mt-1">
            <span>P(Apple): {priorApple.toFixed(2)}</span>
            <span>P(Orange): {(1 - priorApple).toFixed(2)}</span>
          </div>
        </div>

        {/* Likelihood Apple */}
        <div className="border-l pl-4">
          <label className="block font-medium mb-1 text-blue-600">Likelihood P(o|Apple)</label>
          <label className="block text-xs">Mean: {meanApple.toFixed(2)}</label>
          <input type="range" min="0" max="1" step="0.01" value={meanApple} onChange={(e) => setMeanApple(parseFloat(e.target.value))} className="w-full h-1.5 bg-blue-100 rounded-lg appearance-none cursor-pointer" />
          <label className="block text-xs mt-1">Std Dev: {stdApple.toFixed(2)}</label>
          <input type="range" min="0.01" max="0.5" step="0.01" value={stdApple} onChange={(e) => setStdApple(parseFloat(e.target.value))} className="w-full h-1.5 bg-blue-100 rounded-lg appearance-none cursor-pointer" />
        </div>

        {/* Likelihood Orange */}
        <div className="border-l pl-4">
          <label className="block font-medium mb-1 text-orange-600">Likelihood P(o|Orange)</label>
          <label className="block text-xs">Mean: {meanOrange.toFixed(2)}</label>
          <input type="range" min="0" max="1" step="0.01" value={meanOrange} onChange={(e) => setMeanOrange(parseFloat(e.target.value))} className="w-full h-1.5 bg-orange-100 rounded-lg appearance-none cursor-pointer" />
          <label className="block text-xs mt-1">Std Dev: {stdOrange.toFixed(2)}</label>
          <input type="range" min="0.01" max="0.5" step="0.01" value={stdOrange} onChange={(e) => setStdOrange(parseFloat(e.target.value))} className="w-full h-1.5 bg-orange-100 rounded-lg appearance-none cursor-pointer" />
        </div>

        {/* Observation */}
         <div className="col-span-1 md:col-span-3">
          <label className="block font-medium mb-1">Observation 'o' (e.g., Size): {observation.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={observation}
            onChange={(e) => setObservation(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* SVG Visualization */}
      <svg width={width} height={height} className="border rounded">
        {/* Plot Area */}
        <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} fill="#f9fafb" />

        {/* X Axis */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={padding.left + plotWidth} y2={padding.top + plotHeight} stroke="black" />
        <text x={padding.left + plotWidth / 2} y={height - padding.bottom / 2} textAnchor="middle" fontSize="12">Observation 'o' (Size)</text>
        <text x={padding.left} y={height - padding.bottom / 2 + 12} textAnchor="start" fontSize="10">0</text>
        <text x={padding.left + plotWidth} y={height - padding.bottom / 2 + 12} textAnchor="end" fontSize="10">1</text>

        {/* Y Axis (Conceptual Likelihood Density) */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="black" />
        <text x={padding.left - 15} y={padding.top + plotHeight / 2} writingMode="vertical-rl" transform={`rotate(180 ${padding.left - 15} ${padding.top + plotHeight / 2})`} textAnchor="middle" fontSize="12">Likelihood Density p(o|s)</text>

        {/* Likelihood Curves */}
        <polyline points={appleCurvePoints} fill="none" stroke="blue" strokeWidth="2" opacity="0.7" />
        <polyline points={orangeCurvePoints} fill="none" stroke="orange" strokeWidth="2" opacity="0.7" />

        {/* Observation Line */}
        <line 
            x1={observationX} y1={padding.top} 
            x2={observationX} y2={padding.top + plotHeight} 
            stroke="red" strokeWidth="1.5" strokeDasharray="4" 
        />
        {/* Points on curves at observation */}
        <circle cx={observationX} cy={observationYApple} r="4" fill="blue" />
        <circle cx={observationX} cy={observationYOrange} r="4" fill="orange" />

         {/* Legend/Labels below axis */}
         <text x={padding.left + 10} y={height - padding.bottom/2 + 30} fontSize="11">
             <tspan fill="blue">P(o|Apple)</tspan> at o={observation.toFixed(2)}: <tspan fontWeight="bold">{likelihoodApple.toFixed(3)}</tspan>
         </text>
         <text x={padding.left + plotWidth/2} y={height - padding.bottom/2 + 30} fontSize="11">
             <tspan fill="orange">P(o|Orange)</tspan> at o={observation.toFixed(2)}: <tspan fontWeight="bold">{likelihoodOrange.toFixed(3)}</tspan>
         </text>

        {/* Display Model Evidence */}
        <rect x={padding.left} y={padding.top + plotHeight + 5} width={plotWidth} height={25} fill="#e5e7eb" />
         <text 
             x={padding.left + plotWidth / 2} 
             y={padding.top + plotHeight + 21} /* Adjusted Y for visibility within the rect */
             textAnchor="middle" 
             fontSize="14" 
             fontWeight="bold"
         >
             {/* {modelEvidence} Simplified for debugging */} {/* Removing the simplified version */}
             Model Evidence = {modelEvidence.toFixed(3)}
         </text>
      </svg>
    </div>
  );
};

export default ModelEvidenceVisualization; 