/**
 * Converts a string into a URL-safe slug.
 * "Caste Certificate" -> "caste-certificate"
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Generates a sequential-looking application number, e.g. CSC20260001
 * `sequence` should come from an atomic counter (see Counter model) to avoid collisions.
 */
export const generateApplicationNumber = (prefix: string, year: number, sequence: number): string => {
  const padded = String(sequence).padStart(4, '0');
  return `${prefix}${year}${padded}`;
};

/**
 * Generates a 6-digit numeric OTP.
 */
export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
