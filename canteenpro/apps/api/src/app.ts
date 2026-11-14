import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { env, isProd } from "./config/env";
import { errorHandler } from "./lib/http";
import { publicRouter, webhookRouter } from "./modules/public";
import {
  employeeAuthRouter,
  platformAuthRouter,
  staffAuthRouter,
} from "./modules/auth";
import { tenantRouter } from "./modules/tenant";
import { employeeRouter } from "./modules/employee";
import { deviceRouter } from "./modules/device";
import { platformRouter } from "./modules/platform";
import { pool } from "./db";

export function createApp() {
  //function cretaApp()
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());
  const origins = env.CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: (origin, cb) =>
        cb(null, !origin || origins.includes("*") || origins.includes(origin)),
      credentials: true,
    }),
  );
  // keep raw body for webhook signature verification
  app.use(
    express.json({
      limit: "2mb",
      verify: (req: any, _res, buf) => (req.rawBody = buf.toString("utf8")),
    }),
  );
  app.use(morgan(isProd ? "combined" : "dev"));

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("select 1");
      res.json({ ok: true, db: "up", time: new Date().toISOString() });
    } catch {
      res.status(503).json({ ok: false, db: "down" });
    }
  });

  const api = express.Router();
  api.use("/public", publicRouter);
  api.use("/webhooks", webhookRouter);
  api.use("/platform/auth", platformAuthRouter);
  api.use("/platform", platformRouter);
  api.use("/auth", staffAuthRouter);
  api.use("/tenant", tenantRouter);
  api.use("/employee/auth", employeeAuthRouter);
  api.use("/employee", employeeRouter);
  api.use("/device", deviceRouter);
  app.use("/api", api);

  app.use((_req, res) => res.status(404).json({ error: "Route not found" }));
  app.use(errorHandler);
  return app;
}

// for Js we use last at    module.exports = { createApp };
