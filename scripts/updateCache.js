import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import assets from "../src/data/assets.json" assert { type: "json" };

const pricesPath = path.resolve("src/data/prices.json");
const prices = fs.existsSync(pricesPath)
  ? JSON.parse(fs.readFileSync(pricesPath))
  : {};

async function fetchRecent(symbol) {
  const end = new Date();
  const start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1wk&period1=${Math.floor(
    start.getTime() / 1000
  )}&period2=${Math.floor(
    end.getTime() / 1000
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

async function update(symbolArg) {
  const end = new Date();
  const all = symbolArg ? assets.filter((a) => a.symbol === symbolArg) : assets;
  for (const asset of all) {
    console.log(`🔄 Updating ${asset.symbol}`);
    const recent = await fetchRecent(asset.symbol);
    if (!recent.length) continue;
    if (!prices[asset.symbol]) prices[asset.symbol] = { data: [] };
    const existing = prices[asset.symbol].data || [];
    const merged = [
      ...existing.filter((e) => !recent.find((r) => r.date === e.date)),
      ...recent,
    ];
    prices[asset.symbol] = {
      ...asset,
      lastUpdated: new Date().toISOString(),
      data: merged.sort((a, b) => new Date(a.date) - new Date(b.date)),
    };
  }

  fs.writeFileSync(pricesPath, JSON.stringify(prices, null, 2));
  console.log(`✅ Cache updated → ${pricesPath}`);
}

const arg = process.argv.find((a) => a.startsWith("--symbol="));
update(arg ? arg.split("=")[1] : null);
