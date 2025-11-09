import React, { useMemo, useState } from "react";
import GrowthChart from "./GrowthChart";

function effRateFromAPR(apr, comp = "annual") {
  const n =
    comp === "annual"
      ? 1
      : comp === "quarterly"
      ? 4
      : comp === "monthly"
      ? 12
      : 365;
  return Math.pow(1 + (apr || 0), 1 / n) - 1;
}
function periodsPerYear(comp = "annual") {
  return comp === "annual"
    ? 1
    : comp === "quarterly"
    ? 4
    : comp === "monthly"
    ? 12
    : 365;
}
function formatCurrency(v) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v || 0);
}
function fmtIntString(s) {
  if (s === "" || s === "-") return s;
  const n = Number(s.toString().replace(/,/g, ""));
  if (!Number.isFinite(n)) return "";
  return n >= 1000 ? n.toLocaleString() : String(n);
}
function fmtFloatString(s) {
  if (s === "" || s === "-" || s === ".") return s;
  const n = Number(s.toString().replace(/,/g, ""));
  if (!Number.isFinite(n)) return "";
  const parts = s.split(".");
  const showDecimals = parts.length > 1;
  const base = Math.floor(n);
  const decimals = showDecimals ? s.replace(/.*\./, "") : null;
  const withCommas = base >= 1000 ? base.toLocaleString() : String(base);
  return showDecimals ? withCommas + "." + decimals : withCommas;
}

export default function Calculator() {
  const DEF = {
    initial: 50000,
    years: 30,
    aprPct: 6,
    compFreq: "annual",
    recurring: 100,
    recurringFreq: "annual",
  };

  const [initial, setInitial] = useState(DEF.initial);
  const [years, setYears] = useState(DEF.years);
  const [aprPct, setAprPct] = useState(DEF.aprPct);
  const [compFreq, setCompFreq] = useState(DEF.compFreq);
  const [recurring, setRecurring] = useState(DEF.recurring);
  const [recurringFreq, setRecurringFreq] = useState(DEF.recurringFreq);

  const [initialStr, setInitialStr] = useState(
    fmtIntString(String(DEF.initial))
  );
  const [yearsStr, setYearsStr] = useState(fmtIntString(String(DEF.years)));
  const [aprStr, setAprStr] = useState(fmtFloatString(String(DEF.aprPct)));
  const [recurringStr, setRecurringStr] = useState(
    fmtIntString(String(DEF.recurring))
  );

  const resetInputs = () => {
    setInitial(DEF.initial);
    setInitialStr(fmtIntString(String(DEF.initial)));
    setYears(DEF.years);
    setYearsStr(fmtIntString(String(DEF.years)));
    setAprPct(DEF.aprPct);
    setAprStr(fmtFloatString(String(DEF.aprPct)));
    setCompFreq(DEF.compFreq);
    setRecurring(DEF.recurring);
    setRecurringStr(fmtIntString(String(DEF.recurring)));
    setRecurringFreq(DEF.recurringFreq);
  };

  const sim = useMemo(() => {
    const apr = (Number(aprPct) || 0) / 100;
    const n = periodsPerYear(compFreq);
    const r = effRateFromAPR(apr, compFreq);
    const periods = Math.max(1, Math.round(Number(years) || 0) * n);

    let balance = Math.max(0, Number(initial) || 0);
    let totalContrib = balance;
    const labels = [];
    const portfolio = [];
    const contributions = [];

    for (let p = 1; p <= periods; p++) {
      // Apply growth after the first year
      if (p > 1) balance *= 1 + r;

      if (recurringFreq === "monthly") {
        const add = Number(recurring) || 0;
        const perPeriod = add * (12 / n);
        // ✅ Skip first 12 months (first year)
        if (p > n) {
          balance += perPeriod;
          totalContrib += perPeriod;
        }
      } else {
        // ✅ Skip first full year for annual
        if (p % n === 0 && p > n) {
          balance += Number(recurring) || 0;
          totalContrib += Number(recurring) || 0;
        }
      }

      if (p % n === 0) {
        labels.push(p / n);
        portfolio.push(balance);
        contributions.push(totalContrib);
      }
    }

    // Add a final display year for chart continuity
    const finalYear = years;
    balance *= 1 + r;

    if (recurringFreq === "monthly") {
      const add = Number(recurring) || 0;
      const addYear = add * 12;
      balance += addYear;
      totalContrib += addYear;
    } else {
      const add = Number(recurring) || 0;
      balance += add;
      totalContrib += add;
    }

    labels.push(finalYear + 1);
    portfolio.push(balance);
    contributions.push(totalContrib);

    return { labels, portfolio, contributions, final: balance, totalContrib };
  }, [initial, years, aprPct, compFreq, recurring, recurringFreq]);

  const earnings = sim.final - sim.totalContrib;

  const handleIntChange = (setterNum, setterStr) => (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    const formatted = fmtIntString(raw);
    setterStr(formatted);
    const n = Number(raw || 0);
    setterNum(n);
  };

  const handleFloatChange = (setterNum, setterStr) => (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    const cleaned =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
    setterStr(fmtFloatString(cleaned));
    const n = Number(cleaned || 0);
    setterNum(n);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="panel">
        <h2 className="mb-4 text-xl font-bold">Investment details</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm">Initial investment</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-slate-400 select-none">
                $
              </span>
              <input
                type="text"
                className="num pl-7"
                value={initialStr}
                onChange={handleIntChange(setInitial, setInitialStr)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm">Years of investment growth</label>
            <input
              type="text"
              className="num mt-1"
              value={yearsStr}
              onChange={handleIntChange(setYears, setYearsStr)}
            />
          </div>

          <div>
            <label className="text-sm">Estimated rate of return</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-slate-400 select-none">
                %
              </span>
              <input
                type="text"
                className="num pl-7"
                value={aprStr}
                onChange={handleFloatChange(setAprPct, setAprStr)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm">Compound frequency</label>
            <select
              className="select mt-1"
              value={compFreq}
              onChange={(e) => setCompFreq(e.target.value)}
            >
              <option value="annual">Annually</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
            </select>
          </div>

          <div>
            <label className="text-sm">Amount of recurring investments</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-2.5 text-slate-400 select-none">
                $
              </span>
              <input
                type="text"
                className="num pl-7"
                value={recurringStr}
                onChange={handleIntChange(setRecurring, setRecurringStr)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm">Recurring investment frequency</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                className={
                  "btn " +
                  (recurringFreq === "monthly"
                    ? "btn-primary btn-selected"
                    : "btn-secondary")
                }
                onClick={() => setRecurringFreq("monthly")}
              >
                Monthly
              </button>
              <button
                className={
                  "btn " +
                  (recurringFreq === "annual"
                    ? "btn-primary btn-selected"
                    : "btn-secondary")
                }
                onClick={() => setRecurringFreq("annual")}
              >
                Annually
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button className="btn btn-secondary" onClick={resetInputs}>
              Reset Inputs
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="card">
              <div className="text-xs opacity-70">Total Balance</div>
              <div className="text-xl font-bold">
                {formatCurrency(sim.final)}
              </div>
            </div>
            <div className="card">
              <div className="text-xs opacity-70">Total principal</div>
              <div className="text-xl font-bold">
                {formatCurrency(sim.totalContrib)}
              </div>
            </div>
            <div className="card">
              <div className="text-xs opacity-70">Investment return</div>
              <div className="text-xl font-bold">
                {formatCurrency(earnings)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-2 text-center text-xl font-bold">Total Balance</h2>
        <div className="w-full h-96">
          <GrowthChart
            labels={sim.labels}
            portfolio={sim.portfolio}
            contributions={sim.contributions}
            initial={initial}
          />
        </div>
        <div className="flex items-center gap-4 justify-center mt-2 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-0.5 bg-sky-500/90"></span>Total principal
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-0.5 bg-emerald-600/90"></span>Investment
            return
          </span>
        </div>
      </section>
    </div>
  );
}
