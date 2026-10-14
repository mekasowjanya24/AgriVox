/**
 * Normalizes mobile phone numbers:
 * - Trims whitespace
 * - Removes spaces, dashes, dots, parentheses
 * - Strips leading +91 or 91 (country code)
 * - Strips leading 0
 * Returns clean 10-digit string if valid.
 */
export const normalizePhone = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let cleaned = raw.trim().replace(/[\s\-\.\(\)]/g, '');
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
};

export const isValidPhone = (raw) => {
  const normalized = normalizePhone(raw);
  return /^[6-9]\d{9}$/.test(normalized);
};
