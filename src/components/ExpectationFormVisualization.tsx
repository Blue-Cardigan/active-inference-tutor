'use client';

import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import { ArrowRight } from 'lucide-react';

// Helper for highlighting parts of the formula - uses KaTeX color commands
const color1 = 'blue'; // for q(s)
const color2 = 'teal'; // for the ratio
const color3 = 'purple'; // for the Expectation operator

export default function ExpectationFormVisualization() {

  const step1_formula = '-\\log \\sum_s p(o,s)';
  // Using \textcolor{}{} for highlighting
  const step2_formula = `-\\log \\sum_s {\\color{${color1}} q(s)} {\\color{${color2}} \\frac{p(o,s)}{\\color{${color1}} q(s)}}`;
  const step3_formula = `-\\log {\\color{${color3}} E_{q(s)}} \\left[ {\\color{${color2}} \\frac{p(o,s)}{q(s)}} \\right]`;

  return (
    <div className="my-6 p-4 border rounded bg-gray-50">
      <h4 className="text-lg font-semibold mb-4 text-center">Derivation Step: Introducing Expectation</h4>
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
        {/* Step 1: Original Form */}
        <div className="p-3 border rounded bg-white text-center shadow-sm min-w-[180px]">
          <p className="text-sm font-medium mb-1">Start</p>
          <BlockMath math={step1_formula} />
          <p className="text-xs text-gray-500 mt-1">Log of sum over states</p>
        </div>

        <div className="text-2xl text-gray-500 mx-2 transform rotate-90 md:rotate-0"><ArrowRight size={24}/></div>

        {/* Step 2: Introduce q(s) */}
        <div className="p-3 border rounded bg-white text-center shadow-sm min-w-[240px]">
           <p className="text-sm font-medium mb-1">Multiply & Divide by <InlineMath math="q(s)"/> </p>
           <BlockMath math={step2_formula} />
          <p className="text-xs text-gray-500 mt-1">
             Compare to <InlineMath math="\sum_x q(x) f(x)"/>: <br/>
             <span style={{ color: color1 }}>q(s)</span> is the probability (<InlineMath math="q(x)"/>), <br/>
             <span style={{ color: color2 }}>ratio</span> is the function (<InlineMath math="f(x)"/>).
            </p>
        </div>

        <div className="text-2xl text-gray-500 mx-2 transform rotate-90 md:rotate-0"><ArrowRight size={24}/></div>

        {/* Step 3: Expectation Form */}
        <div className="p-3 border rounded bg-white text-center shadow-sm min-w-[220px]">
          <p className="text-sm font-medium mb-1">Recognize Expectation</p>
          <BlockMath math={step3_formula} />
           <p className="text-xs text-gray-500 mt-1">
             <span style={{ color: color3 }}>Expectation</span> of the <span style={{ color: color2 }}>ratio</span> under <InlineMath math="q(s)"/>
          </p>
        </div>
      </div>
      <p className="text-center text-xs text-gray-600 mt-4">
         This manipulation allows us to apply Jensen's Inequality later.
       </p>
    </div>
  );
} 