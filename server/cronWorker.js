// server/cronWorker.js
import cron from "node-cron";
import { update } from "../scripts/updateCache.js";

console.log("🕓 Yahoo Finance cache worker started");

// run once on boot (so it's fresh right after deploy)
(async () => {
  try {
    console.log("⚡ Running initial cache update...");
    await update();
    console.log("✅ Initial cache update complete");
  } catch (err) {
    console.error("❌ Initial cache update failed:", err.message);
  }
})();

// run every day at 00:05 UTC
cron.schedule("5 0 * * *", async () => {
  try {
    console.log("🔁 [CRON] Updating cached prices from Yahoo Finance...");
    await update();
    console.log("✅ [CRON] Cache updated at", new Date().toISOString());
  } catch (err) {
    console.error("❌ [CRON] Cache update failed:", err.message);
  }
});
