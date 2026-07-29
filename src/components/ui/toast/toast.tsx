import { Icon, type IconName } from '@/components/ui/icon/icon';
import { cn } from '@/lib/utils/cn';
import type { ToastTone } from '@/types/workflow.types';

export interface ToastProps {
  message: string;
  tone: ToastTone;
  className?: string;
}

const TONE_CLASS: Record<ToastTone, string> = {
  success: 'bg-green-deep',
  reject: 'bg-rust',
  info: 'bg-midnight',
};

const TONE_ICON: Record<ToastTone, IconName> = {
  success: 'CheckCircle2',
  reject: 'XCircle',
  info: 'History',
};

/** Transient toast notification — prototype lines 3529–3540. */
export function Toast({ message, tone, className }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        'animate-toast-in rounded-input-sm shadow-tooltip fixed top-[14px] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 px-[16px] py-[9px] text-[12.5px] font-semibold text-white',
        TONE_CLASS[tone],
        className,
      )}
    >
      <Icon name={TONE_ICON[tone]} size={14} />
      {message}
    </div>
  );
}
