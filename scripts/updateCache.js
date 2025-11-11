import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// ✅ Load asset list safely (compatible with all Node versions)
const assetsPath = path.resolve("src/data/assets.json");
const assets = JSON.parse(fs.readFileSync(assetsPath, "utf-8"));

const pricesPath = path.resolve("src/data/prices.json");
const prices = fs.existsSync(pricesPath)
  ? JSON.parse(fs.readFileSync(pricesPath))
  : {};

// ✅ Fetch 1 year of weekly data from Yahoo Finance
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
  const ts = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];

  return ts
    .map((t, i) => ({
      date: new Date(t * 1000).toISOString().split("T")[0],
      close: closes[i],
    }))
    .filter((d) => d.close != null);
}

// ✅ Merge fresh data into prices.json
async function update(symbolArg) {
  const end = new Date();
  const all = symbolArg ? assets.filter((a) => a.symbol === symbolArg) : assets;

  for (const asset of all) {
    console.log(`🔄 Updating ${asset.symbol}`);
    const recent = await fetchRecent(asset.symbol);
    if (!recent.length) {
      console.warn(`⚠️ No data for ${asset.symbol}`);
      continue;
    }

    if (!prices[asset.symbol]) prices[asset.symbol] = { data: [] };
    const existing = prices[asset.symbol].data || [];

    // Merge old and new data, keeping the newest entries
    const merged = [
      ...existing.filter((e) => !recent.find((r) => r.date === e.date)),
      ...recent,
    ];

    prices[asset.symbol] = {
      ...asset,
      lastUpdated: new Date().toISOString(),
      data: merged.sort((a, b) => new Date(a.date) - new Date(b.date)),
    };

    console.log(`✅ Updated ${asset.symbol} (${merged.length} records)`);
  }

  // ✅ Write updated cache
  fs.writeFileSync(pricesPath, JSON.stringify(prices, null, 2));
  console.log(`✅ Cache updated → ${pricesPath}`);
}

// ✅ Support optional symbol argument
const arg = process.argv.find((a) => a.startsWith("--symbol="));
update(arg ? arg.split("=")[1] : null);
