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
  },

  runtimeEnv: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    MONGO_URI: process.env.MONGO_URI,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
