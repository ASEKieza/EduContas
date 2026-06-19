"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Topbar from "@/components/Topbar";
import {
  useJournal, exportEntriesDetailCSV, fmtAOA,
  JOURNAL_ACCOUNTS, accountLabel,
  RUBRICAS_FLUXO_CAIXA, GRUPO_FLUXO_LABEL, CENTROS_CUSTO_REF,
  type JournalEntry, type JournalLine, type PGCAAccount,
} from "@/lib/journal";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { useQuickActions } from "@/components/quickActions/useQuickActions";
import { useWindowManager } from "@/lib/windowManager";

// ── Constants ─────────────────────────────────────────────────────────────────
const TIPOS = ["VENDA", "COMPRA", "PAGAMENTO", "RECEBIMENTO", "SALÁRIO", "DEPRECIAÇÃO",
               "IVA", "EMPRÉSTIMO", "ESTORNO", "REGULARIZAÇÃO", "OUTRO"];
const MODULOS = ["CONTABILIDADE", "VENDAS", "COMPRAS", "TESOURARIA", "RH",
                 "ACTIVOS", "FISCAL", "INVENTÁRIO"];

const ESTADO_STYLE: Record<string, string> = {
  "LANÇADO":  "bg-green-100 text-green-800",
  "ANULADO":  "bg-red-100 text-red-800",
  "RASCUNHO": "bg-yellow-100 text-yellow-800",
};

// ── AccountSelector ────────────────────────────────────────────────────────────
function AccountSelector({
  value, onChange, placeholder = "Pesquisar conta…",
}: {
  value: string;
  onChange: (acc: PGCAAccount) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return JOURNAL_ACCOUNTS.slice(0, 20);
    const q = query.toLowerCase();
    return JOURNAL_ACCOUNTS.filter(
      a => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const CL_COLORS: Record<number, string> = {
    1: "text-blue-600", 2: "text-green-600", 3: "text-purple-600",
    4: "text-cyan-600", 5: "text-yellow-600", 6: "text-emerald-600",
    7: "text-red-600",  8: "text-slate-600",
  };

  return (
    <div ref={ref} className="relative">
      <input
        className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono"
        value={query}
        placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-[480px] max-h-64 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl">
          {filtered.map(a => (
            <button
              key={a.code}
              type="button"
              className="w-full text-left px-3 py-2 text-xs hover:bg-brand-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
              onMouseDown={e => { e.preventDefault(); onChange(a); setQuery(accountLabel(a)); setOpen(false); }}
            >
              <span className={`font-mono font-bold w-20 shrink-0 ${CL_COLORS[a.classe] ?? ""}`}>{a.code}</span>
              <span className="text-gray-700 flex-1">{a.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                a.nature === "devedora" ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"
              }`}>{a.nature === "devedora" ? "D" : "C"}</span>
              <span className={`text-[10px] font-bold shrink-0 ${CL_COLORS[a.classe] ?? ""}`}>Cl.{a.classe}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Working line type (includes UI-only fields stripped before saving) ────────
type WorkingLine = JournalLine & { _key: string; _classe?: number };

function emptyLine(): WorkingLine {
  return { _key: Math.random().toString(36).slice(2), conta: "", contaCod: "", descricao: "", debito: 0, credito: 0 };
}

// ── NovoLancamentoContent (floating window content) ───────────────────────────
function NovoLancamentoContent({
  exercicio, winId, onSave,
}: {
  exercicio: string;
  winId: string;
  onSave: (entry: Omit<JournalEntry, "id" | "numero" | "criadoEm">) => void;
}) {
  const { closeWindow } = useWindowManager();
  const today = new Date().toISOString().split("T")[0];
  const [data, setData] = useState(today);
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("OUTRO");
  const [modulo, setModulo] = useState("CONTABILIDADE");
  const [lines, setLines] = useState<WorkingLine[]>([emptyLine(), emptyLine()]);

  const totalDeb = lines.reduce((s, l) => s + (l.debito || 0), 0);
  const totalCred = lines.reduce((s, l) => s + (l.credito || 0), 0);
  const balanced = Math.abs(totalDeb - totalCred) < 0.01 && totalDeb > 0;
  const diff = totalDeb - totalCred;

  const filledLines = lines.filter(l => l.conta || l.debito || l.credito);
  const missingFluxo  = filledLines.some(l => l._classe === 4 && !l.fluxoCaixa);
  const missingCentro = filledLines.some(l => l._classe === 7 && !l.centroCusto);
  const canSave = balanced && !!descricao.trim() && !!data && !missingFluxo && !missingCentro;

  function updateLine(idx: number, field: keyof JournalLine, val: string | number) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  }

  function setAccount(idx: number, acc: PGCAAccount) {
    setLines(prev => prev.map((l, i) =>
      i === idx ? {
        ...l,
        conta: accountLabel(acc),
        contaCod: acc.code,
        _classe: acc.classe,
        fluxoCaixa: undefined,
        centroCusto: undefined,
      } : l
    ));
  }

  function addLine() { setLines(prev => [...prev, emptyLine()]); }
  function removeLine(idx: number) {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    if (!canSave) return;
    onSave({
      data, descricao: descricao.trim(), tipo, modulo,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      linhas: filledLines.map(({ _key, _classe, ...l }) => l),
      totalDebito: totalDeb, totalCredito: totalCred, estado: "LANÇADO",
    });
    closeWindow(winId);
  }

  const inputCls = "border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full";

  return (
    <div className="flex flex-col h-full bg-white">
      {/* subtitle strip */}
      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 shrink-0">
        <p className="text-[11px] text-gray-500">Partidas dobradas · PGCA Angola — Decreto n.º 82/01 · Exercício {exercicio}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Header fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Data *</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls}>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Módulo</label>
            <select value={modulo} onChange={e => setModulo(e.target.value)} className={inputCls}>
              {MODULOS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição do Lançamento *</label>
          <input
            type="text" value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Ex: Venda a crédito — FT/2025/000123"
            className={inputCls}
          />
        </div>

        {/* Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Linhas do Lançamento</label>
            <span className="text-xs text-gray-400">{lines.length} linha{lines.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600 border-b border-gray-200">
              <span>Conta (código + designação)</span>
              <span>Descrição da linha</span>
              <span className="text-right">Débito (Kz)</span>
              <span className="text-right">Crédito (Kz)</span>
              <span className="w-6"></span>
            </div>

            {/* Lines */}
            {lines.map((line, idx) => (
              <div key={line._key} className="border-b border-gray-100 last:border-0">
                {/* Main row */}
                <div className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2 items-center ${
                  idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                }`}>
                  <AccountSelector
                    value={line.conta}
                    onChange={acc => setAccount(idx, acc)}
                    placeholder="Código ou nome da conta…"
                  />
                  <input
                    type="text"
                    value={line.descricao}
                    onChange={e => updateLine(idx, "descricao", e.target.value)}
                    placeholder="Descrição opcional"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full"
                  />
                  <input
                    type="number" min="0" step="any"
                    value={line.debito || ""}
                    onChange={e => updateLine(idx, "debito", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full"
                  />
                  <input
                    type="number" min="0" step="any"
                    value={line.credito || ""}
                    onChange={e => updateLine(idx, "credito", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full"
                  />
                  <button
                    type="button" onClick={() => removeLine(idx)}
                    disabled={lines.length <= 2}
                    className="text-gray-300 hover:text-red-500 disabled:opacity-20 p-0.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Rubrica Fluxo de Caixa — obrigatório para Classe 4 (Meios Monetários) */}
                {line._classe === 4 && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-cyan-50 border-t border-cyan-100">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <svg className="w-3.5 h-3.5 text-cyan-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wide whitespace-nowrap">
                        Rubrica Fluxo de Caixa *
                      </span>
                    </div>
                    <select
                      value={line.fluxoCaixa || ""}
                      onChange={e => updateLine(idx, "fluxoCaixa", e.target.value)}
                      className={`flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${
                        !line.fluxoCaixa
                          ? "border-red-300 bg-red-50 text-red-700"
                          : "border-cyan-300 bg-white text-gray-800"
                      }`}
                    >
                      <option value="">— Seleccione a rubrica de fluxo de caixa —</option>
                      {(["operacional", "investimento", "financiamento"] as const).map(g => (
                        <optgroup key={g} label={GRUPO_FLUXO_LABEL[g]}>
                          {RUBRICAS_FLUXO_CAIXA.filter(r => r.grupo === g).map(r => (
                            <option key={r.id} value={r.id}>{r.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {!line.fluxoCaixa && (
                      <span className="text-[10px] text-red-500 font-bold shrink-0">Obrigatório</span>
                    )}
                  </div>
                )}

                {/* Centro de Custo — obrigatório para Classe 7 (Custos) */}
                {line._classe === 7 && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-orange-50 border-t border-orange-100">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <svg className="w-3.5 h-3.5 text-orange-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wide whitespace-nowrap">
                        Centro de Custo *
                      </span>
                    </div>
                    <select
                      value={line.centroCusto || ""}
                      onChange={e => updateLine(idx, "centroCusto", e.target.value)}
                      className={`flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                        !line.centroCusto
                          ? "border-red-300 bg-red-50 text-red-700"
                          : "border-orange-300 bg-white text-gray-800"
                      }`}
                    >
                      <option value="">— Seleccione o centro de custo —</option>
                      {CENTROS_CUSTO_REF.map(c => (
                        <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                      ))}
                    </select>
                    {!line.centroCusto && (
                      <span className="text-[10px] text-red-500 font-bold shrink-0">Obrigatório</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Totals row */}
            <div className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2.5 items-center border-t-2 ${
              balanced ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}>
              <button
                type="button" onClick={addLine}
                className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar linha
              </button>
              <div className={`text-xs font-bold text-right col-start-3 ${balanced ? "text-green-700" : "text-red-700"}`}>
                {totalDeb.toLocaleString("pt-PT")}
              </div>
              <div className={`text-xs font-bold text-right ${balanced ? "text-green-700" : "text-red-700"}`}>
                {totalCred.toLocaleString("pt-PT")}
              </div>
              <span className="w-6"></span>
            </div>
          </div>
        </div>

        {/* Balance indicator */}
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${
          balanced ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            balanced ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}>
            {balanced
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            }
          </div>
          <div className="flex-1">
            <p className={`font-bold text-sm ${balanced ? "text-green-800" : "text-red-800"}`}>
              {balanced ? "Lançamento equilibrado — Débitos = Créditos" : "Lançamento desequilibrado"}
            </p>
            <p className={`text-xs ${balanced ? "text-green-600" : "text-red-600"}`}>
              {balanced
                ? `Total: ${totalDeb.toLocaleString("pt-PT")} AOA · Princípio das partidas dobradas verificado`
                : `Diferença: ${Math.abs(diff).toLocaleString("pt-PT")} AOA — ${diff > 0 ? "Débitos > Créditos" : "Créditos > Débitos"}`
              }
            </p>
          </div>
        </div>

        {/* Alertas de campos obrigatórios em falta */}
        {(missingFluxo || missingCentro) && (
          <div className="space-y-2">
            {missingFluxo && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-cyan-200 bg-cyan-50">
                <svg className="w-4 h-4 text-cyan-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-semibold text-cyan-800">
                  Indique a <strong>rubrica de fluxo de caixa</strong> em todas as linhas de Classe 4 (Meios Monetários)
                </p>
              </div>
            )}
            {missingCentro && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-orange-200 bg-orange-50">
                <svg className="w-4 h-4 text-orange-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs font-semibold text-orange-800">
                  Indique o <strong>centro de custo</strong> em todas as linhas de Classe 7 (Custos)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
        <button onClick={() => closeWindow(winId)} className="btn-secondary">Cancelar</button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Lançar no Diário
        </button>
      </div>
    </div>
  );
}

// ── VerLancamentoContent (floating window content) ────────────────────────────
function VerLancamentoContent({
  entry, winId, onEstornar,
}: {
  entry: JournalEntry;
  winId: string;
  onEstornar: () => void;
}) {
  const { closeWindow } = useWindowManager();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Entry subtitle strip */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 shrink-0">
        <span className="text-sm font-bold text-brand-700 font-mono">{entry.numero}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_STYLE[entry.estado] ?? "bg-gray-100 text-gray-700"}`}>
          {entry.estado}
        </span>
        <span className="text-xs text-gray-500 flex-1 truncate">{entry.descricao}</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { l: "Data",       v: entry.data },
            { l: "Tipo",       v: entry.tipo },
            { l: "Módulo",     v: entry.modulo },
            { l: "Lançado em", v: new Date(entry.criadoEm).toLocaleString("pt-PT") },
          ].map(({ l, v }) => (
            <div key={l} className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-500 uppercase tracking-wide font-semibold">{l}</p>
              <p className="text-gray-900 font-medium mt-0.5">{v}</p>
            </div>
          ))}
        </div>

        {entry.estornadoDe && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <span className="font-bold">Estorno de:</span> {entry.estornadoDe}
          </div>
        )}

        {/* Lines table */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-bold text-gray-700">Conta</th>
                <th className="text-left px-4 py-2.5 font-bold text-gray-700">Descrição</th>
                <th className="text-right px-4 py-2.5 font-bold text-gray-700">Débito (Kz)</th>
                <th className="text-right px-4 py-2.5 font-bold text-gray-700">Crédito (Kz)</th>
              </tr>
            </thead>
            <tbody>
              {entry.linhas.map((l, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/80">
                  <td className="px-4 py-2.5 font-mono text-brand-700 font-semibold">
                    {l.conta}
                    {l.fluxoCaixa && (
                      <span className="block text-[10px] font-sans font-medium text-cyan-600 mt-0.5">
                        ◈ {RUBRICAS_FLUXO_CAIXA.find(r => r.id === l.fluxoCaixa)?.label ?? l.fluxoCaixa}
                      </span>
                    )}
                    {l.centroCusto && (
                      <span className="block text-[10px] font-sans font-medium text-orange-600 mt-0.5">
                        ▣ {CENTROS_CUSTO_REF.find(c => c.id === l.centroCusto)?.name ?? l.centroCusto}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{l.descricao || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-900">
                    {l.debito > 0 ? l.debito.toLocaleString("pt-PT") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-900">
                    {l.credito > 0 ? l.credito.toLocaleString("pt-PT") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 font-bold ${
                Math.abs(entry.totalDebito - entry.totalCredito) < 1
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}>
                <td colSpan={2} className="px-4 py-3 text-sm uppercase tracking-wide text-gray-700">
                  TOTAL
                  {Math.abs(entry.totalDebito - entry.totalCredito) < 1
                    ? <span className="ml-2 text-green-600 font-bold">✓ Equilibrado</span>
                    : <span className="ml-2 text-red-600 font-bold">⚠ Desequilibrado</span>
                  }
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">
                  {entry.totalDebito.toLocaleString("pt-PT")}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">
                  {entry.totalCredito.toLocaleString("pt-PT")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
        <div>
          {entry.estado === "LANÇADO" && !confirming && (
            <button
              onClick={() => setConfirming(true)}
              className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Estornar Lançamento
            </button>
          )}
          {confirming && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-semibold">Confirmar estorno?</span>
              <button
                onClick={() => { onEstornar(); closeWindow(winId); }}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
              >Confirmar</button>
              <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
            </div>
          )}
        </div>
        <button onClick={() => closeWindow(winId)} className="btn-secondary">Fechar</button>
      </div>
    </div>
  );
}

// ── Abertura Saldos — parsers ─────────────────────────────────────────────────
interface AberRow { codigo: string; descricao: string; debito: number; credito: number; }

/** Parse a Portuguese-format number: "1.500.000,00" or "1500000" or "1,500,000.00" */
function parsePtNum(s: string): number {
  if (!s) return 0;
  const t = s.trim().replace(/\s/g, "");
  // Portuguese: dots as thousands, comma as decimal → "1.500.000,45"
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(t)) {
    return parseFloat(t.replace(/\./g, "").replace(",", ".")) || 0;
  }
  // Anglo: commas as thousands, dot as decimal → "1,500,000.45"
  if (/^\d{1,3}(,\d{3})*(\.\d+)?$/.test(t)) {
    return parseFloat(t.replace(/,/g, "")) || 0;
  }
  // Plain number
  return parseFloat(t.replace(",", ".")) || 0;
}

/**
 * Extract structured rows from raw PDF text lines.
 * Heuristic: find lines that start with a PGCA-like account code (digits.digits...)
 * and contain one or two monetary values.
 */
async function parsePDFAbertura(buffer: ArrayBuffer): Promise<AberRow[]> {
  // Dynamically import pdfjs to avoid SSR issues
  const pdfjs = await import("pdfjs-dist");
  // Use bundled worker via URL (avoids worker file path issues in Next.js)
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const allLines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Group items by approximate Y coordinate to reconstruct rows
    const byY: Record<number, string[]> = {};
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = Math.round((item as { transform: number[] }).transform[5] / 4) * 4; // snap to 4pt grid
      if (!byY[y]) byY[y] = [];
      byY[y].push((item as { str: string }).str);
    }
    // Sort by Y descending (top of page = highest Y in PDF coords)
    const sortedYs = Object.keys(byY).map(Number).sort((a, b) => b - a);
    for (const y of sortedYs) {
      allLines.push(byY[y].join(" "));
    }
  }

  // PGCA account code pattern: starts with one or more digit groups separated by dots
  // e.g. "43.1", "31.1.2.1", "75.2.11"
  const PGCA_CODE = /^(\d{2,3}(?:\.\d+)*)/;
  // Monetary value: digits optionally with . or , separators, optional trailing sign
  const MONEY = /(?:^|[\s;|])([\d.,]+(?:\d))(?:[\s;|]|$)/g;

  const rows: AberRow[] = [];

  for (const line of allLines) {
    const codMatch = line.match(PGCA_CODE);
    if (!codMatch) continue;
    const codigo = codMatch[1];
    // Skip if code looks like a date or page number (too short or no dot)
    if (!codigo.includes(".") && codigo.length < 3) continue;

    // Extract all numeric tokens from the line
    const numTokens: number[] = [];
    let m: RegExpExecArray | null;
    const lineForNums = line.slice(codigo.length); // skip the code itself
    const reMoney = /[\d.,]{3,}/g;
    while ((m = reMoney.exec(lineForNums)) !== null) {
      const v = parsePtNum(m[0]);
      if (v > 0) numTokens.push(v);
    }

    if (numTokens.length === 0) continue;

    // Description: text between code and first number
    const descMatch = lineForNums.match(/^([^0-9]*)/);
    const descricao = descMatch ? descMatch[1].replace(/[;|–—]+/g, " ").trim() : "";

    let debito = 0;
    let credito = 0;

    if (numTokens.length >= 2) {
      // Last two values: assume [Débito, Crédito] or [Saldo Devedor, Saldo Credor]
      debito  = numTokens[numTokens.length - 2];
      credito = numTokens[numTokens.length - 1];
    } else {
      // Single value: use account nature heuristic (even class = creditor)
      const cl = parseInt(codigo.split(".")[0], 10);
      const isCreditor = [2, 3, 5, 6].includes(cl); // Cl. 2=Existências, 3=Terceiros, 5=Capital, 6=Proveitos
      if (isCreditor) credito = numTokens[0];
      else debito = numTokens[0];
    }

    rows.push({ codigo, descricao, debito, credito });
  }

  // Deduplicate by account code (keep first occurrence)
  const seen = new Set<string>();
  return rows.filter(r => {
    if (seen.has(r.codigo)) return false;
    seen.add(r.codigo);
    return true;
  });
}

function parseCSVAbertura(text: string): AberRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const h = lines[0].split(sep).map(s => s.trim().toLowerCase());
  const ix = {
    cod:  h.findIndex(c => /cod|conta|code|account/i.test(c)),
    desc: h.findIndex(c => /desc|name|nome|design/i.test(c)),
    deb:  h.findIndex(c => /d[eé]b/i.test(c)),
    cred: h.findIndex(c => /cr[eé]d/i.test(c)),
  };
  const parse = (cols: string[], i: number) =>
    i >= 0 ? parseFloat((cols[i] ?? "0").replace(/\./g, "").replace(",", ".")) || 0 : 0;
  return lines.slice(1).map(line => {
    const cols = line.split(sep);
    return {
      codigo:    (ix.cod  >= 0 ? cols[ix.cod]  : cols[0])?.trim() ?? "",
      descricao: (ix.desc >= 0 ? cols[ix.desc] : cols[1])?.trim() ?? "",
      debito:    parse(cols, ix.deb  >= 0 ? ix.deb  : 2),
      credito:   parse(cols, ix.cred >= 0 ? ix.cred : 3),
    };
  }).filter(r => r.codigo);
}

function parseSAFTAbertura(text: string): AberRow[] {
  const rows: AberRow[] = [];
  const doc = new DOMParser().parseFromString(text, "application/xml");
  doc.querySelectorAll("Account").forEach(acc => {
    const cod  = acc.querySelector("AccountID")?.textContent?.trim() ?? "";
    const desc = acc.querySelector("AccountDescription")?.textContent?.trim() ?? "";
    const ob   = parseFloat(acc.querySelector("OpeningBalance")?.textContent ?? "0") || 0;
    const cb   = parseFloat(acc.querySelector("ClosingBalance")?.textContent ?? "0") || 0;
    const val  = ob || cb;
    if (cod) rows.push({ codigo: cod, descricao: desc, debito: val > 0 ? val : 0, credito: val < 0 ? -val : 0 });
  });
  return rows;
}

// ── AberturaSaldosContent ──────────────────────────────────────────────────────
function AberturaSaldosContent({
  exercicio, winId, onSave,
}: {
  exercicio: string;
  winId: string;
  onSave: (e: Omit<JournalEntry, "id" | "numero" | "criadoEm">) => void;
}) {
  const { closeWindow } = useWindowManager();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── shared state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"manual" | "importar">("manual");
  const [rows,      setRows]      = useState<AberRow[]>([]);
  const [step,      setStep]      = useState<"input" | "preview" | "done">("input");
  const [error,     setError]     = useState("");

  // ── manual entry state ────────────────────────────────────────────────────────
  const [query,    setQuery]    = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── import state ──────────────────────────────────────────────────────────────
  const [format, setFormat] = useState<"csv" | "xlsx" | "saft" | "pdf" | "manual">("csv");
  const [manCod,  setManCod]  = useState("");
  const [manDesc, setManDesc] = useState("");
  const [manDeb,  setManDeb]  = useState("");
  const [manCred, setManCred] = useState("");

  const totalD = rows.reduce((s, r) => s + r.debito, 0);
  const totalC = rows.reduce((s, r) => s + r.credito, 0);
  const balanced = Math.abs(totalD - totalC) < 1;

  // ── account search options ────────────────────────────────────────────────────
  const accOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return JOURNAL_ACCOUNTS.slice(0, 20);
    return JOURNAL_ACCOUNTS.filter(a =>
      a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [query]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── helpers ───────────────────────────────────────────────────────────────────
  function addAccount(acc: PGCAAccount) {
    if (rows.some(r => r.codigo === acc.code)) { setQuery(""); setShowDrop(false); return; }
    setRows(prev => [...prev, { codigo: acc.code, descricao: acc.name, debito: 0, credito: 0 }]);
    setQuery(""); setShowDrop(false);
  }

  function updateRow(i: number, field: "debito" | "credito", val: string) {
    const n = parseFloat(val) || 0;
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: n } : r));
  }

  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }

  function addManualImportRow() {
    if (!manCod.trim()) return;
    setRows(prev => [...prev, {
      codigo: manCod.trim(), descricao: manDesc.trim(),
      debito: parseFloat(manDeb) || 0, credito: parseFloat(manCred) || 0,
    }]);
    setManCod(""); setManDesc(""); setManDeb(""); setManCred("");
  }

  const [pdfLoading, setPdfLoading] = useState(false);

  const processFile = useCallback((file: File) => {
    setError("");
    if (format === "pdf") {
      setPdfLoading(true);
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const parsed = await parsePDFAbertura(buffer);
          if (!parsed.length) {
            setError("Nenhuma conta PGCA encontrada no PDF. Certifique-se que o PDF contém texto seleccionável (não é uma imagem digitalizada).");
          } else {
            setRows(parsed);
            setStep("preview");
          }
        } catch (ex) {
          setError(`Erro ao processar PDF: ${ex instanceof Error ? ex.message : "Formato não suportado"}`);
        } finally {
          setPdfLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      try {
        let parsed: AberRow[] = [];
        if (format === "csv")  parsed = parseCSVAbertura(text);
        else if (format === "saft") parsed = parseSAFTAbertura(text);
        else if (format === "xlsx") { setError("Exporte o ficheiro como CSV do Excel e importe como CSV."); return; }
        if (!parsed.length) { setError("Nenhuma linha válida. Verifique o formato do ficheiro."); return; }
        setRows(parsed); setStep("preview");
      } catch (ex) {
        setError(`Erro: ${ex instanceof Error ? ex.message : "Formato inválido"}`);
      }
    };
    reader.readAsText(file, "UTF-8");
  }, [format]);

  function doPost() {
    const nonZero = rows.filter(r => r.debito > 0 || r.credito > 0);
    if (!nonZero.length) return;
    onSave({
      data: `${exercicio}-01-01`,
      descricao: `Saldos de Abertura ${exercicio}`,
      tipo: "OUTRO", modulo: "CONTABILIDADE",
      linhas: nonZero.map(r => ({
        conta:    `${r.codigo}${r.descricao ? ` — ${r.descricao}` : ""}`,
        contaCod: r.codigo,
        descricao:`Saldo de abertura ${r.codigo}`,
        debito:   r.debito, credito: r.credito,
      })),
      totalDebito: totalD, totalCredito: totalC, estado: "LANÇADO",
    });
    setStep("done");
  }

  const fmtN = (n: number) => n > 0 ? n.toLocaleString("pt-PT") : "—";

  // ── done screen ───────────────────────────────────────────────────────────────
  if (step === "done") return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-800">Saldos de Abertura Lançados</p>
          <p className="text-sm text-gray-500 mt-1">
            {rows.filter(r => r.debito > 0 || r.credito > 0).length} contas lançadas como saldos de abertura de {exercicio}
          </p>
          <p className="text-xs text-gray-400 mt-1">Lançamento DI/{exercicio}/... adicionado ao diário</p>
        </div>
      </div>
      <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
        <button className="btn-primary" onClick={() => closeWindow(winId)}>Fechar</button>
      </div>
    </div>
  );

  // ── preview screen ────────────────────────────────────────────────────────────
  if (step === "preview") return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">{rows.length} contas para lançar</p>
          <div className="flex gap-4 text-xs text-gray-600">
            <span>Total Déb: <strong className="font-mono text-blue-700">{totalD.toLocaleString("pt-PT")}</strong></span>
            <span>Total Créd: <strong className="font-mono text-blue-700">{totalC.toLocaleString("pt-PT")}</strong></span>
          </div>
        </div>
        {!balanced && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 flex gap-2">
            <span>⚠</span>
            <span>Débitos e créditos não estão equilibrados (dif: {Math.abs(totalD - totalC).toLocaleString("pt-PT")} Kz). Verifique antes de lançar.</span>
          </div>
        )}
        <div className="border border-gray-100 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Código</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Designação</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">Débito</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">Crédito</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-mono font-bold text-brand-700">{r.codigo}</td>
                  <td className="px-3 py-1.5 text-gray-700 truncate max-w-[180px]">{r.descricao || "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(r.debito)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(r.credito)}</td>
                  <td className="px-3 py-1.5">
                    <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <button className="btn-ghost text-sm" onClick={() => setStep("input")}>← Voltar a editar</button>
        <button className="btn-primary" onClick={doPost} disabled={rows.filter(r => r.debito > 0 || r.credito > 0).length === 0}>
          Lançar {rows.filter(r => r.debito > 0 || r.credito > 0).length} contas como Saldos de Abertura
        </button>
      </div>
    </div>
  );

  // ── input screen ──────────────────────────────────────────────────────────────
  const CL_COLORS: Record<number, string> = {
    1:"text-blue-600", 2:"text-green-600", 3:"text-purple-600", 4:"text-cyan-600",
    5:"text-yellow-600", 6:"text-emerald-600", 7:"text-red-600", 8:"text-slate-600",
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Strip */}
      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 shrink-0 flex items-center gap-3">
        <p className="text-[11px] text-gray-500 flex-1">Exercício {exercicio} · Data de lançamento: 01/01/{exercicio}</p>
        <div className="flex gap-1 bg-gray-200 rounded-lg p-0.5">
          {(["manual","importar"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md capitalize transition-all ${
                activeTab === t ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {t === "manual" ? "✏️ Entrada Manual" : "📂 Importar Ficheiro"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ── TAB MANUAL ─────────────────────────────────────────────────────── */}
        {activeTab === "manual" && (
          <>
            {/* Account search */}
            <div ref={dropRef} className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Adicionar conta PGCA</label>
              <input
                className="input font-mono w-full"
                placeholder="Pesquisar por código ou nome da conta…"
                value={query}
                onChange={e => { setQuery(e.target.value); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
              />
              {showDrop && (
                <div className="absolute z-30 top-full left-0 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl">
                  {accOptions.map(a => (
                    <button key={a.code}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-brand-50 border-b border-gray-50 last:border-0 flex items-center gap-2"
                      onMouseDown={e => { e.preventDefault(); addAccount(a); }}
                    >
                      <span className={`font-mono font-bold w-20 shrink-0 ${CL_COLORS[a.classe] ?? ""}`}>{a.code}</span>
                      <span className="text-gray-700 flex-1 truncate">{a.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        a.nature === "devedora" ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"
                      }`}>{a.nature === "devedora" ? "D" : "C"}</span>
                    </button>
                  ))}
                  {!accOptions.length && (
                    <div className="px-3 py-4 text-xs text-gray-400 text-center">Nenhuma conta encontrada</div>
                  )}
                </div>
              )}
            </div>

            {/* Accounts table */}
            {rows.length > 0 ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-0 bg-gray-50 px-3 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                  <span>Código</span><span>Designação</span>
                  <span className="text-right">Débito (Kz)</span>
                  <span className="text-right">Crédito (Kz)</span>
                  <span className="w-7"></span>
                </div>
                {rows.map((r, i) => {
                  const acc = JOURNAL_ACCOUNTS.find(a => a.code === r.codigo);
                  return (
                    <div key={i} className={`grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 px-3 py-2 items-center border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                      <span className={`font-mono font-bold text-xs ${CL_COLORS[acc?.classe ?? 0] ?? "text-gray-700"}`}>{r.codigo}</span>
                      <span className="text-xs text-gray-600 truncate">{r.descricao}</span>
                      <input type="number" min={0} placeholder="0"
                        value={r.debito || ""}
                        onChange={e => updateRow(i, "debito", e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-right font-mono focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full"
                      />
                      <input type="number" min={0} placeholder="0"
                        value={r.credito || ""}
                        onChange={e => updateRow(i, "credito", e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-right font-mono focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full"
                      />
                      <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500 transition-colors w-7 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
                {/* Totals */}
                <div className={`grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-2 px-3 py-2.5 border-t-2 ${balanced ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <span></span>
                  <span className={`text-xs font-bold ${balanced ? "text-green-700" : "text-red-700"}`}>
                    {balanced ? "✓ Equilibrado" : `⚠ Diferença: ${Math.abs(totalD - totalC).toLocaleString("pt-PT")} Kz`}
                  </span>
                  <span className={`text-xs font-bold text-right font-mono ${balanced ? "text-green-700" : "text-red-700"}`}>{totalD.toLocaleString("pt-PT")}</span>
                  <span className={`text-xs font-bold text-right font-mono ${balanced ? "text-green-700" : "text-red-700"}`}>{totalC.toLocaleString("pt-PT")}</span>
                  <span></span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2 border-2 border-dashed border-gray-200 rounded-xl">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/>
                </svg>
                <p className="text-sm font-medium">Pesquise e adicione contas acima</p>
                <p className="text-xs text-center max-w-xs">Seleccione cada conta e introduza o saldo de abertura (Débito ou Crédito)</p>
              </div>
            )}
          </>
        )}

        {/* ── TAB IMPORTAR ───────────────────────────────────────────────────── */}
        {activeTab === "importar" && (
          <>
            {/* Format selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Formato de origem</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {([
                  { id: "csv",    label: "CSV / TXT",         sub: "separado por ; ou ," },
                  { id: "xlsx",   label: "Excel (XLSX)",       sub: "exportar como CSV primeiro" },
                  { id: "saft",   label: "SAF-T Angola (XML)", sub: "conforme Portaria AGT" },
                  { id: "pdf",    label: "PDF (Balancete)",    sub: "extracção automática de texto" },
                  { id: "manual", label: "Linha a Linha",      sub: "introdução manual" },
                ] as const).map(f => (
                  <button key={f.id} onClick={() => setFormat(f.id)}
                    className={`p-2.5 text-xs rounded-xl border text-left transition-all ${
                      format === f.id
                        ? "border-brand-500 bg-brand-50 text-brand-800"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    <p className="font-semibold">{f.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{f.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* File drop zone */}
            {format !== "manual" && (
              <>
                <div
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                    pdfLoading
                      ? "border-brand-300 bg-brand-50/30 cursor-wait"
                      : "border-gray-200 cursor-pointer hover:border-brand-400 hover:bg-brand-50/20"
                  }`}
                  onClick={() => !pdfLoading && fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && !pdfLoading) processFile(f); }}
                >
                  {pdfLoading ? (
                    <>
                      <div className="flex items-center justify-center mb-3">
                        <svg className="w-10 h-10 text-brand-500 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-brand-700">A processar PDF…</p>
                      <p className="text-xs text-brand-500 mt-1">A extrair texto e identificar contas PGCA</p>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl mb-3">
                        {format === "csv" ? "📄" : format === "xlsx" ? "📊" : format === "pdf" ? "📕" : "🗂️"}
                      </div>
                      <p className="text-sm font-semibold text-gray-700">Clique para seleccionar ou arraste o ficheiro</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format === "csv"  && "Colunas esperadas: Código ; Designação ; Débito ; Crédito"}
                        {format === "xlsx" && "Exporte primeiro como CSV do Excel (Ficheiro → Guardar como → CSV)"}
                        {format === "saft" && "Ficheiro SAF-T Angola .xml gerado pelo software de origem"}
                        {format === "pdf"  && "Balancete ou Razão em PDF — o texto deve ser seleccionável (não scanned)"}
                      </p>
                    </>
                  )}
                  <input ref={fileRef} type="file"
                    accept={format === "saft" ? ".xml" : format === "pdf" ? ".pdf" : ".csv,.txt,.xlsx"}
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
                  />
                </div>

                {/* Hints per format */}
                {format === "csv" && (
                  <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-600 space-y-0.5">
                    <p className="font-semibold text-gray-700 font-sans mb-1">Exemplo de ficheiro CSV:</p>
                    <p className="text-gray-500">Codigo;Designacao;Debito;Credito</p>
                    <p>43.1;Banco BFA — C/C;108000000;0</p>
                    <p>51.1;Capital Subscrito;0;500000000</p>
                    <p>31.1.2.1;Clientes Nacionais;25000000;0</p>
                  </div>
                )}
                {format === "pdf" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                    <p className="font-semibold">ℹ️ Requisitos para importação PDF:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                      <li>O PDF deve conter <strong>texto seleccionável</strong> (não uma imagem digitalizada)</li>
                      <li>Compatível com balancetes exportados por: Primavera, PHC, Sage, Gesmax, TOC Online</li>
                      <li>Cada linha deve começar pelo código de conta PGCA (ex: <code className="font-mono bg-amber-100 px-1">43.1</code>)</li>
                      <li>Se o resultado não for correcto, use o formato CSV para maior fiabilidade</li>
                    </ul>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>
                )}
              </>
            )}

            {/* Manual line-by-line */}
            {format === "manual" && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Insira as contas manualmente, uma de cada vez.</p>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="label">Código</label>
                    <input className="input font-mono" placeholder="43.1" value={manCod} onChange={e => setManCod(e.target.value)} onKeyDown={e => e.key === "Enter" && addManualImportRow()} />
                  </div>
                  <div>
                    <label className="label">Designação</label>
                    <input className="input" placeholder="Banco BFA" value={manDesc} onChange={e => setManDesc(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Débito</label>
                    <input type="number" min={0} className="input text-right font-mono" placeholder="0" value={manDeb} onChange={e => setManDeb(e.target.value)} onKeyDown={e => e.key === "Enter" && addManualImportRow()} />
                  </div>
                  <div>
                    <label className="label">Crédito</label>
                    <input type="number" min={0} className="input text-right font-mono" placeholder="0" value={manCred} onChange={e => setManCred(e.target.value)} onKeyDown={e => e.key === "Enter" && addManualImportRow()} />
                  </div>
                </div>
                <button className="btn-secondary w-full" onClick={addManualImportRow} disabled={!manCod.trim()}>
                  + Adicionar Linha
                </button>
              </div>
            )}

            {/* Rows preview (for manual + already-parsed CSV) */}
            {rows.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Código</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Designação</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Débito</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Crédito</th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-mono font-bold text-brand-700">{r.codigo}</td>
                        <td className="px-3 py-1.5 text-gray-700 truncate max-w-[160px]">{r.descricao || "—"}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{fmtN(r.debito)}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{fmtN(r.credito)}</td>
                        <td className="px-3 py-1.5">
                          <button onClick={() => removeRow(i)} className="text-gray-300 hover:text-red-500">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Balance summary */}
            {rows.length > 0 && (
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-semibold ${balanced ? "bg-green-50 border-green-200 text-green-800" : "bg-yellow-50 border-yellow-200 text-yellow-800"}`}>
                <span>{balanced ? "✓ Balancete equilibrado" : `⚠ Desequilíbrio: ${Math.abs(totalD - totalC).toLocaleString("pt-PT")} Kz`}</span>
                <span className="font-mono">{rows.length} contas · Déb {totalD.toLocaleString("pt-PT")} · Créd {totalC.toLocaleString("pt-PT")}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <button className="btn-ghost text-sm" onClick={() => closeWindow(winId)}>Cancelar</button>
        <div className="flex gap-2">
          {activeTab === "importar" && rows.length > 0 && step === "input" && (
            <button className="btn-secondary" onClick={() => { setStep("preview"); }}>
              Pré-visualizar ({rows.length})
            </button>
          )}
          <button
            className="btn-primary"
            disabled={rows.filter(r => r.debito > 0 || r.credito > 0).length === 0}
            onClick={doPost}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            Lançar Saldos de Abertura
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ContabilidadePage() {
  const [exercicio, setExercicio] = useState(() =>
    ANOS_DISPONIVEIS[0] ?? new Date().getFullYear().toString()
  );
  const { entries, addEntry, estornar, clearEntries, loaded } = useJournal(exercicio);
  const { openWindow } = useWindowManager();
  const { openNovaConta, openNovoFornecedor, openNovoCliente } = useQuickActions();
  const [confirmingClear, setConfirmingClear] = useState(false);

  function handleNovoLancamento() {
    const winId = "novo-lancamento";
    openWindow({
      id: winId,
      title: "Novo Lançamento Contabilístico",
      icon: "📒",
      content: <NovoLancamentoContent exercicio={exercicio} winId={winId} onSave={addEntry} />,
      x: 40, y: 20, width: 940, height: 620,
      minimized: false, maximized: false,
    });
  }

  function handleAbertura() {
    const winId = `abertura-${exercicio}`;
    openWindow({
      id: winId,
      title: `Saldos de Abertura — ${exercicio}`,
      icon: "📥",
      content: <AberturaSaldosContent exercicio={exercicio} winId={winId} onSave={addEntry} />,
      x: 60, y: 30, width: 980, height: 660,
      minimized: false, maximized: false,
    });
  }

  function handleVerLancamento(entry: JournalEntry) {
    const winId = `ver-lancamento-${entry.id}`;
    openWindow({
      id: winId,
      title: entry.numero,
      icon: "📋",
      content: (
        <VerLancamentoContent
          entry={entry}
          winId={winId}
          onEstornar={() => estornar(entry.id)}
        />
      ),
      x: 60, y: 40, width: 780, height: 520,
      minimized: false, maximized: false,
    });
  }

  // Filters
  const [pesquisa, setPesquisa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [dataIni, setDataIni] = useState(`${exercicio}-01-01`);
  const [dataFim, setDataFim] = useState(`${exercicio}-12-31`);

  // Reset filters on exercicio change
  useEffect(() => {
    setDataIni(`${exercicio}-01-01`);
    setDataFim(`${exercicio}-12-31`);
    setFiltroTipo("Todos");
    setFiltroEstado("Todos");
    setPesquisa("");
  }, [exercicio]);

  const tiposDisponiveis = useMemo(() =>
    ["Todos", ...Array.from(new Set(entries.map(e => e.tipo)))],
  [entries]);

  const filtered = useMemo(() => entries.filter(e => {
    if (pesquisa && !e.descricao.toLowerCase().includes(pesquisa.toLowerCase()) && !e.numero.includes(pesquisa)) return false;
    if (filtroTipo !== "Todos" && e.tipo !== filtroTipo) return false;
    if (filtroEstado !== "Todos" && e.estado !== filtroEstado) return false;
    if (dataIni && e.data < dataIni) return false;
    if (dataFim && e.data > dataFim) return false;
    return true;
  }), [entries, pesquisa, filtroTipo, filtroEstado, dataIni, dataFim]);

  const totalDeb  = filtered.reduce((s, e) => s + e.totalDebito, 0);
  const totalCred = filtered.reduce((s, e) => s + e.totalCredito, 0);
  const equilibrado = Math.abs(totalDeb - totalCred) < 1;

  const lancados = filtered.filter(e => e.estado === "LANÇADO").length;
  const anulados = filtered.filter(e => e.estado === "ANULADO").length;

  return (
    <div>
      <Topbar
        title="Diário Contabilístico"
        subtitle={`PGCA Angola · Partidas dobradas · Exercício ${exercicio}`}
        actions={
          <>
            {/* Year selector */}
            <div className="flex gap-1 border border-gray-200 rounded-lg p-0.5">
              {ANOS_DISPONIVEIS.map(y => (
                <button key={y} onClick={() => setExercicio(y)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                    exercicio === y ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}>{y}</button>
              ))}
            </div>
            <button
              className="btn-secondary"
              onClick={() => exportEntriesDetailCSV(filtered, `diario-${exercicio}.csv`)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar CSV
            </button>

            <button className="btn-secondary" onClick={handleAbertura}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Saldos de Abertura
            </button>

            {/* Limpar diário */}
            {!confirmingClear ? (
              <button
                className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setConfirmingClear(true)}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpar Diário
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-xs font-semibold text-red-700">
                  Apagar todos os {entries.length} lançamentos de {exercicio}?
                </span>
                <button
                  onClick={() => { clearEntries(); setConfirmingClear(false); }}
                  className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setConfirmingClear(false)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Cancelar
                </button>
              </div>
            )}
            {/* Quick Actions */}
            <div className="relative group">
              <button className="btn-secondary flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Acções Rápidas
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                <div className="p-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide px-3 py-1.5 font-semibold">Sem sair do Diário</p>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg"
                    onClick={() => openNovaConta()}>
                    📒 Nova Conta (PGCA)
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg"
                    onClick={() => openNovoFornecedor()}>
                    🏭 Novo Fornecedor
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-brand-50 hover:text-brand-700 rounded-lg"
                    onClick={() => openNovoCliente()}>
                    👤 Novo Cliente
                  </button>
                </div>
              </div>
            </div>
            <button className="btn-primary" onClick={() => handleNovoLancamento()}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Lançamento
            </button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filtros */}
        <div className="card p-4 flex flex-wrap items-center gap-3">
          <input
            type="text" className="input max-w-xs"
            placeholder="Pesquisar nº ou descrição…"
            value={pesquisa} onChange={e => setPesquisa(e.target.value)}
          />
          <select className="input max-w-[160px]" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            {tiposDisponiveis.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="input max-w-[140px]" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            {["Todos", "LANÇADO", "ANULADO", "RASCUNHO"].map(s => <option key={s}>{s}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">De:</span>
            <input type="date" className="input max-w-[140px]" value={dataIni} onChange={e => setDataIni(e.target.value)} />
            <span className="text-xs text-gray-500">a</span>
            <input type="date" className="input max-w-[140px]" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
          {(pesquisa || filtroTipo !== "Todos" || filtroEstado !== "Todos") && (
            <button
              className="text-xs text-brand-600 hover:text-brand-800 font-medium"
              onClick={() => { setPesquisa(""); setFiltroTipo("Todos"); setFiltroEstado("Todos"); }}
            >Limpar filtros</button>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: "Total registos",  v: filtered.length.toString(),   c: "text-gray-900" },
            { l: "Lançados",        v: lancados.toString(),           c: "text-green-700" },
            { l: "Anulados",        v: anulados.toString(),           c: "text-red-700" },
            { l: "Equilíbrio",
              v: equilibrado ? "✓ Equilibrado" : "⚠ Desequilibrado",
              c: equilibrado ? "text-green-700" : "text-red-700" },
          ].map(k => (
            <div key={k.l} className="card p-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{k.l}</p>
              <p className={`text-lg font-bold mt-1 ${k.c}`}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3>Diário — {exercicio}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {filtered.length} lançamento{filtered.length !== 1 ? "s" : ""} · Valores eM Kz
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            {!loaded ? (
              <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
                A carregar lançamentos…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">Nenhum lançamento encontrado</p>
                <button className="btn-primary text-sm" onClick={() => handleNovoLancamento()}>
                  Criar primeiro lançamento
                </button>
              </div>
            ) : (
              <table className="table-auto w-full">
                <thead>
                  <tr>
                    <th>Nº Diário</th>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th>Módulo</th>
                    <th className="text-right">Débito (Kz)</th>
                    <th className="text-right">Crédito (Kz)</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className={`cursor-pointer ${e.estado === "ANULADO" ? "opacity-60" : ""}`}>
                      <td className="font-mono text-xs text-brand-700 font-semibold">{e.numero}</td>
                      <td className="text-gray-500 text-xs whitespace-nowrap">{e.data}</td>
                      <td className="max-w-xs">
                        <p className="text-sm truncate">{e.descricao}</p>
                        {e.estornadoDe && (
                          <p className="text-[10px] text-amber-600 font-medium">Estorno de {e.estornadoDe}</p>
                        )}
                      </td>
                      <td><span className="badge badge-blue text-[10px]">{e.tipo}</span></td>
                      <td className="text-xs text-gray-400">{e.modulo}</td>
                      <td className="text-right font-mono text-xs text-gray-700">{fmtAOA(e.totalDebito)}</td>
                      <td className="text-right font-mono text-xs text-gray-700">{fmtAOA(e.totalCredito)}</td>
                      <td>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_STYLE[e.estado] ?? "bg-gray-100 text-gray-700"}`}>
                          {e.estado}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleVerLancamento(e)}
                          className="btn-ghost py-1 px-2 text-xs"
                        >Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Débitos</p>
            <p className="text-xl font-bold text-gray-900 mt-1 font-mono">{totalDeb.toLocaleString("pt-PT")} AOA</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Créditos</p>
            <p className="text-xl font-bold text-gray-900 mt-1 font-mono">{totalCred.toLocaleString("pt-PT")} AOA</p>
          </div>
          <div className={`card p-4 text-center border-2 ${equilibrado ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Equilíbrio das Partidas</p>
            <p className={`text-xl font-bold mt-1 ${equilibrado ? "text-green-700" : "text-red-700"}`}>
              {equilibrado ? "✓ Débitos = Créditos" : `⚠ Dif. ${Math.abs(totalDeb - totalCred).toLocaleString("pt-PT")}`}
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center pb-2">
          PGCA Angola — Decreto n.º 82/01, de 16 de Novembro · Princípio das partidas dobradas · Exercício {exercicio}
        </p>
      </div>

    </div>
  );
}
