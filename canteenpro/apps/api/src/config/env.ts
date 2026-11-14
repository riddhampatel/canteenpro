import "dotenv/config";
import { z } from "zod";

const bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => v === true || v === "true" || v === "1");

// Validate and parse environment variables
//all are rules that must followed by environment variables
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DB_POOL_MAX: z.coerce.number().default(10),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  ENCRYPTION_KEY: z.string().optional().default(""),
  CORS_ORIGINS: z
    .string()
    .default(
      // "http://localhost:3000,http://localhost:5173,http://localhost:5174",
      "http://192.168.1.163:3000,http://192.168.1.163:5173,http://192.168.1.163:5174"
    ),
  WEBSITE_URL: z.string().default("http://192.168.1.163:3000"),
  CONSOLE_URL: z.string().default("http://192.168.1.163:5173"),
  SUPERADMIN_URL: z.string().default("http://192.168.1.163:5174"),
  CRON_ENABLED: bool.default(true),
  CRON_TIMEZONE: z.string().default("Asia/Kolkata"),
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  ONESIGNAL_APP_ID: z.string().optional().default(""),
  ONESIGNAL_REST_API_KEY: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: bool.default(false),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().default("CanteenPro <no-reply@canteenpro.in>"),
  PAYMENTS_TEST_MODE: bool.default(false),
  SEED_ADMIN_EMAIL: z.string().default("admin@canteenpro.in"),
  SEED_ADMIN_PASSWORD: z.string().default("Admin@123"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "❌ Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}
export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
