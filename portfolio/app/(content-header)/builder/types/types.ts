// app/(content-header)/builder/types/types.ts

type Scenarios = {
  id: string;
  edges?: any[];
  nodes?: any[];
  job?: string;
  name: string;
  startNodeId?: string;
  description: string;
  [key: string]: any;
};

type BackendKind = 'firebase' | 'fastapi' | 'mock';

export type { 
  Scenarios,
  BackendKind,
};