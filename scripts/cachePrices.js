// scripts/cachePrices.js
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import assets from "../src/data/assets.json" assert { type: "json" };

async function fetchPrices(symbol, startDate, endDate) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&period1=${Math.floor(
    new Date(startDate).getTime() / 1000
  )}&period2=${Math.floor(
    new Date(endDate).getTime() / 1000
  )}&events=history&includeAdjustedClose=true`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`❌ Failed to fetch ${symbol} (${res.status})`);
    return [];
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return [];

  const ts = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  return ts
    .map((t, i) => ({
      date: new Date(t * 1000).toISOString().slice(0, 10),
      close: closes[i],
    }))
    .filter((d) => d.close != null);
}

export default async function updateFull() {
  console.log("⚡ FULL historical rebuild starting…");

  const endDate = new Date().toISOString().slice(0, 10);
  const prices = {};

  for (const asset of assets) {
    console.log(`📈 Fetching full history for ${asset.symbol}…`);

    const data = await fetchPrices(asset.symbol, asset.inception, endDate);

    prices[asset.symbol] = {
      symbol: asset.symbol,
      name: asset.name,
      inception: asset.inception,
      lastUpdated: new Date().toISOString(),
      data,
    };

    console.log(`✅ ${asset.symbol}: ${data.length} records`);
    await new Promise((r) => setTimeout(r, 250)); // rate limit safety
  }

  const pricesPath = path.resolve("src/data/prices.json");
  fs.writeFileSync(pricesPath, JSON.stringify(prices, null, 2));

  console.log(`💾 FULL cache saved to ${pricesPath}`);
}
