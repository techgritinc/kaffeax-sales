import { Spinner } from '@/components/ui/spinner/spinner';

/** Full-viewport, non-dismissible loading overlay — blocks all interaction while shown. */
export function LoadingOverlay() {
  return (
    <div className="bg-midnight/[0.35] fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-[4px]">
      <Spinner size={40} className="text-green-deep" />
    </div>
  );
}
