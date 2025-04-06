'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const KonvaStage = dynamic(() => import('react-konva').then(mod => mod.Stage), { ssr: false });
const KonvaLayer = dynamic(() => import('react-konva').then(mod => mod.Layer), { ssr: false });
const KonvaLine = dynamic(() => import('react-konva').then(mod => mod.Line), { ssr: false });
const KonvaCircle = dynamic(() => import('react-konva').then(mod => mod.Circle), { ssr: false });
const KonvaText = dynamic(() => import('react-konva').then(mod => mod.Text), { ssr: false });

export const Stage = KonvaStage;
export const Layer = KonvaLayer;
export const Line = KonvaLine;
export const Circle = KonvaCircle;
export const Text = KonvaText; 