import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date));
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const getMarginColor = (rate: number): string => {
  if (rate < 15) return 'text-red-600';
  if (rate < 30) return 'text-yellow-600';
  return 'text-green-600';
};