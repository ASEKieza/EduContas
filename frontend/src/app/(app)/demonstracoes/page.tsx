"use client";

import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import Topbar from "@/components/Topbar";
import { DEMO_COMPANY } from "@/lib/company";
import {
  buildBalanco, buildDRNatureza, buildDRFuncoes,
  buildDFCDirecto, buildDFCIndirecto, buildDACPRows,
} from "@/lib/accounting/engine";
import { DATASETS, ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { journalEntriesToBalancesMap } from "@/lib/accounting/bridge";
import { useJournal, JOURNAL_ACCOUNTS } from "@/lib/journal";
import type { FSRow, BalancesMap } from "@/lib/accounting/types";

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "balanco" | "dr_natureza" | "dr_funcoes" | "dfc_directo" | "dfc_indirecto" | "dacp";

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "balanco",       label: "Balanço",       sub: "Posição financeira" },
  { id: "dr_natureza",   label: "DR — Natureza", sub: "Demonstração de Resultados" },
  { id: "dr_funcoes",    label: "DR — Funções",  sub: "Por funções" },
  { id: "dfc_directo",   label: "DFC Directo",   sub: "Fluxos de Caixa" },
  { id: "dfc_indirecto", label: "DFC Indirecto", sub: "Fluxos de Caixa" },
  { id: "dacp",          label: "DACP",          sub: "Alterações Capital Próprio" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(v: number, neg = false): string {
  if (v === 0) return "—";
  const abs = Math.abs(v);
  const s = abs.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 || neg) ? `(${s})` : s;
}

function dateFim(ano: string) { return `31/12/${ano}`; }

// ── Professional Document Shell ────────────────────────────────────────────────
interface DocShellProps {
  docTitulo: string;
  docSubtitulo: string;
  ano: string;
  isReal: boolean;
  moeda?: string;
  children: React.ReactNode;
}

function DocShell({ docTitulo, docSubtitulo, ano, isReal, moeda = "Kwanzas (AOA)", children }: DocShellProps) {
  const anoN1 = String(Number(ano) - 1);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">

      {/* ── Cabeçalho empresa ── */}
      <div className="text-center px-6 pt-4 pb-2 border-b border-gray-300">
        <p className="text-[13px] font-bold text-gray-900 uppercase tracking-widest leading-tight">
          {DEMO_COMPANY.nome}
        </p>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {DEMO_COMPANY.nifFormatado} · {DEMO_COMPANY.sede} · Capital Social: {DEMO_COMPANY.capitalSocialFmt}
        </p>
      </div>

      {/* ── Título e data ── */}
      <div className="flex items-end justify-between px-6 py-2 border-b border-gray-300">
        <div>
          <p className="text-[13px] font-bold text-gray-900">{docTitulo}</p>
          <p className="text-[10px] text-gray-500">Moeda: {moeda}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-700 font-semibold">Em 31 de Dezembro de {ano}</p>
          <p className="text-[10px] text-gray-500">{docSubtitulo}</p>
        </div>
        <span className={`no-print inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          isReal ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isReal ? "bg-green-500" : "bg-amber-500"}`} />
          {isReal ? "Dados Reais" : "Demonstração"}
        </span>
      </div>

      {/* ── Corpo ── */}
      {children}

      {/* ── Assinaturas ── */}
      <div style={{ borderTop: "3px solid #1a2744" }} className="px-6 py-5">
        <div className="grid grid-cols-3 gap-8 mb-5">
          {[
            { label:"O Contabilista Certificado",             nome: DEMO_COMPANY.contabilista, cedula: DEMO_COMPANY.contabCedula },
            { label:"O Presidente do Conselho de Administração", nome: DEMO_COMPANY.presidente, cedula: "" },
            { label:"O Administrador Financeiro",             nome: DEMO_COMPANY.adminFinanceiro, cedula: "" },
          ].map(sig => (
            <div key={sig.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-8" style={{ color: "#1a2744" }}>
                {sig.label}:
              </p>
              <div className="border-b mb-1.5" style={{ borderColor: "#1a2744" }} />
              <p className="text-[10px] text-gray-700 font-medium">{sig.nome}</p>
              {sig.cedula && <p className="text-[9px] text-gray-400">{sig.cedula}</p>}
            </div>
          ))}
        </div>
        <p className="text-center text-[9px] text-gray-400">
          Luanda, ___ de __________________ de {ano} &nbsp;·&nbsp;
          EduContas ERP &nbsp;·&nbsp; PGCA Angola — Decreto n.º 82/01 &nbsp;·&nbsp;
          Lei n.º 22/11 de 17 de Junho
        </p>
      </div>
    </div>
  );
}

// ── Table row ──────────────────────────────────────────────────────────────────
function DFRow({ r, ano }: { r: FSRow; ano: string }) {
  if (r.tipo === "spacer") return <tr><td colSpan={4} className="py-px" /></tr>;

  const isTotal      = r.tipo === "total";
  const isSubtotal   = r.tipo === "subtotal";
  const isTitle      = r.tipo === "title";
  const isValidation = r.tipo === "validation";

  const rowBg =
    isTotal      ? "bg-[#1a2744]" :
    isSubtotal   ? "bg-gray-100" :
    isTitle      ? "bg-gray-50" :
    isValidation ? "bg-green-50" :
    "hover:bg-gray-50/60";

  const descCls =
    isTotal      ? "text-white font-bold uppercase text-[10px] tracking-wide" :
    isSubtotal   ? "text-gray-800 font-bold text-[11px]" :
    isTitle      ? "text-gray-600 font-bold uppercase text-[9px] tracking-widest" :
    isValidation ? "text-green-800 font-semibold text-[10px]" :
    `text-gray-800 text-[11px] ${r.tipo === "indent" ? "pl-6" : ""}`;

  const valBase = isTotal
    ? "text-white font-bold font-mono tabular-nums text-[11px]"
    : isSubtotal
    ? "text-gray-900 font-bold font-mono tabular-nums text-[11px]"
    : "text-gray-800 font-mono tabular-nums text-[11px]";

  const val1Cls = isTotal ? "text-white/75 font-mono tabular-nums text-[11px]" : "text-gray-500 font-mono tabular-nums text-[11px]";

  return (
    <tr className={`border-b border-gray-100 ${rowBg} transition-colors`}>
      <td className={`px-3 py-[2px] ${descCls}`}>{r.desc}</td>
      <td className={`px-2 py-[2px] text-center w-10 text-[10px] ${isTotal ? "text-white/70" : "text-brand-600 font-bold"}`}>
        {r.nota ?? ""}
      </td>
      <td className={`px-3 py-[2px] text-right w-36 ${isTitle || isTotal && r.n === 0 ? "" : valBase}`}>
        {!isTitle ? fmt(r.n, r.neg) : ""}
      </td>
      <td className={`px-3 py-[2px] text-right w-36 ${isTitle ? "" : val1Cls}`}>
        {!isTitle ? fmt(r.n1, r.neg) : ""}
      </td>
    </tr>
  );
}

// Row that acts as a dark section divider inside the table body
function SectionRow({ label, ano }: { label: string; ano: string }) {
  const anoN1 = String(Number(ano) - 1);
  return (
    <tr className="bg-[#1a2744] text-white">
      <td className="px-3 py-1.5 font-bold text-[11px] uppercase tracking-wider">{label}</td>
      <td className="px-2 py-1.5 text-center text-[10px] text-white/60">Notas</td>
      <td className="px-3 py-1.5 text-right text-[10px] font-semibold text-white/90">{dateFim(ano)}</td>
      <td className="px-3 py-1.5 text-right text-[10px] font-semibold text-white/60">{dateFim(anoN1)}</td>
    </tr>
  );
}

// ── Shared props ───────────────────────────────────────────────────────────────
interface StmtProps { ano: string; cur: BalancesMap; pri: BalancesMap; isReal: boolean; }

// ── BALANÇO — single vertical table ───────────────────────────────────────────
function Balanco({ ano, cur, pri, isReal }: StmtProps) {
  const { activo, capitalPassivo } = buildBalanco(cur, pri);

  return (
    <DocShell
      docTitulo="Balanço"
      docSubtitulo="PGCA Angola — Decreto n.º 82/01"
      ano={ano}
      isReal={isReal}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            <SectionRow label="Activo" ano={ano} />
            {activo.map((r, i) => <DFRow key={`a-${i}`} r={r} ano={ano} />)}
            <tr><td colSpan={4} className="py-px" /></tr>
            <SectionRow label="Capital Próprio e Passivo" ano={ano} />
            {capitalPassivo.map((r, i) => <DFRow key={`cp-${i}`} r={r} ano={ano} />)}
          </tbody>
        </table>
      </div>
    </DocShell>
  );
}

// ── Shared single-table statement ──────────────────────────────────────────────
function SingleStmt({ titulo, subtitulo, rows, ano, isReal }: {
  titulo: string; subtitulo: string; rows: FSRow[]; ano: string; isReal: boolean;
}) {
  const anoN1 = String(Number(ano) - 1);
  return (
    <DocShell docTitulo={titulo} docSubtitulo={subtitulo} ano={ano} isReal={isReal}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1a2744] text-white">
              <th className="px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider">Descrição</th>
              <th className="px-2 py-1.5 text-center text-[9px] font-bold uppercase w-10">Notas</th>
              <th className="px-3 py-1.5 text-right text-[10px] font-semibold w-36">{dateFim(ano)}</th>
              <th className="px-3 py-1.5 text-right text-[10px] font-semibold w-36 text-white/70">{dateFim(anoN1)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => <DFRow key={i} r={r} ano={ano} />)}
          </tbody>
        </table>
      </div>
    </DocShell>
  );
}

// ── DR NATUREZA ────────────────────────────────────────────────────────────────
function DRNatureza({ ano, cur, pri, isReal }: StmtProps) {
  return (
    <SingleStmt
      titulo="Demonstração de Resultados por Natureza"
      subtitulo="PGCA Angola — Decreto n.º 82/01 · Exercício findo em 31 de Dezembro"
      rows={buildDRNatureza(cur, pri)}
      ano={ano} isReal={isReal}
    />
  );
}

// ── DR FUNÇÕES ─────────────────────────────────────────────────────────────────
function DRFuncoes({ ano, cur, pri, isReal }: StmtProps) {
  return (
    <SingleStmt
      titulo="Demonstração de Resultados por Funções"
      subtitulo="Classificação dos gastos pela sua função · PGCA Angola — Decreto n.º 82/01"
      rows={buildDRFuncoes(cur, pri)}
      ano={ano} isReal={isReal}
    />
  );
}

// ── DFC DIRECTO ────────────────────────────────────────────────────────────────
function DFCDirecto({ ano, cur, pri, isReal }: StmtProps) {
  return (
    <SingleStmt
      titulo="Demonstração de Fluxos de Caixa — Método Directo"
      subtitulo="Nota 43 · PGCA Angola — Decreto n.º 82/01"
      rows={buildDFCDirecto(cur, pri)}
      ano={ano} isReal={isReal}
    />
  );
}

// ── DFC INDIRECTO ──────────────────────────────────────────────────────────────
function DFCIndirecto({ ano, cur, pri, isReal }: StmtProps) {
  return (
    <SingleStmt
      titulo="Demonstração de Fluxos de Caixa — Método Indirecto"
      subtitulo="Nota 43 · PGCA Angola — Decreto n.º 82/01"
      rows={buildDFCIndirecto(cur, pri)}
      ano={ano} isReal={isReal}
    />
  );
}

// ── DACP ───────────────────────────────────────────────────────────────────────
function DACP({ ano, cur, pri, isReal }: StmtProps) {
  const rows = buildDACPRows(cur, pri);
  const cols = ["Capital Social", "Reservas", "Result. Transitados", "Result. Líquido", "Outras Rubricas", "Total CP"];

  return (
    <DocShell
      docTitulo="Demonstração das Alterações nos Capitais Próprios"
      docSubtitulo="PGCA Angola — Decreto n.º 82/01"
      ano={ano}
      isReal={isReal}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#1a2744] text-white">
              <th className="px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider min-w-[160px]">Rubrica</th>
              {cols.map(c => (
                <th key={c} className="px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider w-24 whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b border-gray-100 text-[11px] leading-none transition-colors ${
                r.bold ? "bg-gray-100 font-bold" : "hover:bg-gray-50/60"
              }`}>
                <td className={`px-3 py-[2px] ${r.bold ? "font-bold text-gray-900" : "text-gray-700"}`}>{r.label}</td>
                {r.vals.map((v, j) => (
                  <td key={j} className={`px-2 py-[2px] text-right font-mono tabular-nums ${
                    v === 0 ? "text-gray-300" : v < 0 ? "text-red-600" : "text-gray-900"
                  } ${r.bold ? "font-bold" : ""}`}>
                    {v === 0 ? "—" : v < 0 ? `(${Math.abs(v).toLocaleString("pt-PT")})` : v.toLocaleString("pt-PT")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DocShell>
  );
}

// ── Export helpers ─────────────────────────────────────────────────────────────
function fmtNum(v: number, neg = false): string {
  if (v === 0) return "—";
  const abs = Math.abs(v).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 || neg) ? `(${abs})` : abs;
}

function rowsForTab(tab: Tab, cur: BalancesMap, pri: BalancesMap): FSRow[] {
  switch (tab) {
    case "balanco": {
      const { activo, capitalPassivo } = buildBalanco(cur, pri);
      return [...activo, ...capitalPassivo];
    }
    case "dr_natureza":   return buildDRNatureza(cur, pri);
    case "dr_funcoes":    return buildDRFuncoes(cur, pri);
    case "dfc_directo":   return buildDFCDirecto(cur, pri);
    case "dfc_indirecto": return buildDFCIndirecto(cur, pri);
    case "dacp":          return buildDACPRows(cur, pri) as unknown as FSRow[];
  }
}

function exportDemonstracoesXLSX(
  tab: Tab, ano: string, cur: BalancesMap, pri: BalancesMap, label: string
) {
  const rows = rowsForTab(tab, cur, pri).filter(r => r.tipo !== "spacer");
  const anoN1 = String(Number(ano) - 1);
  const data = rows.map(r => ({
    Descrição: r.desc,
    Notas: r.nota ?? "",
    [dateFim(ano)]: r.tipo !== "title" ? fmtNum(r.n, r.neg) : "",
    [dateFim(anoN1)]: r.tipo !== "title" ? fmtNum(r.n1, r.neg) : "",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31));
  XLSX.writeFile(wb, `EduContas_${tab}_${ano}.xlsx`);
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DemonstracoesPagina() {
  const [tab, setTab] = useState<Tab>("balanco");
  const [ano, setAno] = useState(ANOS_DISPONIVEIS[0]);
  const [forceDemo, setForceDemo] = useState(false);

  const { entries, loaded } = useJournal(ano);

  const journalMap = useMemo(
    () => journalEntriesToBalancesMap(entries, JOURNAL_ACCOUNTS),
    [entries]
  );

  const lancados = entries.filter(e => e.estado === "LANÇADO").length;
  const hasReal  = loaded && lancados > 0;

  const ds = DATASETS[ano] ?? DATASETS["2025"];
  const cur: BalancesMap = forceDemo ? ds.cur : journalMap;
  const pri: BalancesMap = forceDemo ? ds.pri : {};

  const current = TABS.find(t => t.id === tab)!;
  const stmtProps: StmtProps = { ano, cur, pri, isReal: !forceDemo };

  function handleXLSX() { exportDemonstracoesXLSX(tab, ano, cur, pri, current.label); }
  function handlePrint() { window.print(); }

  return (
    <div>
      <Topbar
        title={current.label}
        subtitle={`${current.sub} · PGCA Angola — Decreto n.º 82/01`}
        actions={
          <>
            <button className="btn-secondary" onClick={handlePrint}>Exportar PDF</button>
            <button className="btn-secondary" onClick={handleXLSX}>Exportar XLSX</button>
            <button className="btn-primary" onClick={handlePrint}>Imprimir</button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* Controls */}
        <div className="no-print card p-3 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5 flex-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
                  tab === t.id
                    ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                    : "bg-white text-gray-700 border-gray-300 hover:border-brand-400 hover:text-brand-700"
                }`}>
                {t.label}
                <span className="text-[10px] opacity-70 ml-1.5">({t.sub.split(" ")[0]})</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ano:</span>
              {ANOS_DISPONIVEIS.map(y => (
                <button key={y} onClick={() => setAno(y)}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-bold transition-colors ${
                    ano === y ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-300 hover:bg-gray-50"
                  }`}>
                  {y}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1">
              <button onClick={() => setForceDemo(false)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  !forceDemo ? "bg-white text-green-700 shadow-sm" : "text-ink-500 hover:text-ink-700"
                }`}>
                Dados Reais
              </button>
              <button onClick={() => setForceDemo(true)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                  forceDemo ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-700"
                }`}>
                Demo
              </button>
            </div>
          </div>
        </div>

        {/* Journal status banner */}
        {loaded && (
          <div className={`no-print flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
            forceDemo
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : hasReal
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-50 text-gray-600 border-gray-200"
          }`}>
            {forceDemo
              ? <>● Modo Demonstração — a mostrar dados de exemplo</>
              : hasReal
                ? <>✓ {lancados} lançamento{lancados !== 1 ? "s" : ""} no diário para {ano} — {Object.keys(journalMap).length} contas mapeadas</>
                : <>○ Diário vazio para {ano} — demonstrações a zeros. Lance movimentos no Diário Contabilístico.</>
            }
          </div>
        )}

        {/* Statement */}
        {tab === "balanco"       && <Balanco      {...stmtProps} />}
        {tab === "dr_natureza"   && <DRNatureza   {...stmtProps} />}
        {tab === "dr_funcoes"    && <DRFuncoes    {...stmtProps} />}
        {tab === "dfc_directo"   && <DFCDirecto   {...stmtProps} />}
        {tab === "dfc_indirecto" && <DFCIndirecto {...stmtProps} />}
        {tab === "dacp"          && <DACP         {...stmtProps} />}
      </div>
    </div>
  );
}
