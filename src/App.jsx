import React, { useState } from "react";
import ThemeToggle from "./components/ThemeToggle";
import Calculator from "./components/Calculator";
import WhatIfTab from "./components/WhatIfTab";

export default function App() {
  const [tab, setTab] = useState("sim");

  return (
    <div className="min-h-screen p-6">
      <header className="max-w-6xl mx-auto mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investment Simulator</h1>
          <p className="text-slate-400">
            Simulated growth & “What if?” analysis
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("sim")}
            className={`px-3 py-2 rounded-lg text-sm border ${
              tab === "sim"
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            Simulated Growth
          </button>
          <button
            onClick={() => setTab("whatif")}
            className={`px-3 py-2 rounded-lg text-sm border ${
              tab === "whatif"
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-slate-800 border-slate-700"
            }`}
          >
            What if?
          </button>
        </div>

        {tab === "sim" ? <Calculator /> : <WhatIfTab />}
      </main>
    </div>
  );
}
