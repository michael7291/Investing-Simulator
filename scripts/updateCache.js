// scripts/updateCache.js
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// Paths
const assetsPath = path.resolve("src/data/assets.json");
const pricesPath = path.resolve("src/data/prices.json");

// Load asset list
const assets = JSON.parse(fs.readFileSync(assetsPath, "utf-8"));

// Load existing price cache
const prices = fs.existsSync(pricesPath)
  ? JSON.parse(fs.readFileSync(pricesPath, "utf-8"))
  : {};

// Fetch 1 year of weekly data
async function fetchRecent(symbol) {
  const end = new Date();
  const start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1wk&period1=${Math.floor(
    start.getTime() / 1000
  )}&period2=${Math.floor(
    end.getTime() / 1000
  )}&events=history&includeAdjustedClose=true`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`❌ Failed to fetch ${symbol}: ${res.statusText}`);
    return [];
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return [];

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  return timestamps
    .map((t, i) => ({
      date: new Date(t * 1000).toISOString().slice(0, 10),
      close: closes[i],
    }))
    .filter((d) => d.close != null);
}

// Main incremental update
export default async function updateIncremental() {
  console.log("⚡ Incremental price update starting…");

  for (const asset of assets) {
    const symbol = asset.symbol;
    console.log(`🔄 Updating ${symbol}`);

    const recent = await fetchRecent(symbol);
    if (recent.length === 0) {
      console.warn(`⚠️ No data returned for ${symbol}`);
      continue;
    }

    if (!prices[symbol]) prices[symbol] = { data: [] };
    const existing = prices[symbol].data || [];

    // Merge uniquely on date
    const merged = [
      ...existing.filter((d) => !recent.find((r) => r.date === d.date)),
      ...recent,
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    prices[symbol] = {
      ...asset,
      lastUpdated: new Date().toISOString(),
      data: merged,
    };

    console.log(`✅ Updated ${symbol} (${merged.length} records)`);
  }

  fs.writeFileSync(pricesPath, JSON.stringify(prices, null, 2));
  console.log(`💾 Cache written to ${pricesPath}`);
}
