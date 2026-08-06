import Anthropic from '@anthropic-ai/sdk';
import { env } from '@env';

const client = new Anthropic({ apiKey: env.CLAUDE_API_KEY });

export const {
  AuthenticationError,
  RateLimitError,
  BadRequestError,
  APIConnectionError,
  APIError,
} = Anthropic;

export default client;
