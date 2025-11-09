import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import assets from "../src/data/assets.json" assert { type: "json" };

async function fetchPrices(symbol, start, end) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1wk&period1=${Math.floor(
    new Date(start).getTime() / 1000
  )}&period2=${Math.floor(
    new Date(end).getTime() / 1000
  )}&events=history&includeAdjustedClose=true`;
  const res = await fetch(url);
  const json = await res.json();
  const ts = json?.chart?.result?.[0]?.timestamp || [];
  const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
  return ts
    .map((t, i) => ({
      date: new Date(t * 1000).toISOString().split("T")[0],
      close: closes[i],
    }))
    .filter((d) => d.close != null);
}

async function main() {
  const end = new Date().toISOString().split("T")[0];
  const prices = {};

  for (const asset of assets) {
    console.log(`📈 Fetching ${asset.symbol}`);
    const data = await fetchPrices(asset.symbol, asset.inception, end);
    prices[asset.symbol] = {
      symbol: asset.symbol,
      name: asset.name,
      lastUpdated: new Date().toISOString(),
      data,
    };
  }

  const filePath = path.resolve("src/data/prices.json");
  fs.writeFileSync(filePath, JSON.stringify(prices, null, 2));
  console.log(`✅ Cached ${Object.keys(prices).length} assets → ${filePath}`);
}

main();
