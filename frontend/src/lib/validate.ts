import { ActionError } from "@/lib/staffContext";

// Form-field readers for server actions. Every one bounds its input and throws a user-facing ActionError,
// so actions never trust what the browser sent.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function text(fd: FormData, key: string, label: string, { max = 200, required = true, min = 0 } = {}): string {
  const raw = fd.get(key);
  const v = typeof raw === "string" ? raw.trim() : "";
  if (required && !v) throw new ActionError(`${label} is required.`);
  if (v.length > max) throw new ActionError(`${label} must be at most ${max} characters.`);
  if (v && v.length < min) throw new ActionError(`${label} must be at least ${min} characters.`);
  return v;
}

export const optionalText = (fd: FormData, key: string, label: string, max = 200) => text(fd, key, label, { max, required: false }) || null;

/** "149", "149.50", "1,299.00" → centavos. */
export function money(fd: FormData, key: string, label: string, { min = 0, max = 10_000_000 } = {}): number {
  const v = text(fd, key, label, { max: 20 }).replace(/[,₱\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) throw new ActionError(`${label} must be an amount like 149 or 149.50.`);
  const cents = Math.round(Number(v) * 100);
  if (cents < min || cents > max) throw new ActionError(`${label} is out of range.`);
  return cents;
}

export function int(fd: FormData, key: string, label: string, { min = 0, max = 10_000, required = true } = {}): number | null {
  const v = text(fd, key, label, { max: 10, required });
  if (!v) return null;
  if (!/^-?\d+$/.test(v)) throw new ActionError(`${label} must be a whole number.`);
  const n = Number(v);
  if (n < min || n > max) throw new ActionError(`${label} must be between ${min} and ${max}.`);
  return n;
}

export const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";

export function id(fd: FormData | string | null | undefined, key?: string, label = "Item"): string {
  const v = typeof fd === "string" || fd == null ? fd : fd.get(key!);
  if (typeof v !== "string" || !UUID.test(v)) throw new ActionError(`${label} not found.`, 404);
  return v;
}

export const optionalId = (fd: FormData, key: string, label: string) => (fd.get(key) ? id(fd, key, label) : null);

export const ids = (fd: FormData, key: string) => fd.getAll(key).filter((v): v is string => typeof v === "string" && UUID.test(v));

export function email(fd: FormData, key = "email"): string {
  const v = text(fd, key, "Email", { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new ActionError("Enter a valid email address.");
  return v;
}

/** Only https image URLs (no javascript:, data: or http mixed content). */
export function imageUrl(fd: FormData, key: string): string | null {
  const v = optionalText(fd, key, "Image URL", 1000);
  if (!v) return null;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new ActionError("Image URL must be a full https:// link.");
  }
  if (url.protocol !== "https:") throw new ActionError("Image URL must start with https://");
  return url.href;
}

/** Staff passwords: 10+ characters with a letter and a number (they can reach payments and customer data). */
export function newPassword(fd: FormData, key = "password", confirmKey?: string): string {
  const raw = fd.get(key);
  const v = typeof raw === "string" ? raw : "";
  if (v.length < 10 || v.length > 128) throw new ActionError("Password must be 10 to 128 characters.");
  if (!/[a-zA-Z]/.test(v) || !/\d/.test(v)) throw new ActionError("Password must include at least one letter and one number.");
  if (confirmKey && fd.get(confirmKey) !== v) throw new ActionError("The two passwords don't match.");
  return v;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
