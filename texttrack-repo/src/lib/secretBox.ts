import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Encrypts small secrets (the admin authenticator seeds) before they go into
// the database, so a database leak alone can't be used to generate admin codes.
//
// AES-256-GCM, key derived from the MFA_ENCRYPTION_KEY environment variable
// (set a long random value, 32+ characters, in Vercel). Stored form:
//   enc:v1:<iv>:<auth tag>:<ciphertext>   (all base64url)
//
// Backward compatible: values saved before this existed are plain text and are
// returned unchanged by decryptSecret(), then upgraded the next time that admin
// signs in successfully (see the mfa route).

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.MFA_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) return null;
  return createHash("sha256").update(raw).digest();
}

export function encryptionConfigured(): boolean {
  return getKey() !== null;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Encrypts when a key is configured; otherwise returns the value unchanged. */
export function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key) {
    console.warn("MFA_ENCRYPTION_KEY is not set (or under 32 characters): authenticator secret stored unencrypted.");
    return plain;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${ct.toString("base64url")}`;
}

/** Reverses encryptSecret. Plain (legacy) values pass straight through. */
export function decryptSecret(stored: string): string {
  if (!isEncrypted(stored)) return stored;
  const key = getKey();
  if (!key) {
    throw new Error("Stored authenticator secret is encrypted but MFA_ENCRYPTION_KEY is missing on the server.");
  }
  const [iv, tag, ct] = stored.slice(PREFIX.length).split(":");
  if (!iv || !tag || !ct) throw new Error("Malformed encrypted secret.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}
