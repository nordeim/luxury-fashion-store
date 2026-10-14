import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Class composition helper — clsx + tailwind-merge (shadcn convention).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
