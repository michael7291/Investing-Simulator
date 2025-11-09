import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

export default function GrowthChart({
  labels,
  portfolio,
  contributions,
  initial = 0,
}) {
  const currentYear = new Date().getFullYear();

  const len = Math.min(labels.length, portfolio.length, contributions.length);
  const yearLabels = Array.from({ length: len }, (_, i) =>
    i === 0 ? "Now" : String(currentYear + i)
  );

  const P = portfolio.slice(0, len);
  const Craw = contributions.slice(0, len);

  // ✅ Force first labeled year (index 0) principal to initial
  const C = [...Craw];
  if (C.length > 0) {
    C[0] = Number(initial) || 0;
  }

  // First-year investment return should be shown as 0
  const returns = P.map((v, i) => (i === 0 ? 0 : v - (C[i] || 0)));

  const isDark = document.documentElement.classList.contains("dark");

  const data = {
    labels: yearLabels,
    datasets: [
      {
        label: "Investment return",
        data: returns,
        borderColor: "#03543f",
        backgroundColor: "rgba(3,84,63,0.25)",
        fill: true,
        borderWidth: 4,
        cubicInterpolationMode: "monotone",
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 24,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#10b981",
        spanGaps: true,
      },
      {
        label: "Total principal",
        data: C,
        borderColor: "#0369a1",
        backgroundColor: "rgba(3,105,161,0.25)",
        fill: true,
        borderWidth: 4,
        cubicInterpolationMode: "monotone",
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHitRadius: 24,
        pointBackgroundColor: "#0ea5e9",
        pointBorderColor: "#0ea5e9",
        spanGaps: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    clip: false,
    layout: { padding: { left: 10, right: 60 } },
    elements: { point: { radius: 0, hoverRadius: 6, hitRadius: 24 } },
    interaction: { mode: "nearest", axis: "x", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: "index",
        intersect: false,
        usePointStyle: true,
        displayColors: true,
        boxWidth: 36,
        boxHeight: 4,
        callbacks: {
          title: (items) => `Year ${yearLabels[items[0].dataIndex]}`,
          beforeBody: (items) => {
            const i = items[0].dataIndex;
            const total = i === 0 ? C[0] || 0 : P[i] || 0;
            return [
              `Total balance   ${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(total)}`,
            ];
          },
          label: (ctx) => {
            const i = ctx.dataIndex;
            if (ctx.dataset.label === "Total principal") {
              const v = C[i] || 0;
              return `Total principal   ${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(v)}`;
            } else {
              const v = i === 0 ? 0 : (P[i] || 0) - (C[i] || 0);
              return `Investment return   ${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(v)}`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        type: "category",
        offset: true,
        grid: { display: false },
        ticks: {
          color: isDark ? "#ddd" : "#0a0a0a",
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          align: "center",
          callback: function (value, index, values) {
            const lastIndex = yearLabels.length - 1;
            const midIndex = Math.floor(lastIndex / 2);
            if (index === 0) return "Now";
            if (index === midIndex) return yearLabels[midIndex];
            if (index === lastIndex) return yearLabels[lastIndex];
            return "";
          },
        },
        min: 0,
        max: yearLabels.length - 1,
      },
      y: {
        grid: {
          color: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
        },
        ticks: {
          color: isDark ? "#ddd" : "#0a0a0a",
          callback: (v) =>
            v >= 1e6
              ? `$${(v / 1e6).toFixed(1)}M`
              : v >= 1e3
              ? `$${Math.round(v / 1e3)}k`
              : `$${v}`,
        },
      },
    },
    normalized: true,
  };

  return <Line data={data} options={options} />;
}
