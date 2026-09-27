import type { Options } from "postgres";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "db"]);

/** Hosted databases (Supabase, Neon, RDS…) get TLS; the local Docker database doesn't need it. */
export const isLocalDatabase = (url: string) => LOCAL_HOSTS.has(new URL(url).hostname);

export function connectionOptions(url: string, max = 10): Options<Record<string, never>> {
  const { port } = new URL(url);
  return {
    max,
    ssl: isLocalDatabase(url) ? false : "require",
    // Hosted poolers and NATs silently drop idle sockets; retire them first so a query never lands on a dead one
    idle_timeout: isLocalDatabase(url) ? 0 : 120,
    max_lifetime: 30 * 60,
    connect_timeout: 60,
    // Supabase's transaction pooler (port 6543) can't hold prepared statements across transactions
    prepare: port !== "6543",
  };
}
