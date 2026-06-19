"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const data = [
  { mes: "Jan", fluxo:  14000000 },
  { mes: "Fev", fluxo:  13000000 },
  { mes: "Mar", fluxo:  19000000 },
  { mes: "Abr", fluxo:  17000000 },
  { mes: "Mai", fluxo:  20000000 },
  { mes: "Jun", fluxo: -5000000  },
  { mes: "Jul", fluxo:  24000000 },
  { mes: "Ago", fluxo:  22000000 },
  { mes: "Set", fluxo:  25000000 },
  { mes: "Out", fluxo:  28000000 },
  { mes: "Nov", fluxo:  27000000 },
  { mes: "Dez", fluxo:  30000000 },
];

function fmt(v: number) {
  return `${(v / 1_000_000).toFixed(0)}M`;
}

export default function CashFlowChart() {
  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div>
          <h3>Fluxo de Caixa Operacional</h3>
          <p className="text-xs text-gray-500 mt-0.5">Método Directo — AOA</p>
        </div>
        <span className="badge badge-green">2024</span>
      </div>
      <div className="card-body pt-2">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              formatter={(v: number) => [`${(v / 1_000_000).toFixed(2)}M Kz`, "Fluxo"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <ReferenceLine y={0} stroke="#e5e7eb" />
            <Bar
              dataKey="fluxo"
              name="Fluxo"
              radius={[4, 4, 0, 0]}
              fill="#22c55e"
              // negative bars in red
              label={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
