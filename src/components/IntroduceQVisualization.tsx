'use client';

import React from 'react';
import InlineMath from '@matejmazur/react-katex';

// Example data for visualization
const numTrueStates = 50;
const trueStates = Array.from({ length: numTrueStates }, (_, i) => ({
  id: i,
  // Random-like heights for p(o,s)
  height: 10 + Math.random() * 80,
}));

const numApproxStates = 5;
const approxStates = Array.from({ length: numApproxStates }, (_, i) => ({
  id: i,
  // Smoother heights for q(s)
  height: 30 + Math.sin(i / (numApproxStates -1) * Math.PI) * 50 + (Math.random() - 0.5) * 10,
}));

const maxApproxHeight = Math.max(...approxStates.map(s => s.height), 1); // Avoid division by zero

export default function IntroduceQVisualization() {
  const barWidth = 3;
  const approxBarWidth = 20;
  const spacing = 1;
  const approxSpacing = 5;
  const chartHeight = 150;

  return (
    <div className="flex flex-col md:flex-row gap-8 justify-center items-center my-6 p-4 border rounded bg-gray-50">
      {/* Left Side: Intractable Sum */}
      <div className="text-center">
        <h4 className="text-lg font-semibold mb-2">True Calculation (Often Intractable)</h4>
        <p className="text-sm mb-3">
          Need to sum <InlineMath math="p(o,s)" /> over ALL possible hidden states <InlineMath math="s" />:
        </p>
        <div className="text-center mb-2 font-mono text-indigo-700">
           <InlineMath math="p(o) = \sum_s p(o,s)" />
        </div>
        <div
          className="flex items-end justify-center border-b border-gray-400 overflow-hidden mx-auto"
          style={{ height: `${chartHeight}px`, width: `${Math.min(300, (barWidth + spacing) * numTrueStates)}px` }} // Limit width
        >
          {trueStates.map((state) => (
            <div
              key={state.id}
              className="bg-red-400 flex-shrink-0" // Add flex-shrink-0
              title={`State s=${state.id}, p(o,s) contribution`}
              style={{
                width: `${barWidth}px`,
                height: `${(state.height / 100) * chartHeight}px`,
                marginRight: `${spacing}px`,
              }}
            />
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-1">Potentially vast number of states <InlineMath math="s" />, complex sum</p>
      </div>

      {/* Arrow or transition indicator */}
       <div className="text-3xl font-bold text-gray-500 transform md:rotate-0 rotate-90">&rarr;</div>

      {/* Right Side: Tractable Approximation */}
      <div className="text-center">
        <h4 className="text-lg font-semibold mb-2">Variational Approach (Tractable)</h4>
        <p className="text-sm mb-3">
           Introduce a simpler *belief* distribution <InlineMath math="q(s)" />:
        </p>
         <div className="text-center mb-2 font-mono text-teal-700">
           <InlineMath math="q(s)" /> (e.g., Gaussian, simple discrete)
         </div>
        <div
          className="flex items-end justify-center border-b border-gray-400 mx-auto"
          style={{ height: `${chartHeight}px`, width: `${(approxBarWidth + approxSpacing) * numApproxStates}px` }}
        >
          {approxStates.map((state) => (
            <div
              key={state.id}
              className="bg-blue-400"
              title={`Approximate belief q(s=${state.id})`}
              style={{
                width: `${approxBarWidth}px`,
                 // Normalize height within this chart for visual clarity
                height: `${(state.height / maxApproxHeight) * chartHeight * 0.9}px`, // scale height
                marginRight: `${approxSpacing}px`,
              }}
            />
          ))}
        </div>
         <p className="text-xs text-gray-600 mt-1">Simpler form, fewer parameters, easier to compute</p>
      </div>
    </div>
  );
} 