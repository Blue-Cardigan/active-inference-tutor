import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import InlineMath from '@matejmazur/react-katex';
import { Brain, Utensils, ShieldAlert, Home, Cloudy, Sun, Play, Pause, RefreshCw, Settings, ChevronsRight, Target, X, Eye, EyeClosed, Map as MapIcon, Info, MoveRight } from 'lucide-react';

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
    previousTrueLocation: Location | null;
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

type KnownLocations = {
    food: Location[];
    predator: Location[];
    shelter: Location[];
};

type SimulationPhase = 'Planning' | 'Executing & Perceiving' | 'Paused' | 'Idle'; // For UI indicator

type PreferenceFactors = {
    foodHungry: number; // Preference for food when hungry
    avoidPredator: number; // Magnitude of negative preference for predator proximity
    shelterBadWeather: number; // Preference for shelter in bad weather
    avoidBadWeather: number; // Magnitude of negative preference for being unsheltered in bad weather
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

// Calculate distance between two locations
const distance = (loc1: Location, loc2: Location): number => {
    return Math.sqrt((loc1.r - loc2.r)**2 + (loc1.c - loc2.c)**2);
};

// --- Main Component ---
export default function InteractiveGridWorld() {
    // --- Simulation State ---
    const [isRunning, setIsRunning] = useState(false);
    const [simulationSpeed, setSimulationSpeed] = useState(500); // ms per step
    const [stepCounter, setStepCounter] = useState(0);
    const [simulationPhase, setSimulationPhase] = useState<SimulationPhase>('Idle'); // Track current phase
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
            previousTrueLocation: null,
        };
    });

    // --- Active Inference Parameters ---
    const [precision, setPrecision] = useState(3.0); // Gamma for policy selection
    const [likelihoodNoiseSigma, setLikelihoodNoiseSigma] = useState(1.0); // Observation noise
    // State for user-controllable preferences
    const [preferenceFactors, setPreferenceFactors] = useState<PreferenceFactors>({
        foodHungry: 5.0,
        avoidPredator: 10.0, // Store magnitude, apply negative sign later
        shelterBadWeather: 5.0,
        avoidBadWeather: 2.0 // Store magnitude, apply negative sign later
    });

    // --- Planning & Action State ---
    const [policies, setPolicies] = useState<Policy[]>([]);
    const [policyEFE, setPolicyEFE] = useState<Map<string, EFEResult>>(new Map());
    const [policyProbabilities, setPolicyProbabilities] = useState<number[]>([]);
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
    const [lastObservationIndex, setLastObservationIndex] = useState<number | null>(null);

    // --- Memory State ---
    const [knownLocations, setKnownLocations] = useState<KnownLocations>({ food: [], predator: [], shelter: [] });

    // --- UI State ---
    const [showSettings, setShowSettings] = useState(false); // Hide settings by default now
    const [hoveredCell, setHoveredCell] = useState<Location | null>(null);
    const [placementMode, setPlacementMode] = useState<GridCell | null>(null);

    // Re-initialize agent belief on mount correctly
    useEffect(() => {
        const initialLocation = { r: 0, c: 0 };
        const initialIndex = locToIndex(initialLocation);
        const initialBelief = Array(NUM_CELLS).fill(0.01 / (NUM_CELLS - 1));
        initialBelief[initialIndex] = 0.99;
        const sum = initialBelief.reduce((a, b) => a + b, 0);
        const normalizedInitialBelief = initialBelief.map(p => p / sum);
        setAgent(prev => ({ ...prev, belief: normalizedInitialBelief }));
    }, []);

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

    // Preferences Score Calculation (incorporating perception & memory)
    const calculatePreferenceScore = useCallback((stateIndex: number): number => {
        const currentLocation = indexToLoc(stateIndex);
        const featuresAtLocation = getStateFeatures(stateIndex);
        let score = 0;
        const weatherFactor = environment.weather === 'cloudy' ? 0.5 : 1.0;
        const isHungry = agent.hunger > MAX_HUNGER / 2;
        const isBadWeather = environment.weather === 'cloudy';

        // --- 1. Score based on features AT the location ---
        const foodPreference = isHungry ? preferenceFactors.foodHungry * (agent.hunger / MAX_HUNGER)**2 : 0.1;
        score += foodPreference * featuresAtLocation[0];
        const predatorAvoidance = -preferenceFactors.avoidPredator;
        score += predatorAvoidance * featuresAtLocation[1];
        const shelterPreference = isBadWeather ? preferenceFactors.shelterBadWeather : 0.1;
        score += shelterPreference * featuresAtLocation[2];
        const weatherAvoidance = isBadWeather ? -preferenceFactors.avoidBadWeather : 0.0;
        score += weatherAvoidance * featuresAtLocation[3];

        // --- 2. Score based on "Perceived" items nearby (Simulated Perception) ---
        const perceptionRangeNear = 1.5 * weatherFactor;
        const perceptionRangeFar = 3.5 * weatherFactor;
        const perceivedFoodBonusNear = isHungry ? preferenceFactors.foodHungry * 0.4 : 0.2;
        const perceivedFoodBonusFar = isHungry ? preferenceFactors.foodHungry * 0.1 : 0.05;

        environment.foodLocations.forEach(loc => {
            const dist = distance(currentLocation, loc);
            if (dist < perceptionRangeNear) { score += perceivedFoodBonusNear * weatherFactor; }
            else if (dist < perceptionRangeFar) { score += perceivedFoodBonusFar * weatherFactor; }
        });
        environment.predatorLocations.forEach(loc => {
            const dist = distance(currentLocation, loc);
            if (dist < perceptionRangeNear) { score += (predatorAvoidance * 2.0) * weatherFactor; }
            else if (dist < perceptionRangeFar) { score += (predatorAvoidance * 0.5) * weatherFactor; }
        });
         if (isBadWeather) {
             const perceivedShelterBonusNear = preferenceFactors.shelterBadWeather * 2.0;
             const perceivedShelterBonusFar = preferenceFactors.shelterBadWeather * 0.4;
             environment.shelterLocations.forEach(loc => {
                 const dist = distance(currentLocation, loc);
                 if (dist < perceptionRangeNear) { score += perceivedShelterBonusNear * weatherFactor; }
                 else if (dist < perceptionRangeFar) { score += perceivedShelterBonusFar * weatherFactor; }
             });
         }

        // --- 3. Score based on Memory (Contextualized) ---
        const memoryInfluenceFactor = 0.8;
        if (isHungry) {
            knownLocations.food.forEach(loc => {
                const dist = distance(currentLocation, loc);
                score += (isHungry ? preferenceFactors.foodHungry * (agent.hunger / MAX_HUNGER)**2 : 0.1) * memoryInfluenceFactor * Math.exp(-dist / 1.5);
            });
        }
        knownLocations.predator.forEach(loc => {
            const dist = distance(currentLocation, loc);
             score += predatorAvoidance * memoryInfluenceFactor * Math.exp(-dist / 1.5);
        });
         if (isBadWeather) {
             knownLocations.shelter.forEach(loc => {
                 const dist = distance(currentLocation, loc);
                 score += preferenceFactors.shelterBadWeather * memoryInfluenceFactor * Math.exp(-dist / 1.5);
             });
         }

        return score;
    }, [agent.hunger, environment, getStateFeatures, knownLocations, preferenceFactors]);

    // --- Core Active Inference Functions ---

    // Predict future belief states under a policy using transition model B (action dynamics)
    // Incorporates stochasticity: actions might fail or slip.
    // Returns the sequence of predicted beliefs and an accumulated "futility penalty"
    // for actions that attempted to move off-grid.
    const predictBeliefSequence = useCallback((policy: Policy, initialBelief: number[]): { predictedBeliefs: number[][], futilityPenalty: number } => {
        const actionSuccessProb = 0.85; // Probability the intended action works
        const stayProb = 0.10;      // Probability of staying put instead of moving
        const slipFraction = (1 - actionSuccessProb - stayProb); // Remaining probability for slips
        const futilityCostPerInvalidStep = 5.0; // Penalty added to EFE for attempting an invalid move

        let currentBelief = [...initialBelief];
        const predictedBeliefs: number[][] = [currentBelief];
        let accumulatedFutility = 0;

        for (const action of policy) {
            const nextBelief = Array(NUM_CELLS).fill(0);
            const delta = ACTION_DELTAS[action];
            let stepFutility = 0; // Futility accumulated in this single step

            for (let i = 0; i < currentBelief.length; i++) {
                if (currentBelief[i] > EPSILON) {
                    const currentLoc = indexToLoc(i);
                    const intendedTargetLoc = { r: currentLoc.r + delta.dr, c: currentLoc.c + delta.dc };
                    const isIntendedMoveValid = isValid(intendedTargetLoc);

                    // If the intended move is invalid, accumulate futility proportional to belief at this cell
                    if (!isIntendedMoveValid) {
                        stepFutility += currentBelief[i]; // Accumulate belief mass that would have moved invalidly
                    }

                    const targetIndex = isIntendedMoveValid ? locToIndex(intendedTargetLoc) : i; // Actual target index (stays put if invalid)

                    // Calculate orthogonal 'slip' locations (if moving)
                    const slipLocsIndices: number[] = [];
                    let numValidSlips = 0;
                    if (action !== 'stay') {
                        const slipDeltas = (delta.dr !== 0)
                            ? [{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }] // Slips left/right if moving up/down
                            : [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }]; // Slips up/down if moving left/right

                        slipDeltas.forEach(slipDelta => {
                             const slipLoc = { r: currentLoc.r + slipDelta.dr, c: currentLoc.c + slipDelta.dc };
                             if (isValid(slipLoc)) {
                                slipLocsIndices.push(locToIndex(slipLoc));
                                numValidSlips++;
                             }
                        });
                    }
                    const slipProbPerLoc = numValidSlips > 0 ? slipFraction / numValidSlips : 0;

                    // Distribute probability
                    // a) Success (goes to targetIndex, which is 'i' if move was invalid)
                    nextBelief[targetIndex] += currentBelief[i] * actionSuccessProb;

                    // b) Stay Put (explicitly add stayProb only if action wasn't 'stay' and move was valid)
                    if (action !== 'stay' && isIntendedMoveValid) {
                         nextBelief[i] += currentBelief[i] * stayProb;
                    } else if (action === 'stay') {
                        // If action is 'stay', add stayProb + slipFraction (since no slips happen)
                         nextBelief[i] += currentBelief[i] * (stayProb + slipFraction);
                    } else if (!isIntendedMoveValid) {
                         // If move was invalid, the 'stay' component happens naturally as targetIndex is 'i'.
                         // Need to add the unused slipFraction probability back to staying put.
                         nextBelief[i] += currentBelief[i] * slipFraction;
                    }

                    // c) Slip (only if action wasn't 'stay', move was valid, and slips exist)
                    if (action !== 'stay' && isIntendedMoveValid && slipProbPerLoc > 0) {
                        slipLocsIndices.forEach(slipIndex => {
                            nextBelief[slipIndex] += currentBelief[i] * slipProbPerLoc;
                        });
                    }
                     // If slips were intended but impossible (e.g., corner with valid move), add unused slip prob to stay
                     else if (action !== 'stay' && isIntendedMoveValid && numValidSlips === 0) {
                          nextBelief[i] += currentBelief[i] * slipFraction;
                     }
                }
            }

            // Normalize belief
            const sum = nextBelief.reduce((a,b) => a+b, 0);
            if(sum > EPSILON) {
                currentBelief = nextBelief.map(p => p / sum);
            } else {
                console.warn("Predicted belief normalization failed.");
                currentBelief = uniformBelief();
            }
            predictedBeliefs.push(currentBelief);
            accumulatedFutility += stepFutility * futilityCostPerInvalidStep; // Add cost weighted by belief * penalty
        }
        return { predictedBeliefs, futilityPenalty: accumulatedFutility };
    }, []);

    // Calculate Expected Free Energy G(pi) for a policy pi
    // G(pi) = InstrumentalTerm + EpistemicTerm + FutilityPenalty (to be minimized)
    const calculateEFE = useCallback((policy: Policy, initialBelief: number[]): EFEResult => {
        const { predictedBeliefs, futilityPenalty } = predictBeliefSequence(policy, initialBelief); // Get futility penalty
        const finalPredictedBelief = predictedBeliefs[predictedBeliefs.length - 1];

        // Instrumental Term: Negative expected utility/preference score
        let expectedScore = 0;
        for(let stateIdx = 0; stateIdx < finalPredictedBelief.length; stateIdx++) {
            if (finalPredictedBelief[stateIdx] > EPSILON) {
                expectedScore += finalPredictedBelief[stateIdx] * calculatePreferenceScore(stateIdx);
            }
        }
        const instrumentalTerm = -expectedScore;

        // Epistemic Term: Expected change in uncertainty (entropy)
        const initialEntropy = calculateEntropy(initialBelief);
        const finalEntropy = calculateEntropy(finalPredictedBelief);
        const epistemicTerm = finalEntropy - initialEntropy;

        // EFE includes the penalty for attempted invalid moves
        const efe = instrumentalTerm + epistemicTerm + futilityPenalty; // Add futility penalty here

        const MAX_EFE_CLAMP = 1000;
        const clampedEFE = Math.max(-MAX_EFE_CLAMP, Math.min(MAX_EFE_CLAMP, efe));

        return {
            efe: isNaN(clampedEFE) ? Infinity : clampedEFE,
            instrumental: isNaN(instrumentalTerm) ? Infinity : instrumentalTerm, // Keep original terms for viz
            epistemic: isNaN(epistemicTerm) ? Infinity : epistemicTerm            // Keep original terms for viz
            // Note: The displayed EFE bar will reflect the clampedEFE including the penalty
        };

    }, [predictBeliefSequence, calculatePreferenceScore]); // Dependencies updated

    // --- Simulation Step ---
    const runSimulationStep = useCallback(() => {
        if (!isRunning && stepCounter > 0) {
            setSimulationPhase('Paused'); // Update phase if paused mid-run
            return;
        }
        setSimulationPhase('Planning');

        // Store location at the start of the cycle for movement viz
        const startOfCycleTrueLocation = agent.trueLocation;

        // === Planning Phase ===
        const currentBelief = agent.belief;
        const currentEfeMap = new Map<string, EFEResult>();
        policies.forEach(p => {
            const efeResult = calculateEFE(p, currentBelief);
            currentEfeMap.set(JSON.stringify(p), efeResult);
        });
        setPolicyEFE(currentEfeMap);

        const efeValues = policies.map(p => currentEfeMap.get(JSON.stringify(p))?.efe ?? Infinity);
        const probs = calculateSoftmax(efeValues, precision);
        setPolicyProbabilities(probs);

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
             if (selectedPolicyIndex >= policies.length) {
                  const minEfeIndex = efeValues.indexOf(Math.min(...efeValues.filter(isFinite)));
                  selectedPolicyIndex = minEfeIndex >= 0 ? minEfeIndex : 0;
             }
        }
        const chosenPolicy = policies[selectedPolicyIndex];
        setSelectedPolicy(chosenPolicy);

        setSimulationPhase('Executing & Perceiving');

        // === Execution & Perception Phase ===
        let currentTrueLocation = agent.trueLocation;
        let currentHunger = agent.hunger;
        const tempGrid = environment.grid.map(row => [...row]);
        let tempFoodLocations = [...environment.foodLocations];
        let ateFoodThisCycle = false; // Track if food was eaten

        for (const action of chosenPolicy) {
            const delta = ACTION_DELTAS[action];
            let nextTrueLocation = { r: currentTrueLocation.r + delta.dr, c: currentTrueLocation.c + delta.dc };

            if (!isValid(nextTrueLocation)) {
                nextTrueLocation = currentTrueLocation;
            }
            currentTrueLocation = nextTrueLocation;

             if (tempGrid[currentTrueLocation.r][currentTrueLocation.c] === 'food') {
                 currentHunger = 0;
                 ateFoodThisCycle = true; // Mark food as eaten
                 tempGrid[currentTrueLocation.r][currentTrueLocation.c] = 'empty';
                 tempFoodLocations = tempFoodLocations.filter(loc => !(loc.r === currentTrueLocation.r && loc.c === currentTrueLocation.c));
            }
        }
        const finalTrueLocation = currentTrueLocation;
        const finalHunger = ateFoodThisCycle ? 0 : Math.min(agent.hunger + POLICY_LENGTH, MAX_HUNGER + 5); // Hunger increases only if no food was eaten

         setEnvironment(prev => ({
             ...prev,
             grid: tempGrid,
             foodLocations: tempFoodLocations
         }));

        // 5. Predict Belief Forward (Prior for Perception)
        // Belief state if only transitions were applied, before seeing observation
        const { predictedBeliefs, futilityPenalty } = predictBeliefSequence(chosenPolicy, currentBelief);
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
        setLastObservationIndex(observedLocationIndex); // Store observation for display

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

        // 8. Update Memory based on high-confidence beliefs & check for depletion
        const memoryBeliefThreshold = 0.6;
        let updatedKnownFood = [...knownLocations.food]; // Start with current known food
        const updatedKnownPredators = [...knownLocations.predator];
        const updatedKnownShelter = [...knownLocations.shelter];

        for (let i = 0; i < finalBelief.length; i++) {
            if (finalBelief[i] > memoryBeliefThreshold) {
                const loc = indexToLoc(i);
                // Check ground truth grid *after* policy execution
                const itemTypeInEnv = environment.grid[loc.r][loc.c];

                // Add to memory if found and not already known
                if (itemTypeInEnv === 'food' && !updatedKnownFood.some(k => k.r === loc.r && k.c === loc.c)) {
                    updatedKnownFood.push(loc);
                } else if (itemTypeInEnv === 'predator' && !updatedKnownPredators.some(k => k.r === loc.r && k.c === loc.c)) {
                    updatedKnownPredators.push(loc);
                } else if (itemTypeInEnv === 'shelter' && !updatedKnownShelter.some(k => k.r === loc.r && k.c === loc.c)) {
                    updatedKnownShelter.push(loc);
                }

                // Memory Fading/Forgetting for Food: If belief is high here, but no food in env, remove from memory
                 if (itemTypeInEnv !== 'food') {
                     updatedKnownFood = updatedKnownFood.filter(k => !(k.r === loc.r && k.c === loc.c));
                 }
                 // Could add similar checks for predators/shelter if they could disappear
            }
        }
        setKnownLocations({
            food: updatedKnownFood,
            predator: updatedKnownPredators,
            shelter: updatedKnownShelter
        });

        // 9. Update Agent State
        setAgent({
            trueLocation: finalTrueLocation,
            belief: finalBelief,
            hunger: finalHunger,
            previousTrueLocation: startOfCycleTrueLocation,
        });

        // 10. Increment Step Counter
        setStepCounter(prev => prev + 1);

        // 11. Schedule Next Step
        if (isRunning) {
            timeoutRef.current = setTimeout(runSimulationStep, simulationSpeed);
        } else {
            setSimulationPhase('Paused');
        }

    }, [isRunning, agent, environment, policies, precision, likelihoodNoiseSigma, calculateEFE, predictBeliefSequence, knownLocations]); // Dependencies updated

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
            // Set phase to Paused only if it was running before
            if (simulationPhase === 'Planning' || simulationPhase === 'Executing & Perceiving') {
                setSimulationPhase('Paused');
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
    const handleToggleRun = () => {
        const nextRunningState = !isRunning;
        setIsRunning(nextRunningState);
        if (!nextRunningState) {
            // If pausing, ensure phase reflects that immediately
             if (simulationPhase === 'Planning' || simulationPhase === 'Executing & Perceiving') {
                setSimulationPhase('Paused');
            }
        } else if (simulationPhase === 'Idle' || simulationPhase === 'Paused') {
            // If starting from idle/paused, set phase to Planning (it will run immediately)
            setSimulationPhase('Planning');
        }
    };
    
    const handleStep = () => {
        if (!isRunning) {
            setSimulationPhase('Planning'); // Set phase before running
            runSimulationStep(); // Run one full cycle
            // runSimulationStep will set phase to 'Paused' if isRunning remains false
        }
    };
    
    const handleReset = () => {
        setIsRunning(false); // Ensure simulation stops
        if (timeoutRef.current) clearTimeout(timeoutRef.current); // Clear pending timer
        setStepCounter(0);
        setSimulationPhase('Idle'); // Reset phase
        setLastObservationIndex(null); // Clear last observation

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
             previousTrueLocation: null,
         });
         setSelectedPolicy(null);
         setPolicyEFE(new Map());
         setPolicyProbabilities([]);
         setKnownLocations({ food: [], predator: [], shelter: [] }); // Clear memory on reset
         
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
        // if (!placementMode || isRunning) return; // Prevent changes while running
        if (!placementMode) return; // Allow changes while running

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
        // if (isRunning) return; // Prevent changes while running
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
        switch (cellType) {
            case 'food': return <Utensils className="w-4 h-4 text-green-600"/>;
            case 'predator': return <ShieldAlert className="w-4 h-4 text-red-600"/>;
            case 'shelter': return <Home className="w-4 h-4 text-blue-600"/>;
            default: return null;
        }
    };
    
    // Find the cell with the highest belief probability
    const peakBeliefIndex = useMemo(() => {
        if (!agent.belief || agent.belief.length === 0) return 0;
        return agent.belief.indexOf(Math.max(...agent.belief));
    }, [agent.belief]);
    const peakBeliefLocation = useMemo(() => indexToLoc(peakBeliefIndex), [peakBeliefIndex]);

    // Helper to format EFE breakdown with tooltips
    const EFEBar = ({ value, max, color, label, tooltip }: { value: number; max: number; color: string; label: string; tooltip: string }) => {
        const widthPercent = max > 0 ? (Math.abs(value) / max) * 100 : 0;
        const displayValue = isFinite(value) ? value.toFixed(1) : 'Inf';
        return (
            <div className="flex items-center text-[9px] my-0.5" title={tooltip}>
                <span className="w-10 mr-1 text-right">{label}:</span>
                <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
                     <div className={`h-full ${color}`} style={{ width: `${Math.min(100, widthPercent)}%` }}></div>
                </div>
                <span className="w-8 ml-1 text-left font-mono">{displayValue}</span>
            </div>
        );
    };

    // Calculate perception ranges based on weather for rendering
    const weatherFactor = useMemo(() => environment.weather === 'cloudy' ? 0.5 : 1.0, [environment.weather]);
    const perceptionRangeNear = 1.5 * weatherFactor;
    const perceptionRangeFar = 3.5 * weatherFactor;

    return (
        <div className="p-4 border rounded-lg shadow-md bg-gray-50 not-prose flex flex-col md:flex-row gap-6">
            {/* Left Panel: Grid and Controls */}
            <div className="flex-1">
                <h3 className="text-lg font-semibold mb-3 text-center">Grid World</h3>
                <div className="text-xs text-center mb-3 text-gray-600 font-medium" title="Current phase of the agent's internal cycle">Phase: {simulationPhase}</div>
                {/* Grid Visualization with Perception Range and Movement */}
                <div className="relative grid gap-0.5 mb-4" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`, aspectRatio: '1 / 1' }}>
                    {/* Grid Cells */}
                    {Array.from({ length: GRID_SIZE }).map((_, r) =>
                        Array.from({ length: GRID_SIZE }).map((_, c) => {
                            const cellIndex = locToIndex({ r, c });
                            const beliefProb = agent.belief[cellIndex] || 0;
                            const maxBelief = agent.belief[peakBeliefIndex] || EPSILON;
                            const beliefOpacityBg = maxBelief > 0 ? Math.max(0.05, beliefProb / maxBelief * 0.9) : 0.05;
                            const isHovered = hoveredCell?.r === r && hoveredCell?.c === c;
                            const isTrueLocation = agent.trueLocation.r === r && agent.trueLocation.c === c;
                            const isPeakBelief = peakBeliefIndex === cellIndex;
                            const itemType = environment.grid[r][c];
                            const isInKnownFood = knownLocations.food.some(kl => kl.r === r && kl.c === c);
                            const isInKnownPredator = knownLocations.predator.some(kl => kl.r === r && kl.c === c);
                            const isInKnownShelter = knownLocations.shelter.some(kl => kl.r === r && kl.c === c);

                             // Calculate distance from peak belief for perception viz
                             const distFromPeakBelief = distance(peakBeliefLocation, { r, c });
                             let perceptionBorderStyle = '';
                             if (distFromPeakBelief < perceptionRangeNear) {
                                 perceptionBorderStyle = 'border-gray-500 border-dashed'; // Dashed border for near range
                             } else if (distFromPeakBelief < perceptionRangeFar) {
                                 perceptionBorderStyle = 'border-gray-400 border-dotted'; // Dotted border for far range
                             }

                            return (
                                <div
                                    key={`cell-${r}-${c}`}
                                    // Combine base style with perception border style
                                    className={`relative border border-gray-300 flex items-center justify-center ${perceptionBorderStyle} ${placementMode ? 'cursor-pointer hover:bg-gray-300' : 'cursor-default'}`}
                                    style={{
                                         backgroundColor: `rgba(169, 107, 224, ${beliefOpacityBg})`,
                                        aspectRatio: '1 / 1'
                                    }}
                                    onMouseEnter={() => setHoveredCell({ r, c })}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    onClick={() => handleGridClick(r,c)}
                                    title={`(${r},${c}) Belief: ${beliefProb.toFixed(3)}`}
                                >
                                    {/* Memory Marker */}
                                    {(isInKnownFood || isInKnownPredator || isInKnownShelter) && (
                                        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full border border-white pointer-events-none" title={`In Memory: ${isInKnownFood ? 'Food' : ''}${isInKnownPredator ? 'Predator' : ''}${isInKnownShelter ? 'Shelter' : ''}`}></div>
                                    )}
                                    {/* True Item */}
                                    <div className="z-10 opacity-100">
                                        {renderCellContent(itemType, r, c)}
                                    </div>
                                    {/* Agent Icon at Peak Belief */}
                                     {isPeakBelief && (
                                         <Brain className="w-4 h-4 text-black z-20 relative"/>
                                     )}
                                    {/* True Agent Location Border */}
                                    {isTrueLocation && (
                                        <div className="absolute inset-0.5 border-2 border-black rounded-sm pointer-events-none" title="Agent's True Location"></div>
                                    )}
                                    {/* Placement Hover */}
                                    {isHovered && placementMode && ( <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none"></div> )}
                                </div>
                            );
                        })
                    )}

                    {/* Movement Arrow Overlay */}
                    {agent.previousTrueLocation && simulationPhase !== 'Planning' && simulationPhase !== 'Executing & Perceiving' && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-30 opacity-70">
                            <defs>
                                <marker id="arrowhead" markerWidth="5" markerHeight="3.5" refX="0" refY="1.75" orient="auto">
                                    <polygon points="0 0, 5 1.75, 0 3.5" fill="rgba(0, 0, 0, 0.7)" />
                                </marker>
                            </defs>
                            <line
                                x1={`${((agent.previousTrueLocation.c + 0.5) / GRID_SIZE) * 100}%`}
                                y1={`${((agent.previousTrueLocation.r + 0.5) / GRID_SIZE) * 100}%`}
                                x2={`${((agent.trueLocation.c + 0.5) / GRID_SIZE) * 100}%`}
                                y2={`${((agent.trueLocation.r + 0.5) / GRID_SIZE) * 100}%`}
                                stroke="rgba(0, 0, 0, 0.7)"
                                strokeWidth="2"
                                markerEnd="url(#arrowhead)"
                            />
                        </svg>
                    )}
                </div>

                 {/* Placement Tools */}
                 <div className="mb-4 p-2 border rounded bg-white">
                     <div className="text-xs font-semibold mb-1 text-center">Placement Tools</div>
                     <div className="flex justify-center gap-2 flex-wrap">
                         {['food', 'predator', 'shelter', 'empty'].map(tool => (
                             <button
                                 key={tool}
                                 onClick={() => setPlacementMode(prev => prev === tool ? null : tool as GridCell)}
                                 className={`p-1 border rounded text-xs ${placementMode === tool ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                                 title={`Select ${tool} placement`}
                             >
                                 {tool === 'food' && <Utensils size={14}/>}
                                 {tool === 'predator' && <ShieldAlert size={14}/>}
                                 {tool === 'shelter' && <Home size={14}/>}
                                 {tool === 'empty' && <X size={14}/>}
                                 <span className="ml-1 capitalize">{tool === 'empty' ? 'Clear' : tool}</span>
                             </button>
                         ))}
                         <button onClick={handleClearGrid} className="p-1 border rounded text-xs bg-red-100 hover:bg-red-200 text-red-700">Clear All</button>
                        {/* Weather Toggle */}
                        <button onClick={() => setEnvironment(prev => ({ ...prev, weather: prev.weather === 'sunny' ? 'cloudy' : 'sunny' }))} className="p-1 px-2 py-0.5 border rounded text-xs bg-yellow-100 hover:bg-yellow-200"> Weather ({environment.weather === 'sunny' ? <Sun size={14} className="inline text-yellow-500"/> : <Cloudy size={14} className="inline text-gray-500"/>}) </button>
                     </div>
                    {/* Speed Slider */}
                     <div className="my-2 text-sm">
                            <label className="block mb-0.5">Sim Speed (ms/cycle)</label>
                            <input type="range" min="50" max="2000" step="50" value={simulationSpeed} onChange={(e) => setSimulationSpeed(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer range-sm" />
                        </div>
                 </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button onClick={handleToggleRun} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1 w-20 justify-center">
                        {isRunning ? <Pause size={14} /> : <Play size={14} />} {isRunning ? 'Pause' : 'Run'}
                    </button>
                    <button onClick={handleStep} className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm flex items-center gap-1">
                       <ChevronsRight size={14} /> Step
                    </button>
                    <button onClick={handleReset} className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm flex items-center gap-1">
                        <RefreshCw size={14} /> Reset
                    </button>
                </div>
                 <div className="text-center text-xs mt-2">Cycle: {stepCounter} | Agent Hunger: {agent.hunger}</div>
            </div>

            {/* Right Panel: Info and Settings - RESTRUCTURED */}
            <div className="w-full md:w-80 flex-shrink-0 space-y-4">

                 {/* Section 1: Current State & Knowledge */}
                 <div className="p-1 border rounded bg-white text-xs space-y-1 shadow-sm">
                    <h4 className="font-semibold text-center mb-2 border-b pb-1">Current State & Knowledge</h4>
                    <div className="my-1 border-b">
                        <div className="grid grid-cols-2 text-md overflow-y-auto space-y-0.5">
                            <div><span className="font-semibold">Food: </span>{knownLocations.food.length > 0 ? knownLocations.food.map(l => `(${l.r},${l.c})`).join(' ') : 'None'}</div>
                            <div><span className="font-semibold">Hunger:</span> {agent.hunger} / {MAX_HUNGER}</div>
                            <div><span className="font-semibold">Predators: </span>{knownLocations.predator.length > 0 ? knownLocations.predator.map(l => `(${l.r},${l.c})`).join(' ') : 'None'}</div>
                            <div><span className="font-semibold">Shelters: </span>{knownLocations.shelter.length > 0 ? knownLocations.shelter.map(l => `(${l.r},${l.c})`).join(' ') : 'None'}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div title="The agent's actual physical location in the grid."><span className="font-semibold">True Loc:</span> ({agent.trueLocation.r}, {agent.trueLocation.c})</div>
                        <div title="The location where the agent has the highest belief probability q(s_t)."><span className="font-semibold">Peak Belief Loc:</span> ({peakBeliefLocation.r}, {peakBeliefLocation.c})</div>
                        <div title={`The agent's noisy observation 'o' from the end of the previous cycle, used for belief updating. Noise (σ=${likelihoodNoiseSigma.toFixed(1)}).`}>
                            <span className="font-semibold">Last Obs Loc:</span>{' '}
                            {lastObservationIndex !== null ? `(${indexToLoc(lastObservationIndex).r}, ${indexToLoc(lastObservationIndex).c})` : 'N/A'}
                        </div>
                        <div title={`Shannon entropy of the agent's belief distribution. H[q(s)] = -Σ q(s) log q(s). Lower values indicate higher certainty.`}>
                            <span className="font-semibold">Belief Entropy:</span> {calculateEntropy(agent.belief).toFixed(3)}
                        </div>
                    </div>
                 </div>

                {/* Section 2: Policy Evaluation */}
                <div className="p-3 border rounded bg-white text-xs space-y-1 shadow-sm">
                    <h4 className="font-semibold text-sm text-center mb-2 border-b pb-1">Policy Evaluation</h4>
                    <div className="font-mono text-[10px] break-words mb-1" title="The sequence of actions the agent selected to execute in this cycle based on policy evaluation.">
                         <span className="font-semibold font-sans text-xs">Selected Policy:</span> {selectedPolicy ? `[${selectedPolicy.join(',')}]` : 'N/A'}
                     </div>
                    <h5 className="font-semibold text-center text-[11px] mb-1">Top 3 Policies by Probability</h5>
                    <div className="max-h-48 overflow-y-auto"> {/* Adjusted max height */}
                        {policies.length > 0 && policyProbabilities.length > 0 && policyEFE.size > 0 ? (
                            (() => {
                                const sortedPolicies = [...policyEFE.entries()]
                                    .map(([key, val]) => {
                                        const policyIndex = policies.findIndex(p => JSON.stringify(p) === key);
                                        const prob = policyIndex !== -1 ? policyProbabilities[policyIndex] : 0;
                                        return { policy: JSON.parse(key), efeResult: val, prob: prob };
                                    })
                                    .sort((a, b) => b.prob - a.prob); // Sort all first

                                const top3 = sortedPolicies.slice(0, 3);
                                // Check if selected policy is already in top 3
                                const selectedPolicyJson = JSON.stringify(selectedPolicy);
                                const isSelectedInTop3 = top3.some(p => JSON.stringify(p.policy) === selectedPolicyJson);

                                // If selected policy exists and is not in top 3, find it and add it
                                let policiesToDisplay = top3;
                                if (selectedPolicy && !isSelectedInTop3) {
                                    const selectedData = sortedPolicies.find(p => JSON.stringify(p.policy) === selectedPolicyJson);
                                    if (selectedData) {
                                        // Replace the last one or just add? Add for now, might show 4.
                                        policiesToDisplay = [...top3, selectedData];
                                    }
                                }

                                const maxAbsInstrumental = Math.max(...policiesToDisplay.map(p => Math.abs(p.efeResult.instrumental)).filter(isFinite), 1);
                                const maxAbsEpistemic = Math.max(...policiesToDisplay.map(p => Math.abs(p.efeResult.epistemic)).filter(isFinite), 1);
                                const maxAbsEFE = Math.max(...policiesToDisplay.map(p => Math.abs(p.efeResult.efe)).filter(isFinite), 1);

                                return policiesToDisplay.map(({ policy, efeResult, prob }, displayIndex) => (
                                    <div key={displayIndex} className={`p-1.5 rounded mb-1 text-[10px] leading-tight ${selectedPolicy && JSON.stringify(policy) === selectedPolicyJson ? 'bg-blue-100 border border-blue-300 shadow-inner' : 'bg-gray-50 border border-gray-200'}`}>
                                        <div className="font-mono break-words font-medium">
                                             <span className="text-gray-500">{displayIndex+1}.</span> [{policy.join(',')}] <span className="float-right" title={`Probability of selecting this policy: σ(-γG(π)) = ${prob.toFixed(3)}`}>P:{(prob * 100).toFixed(1)}%</span>
                                        </div>
                                        <EFEBar label="EFE" value={efeResult.efe} max={maxAbsEFE} color="bg-purple-500" tooltip={`Total Expected Free Energy G(π) = Instrumental + Epistemic. Lower is better.`} />
                                        <EFEBar label="Instrumental" value={efeResult.instrumental} max={maxAbsInstrumental} color="bg-blue-500" tooltip={`Instrumental Value (Cost/Risk): -E[ln p(o|π)] ≈ -E[Score(s)]. Reflects how well the policy is expected to satisfy preferences (e.g., find food, avoid danger). Lower (more negative score) is better.`} />
                                        <EFEBar label="Epistemic" value={efeResult.epistemic} max={maxAbsEpistemic} color="bg-orange-500" tooltip={`Epistemic Value (Ambiguity/Entropy Change): H[q(s_T|π)] - H[q(s_0)]. Reflects expected reduction in uncertainty about the state. Lower (more negative entropy change) means more information gain, which is better.`} />
                                    </div>
                                ));
                            })()
                        ) : (
                            <div className="text-center text-gray-500 italic text-[11px]">Run simulation or step...</div>
                        )}
                    </div>
                </div>

                {/* Section 3 & 4: Settings (Combined Preferences and Simulation) */}
                <div className="p-3 border rounded bg-white text-xs space-y-3 shadow-sm">
                        {/* Preference Settings Sub-section */}
                        <div>
                            <h4 className="font-semibold text-sm text-center mb-2 border-b pb-1 flex items-center justify-center gap-1">
                            Preference Settings
                            <label className="text-xs text-gray-500" title="Adjust the agent's goals/desires (Log preferences C or ln p(o|m))."></label>
                            </h4>
                            {/* Food Preference Slider */}
                            <div className="mb-2">
                                <label className="block font-medium mb-0.5" title={`Base preference for food when hungry. Actual score scales with hunger level.`}>Food Pref (Hungry): {preferenceFactors.foodHungry.toFixed(1)}</label>
                                <input type="range" min="0.1" max="10" step="0.1" value={preferenceFactors.foodHungry}
                                    onChange={(e) => setPreferenceFactors(prev => ({ ...prev, foodHungry: parseFloat(e.target.value) }))}
                                    className="w-full h-1.5 bg-green-200 rounded-lg appearance-none cursor-pointer range-sm"/>
                            </div>
                            {/* Predator Avoidance Slider */}
                            <div className="mb-2">
                                <label className="block font-medium mb-0.5" title={`Magnitude of aversion to predator proximity. Score contribution is negative.`}>Predator Avoidance: {preferenceFactors.avoidPredator.toFixed(1)}</label>
                                <input type="range" min="0.5" max="20" step="0.1" value={preferenceFactors.avoidPredator}
                                    onChange={(e) => setPreferenceFactors(prev => ({ ...prev, avoidPredator: parseFloat(e.target.value) }))}
                                    className="w-full h-1.5 bg-red-200 rounded-lg appearance-none cursor-pointer range-sm"/>
                            </div>
                            {/* Shelter Preference Slider */}
                            <div className="mb-2">
                                <label className="block font-medium mb-0.5" title={`Base preference for shelter when weather is cloudy.`}>Shelter Pref (Cloudy): {preferenceFactors.shelterBadWeather.toFixed(1)}</label>
                                <input type="range" min="0.1" max="10" step="0.1" value={preferenceFactors.shelterBadWeather}
                                    onChange={(e) => setPreferenceFactors(prev => ({ ...prev, shelterBadWeather: parseFloat(e.target.value) }))}
                                    className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer range-sm"/>
                            </div>
                            {/* Weather Avoidance Slider */}
                            <div className="mb-2">
                                <label className="block font-medium mb-0.5" title={`Magnitude of aversion to being unsheltered in cloudy weather. Score contribution is negative.`}>Weather Avoidance: {preferenceFactors.avoidBadWeather.toFixed(1)}</label>
                                <input type="range" min="0.0" max="5" step="0.1" value={preferenceFactors.avoidBadWeather}
                                    onChange={(e) => setPreferenceFactors(prev => ({ ...prev, avoidBadWeather: parseFloat(e.target.value) }))}
                                    className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer range-sm"/>
                            </div>
                        </div>

                        {/* Simulation Settings Sub-section */}
                        <div className="pt-3 border-t">
                            <h4 className="font-semibold text-sm text-center mb-2 border-b pb-1 flex items-center justify-center gap-1">
                            Simulation Settings <Info size={12} className="text-gray-500" />
                            </h4>
                            {/* Precision Slider */}
                            <div className="mb-2">
                            <label className="block font-medium mb-0.5" title={`Policy Precision γ=${precision.toFixed(1)}. Controls exploitation vs. exploration.`}>Policy Precision (<InlineMath math="\gamma"/>)</label>
                            <input type="range" min="0.1" max="10" step="0.1" value={precision} onChange={(e) => setPrecision(parseFloat(e.target.value))} className="w-full h-1.5 bg-purple-200 rounded-lg appearance-none cursor-pointer range-sm" title={`Higher γ: More deterministic selection (exploitation).\nLower γ: More random selection (exploration).`} />
                            </div>
                            {/* Likelihood Noise Slider */}
                            <div className="mb-2">
                            <label className="block font-medium mb-0.5" title={`Observation Noise σ=${likelihoodNoiseSigma.toFixed(1)}. Affects perceptual accuracy.`}>Observation Noise (<InlineMath math="\sigma"/>)</label>
                            <input type="range" min="0.0" max="5.0" step="0.1" value={likelihoodNoiseSigma} onChange={(e) => setLikelihoodNoiseSigma(parseFloat(e.target.value))} className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer range-sm" title={`Controls noise in p(o|s).\nσ=0: Perfect observation.\nHigher σ: Noisier observation.`} />
                            </div>
                    </div>
                </div>

            </div>
        </div>
    );
}