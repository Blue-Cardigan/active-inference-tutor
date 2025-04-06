'use client';

import React, { useState, useMemo } from 'react';
import { Stage, Layer, Line, Circle, Text } from 'react-konva';
import InlineMath from '@matejmazur/react-katex';

interface JensensInequalityVisualizationProps {
  width?: number;
  height?: number;
}

// The convex function f(x) = -log(x)
const func = (x: number) => -Math.log(x);
// Inverse function (for dragging y to find x) - exp(-y)
const inverseFunc = (y: number) => Math.exp(-y);

export default function JensensInequalityVisualization({
  width = 500,
  height = 350,
}: JensensInequalityVisualizationProps) {
  const padding = 50;
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;

  // X-axis range (adjust for log)
  const minX = 0.05;
  const maxX = 2.0;
  // Y-axis range derived from function
  const minY = func(maxX); // -log(2) approx -0.7
  const maxY = func(minX); // -log(0.05) approx 3.0
  const rangeY = maxY - minY;
  const rangeX = maxX - minX;


  // State for two points and their probability weight
  const [point1, setPoint1] = useState({ x: 0.3, prob: 0.6 });
  const [point2, setPoint2] = useState({ x: 1.2, prob: 0.4 });

  // Ensure probabilities sum to 1
  const handleProbChange = (newProb1: number) => {
    const p1 = Math.max(0.01, Math.min(0.99, newProb1));
    setPoint1(p => ({ ...p, prob: p1 }));
    setPoint2(p => ({ ...p, prob: 1 - p1 }));
  };

  // Map data coordinates to canvas coordinates
  const toCanvasX = (x: number) => padding + ((x - minX) / rangeX) * plotWidth;
  const toCanvasY = (y: number) => height - padding - ((y - minY) / rangeY) * plotHeight;

  // Map canvas coordinates to data coordinates
  const fromCanvasX = (canvasX: number) => minX + ((canvasX - padding) / plotWidth) * rangeX;
  // const fromCanvasY = (canvasY: number) => minY + ((height - padding - canvasY) / plotHeight) * rangeY;

  // Generate points for the -log(x) curve
  const curvePoints = useMemo(() => {
    const pts = [];
    for (let x = minX; x <= maxX; x += 0.01) {
      const y = func(x);
      // Ensure points are within canvas bounds visually
      if (y >= minY - rangeY * 0.1 && y <= maxY + rangeY * 0.1) {
           pts.push(toCanvasX(x), toCanvasY(y));
      }
    }
    return pts;
  }, [width, height]); // Recalculate if dimensions change

  // Calculate values for Jensen's inequality
  const x1 = point1.x;
  const y1 = func(x1);
  const x2 = point2.x;
  const y2 = func(x2);
  const p1 = point1.prob;
  const p2 = point2.prob;

  const expectedX = p1 * x1 + p2 * x2; // E[X]
  const funcOfExpectedX = func(expectedX); // f(E[X])
  const expectedFuncX = p1 * y1 + p2 * y2; // E[f(X)]

  // Convert to canvas coordinates
  const canvasX1 = toCanvasX(x1);
  const canvasY1 = toCanvasY(y1);
  const canvasX2 = toCanvasX(x2);
  const canvasY2 = toCanvasY(y2);
  const canvasExpectedX = toCanvasX(expectedX);
  const canvasFuncOfExpectedX = toCanvasY(funcOfExpectedX);
  const canvasExpectedFuncX = toCanvasY(expectedFuncX); // This point lies on the chord

  return (
    <div className="flex flex-col items-center">
      <Stage width={width} height={height}>
        <Layer>
          {/* Axes */}
          {/* Y-axis */}
          <Line points={[padding, padding, padding, height - padding]} stroke="#aaa" strokeWidth={1} />
          {/* X-axis */}
           <Line points={[padding, height - padding, width - padding, height - padding]} stroke="#aaa" strokeWidth={1} />
          <Text x={width / 2 - 10} y={height - padding + 10} text="x" fontSize={14} fill="#333" />
           <Text x={padding - 30} y={height / 2 - 10} text="-log(x)" rotation={-90} fontSize={14} fill="#333" />


          {/* The curve f(x) = -log(x) */}
          <Line points={curvePoints} stroke="#3498db" strokeWidth={2} tension={0.1} />

          {/* Chord connecting (x1, f(x1)) and (x2, f(x2)) */}
          <Line points={[canvasX1, canvasY1, canvasX2, canvasY2]} stroke="#2ecc71" strokeWidth={1.5} dash={[6, 3]} />

          {/* Points x1 and x2 on the curve */}
          <Circle x={canvasX1} y={canvasY1} radius={6} fill="#e74c3c" draggable
            onDragMove={(e) => {
                const newX = Math.max(minX, Math.min(maxX, fromCanvasX(e.target.x())));
                 setPoint1(p => ({ ...p, x: newX }));
            }} />
           <Circle x={canvasX2} y={canvasY2} radius={6} fill="#e74c3c" draggable
            onDragMove={(e) => {
                const newX = Math.max(minX, Math.min(maxX, fromCanvasX(e.target.x())));
                 setPoint2(p => ({ ...p, x: newX }));
            }} />

          {/* Point E[X] on the x-axis */}
          <Circle x={canvasExpectedX} y={height - padding} radius={5} fill="#9b59b6" />
          <Text x={canvasExpectedX - 15} y={height - padding + 10} text="E[X]" fontSize={12} fill="#9b59b6" />

           {/* Point f(E[X]) on the curve */}
           <Circle x={canvasExpectedX} y={canvasFuncOfExpectedX} radius={6} fill="#9b59b6" stroke="black" strokeWidth={1} />
           <Line points={[canvasExpectedX, height-padding, canvasExpectedX, canvasFuncOfExpectedX]} stroke="#9b59b6" strokeWidth={1} dash={[4, 2]} />
           <Text x={canvasExpectedX + 10} y={canvasFuncOfExpectedX - 5} text="f(E[X])" fontSize={12} fill="#9b59b6" />


           {/* Point E[f(X)] on the chord */}
           <Circle x={canvasExpectedX} y={canvasExpectedFuncX} radius={6} fill="#2ecc71" stroke="black" strokeWidth={1} />
           <Line points={[canvasExpectedX, canvasFuncOfExpectedX, canvasExpectedX, canvasExpectedFuncX]} stroke="#aaa" strokeWidth={1} dash={[2, 2]} />
            <Text x={canvasExpectedX + 10} y={canvasExpectedFuncX - 5} text="E[f(X)]" fontSize={12} fill="#2ecc71" />

             {/* Labels for x1, x2 */}
            <Text x={canvasX1 - 10} y={canvasY1 + 10} text="x₁" fontSize={12} fill="#e74c3c" />
            <Text x={canvasX2 - 10} y={canvasY2 + 10} text="x₂" fontSize={12} fill="#e74c3c" />

        </Layer>
      </Stage>
      <div className="mt-4 w-full max-w-md px-4 text-sm">
         <div className="mb-2">
             Drag the red points (<InlineMath math="x_1, x_2"/>) along the curve or adjust their probabilities below.
         </div>
         <div>
          <label className="block text-xs font-medium mb-1">Probability of <InlineMath math="x_1"/> (P₁): {p1.toFixed(2)}</label>
          <input
            type="range"
            min="0.01"
            max="0.99"
            step="0.01"
            value={p1}
            onChange={(e) => handleProbChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
           <span className="text-xs block text-right">P₂ = {(1 - p1).toFixed(2)}</span>
        </div>
        <div className="mt-3 p-3 bg-gray-100 rounded text-center">
            Jensen's Inequality for convex <InlineMath math="f(x)=-\log(x)"/>: <br/>
            <InlineMath math="f(E[X]) = f(P_1 x_1 + P_2 x_2)" /> (<span style={{color: '#9b59b6'}}>purple</span>)
             <InlineMath math="\leq"/>
             <InlineMath math="E[f(X)] = P_1 f(x_1) + P_2 f(x_2)"/> (<span style={{color: '#2ecc71'}}>green</span>)
             <br/>
             <span className="font-mono text-xs">
                {funcOfExpectedX.toFixed(3)} <InlineMath math="\leq"/> {expectedFuncX.toFixed(3)}
             </span>
             ({(funcOfExpectedX <= expectedFuncX + 1e-9) ? 'Holds' : 'Fails!'}) {/* Add tolerance for float errors */}
        </div>
      </div>
    </div>
  );
} 