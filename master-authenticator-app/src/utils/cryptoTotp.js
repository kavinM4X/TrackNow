// Client-side TOTP & 6-Digit Daily User ID calculation utility for React Native
const MASTER_SECRET = (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_MASTER_SECRET) || 'TRACKNOW_MASTER_SECRET_KEY_2026';
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function simpleHmacSha256(key, message) {
  let hash = 0;
  const str = key + '_' + message;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Computes a 6-Digit Daily User ID (e.g. 763412)
 * Changes every 24 hours at 00:00 UTC/IST
 */
export function getDailyUserId(secret = MASTER_SECRET, date = new Date()) {
  const dateStr = date.toISOString().split('T')[0];
  const hashVal = simpleHmacSha256(secret, `USER_ID_${dateStr}`);
  const num = (hashVal % 900000) + 100000; // 6-digit number 100000 - 999999
  return String(num);
}

export function getAuthenticatorCode(secret = MASTER_SECRET, timestampMs = Date.now()) {
  const counter = Math.floor(timestampMs / 1000 / 60);
  const hashVal = simpleHmacSha256(secret, `TOTP_${counter}`);

  let code = '';
  let seed = hashVal;
  for (let i = 0; i < 5; i++) {
    const charIdx = (seed + i * 17) % ALPHABET.length;
    code += ALPHABET[charIdx];
  }
  return code;
}

export function getRemainingSeconds(timestampMs = Date.now()) {
  return 60 - Math.floor((timestampMs / 1000) % 60);
}
