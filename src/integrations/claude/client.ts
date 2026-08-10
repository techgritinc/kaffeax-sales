import Anthropic from '@anthropic-ai/sdk';

// import { env } from '@env';

// const client = new Anthropic({ apiKey: env.CLAUDE_API_KEY });
const client = new Anthropic({
  apiKey: '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',
});

export const {
  AuthenticationError,
  RateLimitError,
  BadRequestError,
  APIConnectionError,
  APIError,
} = Anthropic;

export default client;
