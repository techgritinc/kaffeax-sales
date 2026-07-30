import { env } from '@env';

import { MeetingChat as ClaudeMeetingChat } from '@/integrations/claude/meeting-chat';
import { MeetingChat as OpenRouterMeetingChat } from '@/integrations/openrouter/meeting-chat';
import type { GroundingContext, MeetingChatResponse } from '@/types/chat.types';

/** Structural contract both provider integrations satisfy. */
export interface MeetingChatLike {
  ask(context: GroundingContext, question: string): Promise<MeetingChatResponse>;
}

/** Picks the AI provider by environment: OpenRouter in development, Claude in production. */
export function getMeetingChat(): MeetingChatLike {
  return env.NEXT_PUBLIC_APP_ENV === 'development'
    ? new OpenRouterMeetingChat()
    : new ClaudeMeetingChat();
}
