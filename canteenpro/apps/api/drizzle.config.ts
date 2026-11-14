import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  // migrations should use the DIRECT (non-pooled) Neon URL
  dbCredentials: { url: process.env.DIRECT_URL || process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
