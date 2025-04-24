/**
 * Format a number as currency with comma separators
 * @param amount The amount to format
 * @param currency The currency symbol (defaults to £)
 * @returns Formatted currency string (e.g. £76,000)
 */
export function formatCurrency(amount: number, currency: string = '£'): string {
  return `${currency}${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
} 