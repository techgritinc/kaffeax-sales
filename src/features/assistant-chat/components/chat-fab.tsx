import { Icon } from '@/components/ui/icon/icon';

export interface ChatFabProps {
  onClick: () => void;
}

/**
 * Floating "open chat" button, visible when the panel is collapsed
 * (`.kx-chat-fab` 339–384). Controlled — parent owns open/close.
 */
export function ChatFab({ onClick }: ChatFabProps) {
  return (
    <button
      type="button"
      className="group bg-midnight shadow-fab hover:bg-midnight-hover hover:shadow-fab-hover fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white transition hover:-translate-y-0.5"
      onClick={onClick}
      title="Ask about this lead"
      aria-label="Ask about this lead"
    >
      <span className="bg-mustard border-midnight absolute top-[10px] right-[12px] box-content h-2 w-2 rounded-full border-2" />
      <Icon name="MessageSquare" size={22} />
      <span className="bg-midnight shadow-tooltip rounded-btn-sm after:bg-midnight pointer-events-none absolute top-1/2 right-[68px] -translate-y-1/2 px-2.5 py-1.5 font-sans text-[12px] font-semibold whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100 after:absolute after:top-1/2 after:right-[-4px] after:h-2 after:w-2 after:-translate-y-1/2 after:rotate-45">
        Ask about this lead
      </span>
    </button>
  );
}
