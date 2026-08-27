type ClassValue = string | false | null | undefined;

/** Joins class names, dropping falsy values so conditionals stay inline. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
