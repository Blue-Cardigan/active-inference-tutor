'use client';

import React from 'react';
import InlineMath from '@matejmazur/react-katex';
import BlockMath from '@matejmazur/react-katex';
import { ArrowRight } from 'lucide-react';

// Helper for highlighting parts of the formula - uses KaTeX color commands
const color1 = 'blue';     // for q(s)
const color2 = 'red';      // for p(s)
const color3 = 'green';    // for p(o|s)
const color4 = 'purple';   // for complexity
const color5 = 'orange';   // for accuracy/inaccuracy

export default function ComplexityAccuracyVisualization() {
  // Define the formulas with color highlighting
  const step1_formula = "F = E_{q(s)}[\\log q(s) - \\log p(o,s)]";
  const step2_formula = `F = E_{q(s)}[\\log {\\color{${color1}} q(s)} - \\log ({\\color{${color3}} p(o|s)}{\\color{${color2}} p(s)})]`;
  const step3_formula = `F = E_{q(s)}[\\log {\\color{${color1}} q(s)} - \\log {\\color{${color2}} p(s)} - \\log {\\color{${color3}} p(o|s)}]`;
  const step4_formula = `F = {\\color{${color4}} \\underbrace{E_{q(s)}[\\log \\frac{q(s)}{p(s)}]}_{\\text{Complexity}}} {\\color{${color5}} \\underbrace{- E_{q(s)}[\\log p(o|s)]}_{\\text{Inaccuracy}}}`;

  return (
    <div className="my-6 p-6 border rounded-lg bg-white shadow-sm">
      <h4 className="text-lg font-semibold mb-4 text-center">Decomposition 1: Complexity vs. Accuracy</h4>
      
      <div className="flex flex-col space-y-4">
        {/* Step 1: Original Form */}
        <div className="p-3 border rounded bg-gray-50 text-center">
          <p className="text-sm font-medium mb-1">Starting Form</p>
          <BlockMath math={step1_formula} />
          <p className="text-xs text-gray-500 mt-1">Free Energy as expected log-ratio</p>
        </div>

        <div className="flex justify-center">
          <ArrowRight size={24} className="text-gray-400"/>
        </div>

        {/* Step 2: Expand joint probability */}
        <div className="p-3 border rounded bg-gray-50 text-center">
          <p className="text-sm font-medium mb-1">Expand <InlineMath math="p(o,s)"/> using product rule</p>
          <BlockMath math={step2_formula} />
          <p className="text-xs text-gray-500 mt-1">
            <span style={{ color: color3 }}>Likelihood</span> × 
            <span style={{ color: color2 }}> Prior</span>
          </p>
        </div>

        <div className="flex justify-center">
          <ArrowRight size={24} className="text-gray-400"/>
        </div>

        {/* Step 3: Log property */}
        <div className="p-3 border rounded bg-gray-50 text-center">
          <p className="text-sm font-medium mb-1">Apply logarithm property: <InlineMath math="\log(ab) = \log(a) + \log(b)"/></p>
          <BlockMath math={step3_formula} />
        </div>

        <div className="flex justify-center">
          <ArrowRight size={24} className="text-gray-400"/>
        </div>

        {/* Step 4: Final decomposition */}
        <div className="p-3 border rounded bg-blue-50 text-center shadow-md">
          <p className="text-sm font-medium mb-1">Reorganize Terms</p>
          <BlockMath math={step4_formula} />
          <div className="flex justify-around mt-3 text-xs">
            <div className="p-2 rounded bg-white">
              <p style={{ color: color4 }} className="font-medium">Complexity Term</p>
              <p>How much beliefs changed<br/>from prior</p>
            </div>
            <div className="p-2 rounded bg-white">
              <p style={{ color: color5 }} className="font-medium">Accuracy Term</p>
              <p>How well beliefs predict<br/>observations</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-600 mt-4">
        Free Energy minimization balances these competing terms: find the simplest explanation (low complexity) that adequately explains the data (high accuracy).
      </p>
    </div>
  );
} 