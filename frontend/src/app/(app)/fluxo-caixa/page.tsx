"use client";

import { useState, useMemo, useCallback } from "react";
import Topbar from "@/components/Topbar";
import { fmtKz } from "@/lib/utils";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WeekRow {
  semana: string;       // "Sem 1 — 02/06/2025"
  dataInicio: string;
  dataFim: string;
  saldoAbertura: number;
  entradas: { desc: string; valor: number; fonte: string }[];
  saidas:   { desc: string; valor: number; fonte: string }[];
  saldoFecho: number;
  variacao: number;
  alerta: "ok" | "baixo" | "critico";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function fmtDt(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function varColor(v: number): string {
  if (v > 0) return "text-green-700";
  if (v < 0) return "text-red-700";
  return "text-gray-500";
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FluxoCaixaPage() {
  const hoje = new Date().toISOString().split("T")[0];
  const [exercicio, setExercicio] = useState(() => ANOS_DISPONIVEIS[0] ?? "2025");
  const [horizonte, setHorizonte] = useState(13); // weeks
  const [saldoInicial, setSaldoInicial] = useState(167_000_000);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [verAno, setVerAno] = useState<"mensal" | "semanal">("semanal");

  // ── Read real data from localStorage ───────────────────────────────────────
  const vendas = useMemo(() => {
    try {
      const raw = localStorage.getItem(`educontas-vendas-${exercicio}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [exercicio]);

  const compras = useMemo(() => {
    try {
      const raw = localStorage.getItem(`educontas-compras-${exercicio}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [exercicio]);

  const folhas = useMemo(() => {
    try {
      const raw = localStorage.getItem(`educontas-folhas-${exercicio}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [exercicio]);

  const obrigacoes = useMemo(() => {
    try {
      const raw = localStorage.getItem(`educontas-fiscalidade-${exercicio}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [exercicio]);

  // ── Build 13-week projection ───────────────────────────────────────────────
  const semanas = useMemo((): WeekRow[] => {
    const rows: WeekRow[] = [];
    let saldo = saldoInicial;

    for (let w = 0; w < horizonte; w++) {
      const inicio = addDays(hoje, w * 7);
      const fim    = addDays(inicio, 6);

      // Expected receivables: facturas LANÇADO or PARCIAL
      const entradas: WeekRow["entradas"] = [];
      const saidas:   WeekRow["saidas"]   = [];

      // Vendas a receber (mock: distributed over 4 weeks)
      const vendasAberto = vendas.filter((f: { estado: string; total: number; pago: number }) =>
        f.estado === "LANÇADO" || f.estado === "PARCIAL"
      );
      if (w < 4 && vendasAberto.length > 0) {
        const totalRec = vendasAberto.reduce((s: number, f: { total: number; pago: number }) => s + (f.total - f.pago), 0);
        const portion = Math.round(totalRec / (horizonte - w));
        if (portion > 0) entradas.push({ desc: "Recebimentos de clientes (previsto)", valor: portion, fonte: "Vendas" });
      }

      // Compras a pagar (distributed)
      const comprasAberto = compras.filter((c: { estado: string; total: number; pago: number }) =>
        c.estado === "LANÇADO" || c.estado === "PARCIAL"
      );
      if (w < 6 && comprasAberto.length > 0) {
        const totalPag = comprasAberto.reduce((s: number, c: { total: number; pago: number }) => s + (c.total - c.pago), 0);
        const portion = Math.round(totalPag / 6);
        if (portion > 0) saidas.push({ desc: "Pagamento a fornecedores (previsto)", valor: portion, fonte: "Compras" });
      }

      // Folha salarial — last week of each month
      const dFim = new Date(fim);
      if (dFim.getDate() >= 25) {
        const ultimaFolha = folhas[0];
        if (ultimaFolha) {
          saidas.push({ desc: `Folha salarial — ${dFim.getMonth() + 1}/${dFim.getFullYear()}`, valor: ultimaFolha.totalLiquido ?? 1_830_000, fonte: "RH" });
          saidas.push({ desc: "INSS patronal (8%)", valor: ultimaFolha.totalSsPatronal ?? 146_400, fonte: "RH" });
        }
      }

      // Obrigações fiscais
      obrigacoes.forEach((o: { vencimento: string; valor: number; tipo: string; estado: string }) => {
        if (o.estado === "PENDENTE" && o.vencimento >= inicio && o.vencimento <= fim) {
          saidas.push({ desc: `Obrigação fiscal: ${o.tipo}`, valor: o.valor, fonte: "Fiscal" });
        }
      });

      const totalEntradas = entradas.reduce((s, e) => s + e.valor, 0);
      const totalSaidas   = saidas.reduce((s, e) => s + e.valor, 0);
      const variacao      = totalEntradas - totalSaidas;
      const saldoFecho    = saldo + variacao;

      const alerta: WeekRow["alerta"] =
        saldoFecho < 0 ? "critico" :
        saldoFecho < 50_000_000 ? "baixo" : "ok";

      rows.push({
        semana: `Sem ${w + 1} — ${fmtDt(inicio)}`,
        dataInicio: inicio,
        dataFim: fim,
        saldoAbertura: saldo,
        entradas, saidas,
        saldoFecho,
        variacao,
        alerta,
      });

      saldo = saldoFecho;
    }
    return rows;
  }, [saldoInicial, horizonte, hoje, vendas, compras, folhas, obrigacoes]);

  const totalEntradas = semanas.reduce((s, r) => s + r.entradas.reduce((a, e) => a + e.valor, 0), 0);
  const totalSaidas   = semanas.reduce((s, r) => s + r.saidas.reduce((a, e) => a + e.valor, 0), 0);
  const saldoFinal    = semanas[semanas.length - 1]?.saldoFecho ?? saldoInicial;
  const alertaSemanas = semanas.filter(r => r.alerta !== "ok").length;

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const header = ["Semana","Período Início","Período Fim","Saldo Abertura","Entradas","Saídas","Variação","Saldo Fecho","Estado"];
    const rows = semanas.map(r => {
      const totalE = r.entradas.reduce((s, e) => s + e.valor, 0);
      const totalS = r.saidas.reduce((s, e) => s + e.valor, 0);
      return [
        r.semana,
        fmtDt(r.dataInicio),
        fmtDt(r.dataFim),
        r.saldoAbertura,
        totalE,
        totalS,
        r.variacao,
        r.saldoFecho,
        r.alerta,
      ].join(";");
    });
    const csv = [header.join(";"), ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fluxo-caixa-${exercicio}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [semanas, exercicio]);

  return (
    <div>
      <Topbar
        title="Fluxo de Caixa"
        subtitle={`Projecção ${horizonte} semanas · Exercício ${exercicio} · Baseado em obrigações reais`}
        actions={
          <>
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setExercicio(y)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  exercicio === y ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>{y}</button>
            ))}
            <button className="btn-secondary" onClick={exportCSV}>Exportar CSV</button>
            <button className="btn-secondary">Exportar PDF</button>
          </>
        }
      />

      <div className="p-6 space-y-5">
        {/* Controls */}
        <div className="card p-4 flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saldo Inicial (Kz)</label>
            <input type="number" min={0} step={1000000}
              value={saldoInicial}
              onChange={e => setSaldoInicial(Number(e.target.value))}
              className="input w-40 font-mono text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Horizonte</label>
            <div className="flex gap-1">
              {[4, 8, 13, 26].map(h => (
                <button key={h} onClick={() => setHorizonte(h)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                    horizonte === h ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}>{h} sem</button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 ml-auto">
            {(["semanal","mensal"] as const).map(v => (
              <button key={v} onClick={() => setVerAno(v)}
                className={`px-3 py-1 text-xs rounded-lg border font-semibold capitalize transition-colors ${
                  verAno === v ? "bg-brand-600 text-white border-brand-600" : "text-gray-500 border-gray-200"
                }`}>{v}</button>
            ))}
          </div>
        </div>

        {/* KPI summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Saldo Inicial",    value: saldoInicial, color: "text-gray-900" },
            { label: "Total Entradas",   value: totalEntradas, color: "text-green-700" },
            { label: "Total Saídas",     value: totalSaidas,   color: "text-red-600" },
            { label: "Saldo Projetado",  value: saldoFinal,    color: saldoFinal < 0 ? "text-red-700 font-bold" : "text-brand-700" },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{k.label}</p>
              <p className={`text-lg font-bold mt-1 font-mono ${k.color}`}>{fmtKz(k.value, true)}</p>
            </div>
          ))}
        </div>

        {/* Alert banner */}
        {alertaSemanas > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold text-orange-800 text-sm">{alertaSemanas} semana(s) com saldo abaixo do limite recomendado</p>
              <p className="text-xs text-orange-700 mt-0.5">Reveja os recebimentos pendentes e antecipe cobranças ou acione linhas de crédito.</p>
            </div>
          </div>
        )}

        {/* Weekly table */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3>Projecção Semanal — {horizonte} Semanas</h3>
            <span className="badge badge-blue">{horizonte} semanas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Semana</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Período</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Saldo Abertura</th>
                  <th className="px-4 py-3 text-right font-semibold text-green-700">Entradas</th>
                  <th className="px-4 py-3 text-right font-semibold text-red-600">Saídas</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Variação</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Saldo Fecho</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {semanas.map((r) => {
                  const totalE = r.entradas.reduce((s, e) => s + e.valor, 0);
                  const totalS = r.saidas.reduce((s, e)   => s + e.valor, 0);
                  const isOpen = showDetails === r.semana;
                  return (
                    <>
                      <tr key={r.semana}
                        className={`cursor-pointer hover:bg-gray-50 ${
                          r.alerta === "critico" ? "bg-red-50/50" :
                          r.alerta === "baixo"   ? "bg-orange-50/30" : ""
                        }`}
                        onClick={() => setShowDetails(isOpen ? null : r.semana)}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-800">{r.semana}</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDt(r.dataInicio)} – {fmtDt(r.dataFim)}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmtKz(r.saldoAbertura, true)}</td>
                        <td className="px-4 py-3 text-right font-mono text-green-700 font-semibold">+{fmtKz(totalE, true)}</td>
                        <td className="px-4 py-3 text-right font-mono text-red-600 font-semibold">-{fmtKz(totalS, true)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${varColor(r.variacao)}`}>
                          {r.variacao >= 0 ? "+" : ""}{fmtKz(r.variacao, true)}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono font-bold ${
                          r.saldoFecho < 0 ? "text-red-700" : r.saldoFecho < 50_000_000 ? "text-orange-700" : "text-gray-900"
                        }`}>{fmtKz(r.saldoFecho, true)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                            r.alerta === "critico" ? "bg-red-500" :
                            r.alerta === "baixo"   ? "bg-orange-400" : "bg-green-400"
                          }`} title={r.alerta} />
                        </td>
                      </tr>
                      {isOpen && (r.entradas.length > 0 || r.saidas.length > 0) && (
                        <tr key={r.semana + "-detail"} className="bg-gray-50">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-2">Entradas Previstas</p>
                                {r.entradas.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">Nenhuma entrada prevista</p>
                                ) : r.entradas.map((e, i) => (
                                  <div key={i} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                                    <div>
                                      <span className="text-xs text-gray-700">{e.desc}</span>
                                      <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{e.fonte}</span>
                                    </div>
                                    <span className="font-mono text-green-700 font-semibold text-xs">{fmtKz(e.valor)}</span>
                                  </div>
                                ))}
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-2">Saídas Previstas</p>
                                {r.saidas.length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">Nenhuma saída prevista</p>
                                ) : r.saidas.map((s, i) => (
                                  <div key={i} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                                    <div>
                                      <span className="text-xs text-gray-700">{s.desc}</span>
                                      <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s.fonte}</span>
                                    </div>
                                    <span className="font-mono text-red-600 font-semibold text-xs">{fmtKz(s.valor)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-brand-700 text-white font-bold">
                  <td colSpan={2} className="px-4 py-3 text-sm uppercase tracking-wide">TOTAL DO PERÍODO</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtKz(saldoInicial, true)}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-300">+{fmtKz(totalEntradas, true)}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-300">-{fmtKz(totalSaidas, true)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${saldoFinal - saldoInicial >= 0 ? "text-green-300" : "text-red-300"}`}>
                    {saldoFinal - saldoInicial >= 0 ? "+" : ""}{fmtKz(saldoFinal - saldoInicial, true)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{fmtKz(saldoFinal, true)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Projecção baseada em facturas em aberto, folhas salariais e obrigações fiscais registadas · Exercício {exercicio}
        </p>
      </div>
    </div>
  );
}
