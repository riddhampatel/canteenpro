import { Router } from "express";
import {
  requireActiveSubscription,
  requireFeature,
  requireStaff,
} from "../../middleware/auth";
import { canteensRouter } from "./canteens";
import { staffRouter } from "./staff";
import { employeesRouter } from "./employees";
import { menuRouter } from "./menu";
import { ordersRouter } from "./orders";
import { dashboardRouter } from "./dashboard";
import { guestsRouter } from "./guests";
import { optInsRouter } from "./optins";
import { inventoryRouter } from "./inventory";
import { reportsRouter } from "./reports";
import { billingRouter } from "./billing";
import {
  departmentsRouter,
  devicesRouter,
  expensesRouter,
  feedbackRouter,
  notificationsRouter,
  wasteRouter,
  workersRouter,
  workspaceRouter,
} from "./backoffice";

/** Everything the canteen owner / manager / cashier uses (console + manager mobile app). */
export const tenantRouter = Router();
tenantRouter.use(requireStaff());

// Billing stays reachable when the subscription has lapsed so owners can renew.
tenantRouter.use("/billing", billingRouter);
tenantRouter.use("/workspace", workspaceRouter);

tenantRouter.use(requireActiveSubscription);
tenantRouter.use("/dashboard", dashboardRouter);
tenantRouter.use("/canteens", canteensRouter);
tenantRouter.use("/staff", staffRouter);
tenantRouter.use("/departments", departmentsRouter);
tenantRouter.use("/employees", employeesRouter);
tenantRouter.use("/menu", menuRouter);
tenantRouter.use("/orders", ordersRouter);
tenantRouter.use("/guests", guestsRouter);
tenantRouter.use("/opt-ins", optInsRouter);
tenantRouter.use("/inventory", requireFeature("inventory"), inventoryRouter);
tenantRouter.use("/expenses", requireFeature("inventory"), expensesRouter);
tenantRouter.use("/waste", wasteRouter);
tenantRouter.use("/workers", requireFeature("workforce"), workersRouter);
tenantRouter.use("/feedback", feedbackRouter);
tenantRouter.use("/devices", devicesRouter);
tenantRouter.use("/notifications", notificationsRouter);
tenantRouter.use("/reports", reportsRouter);
