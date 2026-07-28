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

    // CLAUDE
    CLAUDE_API_KEY: z.string().min(1),
    CLAUDE_DEFAULT_MODEL: z.string().min(1).optional().default('claude-sonnet-4-6'),
    CLAUDE_MAX_TOKENS: z.coerce.number().int().positive().optional().default(16384),

    // OPEROUTER
    OPENROUTER_API_KEY: z.string().min(1),
    OPENROUTER_DEFAULT_MODEL: z.string().min(1).optional().default('google/gemma-4-31b-it:free'),
    OPENROUTER_MAX_TOKENS: z.coerce.number().int().positive().optional().default(16384),

    // ZOHO
    ZOHO_CLIENT_ID: z.string().min(1),
    ZOHO_CLIENT_SECRET: z.string().min(1),
    ZOHO_REFRESH_TOKEN: z.string().min(1),
    ZOHO_ORGANIZATION_ID: z.string().min(1),
    ZOHO_TOKEN_URL: z.string().url(),
    ZOHO_CRM_API_BASE_URL: z.string().url(),
  },

  runtimeEnv: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    MONGO_URI: process.env.MONGO_URI,

    // CLAUDE
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    CLAUDE_DEFAULT_MODEL: process.env.CLAUDE_DEFAULT_MODEL,
    CLAUDE_MAX_TOKENS: process.env.CLAUDE_MAX_TOKENS,

    // OPENROUTER
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_DEFAULT_MODEL: process.env.OPENROUTER_DEFAULT_MODEL,
    OPENROUTER_MAX_TOKENS: process.env.OPENROUTER_MAX_TOKENS,

    // ZOHO
    ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN,
    ZOHO_ORGANIZATION_ID: process.env.ZOHO_ORGANIZATION_ID,
    ZOHO_TOKEN_URL: process.env.ZOHO_TOKEN_URL,
    ZOHO_CRM_API_BASE_URL: process.env.ZOHO_CRM_API_BASE_URL,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
