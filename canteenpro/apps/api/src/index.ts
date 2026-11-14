import { createApp } from "./app";
import { env } from "./config/env";
import { startCron } from "./jobs/cron";

const app = createApp();
// app.listen(env.PORT, () => {
//   console.info(
//     `🍽️  CanteenPro API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
//   );
//   startCron();
app.listen(env.PORT, "0.0.0.0", () => {
  console.info(
    `🍽️ CanteenPro API listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`,
  );
  startCron();
});
