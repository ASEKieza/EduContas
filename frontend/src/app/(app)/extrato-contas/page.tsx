"use client";

import { useState, useMemo, useEffect } from "react";
import Topbar from "@/components/Topbar";
import { useJournal, JOURNAL_ACCOUNTS } from "@/lib/journal";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtN(n: number): string {
  if (n === 0) return "—";
  const abs = Math.abs(n).toLocaleString("pt-PT");
  return n < 0 ? `(${abs})` : abs;
}

function exportCSV(
  cod: string, label: string, exercicio: string, dataIni: string, dataFim: string,
  saldoAnterior: number,
  rows: { data: string; diario: string; descricao: string; debito: number; credito: number; saldo: number }[],
  totalDeb: number, totalCred: number, saldoFinal: number,
) {
  const header = ["Data", "Nº Documento", "Descrição", "Débito (Kz)", "Crédito (Kz)", "Saldo (Kz)"];
  const body = [
    ["", "SALDO ANTERIOR", `Acumulado antes de ${dataIni}`, "", "", saldoAnterior.toString()],
    ...rows.map(m => [m.data, m.diario, m.descricao, m.debito.toString(), m.credito.toString(), m.saldo.toString()]),
    ["", "TOTAIS DO PERÍODO", "", totalDeb.toString(), totalCred.toString(), ""],
    ["", "SALDO FINAL", `Em ${dataFim}`, "", "", saldoFinal.toString()],
  ];
  const csv = [header, ...body].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `extrato-${cod.replace(/\./g, "-")}-${dataIni}-${dataFim}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ExtratoContasPage() {
  const [exercicio, setExercicio] = useState(() => ANOS_DISPONIVEIS[0] ?? "2026");
  const { entries, loaded } = useJournal(exercicio);

  const [contaQuery, setContaQuery]   = useState("");
  const [selectedCod, setSelectedCod] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dataIni, setDataIni] = useState(`${exercicio}-01-01`);
  const [dataFim, setDataFim] = useState(`${exercicio}-12-31`);

  useEffect(() => {
    setDataIni(`${exercicio}-01-01`);
    setDataFim(`${exercicio}-12-31`);
    setSelectedCod("");
    setContaQuery("");
  }, [exercicio]);

  // ── Account list from journal entries ─────────────────────────────────
  const accountOptions = useMemo(() => {
    const codes = new Set<string>();
    entries.forEach(e => e.linhas.forEach(l => { if (l.contaCod) codes.add(l.contaCod); }));
    return Array.from(codes).sort().map(code => {
      const found = JOURNAL_ACCOUNTS.find(a => a.code === code);
      if (found) return { code, label: `${code} — ${found.name}` };
      for (const e of entries) {
        const l = e.linhas.find(l => l.contaCod === code);
        if (l) return { code, label: l.conta || code };
      }
      return { code, label: code };
    });
  }, [entries]);

  const filteredOptions = useMemo(() => {
    const q = contaQuery.trim().toLowerCase();
    if (!q) return accountOptions;
    return accountOptions.filter(a => a.label.toLowerCase().includes(q));
  }, [accountOptions, contaQuery]);

  const account = useMemo(() =>
    JOURNAL_ACCOUNTS.find(a => a.code === selectedCod),
  [selectedCod]);

  // ── Saldo anterior: all LANÇADO movements BEFORE dataIni ─────────────
  const saldoAnterior = useMemo(() => {
    if (!selectedCod) return 0;
    let saldo = 0;
    entries
      .filter(e => e.estado === "LANÇADO" && e.data < dataIni)
      .forEach(e =>
        e.linhas
          .filter(l => l.contaCod === selectedCod)
          .forEach(l => {
            saldo += account?.nature === "credora"
              ? l.credito - l.debito
              : l.debito - l.credito;
          })
      );
    return saldo;
  }, [entries, selectedCod, dataIni, account]);

  // ── Period movements ──────────────────────────────────────────────────
  const movements = useMemo(() => {
    if (!selectedCod) return [];
    return entries
      .filter(e => e.data >= dataIni && e.data <= dataFim && e.linhas.some(l => l.contaCod === selectedCod))
      .flatMap(e =>
        e.linhas
          .filter(l => l.contaCod === selectedCod)
          .map(l => ({
            data: e.data, diario: e.numero,
            descricao: l.descricao || e.descricao,
            debito: l.debito, credito: l.credito,
            estado: e.estado, tipo: e.tipo,
          }))
      )
      .sort((a, b) => a.data.localeCompare(b.data) || a.diario.localeCompare(b.diario));
  }, [entries, selectedCod, dataIni, dataFim]);

  // ── Running balance ───────────────────────────────────────────────────
  const movementsWithBalance = useMemo(() => {
    let saldo = saldoAnterior;
    return movements.map(m => {
      saldo += account?.nature === "credora" ? m.credito - m.debito : m.debito - m.credito;
      return { ...m, saldo };
    });
  }, [movements, account, saldoAnterior]);

  const totalDeb  = movements.reduce((s, m) => s + m.debito,  0);
  const totalCred = movements.reduce((s, m) => s + m.credito, 0);
  const saldoFinal = movementsWithBalance.at(-1)?.saldo ?? saldoAnterior;

  function handleSelect(code: string, label: string) {
    setSelectedCod(code); setContaQuery(label); setShowDropdown(false);
  }

  const acctLabel = contaQuery || selectedCod;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div>
      <Topbar
        title="Extrato de Conta"
        subtitle="Movimentos analíticos · Saldo anterior + saldo corrente"
        actions={
          <>
            <div className="flex gap-1 border border-gray-200 rounded-lg p-0.5">
              {ANOS_DISPONIVEIS.map(y => (
                <button key={y} onClick={() => setExercicio(y)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                    exercicio === y ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}>{y}
                </button>
              ))}
            </div>
            <button
              className="btn-secondary"
              disabled={!selectedCod || movements.length === 0}
              onClick={() => exportCSV(selectedCod, acctLabel, exercicio, dataIni, dataFim, saldoAnterior, movementsWithBalance, totalDeb, totalCred, saldoFinal)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar CSV
            </button>
            <button
              className="btn-secondary"
              disabled={!selectedCod}
              onClick={() => window.print()}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
          </>
        }
      />

      <div className="p-6 space-y-4">

        {/* ── Filtros ─────────────────────────────────────────────────── */}
        <div className="card p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Account selector */}
            <div className="flex-1 min-w-[280px] relative">
              <label className="label">Conta *</label>
              <input
                type="text"
                className="input font-mono"
                placeholder="Pesquisar por código ou nome da conta…"
                value={contaQuery}
                onChange={e => { setContaQuery(e.target.value); setShowDropdown(true); setSelectedCod(""); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
              />
              {showDropdown && (
                <div className="absolute z-30 top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.slice(0, 30).map(opt => (
                      <button
                        key={opt.code}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-brand-50 border-b border-gray-50 last:border-0 flex items-center gap-2"
                        onMouseDown={e => { e.preventDefault(); handleSelect(opt.code, opt.label); }}
                      >
                        <span className="font-mono font-bold text-brand-700 w-20 shrink-0">{opt.code}</span>
                        <span className="text-gray-600 truncate">{opt.label.split(" — ")[1] ?? opt.label}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-xs text-gray-400 text-center">
                      {accountOptions.length === 0
                        ? "Nenhum lançamento no diário para este exercício"
                        : "Nenhuma conta encontrada"}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="label">De</label>
              <input type="date" className="input" value={dataIni}
                onChange={e => setDataIni(e.target.value)} />
            </div>
            <div>
              <label className="label">Até</label>
              <input type="date" className="input" value={dataFim}
                onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── KPIs de conta ───────────────────────────────────────────── */}
        {selectedCod && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Conta", value: selectedCod, mono: true, color: "text-brand-700" },
              { label: "Natureza", value: account?.nature === "devedora" ? "Devedora" : "Credora" },
              { label: "Classe", value: `Classe ${account?.classe ?? "—"}` },
              { label: "Movimentos", value: `${movements.length}` },
              {
                label: "Saldo Final",
                value: `${saldoFinal.toLocaleString("pt-PT")} Kz`,
                mono: true,
                color: saldoFinal >= 0 ? "text-brand-700" : "text-red-600",
                bold: true,
              },
            ].map(k => (
              <div key={k.label} className="card p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{k.label}</p>
                <p className={`mt-1 ${k.bold ? "text-lg font-bold" : "text-sm font-semibold"} ${k.mono ? "font-mono" : ""} ${k.color ?? "text-gray-800"}`}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Extrato table ────────────────────────────────────────────── */}
        {selectedCod ? (
          <div className="card overflow-hidden">
            {/* Header */}
            <div className="card-header flex items-center justify-between">
              <div>
                <h3>Extracto — {acctLabel}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {dataIni} a {dataFim} · Exercício {exercicio} · Valores em Kz
                </p>
              </div>
              <span className={`badge ${movements.length > 0 ? "badge-blue" : "badge-gray"}`}>
                {movements.length} mov.
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide w-28">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide w-36">Nº Documento</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Descrição</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wide w-32">Débito (Kz)</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wide w-32">Crédito (Kz)</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wide w-36 bg-brand-50">Saldo (Kz)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Saldo anterior */}
                  <tr className="bg-blue-50 border-b-2 border-blue-200">
                    <td className="px-4 py-2.5 text-xs text-blue-500 whitespace-nowrap font-mono">{dataIni}</td>
                    <td className="px-4 py-2.5 text-xs text-blue-500 font-mono">—</td>
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-blue-800 text-sm">Saldo Anterior</p>
                      <p className="text-[10px] text-blue-500">Acumulado de lançamentos antes de {dataIni}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-blue-400">—</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-blue-400">—</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold text-sm bg-blue-100 ${
                      saldoAnterior >= 0 ? "text-blue-800" : "text-red-700"
                    }`}>
                      {saldoAnterior.toLocaleString("pt-PT")}
                    </td>
                  </tr>

                  {/* Movements */}
                  {movementsWithBalance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">
                        Nenhum movimento no período {dataIni} — {dataFim}
                      </td>
                    </tr>
                  ) : (
                    movementsWithBalance.map((m, i) => (
                      <tr
                        key={i}
                        className={`border-b border-gray-100 transition-colors ${
                          m.estado === "ANULADO"
                            ? "opacity-40"
                            : i % 2 === 0 ? "bg-white hover:bg-brand-50/30" : "bg-gray-50/40 hover:bg-brand-50/30"
                        }`}
                      >
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{m.data}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs text-brand-700 font-semibold">{m.diario}</span>
                          {m.estado === "ANULADO" && (
                            <span className="ml-2 text-[9px] bg-red-100 text-red-700 px-1 py-0.5 rounded font-bold">ANULADO</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-gray-800 truncate max-w-xs">{m.descricao}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{m.tipo}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-700">
                          {m.debito > 0 ? m.debito.toLocaleString("pt-PT") : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-700">
                          {m.credito > 0 ? m.credito.toLocaleString("pt-PT") : <span className="text-gray-300">—</span>}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono text-sm font-semibold bg-brand-50/50 ${
                          m.saldo >= 0 ? "text-gray-900" : "text-red-700"
                        }`}>
                          {m.saldo.toLocaleString("pt-PT")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  {/* Period totals */}
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td colSpan={3} className="px-4 py-2.5 text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Totais do Período
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-bold text-gray-800">
                      {totalDeb > 0 ? totalDeb.toLocaleString("pt-PT") : fmtN(0)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-bold text-gray-800">
                      {totalCred > 0 ? totalCred.toLocaleString("pt-PT") : fmtN(0)}
                    </td>
                    <td className="px-4 py-2.5 bg-gray-200"></td>
                  </tr>
                  {/* Final balance */}
                  <tr className="bg-brand-700 text-white">
                    <td colSpan={5} className="px-4 py-3 font-bold text-sm uppercase tracking-wider">
                      Saldo Final — {dataFim}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold text-lg ${
                      saldoFinal < 0 ? "text-red-300" : "text-white"
                    }`}>
                      {saldoFinal.toLocaleString("pt-PT")} Kz
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              PGCA Angola — Decreto n.º 82/01 · Conta {selectedCod} ·
              {account?.nature === "devedora" ? " Natureza Devedora" : " Natureza Credora"} ·
              Exercício {exercicio}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="card p-6">
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-gray-400">
              <svg className="w-14 h-14 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p className="text-sm font-medium text-gray-500">
                Pesquise uma conta para gerar o extracto analítico
              </p>
              <p className="text-xs text-gray-400 text-center max-w-sm">
                O extracto mostra o saldo anterior ao período seleccionado, todos os movimentos e o saldo final acumulado.
              </p>
              {!loaded && (
                <p className="text-xs text-brand-500 animate-pulse">A carregar lançamentos do diário…</p>
              )}
            </div>

            {accountOptions.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">
                  Contas com movimentos em {exercicio}
                </p>
                <div className="flex flex-wrap gap-2">
                  {accountOptions.map(opt => (
                    <button
                      key={opt.code}
                      onClick={() => handleSelect(opt.code, opt.label)}
                      className="px-3 py-1.5 text-xs font-mono bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-lg text-gray-700 hover:text-brand-700 transition-all"
                    >
                      {opt.code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
