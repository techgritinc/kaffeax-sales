type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values
    .filter((v): v is string | number => v !== false && v !== null && v !== undefined && v !== '')
    .join(' ')
    .trim();
}
