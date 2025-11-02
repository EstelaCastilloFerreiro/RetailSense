import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000) {
    const millions = value / 1_000_000;
    // Show 1 decimal if needed, otherwise no decimals
    return millions % 1 === 0 ? millions.toFixed(0) + 'M' : millions.toFixed(1) + 'M';
  } else if (absValue >= 1_000) {
    const thousands = value / 1_000;
    // Show 1 decimal if needed, otherwise no decimals
    return thousands % 1 === 0 ? thousands.toFixed(0) + 'K' : thousands.toFixed(1) + 'K';
  }
  
  return value.toLocaleString('es-ES', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '€0.00';
  }
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000) {
    const millions = value / 1_000_000;
    // Show 2 decimals for currencies
    return '€' + millions.toFixed(2) + 'M';
  } else if (absValue >= 10_000) {
    const thousands = value / 1_000;
    // Show 1 decimal for thousands
    return '€' + thousands.toFixed(1) + 'K';
  }
  
  return '€' + value.toLocaleString('es-ES', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

export function formatPercentage(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0%';
  }
  return value.toFixed(decimals) + '%';
}
