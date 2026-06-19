"use client";

import { useState, useMemo, useEffect } from "react";
import Topbar from "@/components/Topbar";
import { useJournal, JOURNAL_ACCOUNTS } from "@/lib/journal";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";

export default function RazaoPage() {
  const [exercicio, setExercicio] = useState(() => ANOS_DISPONIVEIS[0] ?? "2025");
  const { entries, loaded } = useJournal(exercicio);

  const [contaQuery, setContaQuery] = useState("");
  const [selectedCod, setSelectedCod] = useState("");
  const [dataIni, setDataIni]     = useState(`${exercicio}-01-01`);
  const [dataFim, setDataFim]     = useState(`${exercicio}-12-31`);
  const [showDropdown, setShowDropdown] = useState(false);

  // Sync date range when year changes
  useEffect(() => {
    setDataIni(`${exercicio}-01-01`);
    setDataFim(`${exercicio}-12-31`);
    setSelectedCod("");
    setContaQuery("");
  }, [exercicio]);

  // Build account list from journal entries + JOURNAL_ACCOUNTS
  const usedCodes = useMemo(() => {
    const codes = new Set<string>();
    entries.forEach(e => e.linhas.forEach(l => { if (l.contaCod) codes.add(l.contaCod); }));
    return Array.from(codes).sort();
  }, [entries]);

  const accountOptions = useMemo(() => {
    const fromJournal = usedCodes.map(code => {
      const found = JOURNAL_ACCOUNTS.find(a => a.code === code);
      if (found) return { code, label: `${code} — ${found.name}` };
      // find from journal lines
      for (const e of entries) {
        const l = e.linhas.find(l => l.contaCod === code);
        if (l) return { code, label: l.conta };
      }
      return { code, label: code };
    });
    return fromJournal;
  }, [usedCodes, entries]);

  const filteredOptions = useMemo(() => {
    if (!contaQuery.trim()) return accountOptions;
    const q = contaQuery.toLowerCase();
    return accountOptions.filter(a => a.label.toLowerCase().includes(q));
  }, [accountOptions, contaQuery]);

  // Movements for selected account
  const movements = useMemo(() => {
    if (!selectedCod) return [];
    return entries
      .filter(e => {
        if (dataIni && e.data < dataIni) return false;
        if (dataFim && e.data > dataFim) return false;
        return e.linhas.some(l => l.contaCod === selectedCod);
      })
      .flatMap(e =>
        e.linhas
          .filter(l => l.contaCod === selectedCod)
          .map(l => ({
            data: e.data,
            diario: e.numero,
            descricao: l.descricao || e.descricao,
            debito: l.debito,
            credito: l.credito,
            estado: e.estado,
            entryId: e.id,
          }))
      )
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [entries, selectedCod, dataIni, dataFim]);

  // Running balance
  const account = useMemo(() =>
    JOURNAL_ACCOUNTS.find(a => a.code === selectedCod),
  [selectedCod]);

  const movementsWithBalance = useMemo(() => {
    let saldo = 0;
    return movements.map(m => {
      const net = account?.nature === "credora"
        ? m.credito - m.debito
        : m.debito - m.credito;
      saldo += net;
      return { ...m, saldo };
    });
  }, [movements, account]);

  const totalDeb  = movements.reduce((s, m) => s + m.debito, 0);
  const totalCred = movements.reduce((s, m) => s + m.credito, 0);
  const saldoFinal = movementsWithBalance.length > 0
    ? movementsWithBalance[movementsWithBalance.length - 1].saldo
    : 0;

  function handleSelectConta(code: string, label: string) {
    setSelectedCod(code);
    setContaQuery(label);
    setShowDropdown(false);
  }

  function exportRazao() {
    if (!selectedCod || movementsWithBalance.length === 0) return;
    const header = ["Data", "Nº Diário", "Descrição", "Débito", "Crédito", "Saldo Acumulado"];
    const rows = movementsWithBalance.map(m => [
      m.data, m.diario, m.descricao,
      m.debito.toString(), m.credito.toString(), m.saldo.toString(),
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `razao-${selectedCod.replace(/\./g, "-")}-${exercicio}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Topbar
        title="Razão Geral"
        subtitle="Extracto analítico de conta · fonte de verdade contabilística"
        actions={
          <>
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setExercicio(y)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  exercicio === y ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>{y}</button>
            ))}
            <button className="btn-secondary" onClick={exportRazao} disabled={!selectedCod}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar CSV
            </button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filtros */}
        <div className="card p-4 flex flex-wrap items-end gap-4">
          {/* Account selector */}
          <div className="flex-1 min-w-[280px] relative">
            <label className="label">Conta</label>
            <input
              type="text"
              className="input"
              placeholder="Pesquisar conta pelo código ou nome…"
              value={contaQuery}
              onChange={e => { setContaQuery(e.target.value); setShowDropdown(true); setSelectedCod(""); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            />
            {showDropdown && filteredOptions.length > 0 && (
              <div className="absolute z-20 top-full left-0 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl">
                {filteredOptions.slice(0, 20).map(opt => (
                  <button
                    key={opt.code}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-brand-50 border-b border-gray-50 last:border-0 font-mono"
                    onMouseDown={e => { e.preventDefault(); handleSelectConta(opt.code, opt.label); }}
                  >
                    <span className="text-brand-700 font-bold">{opt.code}</span>
                    <span className="text-gray-500 ml-2">{opt.label.split(" — ")[1] ?? ""}</span>
                  </button>
                ))}
                {filteredOptions.length === 0 && (
                  <div className="px-3 py-4 text-xs text-gray-400 text-center">Nenhuma conta encontrada nos lançamentos</div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="label">Data Início</label>
            <input type="date" className="input" value={dataIni} onChange={e => setDataIni(e.target.value)} />
          </div>
          <div>
            <label className="label">Data Fim</label>
            <input type="date" className="input" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
        </div>

        {/* Account header */}
        {selectedCod && (
          <div className="card p-4 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Conta</p>
              <p className="font-semibold text-brand-700 mt-0.5 font-mono">{contaQuery}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Natureza</p>
              <p className="font-semibold mt-0.5">
                {account?.nature === "devedora" ? "Devedora (D)" : "Credora (C)"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Classe</p>
              <p className="font-semibold mt-0.5">Classe {account?.classe ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Movimentos</p>
              <p className="font-semibold mt-0.5">{movements.length}</p>
            </div>
            <div className="ml-auto">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo Final</p>
              <p className={`font-mono font-bold text-lg mt-0.5 ${saldoFinal >= 0 ? "text-brand-700" : "text-red-600"}`}>
                {saldoFinal.toLocaleString("pt-PT")} AOA
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3>{selectedCod ? `Razão — ${contaQuery}` : "Seleccione uma conta"}</h3>
              {selectedCod && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {movements.length} movimentos · {exercicio} · Valores eM Kz
                </p>
              )}
            </div>
            {selectedCod && <span className="badge badge-blue">{movements.length} mov.</span>}
          </div>
          <div className="overflow-x-auto">
            {!selectedCod ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm">Pesquise uma conta para ver os movimentos</p>
                {!loaded && <p className="text-xs">A carregar lançamentos…</p>}
              </div>
            ) : movements.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                Nenhum movimento para esta conta no período seleccionado
              </div>
            ) : (
              <table className="table-auto w-full">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Nº Diário</th>
                    <th>Descrição</th>
                    <th className="text-right">Débito (Kz)</th>
                    <th className="text-right">Crédito (Kz)</th>
                    <th className="text-right">Saldo (Kz)</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsWithBalance.map((m, i) => (
                    <tr key={i} className={m.estado === "ANULADO" ? "opacity-50" : ""}>
                      <td className="text-xs text-gray-500 whitespace-nowrap">{m.data}</td>
                      <td className="font-mono text-xs text-brand-700 font-semibold">{m.diario}</td>
                      <td className="text-sm max-w-xs truncate">{m.descricao}</td>
                      <td className="text-right font-mono text-xs text-gray-700">
                        {m.debito > 0 ? m.debito.toLocaleString("pt-PT") : "—"}
                      </td>
                      <td className="text-right font-mono text-xs text-gray-700">
                        {m.credito > 0 ? m.credito.toLocaleString("pt-PT") : "—"}
                      </td>
                      <td className={`text-right font-mono text-xs font-semibold ${
                        m.saldo >= 0 ? "text-brand-800" : "text-red-700"
                      }`}>
                        {m.saldo.toLocaleString("pt-PT")}
                      </td>
                      <td>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          m.estado === "LANÇADO" ? "bg-green-100 text-green-800"
                          : m.estado === "ANULADO" ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                        }`}>{m.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-brand-700 text-white">
                    <td colSpan={3} className="px-4 py-3 font-bold text-sm uppercase tracking-wider">
                      Totais do período
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {totalDeb.toLocaleString("pt-PT")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {totalCred.toLocaleString("pt-PT")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {saldoFinal.toLocaleString("pt-PT")}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {!selectedCod && accountOptions.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Contas com movimentos no exercício {exercicio}</h3>
            <div className="flex flex-wrap gap-2">
              {accountOptions.map(opt => (
                <button
                  key={opt.code}
                  onClick={() => handleSelectConta(opt.code, opt.label)}
                  className="px-3 py-1.5 text-xs font-mono bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-300 rounded-lg text-gray-700 hover:text-brand-700 transition-colors"
                >
                  {opt.code}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pb-2">
          PGCA Angola — Decreto n.º 82/01 · Exercício {exercicio} · Valores em Kwanza (Kz)
        </p>
      </div>
    </div>
  );
}
