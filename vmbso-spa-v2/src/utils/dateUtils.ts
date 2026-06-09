/**
 * Format a date string using European format (DD/MM/YYYY).
 */
export const formatDateEU = (value?: string | null, fallback = '-'): string => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
