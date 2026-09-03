const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT = 'tracknow_aes_salt_2026';

// Derive 32-byte key consistently from environment secret
function getEncryptionKey() {
  const secret =
    process.env.DATA_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'tracknow_production_data_encryption_fallback_key_2026';
  return crypto.scryptSync(secret, SALT, 32);
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Stored format: enc:<iv_hex>:<ciphertext_hex>:<auth_tag_hex>
 */
function encryptText(text) {
  if (!text || typeof text !== 'string') return text;
  if (text.startsWith('enc:')) return text; // already encrypted

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${encrypted}:${authTag}`;
  } catch (err) {
    console.error('AES Encryption Error:', err.message);
    return text;
  }
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * Transparently returns plaintext if input is not encrypted.
 */
function decryptText(cipherText) {
  if (!cipherText || typeof cipherText !== 'string') return cipherText;
  if (!cipherText.startsWith('enc:')) return cipherText; // legacy or plaintext

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 4) return cipherText;

    const [, ivHex, encryptedHex, authTagHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('AES Decryption Error:', err.message);
    return cipherText;
  }
}

module.exports = {
  encryptText,
  decryptText
};
