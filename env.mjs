import { z } from 'zod';
import { createEnv } from '@t3-oss/env-nextjs';

export const env = createEnv({
  client: {
    NEXT_PUBLIC_APP_ENV: z.enum(['development', 'production']),
    NEXT_PUBLIC_APP_URL: z.url(),
  },

  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']),
    MONGO_URI: z.string().min(1),
    CLAUDE_API_KEY: z.string().min(1),
    CLAUDE_DEFAULT_MODEL: z.string().min(1),
    CLAUDE_MAX_TOKENS: z.coerce.number().int().positive(),
    OPENROUTER_API_KEY: z.string().min(1),
    OPENROUTER_DEFAULT_MODEL: z.string().min(1),
    OPENROUTER_MAX_TOKENS: z.coerce.number().int().positive(),
  },

  runtimeEnv: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    MONGO_URI: process.env.MONGO_URI,
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    CLAUDE_DEFAULT_MODEL: process.env.CLAUDE_DEFAULT_MODEL,
    CLAUDE_MAX_TOKENS: process.env.CLAUDE_MAX_TOKENS,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_DEFAULT_MODEL: process.env.OPENROUTER_DEFAULT_MODEL,
    OPENROUTER_MAX_TOKENS: process.env.OPENROUTER_MAX_TOKENS,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
