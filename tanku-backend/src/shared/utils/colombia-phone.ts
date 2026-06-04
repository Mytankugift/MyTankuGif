export const COLOMBIA_PHONE_PREFIX = '+57';

const NATIONAL_LENGTH = 10;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeColombiaPhone(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  let digits = digitsOnly(input);
  if (digits.startsWith('57') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (digits.length !== NATIONAL_LENGTH || !digits.startsWith('3')) {
    return null;
  }
  return `${COLOMBIA_PHONE_PREFIX}${digits}`;
}

export function isValidColombiaPhone(input: string | null | undefined): boolean {
  return normalizeColombiaPhone(input) !== null;
}
