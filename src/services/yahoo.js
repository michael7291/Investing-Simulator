/**
 * Fetch historical chart data for a given symbol through our backend proxy.
 * The proxy handles caching and daily refresh automatically.
 */
export async function fetchYahooChart(
  symbol,
  startDate,
  endDate,
  interval = "1d"
) {
  if (!symbol) {
    console.warn("⚠️ fetchYahooChart called without a symbol!");
    return [];
  }

  const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const url = `${base}/api/chart/${encodeURIComponent(
    symbol
  )}?start=${startDate}&end=${endDate}&interval=${interval}`;

  try {
    console.log(`🌐 Connecting to backend proxy at: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server responded ${res.status}`);
    const json = await res.json();

    if (json?.data?.length) {
      console.log(
        `✅ [${symbol}] Connected to backend successfully — ${json.data.length} records loaded from ${json.source} (last updated ${json.lastUpdated})`
      );
      return json.data;
    } else {
      console.warn(`⚠️ [${symbol}] No data in response`, json);
      return [];
    }
  } catch (err) {
    console.error("❌ fetchYahooChart error:", err);
    return [];
  }
}
