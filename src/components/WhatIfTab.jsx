import React, { useEffect, useMemo, useState } from "react";
import HistoricalValueChart from "./HistoricalValueChart";
import { fetchYahooChart } from "../services/yahoo";
import assetList from "../data/assets.json";
import priceCache from "../data/prices.json";

function formatCurrency(v) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v ?? 0);
}

function formatNumber(v) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(
    v ?? 0
  );
}

function formatDate(str) {
  if (!str) return "Unknown";
  const d = new Date(str);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function WhatIfTab() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const [assets] = useState(assetList);
  const [symbol, setSymbol] = useState(assets[0].symbol);
  const [amount, setAmount] = useState("10,000");
  const [startDate, setStartDate] = useState("2015-01-01");

  const [loading, setLoading] = useState(false);
  const [series, setSeries] = useState([]);
  const [error, setError] = useState("");
  const [tooltip, setTooltip] = useState(false);

  const [startPrice, setStartPrice] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [shares, setShares] = useState(null);
  const [dataSource, setDataSource] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // ✅ Format numeric input with commas
  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, "");
    const numericValue = Math.max(0, Number(rawValue) || 0);
    setAmount(
      numericValue.toLocaleString("en-US", {
        maximumFractionDigits: 0,
      })
    );
  };

  const numericAmount = useMemo(
    () => Number(amount.replace(/,/g, "")),
    [amount]
  );

  // 🧠 Filter assets
  const filteredAssets = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return assets;
    return assets.filter(
      (a) =>
        a.symbol.toLowerCase().includes(term) ||
        a.name.toLowerCase().includes(term)
    );
  }, [searchTerm, assets]);

  // 🕓 Cache update
  const latestUpdate = useMemo(() => {
    const times = Object.values(priceCache)
      .map((e) => new Date(e.lastUpdated || 0).getTime())
      .filter((t) => t > 0);
    if (!times.length) return null;
    return new Date(Math.max(...times)).toISOString();
  }, []);

  const selectedAsset = useMemo(
    () => assets.find((a) => a.symbol === symbol),
    [symbol, assets]
  );

  const minDate = selectedAsset?.inception ?? "1980-01-01";
  const startClose = series.length ? series[0].close : null;
  const lastClose = series.length ? series[series.length - 1].close : null;

  const currentValue = useMemo(() => {
    if (!startClose || !lastClose || !numericAmount) return 0;
    return (numericAmount / startClose) * lastClose;
  }, [startClose, lastClose, numericAmount]);

  const totalReturnPct = useMemo(() => {
    if (!numericAmount || !currentValue) return 0;
    return (currentValue / numericAmount - 1) * 100;
  }, [numericAmount, currentValue]);

  const annualizedReturnPct = useMemo(() => {
    if (!series.length || !numericAmount || !currentValue) return 0;
    const start = new Date(series[0].date);
    const end = new Date(series[series.length - 1].date);
    const years = (end - start) / (365.25 * 24 * 3600 * 1000);
    if (years <= 0) return 0;
    return (Math.pow(currentValue / numericAmount, 1 / years) - 1) * 100;
  }, [series, numericAmount, currentValue]);

  const totalProfit = useMemo(
    () => currentValue - numericAmount,
    [currentValue, numericAmount]
  );

  const validateDate = (inputDate) => {
    if (new Date(inputDate) < new Date(minDate)) {
      setTooltip(true);
      setError(
        `${selectedAsset.name} was not available for trading until ${minDate}.`
      );
      setStartDate(minDate);
      setTimeout(() => setTooltip(false), 3000);
      return false;
    }
    return true;
  };

  async function run() {
    setError("");
    setLoading(true);
    setDataSource("");
    console.log("▶️ run() triggered with symbol:", symbol);

    if (!symbol) {
      setLoading(false);
      return;
    }

    try {
      if (!validateDate(startDate)) {
        setSeries([]);
        setLoading(false);
        return;
      }

      const cache = priceCache[symbol];
      if (cache && cache.data?.length) {
        let filtered = cache.data.filter(
          (d) =>
            new Date(d.date) >= new Date(startDate) &&
            new Date(d.date) <= new Date(todayISO)
        );

        const last = filtered[filtered.length - 1];
        if (last && last.date < todayISO) {
          filtered.push({ date: todayISO, close: last.close });
        }

        if (filtered.length > 0) {
          const s = numericAmount / filtered[0].close;
          const mapped = filtered.map((d) => ({
            date: d.date,
            close: d.close,
            value: s * d.close,
          }));
          setSeries(mapped);
          setStartPrice(filtered[0].close);
          setCurrentPrice(filtered[filtered.length - 1].close);
          setShares(s);
          setDataSource("Cache");
          setLoading(false);
          return;
        }
      }

      const data = await fetchYahooChart(symbol, startDate, todayISO, "1wk");
      if (!data?.length) {
        setSeries([]);
        setError("No data returned. Try different inputs.");
        setStartPrice(null);
        setCurrentPrice(null);
        setShares(null);
      } else {
        const last = data[data.length - 1];
        if (last && last.date < todayISO) {
          data.push({ date: todayISO, close: last.close });
        }

        const s = numericAmount / data[0].close;
        const mapped = data.map((d) => ({
          date: d.date,
          close: d.close,
          value: s * d.close,
        }));

        setSeries(mapped);
        setStartPrice(data[0].close);
        setCurrentPrice(data[data.length - 1].close);
        setShares(s);
        setDataSource("Live API");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to fetch historical prices.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Auto-refresh debounce
  useEffect(() => {
    const timer = setTimeout(run, 500);
    return () => clearTimeout(timer);
  }, [symbol, startDate, numericAmount]);

  // ✅ Daily refresh at midnight
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      5
    );
    const delay = nextMidnight.getTime() - now.getTime();
    const timer = setTimeout(() => run(), delay);
    return () => clearTimeout(timer);
  }, [symbol, startDate, numericAmount]);

  // ✅ Dropdown click-away handler
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".asset-search-container")) setShowDropdown(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleKeyDown = (e) => {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % filteredAssets.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex(
        (i) => (i - 1 + filteredAssets.length) % filteredAssets.length
      );
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      const a = filteredAssets[highlightIndex];
      selectAsset(a);
    } else if (e.key === "Escape") setShowDropdown(false);
  };

  const selectAsset = (asset) => {
    setSymbol(asset.symbol);
    setSearchTerm("");
    if (new Date(startDate) < new Date(asset.inception))
      setStartDate(asset.inception);
    setShowDropdown(false);
    setError("");
  };

  // 🌙 Improved global style: date picker + tab button contrast
  const globalStyle = `
    /* Calendar icon fix */
    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: none;
    }
    .dark input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(1) brightness(1.3);
      opacity: 0.9;
      cursor: pointer;
    }

    /* Firefox calendar fix */
    @-moz-document url-prefix() {
      .dark input[type="date"] {
        filter: invert(1) brightness(1.4);
      }
    }

    /* Tabs contrast fix */
    .tab-btn {
      transition: all 0.2s ease-in-out;
      color: #1e293b;
      background-color: #f8fafc;
    }
    .tab-btn:hover {
      background-color: #e2e8f0;
    }
    .tab-btn.active {
      background-color: #0284c7;
      color: white;
    }
    .dark .tab-btn {
      background-color: #1e293b;
      color: #cbd5e1;
    }
    .dark .tab-btn.active {
      background-color: #0ea5e9;
      color: white;
    }
  `;

  return (
    <>
      <style>{globalStyle}</style>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="panel">
          <h2 className="mb-4 text-xl font-bold">What if?</h2>

          <div className="space-y-4">
            {/* Asset Search */}
            <div className="relative asset-search-container">
              <label className="text-sm">Asset</label>
              <input
                type="text"
                className="num mt-1 w-full"
                placeholder={
                  selectedAsset
                    ? `${selectedAsset.symbol} — ${selectedAsset.name}`
                    : "Search or select asset..."
                }
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => {
                  setSearchTerm("");
                  setShowDropdown(true);
                }}
                onKeyDown={handleKeyDown}
              />

              {showDropdown && (
                <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white dark:bg-gray-800 shadow-lg text-sm">
                  {filteredAssets.length === 0 && (
                    <li className="px-3 py-2 text-slate-400">No matches</li>
                  )}
                  {filteredAssets.map((a, i) => (
                    <li
                      key={a.symbol}
                      className={`px-3 py-2 cursor-pointer hover:bg-sky-100 dark:hover:bg-gray-700 ${
                        i === highlightIndex
                          ? "bg-sky-200 dark:bg-gray-700"
                          : ""
                      }`}
                      onMouseEnter={() => setHighlightIndex(i)}
                      onClick={() => selectAsset(a)}
                    >
                      {a.symbol} — {a.name}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-slate-400 mt-1">Earliest: {minDate}</p>
            </div>

            {/* Date Input */}
            <div className="relative">
              <label className="text-sm">Investment date</label>
              <input
                type="date"
                className="num mt-1 w-full"
                min={minDate}
                max={todayISO}
                value={startDate}
                onChange={(e) => {
                  const d = e.target.value;
                  setStartDate(d);
                  validateDate(d);
                }}
              />
              {tooltip && (
                <div className="absolute left-0 mt-1 px-3 py-1 text-xs rounded bg-yellow-100 dark:bg-gray-800 text-yellow-800 dark:text-amber-300 border border-yellow-400 dark:border-amber-500">
                  ⚠️ {selectedAsset.name} wasn’t tradable until {minDate}
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm">Investment amount</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-slate-400">
                  $
                </span>
                <input
                  type="text"
                  className="num pl-7"
                  value={amount}
                  onChange={handleAmountChange}
                />
              </div>
            </div>

            {/* Info + Metrics */}
            {dataSource && (
              <p className="text-xs text-slate-500 italic">
                Loaded from <b>{dataSource}</b>
              </p>
            )}
            {latestUpdate && (
              <p className="text-xs text-slate-400 italic">
                🕓 Cache updated {formatDate(latestUpdate)}
              </p>
            )}

            {/* Prices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="card">
                <div className="text-xs opacity-70">Price on {startDate}</div>
                <div className="text-lg font-semibold">
                  {startPrice ? formatCurrency(startPrice) : "—"}
                </div>
              </div>
              <div className="card">
                <div className="text-xs opacity-70">Current price</div>
                <div className="text-lg font-semibold">
                  {currentPrice ? (
                    <>
                      {formatCurrency(currentPrice)}{" "}
                      <span className="text-xs text-slate-400">
                        (as of {formatDate(series[series.length - 1]?.date)})
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <div className="card">
                <div className="text-xs opacity-70">Shares</div>
                <div className="text-lg font-semibold">
                  {shares ? formatNumber(shares) : "—"}
                </div>
              </div>
            </div>

            {/* Returns + Profit */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              <div className="card">
                <div className="text-xs opacity-70">Current Value</div>
                <div className="text-xl font-bold">
                  {formatCurrency(currentValue)}
                </div>
              </div>
              <div className="card">
                <div className="text-xs opacity-70">Total Return</div>
                <div className="text-xl font-bold">
                  {Number.isFinite(totalReturnPct)
                    ? `${totalReturnPct.toFixed(1)}%`
                    : "—"}
                </div>
              </div>
              <div className="card">
                <div className="text-xs opacity-70">Annualized</div>
                <div className="text-xl font-bold">
                  {Number.isFinite(annualizedReturnPct)
                    ? `${annualizedReturnPct.toFixed(2)}%`
                    : "—"}
                </div>
              </div>
              <div
                className={`card ${
                  totalProfit > 0
                    ? "border-green-400 text-green-600 dark:text-green-400"
                    : totalProfit < 0
                    ? "border-red-400 text-red-600 dark:text-red-400"
                    : ""
                }`}
              >
                <div className="text-xs opacity-70">Total Profit</div>
                <div className="text-xl font-bold">
                  {formatCurrency(totalProfit)}
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-500 italic">{error}</p>}
          </div>
        </section>

        {/* Chart */}
        <section className="card">
          <h2 className="text-center text-xl font-bold mb-2">
            Value Over Time
          </h2>
          <div className="w-full h-96">
            <HistoricalValueChart data={series} />
          </div>
        </section>
      </div>
    </>
  );
}
