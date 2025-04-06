'use client';

import dynamic from 'next/dynamic';
import type { KonvaComponents } from './KonvaComponents';

const KonvaComponents = dynamic<KonvaComponents>(() => import('./KonvaComponents'), {
  ssr: false,
});

export const Stage = KonvaComponents.Stage;
export const Layer = KonvaComponents.Layer;
export const Line = KonvaComponents.Line;
export const Circle = KonvaComponents.Circle;
export const Text = KonvaComponents.Text; 