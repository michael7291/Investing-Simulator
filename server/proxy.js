// server/proxy.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import cron from "node-cron";
import fs from "fs";
import path from "path";

import updateIncremental from "../scripts/updateCache.js"; // incremental updater (1 yr of data)
import updateFull from "../scripts/cachePrices.js"; // full rebuild from inception

const app = express();
app.use(cors());
app.use(express.json());

// Optional: simple shared secret for admin actions
const ADMIN_SECRET = process.env.ADMIN_SECRET || null;

// ------------------------------
// Paths
// ------------------------------

const __dirname = path.resolve();
const assetsPath = path.join(__dirname, "src", "data", "assets.json");
const pricesPath = path.join(__dirname, "src", "data", "prices.json");

let assets = [];
let memoryCache = {};
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ------------------------------
// Load assets.json
// ------------------------------

try {
  assets = JSON.parse(fs.readFileSync(assetsPath, "utf-8"));
  console.log(`📘 Loaded ${assets.length} assets`);
} catch (err) {
  console.error("❌ Failed to load assets.json:", err.message);
}

// ------------------------------
// Load prices.json into memory cache
// ------------------------------

function loadPricesFromDisk() {
  try {
    if (!fs.existsSync(pricesPath)) {
      console.warn("⚠️ No prices.json found");
      return;
    }
    const priceData = JSON.parse(fs.readFileSync(pricesPath, "utf-8"));
    memoryCache = {};

    for (const [symbol, entry] of Object.entries(priceData)) {
      memoryCache[symbol.toUpperCase()] = {
        lastUpdated: entry.lastUpdated,
        data: entry.data,
      };
    }
    console.log(
      `💾 Loaded ${Object.keys(memoryCache).length} symbols from prices.json`
    );
  } catch (err) {
    console.error("❌ Failed to load prices.json:", err.message);
  }
}

// Load on startup
loadPricesFromDisk();

// ------------------------------
// Persist memory cache to disk
// ------------------------------

function persistCache() {
  try {
    const out = {};
    for (const [symbol, entry] of Object.entries(memoryCache)) {
      out[symbol] = {
        lastUpdated: entry.lastUpdated,
        data: entry.data,
      };
    }
    fs.writeFileSync(pricesPath, JSON.stringify(out, null, 2), "utf-8");
    console.log("💾 Persisted memory cache → prices.json");
  } catch (err) {
    console.error("⚠️ Failed to persist cache:", err.message);
  }
}

// ------------------------------
// Yahoo fetcher
// ------------------------------

async function fetchYahooChart(symbol, startDate, endDate, interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&period1=${Math.floor(
    new Date(startDate).getTime() / 1000
  )}&period2=${Math.floor(new Date(endDate).getTime() / 1000)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yahoo API failed: ${res.status}`);
  const json = await res.json();

  const result = json.chart?.result?.[0];
  if (!result?.timestamp) return [];

  const quotes = result.indicators?.quote?.[0];
  return result.timestamp.map((t, i) => ({
    date: new Date(t * 1000).toISOString().slice(0, 10),
    close: quotes.close[i],
  }));
}

// ------------------------------
// Helper: freshness check
// ------------------------------

function isFresh(symbol) {
  const entry = memoryCache[symbol];
  if (!entry || !entry.lastUpdated) return false;
  return Date.now() - new Date(entry.lastUpdated).getTime() < ONE_DAY_MS;
}

// ------------------------------
// Endpoint: Chart data
// ------------------------------

app.get("/api/chart/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const {
    start = "2015-01-01",
    end = new Date().toISOString().slice(0, 10),
    interval = "1d",
  } = req.query;

  try {
    if (isFresh(symbol) && memoryCache[symbol]?.data) {
      return res.json({
        source: "cache",
        lastUpdated: memoryCache[symbol].lastUpdated,
        data: memoryCache[symbol].data,
      });
    }

    const data = await fetchYahooChart(symbol, start, end, interval);
    memoryCache[symbol] = {
      lastUpdated: new Date().toISOString(),
      data,
    };

    res.json({
      source: "live",
      lastUpdated: memoryCache[symbol].lastUpdated,
      data,
    });

    persistCache();
  } catch (err) {
    console.error(`❌ Fetch error for ${symbol}:`, err.message);

    if (memoryCache[symbol]) {
      return res.json({
        source: "stale-cache",
        lastUpdated: memoryCache[symbol].lastUpdated,
        data: memoryCache[symbol].data,
      });
    }

    res.status(500).json({ error: "Failed to fetch Yahoo data" });
  }
});

// ------------------------------
// Endpoint: Serve raw prices.json
// ------------------------------

app.get("/api/prices", (req, res) => {
  try {
    if (fs.existsSync(pricesPath)) {
      res.type("application/json");
      res.send(fs.readFileSync(pricesPath, "utf-8"));
    } else {
      res.status(404).json({ error: "prices.json not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to load prices.json" });
  }
});

// ------------------------------
// Admin route: Manual incremental update
// ------------------------------

app.post("/api/admin/update-cache", async (req, res) => {
  if (ADMIN_SECRET && req.headers["x-admin-secret"] !== ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    console.log("🧪 Manual incremental update triggered…");
    await updateIncremental();
    loadPricesFromDisk();
    res.json({ ok: true, message: "Cache updated manually" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------
// Admin route: Manual FULL rebuild
// ------------------------------

app.post("/api/admin/run-daily-cron", async (req, res) => {
  if (ADMIN_SECRET && req.headers["x-admin-secret"] !== ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    console.log("🧪 Manual daily full refresh triggered…");
    await updateFull();
    loadPricesFromDisk();
    res.json({ ok: true, message: "Full cron job completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------
// Integrated Daily Cron Job
// ------------------------------

cron.schedule("5 0 * * *", async () => {
  try {
    console.log("🔁 [CRON] Running daily incremental update…");
    await updateIncremental();
    loadPricesFromDisk();
    console.log("✅ [CRON] Completed");
  } catch (err) {
    console.error("❌ [CRON] Failed:", err.message);
  }
});

// ------------------------------
// Start server
// ------------------------------

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🌐 Backend server running on ${PORT}`));
