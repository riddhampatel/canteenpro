import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";
import path from "node:path";

/** Applies SQL migrations from ./drizzle (generated with `npm run db:generate`). */
(async () => {
  console.info("Running migrations…");
  await migrate(db, {
    migrationsFolder: path.resolve(__dirname, "../../drizzle"),
  });
  console.info("✅ Migrations complete");
  await pool.end();
})().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
