import { randomBytes, scrypt as scryptCb, timingSafeEqual, type BinaryLike } from "node:crypto";
import { promisify } from "node:util";

// Stored as "scrypt$<salt>$<hash>" (base64url, Node's default N=16384, r=8, p=1). Shared by the seed script and sign-in.
const scrypt = promisify(scryptCb) as (password: BinaryLike, salt: BinaryLike, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
