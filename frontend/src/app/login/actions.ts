"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { safeNextPath } from "@/lib/staffAccess";

export type LoginState = { error: string; email: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Next.js already rejects cross-origin Server Action posts (Origin must match Host), which covers CSRF
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().slice(0, 254);
  const password = String(formData.get("password") ?? "");
  if (!EMAIL.test(email) || password.length === 0 || password.length > 256) {
    return { error: "Enter your work email and password.", email };
  }

  const result = await signIn(email, password);
  if (!result.ok) return { error: result.error, email };
  // A temporary password (new account or admin reset) must be replaced before anything else
  redirect(result.staff.mustChangePassword ? "/account?required=1" : safeNextPath(formData.get("next"), result.staff.role));
}
