import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import InlineMath from '@matejmazur/react-katex';
import { Brain, Utensils, ShieldAlert, Home, Cloudy, Sun, Play, Pause, RefreshCw, Settings, ChevronsRight, Target, X } from 'lucide-react';

// --- Constants ---
const GRID_SIZE = 10;
const MAX_HUNGER = 20;
const POLICY_LENGTH = 3; // Sequence of actions
const NUM_CELLS = GRID_SIZE * GRID_SIZE;
const EPSILON = 1e-9; // Small number for numerical stability

// --- Types ---
type GridCell = 'empty' | 'food' | 'predator' | 'shelter' | 'agent';
type Grid = GridCell[][];
type Location = { r: number; c: number };
type Action = 'stay' | 'up' | 'down' | 'left' | 'right';
const ACTIONS: Action[] = ['stay', 'up', 'down', 'left', 'right'];
const ACTION_DELTAS: { [key in Action]: { dr: number; dc: number } } = {
    'stay': { dr: 0, dc: 0 },
    'up': { dr: -1, dc: 0 },
    'down': { dr: 1, dc: 0 },
    'left': { dr: 0, dc: -1 },
    'right': { dr: 0, dc: 1 },
};
type Policy = Action[]; // Sequence of actions

type AgentState = {
    trueLocation: Location;
    belief: number[]; // Probability distribution over grid cells (flattened: index = r * GRID_SIZE + c)
    hunger: number;
};

type EnvironmentState = {
    grid: Grid;
    weather: 'sunny' | 'cloudy';
    foodLocations: Location[];
    predatorLocations: Location[];
    shelterLocations: Location[];
};

// EFE = Instrumental + Epistemic (negative values for minimization)
type EFEResult = {
    efe: number;
    instrumental: number; // Negative: -E[Score(s)]
    epistemic: number;    // Negative: -(H_initial - H_final) = H_final - H_initial
};

// --- Helper Functions ---

// Convert location to flat index
const locToIndex = (loc: Location): number => loc.r * GRID_SIZE + loc.c;

// Convert flat index to location
const indexToLoc = (index: number): Location => ({ r: Math.floor(index / GRID_SIZE), c: index % GRID_SIZE });

// Check if location is valid
const isValid = (loc: Location): boolean => loc.r >= 0 && loc.r < GRID_SIZE && loc.c >= 0 && loc.c < GRID_SIZE;

// Initialize a uniform belief distribution
const uniformBelief = (): number[] => Array(NUM_CELLS).fill(1 / NUM_CELLS);

// Calculate Shannon entropy of a distribution
const calculateEntropy = (dist: number[]): number => {
    let entropy = 0;
    for (const p of dist) {
        if (p > EPSILON) {
            entropy -= p * Math.log(p);
        }
    }
    return entropy;
};

// Initialize grid
const initialGrid = (): Grid => Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('empty'));

// KL Divergence (Not directly used in EFE approx, but useful)
const calculateKL = (q: number[], p: number[]): number => {
    let kl = 0;
    for (let i = 0; i < q.length; i++) {
        if (q[i] > EPSILON) {
            if (p[i] > EPSILON) {
                kl += q[i] * (Math.log(q[i]) - Math.log(p[i]));
            } else {
                return Infinity; // q has probability where p has ~zero
            }
        }
    }
    return kl > 0 ? kl : 0;
};

// Softmax
const calculateSoftmax = (values: number[], precision: number): number[] => {
    const finiteValues = values.filter(isFinite);
    if (finiteValues.length === 0) return Array(values.length).fill(1 / values.length);

    const maxVal = Math.max(...finiteValues);
    // Subtract maxVal before exp for numerical stability
    const weights = values.map(val => isFinite(val) ? Math.exp(-precision * (val - maxVal)) : 0);
    const sumWeights = weights.reduce((a, b) => a + b, 0);

    if (sumWeights < EPSILON) {
        // Handle underflow or all EFEs being effectively infinite
        const numFinite = finiteValues.length;
        if (numFinite === 1) {
             return values.map(val => isFinite(val) ? 1 : 0); // Assign all prob to the single finite value
        }
        // If multiple finite but weights are tiny, or only Infs remain, return uniform
        const uniformProb = 1 / values.length;
        return Array(values.length).fill(uniformProb);
    }
    return weights.map(w => w / sumWeights);
};

// Likelihood p(o|s): Probability of observing location o given true state s
// Returns an unnormalized probability based on distance. Normalization happens later.
const likelihood_p_o_given_s = (obsIndex: number, stateIndex: number, noiseSigma: number): number => {
    if (noiseSigma <= 0) return obsIndex === stateIndex ? 1.0 : 0.0; // Perfect observation
    const obsLoc = indexToLoc(obsIndex);
    const stateLoc = indexToLoc(stateIndex);
    const distSq = (obsLoc.r - stateLoc.r)**2 + (obsLoc.c - stateLoc.c)**2;
    // Simple Gaussian-like decay
    return Math.exp(-distSq / (2 * noiseSigma**2));
};

// --- Main Component ---
export default function InteractiveGridWorld() {
    // --- Simulation State ---
    const [isRunning, setIsRunning] = useState(false);
    const [simulationSpeed, setSimulationSpeed] = useState(500); // ms per step
    const [stepCounter, setStepCounter] = useState(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- Environment State ---
    const [environment, setEnvironment] = useState<EnvironmentState>(() => {
        const grid = initialGrid();
        const foodLocations = [{ r: 2, c: 7 }];
        const predatorLocations = [{ r: 8, c: 2 }];
        const shelterLocations = [{ r: 5, c: 5 }];
        foodLocations.forEach(loc => grid[loc.r][loc.c] = 'food');
        predatorLocations.forEach(loc => grid[loc.r][loc.c] = 'predator');
        shelterLocations.forEach(loc => grid[loc.r][loc.c] = 'shelter');
        return {
            grid,
            weather: 'sunny',
            foodLocations,
            predatorLocations,
            shelterLocations,
        };
    });

    // --- Agent State ---
    const [agent, setAgent] = useState<AgentState>(() => {
        const initialLocation = { r: 0, c: 0 };
        const initialIndex = locToIndex(initialLocation);
        const initialBelief = Array(NUM_CELLS).fill(0.01 / (NUM_CELLS - 1));
        initialBelief[initialIndex] = 0.99;
        const sum = initialBelief.reduce((a, b) => a + b, 0);
        const normalizedInitialBelief = initialBelief.map(p => p / sum);

        return {
            trueLocation: initialLocation,
            belief: normalizedInitialBelief,
            hunger: 0,
        };
    });

    // --- Active Inference Parameters ---
    const [precision, setPrecision] = useState(3.0); // Gamma for policy selection
    const [likelihoodNoiseSigma, setLikelihoodNoiseSigma] = useState(1.0); // Observation noise

    // --- Planning & Action State ---
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [policyEFE, setPolicyEFE] = useState<Map<string, EFEResult>>(new Map());
    const [policyProbabilities, setPolicyProbabilities] = useState<number[]>([]);
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
    const [lastAction, setLastAction] = useState<Action | null>(null); // Store the first action of the selected policy

    // --- UI State ---
    const [showSettings, setShowSettings] = useState(true); // Show settings by default
    const [hoveredCell, setHoveredCell] = useState<Location | null>(null);
    const [placementMode, setPlacementMode] = useState<GridCell | null>(null);

    // --- Memoized Calculations ---

    // Generate all possible policies (sequences of actions) - Run once
    useEffect(() => {
        const generate = (length: number): Policy[] => {
            if (length === 0) return [[]];
            const shorter = generate(length - 1);
            const newPolicies: Policy[] = [];
            for (const p of shorter) {
                for (const a of ACTIONS) {
                    newPolicies.push([...p, a]);
                }
            }
            return newPolicies;
        };
        setPolicies(generate(POLICY_LENGTH));
    }, []); // Empty dependency array means this runs only once on mount

    // Feature function: Determines features present at a given state index
    const getStateFeatures = useCallback((stateIndex: number): number[] => {
        const loc = indexToLoc(stateIndex);
        const features = [0.0, 0.0, 0.0, 0.0]; // [Food, Predator Proximity, Shelter, InBadWeather]

        // Food at location
        if (environment.foodLocations.some(f => f.r === loc.r && f.c === loc.c)) {
            features[0] = 1.0;
        }
        // Predator Proximity (higher value means closer/at predator)
        let minPredatorDistSq = Infinity;
        environment.predatorLocations.forEach(p => {
            const distSq = (p.r - loc.r)**2 + (p.c - loc.c)**2;
            minPredatorDistSq = Math.min(minPredatorDistSq, distSq);
        });
        // Simple proximity measure (1 if adjacent/on, 0.5 if dist 2, etc.) - decaying
        features[1] = Math.max(0, 1.0 - Math.sqrt(minPredatorDistSq) / 2.0); // Max value 1 if dist 0

        // Shelter at location
        if (environment.shelterLocations.some(sh => sh.r === loc.r && sh.c === loc.c)) {
            features[2] = 1.0;
        }
        // In Bad Weather (only relevant if NOT in shelter)
        if (environment.weather === 'cloudy' && features[2] < 0.5) { // Not at shelter
            features[3] = 1.0;
        }
        return features;
    }, [environment]);

    // Preferences Score Calculation (Log preferences)
    const calculatePreferenceScore = useCallback((stateIndex: number): number => {
        const features = getStateFeatures(stateIndex);
        let score = 0;

        // Hunger drives food preference
        const foodPreference = agent.hunger > MAX_HUNGER / 2 ? 5.0 * (agent.hunger / MAX_HUNGER)**2 : 0.1; // Make hunger drive stronger
        score += foodPreference * features[0]; // Score increases if food is present

        // Predator avoidance is constant and strong
        const predatorAvoidance = -10.0;
        score += predatorAvoidance * features[1]; // Score decreases if predator is near

        // Shelter preference depends on weather
        const shelterPreference = environment.weather === 'cloudy' ? 5.0 : 0.1;
        score += shelterPreference * features[2]; // Score increases if shelter is present (esp. in bad weather)

        // Bad weather avoidance (general discomfort)
        const weatherAvoidance = environment.weather === 'cloudy' ? -2.0 : 0.0;
        score += weatherAvoidance * features[3]; // Score decreases if in bad weather without shelter

        return score;
    }, [agent.hunger, environment.weather, getStateFeatures]);

    // --- Core Active Inference Functions ---

    // Predict future states under a policy *without observation*
    // Returns sequence of belief distributions
    const predictBeliefSequence = useCallback((policy: Policy, initialBelief: number[]): number[][] => {
        let currentBelief = [...initialBelief];
        const predictedBeliefs: number[][] = [currentBelief];

        for (const action of policy) {
            const nextBelief = Array(NUM_CELLS).fill(0);
            for (let i = 0; i < currentBelief.length; i++) {
                if (currentBelief[i] > EPSILON) {
                    const currentLoc = indexToLoc(i);
                    const delta = ACTION_DELTAS[action];
                    const nextLoc = { r: currentLoc.r + delta.dr, c: currentLoc.c + delta.dc };

                    if (isValid(nextLoc)) {
                        nextBelief[locToIndex(nextLoc)] += currentBelief[i];
                    } else {
                        nextBelief[i] += currentBelief[i]; // Stay if move invalid
                    }
                }
            }
            // Normalize belief
            const sum = nextBelief.reduce((a,b) => a+b, 0);
            if(sum > EPSILON) {
                currentBelief = nextBelief.map(p => p / sum);
            } else {
                currentBelief = uniformBelief(); // Reset to uniform if belief dissipates
            }
            predictedBeliefs.push(currentBelief);
        }
        return predictedBeliefs;
    }, []);

    // Calculate Expected Free Energy (EFE) for a policy
    // EFE = Instrumental + Epistemic
    const calculateEFE = useCallback((policy: Policy, initialBelief: number[]): EFEResult => {
        const predictedBeliefs = predictBeliefSequence(policy, initialBelief);
        const finalPredictedBelief = predictedBeliefs[predictedBeliefs.length - 1];

        // --- Instrumental Value Component ---
        // Negative expected preference score at the final predicted state
        let expectedScore = 0;
        for(let stateIdx = 0; stateIdx < finalPredictedBelief.length; stateIdx++) {
            if (finalPredictedBelief[stateIdx] > EPSILON) {
                expectedScore += finalPredictedBelief[stateIdx] * calculatePreferenceScore(stateIdx);
            }
        }
        const instrumentalTerm = -expectedScore; // Minimize negative score = Maximize score

        // --- Epistemic Value Component ---
        // Negative expected reduction in entropy (H_final - H_initial)
        const initialEntropy = calculateEntropy(initialBelief);
        const finalEntropy = calculateEntropy(finalPredictedBelief);
        const epistemicTerm = finalEntropy - initialEntropy; // Minimize this = Maximize entropy reduction

        const efe = instrumentalTerm + epistemicTerm;

        // Clamp large values for stability
        const MAX_EFE_CLAMP = 1000;
        const clampedEFE = Math.max(-MAX_EFE_CLAMP, Math.min(MAX_EFE_CLAMP, efe));

        return {
            efe: isNaN(clampedEFE) ? Infinity : clampedEFE,
            instrumental: isNaN(instrumentalTerm) ? Infinity : instrumentalTerm,
            epistemic: isNaN(epistemicTerm) ? Infinity : epistemicTerm
        };

    }, [predictBeliefSequence, calculatePreferenceScore]); // Depends on belief prediction and preferences

    // --- Simulation Step ---
    const runSimulationStep = useCallback(() => {
        if (!isRunning && stepCounter > 0) return; // Prevent auto-run on reset if paused

        // === Planning Phase ===

        // 1. Evaluate Policies based on current belief
        const currentBelief = agent.belief;
        const currentEfeMap = new Map<string, EFEResult>();
        policies.forEach(p => {
            const efeResult = calculateEFE(p, currentBelief);
            currentEfeMap.set(JSON.stringify(p), efeResult);
        });
        setPolicyEFE(currentEfeMap);

        // 2. Calculate Policy Probabilities
        const efeValues = policies.map(p => currentEfeMap.get(JSON.stringify(p))?.efe ?? Infinity);
        const probs = calculateSoftmax(efeValues, precision);
        setPolicyProbabilities(probs);

        // 3. Select Policy probabilistically
        let selectedPolicyIndex = 0;
        if (probs.length > 0) {
            const randomSample = Math.random();
            let cumulativeProb = 0;
            for (let i = 0; i < probs.length; i++) {
                cumulativeProb += probs[i];
                if (randomSample <= cumulativeProb) {
                    selectedPolicyIndex = i;
                    break;
                }
            }
             // Fallback if sampling failed
             if (selectedPolicyIndex >= policies.length) {
                  const minEfeIndex = efeValues.indexOf(Math.min(...efeValues.filter(isFinite)));
                  selectedPolicyIndex = minEfeIndex >= 0 ? minEfeIndex : 0;
             }
        }
        const chosenPolicy = policies[selectedPolicyIndex];
        setSelectedPolicy(chosenPolicy);
        setLastAction(chosenPolicy[0]); // Store first action for display

        // === Execution & Perception Phase ===

        // 4. Simulate Full Policy Execution (Update True State)
        let currentTrueLocation = agent.trueLocation;
        let currentHunger = agent.hunger;
        const tempGrid = environment.grid.map(row => [...row]); // Temp grid for interactions within policy
        let tempFoodLocations = [...environment.foodLocations];

        for (const action of chosenPolicy) {
            const delta = ACTION_DELTAS[action];
            let nextTrueLocation = { r: currentTrueLocation.r + delta.dr, c: currentTrueLocation.c + delta.dc };

            if (!isValid(nextTrueLocation)) {
                nextTrueLocation = currentTrueLocation; // Stay if move invalid
            }
            currentTrueLocation = nextTrueLocation; // Update location for next step in policy

            // Check interactions at the new location
             if (tempGrid[currentTrueLocation.r][currentTrueLocation.c] === 'food') {
                 currentHunger = 0; // Eat food
                 // Remove food from temp grid and locations list
                 tempGrid[currentTrueLocation.r][currentTrueLocation.c] = 'empty';
                 tempFoodLocations = tempFoodLocations.filter(loc => !(loc.r === currentTrueLocation.r && loc.c === currentTrueLocation.c));
            }
            // Predator interaction simulation could be added here (e.g., end simulation)
        }
        const finalTrueLocation = currentTrueLocation;
        // Update hunger based on policy length
        const finalHunger = Math.min(currentHunger + POLICY_LENGTH, MAX_HUNGER + 5);

         // Update environment grid state *after* the policy execution is complete
         setEnvironment(prev => ({
             ...prev,
             grid: tempGrid,
             foodLocations: tempFoodLocations
         }));

        // 5. Predict Belief Forward (Prior for Perception)
        // Belief state if only transitions were applied, before seeing observation
        const predictedBeliefs = predictBeliefSequence(chosenPolicy, currentBelief);
        const priorBeliefForUpdate = predictedBeliefs[predictedBeliefs.length - 1];

        // 6. Generate Observation based on Final True State
        // Simple observation: the index of the observed location (can be noisy)
         const observationLikelihoods = Array(NUM_CELLS).fill(0);
         let observationNormalization = 0;
         for (let obsIdx = 0; obsIdx < NUM_CELLS; obsIdx++) {
             const prob = likelihood_p_o_given_s(obsIdx, locToIndex(finalTrueLocation), likelihoodNoiseSigma);
             observationLikelihoods[obsIdx] = prob;
             observationNormalization += prob;
         }
         // Normalize to get p(o|s_true) distribution over o
         if (observationNormalization > EPSILON) {
             for (let obsIdx = 0; obsIdx < NUM_CELLS; obsIdx++) {
                 observationLikelihoods[obsIdx] /= observationNormalization;
             }
         } else {
              // Handle case of zero likelihood everywhere (e.g., sigma=0, wrong state?)
              // Assign uniform probability or probability 1 at true location if sigma=0
              if (likelihoodNoiseSigma <= 0) {
                  observationLikelihoods[locToIndex(finalTrueLocation)] = 1.0;
              } else {
                  observationLikelihoods.fill(1.0 / NUM_CELLS); // Fallback to uniform
              }
         }

         // Sample the observed location index 'o' from this distribution
         let observedLocationIndex = locToIndex(finalTrueLocation); // Default to true if sampling fails
         const obsSample = Math.random();
         let obsCumulativeProb = 0;
         for (let i = 0; i < observationLikelihoods.length; i++) {
             obsCumulativeProb += observationLikelihoods[i];
             if (obsSample <= obsCumulativeProb) {
                 observedLocationIndex = i;
                 break;
             }
         }

        // 7. Update Belief (Perception Step: Bayes Rule)
        // posterior(s) ∝ p(o|s) * prior(s)
        const posteriorBelief = Array(NUM_CELLS).fill(0);
        let posteriorNormalization = 0;
        for (let stateIdx = 0; stateIdx < NUM_CELLS; stateIdx++) {
            const priorProb = priorBeliefForUpdate[stateIdx];
            if (priorProb > EPSILON) {
                 // Calculate likelihood p(o|s) for the *actual* sampled observation 'observedLocationIndex'
                 // We need the likelihood of *this observation* given *each possible state*
                 const likelihoodProb = likelihood_p_o_given_s(observedLocationIndex, stateIdx, likelihoodNoiseSigma);
                 posteriorBelief[stateIdx] = likelihoodProb * priorProb;
                 posteriorNormalization += posteriorBelief[stateIdx];
            }
        }

        // Normalize posterior
        if (posteriorNormalization > EPSILON) {
            for (let i = 0; i < NUM_CELLS; i++) {
                posteriorBelief[i] /= posteriorNormalization;
            }
        } else {
            // If posterior is zero everywhere (e.g., zero likelihood * zero prior), reset to uniform
            // This indicates a major mismatch or numerical issue.
            console.warn("Posterior belief normalization failed, resetting to uniform.");
            posteriorBelief.fill(1.0 / NUM_CELLS);
        }
        const finalBelief = posteriorBelief;

        // 8. Update Agent State
        setAgent({
            trueLocation: finalTrueLocation,
            belief: finalBelief,
            hunger: finalHunger
        });

        // 9. Increment Step Counter
        setStepCounter(prev => prev + 1);

        // 10. Schedule Next Step
        if (isRunning) {
            timeoutRef.current = setTimeout(runSimulationStep, simulationSpeed);
        }

    }, [isRunning, agent, environment, policies, precision, likelihoodNoiseSigma, calculateEFE, predictBeliefSequence]);

    // --- Effect for Simulation Timer ---
    useEffect(() => {
        if (isRunning) {
            // Clear any existing timer before starting a new one
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(runSimulationStep, simulationSpeed);
        } else {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        }
        // Cleanup function
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isRunning, runSimulationStep, simulationSpeed]);

    // --- Event Handlers ---
    const handleToggleRun = () => setIsRunning(prev => !prev); // Toggle running state
    
    const handleStep = () => {
        // Manually trigger one step only if not currently running
        if (!isRunning) {
             runSimulationStep();
        }
    };
    
    const handleReset = () => {
        setIsRunning(false); // Ensure simulation stops
        if (timeoutRef.current) clearTimeout(timeoutRef.current); // Clear pending timer
        setStepCounter(0);

         // Reset agent to center with peaked belief
         const initialLocation = { r: Math.floor(GRID_SIZE/2), c: Math.floor(GRID_SIZE/2) };
         const initialIndex = locToIndex(initialLocation);
         const initialBelief = Array(NUM_CELLS).fill(0.01 / (NUM_CELLS - 1));
         initialBelief[initialIndex] = 0.99;
         const sum = initialBelief.reduce((a, b) => a + b, 0);
         const normalizedInitialBelief = initialBelief.map(p => p / sum);

         setAgent({
             trueLocation: initialLocation,
             belief: normalizedInitialBelief,
             hunger: 0,
         });
         setSelectedPolicy(null);
         setLastAction(null);
         setPolicyEFE(new Map());
         setPolicyProbabilities([]);

         // Optionally reset grid items here if desired, or keep them
          // Example: Reset items as well
         const grid = initialGrid();
         const foodLocations = [{ r: 2, c: 7 }];
         const predatorLocations = [{ r: 8, c: 2 }];
         const shelterLocations = [{ r: 5, c: 5 }];
         foodLocations.forEach(loc => grid[loc.r][loc.c] = 'food');
         predatorLocations.forEach(loc => grid[loc.r][loc.c] = 'predator');
         shelterLocations.forEach(loc => grid[loc.r][loc.c] = 'shelter');
         setEnvironment(prev => ({
             ...prev, // Keep weather setting
             grid,
             foodLocations,
             predatorLocations,
             shelterLocations,
         }));
    };

    const handleGridClick = (r: number, c: number) => {
        if (!placementMode || isRunning) return; // Prevent changes while running

        setEnvironment(prev => {
            const newGrid = prev.grid.map(row => [...row]);
            const newFood = [...prev.foodLocations];
            const newPredators = [...prev.predatorLocations];
            const newShelter = [...prev.shelterLocations];
            const currentCell = newGrid[r][c];
            const clickedLocation = {r, c};

            // Remove existing item at location if different type or clearing
            if(currentCell === 'food') newFood.splice(newFood.findIndex(loc => loc.r === r && loc.c === c), 1);
            if(currentCell === 'predator') newPredators.splice(newPredators.findIndex(loc => loc.r === r && loc.c === c), 1);
            if(currentCell === 'shelter') newShelter.splice(newShelter.findIndex(loc => loc.r === r && loc.c === c), 1);

            if (placementMode === 'empty' || placementMode === currentCell) {
                 newGrid[r][c] = 'empty';
            } else {
                 // Place the new item
                 newGrid[r][c] = placementMode;
                 if(placementMode === 'food') newFood.push(clickedLocation);
                 if(placementMode === 'predator') newPredators.push(clickedLocation);
                 if(placementMode === 'shelter') newShelter.push(clickedLocation);
            }

            // Prevent placing items on the agent's current true location?
            // For simplicity, we allow it for now.

            return {
                ...prev,
                grid: newGrid,
                foodLocations: newFood,
                predatorLocations: newPredators,
                shelterLocations: newShelter,
            };
        });
    };

    const handleClearGrid = () => {
        if (isRunning) return; // Prevent changes while running
         setEnvironment(prev => ({
            ...prev,
            grid: initialGrid(),
            foodLocations: [],
            predatorLocations: [],
            shelterLocations: [],
        }));
         // Optionally reset agent position too?
         // handleReset(); // Uncomment to fully reset on clear
    };

    // --- Rendering ---

    const renderCellContent = (cellType: GridCell, r: number, c: number) => {
        // Agent icon is rendered separately based on belief peak for clarity
        switch (cellType) {
            case 'food': return <Utensils className="w-4 h-4 text-green-600" />;
            case 'predator': return <ShieldAlert className="w-4 h-4 text-red-600" />;
            case 'shelter': return <Home className="w-4 h-4 text-blue-600" />;
            default: return null;
        }
    };
    
    // Find the cell with the highest belief probability
    const peakBeliefIndex = useMemo(() => {
        if (!agent.belief || agent.belief.length === 0) return 0;
        return agent.belief.indexOf(Math.max(...agent.belief));
    }, [agent.belief]);
    const peakBeliefLocation = useMemo(() => indexToLoc(peakBeliefIndex), [peakBeliefIndex]);

    return (
        <div className="p-4 border rounded-lg shadow-md bg-gray-50 not-prose flex flex-col md:flex-row gap-6">
            {/* Left Panel: Grid and Controls */}
            <div className="flex-1">
                <h3 className="text-lg font-semibold mb-3 text-center">Grid World</h3>
                {/* Grid Visualization */}
                <div className="grid gap-0.5 mb-4" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, aspectRatio: '1 / 1' }}>
                    {environment.grid.map((row, r) =>
                        row.map((cell, c) => {
                            const cellIndex = locToIndex({ r, c });
                            const beliefProb = agent.belief[cellIndex] || 0;
                            const maxBelief = agent.belief[peakBeliefIndex] || EPSILON; // Avoid division by zero
                            const beliefOpacity = maxBelief > 0 ? Math.max(0.05, beliefProb / maxBelief * 0.9) : 0.05; // Scale opacity relative to peak, ensure min visibility
                            const isHovered = hoveredCell?.r === r && hoveredCell?.c === c;
                            const isTrueLocation = agent.trueLocation.r === r && agent.trueLocation.c === c;
                            const isPeakBelief = peakBeliefIndex === cellIndex;

                            return (
                                <div
                                    key={`cell-${r}-${c}`}
                                    className={`relative border border-gray-300 flex items-center justify-center ${placementMode && !isRunning ? 'cursor-pointer hover:bg-gray-300' : 'cursor-default'}`}
                                    style={{
                                         backgroundColor: `rgba(169, 107, 224, ${beliefOpacity})`, // Purple belief heatmap
                                        aspectRatio: '1 / 1'
                                    }}
                                    onMouseEnter={() => setHoveredCell({ r, c })}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    onClick={() => handleGridClick(r,c)}
                                    title={`(${r},${c}) Belief: ${beliefProb.toFixed(3)}`}
                                >
                                     {/* Visualization of true agent location (black border) */}
                                    {isTrueLocation && (
                                        <div className="absolute inset-0.5 border-2 border-black rounded-sm pointer-events-none" title="Agent's True Location"></div>
                                    )}
                                    {/* Agent Icon at Peak Belief Location */}
                                     {isPeakBelief && (
                                         <Brain className="w-4 h-4 text-black z-20" />
                                     )}
                                    {/* Placed Items */}
                                    <div className="z-10">{renderCellContent(cell, r, c)}</div>
                                    {/* Hover highlight */}
                                    {isHovered && placementMode && !isRunning && (
                                         <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none"></div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                 {/* Placement Tools */}
                 <div className="mb-4 p-2 border rounded bg-white">
                     <div className="text-xs font-semibold mb-1 text-center">Placement Tools {isRunning ? '(Disabled while running)' : ''}</div>
                     <div className="flex justify-center gap-2 flex-wrap">
                         {['food', 'predator', 'shelter', 'empty'].map(tool => (
                             <button
                                 key={tool}
                                 onClick={() => setPlacementMode(prev => prev === tool ? null : tool as GridCell)}
                                 disabled={isRunning}
                                 className={`p-1 border rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed ${placementMode === tool ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                                 title={isRunning ? 'Cannot place items while simulation is running' : `Select ${tool} placement`}
                             >
                                 {tool === 'food' && <Utensils size={14}/>}
                                 {tool === 'predator' && <ShieldAlert size={14}/>}
                                 {tool === 'shelter' && <Home size={14}/>}
                                 {tool === 'empty' && <X size={14}/>}
                                 <span className="ml-1 capitalize">{tool === 'empty' ? 'Clear' : tool}</span>
                             </button>
                         ))}
                         <button onClick={handleClearGrid} disabled={isRunning} className="p-1 border rounded text-xs bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50 disabled:cursor-not-allowed">Clear All</button>
                     </div>
                 </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button onClick={handleToggleRun} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1 w-20 justify-center">
                        {isRunning ? <Pause size={14} /> : <Play size={14} />} {isRunning ? 'Pause' : 'Run'}
                    </button>
                    <button onClick={handleStep} disabled={isRunning} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                       <ChevronsRight size={14} /> Step
                    </button>
                    <button onClick={handleReset} className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm flex items-center gap-1">
                        <RefreshCw size={14} /> Reset
                    </button>
                    <button onClick={() => setShowSettings(!showSettings)} className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${showSettings ? 'bg-gray-300' : 'bg-gray-200 hover:bg-gray-300'}`}>
                        <Settings size={14} /> Settings
                    </button>
                </div>
                 <div className="text-center text-xs mt-2">Cycle: {stepCounter} | Agent Hunger: {agent.hunger}</div>
            </div>

            {/* Right Panel: Info and Settings */}
            <div className="w-full md:w-80 flex-shrink-0"> {/* Increased width */}
                <h3 className="text-lg font-semibold mb-3 text-center">Agent Info & Planning</h3>

                {/* Current State Info */}
                <div className="mb-3 p-2 border rounded bg-white text-xs space-y-1">
                    <div><span className="font-semibold">True Loc:</span> ({agent.trueLocation.r}, {agent.trueLocation.c})</div>
                    <div><span className="font-semibold">Peak Belief Loc:</span> ({peakBeliefLocation.r}, {peakBeliefLocation.c})</div>
                     <div><span className="font-semibold">Belief Entropy:</span> {calculateEntropy(agent.belief).toFixed(3)}</div>
                     <div><span className="font-semibold">Hunger:</span> {agent.hunger} / {MAX_HUNGER}</div>
                     <div><span className="font-semibold">Weather:</span> {environment.weather === 'sunny' ? <Sun size={14} className="inline text-yellow-500"/> : <Cloudy size={14} className="inline text-gray-500"/>} {environment.weather}</div>
                     <div><span className="font-semibold">Last Action:</span> {lastAction || 'N/A'}</div>
                </div>

                {/* Policy Evaluation Viz */}
                <div className="mb-3 p-2 border rounded bg-white text-xs max-h-48 overflow-y-auto"> {/* Reduced height */}
                    <h4 className="font-semibold text-center mb-1">Policy Evaluation (Top 5 by Prob)</h4>
                    {policies.length > 0 && policyProbabilities.length > 0 && policyEFE.size > 0 ? (
                        [...policyEFE.entries()]
                            // Map needs index access to policyProbabilities, careful if map order != policies array order
                             .map(([key, val], index) => {
                                 // Find the matching policy index to get the correct probability
                                 const policyIndex = policies.findIndex(p => JSON.stringify(p) === key);
                                 const prob = policyIndex !== -1 ? policyProbabilities[policyIndex] : 0;
                                 return {
                                     policy: JSON.parse(key),
                                     efe: val.efe,
                                     instrumental: val.instrumental,
                                     epistemic: val.epistemic,
                                     prob: prob
                                 };
                             })
                            .sort((a, b) => b.prob - a.prob) // Sort by probability desc
                            .slice(0, 5) // Show top 5
                            .map(({ policy, efe, instrumental, epistemic, prob }, displayIndex) => (
                                <div key={displayIndex} className={`p-1 rounded mb-1 text-[10px] leading-tight ${selectedPolicy && JSON.stringify(policy) === JSON.stringify(selectedPolicy) ? 'bg-blue-100' : 'bg-gray-50'}`}>
                                    <div className="font-mono break-words">[{policy.join(',')}] <span className="float-right">P:{(prob * 100).toFixed(1)}%</span></div>
                                    <div>EFE: <span className="font-semibold">{isFinite(efe) ? efe.toFixed(2) : 'Inf'}</span> (I: {isFinite(instrumental) ? instrumental.toFixed(2) : 'Inf'}, E: {isFinite(epistemic) ? epistemic.toFixed(2) : 'Inf'})</div>
                                </div>
                            ))
                    ) : (
                        <div className="text-center text-gray-500 italic">Run simulation or step...</div>
                    )}
                </div>

                {/* Preferences Viz */}
                 <div className="mb-3 p-2 border rounded bg-white text-xs">
                     <h4 className="font-semibold text-center mb-1">Preference Factors (LogP)</h4>
                     <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                        <div>Food (Hunger): <span className="font-mono float-right">{(agent.hunger > MAX_HUNGER / 2 ? 5.0 * (agent.hunger / MAX_HUNGER)**2 : 0.1).toFixed(1)}</span></div>
                        <div>Avoid Predator: <span className="font-mono float-right">{-10.0.toFixed(1)}</span></div>
                        <div>Shelter (Weather): <span className="font-mono float-right">{(environment.weather === 'cloudy' ? 5.0 : 0.1).toFixed(1)}</span></div>
                        <div>Avoid Weather: <span className="font-mono float-right">{(environment.weather === 'cloudy' ? -2.0 : 0.0).toFixed(1)}</span></div>
                     </div>
                 </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="mt-4 p-3 border rounded bg-white text-xs">
                        <h4 className="font-semibold text-center mb-2">Settings</h4>
                         {/* Precision Slider */}
                         <div className="mb-2">
                             <label className="block font-medium mb-0.5">Policy Precision (γ): {precision.toFixed(1)}</label>
                             <input
                                 type="range" min="0.1" max="10" step="0.1"
                                 value={precision}
                                 onChange={(e) => setPrecision(parseFloat(e.target.value))}
                                 className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer range-sm"
                                 title="Controls confidence in choosing the best (lowest EFE) policy."
                             />
                         </div>
                          {/* Likelihood Noise Slider */}
                         <div className="mb-2">
                             <label className="block font-medium mb-0.5">Observation Noise (σ): {likelihoodNoiseSigma.toFixed(1)}</label>
                             <input
                                 type="range" min="0.0" max="5.0" step="0.1" // Allow 0 for perfect observation
                                 value={likelihoodNoiseSigma}
                                 onChange={(e) => setLikelihoodNoiseSigma(parseFloat(e.target.value))}
                                 className="w-full h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer range-sm"
                                 title="Controls noise/uncertainty in observing the agent's location (higher = more noise)."
                             />
                         </div>
                         {/* Speed Slider */}
                         <div className="mb-2">
                             <label className="block font-medium mb-0.5">Sim Speed (ms/cycle): {simulationSpeed}</label>
                             <input
                                 type="range" min="50" max="2000" step="50"
                                 value={simulationSpeed}
                                 onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                                 className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer range-sm"
                             />
                         </div>
                         {/* Weather Toggle */}
                         <div className="text-center">
                              <button
                                 onClick={() => setEnvironment(prev => ({ ...prev, weather: prev.weather === 'sunny' ? 'cloudy' : 'sunny' }))}
                                 className="px-2 py-0.5 border rounded text-xs bg-yellow-100 hover:bg-yellow-200"
                              >
                                Toggle Weather ({environment.weather})
                              </button>
                         </div>
                    </div>
                )}

            </div>
        </div>
    );
}