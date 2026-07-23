import { env } from '@env';
import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.mongooseCache ?? { conn: null, promise: null };

globalThis.mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(env.MONGO_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 3000,
      })
      .catch((error: unknown) => {
        cache.promise = null;
        const message = error instanceof Error ? error.message : 'unknown error';
        throw new Error(`Failed to connect to MongoDB: ${message}`);
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB(): Promise<void> {
  if (!cache.conn) {
    return;
  }

  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
