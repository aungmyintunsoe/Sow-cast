import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Join class names; later Tailwind classes win over earlier conflicting ones. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_INITIAL = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Whole number with thousands separators; an en dash when there is no value. */
export const formatInt = (v: number | null | undefined) =>
  v === null || v === undefined ? '–' : Math.round(v).toLocaleString();
