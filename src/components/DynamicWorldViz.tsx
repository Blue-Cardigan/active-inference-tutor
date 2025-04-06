'use client';

import React, { useState, useEffect } from 'react';
import InlineMath from '@matejmazur/react-katex';
import { ArrowRight } from 'lucide-react';

// --- Component Definition ---
export default function DynamicWorldViz() {
  // --- State Space & Parameters ---
  const states = ['Sunny', 'Cloudy', 'Rainy'];
  const observations = ['Bright', 'Dim', 'Wet'];
  const numStates = states.length;
  const numObservations = observations.length;
  
  // Transition Matrix P(s_t | s_{t-1})
  // Rows: s_t, Columns: s_{t-1}
  const transitionMatrix = [
    [0.7, 0.4, 0.1], // To Sunny (from Sunny, Cloudy, Rainy)
    [0.2, 0.5, 0.5], // To Cloudy (from Sunny, Cloudy, Rainy)
    [0.1, 0.1, 0.4]  // To Rainy (from Sunny, Cloudy, Rainy)
  ];
  
  // Observation Matrix P(o_t | s_t)
  // Rows: o_t, Columns: s_t
  const observationMatrix = [
    [0.8, 0.3, 0.1], // Bright (given Sunny, Cloudy, Rainy)
    [0.1, 0.6, 0.3], // Dim (given Sunny, Cloudy, Rainy)
    [0.1, 0.1, 0.6]  // Wet (given Sunny, Cloudy, Rainy)
  ];
  
  // --- Component State ---
  const [timeStep, setTimeStep] = useState(0);
  const maxTimeSteps = 4;
  const [stateHistory, setStateHistory] = useState<number[][]>([]); // Stores state probability vectors
  const [observationHistory, setObservationHistory] = useState<number[][]>([]); // Stores observation probability vectors
  const [initialStateIndex, setInitialStateIndex] = useState(0); // Index of the initial certain state

  // --- Initialization and Updates ---
  useEffect(() => {
    const initialStateProb = Array(numStates).fill(0);
    initialStateProb[initialStateIndex] = 1;
    
    const newStateHistory = [initialStateProb];
    const newObservationHistory = [multiplyMatrixVector(observationMatrix, initialStateProb)];

    let currentStateProb = initialStateProb;
    for (let t = 1; t < maxTimeSteps; t++) {
      const nextStateProb = multiplyMatrixVector(transitionMatrix, currentStateProb);
      newStateHistory.push(nextStateProb);
      newObservationHistory.push(multiplyMatrixVector(observationMatrix, nextStateProb));
      currentStateProb = nextStateProb;
    }

    setStateHistory(newStateHistory);
    setObservationHistory(newObservationHistory);

  }, [initialStateIndex]); // Recalculate when initial state changes

  // --- Helper Functions ---
  // Matrix-vector multiplication (assuming observation matrix structure)
  const multiplyMatrixVector = (matrix: number[][], vector: number[]) => {
    const numRows = matrix.length;
    const numCols = matrix[0]?.length || 0;
    if (numCols !== vector.length) {
      console.error("Matrix-vector dimension mismatch");
      return [];
    }
    const result = Array(numRows).fill(0);
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        result[i] += matrix[i][j] * vector[j];
      }
    }
    return result;
  };
  
  // Display Matrix Helper
  const displayMatrix = (matrix: number[][], rowLabels: string[], colLabels: string[], title: React.ReactNode) => (
    <div className="p-2 bg-gray-100 rounded">
      <div className="text-xs font-medium mb-1 text-center">{title}</div>
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="border p-1 bg-gray-200"></th>
            {colLabels.map((label, i) => <th key={i} className="border p-1 bg-gray-200">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td className="border p-1 bg-gray-200 font-medium">{rowLabels[i]}</td>
              {row.map((val, j) => <td key={j} className="border p-1 text-center">{val.toFixed(2)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  // Display Probability Distribution Helper
  const displayDistribution = (probs: number[], labels: string[], title: string) => (
    <div className="p-2 bg-blue-50 rounded border border-blue-200">
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

  // --- Render ---
  return (
    <div className="my-6 p-4 border border-gray-300 rounded-lg bg-white text-sm">
      <h3 className="text-lg font-semibold mb-4 text-center">Visualization: A Dynamic World Over Time</h3>
      
      {/* Parameters Display */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayMatrix(transitionMatrix, states, states, 
          <span>Transition <InlineMath math="P(s_t | s_{t-1})" /></span>
        )}
        {displayMatrix(observationMatrix, observations, states, 
          <span>Observation <InlineMath math="P(o_t | s_t)" /></span>
        )}
      </div>
      
      {/* Controls */}
      <div className="mb-4 p-3 bg-gray-50 rounded border">
        <label className="block text-xs font-medium mb-1">Initial State (s₀):</label>
        <select 
          value={initialStateIndex}
          onChange={(e) => setInitialStateIndex(parseInt(e.target.value))}
          className="w-full p-1 border rounded text-xs"
        >
          {states.map((s, i) => <option key={i} value={i}>{s}</option>)}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Set the starting weather condition at time t=0.
        </p>
      </div>
      
      {/* Time Evolution Display */}
      <div className="overflow-x-auto pb-2">
        <div className="flex space-x-4 min-w-max">
          {stateHistory.map((stateProb, t) => (
            <div key={t} className="w-64 flex-shrink-0">
              <p className="text-center font-medium mb-2">Time Step t={t}</p>
              {displayDistribution(stateProb, states, `State P(s_${t})`)}
              <div className="mt-2">
                {displayDistribution(observationHistory[t], observations, `Observation P(o_${t})`)}
              </div>
              {t < maxTimeSteps - 1 && (
                <div className="flex justify-center mt-4">
                    <ArrowRight size={20} className="text-gray-400"/>
                 </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Explanation */}
      <div className="mt-4 text-xs text-gray-600 p-3 bg-gray-50 rounded border">
        <p>This shows how the probability distribution over hidden states (weather) evolves over time based on the transition probabilities <InlineMath math="P(s_t|s_{t-1})"/>. At each time step, the probability of observing different conditions (brightness, wetness) is determined by the current state probabilities and the observation likelihood <InlineMath math="P(o_t|s_t)"/>. Notice how the initial certainty fades over time as probabilities spread according to the transitions.</p>
      </div>
    </div>
  );
} 