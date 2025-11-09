/**
 * Generate a comprehensive list of ~100 top market-cap assets (stocks, ETFs, crypto)
 * and write them to src/data/assets.json
 */

import fs from "fs";
import path from "path";

const assets = [
  // === Top tech / mega-caps ===
  { symbol: "AAPL", name: "Apple Inc.", inception: "1980-12-12" },
  { symbol: "MSFT", name: "Microsoft Corp.", inception: "1986-03-13" },
  { symbol: "GOOG", name: "Alphabet Inc. (Class C)", inception: "2004-08-19" },
  { symbol: "AMZN", name: "Amazon.com Inc.", inception: "1997-05-15" },
  { symbol: "NVDA", name: "NVIDIA Corp.", inception: "1999-01-22" },
  { symbol: "META", name: "Meta Platforms Inc.", inception: "2012-05-18" },
  { symbol: "TSLA", name: "Tesla Inc.", inception: "2010-06-29" },
  {
    symbol: "BRK-B",
    name: "Berkshire Hathaway Inc. Class B",
    inception: "1996-05-09",
  },
  { symbol: "V", name: "Visa Inc.", inception: "2008-03-19" },
  { symbol: "MA", name: "Mastercard Inc.", inception: "2006-05-25" },
  { symbol: "AVGO", name: "Broadcom Inc.", inception: "2009-08-06" },
  { symbol: "ORCL", name: "Oracle Corp.", inception: "1986-03-12" },
  { symbol: "CRM", name: "Salesforce Inc.", inception: "2004-06-23" },
  { symbol: "ADBE", name: "Adobe Inc.", inception: "1986-08-20" },
  { symbol: "INTC", name: "Intel Corp.", inception: "1980-01-01" },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices Inc.",
    inception: "1972-09-27",
  },
  { symbol: "CSCO", name: "Cisco Systems Inc.", inception: "1990-02-16" },
  { symbol: "TXN", name: "Texas Instruments Inc.", inception: "1980-01-01" },
  {
    symbol: "IBM",
    name: "International Business Machines",
    inception: "1980-01-01",
  },
  { symbol: "QCOM", name: "QUALCOMM Inc.", inception: "1991-12-13" },

  // === Consumer & retail ===
  { symbol: "WMT", name: "Walmart Inc.", inception: "1972-08-25" },
  { symbol: "COST", name: "Costco Wholesale Corp.", inception: "1985-12-05" },
  { symbol: "HD", name: "Home Depot Inc.", inception: "1981-09-22" },
  { symbol: "PG", name: "Procter & Gamble Co.", inception: "1980-01-01" },
  { symbol: "KO", name: "Coca-Cola Co.", inception: "1980-01-01" },
  { symbol: "PEP", name: "PepsiCo Inc.", inception: "1980-01-01" },
  { symbol: "NKE", name: "Nike Inc.", inception: "1980-12-02" },
  { symbol: "DIS", name: "Walt Disney Co.", inception: "1980-01-01" },
  { symbol: "MCD", name: "McDonald’s Corp.", inception: "1980-01-01" },
  { symbol: "SBUX", name: "Starbucks Corp.", inception: "1992-06-26" },
  { symbol: "TGT", name: "Target Corp.", inception: "1980-01-01" },
  { symbol: "LOW", name: "Lowe’s Cos.", inception: "1980-01-01" },

  // === Financials ===
  { symbol: "JPM", name: "JPMorgan Chase & Co.", inception: "1980-01-01" },
  { symbol: "BAC", name: "Bank of America Corp.", inception: "1980-01-01" },
  { symbol: "WFC", name: "Wells Fargo & Co.", inception: "1980-01-01" },
  { symbol: "GS", name: "Goldman Sachs Group Inc.", inception: "1999-05-04" },
  { symbol: "MS", name: "Morgan Stanley", inception: "1980-01-01" },
  { symbol: "C", name: "Citigroup Inc.", inception: "1980-01-01" },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", inception: "2015-07-20" },

  // === Healthcare & pharma ===
  { symbol: "UNH", name: "UnitedHealth Group Inc.", inception: "1980-01-01" },
  { symbol: "LLY", name: "Eli Lilly and Co.", inception: "1980-01-01" },
  { symbol: "JNJ", name: "Johnson & Johnson", inception: "1980-01-01" },
  { symbol: "MRK", name: "Merck & Co. Inc.", inception: "1980-01-01" },
  { symbol: "ABBV", name: "AbbVie Inc.", inception: "2013-01-02" },
  { symbol: "PFE", name: "Pfizer Inc.", inception: "1980-01-01" },
  {
    symbol: "TMO",
    name: "Thermo Fisher Scientific Inc.",
    inception: "1980-01-01",
  },
  { symbol: "ABT", name: "Abbott Laboratories", inception: "1980-01-01" },
  { symbol: "DHR", name: "Danaher Corp.", inception: "1980-01-01" },
  { symbol: "AMGN", name: "Amgen Inc.", inception: "1983-06-17" },

  // === Industrials & energy ===
  { symbol: "CAT", name: "Caterpillar Inc.", inception: "1980-01-01" },
  { symbol: "GE", name: "General Electric Co.", inception: "1980-01-01" },
  { symbol: "BA", name: "Boeing Co.", inception: "1980-01-01" },
  {
    symbol: "HON",
    name: "Honeywell International Inc.",
    inception: "1980-01-01",
  },
  {
    symbol: "UPS",
    name: "United Parcel Service Inc.",
    inception: "1999-11-10",
  },
  { symbol: "DE", name: "Deere & Co.", inception: "1980-01-01" },
  { symbol: "LMT", name: "Lockheed Martin Corp.", inception: "1980-01-01" },
  { symbol: "XOM", name: "Exxon Mobil Corp.", inception: "1980-01-01" },
  { symbol: "CVX", name: "Chevron Corp.", inception: "1980-01-01" },
  { symbol: "COP", name: "ConocoPhillips", inception: "1981-11-19" },
  { symbol: "SLB", name: "Schlumberger Ltd.", inception: "1980-01-01" },

  // === ETFs ===
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", inception: "1993-01-29" },
  { symbol: "VOO", name: "Vanguard S&P 500 ETF", inception: "2010-09-09" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", inception: "1999-03-10" },
  {
    symbol: "VTI",
    name: "Vanguard Total Stock Market ETF",
    inception: "2001-05-24",
  },
  {
    symbol: "SCHD",
    name: "Schwab U.S. Dividend Equity ETF",
    inception: "2011-10-20",
  },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", inception: "2000-05-22" },
  { symbol: "ARKK", name: "ARK Innovation ETF", inception: "2014-10-31" },
  { symbol: "VUG", name: "Vanguard Growth ETF", inception: "2004-01-26" },
  {
    symbol: "XLF",
    name: "Financial Select Sector SPDR Fund",
    inception: "1998-12-16",
  },
  {
    symbol: "XLK",
    name: "Technology Select Sector SPDR Fund",
    inception: "1998-12-22",
  },

  // === Cryptocurrencies ===
  { symbol: "BTC-USD", name: "Bitcoin (USD)", inception: "2010-07-17" },
  { symbol: "ETH-USD", name: "Ethereum (USD)", inception: "2015-08-07" },
  { symbol: "BNB-USD", name: "Binance Coin (USD)", inception: "2017-07-25" },
  { symbol: "SOL-USD", name: "Solana (USD)", inception: "2020-03-31" },
  { symbol: "XRP-USD", name: "XRP (USD)", inception: "2013-08-04" },
  { symbol: "ADA-USD", name: "Cardano (USD)", inception: "2017-10-01" },
  { symbol: "DOGE-USD", name: "Dogecoin (USD)", inception: "2013-12-15" },
  { symbol: "AVAX-USD", name: "Avalanche (USD)", inception: "2020-09-21" },
  { symbol: "DOT-USD", name: "Polkadot (USD)", inception: "2020-08-19" },
  { symbol: "MATIC-USD", name: "Polygon (USD)", inception: "2019-04-26" },
];

// Write to file
const outPath = path.resolve("./src/data/assets.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(assets, null, 2));
console.log(`✅  Wrote ${assets.length} assets to ${outPath}`);
