'use client';

import React from 'react';
import InlineMath from '@matejmazur/react-katex';
import BlockMath from '@matejmazur/react-katex';
import { ArrowRight } from 'lucide-react';

// Helper for highlighting parts of the formula - uses KaTeX color commands
const color1 = 'blue';     // for q(s)
const color2 = 'red';      // for p(s|o)
const color3 = 'green';    // for p(o)
const color4 = 'purple';   // for KL divergence
const color5 = 'orange';   // for surprise

export default function ErrorSurpriseVisualization() {
  // Define the formulas with color highlighting
  const step1_formula = "F = E_{q(s)}[\\log q(s) - \\log p(o,s)]";
  const step2_formula = `F = E_{q(s)}[\\log {\\color{${color1}} q(s)} - \\log ({\\color{${color2}} p(s|o)}{\\color{${color3}} p(o)})]`;
  const step3_formula = `F = E_{q(s)}[\\log {\\color{${color1}} q(s)} - \\log {\\color{${color2}} p(s|o)} - \\log {\\color{${color3}} p(o)}]`;
  const step4_formula = `F = {\\color{${color4}} \\underbrace{E_{q(s)}[\\log \\frac{q(s)}{p(s|o)}]}_{\\text{Approximation Error (KL)}}} + {\\color{${color5}} \\underbrace{(-\\log p(o))}_{\\text{Surprise}}}`;

  return (
    <div className="my-6 p-6 border rounded-lg bg-white shadow-sm">
      <h4 className="text-lg font-semibold mb-4 text-center">Decomposition 2: Approximation Error vs. Surprise</h4>
      
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

        {/* Step 2: Different product rule expansion */}
        <div className="p-3 border rounded bg-gray-50 text-center">
          <p className="text-sm font-medium mb-1">Expand <InlineMath math="p(o,s)"/> using Bayes' rule</p>
          <BlockMath math={step2_formula} />
          <p className="text-xs text-gray-500 mt-1">
            <span style={{ color: color2 }}>True posterior</span> × 
            <span style={{ color: color3 }}> Evidence</span>
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
              <p style={{ color: color4 }} className="font-medium">Approximation Error</p>
              <p>KL divergence between<br/><InlineMath math="q(s)"/> and <InlineMath math="p(s|o)"/></p>
            </div>
            <div className="p-2 rounded bg-white">
              <p style={{ color: color5 }} className="font-medium">Surprise Term</p>
              <p>Negative log evidence<br/><InlineMath math="-\log p(o)"/></p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
        <h5 className="text-sm font-medium mb-2 text-center">Key Insight</h5>
        <p className="text-xs text-center">
          Since KL divergence is always non-negative (<InlineMath math="KL \geq 0"/>), this form proves 
          that <InlineMath math="F \geq -\log p(o)"/>. Free Energy is an upper bound on surprise.
          <br/><br/>
          When the approximate posterior <InlineMath math="q(s)"/> equals the true posterior <InlineMath math="p(s|o)"/>, 
          the KL term becomes zero and <InlineMath math="F = -\log p(o)"/>.
        </p>
      </div>
    </div>
  );
} 