/** Log with context and surface a user-safe error (never leak internals) — constitution §XIV. */
export function logAndThrow(op: string, error: unknown, message: string): never {
  console.error(`[server-action] ${op} failed`, error);
  throw new Error(message);
}
