import crypto from 'node:crypto';

// Ambiguous characters (0/O, 1/I) are left out so codes survive being read aloud.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_PATTERN = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

export function generateRoomCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += ALPHABET[bytes[index] % ALPHABET.length];
  }
  return code;
}

export function normalizeRoomCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function isValidRoomCode(value) {
  return CODE_PATTERN.test(normalizeRoomCode(value));
}
