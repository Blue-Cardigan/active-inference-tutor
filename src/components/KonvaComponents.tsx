'use client';

import { Stage, Layer, Line, Circle, Text } from 'react-konva';
import { ComponentType } from 'react';

export interface KonvaComponents {
  Stage: ComponentType<any>;
  Layer: ComponentType<any>;
  Line: ComponentType<any>;
  Circle: ComponentType<any>;
  Text: ComponentType<any>;
}

const components: KonvaComponents = {
  Stage,
  Layer,
  Line,
  Circle,
  Text,
};

export default components; 