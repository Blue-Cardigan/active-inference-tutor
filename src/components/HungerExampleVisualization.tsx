'use client';

import React, { useState, useEffect, useRef, forwardRef, useMemo } from 'react';
import InlineMath from '@matejmazur/react-katex';
import { ArrowRight, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

// Dynamically import the explanation component
import PrecisionExplanationViz from './PrecisionExplanationViz';

// --- Calculation Helpers ---

// Matrix-vector multiplication
const multiplyMV = (matrix: number[][], vector: number[]): number[] => {
    return matrix.map(row =>
        row.reduce((sum, val, j) => sum + val * vector[j], 0)
    );
};

// KL Divergence
const calculateKL = (q: number[], p: number[]): number => {
    let kl = 0;
    for (let i = 0; i < q.length; i++) {
        if (q[i] > 1e-9) { // Use epsilon for stability
            if (p[i] > 1e-9) {
                kl += q[i] * (Math.log(q[i]) - Math.log(p[i]));
            } else {
                return Infinity; // q has probability where p has ~zero
            }
        }
    }
    return kl > 0 ? kl : 0;
};

// Softmax for policy probabilities
const calculatePolicyProbs = (efe1: number, efe2: number, precision: number): number[] => {
    const efes = [efe1, efe2];
    const finiteEfes = efes.filter(isFinite);
    if (finiteEfes.length === 0) return [0.5, 0.5]; // Uniform if both Infinite

    const maxEfe = Math.max(...finiteEfes);
    const weights = efes.map(efe => isFinite(efe) ? Math.exp(-precision * (efe - maxEfe)) : 0);
    const sumWeights = weights.reduce((a, b) => a + b, 0);

    if (sumWeights < 1e-9) { // Handle potential underflow or all EFEs being effectively infinite
        // If only one is finite, give it all probability
        if (finiteEfes.length === 1) {
            return efes.map(efe => isFinite(efe) ? 1 : 0);
        }
        // Otherwise (multiple finite but weights ~0, or only Infinites remaining), return uniform
        return [0.5, 0.5];
    }
    return weights.map(w => w / sumWeights);
};

// --- StepDisplay Component (Unchanged) ---
const StepDisplay = forwardRef<HTMLDivElement, {
  index: number;
  title: string;
  isActive: boolean;
  showNext?: boolean;
  showPrevious?: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
  children: React.ReactNode;
  isLastStep?: boolean; // Flag to indicate if it's the final display step
  showSimulateButtons?: boolean;
  onSimulate?: (policyId: number) => void;
  showResetButton?: boolean;
  onReset?: () => void;
}>(({ index, title, isActive, showNext = false, showPrevious = false, onNext, onPrevious, children, isLastStep = false, showSimulateButtons = false, onSimulate, showResetButton = false, onReset }, ref) => {
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={`border rounded-lg transition-all duration-300 ease-in-out outline-none overflow-hidden ${isActive ? 'bg-blue-50 border-blue-300 shadow-md' : 'bg-gray-50 border-gray-200'}`}
    >
      <h4 className="text-sm font-semibold flex items-center gap-2 mb-1 p-3 pb-0">
        <span className={`rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}>
          {index}
        </span>
        {title}
      </h4>
      <div className={`px-3 pb-3 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
          {children}
      </div>
      {/* Navigation / Action Buttons */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-200 min-h-[40px] flex flex-wrap justify-between items-center gap-2">
        {/* Previous Button */}
          <button
            onClick={onPrevious}
            className={`px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs transition-opacity ${showPrevious ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          disabled={!showPrevious}
          >
          ← Previous
          </button>

        {/* Simulate Buttons (Specific to Step 3) */}
        {showSimulateButtons && onSimulate && (
          <div className="flex gap-2">
            <button
              onClick={() => onSimulate(1)} // Policy 1: Get Food
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
            >
              Simulate 'Get Food' →
            </button>
            <button
              onClick={() => onSimulate(2)} // Policy 2: Do Nothing
              className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs"
            >
              Simulate 'Do Nothing' →
            </button>
          </div>
        )}

        {/* Next Button */}
          <button
            onClick={onNext}
          className={`px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs transition-opacity ${(showNext && !showSimulateButtons) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          disabled={!showNext}
        >
          Next →
        </button>

        {/* Reset Button (Specific to Last Step) */}
        {showResetButton && onReset && (
            <button
                onClick={onReset}
                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs flex items-center gap-1"
            >
                <RefreshCw size={12} /> Try Again / Reset
          </button>
        )}
      </div>
    </div>
  );
});
StepDisplay.displayName = 'StepDisplay';

// --- Main Component ---
export default function HungerExampleVisualization() {
  // --- Config State ---
  const [precision, setPrecision] = useState(1);
  const [isPrecisionExplanationOpen, setIsPrecisionExplanationOpen] = useState(false);

  // --- Simulation Flow State ---
  const [currentStep, setCurrentStep] = useState(0); // 0: Predict States, 1: Predict Obs, 2: Calc EFE/Select, 3: Show Outcome
  const [userSelectedPolicyId, setUserSelectedPolicyId] = useState<number | null>(null); // 1 or 2

  // --- Fixed Model Parameters ---
  const initialBelief = useMemo(() => [0, 1], []); // Certainty of state 2: Empty
  const A = useMemo(() => [[1, 0], [0, 1]], []); // Likelihood (Identity)
  const B_u1 = useMemo(() => [[1, 1], [0, 0]], []); // Transition: Get Food
  const B_u2 = useMemo(() => [[0, 0], [1, 1]], []); // Transition: Do Nothing
  const C = useMemo(() => [1, 0], []); // Preferences (Prefer Fed)

  // --- Intermediate Calculated Values --- (Memoized based on dependencies)

  const predictedState_Pi1 = useMemo(() => multiplyMV(B_u1, initialBelief), [B_u1, initialBelief]);
  const predictedState_Pi2 = useMemo(() => multiplyMV(B_u2, initialBelief), [B_u2, initialBelief]);

  const predictedObs_Pi1 = useMemo(() => multiplyMV(A, predictedState_Pi1), [A, predictedState_Pi1]);
  const predictedObs_Pi2 = useMemo(() => multiplyMV(A, predictedState_Pi2), [A, predictedState_Pi2]);

  const risk_Pi1 = useMemo(() => calculateKL(predictedObs_Pi1, C), [predictedObs_Pi1, C]);
  const risk_Pi2 = useMemo(() => calculateKL(predictedObs_Pi2, C), [predictedObs_Pi2, C]);
  const ambiguity = 0; // Constant because A is identity

  const efe_Pi1 = useMemo(() => risk_Pi1 + ambiguity, [risk_Pi1]);
  const efe_Pi2 = useMemo(() => risk_Pi2 + ambiguity, [risk_Pi2]);

  const policyProbabilities = useMemo(() => calculatePolicyProbs(efe_Pi1, efe_Pi2, precision), [efe_Pi1, efe_Pi2, precision]);

  const policyData = useMemo(() => [
    { id: 1, name: "Get Food", efe: efe_Pi1, probability: policyProbabilities[0], predictedState: predictedState_Pi1, predictedObs: predictedObs_Pi1, risk: risk_Pi1 },
    { id: 2, name: "Do Nothing", efe: efe_Pi2, probability: policyProbabilities[1], predictedState: predictedState_Pi2, predictedObs: predictedObs_Pi2, risk: risk_Pi2 }
  ], [efe_Pi1, efe_Pi2, policyProbabilities, predictedState_Pi1, predictedState_Pi2, predictedObs_Pi1, predictedObs_Pi2, risk_Pi1, risk_Pi2]);

  // --- Event Handlers ---
  const handleSimulate = (policyId: number) => {
    setUserSelectedPolicyId(policyId);
    setCurrentStep(3); // Move to the outcome display step
  };

  const handleReset = () => {
    setUserSelectedPolicyId(null);
    setCurrentStep(0); // Go back to the first step
  };

  const selectedPolicyOutcome = userSelectedPolicyId ? policyData[userSelectedPolicyId - 1] : null;

  // --- Display Helpers (unchanged) ---
  const displayMatrix = (m: number[][], rows: number, cols: number) => (
    <span className="inline-flex items-center mx-1 font-mono text-xs align-middle">
      <span className="text-lg mr-px">(</span>
      <span className="inline-block text-center leading-none">
        {Array.from({ length: rows }).map((_, i) => (
          <span key={i} className="block">
            {Array.from({ length: cols }).map((_, j) => (
              <span key={j} className="inline-block w-4 text-center">{m[i][j]}</span>
            ))}
          </span>
        ))}
      </span>
      <span className="text-lg ml-px">)</span>
    </span>
  );
  const displayVector = (v: number[], highlightIndex?: number) => (
    <span className="inline-flex items-center mx-1 font-mono text-xs align-middle">
      <span className="text-lg mr-px">(</span>
      <span className="inline-block text-center leading-none">
        {v.map((val, i) => (
          <span key={i} className={`block px-1 ${highlightIndex === i ? 'bg-yellow-200 rounded' : ''}`}>{val.toFixed(2)}</span>
        ))}
      </span>
      <span className="text-lg ml-px">)</span>
    </span>
  );
  const HighlightedValue = ({ label, value, isVector = false }: { label: string, value: any, isVector?: boolean }) => (
    <div className="bg-yellow-50 border border-yellow-200 rounded px-1.5 py-0.5 inline-flex items-center mr-1 mb-1 text-xs">
      <span className="font-medium mr-1">{label}:</span>
      {isVector ? (
        <span className="bg-white px-1 rounded font-mono">[{Array.isArray(value) ? value.map(v=>v.toFixed(2)).join(', ') : value}]</span>
      ) : (
        <span className="bg-white px-1 rounded font-mono">{value}</span>
      )}
    </div>
  );
  const formatInfinity = (value: number): string => isFinite(value) ? value.toFixed(2) : '∞';
  
  // --- Render --- 
  return (
    <div className="my-6 p-4 border border-gray-300 rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-6 text-center">Interactive Hunger Game Example</h3>
      
      {/* Model parameters Display (Simplified - static values) */}
      <details className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs cursor-pointer">
          <summary className="font-semibold text-sm">View Model Parameters</summary>
          <div className="mt-2 grid grid-cols-2 gap-3">
              <div><span className="font-medium">States:</span> 1: Food, 2: Empty</div>
              <div><span className="font-medium">Obs:</span> 1: Fed, 2: Hungry</div>
              <div><span className="font-medium">Actions:</span> 1: Get Food, 2: Do Nothing</div>
              <div className="flex items-center"><span className="font-medium mr-1">Initial Belief q(s₀):</span>{displayVector(initialBelief)} (Empty)</div>
              <div className="flex items-center"><span className="font-medium mr-1">Likelihood A:</span>{displayMatrix(A, 2, 2)} (Identity)</div>
              <div className="flex items-center"><span className="font-medium mr-1">Preference C:</span>{displayVector(C)} (Prefer Fed)</div>
              <div className="flex items-center"><span className="font-medium mr-1">Transition B(u₁):</span>{displayMatrix(B_u1, 2, 2)} (→ Food)</div>
              <div className="flex items-center"><span className="font-medium mr-1">Transition B(u₂):</span>{displayMatrix(B_u2, 2, 2)} (→ Empty)</div>
          </div>
      </details>
      
      {/* Step-by-step visualization */}
      <div className="space-y-3">
        {/* Step 1: Predict States */}
        <StepDisplay
          index={1}
          title="Predict Future States q(s₁|π)"
          isActive={currentStep >= 0}
          showNext={currentStep === 0}
          onNext={() => setCurrentStep(1)}
        >
          <p className="text-xs mb-2">Predict state at t=1 for each policy using <InlineMath math="q(s_1|\pi) = B(u)q(s_0)"/>.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="p-1.5 bg-white rounded border">
              <p className="font-medium mb-1">Policy 1: Get Food (u₁)</p>
              <InlineMath math="B(u_1)q(s_0) ="/> {displayMatrix(B_u1, 2, 2)} {displayVector(initialBelief)} <ArrowRight size={14}/> <span className="font-semibold text-blue-600">{displayVector(predictedState_Pi1)}</span>
              <p className="text-green-700 mt-1">Result: State 1 (Food)</p>
            </div>
            <div className="p-1.5 bg-white rounded border">
              <p className="font-medium mb-1">Policy 2: Do Nothing (u₂)</p>
              <InlineMath math="B(u_2)q(s_0) ="/> {displayMatrix(B_u2, 2, 2)} {displayVector(initialBelief)} <ArrowRight size={14}/> <span className="font-semibold text-blue-600">{displayVector(predictedState_Pi2)}</span>
              <p className="text-red-700 mt-1">Result: State 2 (Empty)</p>
            </div>
          </div>
        </StepDisplay>
        
        {/* Step 2: Predict Observations */}
        <StepDisplay
          index={2}
          title="Predict Future Observations q(o₁|π)"
          isActive={currentStep >= 1}
          showPrevious={currentStep === 1}
          onPrevious={() => setCurrentStep(0)}
          showNext={currentStep === 1}
          onNext={() => setCurrentStep(2)}
        >
          <p className="text-xs mb-2">Project predicted states into observations using <InlineMath math="q(o_1|\pi) = A q(s_1|\pi)"/>.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="p-1.5 bg-white rounded border">
              <p className="font-medium mb-1">Policy 1: Get Food</p>
              <InlineMath math="A q(s_1|\pi_1) ="/> {displayMatrix(A, 2, 2)} {displayVector(predictedState_Pi1)} <ArrowRight size={14}/> <span className="font-semibold text-blue-600">{displayVector(predictedObs_Pi1)}</span>
               <p className="text-green-700 mt-1">Result: Obs 1 (Fed)</p>
            </div>
            <div className="p-1.5 bg-white rounded border">
              <p className="font-medium mb-1">Policy 2: Do Nothing</p>
              <InlineMath math="A q(s_1|\pi_2) ="/> {displayMatrix(A, 2, 2)} {displayVector(predictedState_Pi2)} <ArrowRight size={14}/> <span className="font-semibold text-blue-600">{displayVector(predictedObs_Pi2)}</span>
               <p className="text-red-700 mt-1">Result: Obs 2 (Hungry)</p>
            </div>
          </div>
        </StepDisplay>
        
        {/* Step 3: Calculate EFE & Policy Probabilities */}
        <StepDisplay
          index={3}
          title="Calculate EFE & Policy Probabilities q(π)"
          isActive={currentStep >= 2}
          showPrevious={currentStep === 2 && !userSelectedPolicyId} // Only allow prev if outcome not shown
          onPrevious={() => setCurrentStep(1)}
          showSimulateButtons={currentStep === 2} // Show simulate buttons only on this step
          onSimulate={handleSimulate}
        >
          <p className="text-xs mb-2">Calculate EFE <InlineMath math="G = \text{Risk} + \text{Ambiguity}"/> where Risk <InlineMath math="= KL[q(o|\pi) || C]"/>.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3">
            {/* Policy 1 EFE */}
            <div className="p-1.5 bg-white rounded border">
              <p className="font-medium mb-1">Policy 1: Get Food</p>
              <p>Risk = KL[{predictedObs_Pi1.map(v=>v.toFixed(1)).join(',')} || {C.join(',')}] = <span className="font-semibold text-red-600">{formatInfinity(risk_Pi1)}</span></p>
              <p>Ambiguity = <span className="font-semibold text-green-600">{ambiguity.toFixed(2)}</span> (perfect sensing)</p>
              <p className="mt-1 font-bold">EFE = <span className="font-semibold text-blue-600">{formatInfinity(efe_Pi1)}</span></p>
            </div>
            {/* Policy 2 EFE */}
            <div className="p-1.5 bg-white rounded border">
              <p className="font-medium mb-1">Policy 2: Do Nothing</p>
              <p>Risk = KL[{predictedObs_Pi2.map(v=>v.toFixed(1)).join(',')} || {C.join(',')}] = <span className="font-semibold text-red-600">{formatInfinity(risk_Pi2)}</span></p>
              <p>Ambiguity = <span className="font-semibold text-green-600">{ambiguity.toFixed(2)}</span></p>
              <p className="mt-1 font-bold">EFE = <span className="font-semibold text-blue-600">{formatInfinity(efe_Pi2)}</span></p>
            </div>
          </div>
          {/* Policy Probabilities */}
          <div className="p-2 bg-blue-100 rounded border border-blue-200 text-xs">
             <p className="font-medium mb-1">Policy Probabilities <InlineMath math="q(\pi) = \sigma(-\gamma G(\pi))"/> (Precision γ = {precision.toFixed(1)})</p>
             <p><InlineMath math={`\sigma(-${precision.toFixed(1)} \times [${formatInfinity(efe_Pi1)}, ${formatInfinity(efe_Pi2)}]) =`}/> <span className="font-semibold">[{policyProbabilities[0].toFixed(2)}, {policyProbabilities[1].toFixed(2)}]</span></p>
              <div className="flex items-center mt-2">
                <div className="flex-1">
                   <div className="h-6 w-full bg-gray-200 rounded overflow-hidden">
                     <div className="h-full bg-purple-600 flex items-center justify-center text-white font-medium" style={{ width: `${policyProbabilities[0] * 100}%` }}>
                       {(policyProbabilities[0] * 100).toFixed(0)}%
                    </div>
                  </div>
                   <p className="text-center mt-0.5 text-[10px]">Get Food</p>
                </div>
                <div className="flex-1 ml-2">
                   <div className="h-6 w-full bg-gray-200 rounded overflow-hidden">
                     <div className="h-full bg-purple-600 flex items-center justify-center text-white font-medium" style={{ width: `${policyProbabilities[1] * 100}%` }}>
                       {(policyProbabilities[1] * 100).toFixed(0)}%
                    </div>
                  </div>
                   <p className="text-center mt-0.5 text-[10px]">Do Nothing</p>
                </div>
              </div>
              <p className="text-center text-[11px] mt-1">Agent would normally choose based on these probabilities (and subsequent KL divergence for action selection), but you can choose which policy to simulate below.</p>
          </div>
        </StepDisplay>
        
        {/* Step 4: Show Outcome of Selected Policy */}
        {userSelectedPolicyId && selectedPolicyOutcome && (
        <StepDisplay
          index={4}
                title={`Outcome of Simulating Policy: ${selectedPolicyOutcome.name}`}
                isActive={currentStep === 3}
                showPrevious={currentStep === 3} // Always allow going back to selection
                onPrevious={() => { setUserSelectedPolicyId(null); setCurrentStep(2); }}
                isLastStep={true}
                showResetButton={true}
                onReset={handleReset}
            >
                <p className="text-xs mb-2">Showing the resulting state and observation if the agent commits to the selected policy's first (and only) action.</p>
                <div className="p-2 bg-white rounded border text-xs space-y-1">
                    <p><span className="font-medium">Selected Policy:</span> {selectedPolicyOutcome.name}</p>
                    <p><span className="font-medium">Action Taken:</span> u = {selectedPolicyOutcome.id}</p>
                    <div className="flex items-center"><span className="font-medium mr-1">Resulting State q(s₁):</span><span className="font-semibold text-blue-600">{displayVector(selectedPolicyOutcome.predictedState)}</span> ({selectedPolicyOutcome.predictedState[0] > 0.5 ? 'Food' : 'Empty'})</div>
                    <div className="flex items-center"><span className="font-medium mr-1">Resulting Observation q(o₁):</span><span className="font-semibold text-blue-600">{displayVector(selectedPolicyOutcome.predictedObs)}</span> ({selectedPolicyOutcome.predictedObs[0] > 0.5 ? 'Fed' : 'Hungry'})</div>
                </div>
                 <p className="text-xs mt-2 text-center text-gray-600">Click 'Try Again / Reset' to restart the calculation from the beginning, or 'Previous' to choose the other policy.</p>
        </StepDisplay>
        )}
      </div>
      
      {/* Precision Slider Section */} 
       <div className="my-6 mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
           <h4 className="text-xs font-semibold mb-1 text-center text-gray-700">Adjust Model Precision (Affects Policy Probabilities)</h4>
           <label className="block text-xs font-medium mb-1 text-center">
             Precision (<InlineMath math="\gamma" />): {precision.toFixed(1)}
           </label>
           <input
             type="range"
             min="0.1"
             max="10" // Increased max for more dramatic effect
             step="0.1"
             value={precision}
             onChange={(e) => setPrecision(parseFloat(e.target.value))}
             className="w-full max-w-sm mx-auto h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer block range-sm"
             disabled={currentStep === 3} // Disable when viewing outcome
           />
           {/* Precision Explanation Dropdown */} 
            <div className="mt-3 pt-2 border-t border-gray-200">
               <button 
                 onClick={() => setIsPrecisionExplanationOpen(!isPrecisionExplanationOpen)}
                 className="flex items-center justify-center w-full text-center text-xs font-medium text-blue-700 hover:text-blue-900"
               >
                 <span className="mr-1">{isPrecisionExplanationOpen ? 'Hide' : 'Show'} Explanation for Precision (γ)</span>
                 {isPrecisionExplanationOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
               </button>
               {isPrecisionExplanationOpen && (
                 <div className="mt-1 text-xs">
                   <p className="text-gray-600 mb-2 text-center">Precision (<InlineMath math="\gamma"/>) weights the EFE in the softmax function <InlineMath math="q(\pi) \propto e^{-\gamma G(\pi)}"/>. Higher values make the agent more deterministically choose the policy with the absolute lowest EFE. Lower values lead to more stochastic choices, exploring policies even if they aren't optimal.</p>
                    <PrecisionExplanationViz currentPrecision={precision} />
                 </div>
               )}
             </div>
         </div>
    </div>
  );
} 