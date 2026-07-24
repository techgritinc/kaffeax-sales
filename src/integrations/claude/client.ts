import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const {
  AuthenticationError,
  RateLimitError,
  BadRequestError,
  APIConnectionError,
  APIError,
} = Anthropic;

export default client;
