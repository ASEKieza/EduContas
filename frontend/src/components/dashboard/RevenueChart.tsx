"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const data = [
  { mes: "Jan", proveitos: 42000000, custos: 28000000 },
  { mes: "Fev", proveitos: 38000000, custos: 25000000 },
  { mes: "Mar", proveitos: 51000000, custos: 32000000 },
  { mes: "Abr", proveitos: 47000000, custos: 30000000 },
  { mes: "Mai", proveitos: 55000000, custos: 35000000 },
  { mes: "Jun", proveitos: 49000000, custos: 31000000 },
  { mes: "Jul", proveitos: 62000000, custos: 38000000 },
  { mes: "Ago", proveitos: 58000000, custos: 36000000 },
  { mes: "Set", proveitos: 65000000, custos: 40000000 },
  { mes: "Out", proveitos: 70000000, custos: 42000000 },
  { mes: "Nov", proveitos: 68000000, custos: 41000000 },
  { mes: "Dez", proveitos: 75000000, custos: 45000000 },
];

function fmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}

export default function RevenueChart() {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div>
          <h3>Proveitos vs Custos</h3>
          <p className="text-xs text-gray-500 mt-0.5">Exercício 2024 — eM Kz</p>
        </div>
        <span className="badge badge-blue">Anual</span>
      </div>
      <div className="card-body pt-2">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gProv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gCust" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f97316" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              formatter={(v: number) => [`${(v / 1_000_000).toFixed(2)}M Kz`]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="proveitos" name="Proveitos" stroke="#3b82f6" strokeWidth={2} fill="url(#gProv)" />
            <Area type="monotone" dataKey="custos"    name="Custos"    stroke="#f97316" strokeWidth={2} fill="url(#gCust)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
