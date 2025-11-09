import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";

function formatCurrency(v) {
  if (v == null) return "";
  return `$${Number(v).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;
}

export default function HistoricalValueChart({ data }) {
  const chartData = (data || []).map((d) => ({
    date: d.date,
    value: Number(d.value?.toFixed?.(2) ?? d.value),
    close: Number(d.close?.toFixed?.(2) ?? d.close),
  }));

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={300}
      minHeight={250}
    >
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" minTickGap={24} />
        <YAxis />
        <Tooltip
          formatter={(v) => formatCurrency(v)}
          labelFormatter={(label) => `Date: ${label}`}
          contentStyle={{
            backgroundColor: "#1e293b",
            border: "1px solid #475569",
            color: "#f8fafc",
          }}
          labelStyle={{
            color: "#f1f5f9",
            fontWeight: 600,
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#0ea5e9"
          strokeWidth={2}
          name="Investment Value"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="close"
          stroke="#10b981"
          strokeWidth={1.5}
          name="Close (USD)"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
