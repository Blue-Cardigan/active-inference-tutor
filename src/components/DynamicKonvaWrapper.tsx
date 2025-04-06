'use client';

import dynamic from 'next/dynamic';

// Create individual dynamic imports for each component
const DynamicStage = dynamic(() => import('react-konva').then(mod => mod.Stage), { ssr: false });
const DynamicLayer = dynamic(() => import('react-konva').then(mod => mod.Layer), { ssr: false });
const DynamicLine = dynamic(() => import('react-konva').then(mod => mod.Line), { ssr: false });
const DynamicCircle = dynamic(() => import('react-konva').then(mod => mod.Circle), { ssr: false });
const DynamicText = dynamic(() => import('react-konva').then(mod => mod.Text), { ssr: false });

// Export the components
export const Stage = DynamicStage;
export const Layer = DynamicLayer;
export const Line = DynamicLine;
export const Circle = DynamicCircle;
export const Text = DynamicText;

// Export a wrapper component that ensures all Konva components are loaded
export function KonvaWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
} 