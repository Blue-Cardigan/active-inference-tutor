'use client';

import React, { useState, useEffect } from 'react';
import InlineMath from '@matejmazur/react-katex';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';

// --- Component Definition ---
export default function PolicyComparisonViz() {
  // --- State Space & Parameters ---
  const states = ['A', 'B', 'C']; // Simplified states
  const actions = ['X', 'Y']; // Simplified actions
  const timeHorizon = 3; // Planning horizon

  // Define some example policies (sequences of action indices 0 or 1)
  const examplePolicies = [
    { id: 1, name: 'Policy α (X, X, X)', sequence: [0, 0, 0] },
    { id: 2, name: 'Policy β (X, Y, X)', sequence: [0, 1, 0] },
    { id: 3, name: 'Policy γ (Y, X, Y)', sequence: [1, 0, 1] },
    { id: 4, name: 'Policy δ (Y, Y, Y)', sequence: [1, 1, 1] },
  ];

  // --- Component State ---
  const [policyData, setPolicyData] = useState<any[]>([]);
  const [precision, setPrecision] = useState(1.0);

  // --- EFE Calculation (Simulated) ---
  // In a real scenario, this would involve complex calculations.
  // Here, we simulate EFE based on policy structure for illustration.
  const simulateEFE = (policySequence: number[]) => {
    let efe = 0;
    // Simple heuristic: Penalize switching actions (more complex policy)
    // Penalize action 'Y' slightly more (assume 'X' is slightly preferred)
    for (let i = 0; i < policySequence.length; i++) {
      efe += policySequence[i] === 1 ? 1.2 : 0.8; // Base cost for Y vs X
      if (i > 0 && policySequence[i] !== policySequence[i-1]) {
        efe += 0.5; // Penalty for switching
      }
    }
    return efe / timeHorizon; // Average EFE per step
  };

  // --- Update Policy Data ---
  useEffect(() => {
    const calculatedData = examplePolicies.map(p => ({
      ...p,
      efe: simulateEFE(p.sequence)
    }));
    
    // Calculate probabilities using softmax
    const efes = calculatedData.map(p => p.efe);
    const minEfe = Math.min(...efes);
    const weightedEFEs = efes.map(efe => Math.exp(-precision * (efe - minEfe))); // Shift by min for numerical stability
    const sumWeightedEFEs = weightedEFEs.reduce((a, b) => a + b, 0);

    const finalData = calculatedData.map((p, i) => ({
      ...p,
      probability: sumWeightedEFEs > 0 ? weightedEFEs[i] / sumWeightedEFEs : 1 / calculatedData.length,
      efeLabel: p.efe.toFixed(2),
      probLabel: `${((sumWeightedEFEs > 0 ? weightedEFEs[i] / sumWeightedEFEs : 1 / calculatedData.length) * 100).toFixed(1)}%`
    }));

    setPolicyData(finalData);

  }, [precision]);
  
  // --- Custom Tooltip for Bar Chart ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow text-xs">
          <p className="font-medium">{`${data.name}`}</p>
          <p>{`Action Sequence: ${data.sequence.map((a: number) => actions[a]).join(', ')}`}</p>
          <p>{`Simulated EFE: ${data.efe.toFixed(2)}`}</p>
          <p>{`Probability: ${(data.probability * 100).toFixed(1)}%`}</p>
        </div>
      );
    }
    return null;
  };

  // --- Render ---
  return (
    <div className="my-6 p-4 border border-gray-300 rounded-lg bg-white text-sm">
      <h3 className="text-lg font-semibold mb-4 text-center">Visualization: Planning as Policy Selection</h3>
      
      {/* Explanation */}
      <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200 text-xs">
        <p>Active Inference involves considering multiple possible future action sequences (policies). Each policy is evaluated based on its Expected Free Energy (EFE). Policies with lower EFE are preferred.</p>
        <p className="mt-1">This visualization shows several example policies over a short time horizon. We simulate EFE values (lower is better) and calculate the probability of selecting each policy using the softmax function, influenced by the precision parameter γ.</p>
         <div className="mt-1 text-xs flex items-center">
          <span className="font-medium mr-2">Formula:</span>
          <InlineMath math="q(\pi) = \sigma(-\gamma G(\pi)) = \frac{e^{-\gamma G(\pi)}}{\sum_{\pi'} e^{-\gamma G(\pi')}}" />
        </div>
      </div>
      
      {/* Controls */}
      <div className="mb-4 p-3 bg-gray-50 rounded border">
         <label className="block text-xs font-medium mb-1">
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
            Adjust precision to see how it affects the confidence in selecting the best policy.
          </p>
      </div>
      
      {/* Policy Table */}
      <div className="mb-4 overflow-x-auto">
         <h4 className="text-xs font-medium mb-1">Example Policies & Sequences:</h4>
         <table className="min-w-full text-xs border-collapse">
           <thead>
             <tr className="bg-gray-100">
               <th className="border p-1 text-left">Policy Name</th>
               {Array.from({ length: timeHorizon }).map((_, t) => (
                 <th key={t} className="border p-1">Action (t={t+1})</th>
               ))}
             </tr>
           </thead>
           <tbody>
             {examplePolicies.map(p => (
               <tr key={p.id}>
                 <td className="border p-1 font-medium">{p.name}</td>
                 {p.sequence.map((actionIndex, t) => (
                   <td key={t} className="border p-1 text-center">{actions[actionIndex]}</td>
                 ))}
               </tr>
             ))}
           </tbody>
         </table>
       </div>
      
      {/* EFE and Probability Chart */}
      <div className="h-64">
        <h4 className="text-xs font-medium mb-1 text-center">Policy Evaluation: EFE & Probability</h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={policyData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={40} />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" tick={{ fontSize: 10 }} label={{ value: 'Simulated EFE', angle: -90, position: 'insideLeft', fontSize: 10, offset: 10 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tick={{ fontSize: 10 }} domain={[0, 1]} tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} label={{ value: 'Probability', angle: 90, position: 'insideRight', fontSize: 10, offset: 10 }}/>
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(200, 200, 240, 0.2)' }}/>
            <Legend verticalAlign="top" height={30} wrapperStyle={{fontSize: "10px"}} />
            <Bar yAxisId="left" dataKey="efe" name="Simulated EFE" fill="#8884d8" barSize={30}>
               <LabelList dataKey="efeLabel" position="top" style={{ fontSize: '9px', fill: '#555' }} />
            </Bar>
             <Bar yAxisId="right" dataKey="probability" name="Probability q(π)" fill="#82ca9d" barSize={30}>
               <LabelList dataKey="probLabel" position="top" style={{ fontSize: '9px', fill: '#555' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Explanation */}
      <div className="mt-4 text-xs text-gray-600 p-3 bg-gray-50 rounded border">
        <p>The chart shows the simulated Expected Free Energy (EFE - lower is better, purple bars) and the resulting probability (<InlineMath math="q(\pi)"/> - higher is better, green bars) for each policy. As you increase precision, the probability becomes more concentrated on the policy with the lowest EFE.</p>
      </div>
    </div>
  );
} 