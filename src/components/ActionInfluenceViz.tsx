'use client';

import React, { useState, useEffect } from 'react';
import InlineMath from '@matejmazur/react-katex';
import { ArrowRight } from 'lucide-react';

// --- Component Definition ---
export default function ActionInfluenceViz() {
  // --- State Space & Parameters ---
  const states = ['Indoors', 'Outdoors'];
  const actions = ['Stay', 'Move'];
  const numStates = states.length;
  
  // Transition Matrices P(s_t | s_{t-1}, u_{t-1})
  // B(u) - Rows: s_t, Columns: s_{t-1}
  const B_Stay = [
    [0.9, 0.1], // To Indoors (from Indoors, Outdoors) if action = Stay
    [0.1, 0.9]  // To Outdoors (from Indoors, Outdoors) if action = Stay
  ];
  const B_Move = [
    [0.2, 0.8], // To Indoors (from Indoors, Outdoors) if action = Move
    [0.8, 0.2]  // To Outdoors (from Indoors, Outdoors) if action = Move
  ];
  
  // --- Component State ---
  const [selectedAction, setSelectedAction] = useState(0); // 0: Stay, 1: Move
  const [currentStateIndex, setCurrentStateIndex] = useState(0); // 0: Indoors, 1: Outdoors
  const [nextStateProb, setNextStateProb] = useState<number[]>([]);

  // --- Initialization and Updates ---
  useEffect(() => {
    const currentStateVector = Array(numStates).fill(0);
    currentStateVector[currentStateIndex] = 1;
    
    const B = selectedAction === 0 ? B_Stay : B_Move;
    const nextProb = multiplyMatrixVector(B, currentStateVector);
    setNextStateProb(nextProb);

  }, [currentStateIndex, selectedAction]);

  // --- Helper Functions ---
  // Matrix-vector multiplication
  const multiplyMatrixVector = (matrix: number[][], vector: number[]) => {
    const numRows = matrix.length;
    const numCols = matrix[0]?.length || 0;
    if (numCols !== vector.length) return [];
    const result = Array(numRows).fill(0);
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        result[i] += matrix[i][j] * vector[j];
      }
    }
    return result;
  };
  
  // Display Matrix Helper
  const displayMatrix = (matrix: number[][], title: React.ReactNode) => (
    <div className="p-2 bg-gray-100 rounded">
      <div className="text-xs font-medium mb-1 text-center">{title}</div>
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="border p-1 bg-gray-200"></th>
            {states.map((s, i) => <th key={i} className="border p-1 bg-gray-200">From {s}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="border p-1 bg-gray-200 font-medium">To {states[i]}</td>
              {row.map((val, j) => <td key={j} className="border p-1 text-center">{val.toFixed(2)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  // Display Probability Distribution Helper
  const displayDistribution = (probs: number[], labels: string[], title: string) => (
    <div className="p-2 bg-blue-50 rounded border border-blue-200 min-w-[150px]">
      <p className="text-xs font-medium mb-2 text-center">{title}</p>
      <div className="space-y-1">
        {labels.map((label, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs mr-2">{label}:</span>
            <div className="flex-grow h-4 bg-gray-200 rounded overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-in-out"
                style={{ width: `${(probs[i] * 100).toFixed(1)}%` }}
              ></div>
            </div>
            <span className="text-xs ml-2 w-10 text-right">{(probs[i] * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
  
  // Display Vector Helper
  const displayVector = (vector: number[]) => (
    <div className="inline-flex items-center mx-1">
      <div className="text-xl">(</div>
      <div>
        {vector.map((val, i) => (
          <div key={i} className="flex justify-center">{val.toFixed(1)}</div>
        ))}
      </div>
      <div className="text-xl">)</div>
    </div>
  );

  // --- Render ---
  const B = selectedAction === 0 ? B_Stay : B_Move;
  const currentStateVector = Array(numStates).fill(0);
  if (currentStateIndex < numStates) {
     currentStateVector[currentStateIndex] = 1;
  }
  
  return (
    <div className="my-6 p-4 border border-gray-300 rounded-lg bg-white text-sm">
      <h3 className="text-lg font-semibold mb-4 text-center">Visualization: How Actions Influence Transitions</h3>
      
      {/* Parameters Display */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayMatrix(B_Stay, 
          <span>Transition <InlineMath math="P(s_t | s_{t-1}, u=\text{Stay})" /></span>
        )}
        {displayMatrix(B_Move, 
          <span>Transition <InlineMath math="P(s_t | s_{t-1}, u=\text{Move})" /></span>
        )}
      </div>
      
      {/* Controls */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="p-3 bg-gray-50 rounded border">
          <label className="block text-xs font-medium mb-1">Current State (s<sub>t-1</sub>):</label>
          <select 
            value={currentStateIndex}
            onChange={(e) => setCurrentStateIndex(parseInt(e.target.value))}
            className="w-full p-1 border rounded text-xs"
          >
            {states.map((s, i) => <option key={i} value={i}>{s}</option>)}
          </select>
        </div>
         <div className="p-3 bg-gray-50 rounded border">
          <label className="block text-xs font-medium mb-1">Action Taken (u<sub>t-1</sub>):</label>
          <select 
            value={selectedAction}
            onChange={(e) => setSelectedAction(parseInt(e.target.value))}
            className="w-full p-1 border rounded text-xs"
          >
            {actions.map((a, i) => <option key={i} value={i}>{a}</option>)}
          </select>
        </div>
      </div>
      
      {/* Transition Calculation Display */}
      <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-4 p-3 bg-blue-100 rounded border border-blue-200">
        {displayDistribution(currentStateVector, states, "Current State P(s_{t-1})")}
        <div className="flex flex-col items-center">
           <span className="text-xs mb-1 font-medium">Action: {actions[selectedAction]}</span>
           <ArrowRight size={20} className="text-blue-600"/>
        </div>
        {displayDistribution(nextStateProb, states, "Next State P(s_t)")}
      </div>
      <div className="text-xs text-center mt-2 font-mono bg-gray-100 p-2 rounded">
         <InlineMath math={`P(s_t) = P(s_t | s_{t-1}, u=\\text{${actions[selectedAction]}}) \\times P(s_{t-1})`} />
      </div>
      
      {/* Explanation */}
      <div className="mt-4 text-xs text-gray-600 p-3 bg-gray-50 rounded border">
        <p>This shows how the chosen action (<InlineMath math="u_{t-1}"/>) affects the probability distribution over the next state (<InlineMath math="s_t"/>), given the current state (<InlineMath math="s_{t-1}"/>). The transition probabilities <InlineMath math="P(s_t | s_{t-1}, u_{t-1})"/> depend on the action taken. Change the current state and the action to see how the predicted next state distribution changes.</p>
      </div>
    </div>
  );
} 