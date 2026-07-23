import { connectDB } from './mongoose';

export function withDb<T>(fn: () => Promise<T>): Promise<T>;
export function withDb<T>(fn: (req: Request) => Promise<T>): (req: Request) => Promise<T>;
export function withDb<T>(
  fn: (() => Promise<T>) | ((req: Request) => Promise<T>),
): Promise<T> | ((req: Request) => Promise<T>) {
  if (fn.length === 0) {
    const task = fn as () => Promise<T>;
    return connectDB().then(() => task());
  }

  const handler = fn as (req: Request) => Promise<T>;
  return async (req: Request) => {
    await connectDB();
    return handler(req);
  };
}
