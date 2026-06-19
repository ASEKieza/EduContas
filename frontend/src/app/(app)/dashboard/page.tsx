"use client";

import { useState, useEffect, useMemo } from "react";
import Topbar from "@/components/Topbar";
import KpiCard from "@/components/dashboard/KpiCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import CashFlowChart from "@/components/dashboard/CashFlowChart";
import FinancialRatios from "@/components/dashboard/FinancialRatios";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";

// ── Icon helpers ───────────────────────────────────────────────────────────────
function IconMoney({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconTrend({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
function IconBank({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  );
}
function IconDoc({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

// ── Format helper ──────────────────────────────────────────────────────────────
function fmtKz(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M Kz`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K Kz`;
  return `${v.toLocaleString("pt-PT")} Kz`;
}

// ── Static fiscal obligations fallback ────────────────────────────────────────
const FISCAL_DEMO = [
  { label: "IVA — Novembro 2024",     prazo: "20 Dez",  valor: "12,4M", status: "warn" },
  { label: "IRT — Novembro 2024",     prazo: "10 Dez",  valor: "3,2M",  status: "warn" },
  { label: "Seg. Social — Nov 2024",  prazo: "10 Dez",  valor: "8,8M",  status: "warn" },
  { label: "Imposto Industrial 2024", prazo: "31 Jan",  valor: "23,6M", status: "blue" },
  { label: "1.ª Prestação II 2025",   prazo: "30 Jun",  valor: "—",     status: "gray" },
];

// ── Types ──────────────────────────────────────────────────────────────────────
interface JournalEntry {
  numero?: string;
  data?: string;
  descricao?: string;
  tipo?: string;
  debito?: number;
  credito?: number;
  estado?: string;
  [key: string]: unknown;
}

interface FiscalObligation {
  descricao?: string;
  tipo?: string;
  prazo?: string;
  valor?: number;
  estado?: string;
  [key: string]: unknown;
}

interface Venda {
  estado?: string;
  total?: number;
  [key: string]: unknown;
}

interface Compra {
  estado?: string;
  total?: number;
  [key: string]: unknown;
}

interface TesouraMovimento {
  tipo?: string;
  estado?: string;
  valor?: number;
  [key: string]: unknown;
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [exercicio, setExercicio] = useState(() => ANOS_DISPONIVEIS[0] ?? "2025");

  // LocalStorage state
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [movsTesouraria, setMovsTesouraria] = useState<TesouraMovimento[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [fiscalidade, setFiscalidade] = useState<FiscalObligation[]>([]);

  useEffect(() => {
    try {
      const rawVendas = localStorage.getItem(`educontas-vendas-${exercicio}`);
      setVendas(rawVendas ? JSON.parse(rawVendas) : []);
    } catch { setVendas([]); }

    try {
      const rawCompras = localStorage.getItem(`educontas-compras-${exercicio}`);
      setCompras(rawCompras ? JSON.parse(rawCompras) : []);
    } catch { setCompras([]); }

    try {
      const rawMovs = localStorage.getItem(`educontas-tesouraria-${exercicio}`);
      setMovsTesouraria(rawMovs ? JSON.parse(rawMovs) : []);
    } catch { setMovsTesouraria([]); }

    try {
      const rawJournal = localStorage.getItem(`educontas-journal-${exercicio}`);
      setJournal(rawJournal ? JSON.parse(rawJournal) : []);
    } catch { setJournal([]); }

    try {
      const rawFiscal = localStorage.getItem(`educontas-fiscalidade-${exercicio}`);
      setFiscalidade(rawFiscal ? JSON.parse(rawFiscal) : []);
    } catch { setFiscalidade([]); }
  }, [exercicio]);

  // ── KPI computation ───────────────────────────────────────────────────────
  const volumeNegocios = useMemo(() =>
    vendas
      .filter(v => v.estado !== "ANULADO")
      .reduce((s, v) => s + (v.total ?? 0), 0),
    [vendas]
  );

  const fatEmAberto = useMemo(() =>
    vendas.filter(v => v.estado === "LANÇADO" || v.estado === "PARCIAL"),
    [vendas]
  );

  const totalCompras = useMemo(() =>
    compras
      .filter(c => c.estado !== "ANULADO")
      .reduce((s, c) => s + (c.total ?? 0), 0),
    [compras]
  );

  const resultadoLiquido = useMemo(() => volumeNegocios - totalCompras, [volumeNegocios, totalCompras]);

  const meiosMonetarios = useMemo(() => {
    const entradas = movsTesouraria
      .filter(m => m.tipo === "ENTRADA" && m.estado === "CONCILIADO")
      .reduce((s, m) => s + (m.valor ?? 0), 0);
    const saidas = movsTesouraria
      .filter(m => m.tipo === "SAÍDA" && m.estado === "CONCILIADO")
      .reduce((s, m) => s + (m.valor ?? 0), 0);
    return entradas - saidas;
  }, [movsTesouraria]);

  const ultimosLancamentos = useMemo(() => [...journal].slice(0, 5), [journal]);

  // ── Fiscal obligations ────────────────────────────────────────────────────
  const fiscalPendentes = useMemo(() =>
    fiscalidade
      .filter(f => f.estado === "PENDENTE")
      .sort((a, b) => {
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return a.prazo.localeCompare(b.prazo);
      }),
    [fiscalidade]
  );

  const useFiscalDemo = fiscalPendentes.length === 0;

  return (
    <div>
      <Topbar
        title="Dashboard Executivo"
        subtitle={`Empresa Demo Lda. · Exercício ${exercicio}`}
        actions={
          <>
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setExercicio(y)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  exercicio === y
                    ? "bg-brand-600 text-white border-brand-600"
                    : "text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>{y}</button>
            ))}
            <span className="badge badge-green">● Sistema Operacional</span>
          </>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            title="Volume de Negócios"
            value={volumeNegocios > 0 ? fmtKz(volumeNegocios) : "0 Kz"}
            change={`${vendas.filter(v => v.estado !== "ANULADO").length} facturas`}
            changeUp
            icon={<IconMoney className="w-5 h-5" />}
            accent="blue"
          />
          <KpiCard
            title="Resultado Líquido"
            value={resultadoLiquido !== 0 ? fmtKz(Math.abs(resultadoLiquido)) : "0 Kz"}
            change={resultadoLiquido >= 0 ? "Positivo" : "Negativo"}
            changeUp={resultadoLiquido >= 0}
            icon={<IconTrend className="w-5 h-5" />}
            accent="green"
          />
          <KpiCard
            title="Meios Monetários"
            value={meiosMonetarios !== 0 ? fmtKz(Math.abs(meiosMonetarios)) : "0 Kz"}
            change={`Saldo conciliado`}
            changeUp={meiosMonetarios >= 0}
            icon={<IconBank className="w-5 h-5" />}
            accent="purple"
          />
          <KpiCard
            title="Facturas em Aberto"
            value={fatEmAberto.length > 0
              ? `${fatEmAberto.length} (${fmtKz(fatEmAberto.reduce((s, v) => s + (v.total ?? 0), 0))})`
              : "0"}
            change={fatEmAberto.length > 0 ? "Por liquidar" : "Sem pendentes"}
            changeUp={fatEmAberto.length === 0}
            icon={<IconDoc className="w-5 h-5" />}
            accent="orange"
          />
        </div>

        {/* Gráficos principais */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <RevenueChart />
          </div>
          <CashFlowChart />
        </div>

        {/* Segunda linha */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <FinancialRatios />
          </div>

          {/* Obrigações fiscais pendentes */}
          <div className="card">
            <div className="card-header">
              <h3>Obrigações Fiscais</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {useFiscalDemo ? "Demo — Próximos vencimentos" : "Pendentes · Por prazo"}
              </p>
            </div>
            <div className="card-body py-0 divide-y divide-gray-100">
              {useFiscalDemo
                ? FISCAL_DEMO.map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.prazo}</p>
                      </div>
                      <span className={`badge badge-${item.status}`}>{item.valor} Kz</span>
                    </div>
                  ))
                : fiscalPendentes.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-gray-800">
                          {item.descricao ?? item.tipo ?? "Obrigação fiscal"}
                        </p>
                        <p className="text-xs text-gray-400">{item.prazo ?? "—"}</p>
                      </div>
                      <span className="badge badge-warn">
                        {item.valor != null ? fmtKz(item.valor) : "—"}
                      </span>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>

        {/* Últimos lançamentos */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>Últimos Lançamentos Contabilísticos</h3>
            <a href="/contabilidade" className="text-xs text-brand-600 hover:underline font-medium">
              Ver todos →
            </a>
          </div>
          {ultimosLancamentos.length === 0 ? (
            <div className="card-body py-8 text-center text-gray-400 text-sm">
              Sem lançamentos registados neste exercício
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                <thead>
                  <tr>
                    <th>Nº Diário</th>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th className="text-right">Débito (Kz)</th>
                    <th className="text-right">Crédito (Kz)</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ultimosLancamentos.map((row, idx) => (
                    <tr key={row.numero ?? idx} className="cursor-pointer">
                      <td className="font-mono text-xs text-brand-700">{row.numero ?? "—"}</td>
                      <td className="text-gray-500 text-xs">{row.data ?? "—"}</td>
                      <td className="max-w-xs truncate">{row.descricao ?? "—"}</td>
                      <td>
                        {row.tipo && (
                          <span className="badge badge-blue text-[10px]">{row.tipo}</span>
                        )}
                      </td>
                      <td className="text-right font-mono text-xs text-gray-700">
                        {row.debito != null ? row.debito.toLocaleString("pt-PT") : "—"}
                      </td>
                      <td className="text-right font-mono text-xs text-gray-700">
                        {row.credito != null ? row.credito.toLocaleString("pt-PT") : "—"}
                      </td>
                      <td>
                        {row.estado && (
                          <span className="badge badge-green text-[10px]">{row.estado}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
