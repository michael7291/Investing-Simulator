// server/proxy.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import cron from "node-cron";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// 🧠 In-memory cache: { symbol: { lastUpdated, data: [...] } }
const memoryCache = {};
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ✅ Resolve paths safely (works everywhere)
const __dirname = path.resolve();
const assetsPath = path.join(__dirname, "src", "data", "assets.json");
const pricesPath = path.join(__dirname, "src", "data", "prices.json");
let assets = [];

// ✅ Load assets.json
try {
  const data = fs.readFileSync(assetsPath, "utf-8");
  assets = JSON.parse(data);
  console.log(`📘 Loaded ${assets.length} assets from assets.json`);
} catch (err) {
  console.error("❌ Failed to load assets.json:", err.message);
}

// ✅ Load prices.json at startup (so UI always shows latest cache)
try {
  if (fs.existsSync(pricesPath)) {
    const priceData = JSON.parse(fs.readFileSync(pricesPath, "utf-8"));
    Object.entries(priceData).forEach(([symbol, info]) => {
      memoryCache[symbol.toUpperCase()] = {
        lastUpdated: info.lastUpdated,
        data: info.data || [],
      };
    });
    console.log(
      `💾 Initialized memory cache from prices.json (${
        Object.keys(memoryCache).length
      } symbols)`
    );
  } else {
    console.warn(
      "⚠️ No prices.json found — cache will be empty until fetched."
    );
  }
} catch (err) {
  console.error("❌ Failed to load prices.json:", err.message);
}

// 🧮 Check if cache entry is fresh (< 24h)
function isFresh(symbol) {
  const entry = memoryCache[symbol];
  if (!entry || !entry.lastUpdated) return false;
  return Date.now() - new Date(entry.lastUpdated).getTime() < ONE_DAY_MS;
}

// 📈 Fetch data from Yahoo Finance API
async function fetchYahooChart(symbol, startDate, endDate, interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&period1=${Math.floor(
    new Date(startDate).getTime() / 1000
  )}&period2=${Math.floor(new Date(endDate).getTime() / 1000)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yahoo API failed for ${symbol}`);
  const json = await res.json();

  const result = json.chart?.result?.[0];
  if (!result?.timestamp) return [];

  const quotes = result.indicators?.quote?.[0];
  const timestamps = result.timestamp;

  return timestamps.map((t, i) => ({
    date: new Date(t * 1000).toISOString().slice(0, 10),
    close: quotes.close[i],
  }));
}

/* -------------------------------------------------------------------------- */
/* 🌐 Endpoint: Fetch chart data (cache-first)                                */
/* -------------------------------------------------------------------------- */
app.get("/api/chart/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const {
    start = "2015-01-01",
    end = new Date().toISOString().slice(0, 10),
    interval = "1d",
  } = req.query;

  try {
    if (isFresh(symbol)) {
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

    console.log(`✅ Refreshed data for ${symbol} (${data.length} records)`);

    res.json({
      source: "live",
      lastUpdated: memoryCache[symbol].lastUpdated,
      data,
    });

    // ✅ Write back to prices.json for persistence
    persistCache();
  } catch (err) {
    console.error(`❌ Failed to fetch ${symbol}:`, err.message);
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

/* -------------------------------------------------------------------------- */
/* 🔄 Endpoint: Manual refresh for a single symbol                            */
/* -------------------------------------------------------------------------- */
app.post("/api/refresh/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await fetchYahooChart(
      symbol,
      "2015-01-01",
      new Date().toISOString().slice(0, 10),
      "1d"
    );
    memoryCache[symbol] = {
      lastUpdated: new Date().toISOString(),
      data,
    };
    console.log(`♻️ Manually refreshed ${symbol} (${data.length} records)`);

    persistCache();
    res.json({ ok: true, refreshed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* 🧩 NEW: Endpoint to serve latest prices.json to frontend                   */
/* -------------------------------------------------------------------------- */
app.get("/api/prices", (req, res) => {
  try {
    if (fs.existsSync(pricesPath)) {
      const data = fs.readFileSync(pricesPath, "utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.json(JSON.parse(data));
    } else {
      res.status(404).json({ error: "prices.json not found" });
    }
  } catch (err) {
    console.error("❌ Failed to serve /api/prices:", err.message);
    res.status(500).json({ error: "Failed to load prices.json" });
  }
});

/* -------------------------------------------------------------------------- */
/* 💾 Helper: Persist in-memory cache to prices.json                          */
/* -------------------------------------------------------------------------- */
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
    console.log("💾 Persisted memory cache → src/data/prices.json");
  } catch (err) {
    console.error("⚠️ Failed to persist cache:", err.message);
  }
}

/* -------------------------------------------------------------------------- */
/* 🕒 DAILY AUTO-REFRESH FOR ALL ASSETS                                       */
/* -------------------------------------------------------------------------- */
cron.schedule("10 0 * * *", async () => {
  console.log("⏰ Starting daily refresh for all assets…");

  const allSymbols = assets.map((a) => a.symbol.toUpperCase());
  const today = new Date().toISOString().slice(0, 10);

  for (const symbol of allSymbols) {
    try {
      const data = await fetchYahooChart(symbol, "2015-01-01", today, "1d");
      memoryCache[symbol] = {
        lastUpdated: new Date().toISOString(),
        data,
      };
      console.log(`✅ Auto-refreshed ${symbol} (${data.length} records)`);
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`❌ Failed to refresh ${symbol}:`, err.message);
    }
  }

  persistCache();

  // Save backup snapshot daily
  const backupPath = path.join(__dirname, "server", "cache_backup.json");
  try {
    fs.writeFileSync(backupPath, JSON.stringify(memoryCache, null, 2), "utf-8");
    console.log(`💾 Cached snapshot saved to ${backupPath}`);
  } catch (err) {
    console.error("⚠️ Failed to write cache backup:", err.message);
  }

  console.log("✅ Daily refresh completed for all assets.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🌐 Proxy server running on port ${PORT}`));
