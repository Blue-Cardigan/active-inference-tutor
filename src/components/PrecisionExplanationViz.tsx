'use client';

import React, { useState, useEffect } from 'react';
import InlineMath from '@matejmazur/react-katex';

export default function PrecisionExplanationViz() {
  // State for precision slider
  const [precision, setPrecision] = useState(1.0);
  
  // Two scenarios - extreme case and balanced case
  const extremeCase = {
    title: "Current Example (Extreme Values)",
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
  
  // Calculate policy probabilities for both cases
  const calculateProbabilities = (efe1: number, efe2: number, precision: number) => {
    if (!isFinite(efe1) || !isFinite(efe2)) {
      return [isFinite(efe1) ? 1 : 0, isFinite(efe2) ? 1 : 0];
    }
    
    const w1 = Math.exp(-precision * efe1);
    const w2 = Math.exp(-precision * efe2);
    const sum = w1 + w2;
    
    return [w1 / sum, w2 / sum];
  };
  
  // Compute probabilities
  const extremeProbs = calculateProbabilities(
    extremeCase.efe1, 
    extremeCase.efe2, 
    precision
  );
  
  const balancedProbs = calculateProbabilities(
    balancedCase.efe1, 
    balancedCase.efe2, 
    precision
  );
  
  return (
    <div className="my-6 p-4 border border-gray-300 rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4 text-center">Understanding Precision (γ)</h3>
      
      <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
        <p className="text-sm">
          Precision (γ) controls how strongly the agent prefers policies with lower Expected Free Energy.
          Higher precision makes the agent more "decisive" or "confident" in choosing the optimal policy.
        </p>
        <div className="mt-2 text-xs flex items-center">
          <span className="font-medium mr-2">Formula:</span>
          <InlineMath math="q(\pi) = \frac{e^{-\gamma G(\pi)}}{\sum_{\pi'} e^{-\gamma G(\pi')}}" />
        </div>
      </div>
      
      <div className="mt-4 mb-4">
        <label className="block text-sm font-medium mb-1">
          Precision (γ): {precision.toFixed(1)}
        </label>
        <input
          type="range"
          min="0.1"
          max="5.2"
          step="0.1"
          value={precision}
          onChange={(e) => setPrecision(parseFloat(e.target.value))}
          className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Extreme case */}
        <div className="p-4 border rounded-lg bg-gray-50">
          <h4 className="text-sm font-semibold mb-2">{extremeCase.title}</h4>
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
        <div className="p-4 border rounded-lg bg-gray-50">
          <h4 className="text-sm font-semibold mb-2">{balancedCase.title}</h4>
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
      
      <div className="mt-5 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
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