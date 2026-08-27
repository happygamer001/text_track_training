// Minimal US-focused normalizer — good enough for this skeleton. Before
// production, swap for a proper library (e.g. libphonenumber-js) to handle
// international numbers and better validation.
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return input.startsWith("+") ? input : `+${digits}`;
}
