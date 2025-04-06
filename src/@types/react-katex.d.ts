declare module 'react-katex' {
  import { ReactNode } from 'react';
  
  export interface KaTeXProps {
    children?: string;
    math?: string;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: Error) => ReactNode;
    settings?: Record<string, unknown>;
    as?: string | React.ComponentType<any>;
  }
  
  export const InlineMath: React.FC<KaTeXProps>;
  export const BlockMath: React.FC<KaTeXProps>;
} 