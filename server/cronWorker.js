// server/cronWorker.js
// Feature-flag controlled cron worker.
// Cron is OFF by default unless ENABLE_CRON=true

import cron from "node-cron";
import updateIncremental from "../scripts/updateCache.js"; // 1-year incremental updater

const ENABLE_CRON =
  String(process.env.ENABLE_CRON || "false").toLowerCase() === "true";

console.log("🕓 cronWorker.js loaded");
console.log(`🔧 ENABLE_CRON = ${ENABLE_CRON}`);

if (!ENABLE_CRON) {
  console.log(
    "⏸️ Cron worker disabled — no Yahoo Finance automatic updates will run."
  );
  // No exports needed. File is inert.
} else {
  console.log("⚡ Cron worker enabled — starting scheduled jobs...");

  // Run once on startup
  (async () => {
    try {
      console.log("⚡ Running initial incremental cache update...");
      await updateIncremental();
      console.log("✅ Initial cache update complete");
    } catch (err) {
      console.error("❌ Initial cache update failed:", err.message);
    }
  })();

  // Run daily at 00:05 UTC
  cron.schedule("5 0 * * *", async () => {
    try {
      console.log("🔁 [CRON] Daily incremental update…");
      await updateIncremental();
      console.log("✅ [CRON] Cache updated");
    } catch (err) {
      console.error("❌ [CRON] Cache update failed:", err.message);
    }
  });
}
