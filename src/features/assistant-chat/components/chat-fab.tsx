import { Icon } from '@/components/ui/icon';

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
      className="bg-midnight shadow-fab hover:bg-midnight-hover hover:shadow-fab-hover fixed right-6 bottom-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full text-white transition hover:-translate-y-0.5"
      onClick={onClick}
      title="Ask about this lead"
      aria-label="Ask about this lead"
    >
      <Icon name="MessageSquare" size={22} />
      <span className="border-midnight bg-mustard absolute top-2.5 right-3 h-2 w-2 rounded-full border-2" />
    </button>
  );
}
