import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/breadcrumb';
import type { Step } from '@/types/workflow.types';

export interface StepperProps {
  step: Step;
  canReview: boolean;
  canCommit: boolean;
  onGoTo: (step: Step) => void;
  className?: string;
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'capture', label: 'Capture' },
  { key: 'review', label: 'Review' },
  { key: 'commit', label: 'CRM' },
];

/** Capture › Review › CRM breadcrumb with the prototype's reachability gating. */
export function Stepper({ step, canReview, canCommit, onGoTo, className }: StepperProps) {
  const reachable: Record<Step, boolean> = {
    capture: true,
    review: canReview,
    commit: canCommit,
  };

  const items: BreadcrumbItem[] = STEPS.map((s) => {
    const active = s.key === step;
    return {
      key: s.key,
      label: s.label,
      active,
      disabled: !reachable[s.key] && !active,
      onClick: () => onGoTo(s.key),
    };
  });

  return <Breadcrumb items={items} className={className} />;
}
