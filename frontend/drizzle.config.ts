import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";
import { isLocalDatabase } from "./src/db/connection";

// Same precedence as Next.js: .env.local wins over .env
for (const file of [".env.local", ".env"]) {
  if (!process.env.DATABASE_URL && existsSync(file)) process.loadEnvFile(file);
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set. Add it to frontend/.env.local (see .env.example).");

const url = new URL(process.env.DATABASE_URL!);
if (!isLocalDatabase(url.href) && !url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: url.href },
  // Only ever manage the "pos" schema; "public" belongs to the Laravel backend
  schemaFilter: ["pos"],
  migrations: { schema: "pos", table: "__drizzle_migrations" },
  strict: true,
});
