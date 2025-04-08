'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import 'katex/dist/katex.min.css';
import InlineMath from '@matejmazur/react-katex';
import BlockMath from '@matejmazur/react-katex';
import { ArrowRight } from 'lucide-react';
import { Utensils, ShieldAlert, Home, Brain, Cloudy, Sun, Pause, Play } from 'lucide-react';

// Create a safer Math component that won't conflict with native Math
const MathFormula = ({ inline, formula }: { inline?: boolean; formula: string }) => {
  const Component = inline ? InlineMath : BlockMath;
  // For block math, add some styling
  if (!inline) {
    return (
        <div className="my-2 p-2 flex justify-center">
             <Component math={formula} />
        </div>
    );
  }
  return <Component math={formula} />;
};

// Helper for arrows
const Arrow = () => <ArrowRight className="inline-block mx-1 text-blue-600" size={18} />;

// Keep BayesianInference for general concept if needed later, but focus on sequential update for now
const BayesianInference = dynamic(
  () => import('@/components/BayesianInference'),
  { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center">Loading visualization...</div> }
);

const FreeEnergyVisualization = dynamic(
  () => import('@/components/FreeEnergyVisualization'),
  { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center">Loading visualization...</div> }
);

const SurpriseVisualization = dynamic(
  () => import('@/components/SurpriseVisualization'),
  { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center">Loading visualization...</div> }
);

const PolicySelectionVisualization = dynamic(
  () => import('@/components/PolicySelectionVisualization'),
  { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center">Loading visualization...</div> }
);

const BayesUpdateVisualization = dynamic(
  () => import('@/components/BayesUpdateVisualization'),
  { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center">Loading visualization...</div> }
);

const GenerativeProcessDiagram = dynamic(
  () => import('@/components/GenerativeProcessDiagram'),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center">Loading diagram...</div> }
);

const GenerativeModelDiagram = dynamic(
  () => import('@/components/GenerativeModelDiagram'),
  { ssr: false, loading: () => <div className="h-[300px] flex items-center justify-center">Loading diagram...</div> }
);

const FruitDistributionPlot = dynamic(
  () => import('@/components/FruitDistributionPlot'),
  { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center">Loading plot...</div> }
);

// Import the new visualization
const ModelEvidenceVisualization = dynamic(
    () => import('@/components/ModelEvidenceVisualization'),
    { ssr: false, loading: () => <div className="h-[450px] flex items-center justify-center">Loading visualization...</div> }
);

// Dynamically import visualizations to reduce initial load
const IntroduceQVisualization = dynamic(() => import('@/components/IntroduceQVisualization'), { ssr: false });
const ExpectationFormVisualization = dynamic(() => import('@/components/ExpectationFormVisualization'), { ssr: false });
const JensensInequalityVisualization = dynamic(() => import('@/components/JensensInequalityVisualization'), { ssr: false });

// Import new decomposition visualizations
const ComplexityAccuracyVisualization = dynamic(() => import('@/components/ComplexityAccuracyVisualization'), { ssr: false });
const ErrorSurpriseVisualization = dynamic(() => import('@/components/ErrorSurpriseVisualization'), { ssr: false });

// Import the new Hunger Example visualization
const HungerExampleVisualization = dynamic(() => import('@/components/HungerExampleVisualization'), { ssr: false, loading: () => <div className="h-[600px] flex items-center justify-center">Loading interactive example...</div> });

// Import the Precision Explanation visualization
const PrecisionExplanationViz = dynamic(() => import('@/components/PrecisionExplanationViz'), { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center">Loading precision visualization...</div> });

// Import the new visualizations for time, action, and policies
const DynamicWorldViz = dynamic(() => import('@/components/DynamicWorldViz'), { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center">Loading time visualization...</div> });
const ActionInfluenceViz = dynamic(() => import('@/components/ActionInfluenceViz'), { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center">Loading action visualization...</div> });
const PolicyComparisonViz = dynamic(() => import('@/components/PolicyComparisonViz'), { ssr: false, loading: () => <div className="h-[500px] flex items-center justify-center">Loading policy visualization...</div> });

// Local component: ConvexityExplanation
const ConvexityExplanation = () => (
    <div className="my-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center prose-sm">
        <p><strong>Jensen's Inequality (Convexity):</strong> For a convex function <MathFormula inline formula="f"/> (like <MathFormula inline formula="-\log(x)"/>) and a random variable <MathFormula inline formula="X"/> with distribution <MathFormula inline formula="q(X)"/>, the inequality <MathFormula inline formula="f(E_q[X]) \leq E_q[f(X)]"/> holds. </p>
        <p>Applying this to <MathFormula inline formula="X = p(o,s)/q(s)"/> and <MathFormula inline formula="f = -\log"/> allows us to establish that Free Energy (<InlineMath math="F = E_{q(s)}[-\log \frac{p(o,s)}{q(s)}]"/>) is an upper bound on Surprise (<InlineMath math="-\log p(o) = -\log E_{q(s)}[\frac{p(o,s)}{q(s)}]"/>).</p>
    </div>
);

// Import the NEW Interactive Grid World visualization
const InteractiveGridWorld = dynamic(() => import('@/components/InteractiveGridWorld'), { ssr: false, loading: () => <div className="h-[600px] flex items-center justify-center">Loading interactive grid world...</div> });

export default function ActiveInferenceTutorialPage() {
  // State for Probability Distribution visualization (kept for general concept)
  const [mean, setMean] = useState(0.5);
  const [stdDev, setStdDev] = useState(0.2);
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);

  // State for Surprise visualization
  const [selectedProbability, setSelectedProbability] = useState(0.5);

  // State for Policy Selection visualization (using example policies)
  const [policies, setPolicies] = useState([
    { id: 1, name: "Policy A", expectedFreeEnergy: 2.5, probability: 0.22 },
    { id: 2, name: "Policy B", expectedFreeEnergy: 1.8, probability: 0.41 },
    { id: 3, name: "Policy C", expectedFreeEnergy: 3.2, probability: 0.13 },
    { id: 4, name: "Policy D", expectedFreeEnergy: 2.1, probability: 0.24 }
  ]);
  const [precision, setPrecision] = useState(1.0); // Gamma parameter

  // State for Sequential Bayesian Update visualization
  const [priorBelief, setPriorBelief] = useState(0.3); // Initial prior
  const [likelihood, setLikelihood] = useState(0.7); // Likelihood of evidence given hypothesis
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [posteriorHistory, setPosteriorHistory] = useState<number[]>([0.3]);

  // Effect for Probability Distribution points calculation
  useEffect(() => {
    const newPoints = [];
    const scaleFactor = 1 / (stdDev * Math.sqrt(2 * Math.PI));
    for (let x = 0; x <= 1; x += 0.01) {
      const y = scaleFactor * Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
      newPoints.push({ x, y: Math.min(y, 5) }); // Clamp y
    }
    const maxY = newPoints.reduce((max, p) => Math.max(max, p.y), 0);
    const scaledPoints = newPoints.map(p => ({ x: p.x, y: maxY > 0 ? 1 - (p.y / maxY) * 0.9 : 0.5 })); // Scale and invert for canvas
    setPoints(scaledPoints);
  }, [mean, stdDev]);

  // Effect for policy probability calculation based on EFE and precision (gamma)
  useEffect(() => {
    const efes = policies.map(p => p.expectedFreeEnergy);
    const weightedEFEs = efes.map(efe => Math.exp(-precision * efe)); // precision is gamma
    const sumWeightedEFEs = weightedEFEs.reduce((a, b) => a + b, 0);

    let newProbabilities;
    if (sumWeightedEFEs > 0) {
        newProbabilities = weightedEFEs.map(w => w / sumWeightedEFEs);
    } else {
        // Handle case where all probabilities might be zero (e.g., extremely high EFEs)
        const numPolicies = policies.length;
        newProbabilities = Array(numPolicies).fill(1 / numPolicies); // Assign uniform probability
    }

    // Only update if probabilities actually changed to avoid infinite loops if EFEs don't change
     if (JSON.stringify(policies.map(p => p.probability)) !== JSON.stringify(newProbabilities)) {
        setPolicies(prevPolicies => prevPolicies.map((policy, i) => ({
            ...policy,
            probability: newProbabilities[i]
        })));
     }

    // Dependency array focuses on precision and the EFE values themselves
  }, [precision, policies.map(p => p.expectedFreeEnergy).join(',')]); // Join EFE values into a string

  // Bayesian update function for the sequential visualization
  const updatePosterior = useCallback(() => {
    // Simple Bayesian update: posterior ∝ prior × likelihood
    // P(h|e) = [P(e|h) * P(h)] / P(e)
    // P(e) = P(e|h) * P(h) + P(e|~h) * P(~h)
    // Assume P(e|~h) = 1 - P(e|h) for this simple binary example
    const numerator = likelihood * priorBelief;
    const evidence = (likelihood * priorBelief) + ((1 - likelihood) * (1 - priorBelief));
    // Avoid division by zero
    const newPosterior = evidence > 0 ? numerator / evidence : priorBelief;

    // Update history and set new prior
    setPosteriorHistory(prev => [...prev, newPosterior]);
    setPriorBelief(newPosterior); // Posterior becomes the new prior
    setEvidenceCount(prev => prev + 1);
  }, [priorBelief, likelihood]);

  return (
    <article className="prose prose-lg max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Active Inference: A Primer</h1>

      {/* Display the generated SVG icon */}
      <div className="flex justify-center my-6">
          <img src="/icons/active-inference-icon.svg" alt="Active Inference Cycle Icon" width="80" height="80" />
      </div>

      <p className="mb-4">
        Active Inference is a theoretical framework originating from neuroscience, aiming to provide a unified account of perception, action, learning, and decision-making under a single principle: <strong>Free Energy Minimization</strong>. It posits that biological agents (like brains) act to minimize their long-term average surprise, which is equivalent to maximizing the evidence for their internal model of the world.
      </p>

      {/* Table of Contents */}
      <div className="bg-gray-50 p-6 mb-10 rounded-lg not-prose text-sm">
        <h2 className="text-2xl font-semibold mb-4">Contents</h2>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 list-none pl-0">
          <li><a href="#motivation" className="text-blue-700 hover:text-blue-900 hover:underline">Motivation: Staying Alive</a></li>
          <li><a href="#generative-process" className="text-blue-700 hover:text-blue-900 hover:underline">Generative Process vs. Model</a></li>
          <li><a href="#bayesian-intro" className="text-blue-700 hover:text-blue-900 hover:underline">Bayesian Inference Basics</a></li>
          <li><a href="#example" className="text-blue-700 hover:text-blue-900 hover:underline">Example: Fruit Trees & Model Evidence</a></li>
          <li><a href="#model-evidence-surprise" className="text-blue-700 hover:text-blue-900 hover:underline">Model Evidence & Surprise</a></li>
          <li><a href="#free-energy-intro" className="text-blue-700 hover:text-blue-900 hover:underline">Free Energy: A Tractable Bound</a></li>
          <li><a href="#free-energy-derivation" className="text-blue-700 hover:text-blue-900 hover:underline">Deriving Free Energy</a></li>
          <li><a href="#free-energy-decomposition" className="text-blue-700 hover:text-blue-900 hover:underline">Decomposing Free Energy</a></li>
          <li><a href="#dynamic-world" className="text-blue-700 hover:text-blue-900 hover:underline">Dynamic World & Perception</a></li>
          <li><a href="#active-inference" className="text-blue-700 hover:text-blue-900 hover:underline">Active Inference: Adding Action</a></li>
          <li><a href="#planning" className="text-blue-700 hover:text-blue-900 hover:underline">Planning as Policy Selection</a></li>
          <li><a href="#efe" className="text-blue-700 hover:text-blue-900 hover:underline">Expected Free Energy (EFE)</a></li>
          <li><a href="#efe-decomposition" className="text-blue-700 hover:text-blue-900 hover:underline">Decomposing EFE</a></li>
          <li><a href="#minimal-example" className="text-blue-700 hover:text-blue-900 hover:underline">Minimalistic Example</a></li>
          <li><a href="#action-selection" className="text-blue-700 hover:text-blue-900 hover:underline">Action Selection</a></li>
          <li><a href="#summary" className="text-blue-700 hover:text-blue-900 hover:underline">Summary & The Big Picture</a></li>
          <li><a href="#learning-limitations" className="text-blue-700 hover:text-blue-900 hover:underline">Learning & Limitations</a></li>
          <li><a href="#applications" className="text-blue-700 hover:text-blue-900 hover:underline">Applications</a></li>
        </ul>
      </div>

      <hr className="my-10 border-gray-300" />

      <h2 id="motivation" className="text-3xl font-bold mb-6">Motivation: Staying Alive</h2>
      <p className="mb-4">
        The fundamental drive, from this perspective, is survival. Biological agents strive to maintain themselves within viable physiological bounds (homeostasis). States outside these bounds (e.g., extreme temperature, low oxygen) are 'surprising' in a statistical sense – they are states the organism is not adapted to and rarely encounters while viable.
      </p>
      <p>
        However, an agent doesn't directly perceive its internal physiological state; it only has access to sensory observations (<MathFormula inline formula="o"/>). Therefore, to avoid surprising <strong>internal</strong> states, the agent must minimize the surprise associated with its <strong>sensory</strong> observations. Minimizing sensory surprise turns out to be equivalent to building a better predictive model of the world, because accurate predictions lead to less surprising observations.
      </p>
      <p className="flex items-center flex-wrap font-medium bg-gray-100 p-3 rounded my-4">
        Chain of reasoning: Remain alive <Arrow/> Maintain homeostasis <Arrow/> Avoid surprising (non-viable) states <Arrow/> Avoid surprising sensory observations <Arrow/> Minimize an approximation to surprise (Free Energy).
      </p>
      <p>
        This tutorial delves into the mechanics, requiring only a basic grasp of probability and Bayes' theorem.
      </p>

      <hr className="my-10 border-gray-300" />

      <h2 id="generative-process" className="text-3xl font-bold mb-6">Generative Process vs. Generative Model</h2>
      <p>
        We distinguish between two key concepts:
      </p>
      <ul className="list-disc pl-6 space-y-2 my-4">
          <li><strong>Generative Process (<MathFormula inline formula="P(s,o)"/> or <MathFormula inline formula="R(s,o)"/>):</strong> This is how the actual environment works. Hidden states (<MathFormula inline formula="s"/>) in the world cause sensory observations (<MathFormula inline formula="o"/>). The agent doesn't have direct access to <MathFormula inline formula="s"/>. Example: It rained last night (<InlineMath math="s"/>, hidden state), causing the grass to be wet (<InlineMath math="o"/>, observation). The uppercase <InlineMath math="P"/> denotes the true, objective probabilities of the world.</li>
          <li><strong>Generative Model (<MathFormula inline formula="p(s,o)"/>):</strong> This is the agent's internal, subjective model of how it <strong>thinks</strong> the environment works. The agent uses this model to infer the hidden states (<InlineMath math="s"/>) that likely caused its current observations (<InlineMath math="o"/>) via <MathFormula inline formula="p(s|o)"/>, using its prior beliefs (<InlineMath math="p(s)"/>) and its understanding of how states cause observations (the likelihood, <InlineMath math="p(o|s)"/>). The lowercase <InlineMath math="p"/> signifies the agent's potentially inaccurate beliefs.</li>
      </ul>
      <div className="my-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col md:flex-row justify-around items-center gap-4">
        <div className="text-center mb-4 md:mb-0">
            <h3 className="font-semibold text-lg">Generative Process (World)</h3>
            <GenerativeProcessDiagram width={300} height={200} />
            <p className="text-sm italic"><MathFormula inline formula="P(s) \rightarrow P(o|s)"/></p>
        </div>
        <div className="text-center">
            <h3 className="font-semibold text-lg">Generative Model (Agent)</h3>
            <GenerativeModelDiagram width={300} height={200} />
             <p className="text-sm italic"><MathFormula inline formula="p(s), p(o|s) \rightarrow p(s|o)"/></p>
        </div>
      </div>
      <p>
        Active inference is about aligning the generative model (<MathFormula inline formula="p"/>) with the generative process (<MathFormula inline formula="P"/>) through perception (updating beliefs) and action (changing the world to match beliefs).
      </p>

      <hr className="my-10 border-gray-300" />


      <h2 id="bayesian-intro" className="text-3xl font-bold mb-6">Bayesian Inference Basics</h2>
      <p>
        At the heart of Active Inference lies Bayesian belief updating. The brain is thought to constantly refine its understanding of the world (its generative model) by combining prior beliefs with new sensory evidence using Bayes' rule:
      </p>
      <MathFormula inline={false} formula="\underbrace{p(s|o)}_{\text{Posterior}} = \frac{\overbrace{p(o|s)}^{\text{Likelihood}} \cdot \overbrace{p(s)}^{\text{Prior}}}{\underbrace{p(o)}_{\text{Evidence}}}" />
      <p>
         The posterior belief about the hidden state (<InlineMath math="s"/>) given an observation (<InlineMath math="o"/>) becomes the prior for the next observation, enabling continuous learning.
      </p>

      {/* Sequential Bayesian Update Visualization */}
        <div className="my-12 p-8 rounded-lg shadow-md bg-gray-50 not-prose text-gray-800">
        <h3 className="text-2xl font-semibold mb-4 text-center">Sequential Bayesian Updates</h3>
        
        {/* First visualization - Conceptual probability distributions */}
        <div className="mb-8">
          <p className="text-base mb-4 text-center">
            Below you can see how the prior belief (blue) and likelihood (green) combine to form the posterior belief (red).
            Drag the circles to adjust the distributions and see how they interact in Bayesian updating.
          </p>
          <div className="flex justify-center mb-2">
            <BayesianInference width={500} height={250} />
          </div>
          <p className="text-sm text-center text-gray-600">
            The posterior (red) is proportional to the product of the prior (blue) and likelihood (green).
          </p>
        </div>
        
        {/* Second visualization - Sequential updates over time */}
        <div>
          <p className="text-base mb-4 text-center">
            Observe how beliefs evolve over time as new evidence arrives. Adjust the likelihood of making an observation given a particular state (<InlineMath math="P(o|s)"/>) and click 'Update'. The posterior from one step becomes the prior for the next.
          </p>
          <div className="flex justify-center mb-6">
            <BayesUpdateVisualization
              priorBelief={priorBelief}
              likelihood={likelihood}
              posteriorHistory={posteriorHistory}
              evidenceCount={evidenceCount}
              width={500}
              height={250}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-base font-medium mb-2">Likelihood (P(o|s)): {likelihood.toFixed(2)}</label>
              <input
                type="range"
                min="0.01"
                max="0.99"
                step="0.01"
                value={likelihood}
                onChange={(e) => setLikelihood(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={updatePosterior}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Update ({evidenceCount})
              </button>
              <button
                onClick={() => {
                  setPriorBelief(0.3); // Reset to initial prior
                  setPosteriorHistory([0.3]);
                  setEvidenceCount(0);
                }}
                className="ml-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-10 border-gray-300" />

      <h2 id="example" className="text-3xl font-bold mb-6">Example: Fruit Trees & Model Evidence</h2>
      <p>
        Imagine an orchard with apple (<MathFormula inline formula="s=\text{apple}"/>) and orange (<MathFormula inline formula="s=\text{orange}"/>) trees. The fruit type (<InlineMath math="s"/>) is hidden. We observe features like location or size/sweetness (<InlineMath math="o"/>). Let's say the true distribution (Generative Process <InlineMath math="P"/>) has 70% oranges and 30% apples, and they fall in slightly different locations.
      </p>
      <div className="my-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <FruitDistributionPlot width={500} height={400} />
        <p className="text-center text-sm italic mt-2">Visualizing potential locations (<InlineMath math="o"/>) for apples and oranges (<InlineMath math="s"/>).</p>
      </div>
      <p>
        The agent's tasks within its Generative Model (<InlineMath math="p"/>) are:
      </p>
       <ul className="list-disc pl-6 space-y-2 my-4">
        <li><strong>Inference:</strong> Given an observation (fruit location <InlineMath math="o"/>), infer the probability it's an apple or orange (<MathFormula inline formula="p(s|o)"/>). This uses Bayes' rule: <MathFormula inline formula="p(s|o) \propto p(o|s)p(s)"/>.</li>
        <li><strong>Learning:</strong> Estimate the model parameters – the prior probability of fruit types (<InlineMath math="p(s)"/>, e.g., initially believing 50/50) and the likelihood of observing a location given a fruit type (<InlineMath math="p(o|s)"/>, e.g., the mean/variance of location for apples vs. oranges).</li>
      </ul>
       <p>
        Crucially, performing inference via Bayes' rule requires calculating the denominator, <MathFormula inline formula="p(o)"/>, the probability of the observation itself according to the model:
      </p>
      <MathFormula inline={false} formula="p(o) = \sum_s p(o,s) = \sum_s p(o|s)p(s)" />
       <p>
        This <MathFormula inline formula="p(o)"/> is called the <strong>Model Evidence</strong> (or marginal likelihood). It represents how well the agent's current model (<InlineMath math="p(s)"/> and <InlineMath math="p(o|s)"/>) predicts the observation <InlineMath math="o"/>. A higher <MathFormula inline formula="p(o)"/> indicates a better model fit to the data. Learning aims to adjust model parameters to maximize model evidence <MathFormula inline formula="p(o)"/> over encountered observations.
      </p>
      <p className="text-sm italic">
        (Note: Technically, true model evidence <InlineMath math="p(o|\text{model})"/> involves marginalizing over model parameters too, not just states. We'll simplify for now and treat <InlineMath math="p(o)"/> as the likelihood of parameters given the data, <InlineMath math="p(o|\theta, \text{model})"/>, where <InlineMath math="\theta"/> are the parameters).
      </p>

      {/* Insert the Model Evidence Visualization Here */}
      <div className="my-12 p-4 md:p-8 rounded-lg shadow-md bg-white not-prose text-gray-800 border">
          <h3 className="text-2xl font-semibold mb-4 text-center">Interactive Model Evidence</h3>
          <p className="text-base mb-6 text-center">
              Explore how Model Evidence <InlineMath math="p(o)"/> changes based on the prior beliefs <InlineMath math="P(s)"/> and likelihood models <InlineMath math="P(o|s)"/>. Adjust the sliders for the prior (Apple vs. Orange), the likelihood parameters (mean/std dev for each fruit's size distribution), and the current observation <InlineMath math="o"/> (size). Observe how the likelihoods at the observation point combine with the priors to calculate <InlineMath math="p(o)"/>. Higher <InlineMath math="p(o)"/> means the current observation is more probable under the agent's model.
          </p>
          <ModelEvidenceVisualization />
      </div>

       <hr className="my-10 border-gray-300" />

      <h2 id="model-evidence-surprise" className="text-3xl font-bold mb-6">Model Evidence & Surprise</h2>
      <p>
         As established, the agent wants to maximize its model evidence <MathFormula inline formula="p(o)"/>. This is equivalent to minimizing <strong>Surprise</strong>, defined as the negative log-probability of the observation:
      </p>
       <MathFormula inline={false} formula="\text{Surprise}(o) = -\log p(o)" />
      <p>
        Highly probable observations (high <InlineMath math="p(o)"/>) have low surprise, while very improbable observations (low <InlineMath math="p(o)"/>) have high surprise (approaching infinity as <InlineMath math="p(o) \to 0"/>). Minimizing surprise drives the agent to seek out familiar, predictable sensory states consistent with its model and its existence.
      </p>

       {/* Surprise Visualization */}
       <div className="my-12 p-8 rounded-lg shadow-md bg-gray-50 not-prose text-gray-800">
        <h3 className="text-2xl font-semibold mb-4 text-center">Surprise vs. Probability</h3>
        <p className="text-base mb-4 text-center italic text-gray-700">
          Why <MathFormula inline formula="-\log p"/>? The logarithm is used because it transforms multiplicative probabilities into additive quantities. The surprise of two independent events occurring is the sum of their individual surprises: <MathFormula inline formula="-\log(p_1 p_2) = -\log p_1 - \log p_2"/>. This aligns with the additive nature of information (measured in bits or nats).
        </p>
        <p className="text-base mb-6 text-center">
            Surprise (<MathFormula inline formula="-\log p"/>) quantifies how unexpected an event is. Adjust the probability slider to see the relationship.
        </p>
        <div className="flex justify-center mb-6">
            <SurpriseVisualization
            probability={selectedProbability}
            width={500}
            height={250}
            onProbabilityChange={setSelectedProbability}
            />
        </div>
        <div className="mt-6">
            <label className="block text-base font-medium mb-2">Probability (p): {selectedProbability.toFixed(2)}</label>
            <input
            type="range"
            min="0.01"
            max="0.99"
            step="0.01"
            value={selectedProbability}
            onChange={(e) => setSelectedProbability(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
        </div>
        <div className="mt-4 p-4 bg-white rounded border prose-sm">
            <p>
            Current: Probability = {selectedProbability.toFixed(2)}, Surprise = {(-Math.log(selectedProbability)).toFixed(2)}
            </p>
            <p className="mt-1 text-gray-600">
             Notice the non-linear increase in surprise as probability decreases. Rare events are disproportionately surprising.
            </p>
        </div>
       </div>

       <p>
        However, directly calculating surprise <MathFormula inline formula="-\log p(o) = -\log \sum_s p(o,s)"/> is often computationally intractable (difficult or impossible). Why? Because the sum <MathFormula inline formula="\sum_s"/> might involve summing over an astronomical number of possible hidden states <InlineMath math="s"/>.
      </p>

       <hr className="my-10 border-gray-300" />

       <h2 id="free-energy-intro" className="text-3xl font-bold mb-6">Free Energy: A Tractable Bound on Surprise</h2>
       <p>
        Since calculating surprise directly is hard, Active Inference uses a more manageable quantity called <strong>Variational Free Energy</strong> (<InlineMath math="F"/>) as a proxy. Free Energy provides an <em>upper bound</em> on surprise, meaning <MathFormula inline formula="F \geq -\log p(o)"/>. By minimizing Free Energy (<InlineMath math="F"/>), the agent indirectly minimizes surprise (<InlineMath math="-\log p(o)"/>).
       </p>

       <hr className="my-10 border-gray-300" />

       <h2 id="free-energy-derivation" className="text-3xl font-bold mb-6">Deriving Free Energy</h2>
       <p>
        How do we get this bound? We start with the definition of surprise and introduce an arbitrary probability distribution <MathFormula inline formula="q(s)"/> over the hidden states. This <MathFormula inline formula="q(s)"/> represents the agent's current <strong>belief</strong> or <strong>approximation</strong> to the true posterior belief about the hidden state <InlineMath math="s"/>. Multiplying and dividing inside the logarithm by <MathFormula inline formula="q(s)"/> (which doesn't change the value) is a common technique in variational methods:
       </p>
       {/* Visualization: Introduce Q */}
       <IntroduceQVisualization />
       <MathFormula inline={false} formula="-\log p(o) = -\log \sum_s p(o,s) = -\log \sum_s q(s) \frac{p(o,s)}{q(s)}" />
       <p>
        Recall the definition of <strong>Expectation</strong> (average value) of a function <InlineMath math="f(x)"/> under a probability distribution <InlineMath math="q(x)"/>:
      </p>
      <MathFormula inline={false} formula="E_{q(x)}[f(x)] = \sum_x q(x) f(x)" />
      <p>
        The term inside the logarithm is now an expectation (an average) of the ratio <MathFormula inline formula="\frac{p(o,s)}{q(s)}"/> under the distribution <MathFormula inline formula="q(s)"/>:
      </p>
        {/* Visualization: Expectation Form */}
        <ExpectationFormVisualization />
        <MathFormula inline={false} formula="-\log p(o) = -\log E_{q(s)} \left[ \frac{p(o,s)}{q(s)} \right]" />
       <p>
        Now, we use Jensen's Inequality. This inequality relates the function of an expectation to the expectation of the function. For a convex function <InlineMath math="f"/> (like <InlineMath math="f(x)=-\log(x)"/> which curves upwards), the inequality states that <MathFormula inline formula="f(E[X]) \leq E[f(X)]"/>. The function applied to the average value is less than or equal to the average of the function applied to all values.
        </p>
       <ConvexityExplanation />
        {/* Visualization: Jensen's Inequality */}
        <div className="my-8 flex justify-center">
           <JensensInequalityVisualization />
         </div>
       <p>
        Applying Jensen's Inequality to our surprise expression (with <InlineMath math="f = -\log"/> and <InlineMath math="X = \frac{p(o,s)}{q(s)}"/> under the expectation <InlineMath math="E_{q(s)}[\cdot]"/>):
        </p>
        <div className="flex items-center justify-center my-2">
            <MathFormula inline={false} formula="-\log p(o) = -\log E_{q(s)} \left[ \frac{p(o,s)}{q(s)} \right]" />
            <span className="mx-2 text-2xl font-bold"> ≤ </span>
            <div className="p-2 bg-blue-100 border border-blue-300 rounded">
                <MathFormula inline={false} formula="E_{q(s)} \left[ -\log \frac{p(o,s)}{q(s)} \right]" />
            </div>
        </div>
        <p>
         Using the logarithm property <MathFormula inline formula="-\log(a/b) = \log(b/a)"/>, we arrive at the definition of Variational Free Energy (<InlineMath math="F"/>):
       </p>
        <div className="p-2 bg-blue-100 border border-blue-300 rounded inline-center my-6">
           <MathFormula inline={false} formula="F = E_{q(s)} \left[ \log \frac{q(s)}{p(o,s)} \right] = \sum_s q(s) \log \frac{q(s)}{p(o,s)}" />
        </div>
        <p>
        This <InlineMath math="F"/> is the quantity the agent seeks to minimize. The distribution <MathFormula inline formula="q(s)"/> is called the variational or approximate posterior distribution. The agent can adjust its beliefs <InlineMath math="q(s)"/> (and its model parameters within <InlineMath math="p(o,s)"/>) to make <InlineMath math="F"/> as small as possible, thereby getting a tighter bound on the true surprise and improving its model.
       </p>

       {/* Added Summary */}
       <div className="my-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm prose-sm">
         <h4 className="font-semibold text-center mb-2">Summary So Far</h4>
         <p className="mb-2">
           We started with the goal of minimizing <strong>Surprise</strong> (<MathFormula inline formula="-\log p(o)"/>) to maintain homeostasis and make good predictions. However, calculating Surprise directly by summing over all hidden states (<InlineMath math="\sum_s p(o,s)"/>) is often intractable.
         </p>
         <p className="mb-2">
           To overcome this, we introduced an approximate belief distribution <MathFormula inline formula="q(s)"/> and used <strong>Jensen's Inequality</strong> on the definition of surprise. This allowed us to derive <strong>Variational Free Energy</strong> (<InlineMath math="F"/>) as a computationally tractable <em>upper bound</em> on Surprise (<InlineMath math="F \ge -\log p(o)"/>).
         </p>
         <p className="mb-2">
           Therefore, by minimizing <InlineMath math="F"/>, the agent can indirectly minimize Surprise and improve its model of the world. The next step is to understand the components of <InlineMath math="F"/>.
         </p>
       </div>

       <hr className="my-10 border-gray-300" />

       <h2 id="free-energy-decomposition" className="text-3xl font-bold mb-6">Decomposing Free Energy</h2>
       <p>
        Free Energy can be rearranged into two insightful forms using standard probability rules (<MathFormula inline formula="\color{green}p(o,s) = \color{red}p(s|o)\color{blue}p(o) = \color{purple}p(o|s)\color{orange}p(s)"/>) and properties of logarithms.
       </p>
       <p><strong>Decomposition 1: Complexity and Inaccuracy</strong></p>
       <MathFormula inline={false} formula="F = E_{q(s)}[\log q(s) - \log p(o,s)]" />
       <MathFormula inline={false} formula="F = E_{q(s)}[\log q(s) - \log (p(o|s)p(s))]" />
       <MathFormula inline={false} formula="F = E_{q(s)}[\log q(s) - \log p(s) - \log p(o|s)]" />
       <MathFormula inline={false} formula="F = \color{purple}\underbrace{E_{q(s)}[\log \frac{q(s)}{p(s)}]}_{\text{Complexity}} \color{orange}\underbrace{- E_{q(s)}[\log p(o|s)]}_{\text{Inaccuracy}}" />
       <p>
        Here, Free Energy balances:
       </p>
       <ul className="list-disc pl-6 space-y-2 my-4">
          <li><strong>Complexity:</strong> The KL divergence <MathFormula inline formula="\color{purple}KL[q(s) || p(s)]"/> measures how much the agent's approximate posterior belief <InlineMath math="\color{blue}q(s)"/> diverges from its prior belief <InlineMath math="\color{red}p(s)"/>. Minimizing this encourages simpler explanations that don't stray too far from prior assumptions.</li>
          <li><strong>Inaccuracy:</strong> The expected negative log-likelihood of the observation given the state, under the agent's belief <InlineMath math="q(s)"/>. Minimizing this term (equivalent to maximizing Accuracy, <InlineMath math="\color{orange}E_{q(s)}[\log p(o|s)]"/>) means finding beliefs <InlineMath math="q(s)"/> that make the observation <InlineMath math="o"/> likely.</li>
       </ul>
        <p>Minimizing <InlineMath math="F"/> involves a trade-off: find beliefs <InlineMath math="q(s)"/> that accurately explain the data (<InlineMath math="o"/>) without becoming overly complex (too different from the prior <InlineMath math="p(s)"/>).</p>

       {/* Add the Complexity/Accuracy visualization */}
       <ComplexityAccuracyVisualization />

       <p><strong>Decomposition 2: Approximation Error and Surprise</strong></p>
        <MathFormula inline={false} formula="F = E_{q(s)}[\log q(s) - \log p(o,s)]" />
        <MathFormula inline={false} formula="F = E_{q(s)}[\log q(s) - \log (p(s|o)p(o))]" />
        <MathFormula inline={false} formula="F = E_{q(s)}[\log q(s) - \log p(s|o) - \log p(o)]" />
        <MathFormula inline={false} formula="F = \color{purple}\underbrace{E_{q(s)}[\log \frac{q(s)}{p(s|o)}]}_{\text{Approximation Error (KL)}} + \color{orange}\underbrace{(-\log p(o))}_{\text{Surprise}}" />
       <p>
        This shows:
       </p>
       <ul className="list-disc pl-6 space-y-2 my-4">
          <li><strong>Approximation Error:</strong> The KL divergence <MathFormula inline formula="\color{purple}KL[q(s) || p(s|o)]"/> measures how different the agent's approximate belief <InlineMath math="\color{blue}q(s)"/> is from the true posterior belief <InlineMath math="\color{red}p(s|o)"/> (the ideal Bayesian belief given the observation).</li>
          <li><strong>Surprise:</strong> The actual surprise <MathFormula inline formula="\color{orange}-\log p(o)"/>.</li>
       </ul>
        <p>
            Since KL divergence is always non-negative (<InlineMath math="KL \ge 0"/>), this form clearly shows that <MathFormula inline formula="F \ge -\log p(o)"/>, confirming <InlineMath math="F"/> is an upper bound on surprise. Minimizing <InlineMath math="F"/> with respect to <InlineMath math="q(s)"/> means making the agent's belief <InlineMath math="q(s)"/> as close as possible to the true posterior <InlineMath math="p(s|o)"/>, driving the KL term towards zero. When <InlineMath math="q(s) = p(s|o)"/>, then <InlineMath math="F = -\log p(o)"/>.
        </p>
        <p>
            Furthermore, if the agent can also adjust its model parameters (affecting <InlineMath math="p(o)"/>), minimizing <InlineMath math="F"/> simultaneously improves the model (reduces surprise) and the belief accuracy (reduces KL divergence).
        </p>

        {/* Add the Error/Surprise visualization */}
        <ErrorSurpriseVisualization />

      <hr className="my-10 border-gray-300" />

      {/* NEW SECTION: Dynamic World, Action, Policies, EFE */}
      <h2 id="dynamic-world" className="text-3xl font-bold mb-6">A Dynamic World: Introducing Time</h2>
      <p>
        So far, we dealt with a static situation, with one hidden state and one set of observations, but the real world is dynamic. We perceive and act over time. This means we have hidden states <InlineMath math="s_t"/> and observations <InlineMath math="o_t"/> at each point in time <InlineMath math="t"/>. Since things tend to depend on what has just happened, we assume that the state <InlineMath math="s_t"/> depends on the state at the previous time point, <InlineMath math="s_{t-1}"/>. For example, the probability of seeing a rainbow depends directly on whether it rained before.
      </p>
      {/* Add DynamicWorldViz */}
      <DynamicWorldViz />
      <p>
        The agent's task is still to learn a generative model <InlineMath math="p(o,s)"/> that captures these temporal dependencies (e.g., <InlineMath math="p(s_t|s_{t-1})"/> and <InlineMath math="p(o_t|s_t)"/>) and infer the current state <InlineMath math="s_t"/> using an approximate posterior <InlineMath math="q(s_t)"/> based on observations <InlineMath math="o_t"/>. As before, minimizing Free Energy drives the updates to <InlineMath math="q(s_t)"/> and the model parameters.
      </p>

      <hr className="my-10 border-gray-300" />

      <h2 id="active-inference" className="text-3xl font-bold mb-6">Active Inference: Adding Action</h2>
      <p>
        Passive observation isn't enough; agents act on the world. Active Inference incorporates action <InlineMath math="u_t"/>. Now, the state at time <InlineMath math="t"/> depends not only on the previous state <InlineMath math="s_{t-1}"/> but also on the action <InlineMath math="u_{t-1}"/> taken at the previous step. The agent's model includes state transitions conditioned on actions: <InlineMath math="p(s_t | s_{t-1}, u_{t-1})"/>.
      </p>
      {/* Add ActionInfluenceViz */}
      <ActionInfluenceViz />
      <p>
        A different action can lead to a different future. Now the agent must choose actions that help minimize Free Energy over time. But how far into the future?
      </p>

      <hr className="my-10 border-gray-300" />

      <h2 id="efe" className="text-3xl font-bold mb-6">Expected Free Energy (EFE)</h2>
      <p className="mb-2">
        Agents don't just react; they plan. Active Inference frames planning as selecting a <strong>policy</strong> (<InlineMath math="\pi"/>), which is a sequence of future actions <InlineMath math="\pi = (u_t, u_{t+1}, ..., u_T)"/> over some time horizon <InlineMath math="T"/>.
      </p>
      <p>
        Calculating the Free Energy for future time steps requires a slight modification because we haven't observed the future outcomes <InlineMath math="o_{>t}"/> yet. We need to calculate the <strong>Expected Free Energy</strong> (<InlineMath math="G(\,\cdot\,)"/>) under a given policy <InlineMath math="\pi"/>, averaged over the agent's predictions about future states and observations under that policy:
      </p>
       <MathFormula inline={false} formula="G(\pi) = E_{q(s_{>t}, o_{>t}|\pi)}[\log q(s_{>t}|\pi) - \log p(o_{>t}, s_{>t}|\pi)]" />
      <p className="text-sm italic mb-4">
          (Note: <InlineMath math="s_{>t}"/> and <InlineMath math="o_{>t}"/> denote future states and observations from time <InlineMath math="t+1"/> to <InlineMath math="\tau"/>, the planning horizon.)
      </p>
      <p>
        How can we decompose this EFE? Recall the two decompositions of Free Energy we saw earlier. The first decomposition (Complexity + Inaccuracy) is problematic for the future because the Inaccuracy term (<InlineMath math="-E_q[\log p(o|s)]"/>) requires knowing the future observation <InlineMath math="o"/>, which we don't.
      </p>
       {/* Maybe add a small visual here reminding of the two decompositions? */}
       <div className="my-4 p-3 bg-gray-100 border rounded-lg text-sm">
         <p className="font-medium text-center">Recall: Free Energy Decompositions</p>
         <ul className="list-none pl-0 text-center">
           <li>1: <InlineMath math="F = \text{Complexity} + \text{Inaccuracy}" /> (Requires <InlineMath math="o"/>)</li>
           <li>2: <InlineMath math="F = \text{Approximation Error} + \text{Surprise}" /></li>
         </ul>
       </div>
       <p>
        Therefore, we use the second decomposition (Approximation Error + Surprise) as a starting point, but averaged over predicted future outcomes <InlineMath math="o_{>t}"/> under policy <InlineMath math="\pi"/>:
       </p>
       <MathFormula inline={false} formula="G(\pi) = E_{q(o_{>t}|\pi)} \left[ E_{q(s_{>t}|o_{>t},\pi)} [\log q(s_{>t}|o_{>t},\pi) - \log p(o_{>t}, s_{>t}|\pi)] \right]" />
      <p>
        Let's expand the joint probability <InlineMath math="p(o_{>t}, s_{>t}|\pi)"/> inside the logarithm using <InlineMath math="p(o,s) = p(s|o)p(o)"/>:
      </p>
       <MathFormula inline={false} formula="G(\pi) = E_{q(o,s|\pi)} [\log q(s|o,\pi) - \log(p(s|o,\pi)p(o|\pi))]" />
        <p>
           (Simplifying notation: <InlineMath math="s=s_{>t}"/>, <InlineMath math="o=o_{>t}"/>, and hiding the expectation <InlineMath math="E_{q(o,s|\pi)}"/> for clarity in the next steps)
        </p>
        <MathFormula inline={false} formula="\log q(s|o,\pi) - \log p(s|o,\pi) - \log p(o|\pi)" />
        {/* Add color to the terms */}
        <MathFormula inline={false} formula="\color{purple}\underbrace{KL[q(s|o,\pi) || p(s|o,\pi)]}_{\approx \text{0 if } q \text{ is good}} \color{blue}\underbrace{- E_{q(o|\pi)}[\log p(o|\pi)]}_{\text{Expected Preferences}}" />
       <p>
-        Here, <InlineMath math="p(o|\pi)" /> represents the agent's prior preferences over outcomes — how much it desires certain future observations. This term encourages policies that lead to preferred outcomes.
+        This decomposition shows EFE as the sum of the <strong className="bg-purple-100 text-purple-700 px-1 rounded">KL divergence</strong> (approximating zero if beliefs are optimal) and the <strong className="bg-blue-100 text-blue-700 px-1 rounded">Expected Preferences</strong> term. Here, <InlineMath math="p(o|\pi)" /> represents the agent's prior preferences over outcomes, encouraging policies leading to desired future observations.
       </p>
       <p>
         However, the true posterior <InlineMath math="p(s|o,\pi)"/> is still difficult to compute, especially for the future. We can apply Bayes' rule within the KL divergence term to relate it back to the likelihood <InlineMath math="p(o|s)"/> (which the agent <strong>does</strong> model) and the predicted states <InlineMath math="q(s|\pi)"/>:
       </p>
       {/* Using the derivation provided by the user, approx q(s|o,pi) with formula */}
       <MathFormula inline={false} formula="\log \frac{q(s|o,\pi)}{p(s|o,\pi)} = \log \frac{q(s|\pi) p(o|s)}{q(o|\pi)} \frac{p(o|\pi)}{p(s|\pi) p(o|s)}" />
       <p className="text-sm italic mb-4">
         (Note: This step involves some approximations where the agent's predictive distributions <InlineMath math="q"/> replace the true distributions <InlineMath math="p"/>, reflecting that the agent operates based on its own model. For example, the true posterior <InlineMath math="p(s|o,\pi)"/> is approximated by <InlineMath math="\frac{p(o|s)p(s|\pi)}{p(o|\pi)}"/>, and we then work with <InlineMath math="q(s|o,\pi) \approx \frac{p(o|s)q(s|\pi)}{q(o|\pi)}"/> within the expectation.)
       </p>

      {/* Add PolicyComparisonViz */}
      <PolicyComparisonViz />
      <p className="mb-2">
        There can be many possible policies. Active Inference considers all plausible policies in parallel. For each potential policy <InlineMath math="\pi"/>, the agent predicts the likely sequence of future states <InlineMath math="q(s_{t+1:\tau}|\pi)"/> and observations <InlineMath math="q(o_{t+1:\tau}|\pi)"/> that would result from executing that policy.
      </p>
      <p>
        The goal remains Free Energy minimization. The agent evaluates each policy based on the Free Energy expected in the future if that policy were pursued. Policies that are expected to lead to lower future Free Energy are preferred.
      </p>

      <hr className="my-10 border-gray-300" />

      <h2 id="efe-decomposition" className="text-3xl font-bold mb-6">Decomposing Expected Free Energy</h2>
      <p>
        Substituting the Bayesian expansion back into the EFE expression and rearranging leads to a common decomposition:
      </p>
       {/* Show the Risk + Ambiguity decomposition */} 
       <MathFormula inline={false} formula="G(\pi) = E_{q(s,o|\pi)} [\log q(s|\pi) - \log q(s|o,\pi) - \log q(o|\pi)]" />
       <MathFormula inline={false} formula="G(\pi) = E_{q(o|\pi)} [\underbrace{E_{q(s|o,\pi)}[\log q(s|\pi) - \log q(s|o,\pi)]}_{\textcolor{#F59E0B}{\text{Information Gain}}}] - \underbrace{E_{q(o|\pi)}[\log q(o|\pi)]}_{\text{-Entropy}}" />
       <p>Let's rewrite using <InlineMath math="q(s|o,\pi) = \frac{p(o|s)q(s|\pi)}{q(o|\pi)}"/>:</p>
       <MathFormula inline={false} formula="G(\pi) = E_{q(o|\pi)} [ E_{q(s|o,\pi)}[\log q(s|\pi) - (\log p(o|s) + \log q(s|\pi) - \log q(o|\pi))] ] - E_{q(o|\pi)}[\log q(o|\pi)]" />
       <MathFormula inline={false} formula="G(\pi) = E_{q(o|\pi)} [ E_{q(s|o,\pi)}[-\log p(o|s) + \log q(o|\pi)] ] - E_{q(o|\pi)}[\log q(o|\pi)]" />
       <MathFormula inline={false} formula="G(\pi) = E_{q(o|\pi)} [ E_{q(s|o,\pi)}[-\log p(o|s)] ] + E_{q(o|\pi)}[\log q(o|\pi)] - E_{q(o|\pi)}[\log q(o|\pi)]" />
       {/* Final Risk-Ambiguity form with potential preferences p(o|pi) */}
       <MathFormula inline={false} formula="G(\pi) = \underbrace{\textcolor{#10B981}{E_{q(s|\pi)}[H[p(o|s)]]}}_{\textcolor{#10B981}{\text{Ambiguity}}} \underbrace{\textcolor{#3B82F6}{- E_{q(o|\pi)}[\log p(o|\pi)]}}_{\textcolor{#3B82F6}{\text{Risk (Preferences } p(o|\pi))}}" />
       <p className="text-sm italic mb-4">
         (Note: The Risk term is often expressed using prior preferences <InlineMath math="p(o)"/> instead of preferences conditioned on the policy <InlineMath math="p(o|\pi)"/>. Assuming <InlineMath math="p(o|\pi) \approx p(o)"/> leads to the KL divergence form below.)
       </p>
       {/* Final Risk-Ambiguity form with prior preferences p(o) */}
       <MathFormula inline={false} formula="G(\pi) \approx \underbrace{\textcolor{#3B82F6}{KL[q(o|\pi) || p(o)]}}_{\textcolor{#3B82F6}{\text{Risk}}} + \underbrace{\textcolor{#10B981}{E_{q(s|\pi)}[H[p(o|s)]]}}_{\textcolor{#10B981}{\text{Ambiguity}}}" />
       <p>
         This decomposition provides intuition about policy selection:
       </p>
       <ul className="list-disc pl-6 space-y-2 my-4">
         <li><strong className="bg-blue-100 text-blue-700 px-1 rounded">Risk (or Cost):</strong> The KL divergence between the predicted outcomes under the policy (<InlineMath math="q(o|\pi)"/>) and the agent's prior preferences (<InlineMath math="p(o)"/>). Minimizing this favors policies expected to lead to desirable outcomes. This term captures the <strong className="bg-blue-100 text-blue-700 px-1 rounded">Instrumental Value</strong>.</li>
         <li><strong className="bg-green-100 text-green-700 px-1 rounded">Ambiguity:</strong> The expected uncertainty about outcomes, given the states predicted under the policy. It reflects the agent's uncertainty in its likelihood model (<InlineMath math="p(o|s)"/>). Minimizing this favors policies expected to lead to states where the outcome is predictable.</li>
       </ul>

        <p><strong>Alternative Decomposition: Epistemic and Instrumental Value</strong></p>
        <p>
          Another insightful way to decompose EFE relates back to the idea of information gain:
        </p>
         <MathFormula inline={false} formula="G(\pi) = E_{q(s,o|\pi)} [\log q(s|\pi) - \log p(o,s)]" />
         <MathFormula inline={false} formula="G(\pi) = E_{q(s,o|\pi)} [\log q(s|\pi) - (\log p(o|s) + \log p(s))]" />
         <MathFormula inline={false} formula="G(\pi) = \underbrace{E_{q(s,o|\pi)} [\log q(s|\pi) - \log p(s)]}_{\approx \text{Complexity}} \underbrace{- E_{q(s,o|\pi)}[\log p(o|s)]}_{\text{Expected Log Likelihood}}" />
        <p>
          Rearranging differently, focusing on the difference between expected future states and states conditioned on observations:
        </p>
        {/* Intermediate step showing KL form (Epistemic Value) */}
        <MathFormula inline={false} formula="G(\pi) = \textcolor{#F59E0B}{E_{q(o|\pi)}[KL[q(s|\pi) || q(s|o,\pi)]]} \textcolor{#3B82F6}{- E_{q(o|\pi)}[\log p(o)]}"/>
        {/* Final Epistemic-Instrumental form */}
        <MathFormula inline={false} formula="G(\pi) = \underbrace{\textcolor{#F59E0B}{I_q[s; o | \pi]}}_{\textcolor{#F59E0B}{\text{Epistemic Value (Info Gain)}}} \underbrace{\textcolor{#3B82F6}{- E_{q(o|\pi)}[\log p(o)]}}_{\textcolor{#3B82F6}{\text{Instrumental Value (Preferences)}}}"/>
        <p>
           (Note: The sign is often flipped, discussing maximizing negative EFE. Here G is minimized.)
        </p>
       <ul className="list-disc pl-6 space-y-2 my-4">
          <li><strong className="bg-blue-100 text-blue-700 px-1 rounded font-semibold">Instrumental Value:</strong> The degree to which expected outcomes align with prior preferences (<InlineMath math="p(o)"/>). Same as maximizing expected log preferences (or minimizing <span className="bg-blue-100 text-blue-700 px-1 rounded">Risk</span>).</li>
         <li>
-            <span className="bg-yellow-100 px-1 rounded font-semibold"><span className="text-orange-600">Epistemic Value:</span></span> The expected information gain about hidden states <InlineMath math="s"/> from observing future outcomes <InlineMath math="o"/> under policy <InlineMath math="\pi"/>. It's the expected reduction in uncertainty about states after seeing outcomes, quantified by the Mutual Information <InlineMath math="\textcolor{#F59E0B}{I_q[s; o | \pi]}"/>.
+            <strong className="bg-yellow-100 text-orange-700 px-1 rounded font-semibold">Epistemic Value:</strong> The expected information gain about hidden states <InlineMath math="s"/> from observing future outcomes <InlineMath math="o"/> under policy <InlineMath math="\pi"/>. It's the expected reduction in uncertainty about states after seeing outcomes, quantified by the Mutual Information <InlineMath math="\textcolor{#F59E0B}{I_q[s; o | \pi]}"/>.
          </li>
       </ul>
       <p>
         Minimizing EFE thus balances achieving preferred outcomes (<span className="text-blue-600 font-semibold">Instrumental Value</span>) with choosing actions that lead to informative observations that reduce uncertainty about the world (<span className="text-orange-600 font-semibold">Epistemic Value</span>).
       </p>

       <div className="my-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
         <h4 className="font-semibold text-lg mb-2 text-center text-orange-700">Digging into Epistemic Value</h4>
         <p className="text-sm mb-2">
-           <span className="text-orange-600 font-semibold">Epistemic value</span>, or expected information gain, motivates exploration. It quantifies how much a policy is expected to reduce uncertainty about the hidden states <InlineMath math="s"/> by observing the resulting outcomes <InlineMath math="o"/>. It is the mutual information between predicted states and predicted observations under the policy:
+           <strong className="bg-yellow-100 text-orange-700 px-1 rounded font-semibold">Epistemic value</strong>, or expected information gain, motivates exploration. It quantifies how much a policy is expected to reduce uncertainty about the hidden states <InlineMath math="s"/> by observing the resulting outcomes <InlineMath math="o"/>. It is the mutual information between predicted states and predicted observations under the policy:
          </p>
          {/* Epistemic Value as KL Divergence */}
          <MathFormula inline={false} formula="\textcolor{#F59E0B}{I_q[s; o | \pi]} = \textcolor{#F59E0B}{E_{q(o|\pi)} [KL[q(s|o,\pi) || q(s|\pi)]]}"/>
          <p className="text-sm mt-2 mb-2">
            It can also be expressed using entropies (<InlineMath math="H[X] = -E[\log p(X)]"/>):
          </p>
          {/* Epistemic Value using Entropies */}
           <MathFormula inline={false} formula="\textcolor{#F59E0B}{I_q[s; o | \pi]} = \textcolor{#F59E0B}{H[q(s|\pi)] - E_{q(o|\pi)}[H[q(s|o,\pi)]]}"/>
          <p className="text-sm mt-2">
            This shows it's the difference between the uncertainty about states <strong>before</strong> seeing the outcome (<InlineMath math="H[q(s|\pi)]"/>) and the expected uncertainty <strong>after</strong> seeing the outcome (<InlineMath math="E_{q(o|\pi)}[H[q(s|o,\pi)]]"/>). Policies that lead to large reductions in uncertainty have high <strong className="bg-yellow-100 text-orange-700 px-1 rounded font-semibold">epistemic value</strong>.
          </p>
          <p className="text-sm mt-2">
             Alternatively, using the KL divergence formulation for Mutual Information:
          </p>
          {/* Epistemic Value as KL Divergence between joint and product of marginals */}
           <MathFormula inline={false} formula="\textcolor{#F59E0B}{I_q[s; o | \pi]} = \textcolor{#F59E0B}{KL[q(s,o|\pi) || q(s|\pi)q(o|\pi)]}"/>
          <p className="text-sm mt-2">
            This measures how much the joint distribution under the policy differs from the product of the marginals (what you'd expect if states and observations were independent). High <strong className="bg-yellow-100 text-orange-700 px-1 rounded font-semibold">epistemic value</strong> means states and observations are strongly coupled under that policy.
          </p>
          <p className="text-xs mt-3 italic">
-            Practically, <span className="text-orange-600 font-semibold">epistemic value</span> is high when the agent is uncertain about the state (<InlineMath math="H[q(s|\pi)]"/> is high) but expects the outcomes under a policy to resolve that uncertainty (<InlineMath math="H[q(s|o,\pi)]"/> is low). If the agent is already certain, or if observations don't distinguish between states, <span className="text-orange-600 font-semibold">epistemic value</span> is low.
+            Practically, <strong className="bg-yellow-100 text-orange-700 px-1 rounded font-semibold">epistemic value</strong> is high when the agent is uncertain about the state (<InlineMath math="H[q(s|\pi)]"/> is high) but expects the outcomes under a policy to resolve that uncertainty (<InlineMath math="H[q(s|o,\pi)]"/> is low). If the agent is already certain, or if observations don't distinguish between states, <strong className="bg-yellow-100 text-orange-700 px-1 rounded font-semibold">epistemic value</strong> is low.
          </p>
        </div>

      <hr className="my-10 border-gray-300" />
      {/* END NEW SECTION */}

      <h2 id="minimal-example" className="text-3xl font-bold mb-6">Minimalistic Example: Hunger Games</h2>
      <p>
        Let's illustrate policy evaluation and selection with the simple hunger scenario described earlier. This interactive component walks through the calculations step-by-step.
      </p>
       <HungerExampleVisualization />
       
       {/* Keep the basic parameter setup text */}
       <p className="mt-6">
           <strong>Planning Horizon:</strong> One step ahead (<InlineMath math="T=1"/>).
       </p>
      <p>
        <strong>Policies:</strong> Two possible policies: <InlineMath math="\\pi_1 = (u_1)"/> (Get food), <InlineMath math="\\pi_2 = (u_2)"/> (Do nothing).
      </p>
      
      {/* NEW HEADING for combined calculation steps */}
      <h3 className="text-xl font-semibold mt-8 mb-4">Detailed Calculation Steps</h3>
      <p className="mb-4">
           The interactive visualization above demonstrates the core calculations. Here's the step-by-step mathematical breakdown for this example:
       </p>
      
      {/* COMBINED list */}
      <ol className="list-decimal pl-6 space-y-3 my-4 prose-sm">
        {/* Step 1: Predict States (from old Policy Eval) */}
        <li><strong><span className="bg-purple-100 text-purple-700 px-1 rounded">Predict Future States</span> (<InlineMath math="q(s_1|\pi) = B(u)q(s_0)"/>):</strong> Calculate the expected state distribution at <InlineMath math="t=1"/> for each policy, based on the <strong className="text-gray-700">transition matrix</strong> <InlineMath math="B(u)"/> and <strong className="text-gray-700">initial belief</strong> <InlineMath math="q(s_0) = [0, 1]"/>.
               <ul className="list-none pl-4 mt-1 space-y-1">
                   <li>Under <InlineMath math="\pi_1"/> (Get food, <InlineMath math="u_1"/>): <InlineMath math="q(s_1|\pi_1) = B(u_1)q(s_0) = \begin{pmatrix} 1 & 1 \\ 0 & 0 \end{pmatrix} \begin{pmatrix} 0 \\ 1 \end{pmatrix} = \begin{pmatrix} 1 \\ 0 \end{pmatrix}"/> (Predicts state 1: <strong className="text-green-700">Food</strong>)</li>
                   <li>Under <InlineMath math="\pi_2"/> (Do nothing, <InlineMath math="u_2"/>): <InlineMath math="q(s_1|\pi_2) = B(u_2)q(s_0) = \begin{pmatrix} 0 & 0 \\ 1 & 1 \end{pmatrix} \begin{pmatrix} 0 \\ 1 \end{pmatrix} = \begin{pmatrix} 0 \\ 1 \end{pmatrix}"/> (Predicts state 2: <strong className="text-red-700">Empty</strong>)</li>
               </ul>
           </li>
        {/* Step 2: Predict Observations (from old Policy Eval) */}
         <li><strong><span className="bg-orange-100 text-orange-700 px-1 rounded">Predict Future Observations</span> (<InlineMath math="q(o_1|\pi) = A q(s_1|\pi)"/>):</strong> Project the predicted state distributions into expected observation distributions using the <strong className="text-gray-700">likelihood matrix</strong> <InlineMath math="A"/>.
                <ul className="list-none pl-4 mt-1 space-y-1">
                    <li>Under <InlineMath math="\pi_1"/>: <InlineMath math="q(o_1|\pi_1) = A q(s_1|\pi_1) = \begin{pmatrix} 1 & 0 \\\\ 0 & 1 \end{pmatrix} \begin{pmatrix} 1 \\\\ 0 \end{pmatrix} = \begin{pmatrix} 1 \\\\ 0 \end{pmatrix}"/> (Predicts observation 1: <strong className="text-green-700">Fed</strong>)</li>
                    <li>Under <InlineMath math="\pi_2"/>: <InlineMath math="q(o_1|\pi_2) = A q(s_1|\pi_2) = \begin{pmatrix} 1 & 0 \\\\ 0 & 1 \end{pmatrix} \begin{pmatrix} 0 \\\\ 1 \end{pmatrix} = \begin{pmatrix} 0 \\\\ 1 \end{pmatrix}"/> (Predicts observation 2: <strong className="text-red-700">Hungry</strong>)</li>
                </ul>
            </li>
            
        {/* Step 3: Calculate EFE (from old Policy Eval) */}
          <li><strong><span className="bg-indigo-100 text-indigo-700 px-1 rounded">Calculate Expected Free Energy</span> (<InlineMath math="G(\pi) \approx \text{Risk} + \text{Ambiguity}"/>):</strong> Evaluate each policy based on how well its predicted outcomes align with preferences and how predictable those outcomes are.
                <ul className="list-none pl-4 mt-1 space-y-1">
                    <li><strong className="text-blue-700">Risk</strong> = <InlineMath math="KL[q(o_1|\pi) || C] = \sum_o q(o_1|\pi) \log \frac{q(o_1|\pi)}{C_o}"/> (Using <strong className="text-gray-700">preferences</strong> <InlineMath math="C=\begin{pmatrix} 1 \\\\ 0 \end{pmatrix}"/>). Measures divergence from preferred outcomes.</li>
                    <li><strong className="text-green-700">Ambiguity</strong> = <InlineMath math="E_{q(s_1|\pi)}[H[p(o_1|s_1)]]"/> (Expected entropy of likelihood columns). Measures expected outcome uncertainty given predicted states.</li>
                    <li>Since <InlineMath math="A"/> is the identity matrix, the likelihood <InlineMath math="p(o|s)"/> is certain for each state (columns are [1, 0] or [0, 1]), meaning the entropy of each column is 0. Thus, <strong className="text-green-700">Ambiguity</strong> = 0.</li>
                    <li><strong className="text-blue-700">Risk</strong>(<InlineMath math="\pi_1"/>) = <InlineMath math="KL(\begin{pmatrix} 1 \\\\ 0 \end{pmatrix} || \begin{pmatrix} 1 \\\\ 0 \end{pmatrix}) = 1 \log(1/1) + 0 \log(0/0) = 0"/> (Using <InlineMath math="0\log 0 = 0"/> limit). Policy 1 <strong className="text-green-600">perfectly matches preferences</strong>.</li>
                    <li><strong className="text-blue-700">Risk</strong>(<InlineMath math="\pi_2"/>) = <InlineMath math="KL(\begin{pmatrix} 0 \\\\ 1 \end{pmatrix} || \begin{pmatrix} 1 \\\\ 0 \end{pmatrix}) = 0 \log(0/1) + 1 \log(1/0) = \infty"/>. Policy 2 predicts an outcome (<InlineMath math="o=2"/>) that has <strong className="text-red-600">zero probability under preferences</strong> (<InlineMath math="C_2=0"/>).</li>
                    <li>Therefore: <InlineMath math="G(\pi_1) = \text{Risk}(\pi_1) + \text{Ambiguity} = 0 + 0 = \strong{0}"/></li>
                    <li>And: <InlineMath math="G(\pi_2) = \text{Risk}(\pi_2) + \text{Ambiguity} = \infty + 0 = \strong{\infty}"/></li>
                </ul>
            </li>
            
        {/* Step 4: Calculate Policy Probabilities (from old Policy Eval) */}
           <li><strong><span className="bg-teal-100 text-teal-700 px-1 rounded">Calculate Policy Probabilities</span> (<InlineMath math="q(\pi) = \sigma(-\gamma G(\pi))"/>):</strong> Convert EFE values into a probability distribution over policies using the <strong className="text-gray-700">softmax function</strong>, modulated by <strong className="text-gray-700">precision</strong> <InlineMath math="\gamma"/>.
                 <ul className="list-none pl-4 mt-1 space-y-1">
                    <li>Assume precision <InlineMath math="\gamma=1"/> for simplicity.</li>
                     <li>Unnormalized probability for <InlineMath math="\pi_1"/>: <InlineMath math="\exp(-\gamma G(\pi_1)) = e^{-1 \cdot 0} = 1"/>.</li>
                     <li>Unnormalized probability for <InlineMath math="\pi_2"/>: <InlineMath math="\exp(-\gamma G(\pi_2)) = e^{-1 \cdot \infty} = 0"/>.</li>
                     <li>Normalizing <InlineMath math="[1, 0]"/> gives <InlineMath math="q(\pi) = [1, 0]"/>. The agent is <strong className="text-teal-600">certain</strong> it should select policy <InlineMath math="\pi_1"/> (<strong className="text-green-700">Get food</strong>).</li>
                 </ul>
            </li>
 
         {/* Step 5: Calculate Marginal State Prediction (from old Action Selection) */}
          <li><strong><span className="bg-purple-100 text-purple-700 px-1 rounded">Calculate Overall Expected State</span> (<InlineMath math="q(s_t)"/>):</strong> Average the state predictions (<InlineMath math="q(s_t|\pi)"/> from Step 1) weighted by the <strong className="text-teal-700">policy probabilities</strong> (<InlineMath math="q(\pi)"/> from Step 4): <InlineMath math="q(s_t) = \sum_\pi q(\pi) q(s_t|\pi)"/>.
             <br/>
             <span className="ml-4">In our example (for <InlineMath math="t=1"/>): <InlineMath math="q(s_1) = q(\pi_1)q(s_1|\pi_1) + q(\pi_2)q(s_1|\pi_2) = 1 \cdot \begin{pmatrix} 1 \\\\ 0 \end{pmatrix} + 0 \cdot \begin{pmatrix} 0 \\\\ 1 \end{pmatrix} = \begin{pmatrix} 1 \\\\ 0 \end{pmatrix}"/></span><br/>
             <span className="ml-4">The agent expects, overall, to be in state 1 (<strong className="text-green-700">Food</strong>) at t=1.</span>
           </li>
           
         {/* Step 6: Calculate Expected Outcome (from old Action Selection) */}
          <li><strong><span className="bg-orange-100 text-orange-700 px-1 rounded">Calculate Overall Expected Outcome</span> (<InlineMath math="q(o_t)"/>):</strong> Project the <strong className="text-purple-700">overall expected state</strong> (<InlineMath math="q(s_t)"/> from Step 5) into the overall expected observation using the likelihood: <InlineMath math="q(o_t) = A q(s_t)"/>.
                <br/>
                <span className="ml-4">In our example (for <InlineMath math="t=1"/>): <InlineMath math="q(o_1) = A q(s_1) = \begin{pmatrix} 1 & 0 \\\\ 0 & 1 \end{pmatrix} \begin{pmatrix} 1 \\\\ 0 \end{pmatrix} = \begin{pmatrix} 1 \\\\ 0 \end{pmatrix}"/></span><br/>
                <span className="ml-4">The agent expects, overall, to observe '<strong className="text-green-700">Fed</strong>' (o=1) at t=1.</span>
          </li>
          
         {/* Step 7: Evaluate Specific Action Consequences (from old Action Selection) */}
         <li><strong><span className="bg-pink-100 text-pink-700 px-1 rounded">Evaluate Immediate Action Consequences</span> (<InlineMath math="q(o_t|u) = A B(u) q(s_{t-1})"/>):</strong> For each possible immediate action <InlineMath math="u"/> available <strong>now</strong> (at <InlineMath math="t=0"/>), calculate the specific outcome distribution (<InlineMath math="o_1"/>) that would result if that action were taken, starting from the <strong className="text-gray-700">current belief</strong> <InlineMath math="q(s_0)"/>.
             <ul className="list-none pl-4 mt-1 space-y-1">
               <li>If action <InlineMath math="u_1"/> (Get food) is taken now: <InlineMath math="q(o_1|u_1) = A B(u_1) q(s_0) = \begin{pmatrix} 1 & 0 \\\\ 0 & 1 \end{pmatrix} \begin{pmatrix} 1 & 1 \\\\ 0 & 0 \end{pmatrix} \begin{pmatrix} 0 \\\\ 1 \end{pmatrix} = \begin{pmatrix} 1 \\\\ 0 \end{pmatrix}"/> (Outcome would be '<strong className="text-green-700">Fed</strong>')</li>
               <li>If action <InlineMath math="u_2"/> (Do nothing) is taken now: <InlineMath math="q(o_1|u_2) = A B(u_2) q(s_0) = \begin{pmatrix} 1 & 0 \\\\ 0 & 1 \end{pmatrix} \begin{pmatrix} 0 & 0 \\\\ 1 & 1 \end{pmatrix} \begin{pmatrix} 0 \\\\ 1 \end{pmatrix} = \begin{pmatrix} 0 \\\\ 1 \end{pmatrix}"/> (Outcome would be '<strong className="text-red-700">Hungry</strong>')</li>
              </ul>
         </li>
         
         {/* Step 8: Select Action (from old Action Selection) */}
         <li><strong><span className="bg-lime-100 text-lime-700 px-1 rounded">Select Action</span> (<InlineMath math="\text{argmin}_u KL[q(o_t|u) || q(o_t)]"/>):</strong> Choose the immediate action <InlineMath math="u"/> that minimizes the <strong>KL divergence</strong> between the outcome predicted <strong>if that specific action is taken</strong> (<InlineMath math="q(o_t|u)"/> from Step 7) and the <strong>overall expected outcome</strong> averaged over policies (<InlineMath math="q(o_t)"/> from Step 6). This means selecting the action that best fulfills the agent's overall expectations.
               <ul className="list-none pl-4 mt-1 space-y-1">
                   <li>Divergence for <InlineMath math="u_1"/>: <InlineMath math="KL[q(o_1|u_1) || q(o_1)] = KL(\begin{pmatrix} 1 \\ 0 \end{pmatrix} || \begin{pmatrix} 1 \\ 0 \end{pmatrix}) = 0"/>.</li>
                   <li>Divergence for <InlineMath math="u_2"/>: <InlineMath math="KL[q(o_1|u_2) || q(o_1)] = KL(\begin{pmatrix} 0 \\ 1 \end{pmatrix} || \begin{pmatrix} 1 \\ 0 \end{pmatrix}) = \infty"/>.</li>
                   <li>The action <InlineMath math="u_1"/> (<strong className="text-green-700">Get food</strong>) <strong className="text-green-600">minimizes the KL divergence</strong> (0).</li>
               </ul>
          </li>
     </ol>
     <p>
       Therefore, the agent selects action <InlineMath math="u_1"/> (Get food) because taking that action leads precisely to the outcome it expects (<InlineMath math="o=1"/>), based on its policy evaluation. The environment (generative process) then yields the next observation <InlineMath math="o_1"/>, the agent updates its belief <InlineMath math="q(s_1)"/> using Bayesian inference (perception), and the cycle repeats. The agent acts to make its (policy-informed) predictions come true.
     </p>

      <hr className="my-10 border-gray-300" />

      {/* INSERT NEW SECTION FOR INTERACTIVE GRID WORLD */}
      <h2 id="interactive-grid-world" className="text-3xl font-bold mb-6">Interactive Grid World Simulation</h2>
      <p className="mb-4">
          Now let's explore a slightly more complex scenario. In this interactive grid world, you can place the agent (<Brain className="inline-block -mt-1 mx-px" size={16} />), food sources (<Utensils className="inline-block -mt-1 mx-px" size={16} />), predators (<ShieldAlert className="inline-block -mt-1 mx-px" size={16} />), and shelters (<Home className="inline-block -mt-1 mx-px" size={16} />). You can also toggle the weather conditions (<Cloudy className="inline-block -mt-1 mx-px" size={16} /> / <Sun className="inline-block -mt-1 mx-px" size={16} />).
      </p>
      {/* ADDED GENERAL EXPLANATION */}
      <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg text-sm mb-6 not-prose">
          <h4 className="font-semibold text-base text-blue-800 mb-2">How the Simulation Works:</h4>
          <p className="mb-1">
              The agent's goal is to minimize its <strong title="Expected Free Energy: A quantity the agent seeks to minimize. It balances the drive to achieve preferred outcomes (low Risk) and the drive to reduce uncertainty about future outcomes (low Ambiguity).">Expected Free Energy (EFE)</strong> over a short planning horizon (here, just one step ahead).
          </p>
          <p className="mb-1">
              At each time step, the agent performs the following loop:
              <ol className="list-decimal pl-5 my-1">
                  <li><strong>Evaluates Policies:</strong> It considers possible actions (Stay, North, East, South, West). For each action (policy), it calculates the EFE based on its current <strong title="Belief: The agent's probability distribution over possible hidden states (its location on the grid).">belief</strong> about its state, the environment's <strong title="Likelihood: How observations relate to hidden states (here, noisy position).">likelihood</strong> model, and its <strong title="Preferences: The agent's desired distribution over future outcomes (e.g., preferring food, avoiding predators).">preferences</strong>.</li>
                  <li><strong>Selects Action:</strong> It converts the EFE values into probabilities using a softmax function (influenced by <strong title="Precision (γ): Controls confidence in choosing the best (lowest EFE) policy.">Precision γ</strong>) and selects an action stochastically based on these probabilities. Policies with lower EFE are more likely to be chosen.</li>
                  <li><strong>Updates Belief:</strong> It executes the chosen action and updates its belief about its new state based on the predictable consequences of its action (using the <strong title="Transitions: How states change given an action (e.g., moving North changes location).">transition model</strong>). <em>(Note: A full Active Inference agent would also incorporate a new observation here to refine its belief via perception, but this simulation simplifies that step.)</em></li>
              </ol>
          </p>
          <p>
              Use the <Pause size={12} className='inline -mt-px mx-px'/> / <Play size={12} className='inline -mt-px mx-px'/> button to pause and inspect the detailed calculations, including visualizations of beliefs and predictions.
          </p>
      </div>
      <p>
          Observe how the agent's preferences (seeking food, avoiding predators, seeking shelter in bad weather) influence the EFE calculated for different actions. The agent selects actions based on minimizing this EFE, balancing the desire to reach preferred states (low <strong title="Risk: Divergence of predicted outcomes from preferred outcomes (lower is better)">Risk</strong>) with the need to reduce uncertainty about outcomes (low <strong title="Ambiguity: Expected uncertainty about outcomes given predicted states (lower is better)">Ambiguity</strong>).
      </p>
      <div className="not-prose my-6">
        <InteractiveGridWorld />
      </div>
      <p className="mt-4">
          Try different arrangements of items and weather conditions. Adjust the agent's precision (<InlineMath math="\gamma"/>) and likelihood noise, and see how its behavior changes. Notice how the belief distribution (purple circles in main grid, mini-grid when paused) and the agent's most likely position (black circle) evolve.
      </p>
      {/* END NEW SECTION */}


      <hr className="my-10 border-gray-300" />

   <h2 id="summary" className="text-3xl font-bold mb-6">Summary & The Big Picture</h2>
   <p>
     Active Inference proposes a unified mechanism for perception, learning, planning, and action, all driven by the imperative to minimize Free Energy (a proxy for surprise). The core loop involves:
   </p>
   <ol className="list-decimal pl-6 space-y-2 my-6">
     <li className="pl-2"><strong>Perception (State Estimation):</strong> Update beliefs about the current hidden state (<InlineMath math="q(s_t)"/>) by minimizing Free Energy given the latest observation (<InlineMath math="o_t"/>). <span className="text-sm italic">(Minimizing <InlineMath math="KL[q(s_t)||p(s_t|o_t)]"/>)</span></li>
     <li className="pl-2"><strong>Learning (Model Update):</strong> Adjust model parameters (e.g., likelihood <InlineMath math="A=p(o|s)"/>, transitions <InlineMath math="B=p(s_t|s_{t-1}, u)"/>, precision <InlineMath math="\gamma"/>, preferences <InlineMath math="C=p(o)"/>) to minimize Free Energy over time. <span className="text-sm italic">(Making <InlineMath math="p(o_t)"/> higher, reducing surprise)</span></li>
     <li className="pl-2"><strong>Planning (Policy Evaluation):</strong>
          <ul className="list-disc pl-6 space-y-1 my-1 text-sm">
              <li>Consider possible future policies (<InlineMath math="\pi"/>).</li>
              <li>For each policy, predict future states (<InlineMath math="q(s_{>t}|\pi)"/>) and observations (<InlineMath math="q(o_{>t}|\pi)"/>).</li>
              <li>Calculate the Expected Free Energy (<InlineMath math="G(\pi)"/>) for each policy, balancing expected instrumental value (reaching preferred <InlineMath math="o"/>) and epistemic value (reducing uncertainty about <InlineMath math="s"/>).</li>
             <li>Compute the probability of each policy (<InlineMath math="q(\pi)"/>) based on its EFE and precision (<InlineMath math="\gamma"/>).</li>
          </ul>
      </li>
      <li className="pl-2"><strong>Action Selection:</strong>
         <ul className="list-disc pl-6 space-y-1 my-1 text-sm">
             <li>Compute the marginal predicted state for the next step (<InlineMath math="q(s_{t+1})"/>) by averaging over policies.</li>
              <li>Compute the overall expected outcome (<InlineMath math="q(o_{t+1})"/>).</li>
             <li>Select the action (<InlineMath math="u_{t+1}"/>) that minimizes the divergence between the outcome predicted specifically for that action (<InlineMath math="q(o_{t+1}|u_{t+1})"/>) and the overall expected outcome (<InlineMath math="q(o_{t+1})"/>). <span className="italic">(Acting to fulfill expectations)</span></li>
          </ul>
      </li>
   </ol>

     <blockquote className="bg-gray-100 p-4 border-l-4 border-blue-500 my-8 flex items-center flex-wrap font-medium text-base">
    Minimize Free Energy <Arrow/> Improve Model & Beliefs <Arrow/> Reduce Surprise <Arrow/> Fulfill Preferences <Arrow/> Maintain Homeostasis <Arrow/> Stay Alive
  </blockquote>

  <hr className="my-10 border-gray-300" />

  <h2 id="learning-limitations" className="text-3xl font-bold mb-6">Learning & Limitations</h2>
  <p>
    As mentioned, learning involves adjusting the parameters (<InlineMath math="A, B, C, \gamma"/>, etc.) of the generative model to minimize Free Energy. This allows the model (<InlineMath math="p"/>) to better approximate the true generative process (<InlineMath math="P"/>) and make more accurate predictions, thereby reducing future surprise. More advanced formulations perform Bayesian inference over parameters themselves.
   </p>
  <p>
    <strong>Limitations:</strong>
  </p>
   <ul className="list-disc pl-6 space-y-2 my-4">
     <li><strong>Scalability:</strong> The explicit enumeration and evaluation of all policies becomes computationally infeasible for complex problems with large state/action spaces or long planning horizons. Hierarchical approaches and function approximators (like deep learning) are areas of research to address this.</li>
     <li><strong>Model Specification:</strong> Defining the structure of the generative model (states, observations, dependencies) and prior preferences (<InlineMath math="C"/>) can be challenging for complex real-world scenarios.</li>
     <li><strong>Assumptions:</strong> The framework often makes simplifying assumptions (e.g., mean-field approximations for <InlineMath math="q(s)"/>, factorization of beliefs) which might not hold in all cases.</li>
   </ul>
   <p>
    Despite these challenges, Active Inference provides a comprehensive, mathematically principled framework for understanding perception, action, and learning.
   </p>

  <hr className="my-10 border-gray-300" />

  <h2 id="applications" className="text-3xl font-bold mb-6">Applications</h2>
   <p className="mb-4">
    Active inference is influential in computational neuroscience and psychiatry. It offers potential explanations for phenomena like perceptual inference (e.g., explaining illusions), motor control (viewed as fulfilling proprioceptive predictions), and decision-making under uncertainty.
  </p>
  <p>
     Variations in parameters like precision (<InlineMath math="\gamma"/>) or prior beliefs (including preferences <InlineMath math="C"/>) are used to model neurological and psychiatric conditions. For instance, altered precision (linked to dopamine function) might relate to symptoms in Parkinson's disease or schizophrenia. Aberrant priors might contribute to delusions or anxiety. It provides a formal way to simulate and test hypotheses about brain function and dysfunction.
  </p>

  <div className="mt-12 pt-8 border-t border-gray-300">
    <h3 className="text-xl font-semibold mb-4">Further Reading</h3>
    <p className="text-sm mb-3">
        This tutorial is heavily based on the excellent tutorial provided in:
    </p>
    <ul className="list-disc pl-6 space-y-2 text-sm">
      <li>Solopchuk, O. (2021). Tutorial on Active Inference. Medium. <a href="https://medium.com/@solopchuk/tutorial-on-active-inference-30edcf50f5dc" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://medium.com/@solopchuk/tutorial-on-active-inference-30edcf50f5dc</a></li>
      {/* Add actual links if available */}
      <li>Friston, K. (2010). The free-energy principle: a unified brain theory? Nature Reviews Neuroscience, 11(2), 127-138.</li>
      <li>Friston, K., FitzGerald, T., Rigoli, F., Schwartenbeck, P., & Pezzulo, G. (2017). Active inference: A process theory. Neural Computation, 29(1), 1-49.</li>
      <li>Parr, T., & Friston, K. J. (2019). Generalised free energy and active inference. Biological Cybernetics, 113(5-6), 495-513.</li>
       <li>Da Costa, L., Parr, T., Sajid, N., Veselic, S., Neacsu, V., & Friston, K. (2020). Active inference on discrete state-spaces: A synthesis. Journal of Mathematical Psychology, 99, 102447.</li>
       <li>Friston, K., Parr, T., & de Vries, B. (2017). The graphical structure of balanced inference. Entropy, 19(11), 575. (Discusses Factor Graphs)</li>
       <li>Schwartenbeck, P., FitzGerald, T., Mathys, C., Dolan, R., Wulfsohn, N., & Friston, K. J. (2015). Optimal inference: the value of belief updating? PLOS Computational Biology, 11(10), e1004564. (Discusses EFE decomposition)</li>
    </ul>
  </div>
    </article>
  );
}
