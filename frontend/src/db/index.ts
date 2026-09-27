import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { connectionOptions } from "./connection";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// One pool per server process, reused across dev hot reloads so connections don't pile up.
// Created lazily so builds that never touch the database don't need DATABASE_URL.
const globalForDb = globalThis as unknown as { db?: Db };

export function getDb(): Db {
  if (globalForDb.db) return globalForDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy frontend/.env.example to frontend/.env.local.");
  return (globalForDb.db = drizzle({ client: postgres(url, connectionOptions(url)), schema }));
}

export { schema };
