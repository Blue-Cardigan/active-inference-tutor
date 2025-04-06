'use client';

import React, { useState, useEffect } from 'react';
import InlineMath from '@matejmazur/react-katex';
import { ArrowDown, ArrowRight } from 'lucide-react';

// Type definitions
interface MatrixDisplay {
  matrix: number[][];
  name: string;
  symbol: string;
  description: string;
}

export default function HungerExampleVisualization() {
  // Model parameters
  const [precision, setPrecision] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Initial belief state (certainty of state 2: Empty)
  const initialBelief = [0, 1];
  
  // Model matrices
  const A = [
    [1, 0], // Likelihood for State 1 (Fed if Food, not Fed if Empty)
    [0, 1]  // Likelihood for State 2 (not Hungry if Food, Hungry if Empty)
  ];
  
  // Transition matrices
  const B_u1 = [
    [1, 1], // 'Get Food' action: leads to State 1 from any state
    [0, 0]  // (rows are next state, columns are current state)
  ];
  
  const B_u2 = [
    [0, 0], // 'Do Nothing' action: leads to State 2 from any state
    [1, 1]
  ];
  
  // Preferences (strongly prefer 'Fed' over 'Hungry')
  const C = [1, 0];
  
  // Computed values
  const [policies, setPolicies] = useState([
    { id: 1, name: "Get Food", efe: 0, probability: 1 },
    { id: 2, name: "Do Nothing", efe: Infinity, probability: 0 }
  ]);
  
  // Functions to compute prediction steps
  const predictNextState = (action: number, currentState: number[]) => {
    const B = action === 1 ? B_u1 : B_u2;
    return [
      B[0][0] * currentState[0] + B[0][1] * currentState[1],
      B[1][0] * currentState[0] + B[1][1] * currentState[1]
    ];
  };
  
  const predictObservation = (state: number[]) => {
    return [
      A[0][0] * state[0] + A[0][1] * state[1],
      A[1][0] * state[0] + A[1][1] * state[1]
    ];
  };
  
  // Calculate KL divergence between two distributions
  const calculateKL = (q: number[], p: number[]) => {
    let kl = 0;
    for (let i = 0; i < q.length; i++) {
      if (q[i] > 0 && p[i] > 0) {
        kl += q[i] * Math.log(q[i] / p[i]);
      } else if (q[i] > 0 && p[i] === 0) {
        return Infinity; // KL divergence is infinity if model assigns zero probability to an outcome
      }
    }
    return kl;
  };
  
  // Calculate Expected Free Energy
  const calculateEFE = (action: number) => {
    // Predict next state
    const predictedState = predictNextState(action, initialBelief);
    
    // Predict observation
    const predictedObs = predictObservation(predictedState);
    
    // Calculate risk (KL divergence between predicted observation and preference)
    const risk = calculateKL(predictedObs, C);
    
    // Ambiguity is 0 because A is an identity matrix (perfect sensing)
    const ambiguity = 0;
    
    return risk + ambiguity;
  };
  
  // Update policies based on EFE
  useEffect(() => {
    const efe1 = calculateEFE(1);
    const efe2 = calculateEFE(2);
    
    const softmax = (efe1: number, efe2: number) => {
      if (!isFinite(efe1) || !isFinite(efe2)) {
        return [
          isFinite(efe1) ? 1 : 0,
          isFinite(efe2) ? 1 : 0
        ];
      }
      
      const w1 = Math.exp(-precision * efe1);
      const w2 = Math.exp(-precision * efe2);
      const sum = w1 + w2;
      
      return [w1 / sum, w2 / sum];
    };
    
    const [p1, p2] = softmax(efe1, efe2);
    
    setPolicies([
      { id: 1, name: "Get Food", efe: efe1, probability: p1 },
      { id: 2, name: "Do Nothing", efe: efe2, probability: p2 }
    ]);
  }, [precision]);
  
  // Calculate marginal expected observations
  const expectedObservations = [
    policies[0].probability * 1 + policies[1].probability * 0,
    policies[0].probability * 0 + policies[1].probability * 1
  ];
  
  // Calculate action outcomes and KL for each action
  const actionOutcomes = [
    predictObservation(predictNextState(1, initialBelief)),
    predictObservation(predictNextState(2, initialBelief))
  ];
  
  const actionKLs = [
    calculateKL(actionOutcomes[0], expectedObservations),
    calculateKL(actionOutcomes[1], expectedObservations)
  ];
  
  // Determine selected action
  const selectedAction = actionKLs[0] <= actionKLs[1] ? 1 : 2;
  
  // Display matrices with appropriate formatting
  const displayMatrix = (m: number[][], rows: number, cols: number) => (
    <div className="inline-flex items-center mx-1">
      <div className="text-xl">(</div>
      <div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="w-6 text-center">{m[i][j]}</div>
            ))}
          </div>
        ))}
      </div>
      <div className="text-xl">)</div>
    </div>
  );
  
  // Display vector with appropriate formatting
  const displayVector = (v: number[]) => (
    <div className="inline-flex items-center mx-1">
      <div className="text-xl">(</div>
      <div>
        {v.map((val, i) => (
          <div key={i} className="flex justify-center">{val}</div>
        ))}
      </div>
      <div className="text-xl">)</div>
    </div>
  );
  
  // Helper to display steps in the calculation
  const StepDisplay = ({ index, title, isActive, children }: { 
    index: number,
    title: string,
    isActive: boolean, 
    children: React.ReactNode 
  }) => (
    <div 
      className={`p-4 border rounded-lg transition-all ${isActive ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-gray-50 border-gray-200'}`}
    >
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
          {index}
        </span>
        {title}
      </h4>
      <div className={`mt-2 ${isActive ? 'opacity-100' : 'opacity-90'}`}>
        {children}
      </div>
    </div>
  );
  
  // Helper to highlight calculated values
  const HighlightedValue = ({ label, value, isVector = false }: { label: string, value: any, isVector?: boolean }) => (
    <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1 inline-flex items-center mr-2 mb-2">
      <span className="font-medium text-xs mr-1">{label}:</span>
      {isVector ? (
        <span className="text-xs bg-white px-1 rounded">[{Array.isArray(value) ? value.join(', ') : value}]</span>
      ) : (
        <span className="text-xs bg-white px-1 rounded">{value}</span>
      )}
    </div>
  );
  
  return (
    <div className="my-6 p-4 border border-gray-300 rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-6 text-center">Interactive Hunger Game Example</h3>
      
      {/* Model parameters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold mb-2">Model Parameters</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="mb-1 font-medium">States (<InlineMath math="s" />):</p>
            <p>1: Food Available, 2: Empty</p>
          </div>
          <div>
            <p className="mb-1 font-medium">Observations (<InlineMath math="o" />):</p>
            <p>1: Fed, 2: Hungry</p>
          </div>
          <div>
            <p className="mb-1 font-medium">Actions (<InlineMath math="u" />):</p>
            <p>1: Get Food, 2: Do Nothing</p>
          </div>
          <div>
            <p className="mb-1 font-medium">Initial Belief (<InlineMath math="q(s_0)" />):</p>
            <div className="flex items-center">
              <span className="mr-2">Certainty of Empty =</span> 
              {displayVector(initialBelief)}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <p className="mb-1 font-medium">Likelihood (<InlineMath math="A = p(o|s)" />):</p>
            <div className="flex items-center">
              Identity matrix (perfect sensing): 
              {displayMatrix(A, 2, 2)}
            </div>
          </div>
          <div>
            <p className="mb-1 font-medium">Preferences (<InlineMath math="C = p(o)" />):</p>
            <div className="flex items-center">
              Strong preference for Fed: 
              {displayVector(C)}
            </div>
          </div>
          <div>
            <p className="mb-1 font-medium">Transition: Get Food (<InlineMath math="B(u_1)" />):</p>
            <div className="flex items-center">
              Always leads to Food: 
              {displayMatrix(B_u1, 2, 2)}
            </div>
          </div>
          <div>
            <p className="mb-1 font-medium">Transition: Do Nothing (<InlineMath math="B(u_2)" />):</p>
            <div className="flex items-center">
              Always leads to Empty: 
              {displayMatrix(B_u2, 2, 2)}
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">
            Precision (<InlineMath math="\gamma" />): {precision.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={precision}
            onChange={(e) => setPrecision(parseFloat(e.target.value))}
            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            Higher precision (<InlineMath math="\gamma" />) increases the agent's confidence in selecting policies with lower Expected Free Energy.
          </p>
        </div>
      </div>
      
      {/* Steps control */}
      <div className="mb-4 flex justify-between items-center">
        <button 
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <div className="text-sm font-medium">
          Step {currentStep + 1} of 4
        </div>
        <button 
          onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
          disabled={currentStep === 3}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      
      {/* Step-by-step visualization */}
      <div className="space-y-4">
        <StepDisplay index={1} title="Predict Future States" isActive={currentStep >= 0}>
          <div className="p-2 text-sm">
            <p className="mb-2">For each policy, we predict the state at time <InlineMath math="t=1" /> given the initial state:</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <HighlightedValue label="Initial State" value={initialBelief} isVector={true} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="p-2 bg-white rounded border">
                <p className="font-medium">Policy 1: Get Food (<InlineMath math="u_1" />)</p>
                <div className="mt-1 flex items-center">
                  <InlineMath math="q(s_1|\pi_1) = B(u_1)q(s_0) = " />
                  {displayMatrix(B_u1, 2, 2)}
                  {displayVector(initialBelief)}
                  <ArrowRight className="mx-1" size={16} />
                  {displayVector(predictNextState(1, initialBelief))}
                </div>
                <div className="mt-2 bg-green-50 p-2 rounded border border-green-200">
                  <p className="text-xs font-medium">Result: State 1 (Food)</p>
                  <p className="text-xs flex items-center">
                    Predicted state: 
                    <span className="ml-1 px-2 py-1 bg-white rounded border border-green-100 font-mono">
                      [{predictNextState(1, initialBelief).join(', ')}]
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="p-2 bg-white rounded border">
                <p className="font-medium">Policy 2: Do Nothing (<InlineMath math="u_2" />)</p>
                <div className="mt-1 flex items-center">
                  <InlineMath math="q(s_1|\pi_2) = B(u_2)q(s_0) = " />
                  {displayMatrix(B_u2, 2, 2)}
                  {displayVector(initialBelief)}
                  <ArrowRight className="mx-1" size={16} />
                  {displayVector(predictNextState(2, initialBelief))}
                </div>
                <div className="mt-2 bg-green-50 p-2 rounded border border-green-200">
                  <p className="text-xs font-medium">Result: State 2 (Empty)</p>
                  <p className="text-xs flex items-center">
                    Predicted state: 
                    <span className="ml-1 px-2 py-1 bg-white rounded border border-green-100 font-mono">
                      [{predictNextState(2, initialBelief).join(', ')}]
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <h5 className="text-xs font-semibold mb-1">Calculation Results</h5>
              <div className="flex flex-wrap gap-2">
                <HighlightedValue label="Get Food → State" value={predictNextState(1, initialBelief).join(', ')} isVector={true} />
                <HighlightedValue label="Do Nothing → State" value={predictNextState(2, initialBelief).join(', ')} isVector={true} />
              </div>
            </div>
          </div>
        </StepDisplay>
        
        <StepDisplay index={2} title="Predict Observations" isActive={currentStep >= 1}>
          <div className="p-2 text-sm">
            <p className="mb-2">Project the predicted states into observation space:</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <HighlightedValue label="Predicted State (Get Food)" value={predictNextState(1, initialBelief)} isVector={true} />
              <HighlightedValue label="Predicted State (Do Nothing)" value={predictNextState(2, initialBelief)} isVector={true} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="p-2 bg-white rounded border">
                <p className="font-medium">Policy 1: Get Food</p>
                <div className="mt-1 flex items-center">
                  <InlineMath math="q(o_1|\pi_1) = A q(s_1|\pi_1) = " />
                  {displayMatrix(A, 2, 2)}
                  {displayVector(predictNextState(1, initialBelief))}
                  <ArrowRight className="mx-1" size={16} />
                  {displayVector(actionOutcomes[0])}
                </div>
                <div className="mt-2 bg-green-50 p-2 rounded border border-green-200">
                  <p className="text-xs font-medium">Result: Observation 1 (Fed)</p>
                  <p className="text-xs flex items-center">
                    Predicted observation: 
                    <span className="ml-1 px-2 py-1 bg-white rounded border border-green-100 font-mono">
                      [{actionOutcomes[0].join(', ')}]
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="p-2 bg-white rounded border">
                <p className="font-medium">Policy 2: Do Nothing</p>
                <div className="mt-1 flex items-center">
                  <InlineMath math="q(o_1|\pi_2) = A q(s_1|\pi_2) = " />
                  {displayMatrix(A, 2, 2)}
                  {displayVector(predictNextState(2, initialBelief))}
                  <ArrowRight className="mx-1" size={16} />
                  {displayVector(actionOutcomes[1])}
                </div>
                <div className="mt-2 bg-green-50 p-2 rounded border border-green-200">
                  <p className="text-xs font-medium">Result: Observation 2 (Hungry)</p>
                  <p className="text-xs flex items-center">
                    Predicted observation: 
                    <span className="ml-1 px-2 py-1 bg-white rounded border border-green-100 font-mono">
                      [{actionOutcomes[1].join(', ')}]
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <h5 className="text-xs font-semibold mb-1">Calculation Results</h5>
              <div className="flex flex-wrap gap-2">
                <HighlightedValue label="Get Food → Observation" value={actionOutcomes[0].join(', ')} isVector={true} />
                <HighlightedValue label="Do Nothing → Observation" value={actionOutcomes[1].join(', ')} isVector={true} />
              </div>
            </div>
          </div>
        </StepDisplay>
        
        <StepDisplay index={3} title="Calculate Expected Free Energy" isActive={currentStep >= 2}>
          <div className="p-2 text-sm">
            <p className="mb-2">Calculate EFE (<InlineMath math="G(\pi)" />) for each policy based on Risk and Ambiguity:</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <HighlightedValue label="Preferences (C)" value={C.join(', ')} isVector={true} />
              <HighlightedValue label="Precision (γ)" value={precision.toFixed(2)} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="p-2 bg-white rounded border relative">
                <div className={policies[0].efe === 0 ? "absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full" : ""}>
                  {policies[0].efe === 0 ? "Optimal" : ""}
                </div>
                <p className="font-medium">Policy 1: Get Food</p>
                <p className="mt-1">Risk = KL[{`${actionOutcomes[0][0]}, ${actionOutcomes[0][1]}`} || {`${C[0]}, ${C[1]}`}] = <span className="font-medium text-blue-600">{policies[0].efe.toFixed(2)}</span></p>
                <p className="mt-1">Ambiguity = 0 (perfect sensing)</p>
                <p className="mt-1 font-medium">EFE = <span className="font-medium text-blue-600">{policies[0].efe.toFixed(2)}</span></p>
              </div>
              
              <div className="p-2 bg-white rounded border">
                <p className="font-medium">Policy 2: Do Nothing</p>
                <p className="mt-1">Risk = KL[{`${actionOutcomes[1][0]}, ${actionOutcomes[1][1]}`} || {`${C[0]}, ${C[1]}`}] = <span className="font-medium text-red-600">{isFinite(policies[1].efe) ? policies[1].efe.toFixed(2) : "∞"}</span></p>
                <p className="mt-1">Ambiguity = 0 (perfect sensing)</p>
                <p className="mt-1 font-medium">EFE = <span className="font-medium text-red-600">{isFinite(policies[1].efe) ? policies[1].efe.toFixed(2) : "∞"}</span></p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="font-medium">Policy Probabilities: <InlineMath math="q(\pi) = \sigma(-\gamma G(\pi))" /></p>
              <div className="flex items-center mt-2">
                <div className="flex-1">
                  <div className="h-8 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 flex items-center justify-center text-white text-xs"
                      style={{ width: `${policies[0].probability * 100}%` }}
                    >
                      {(policies[0].probability * 100).toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-center mt-1">Get Food</p>
                </div>
                <div className="flex-1 ml-2">
                  <div className="h-8 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 flex items-center justify-center text-white text-xs"
                      style={{ width: `${policies[1].probability * 100}%` }}
                    >
                      {(policies[1].probability * 100).toFixed(1)}%
                    </div>
                  </div>
                  <p className="text-center mt-1">Do Nothing</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
              <h5 className="text-xs font-semibold mb-1">Calculation Results</h5>
              <div className="flex flex-wrap gap-2">
                <HighlightedValue label="EFE (Get Food)" value={policies[0].efe.toFixed(2)} />
                <HighlightedValue label="EFE (Do Nothing)" value={isFinite(policies[1].efe) ? policies[1].efe.toFixed(2) : "∞"} />
                <HighlightedValue label="P(Get Food)" value={`${(policies[0].probability * 100).toFixed(1)}%`} />
                <HighlightedValue label="P(Do Nothing)" value={`${(policies[1].probability * 100).toFixed(1)}%`} />
              </div>
            </div>
          </div>
        </StepDisplay>
        
        <StepDisplay index={4} title="Action Selection" isActive={currentStep >= 3}>
          <div className="p-2 text-sm">
            <p className="mb-2">The agent selects the action that minimizes the KL divergence between predicted observations and overall expected observations:</p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <HighlightedValue label="Policy P(Get Food)" value={`${(policies[0].probability * 100).toFixed(1)}%`} />
              <HighlightedValue label="Policy P(Do Nothing)" value={`${(policies[1].probability * 100).toFixed(1)}%`} />
            </div>
            
            <div className="p-3 bg-blue-50 rounded border border-blue-200 mb-4">
              <p className="font-medium">Expected Observations (weighted by policy probabilities):</p>
              <div className="mt-1">
                <InlineMath math="q(o_1) = " /> 
                {`${policies[0].probability.toFixed(2)} × [1,0] + ${policies[1].probability.toFixed(2)} × [0,1] = `}
                <span className="font-medium text-blue-600">[{expectedObservations[0].toFixed(2)}, {expectedObservations[1].toFixed(2)}]</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-2 bg-white rounded border ${selectedAction === 1 ? 'border-green-500 ring-2 ring-green-200' : ''}`}>
                <div className={selectedAction === 1 ? "mb-1 text-green-600 font-medium" : "mb-1 font-medium"}>
                  Action 1: Get Food {selectedAction === 1 && '✓ Selected'}
                </div>
                <p className="mt-1">Predicted observation: <span className="font-medium">[{actionOutcomes[0].join(', ')}]</span></p>
                <p className="mt-1">KL divergence: <span className={selectedAction === 1 ? "font-medium text-green-600" : "font-medium"}>{actionKLs[0].toFixed(2)}</span></p>
              </div>
              
              <div className={`p-2 bg-white rounded border ${selectedAction === 2 ? 'border-green-500 ring-2 ring-green-200' : ''}`}>
                <div className={selectedAction === 2 ? "mb-1 text-green-600 font-medium" : "mb-1 font-medium"}>
                  Action 2: Do Nothing {selectedAction === 2 && '✓ Selected'}
                </div>
                <p className="mt-1">Predicted observation: <span className="font-medium">[{actionOutcomes[1].join(', ')}]</span></p>
                <p className="mt-1">KL divergence: <span className={selectedAction === 2 ? "font-medium text-green-600" : "font-medium"}>{isFinite(actionKLs[1]) ? actionKLs[1].toFixed(2) : "∞"}</span></p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
              <p className="font-medium text-center">
                The agent chooses Action {selectedAction}: {selectedAction === 1 ? 'Get Food' : 'Do Nothing'} 
                to fulfill its expected observations.
              </p>
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                <HighlightedValue label="Selected Action" value={selectedAction === 1 ? 'Get Food' : 'Do Nothing'} />
                <HighlightedValue label="Min KL" value={Math.min(...actionKLs.filter(k => isFinite(k))).toFixed(2)} />
              </div>
            </div>
          </div>
        </StepDisplay>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
        <p className="text-center">
          This example demonstrates how an agent selects actions based on minimizing Expected Free Energy.
          Try adjusting the precision to see how it affects policy selection confidence.
        </p>
      </div>
    </div>
  );
} 