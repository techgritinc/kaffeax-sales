import { env } from '@env';

type ChatCompletionBody = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens: number;
  temperature?: number;
  response_format?: { type: string };
};

export function chatCompletion(body: ChatCompletionBody): Promise<Response> {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.NEXT_PUBLIC_APP_URL,
      'X-Title': 'Kaffea-X Sales',
    },
    body: JSON.stringify(body),
  });
}
