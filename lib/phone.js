// Costa Rica phone: 8 digits. Shared by the pledge form (client) and the
// server so both accept the same input. Spaces, dashes, dots and brackets
// are ignored, and a leading country code (+506, 506, 00506) is dropped.
// Returns the 8 digits, or null when it isn't a valid phone.
export function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  let digits = value.trim().replace(/[\s\-.()]/g, '');
  digits = digits.replace(/^(\+|00)?506(?=[0-9]{8}$)/, '');
  return /^[0-9]{8}$/.test(digits) ? digits : null;
}
