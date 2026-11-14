import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env";
import * as schema from "./schema";

/**
 * Neon works with the standard `pg` driver. Use the *pooled* connection string
 * (host contains "-pooler") for DATABASE_URL in production.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  ssl: /sslmode=require|neon\.tech/.test(env.DATABASE_URL)
    ? { rejectUnauthorized: false }
    : undefined,
});

export const db = drizzle(pool, { schema, casing: "snake_case" });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema };
