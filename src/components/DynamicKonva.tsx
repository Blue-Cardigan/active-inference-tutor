'use client';

import dynamic from 'next/dynamic';

// Correct approach: import each component separately and don't specify generic type
const Stage = dynamic(() => import('react-konva').then(mod => mod.Stage), { ssr: false });
const Layer = dynamic(() => import('react-konva').then(mod => mod.Layer), { ssr: false });
const Line = dynamic(() => import('react-konva').then(mod => mod.Line), { ssr: false });
const Circle = dynamic(() => import('react-konva').then(mod => mod.Circle), { ssr: false });
const Text = dynamic(() => import('react-konva').then(mod => mod.Text), { ssr: false });

export { Stage, Layer, Line, Circle, Text }; 