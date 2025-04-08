'use client';

import React, { useState, useEffect } from 'react';
import InlineMath from '@matejmazur/react-katex';

export default function PrecisionExplanationViz({ currentPrecision }: { currentPrecision?: number }) {
  // Use passed-in precision for initial state, default to 1.0
  const [localPrecision, setLocalPrecision] = useState(currentPrecision ?? 1.0);
  
  // Keep effect to sync if prop changes externally (though likely won't in this dropdown)
  useEffect(() => {
    if (currentPrecision !== undefined) {
      setLocalPrecision(currentPrecision);
    }
  }, [currentPrecision]);

  // Two scenarios - extreme case and balanced case
  const extremeCase = {
    title: "Current Example (Actual Values)", // Changed title
    efe1: 0,
    efe2: Infinity,
    description: "In this extreme case, precision doesn't affect the outcome because one policy has infinitely bad EFE."
  };
  
  const balancedCase = {
    title: "Hypothetical Example (Closer Values)",
    efe1: 1.5,
    efe2: 3.0,
    description: "In this more realistic case, precision significantly affects how strongly the agent prefers the better policy."
  };
  
  // Calculate policy probabilities for both cases using the LOCAL precision state
  const calculateProbabilities = (efe1: number, efe2: number, precision: number) => {
     // Handle infinite EFE gracefully for softmax
      if (!isFinite(efe1) || !isFinite(efe2)) {
        const finiteEfe1 = isFinite(efe1);
        const finiteEfe2 = isFinite(efe2);
        if (finiteEfe1 && !finiteEfe2) return [1, 0];
        if (!finiteEfe1 && finiteEfe2) return [0, 1];
        // If both infinite or zero, assign equal probability (or handle as needed)
        return [0.5, 0.5]; 
      }

    const w1 = Math.exp(-precision * efe1);
    const w2 = Math.exp(-precision * efe2);
    const sum = w1 + w2;
    
     // Avoid division by zero if both weights are extremely small
      if (sum === 0 || !isFinite(sum)) {
        // If sum is zero or infinite, likely due to large negative exponents or overflow.
        // Fallback to comparing EFEs directly or equal probability.
        if (efe1 < efe2) return [1, 0];
        if (efe2 < efe1) return [0, 1];
        return [0.5, 0.5];
      }

    return [w1 / sum, w2 / sum];
  };
  
  // Compute probabilities using localPrecision state
  const extremeProbs = calculateProbabilities(
    extremeCase.efe1, 
    extremeCase.efe2, 
    localPrecision // Use local state
  );
  
  const balancedProbs = calculateProbabilities(
    balancedCase.efe1, 
    balancedCase.efe2, 
    localPrecision // Use local state
  );
  
  // Define the range for the slider within this component
  const minSliderPrecision = 0.1;
  const maxSliderPrecision = 5.0; // Keep a reasonable range for the explanation slider

  return (
    // Reduced top margin as it's inside another component now
    <div className="my-2 p-4 border border-gray-300 rounded-lg bg-white"> 
      <h3 className="text-base font-semibold mb-3 text-center">Understanding Precision (γ)</h3> 
      
      <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-100">
         <p className="mb-4">
           Precision (<InlineMath math="\gamma"/>) scales the influence of Expected Free Energy (<InlineMath math="G(\pi)"/>) when determining policy probabilities (<InlineMath math="q(\pi) = \sigma(-\gamma G(\pi))"/>). In the simple example above, because <InlineMath math="G(\pi_2) = \infty"/>, the choice is unambiguous regardless of <InlineMath math="\gamma"/>. However, precision is crucial when policies have closer EFE values.
         </p>
         <p className="text-sm my-4">
           Higher precision makes the agent more deterministic, strongly favoring the policy with the lowest EFE. Lower precision leads to more stochastic behavior, where the agent might explore policies with slightly higher EFE. This parameter is often linked to neuromodulators like dopamine, potentially encoding confidence or expected uncertainty.
         </p>
        <p className="text-sm">
          Precision (γ) controls the sensitivity to differences in Expected Free Energy (EFE). It acts like an inverse temperature in the softmax calculation for policy probabilities: <InlineMath math="q(\pi) \propto e^{-\gamma G(\pi)}"/>.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Extreme case */}
        <div className="p-3 border rounded-lg bg-gray-50">
          <h4 className="text-xs font-semibold mb-1">{extremeCase.title}</h4>
          <div className="mb-3 flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span>Policy 1 EFE:</span>
              <span className="font-mono">{extremeCase.efe1}</span>
            </div>
            <div className="flex justify-between">
              <span>Policy 2 EFE:</span>
              <span className="font-mono">{extremeCase.efe2 === Infinity ? "∞" : extremeCase.efe2}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h5 className="text-xs font-medium mb-2">Policy Probabilities:</h5>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Policy 1:</span>
                  <span className="font-medium">{(extremeProbs[0] * 100).toFixed(1)}%</span>
                </div>
                <div className="h-6 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 flex items-center justify-center text-white text-xs"
                    style={{ width: `${extremeProbs[0] * 100}%` }}
                  >
                    {extremeProbs[0] > 0.1 ? `${(extremeProbs[0] * 100).toFixed(1)}%` : ''}
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Policy 2:</span>
                  <span className="font-medium">{(extremeProbs[1] * 100).toFixed(1)}%</span>
                </div>
                <div className="h-6 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 flex items-center justify-center text-white text-xs"
                    style={{ width: `${extremeProbs[1] * 100}%` }}
                  >
                    {extremeProbs[1] > 0.1 ? `${(extremeProbs[1] * 100).toFixed(1)}%` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <p className="mt-4 text-xs text-gray-600">{extremeCase.description}</p>
        </div>
        
        {/* Balanced case */}
        <div className="p-3 border rounded-lg bg-gray-50">
          <h4 className="text-xs font-semibold mb-1">{balancedCase.title}</h4>
          <div className="mb-3 flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span>Policy 1 EFE:</span>
              <span className="font-mono">{balancedCase.efe1}</span>
            </div>
            <div className="flex justify-between">
              <span>Policy 2 EFE:</span>
              <span className="font-mono">{balancedCase.efe2}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h5 className="text-xs font-medium mb-2">Policy Probabilities:</h5>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Policy 1:</span>
                  <span className="font-medium">{(balancedProbs[0] * 100).toFixed(1)}%</span>
                </div>
                <div className="h-6 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 flex items-center justify-center text-white text-xs"
                    style={{ width: `${balancedProbs[0] * 100}%` }}
                  >
                    {balancedProbs[0] > 0.1 ? `${(balancedProbs[0] * 100).toFixed(1)}%` : ''}
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Policy 2:</span>
                  <span className="font-medium">{(balancedProbs[1] * 100).toFixed(1)}%</span>
                </div>
                <div className="h-6 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 flex items-center justify-center text-white text-xs"
                    style={{ width: `${balancedProbs[1] * 100}%` }}
                  >
                    {balancedProbs[1] > 0.1 ? `${(balancedProbs[1] * 100).toFixed(1)}%` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <p className="mt-4 text-xs text-gray-600">{balancedCase.description}</p>
        </div>
      </div>
      
      <div className="mt-3 p-2 bg-green-50 border border-green-100 rounded-lg text-xs">
        <h4 className="font-medium mb-1">Key Takeaways:</h4>
        <ul className="list-disc pl-5 text-xs space-y-1">
          <li>Higher precision (γ) makes the agent more "decisive" in following the best policy</li>
          <li>Lower precision allows more balanced consideration of alternative policies</li>
          <li>In extreme cases (like our current example), precision has little effect on the final decision</li>
          <li>In more realistic scenarios with closer EFE values, precision significantly affects policy selection</li>
          <li>This parameter is often linked to confidence in neuroscience models of decision-making</li>
        </ul>
      </div>
    </div>
  );
} 