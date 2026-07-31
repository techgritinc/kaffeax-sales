export type ProcessingStage = 'idle' | 'preparing' | 'processing' | 'extracting';

export interface ProcessingStep {
  label: string;
  stage: ProcessingStage;
}
