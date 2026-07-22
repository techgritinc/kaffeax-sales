type ClassValue = string | number | false | null | undefined;

/**
 * Minimal className joiner — merges truthy class tokens with single spaces.
 * Keeps components dependency-free (no clsx) while giving a consistent API
 * for conditional and passed-through `className` values.
 */
export function cn(...values: ClassValue[]): string {
  return values
    .filter((v): v is string | number => v !== false && v !== null && v !== undefined && v !== '')
    .join(' ')
    .trim();
}
