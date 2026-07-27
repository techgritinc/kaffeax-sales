export const SIGNAL_WEIGHTS = ['hot', 'warm', 'cold'] as const;
export const SIGNAL_SOURCES = ['client', 'proposed'] as const;

export type SignalWeight = (typeof SIGNAL_WEIGHTS)[number];
export type SignalSource = (typeof SIGNAL_SOURCES)[number];

export interface RubricSignalFields {
  signalId: string;
  label: string;
  weight: SignalWeight;
  source: SignalSource;
  hints: string[];
  numericWeight: number;
  isActive: boolean;
}

export interface SimplifiedSignal {
  id: string;
  label: string;
  tier: SignalWeight;
  hints?: string[];
  numericWeight: number;
}
