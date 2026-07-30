export function persist(op: string, run: Promise<unknown>): void {
  void run.catch((error: unknown) => console.error(`[workflow] ${op} persist failed`, error));
}
