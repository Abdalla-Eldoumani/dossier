import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Merge classnames with Tailwind-aware conflict resolution.
// Use everywhere instead of template strings for class composition.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
