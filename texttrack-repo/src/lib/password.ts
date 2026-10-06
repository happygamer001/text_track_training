import crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const KEYLEN = 64;
const PREFIX = "scrypt:1";

// Stored format: scrypt:1:<salt base64>:<hash base64>
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN);
  return `${PREFIX}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  // Anything not in our format (e.g. the seed's "replace-me") never verifies.
  if (parts.length !== 4 || `${parts[0]}:${parts[1]}` !== PREFIX) return false;
  const salt = Buffer.from(parts[2], "base64");
  const expected = Buffer.from(parts[3], "base64");
  const actual = await scrypt(password, salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

// Burn roughly the same time as a real check when the email doesn't exist,
// so response time doesn't reveal which emails are admin accounts.
export async function dummyVerify(password: string): Promise<void> {
  await scrypt(password, Buffer.alloc(16), KEYLEN);
}
