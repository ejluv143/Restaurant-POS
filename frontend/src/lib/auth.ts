import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { homeFor, type StaffRole } from "@/lib/staffAccess";

// Staff sign-in with database sessions. The cookie carries a random 256-bit token; the database keeps
// only its SHA-256, so sessions can be revoked server-side and a DB leak can't be replayed.

const { authSessions, loginAttempts, users } = schema;
const PRODUCTION = process.env.NODE_ENV === "production";

// "__Host-" makes the browser reject the cookie unless it's Secure, host-only and Path=/ (needs HTTPS)
export const SESSION_COOKIE = PRODUCTION ? "__Host-synchub_session" : "synchub_session";
export const SESSION_COOKIE_OPTIONS = { httpOnly: true, secure: PRODUCTION, sameSite: "lax", path: "/" } as const;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // one long shift
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_EMAIL = 5;
const MAX_FAILURES_PER_IP = 30;

export type Staff = { id: string; fullName: string; email: string; role: StaffRole; restaurantId: string | null; mustChangePassword: boolean };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Checked when the email is unknown, so a miss takes as long as a wrong password (no account probing by timing)
let dummyHash: Promise<string> | undefined;

export async function requestMeta() {
  const h = await headers();
  // First hop only; trust it as far as your reverse proxy sets it
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim().slice(0, 64) || null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

/** Looks up the signed-in staff member for a session token. Used by the proxy and by getCurrentStaff. */
export async function findStaffBySessionToken(token: string | undefined): Promise<Staff | null> {
  if (!token || token.length > 128) return null;
  const [row] = await getDb()
    .select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role, restaurantId: users.restaurantId, mustChangePassword: users.mustChangePassword })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .leftJoin(schema.restaurants, eq(schema.restaurants.id, users.restaurantId))
    .where(
      and(
        eq(authSessions.tokenHash, hashToken(token)),
        gt(authSessions.expiresAt, new Date()),
        eq(users.isActive, true),
        // A suspended restaurant locks out all of its staff at once
        sql`coalesce(${schema.restaurants.isActive}, true)`,
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Changes the signed-in user's password after re-checking the current one, clears the "must change" flag
 * and signs out their other devices (this one stays signed in).
 */
export async function changeOwnPassword(staff: Staff, current: string, next: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, staff.id));
  if (!row || !(await verifyPassword(current, row.passwordHash))) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  await db.update(users).set({ passwordHash: await hashPassword(next), mustChangePassword: false }).where(eq(users.id, staff.id));
  await db.delete(authSessions).where(and(eq(authSessions.userId, staff.id), sql`${authSessions.tokenHash} <> ${hashToken(token)}`));
  return true;
}

/** Signs a user out everywhere (suspension, password reset). */
export async function revokeUserSessions(userId: string) {
  await getDb().delete(authSessions).where(eq(authSessions.userId, userId));
}

export const getCurrentStaff = cache(async () => findStaffBySessionToken((await cookies()).get(SESSION_COOKIE)?.value));

/** For server pages: the signed-in staff member, or a redirect to /login (or the role's home if the role isn't allowed). */
export async function requireStaff(roles?: StaffRole[]): Promise<Staff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");
  if (roles && !roles.includes(staff.role)) redirect(homeFor(staff.role));
  return staff;
}

/** For staff-only route handlers: a 401 response to return early with, or null when a staff member is signed in. */
export async function staffOnly(): Promise<Response | null> {
  return (await getCurrentStaff()) ? null : Response.json({ error: "Staff sign-in required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}

/** 403 for cross-site browser requests to cookie-authenticated mutations (on top of SameSite=Lax); null otherwise. */
export function crossSiteDenied(request: Request): Response | null {
  const site = request.headers.get("sec-fetch-site");
  return site && site !== "same-origin" ? Response.json({ error: "Forbidden." }, { status: 403 }) : null;
}

export type SignInResult ={ ok: true; staff: Staff } | { ok: false; error: string };

type SignInRow = {
  email_failures: number;
  email_oldest: string | null;
  ip_failures: number;
  ip_oldest: string | null;
  id: string | null;
  password_hash: string | null;
  full_name: string;
  email: string;
  role: StaffRole;
  restaurant_id: string | null;
  is_active: boolean | null;
  must_change_password: boolean;
};

// Sign-in is exactly two statements on one connection (a hosted database can be hundreds of ms per
// round trip and seconds per new connection), hence the raw SQL with CTEs below.
export async function signIn(emailInput: string, password: string): Promise<SignInResult> {
  const email = emailInput.trim().toLowerCase();
  const { ip, userAgent } = await requestMeta();
  const db = getDb();
  // Raw sql params don't serialize Dates with the postgres driver, so pass ISO text and cast
  const since = sql`${new Date(Date.now() - ATTEMPT_WINDOW_MS).toISOString()}::timestamptz`;

  // 1) Recent failures for this email since its last success (a success resets the count) and for
  //    this IP across all emails, plus the account itself
  const [row] = await db.execute<SignInRow>(sql`
    with last_ok as (select coalesce(max(created_at), '-infinity') as at from ${loginAttempts} where email = ${email} and succeeded),
    fails as (
      select
        count(*) filter (where a.email = ${email} and a.created_at > last_ok.at)::int as email_failures,
        (min(a.created_at) filter (where a.email = ${email} and a.created_at > last_ok.at))::text as email_oldest,
        count(*) filter (where a.ip_address = ${ip})::int as ip_failures,
        (min(a.created_at) filter (where a.ip_address = ${ip}))::text as ip_oldest
      from ${loginAttempts} a, last_ok
      where not a.succeeded and a.created_at > ${since} and (a.email = ${email} or a.ip_address = ${ip}))
    select fails.*, u.id, u.password_hash, u.full_name, u.email, u.role, u.restaurant_id, u.must_change_password,
      (u.is_active and coalesce(r.is_active, true)) as is_active
    from fails
    left join ${users} u on lower(u.email) = ${email}
    left join ${schema.restaurants} r on r.id = u.restaurant_id`);

  const locked = [row.email_failures >= MAX_FAILURES_PER_EMAIL && row.email_oldest, ip && row.ip_failures >= MAX_FAILURES_PER_IP && row.ip_oldest].filter(
    (oldest): oldest is string => !!oldest,
  );
  if (locked.length > 0) {
    const unlockAt = Math.max(...locked.map((oldest) => new Date(oldest).getTime() + ATTEMPT_WINDOW_MS));
    const wait = Math.max(1, Math.ceil((unlockAt - Date.now()) / 60_000));
    return { ok: false, error: `Too many sign-in attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.` };
  }

  const passwordOk = await verifyPassword(password, row.password_hash ?? (await (dummyHash ??= hashPassword(randomBytes(16).toString("hex")))));
  if (!row.id || !passwordOk || !row.is_active) {
    await db.insert(loginAttempts).values({ email, ipAddress: ip, succeeded: false });
    // Same message for unknown email, wrong password and disabled account
    return { ok: false, error: "Incorrect email or password." };
  }

  // 2) Record the success and issue a fresh token (no session fixation); drop this browser's previous
  //    session, the user's expired ones, and attempt history older than 30 days
  const store = await cookies();
  const previous = store.get(SESSION_COOKIE)?.value;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.execute(sql`
    with attempt as (insert into ${loginAttempts} (email, ip_address, succeeded) values (${email}, ${ip}, true)),
    new_session as (
      insert into ${authSessions} (user_id, token_hash, ip_address, user_agent, expires_at)
      values (${row.id}, ${hashToken(token)}, ${ip}, ${userAgent}, ${expiresAt.toISOString()}::timestamptz)),
    old_sessions as (
      delete from ${authSessions}
      where token_hash = ${previous ? hashToken(previous) : null} or (user_id = ${row.id} and expires_at < now())),
    old_attempts as (delete from ${loginAttempts} where created_at < now() - interval '30 days'),
    last_login as (update ${users} set last_login_at = now() where id = ${row.id}),
    audit as (
      insert into ${schema.auditLogs} (user_id, actor_name, actor_role, restaurant_id, action, entity_type, entity_id, ip_address)
      values (${row.id}, ${row.full_name}, ${row.role}, ${row.restaurant_id}, 'auth.login', 'user', ${row.id}, ${ip}))
    select 1`);
  store.set(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, expires: expiresAt });

  return {
    ok: true,
    staff: { id: row.id, fullName: row.full_name, email: row.email, role: row.role, restaurantId: row.restaurant_id, mustChangePassword: row.must_change_password },
  };
}

export async function signOut() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const staff = await findStaffBySessionToken(token);
  if (staff) {
    const { ip } = await requestMeta();
    await getDb()
      .insert(schema.auditLogs)
      .values({ userId: staff.id, actorName: staff.fullName, actorRole: staff.role, restaurantId: staff.restaurantId, action: "auth.logout", entityType: "user", entityId: staff.id, ipAddress: ip });
  }
  if (token) await getDb().delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
  // Expire with the same attributes it was set with, or browsers ignore the deletion of a __Host- cookie
  store.set(SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
}
