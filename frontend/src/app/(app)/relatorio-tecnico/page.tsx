"use client";

import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  buildBalanco, buildDRNatureza, buildDRFuncoes,
  buildDFCDirecto, buildDFCIndirecto, buildDACPRows,
  buildModelo1, calcApuramento, sum,
} from "@/lib/accounting/engine";
import { DATASETS, ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { DEMO_COMPANY } from "@/lib/company";
import { NOTAS, CAT_LABELS, CAT_COLORS, useNotasTextos } from "@/lib/notas-shared";
import type { NotaCat } from "@/lib/notas-shared";
import type { FSRow } from "@/lib/accounting/types";

// ── AI suggest hook ────────────────────────────────────────────────────────────
function useAiSuggest() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [source, setSource] = useState<Record<string, "claude" | "demo">>({});

  const suggest = useCallback(async (
    key: string,
    tipo: "gestao" | "nota",
    seccao: string,
    dados: Record<string, unknown>,
    ano: string,
  ) => {
    setLoading(p => ({ ...p, [key]: true }));
    try {
      const res = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, seccao, dados, empresa: DEMO_COMPANY.nome, ano }),
      });
      const data = await res.json() as { texto?: string; source?: "claude"|"demo"; error?: string };
      if (data.texto) {
        setSuggestions(p => ({ ...p, [key]: data.texto! }));
        setSource(p => ({ ...p, [key]: data.source ?? "demo" }));
      }
    } catch {
      setSuggestions(p => ({ ...p, [key]: "Erro ao gerar sugestão. Tente novamente." }));
    } finally {
      setLoading(p => ({ ...p, [key]: false }));
    }
  }, []);

  return { loading, suggestions, source, suggest };
}

// ── AI Suggestion Card ─────────────────────────────────────────────────────────
function AiSuggestionCard({
  id, tipo, seccao, dados, ano, onApply,
}: {
  id: string; tipo: "gestao"|"nota"; seccao: string;
  dados: Record<string, unknown>; ano: string;
  onApply?: (text: string) => void;
}) {
  const { loading, suggestions, source, suggest } = useAiSuggest();
  const text = suggestions[id];
  const isLoading = loading[id];
  const src = source[id];

  return (
    <div>
      {!text && !isLoading && (
        <button
          onClick={() => suggest(id, tipo, seccao, dados, ano)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
          style={{ borderColor:"#7c3aed", color:"#7c3aed" }}
          onMouseOver={e => (e.currentTarget.style.backgroundColor="#f5f3ff")}
          onMouseOut={e => (e.currentTarget.style.backgroundColor="transparent")}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L9.1 9.1 2 12l7.1 2.9L12 22l2.9-7.1L22 12l-7.1-2.9z" />
          </svg>
          Sugerir com IA
        </button>
      )}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-purple-600 py-1">
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          A gerar sugestão com IA (contexto Angola 2025)...
        </div>
      )}
      {text && !isLoading && (
        <div className="mt-2 rounded-lg border border-purple-200 bg-purple-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-purple-200 bg-purple-100">
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L9.1 9.1 2 12l7.1 2.9L12 22l2.9-7.1L22 12l-7.1-2.9z" />
              </svg>
              <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                Sugestão IA {src === "claude" ? "· Claude Sonnet" : "· Modo Demo"}
              </span>
              <span className="text-[9px] text-purple-500">BNA · INE · AGT · MINFIN · OCPCA</span>
            </div>
            <div className="flex gap-1">
              {onApply && (
                <button onClick={() => onApply(text)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-600 text-white hover:bg-purple-700 transition-colors">
                  Usar
                </button>
              )}
              <button onClick={() => suggest(id, tipo, seccao, dados, ano)}
                className="text-[10px] font-semibold px-2 py-0.5 rounded border border-purple-300 text-purple-600 hover:bg-purple-200 transition-colors">
                Gerar novamente
              </button>
            </div>
          </div>
          <p className="px-3 py-2 text-xs text-gray-700 leading-relaxed whitespace-pre-line">{text}</p>
        </div>
      )}
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────────────────────────
type Tab = "gestao" | "demonstracoes" | "notas" | "parecer" | "indicadores" | "mapas";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "gestao",         label: "Relatório de Gestão",       icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "demonstracoes",  label: "Demonstrações Financeiras",  icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id: "notas",          label: "Notas às DF",                icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" },
  { id: "parecer",        label: "Parecer / CLC",              icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  { id: "indicadores",    label: "Indicadores Fiscais",        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "mapas",          label: "Mapas Fiscais",              icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
];

const ANOS = ANOS_DISPONIVEIS;
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const RG_SECOES = [
  { id:"actividade",   titulo:"1. Actividade e Evolução dos Negócios",          desc:"Descrição da actividade da empresa no exercício, principais linhas de produtos/serviços, evolução das vendas, conquistas e desafios." },
  { id:"analise",      titulo:"2. Análise do Desempenho Financeiro",            desc:"Comentário sobre os principais indicadores financeiros: volume de negócios, resultados, situação financeira e posição de tesouraria." },
  { id:"invest",       titulo:"3. Investimentos Realizados",                    desc:"Principais investimentos em imobilizações corpóreas e incorpóreas realizados no exercício; financiamento utilizado." },
  { id:"rh",           titulo:"4. Recursos Humanos",                            desc:"Evolução do número de trabalhadores, política de formação, relações laborais e encargos sociais." },
  { id:"ambiente",     titulo:"5. Questões Ambientais e Sustentabilidade",      desc:"Impacto ambiental da actividade, medidas adoptadas, custos e provisões ambientais." },
  { id:"riscos",       titulo:"6. Principais Riscos e Incertezas",              desc:"Riscos operacionais, financeiros, cambiais, de crédito e liquidez; medidas de mitigação adoptadas." },
  { id:"pos-balanco",  titulo:"7. Factos Relevantes Após a Data do Balanço",   desc:"Acontecimentos significativos ocorridos entre a data do balanço e a aprovação das demonstrações financeiras." },
  { id:"perspect",     titulo:"8. Perspectivas para o Próximo Exercício",      desc:"Objectivos e estratégia para o exercício seguinte; principais projectos e investimentos planeados." },
  { id:"resultado",    titulo:"9. Proposta de Aplicação de Resultados",         desc:"Proposta do conselho de administração para a aplicação do resultado líquido do exercício (dividendos, reservas, resultados transitados)." },
  { id:"governanca",   titulo:"10. Governo da Sociedade",                       desc:"Estrutura de governo, composição dos órgãos sociais, remunerações da gerência/administração." },
];

interface KPIItem { label: string; formula: string; grupo: string; }
const KPIS: KPIItem[] = [
  { grupo:"Rentabilidade", label:"Rentabilidade do Activo (ROA)",          formula:"Resultado Líquido / Total Activo" },
  { grupo:"Rentabilidade", label:"Rentabilidade do Capital Próprio (ROE)", formula:"Resultado Líquido / Capital Próprio" },
  { grupo:"Rentabilidade", label:"Margem Líquida",                         formula:"Resultado Líquido / Volume de Negócios" },
  { grupo:"Rentabilidade", label:"Margem EBITDA",                          formula:"EBITDA / Volume de Negócios" },
  { grupo:"Liquidez",      label:"Liquidez Geral",                         formula:"Activo Corrente / Passivo Corrente" },
  { grupo:"Liquidez",      label:"Liquidez Reduzida",                      formula:"(AC – Existências) / Passivo Corrente" },
  { grupo:"Liquidez",      label:"Liquidez Imediata",                      formula:"Disponibilidades / Passivo Corrente" },
  { grupo:"Endividamento", label:"Autonomia Financeira",                   formula:"Capital Próprio / Total Activo" },
  { grupo:"Endividamento", label:"Solvabilidade",                          formula:"Capital Próprio / Total Passivo" },
  { grupo:"Endividamento", label:"Debt/EBITDA",                            formula:"Dívida Financeira Líquida / EBITDA" },
  { grupo:"Actividade",    label:"Rotação do Activo",                      formula:"Volume de Negócios / Total Activo" },
  { grupo:"Actividade",    label:"PMR — Prazo Médio de Recebimento",       formula:"(Clientes / Vendas) × 365" },
  { grupo:"Actividade",    label:"PMP — Prazo Médio de Pagamento",         formula:"(Fornecedores / Compras) × 365" },
  { grupo:"Actividade",    label:"PMI — Prazo Médio de Inventário",        formula:"(Existências / CMV) × 365" },
];

const MAPA_GRUPOS = [
  {
    id:"ii", titulo:"Modelo 1 — Imposto Industrial",
    desc:"Declaração Modelo 1 para liquidação do Imposto Industrial (taxa 30%; 35% para petróleo, gás e minérios).",
  },
  {
    id:"iva", titulo:"Declaração Periódica de IVA",
    desc:"Resumo mensal de IVA liquidado e dedutível; saldo a entregar ao Estado ou crédito a reportar.",
  },
  {
    id:"irt", titulo:"Mapa Recapitulativo — IRT",
    desc:"Quadro de remunerações, retenções na fonte de IRT e INSS por trabalhador/categoria.",
    cols:["Cat.","Base Trib.","IRT Retido","INSS Trab.","INSS Patr.","Líq. Pago"],
  },
  {
    id:"sel", titulo:"Imposto de Selo",
    desc:"Apuramento do Imposto de Selo sobre operações sujeitas.",
    rows:[
      { label:"Contratos e documentos" },{ label:"Garantias e fianças" },
      { label:"Operações de crédito" },  { label:"Letras e livranças" },
      { label:"Outros factos sujeitos" },{ label:"TOTAL IMPOSTO DE SELO", bold:true },
    ],
  },
];

// ── Generic helpers ────────────────────────────────────────────────────────────
function SectionCard({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className={`px-4 py-3 border-b border-gray-100 ${accent ?? "bg-gray-50"}`}>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ── Financial statement helpers ────────────────────────────────────────────────
function fmtFS(v: number, neg = false): string {
  if (v === 0) return "—";
  const abs = Math.abs(v);
  const s = abs.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (v < 0 || neg) ? `(${s})` : s;
}

function DocShell({ docTitulo, docSubtitulo, ano, children }: {
  docTitulo: string; docSubtitulo: string; ano: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6 print-break-before">
      <div className="text-center px-6 pt-4 pb-2 border-b border-gray-300">
        <p className="text-[13px] font-bold text-gray-900 uppercase tracking-widest leading-tight">{DEMO_COMPANY.nome}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{DEMO_COMPANY.nifFormatado} · {DEMO_COMPANY.sede} · Capital Social: {DEMO_COMPANY.capitalSocialFmt}</p>
      </div>
      <div className="flex items-end justify-between px-6 py-2 border-b border-gray-300">
        <div>
          <p className="text-[13px] font-bold text-gray-900">{docTitulo}</p>
          <p className="text-[10px] text-gray-500">Moeda: Kwanzas (AOA)</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-700 font-semibold">Em 31 de Dezembro de {ano}</p>
          <p className="text-[10px] text-gray-500">{docSubtitulo}</p>
        </div>
      </div>
      {children}
      <div style={{ borderTop: "3px solid #1a2744" }} className="px-6 py-4">
        <div className="grid grid-cols-3 gap-8 mb-4">
          {[
            { label:"O Contabilista Certificado",             nome: DEMO_COMPANY.contabilista, cedula: DEMO_COMPANY.contabCedula },
            { label:"O Presidente do Conselho de Administração", nome: DEMO_COMPANY.presidente, cedula: "" },
            { label:"O Administrador Financeiro",             nome: DEMO_COMPANY.adminFinanceiro, cedula: "" },
          ].map(sig => (
            <div key={sig.label}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-8" style={{ color:"#1a2744" }}>{sig.label}:</p>
              <div className="border-b mb-1" style={{ borderColor:"#1a2744" }} />
              <p className="text-[10px] text-gray-700 font-medium">{sig.nome}</p>
              {sig.cedula && <p className="text-[9px] text-gray-400">{sig.cedula}</p>}
            </div>
          ))}
        </div>
        <p className="text-center text-[9px] text-gray-400">
          Luanda, ___ de __________________ de {ano} &nbsp;·&nbsp; EduContas ERP &nbsp;·&nbsp;
          PGCA Angola — Decreto n.º 82/01 &nbsp;·&nbsp; Lei n.º 22/11 de 17 de Junho
        </p>
      </div>
    </div>
  );
}

function FSTableRow({ r, ano }: { r: FSRow; ano: string }) {
  if (r.tipo === "spacer") return <tr><td colSpan={4} className="py-px" /></tr>;
  const anoN1 = String(Number(ano) - 1);
  const isTotal      = r.tipo === "total";
  const isSubtotal   = r.tipo === "subtotal";
  const isTitle      = r.tipo === "title";
  const isValidation = r.tipo === "validation";

  const rowBg = isTotal      ? "bg-[#1a2744]"
              : isSubtotal   ? "bg-gray-100"
              : isTitle      ? "bg-gray-50"
              : isValidation ? "bg-emerald-50"
              : "hover:bg-gray-50/60";

  const descCls = isTotal      ? "font-bold text-white text-[11px]"
                : isSubtotal   ? "font-semibold text-gray-800 text-[11px]"
                : isTitle      ? "font-semibold text-gray-700 text-[11px]"
                : isValidation ? "font-semibold text-emerald-700 text-[11px]"
                : `text-gray-700 text-[11px] ${r.tipo === "indent" ? "pl-8" : ""}`;

  const valCls = isTotal      ? "text-white font-bold"
               : isSubtotal   ? "text-gray-800 font-semibold"
               : isValidation ? "text-emerald-700 font-semibold"
               : "text-gray-800";

  return (
    <tr className={`text-[11px] leading-none ${rowBg} transition-colors`}>
      <td className={`px-3 py-[3px] ${descCls}`}>{r.desc}</td>
      <td className={`px-2 py-[3px] text-center w-10 text-[10px] ${isTotal ? "text-white/60" : "text-gray-400"}`}>{r.nota ?? ""}</td>
      <td className={`px-3 py-[3px] text-right w-36 tabular-nums ${valCls}`}>{!isTitle ? fmtFS(r.n, r.neg) : ""}</td>
      <td className={`px-3 py-[3px] text-right w-36 tabular-nums ${isTotal ? "text-white/70 font-bold" : "text-gray-400"}`}>{!isTitle ? fmtFS(r.n1, r.neg) : ""}</td>
    </tr>
  );
}

function SectionRow({ label, ano }: { label: string; ano: string }) {
  const anoN1 = String(Number(ano) - 1);
  return (
    <tr style={{ backgroundColor:"#1a2744" }} className="text-white">
      <td className="px-3 py-1.5 font-bold text-[11px] uppercase tracking-wider">{label}</td>
      <td className="px-2 py-1.5 text-center text-[10px] text-white/60">Notas</td>
      <td className="px-3 py-1.5 text-right text-[10px] font-semibold text-white/90">31/12/{ano}</td>
      <td className="px-3 py-1.5 text-right text-[10px] font-semibold text-white/60">31/12/{anoN1}</td>
    </tr>
  );
}

function FSTable({ rows, ano, singleSection, sectionLabel }: {
  rows: FSRow[]; ano: string; singleSection?: boolean; sectionLabel?: string;
}) {
  const anoN1 = String(Number(ano) - 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <tbody>
          {singleSection && sectionLabel && <SectionRow label={sectionLabel} ano={ano} />}
          {rows.map((r, i) => <FSTableRow key={i} r={r} ano={ano} />)}
        </tbody>
      </table>
    </div>
  );
}

// ── DEMONSTRAÇÕES FINANCEIRAS TAB ──────────────────────────────────────────────
function DemonstracoesFin({ ano }: { ano: string }) {
  const [stmt, setStmt] = useState<"balanco"|"dr_nat"|"dr_fun"|"dfc_dir"|"dfc_ind"|"dacp">("balanco");
  const ds   = DATASETS[ano] ?? DATASETS["2025"];
  const cur  = ds.cur;
  const pri  = ds.pri;

  const balanco    = useMemo(() => buildBalanco(cur, pri), [cur, pri]);
  const drNat      = useMemo(() => buildDRNatureza(cur, pri), [cur, pri]);
  const drFun      = useMemo(() => buildDRFuncoes(cur, pri), [cur, pri]);
  const dfcDir     = useMemo(() => buildDFCDirecto(cur, pri), [cur, pri]);
  const dfcInd     = useMemo(() => buildDFCIndirecto(cur, pri), [cur, pri]);
  const dacp       = useMemo(() => buildDACPRows(cur, pri) as unknown as FSRow[], [cur, pri]);

  const STMTS = [
    { id:"balanco",  label:"Balanço" },
    { id:"dr_nat",   label:"DR Natureza" },
    { id:"dr_fun",   label:"DR Funções" },
    { id:"dfc_dir",  label:"DFC Directo" },
    { id:"dfc_ind",  label:"DFC Indirecto" },
    { id:"dacp",     label:"DACP" },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="no-print flex gap-1.5 flex-wrap">
        {STMTS.map(s => (
          <button key={s.id} onClick={() => setStmt(s.id as typeof stmt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              stmt === s.id ? "text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`} style={stmt === s.id ? { backgroundColor:"#1a2744" } : {}}>
            {s.label}
          </button>
        ))}
      </div>

      {stmt === "balanco" && (
        <DocShell docTitulo="Balanço" docSubtitulo="PGCA Angola — Decreto n.º 82/01" ano={ano}>
          <FSTable rows={[]} ano={ano} />
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                <SectionRow label="Activo" ano={ano} />
                {balanco.activo.map((r, i) => <FSTableRow key={`a-${i}`} r={r} ano={ano} />)}
                <tr><td colSpan={4} className="py-px" /></tr>
                <SectionRow label="Capital Próprio e Passivo" ano={ano} />
                {balanco.capitalPassivo.map((r, i) => <FSTableRow key={`cp-${i}`} r={r} ano={ano} />)}
              </tbody>
            </table>
          </div>
        </DocShell>
      )}
      {stmt === "dr_nat" && (
        <DocShell docTitulo="Demonstração de Resultados por Natureza" docSubtitulo="PGCA Angola — Decreto n.º 82/01" ano={ano}>
          <FSTable rows={drNat} ano={ano} />
        </DocShell>
      )}
      {stmt === "dr_fun" && (
        <DocShell docTitulo="Demonstração de Resultados por Funções" docSubtitulo="PGCA Angola — Decreto n.º 82/01" ano={ano}>
          <FSTable rows={drFun} ano={ano} />
        </DocShell>
      )}
      {stmt === "dfc_dir" && (
        <DocShell docTitulo="Demonstração de Fluxos de Caixa — Método Directo" docSubtitulo="PGCA Angola — Decreto n.º 82/01" ano={ano}>
          <FSTable rows={dfcDir} ano={ano} />
        </DocShell>
      )}
      {stmt === "dfc_ind" && (
        <DocShell docTitulo="Demonstração de Fluxos de Caixa — Método Indirecto" docSubtitulo="PGCA Angola — Decreto n.º 82/01" ano={ano}>
          <FSTable rows={dfcInd} ano={ano} />
        </DocShell>
      )}
      {stmt === "dacp" && (
        <DocShell docTitulo="Demonstração das Alterações nos Capitais Próprios" docSubtitulo="PGCA Angola — Decreto n.º 82/01" ano={ano}>
          <FSTable rows={dacp} ano={ano} />
        </DocShell>
      )}
    </div>
  );
}

// ── NOTAS ÀS DEMONSTRAÇÕES FINANCEIRAS ───────────────────────────────────────
// Read-only preview: Demo mode → auto-text from accounting data;
// Dados Reais → text saved in Notas às DF page (shared localStorage).
function NotasDF({ ano, modoDemo }: { ano: string; modoDemo: boolean }) {
  const { textos } = useNotasTextos(ano);
  const [openNote, setOpenNote] = useState<Set<string>>(new Set());
  const [catFilter, setCatFilter] = useState<NotaCat | "all">("all");

  const toggle = (id: string) => setOpenNote(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // Demo auto-text built from demo accounting data
  const demoTextos = useMemo(() => {
    const empty: Record<string, string> = {};
    if (!modoDemo) return empty;
    const ds  = DATASETS[ano] ?? DATASETS["2025"];
    const c   = calcApuramento(ds.cur);
    const exist = Math.max(0, sum(ds.cur,"31","32","33","34","35","36") - sum(ds.cur,"28.3","28.4","28.5"));
    const clie  = sum(ds.cur,"21");
    const disp  = sum(ds.cur,"11","12","13","14");
    const cp    = sum(ds.cur,"51") + sum(ds.cur,"52","55","56") + sum(ds.cur,"57","59") + c.rle;
    const div   = sum(ds.cur,"23.1") + sum(ds.cur,"23.2");
    const forn  = sum(ds.cur,"22");
    const imobCor  = sum(ds.cur,"43","44") - sum(ds.cur,"48.3","48.4","48.5","48.6");
    const imobInco = sum(ds.cur,"42") - sum(ds.cur,"48.2");
    const fmt = (v: number) => v.toLocaleString("pt-PT");
    return {
      "01": `${DEMO_COMPANY.nome} é uma ${DEMO_COMPANY.tipoSociedade.toLowerCase()}, constituída ao abrigo da ${DEMO_COMPANY.lgsc}, com sede em ${DEMO_COMPANY.sede}. A empresa exerce a sua actividade no sector ${DEMO_COMPANY.cae}. As presentes demonstrações financeiras referem-se ao exercício findo em 31 de Dezembro de ${ano} e foram elaboradas em conformidade com o ${DEMO_COMPANY.pgca}.`,
      "02": `As demonstrações financeiras foram preparadas em conformidade com o PGCA, aprovado pelo Decreto n.º 82/01 de 26 de Outubro, tendo como pressuposto a continuidade das operações. A moeda de apresentação é o Kwanza Angolano (AOA).`,
      "03": `3.1 Imobilizações corpóreas: registadas ao custo de aquisição deduzido das amortizações acumuladas, pelo método das quotas constantes.\n3.2 Existências: valorizadas ao custo de aquisição pelo método FIFO.\n3.3 Clientes: reconhecidos pelo valor nominal, líquidos de provisões para créditos duvidosos.\n3.4 Proveitos: reconhecidos quando os riscos e vantagens da propriedade são transferidos.`,
      "04": `As imobilizações corpóreas e incorpóreas encontram-se registadas pelo custo histórico de aquisição, deduzido das amortizações acumuladas. O valor líquido contabilístico totaliza AOA ${fmt(imobCor + imobInco)} em 31 de Dezembro de ${ano}.`,
      "07": `As existências são valorizadas pelo método FIFO. O saldo em 31 de Dezembro de ${ano} totaliza AOA ${fmt(exist)}.`,
      "08": `O saldo de clientes inclui créditos sobre clientes nacionais, líquidos de provisões para cobranças duvidosas. O valor totaliza AOA ${fmt(clie)} em 31 de Dezembro de ${ano}.`,
      "11": `As disponibilidades incluem caixa e depósitos bancários à ordem. O saldo em 31 de Dezembro de ${ano} totaliza AOA ${fmt(disp)}. Não existem restrições materialmente relevantes.`,
      "12": `O capital social encontra-se integralmente realizado. O resultado líquido do exercício foi de AOA ${fmt(c.rle)}. O total do capital próprio em 31 de Dezembro de ${ano} totaliza AOA ${fmt(cp)}.`,
      "15": `O saldo de fornecedores representa obrigações de curto prazo decorrentes de compras de bens e serviços. O valor totaliza AOA ${fmt(forn)} em 31 de Dezembro de ${ano}.`,
      "16": `Os financiamentos obtidos incluem empréstimos bancários de médio e longo prazo. O saldo em 31 de Dezembro de ${ano} totaliza AOA ${fmt(div)}. As condições de remuneração são indexadas à taxa de referência do BNA.`,
      "35": `O Imposto Industrial foi calculado sobre o lucro tributável à taxa de 30% (taxa geral). Os pagamentos por conta são efectuados em Abril (70%) e Agosto (30%) do exercício seguinte. O INSS é calculado à taxa patronal de 8% e do trabalhador de 3%. A empresa considera-se em dia com as suas obrigações fiscais perante a AGT.`,
      "38": `Entre a data do balanço (31 de Dezembro de ${ano}) e a data de aprovação das demonstrações financeiras não ocorreram factos relevantes que requeiram ajustamento ou divulgação adicional.`,
      "37": `As transacções com partes relacionadas são efectuadas em condições de mercado (arm's length). Não existem operações materialmente relevantes que devam ser divulgadas separadamente.`,
      "18": `Em 31 de Dezembro de ${ano} não existem garantias prestadas a terceiros, avales ou compromissos fora do balanço com impacto material nas demonstrações financeiras, excepto os decorrentes do normal curso do negócio.`,
    };
  }, [ano, modoDemo]);

  // Resolve display text: demo auto-text > localStorage text > empty
  const getTexto = (num: string): string =>
    modoDemo ? (demoTextos[num] ?? "") : (textos[num] ?? "");

  const filled = NOTAS.filter(n => getTexto(n.num).trim().length > 0);
  const filtered = useMemo(() =>
    catFilter === "all" ? NOTAS : NOTAS.filter(n => n.cat === catFilter),
  [catFilter]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className={`bg-white border rounded-xl p-4 ${modoDemo ? "border-amber-200" : "border-gray-200"}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Notas às Demonstrações Financeiras</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {DEMO_COMPANY.nome} · Exercício {ano} · PGCA Angola — 49 notas · pré-visualização de impressão
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
              modoDemo
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : filled.length === 49
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-gray-50 text-gray-600 border-gray-200"
            }`}>
              {modoDemo ? "Texto Demo" : `${filled.length}/49 preenchidas`}
            </span>
            {!modoDemo && (
              <a href="/notas"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                Editar em Notas às DF →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Mode explanation */}
      {modoDemo ? (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong>Modo Demo</strong> — texto gerado automaticamente a partir dos dados de demonstração.
            Para apresentar as suas próprias notas no relatório, aceda a{" "}
            <a href="/notas" className="underline font-semibold">Notas às DF</a>{" "}
            e preencha os campos, depois mude para <strong>Dados Reais</strong>.
          </span>
        </div>
      ) : filled.length < 49 ? (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {49 - filled.length} nota{49 - filled.length !== 1 ? "s" : ""} ainda não preenchida{49 - filled.length !== 1 ? "s" : ""}.{" "}
            Aceda a <a href="/notas" className="underline font-semibold">Notas às DF</a> para completar.
            As notas em branco aparecem com a descrição PGCA no relatório impresso.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800">
          <svg className="w-4 h-4 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Todas as 49 notas preenchidas — relatório completo.</span>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-1.5">
        {(["all","politicas","ativo","cp","dr","dfc","outras"] as const).map(cat => {
          const c = cat === "all" ? null : CAT_COLORS[cat];
          return (
            <button key={cat} onClick={() => setCatFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                catFilter === cat
                  ? cat === "all" ? "bg-gray-800 text-white border-gray-800" : `${c!.bg} ${c!.text} ${c!.border}`
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}>
              {cat === "all" ? "Todas (49)" : CAT_LABELS[cat as NotaCat]}
            </button>
          );
        })}
      </div>

      {/* Note list — read-only */}
      {filtered.map(nota => {
        const isOpen = openNote.has(nota.num);
        const texto  = getTexto(nota.num).trim();
        const hasTxt = texto.length > 0;
        const isAuto = modoDemo && !!(demoTextos[nota.num]);
        const c = CAT_COLORS[nota.cat];
        return (
          <div key={nota.num} className={`border rounded-xl overflow-hidden transition-all ${isOpen ? `border-2 ${c.border}` : "border-gray-200 bg-white"}`}>
            <button onClick={() => toggle(nota.num)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isOpen ? c.bg : "bg-white hover:bg-gray-50"}`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                hasTxt ? `${c.bg} ${c.text} border-2 ${c.border}` : "bg-gray-100 text-gray-400"
              }`}>{nota.num}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold text-sm ${isOpen ? c.text : "text-gray-800"}`}>{nota.titulo}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                    {CAT_LABELS[nota.cat]}
                  </span>
                  {isAuto && <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Demo</span>}
                  {!modoDemo && hasTxt && <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">✓ Preenchida</span>}
                  {!hasTxt && !isOpen && <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full">Não preenchida</span>}
                </div>
                {!isOpen && <p className="text-xs text-gray-400 mt-0.5 truncate">{hasTxt ? texto : nota.desc}</p>}
              </div>
              <svg className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? `rotate-180 ${c.text}` : "text-gray-400"}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-2 bg-white border-t border-gray-100 space-y-2">
                {hasTxt ? (
                  <div className={`p-3 rounded-lg border text-xs leading-relaxed whitespace-pre-line ${
                    isAuto ? "bg-amber-50 border-amber-100 text-amber-900" : "bg-gray-50 border-gray-100 text-gray-800"
                  }`}>
                    {isAuto && <p className="text-[10px] font-bold uppercase text-amber-500 tracking-wider mb-1">Texto Demo</p>}
                    {texto}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-gray-50 border border-dashed border-gray-200">
                    <p className="text-xs text-gray-500 italic leading-relaxed">{nota.desc}</p>
                    {nota.contas && <p className="text-[10px] text-gray-400 font-mono mt-1">Contas PGCA: {nota.contas}</p>}
                    <a href="/notas" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Preencher em Notas às DF →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── RELATÓRIO DE GESTÃO TAB ────────────────────────────────────────────────────
function RelatorioGestao({ ano, modoDemo = true }: { ano: string; modoDemo?: boolean }) {
  const [open, setOpen]   = useState<Set<string>>(new Set(["actividade"]));
  const [texts, setTexts] = useState<Record<string, string>>({});
  const toggle = (id: string) => setOpen(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const ds = DATASETS[ano] ?? DATASETS["2025"];
  const c  = useMemo(() => calcApuramento(ds.cur), [ds]);

  const existencias    = Math.max(0, sum(ds.cur,"31","32","33","34","35","36") - sum(ds.cur,"28.3","28.4","28.5"));
  const disponibilidades = sum(ds.cur,"11","12","13","14");
  const divCpLiq       = Math.max(0, sum(ds.cur,"21","26") + sum(ds.cur,"24.1") - sum(ds.cur,"28.1","28.2"));
  const activoCorrente = existencias + divCpLiq + sum(ds.cur,"15") + disponibilidades;
  const activoNCor     = (sum(ds.cur,"43","44") - sum(ds.cur,"48.3","48.4","48.5","48.6")) + (sum(ds.cur,"42") - sum(ds.cur,"48.2")) + sum(ds.cur,"41","25");
  const totalActivo    = activoNCor + activoCorrente;
  const totalCP        = sum(ds.cur,"51") + sum(ds.cur,"52","55","56") + sum(ds.cur,"57","59") + c.rle;
  const totalPassCp    = sum(ds.cur,"22") + sum(ds.cur,"23.1") + sum(ds.cur,"24.2","24.3","24.4","24.5") + sum(ds.cur,"27");
  const totalPass      = totalPassCp + sum(ds.cur,"23.2") + sum(ds.cur,"29");
  const dividaFin      = sum(ds.cur,"23.1") + sum(ds.cur,"23.2");
  const clientes       = sum(ds.cur,"21");
  const fornecedores   = sum(ds.cur,"22");
  const ebitda         = c.resultadoOp + c.amortProv;

  const fmtM = (v: number) => { if (!v) return "—"; const m = v/1e6; return m >= 1000 ? `${(m/1000).toFixed(1)} Bi` : `${m.toFixed(0)} M`; };
  const pct  = (n: number, d: number) => d === 0 ? "—" : `${((n/d)*100).toFixed(1)}%`;
  const times= (n: number, d: number, dec = 2) => d === 0 ? "—" : (n/d).toFixed(dec);
  const dias = (n: number, d: number) => d === 0 ? "—" : `${Math.round((n/d)*365)} dias`;

  const kpiMap: Record<string, string> = {
    "Rentabilidade do Activo (ROA)":          pct(c.rle, totalActivo),
    "Rentabilidade do Capital Próprio (ROE)": pct(c.rle, totalCP),
    "Margem Líquida":                         pct(c.rle, c.vendas),
    "Margem EBITDA":                          pct(ebitda, c.vendas),
    "Liquidez Geral":                         times(activoCorrente, totalPassCp),
    "Liquidez Reduzida":                      times(activoCorrente - existencias, totalPassCp),
    "Liquidez Imediata":                      times(disponibilidades, totalPassCp),
    "Autonomia Financeira":                   pct(totalCP, totalActivo),
    "Solvabilidade":                          times(totalCP, totalPass),
    "Debt/EBITDA":                            ebitda > 0 ? `${times(dividaFin, ebitda)}x` : "—",
    "Rotação do Activo":                      times(c.vendas, totalActivo),
    "PMR — Prazo Médio de Recebimento":       dias(clientes, c.vendas),
    "PMP — Prazo Médio de Pagamento":         dias(fornecedores, c.cmv),
    "PMI — Prazo Médio de Inventário":        dias(existencias, c.cmv),
  };

  // Financial context sent to AI
  const aiDados = {
    "Empresa": DEMO_COMPANY.nome,
    "NIF": DEMO_COMPANY.nif,
    "Sector": DEMO_COMPANY.cae,
    "Volume de Negócios (AOA)": c.vendas.toLocaleString("pt-PT"),
    "Resultado Líquido (AOA)":  c.rle.toLocaleString("pt-PT"),
    "EBITDA (AOA)":             ebitda.toLocaleString("pt-PT"),
    "Total do Activo (AOA)":    totalActivo.toLocaleString("pt-PT"),
    "Capital Próprio (AOA)":    totalCP.toLocaleString("pt-PT"),
    "Margem Líquida":           pct(c.rle, c.vendas),
    "ROE":                      pct(c.rle, totalCP),
    "ROA":                      pct(c.rle, totalActivo),
    "Liquidez Geral":           times(activoCorrente, totalPassCp),
    "Autonomia Financeira":     pct(totalCP, totalActivo),
    "Dívida Financeira (AOA)":  dividaFin.toLocaleString("pt-PT"),
    vendas: c.vendas, rle: c.rle, totalActivo, totalCP, ebitda,
    margem: c.vendas > 0 ? c.rle/c.vendas : 0,
    roe:    totalCP > 0 ? c.rle/totalCP : 0,
    roa:    totalActivo > 0 ? c.rle/totalActivo : 0,
    liquidezGeral: totalPassCp > 0 ? activoCorrente/totalPassCp : 0,
  };

  return (
    <div className="space-y-4">
      {/* Company identity card */}
      <div className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${modoDemo ? "border-amber-200" : "border-blue-200"}`}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
          style={{ backgroundColor:"#1a2744" }}>
          ASE
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">{DEMO_COMPANY.nome}</p>
            {modoDemo
              ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200">Demo</span>
              : <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">Dados Reais</span>
            }
          </div>
          <p className="text-xs text-gray-500">{DEMO_COMPANY.nifFormatado} · {DEMO_COMPANY.sede}</p>
          <p className="text-xs text-gray-400">{DEMO_COMPANY.cae} · Fundação: {DEMO_COMPANY.fundacao}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-500">Capital Social</p>
          <p className="text-sm font-bold text-gray-900">{DEMO_COMPANY.capitalSocialFmt}</p>
          <p className="text-xs text-gray-400">{DEMO_COMPANY.tipoSociedade}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Volume de Negócios", valor: fmtM(c.vendas),    color:"text-blue-700" },
          { label:"Resultado Líquido",  valor: fmtM(c.rle),       color: c.rle >= 0 ? "text-emerald-700" : "text-red-600" },
          { label:"Total do Activo",    valor: fmtM(totalActivo), color:"text-gray-900" },
          { label:"Capital Próprio",    valor: fmtM(totalCP),     color:"text-purple-700" },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.valor}</p>
            <p className="text-[10px] text-gray-400">AOA (Kz) · {ano}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Indicadores de Desempenho Financeiro">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          {Object.entries(KPIS.reduce((acc, kpi) => { (acc[kpi.grupo] = acc[kpi.grupo] ?? []).push(kpi); return acc; }, {} as Record<string, KPIItem[]>))
            .map(([grupo, items]) => (
              <div key={grupo} className="mb-3">
                <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-2">{grupo}</p>
                {items.map(k => (
                  <div key={k.label} className="flex items-center justify-between py-1 border-b border-gray-50 group">
                    <div>
                      <span className="text-xs text-gray-700">{k.label}</span>
                      <span className="ml-2 text-[10px] text-gray-400 hidden group-hover:inline">{k.formula}</span>
                    </div>
                    <span className={`text-xs font-semibold ml-4 ${kpiMap[k.label] && kpiMap[k.label] !== "—" ? "text-gray-800" : "text-gray-400"}`}>
                      {kpiMap[k.label] ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </SectionCard>

      {/* AI hint */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200">
        <svg className="w-4 h-4 text-purple-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L9.1 9.1 2 12l7.1 2.9L12 22l2.9-7.1L22 12l-7.1-2.9z" />
        </svg>
        <p className="text-xs text-purple-700">
          <strong>IA disponível</strong> — cada secção tem um botão <em>"Sugerir com IA"</em> que gera narrativa profissional
          com referências ao BNA, INE Angola, AGT, MINFIN/OGE 2025 e OCPCA.
        </p>
      </div>

      {/* Narrative sections */}
      <div className="space-y-2">
        {RG_SECOES.map(sec => {
          const isOpen = open.has(sec.id);
          return (
            <div key={sec.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => toggle(sec.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                <span className="text-sm font-semibold text-gray-800">{sec.titulo}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed italic">{sec.desc}</p>
                  <textarea
                    value={texts[sec.id] ?? ""}
                    onChange={e => setTexts(p => ({ ...p, [sec.id]: e.target.value }))}
                    placeholder={`Redigir secção: ${sec.titulo}...`}
                    className="w-full h-28 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
                  />
                  <AiSuggestionCard
                    id={`gestao-${sec.id}`}
                    tipo="gestao"
                    seccao={sec.titulo}
                    dados={aiDados}
                    ano={ano}
                    onApply={t => setTexts(p => ({ ...p, [sec.id]: t }))}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PARECER / CLC TAB ─────────────────────────────────────────────────────────
function ParecerCLC({ ano }: { ano: string }) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Nota legal:</strong> A Certificação Legal de Contas (CLC) deve ser emitida por Revisor Oficial de Contas (ROC) ou Auditor registado junto da AGT e da OCPCA. Este módulo serve de suporte à preparação; o documento final deve ser assinado pelo ROC responsável.
      </div>
      <SectionCard title="Parecer do Fiscal Único / Conselho Fiscal">
        <div className="space-y-3 text-sm text-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Nome do Fiscal Único</label>
              <input type="text" placeholder="Nome completo" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Número de ROC / Cédula</label>
              <input type="text" placeholder="ROC nº ..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Data de Emissão</label>
              <input type="date" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Opinião</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option>Sem reservas (opinião limpa)</option>
                <option>Com reservas — ênfase</option>
                <option>Com reservas — limitação de âmbito</option>
                <option>Com reservas — desacordo</option>
                <option>Escusa de opinião</option>
                <option>Opinião adversa</option>
              </select></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Texto do Parecer</label>
            <textarea className="w-full h-48 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
              defaultValue={`PARECER DO FISCAL ÚNICO\n\nAos Sócios / Accionistas da [EMPRESA], NIF [NIF]:\n\nExaminei as demonstrações financeiras da [EMPRESA] referentes ao exercício findo em 31 de Dezembro de ${ano}, as quais compreendem o Balanço, a Demonstração dos Resultados por Natureza, a Demonstração dos Fluxos de Caixa, a Demonstração das Alterações no Capital Próprio e as respectivas Notas às Demonstrações Financeiras.\n\nOpinião: Na minha opinião, as demonstrações financeiras referidas apresentam de forma verdadeira e apropriada, em todos os aspectos materialmente relevantes, a posição financeira da [EMPRESA] em 31 de Dezembro de ${ano}, o resultado das suas operações e os fluxos de caixa no exercício findo nessa data, em conformidade com o PGCA.\n\nLuanda, [data]\n[Assinatura]\n[Nome e Cédula]`} />
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Certificação Legal de Contas (CLC)">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">ROC Responsável</label>
              <input type="text" placeholder="Nome do ROC" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Sociedade de ROC</label>
              <input type="text" placeholder="Firma da SROC" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Nº Registo OCPCA</label>
              <input type="text" placeholder="OCPCA nº ..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Assuntos de Ênfase / Reservas</label>
            <textarea placeholder="Descrever reservas, ênfases ou outros parágrafos relevantes..." className="w-full h-24 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ── INDICADORES FISCAIS TAB ───────────────────────────────────────────────────
function IndicadoresFiscais({ ano }: { ano: string }) {
  const anoN1 = String(Number(ano) - 1);
  const ds    = DATASETS[ano] ?? DATASETS["2025"];
  const m1    = useMemo(() => buildModelo1(ds.cur, ds.pri), [ds]);
  const c     = useMemo(() => calcApuramento(ds.cur), [ds]);

  const findM1 = (label: string) => m1.find(r => r.label.startsWith(label))?.value ?? 0;
  const lucroTrib    = findM1("MATÉRIA COLECT");
  const impostoApur  = findM1("IMPOSTO INDUSTRIAL APURADO");
  const pagContaVal  = Math.abs(findM1("TOTAL PAGAMENTOS"));
  const impostoAPagar = findM1("IMPOSTO INDUSTRIAL A PAGAR");
  const inssPatronal  = sum(ds.cur,"72.2");
  const inssPatronalP = sum(ds.pri,"72.2");
  const inssTrab     = Math.round(sum(ds.cur,"72.1") * 0.03 / 0.97);
  const inssTrabP    = Math.round(sum(ds.pri,"72.1") * 0.03 / 0.97);

  const fmtV   = (v: number) => v === 0 ? "—" : Math.abs(v).toLocaleString("pt-PT");
  const pctFmt = (v: number) => v === 0 ? "—" : `${(v * 100).toFixed(1)}%`;

  const IRT_TABELA = [
    { escalao:"Até 70.000 AOA",      taxa:"0%",  parcela:"—" },
    { escalao:"70.001 – 100.000",    taxa:"10%", parcela:"7.000" },
    { escalao:"100.001 – 150.000",   taxa:"13%", parcela:"10.000" },
    { escalao:"150.001 – 200.000",   taxa:"16%", parcela:"14.500" },
    { escalao:"200.001 – 300.000",   taxa:"18%", parcela:"18.500" },
    { escalao:"300.001 – 500.000",   taxa:"19%", parcela:"21.500" },
    { escalao:"500.001 – 1.000.000", taxa:"20%", parcela:"26.500" },
    { escalao:"Acima de 1.000.000",  taxa:"25%", parcela:"76.500" },
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="Imposto Industrial — Posição do Exercício" accent="bg-blue-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { label:"Lucro Tributável",  val: fmtV(lucroTrib),     color:"text-blue-700" },
            { label:"Imposto Apurado",   val: fmtV(impostoApur),   color:"text-orange-600" },
            { label:"Pag. por Conta",    val: fmtV(pagContaVal),   color:"text-green-700" },
            { label:"Imposto a Pagar",   val: fmtV(impostoAPagar), color:"text-red-600" },
          ].map(k => (
            <div key={k.label} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className={`text-sm font-bold mt-1 font-mono ${k.color}`}>{k.val}</p>
              <p className="text-[10px] text-gray-400">AOA · {ano}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Descrição — Modelo 1</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700 w-40">N ({ano})</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700 w-40">N-1 ({anoN1})</th>
              </tr>
            </thead>
            <tbody>
              {m1.map((r, i) => r.sep ? (
                <tr key={i}><td colSpan={3} className="py-1 border-t-2 border-gray-300" /></tr>
              ) : r.label === "" ? null : (
                <tr key={i} className={r.bold ? "bg-gray-50 font-semibold" : "hover:bg-gray-50"}>
                  <td className={`px-3 py-1.5 border-b border-gray-100 ${r.indent ? "pl-7 text-gray-500" : ""}`}>{r.label}</td>
                  <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-800">{r.label.startsWith("Taxa") ? pctFmt(r.value) : fmtV(r.value)}</td>
                  <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-500">{r.label.startsWith("Taxa") ? pctFmt(r.valueN1) : fmtV(r.valueN1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Tabela de IRT — Escalões em vigor (Lei n.º 18/14)" accent="bg-amber-50">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-amber-100">
              <th className="text-left px-3 py-2 font-semibold text-amber-800">Escalão de Rendimento (AOA/mês)</th>
              <th className="text-right px-3 py-2 font-semibold text-amber-800">Taxa Marginal</th>
              <th className="text-right px-3 py-2 font-semibold text-amber-800">Parcela a Abater (Kz)</th>
            </tr></thead>
            <tbody>
              {IRT_TABELA.map((r, i) => (
                <tr key={i} className="hover:bg-amber-50">
                  <td className="px-3 py-1.5 border-b border-amber-100">{r.escalao}</td>
                  <td className="text-right px-3 py-1.5 border-b border-amber-100 font-semibold text-amber-700">{r.taxa}</td>
                  <td className="text-right px-3 py-1.5 border-b border-amber-100 text-gray-600">{r.parcela}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="INSS — Contribuições Sociais (Lei n.º 7/04)" accent="bg-green-50">
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[{ cat:"Contribuição patronal",taxa:"8%"},{ cat:"Contribuição trabalhador",taxa:"3%"},{ cat:"Taxa total INSS",taxa:"11%"}].map(r => (
            <div key={r.cat} className="bg-white border border-green-200 rounded-lg p-3">
              <p className="text-xs text-gray-500">{r.cat}</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{r.taxa}</p>
            </div>
          ))}
        </div>
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold">Rubrica INSS</th>
            <th className="text-right px-3 py-2 font-semibold w-32">N ({ano})</th>
            <th className="text-right px-3 py-2 font-semibold w-32">N-1 ({anoN1})</th>
          </tr></thead>
          <tbody>
            {[
              { label:"Contribuição patronal (8%)",n:inssPatronal,n1:inssPatronalP },
              { label:"Contribuição trabalhador (3%)",n:inssTrab,n1:inssTrabP },
              { label:"TOTAL INSS",n:inssPatronal+inssTrab,n1:inssPatronalP+inssTrabP,bold:true },
            ].map((r, i) => (
              <tr key={i} className={r.bold ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}>
                <td className="px-3 py-1.5 border-b border-gray-100">{r.label}</td>
                <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-800">{fmtV(r.n)}</td>
                <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-500">{fmtV(r.n1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <SectionCard title="IVA — Posição Anual por Período" accent="bg-purple-50">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-purple-100">
              <th className="text-left px-3 py-2 font-semibold text-purple-800">Período</th>
              <th className="text-right px-3 py-2 font-semibold text-purple-800">IVA Liquidado</th>
              <th className="text-right px-3 py-2 font-semibold text-purple-800">IVA Dedutível</th>
              <th className="text-right px-3 py-2 font-semibold text-purple-800">IVA a Entregar</th>
              <th className="text-right px-3 py-2 font-semibold text-purple-800">Crédito a Reportar</th>
              <th className="text-center px-3 py-2 font-semibold text-purple-800">Estado</th>
            </tr></thead>
            <tbody>
              {MESES.map(m => (
                <tr key={m} className="hover:bg-purple-50">
                  <td className="px-3 py-1.5 border-b border-purple-100">{m}</td>
                  {[...Array(4)].map((_,i) => <td key={i} className="text-right px-3 py-1.5 border-b border-purple-100 text-gray-500">—</td>)}
                  <td className="text-center px-3 py-1.5 border-b border-purple-100">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">Pendente</span>
                  </td>
                </tr>
              ))}
              <tr className="bg-purple-100 font-semibold">
                <td className="px-3 py-2 text-purple-800">TOTAL ANUAL</td>
                {[...Array(4)].map((_,i) => <td key={i} className="text-right px-3 py-2 text-purple-800">—</td>)}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

// ── MAPAS FISCAIS TAB ─────────────────────────────────────────────────────────
function MapasFiscais({ ano }: { ano: string }) {
  const [activeMap, setActiveMap] = useState("ii");
  const ds  = DATASETS[ano] ?? DATASETS["2025"];
  const m1  = useMemo(() => buildModelo1(ds.cur, ds.pri), [ds]);
  const anoN1 = String(Number(ano) - 1);

  const fmtV   = (v: number) => v === 0 ? "—" : Math.abs(v).toLocaleString("pt-PT");
  const pctFmt = (v: number) => v === 0 ? "—" : `${(v * 100).toFixed(1)}%`;

  function handleXLSX() {
    const rows = m1.filter(r => !r.sep && r.label !== "").map(r => ({
      "Descrição": r.label,
      [`N (${ano}) AOA`]: r.label.startsWith("Taxa") ? pctFmt(r.value) : fmtV(r.value),
      [`N-1 (${anoN1}) AOA`]: r.label.startsWith("Taxa") ? pctFmt(r.valueN1) : fmtV(r.valueN1),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Modelo1_${ano}`.slice(0, 31));
    XLSX.writeFile(wb, `EduContas_MapaFiscal_${ano}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {MAPA_GRUPOS.map(m => (
          <button key={m.id} onClick={() => setActiveMap(m.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeMap === m.id ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}>
            {m.titulo.split("—")[0].trim()}
          </button>
        ))}
      </div>

      {MAPA_GRUPOS.filter(m => m.id === activeMap).map(m => (
        <div key={m.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">{m.titulo}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
          </div>
          <div className="p-4">
            {m.id === "ii" && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-blue-50">
                    <th className="text-left px-3 py-2 font-semibold text-blue-800">Descrição — Modelo 1 (Imposto Industrial)</th>
                    <th className="text-right px-3 py-2 font-semibold text-blue-800 w-44">N ({ano}) AOA</th>
                    <th className="text-right px-3 py-2 font-semibold text-blue-700 w-44">N-1 ({anoN1}) AOA</th>
                  </tr></thead>
                  <tbody>
                    {m1.map((r, i) => r.sep ? (
                      <tr key={i}><td colSpan={3} className="py-1 border-t-2 border-blue-200" /></tr>
                    ) : r.label === "" ? null : (
                      <tr key={i} className={r.bold ? "bg-blue-50 font-semibold" : "hover:bg-gray-50"}>
                        <td className={`px-3 py-1.5 border-b border-gray-100 ${r.indent ? "pl-7 text-gray-500" : r.bold ? "text-gray-800" : "text-gray-700"}`}>{r.label}</td>
                        <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-900">{r.label.startsWith("Taxa") ? pctFmt(r.value) : fmtV(r.value)}</td>
                        <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-500">{r.label.startsWith("Taxa") ? pctFmt(r.valueN1) : fmtV(r.valueN1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {m.id === "irt" && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-amber-50">
                    <th className="text-left px-3 py-2 font-semibold text-amber-800">Trabalhador / Categoria</th>
                    {(m.cols ?? []).map(c => <th key={c} className="text-right px-3 py-2 font-semibold text-amber-800">{c}</th>)}
                  </tr></thead>
                  <tbody>
                    {["Órgãos sociais","Técnicos superiores","Técnicos médios","Administrativos","Operacionais","TOTAL"].map((cat, i) => (
                      <tr key={cat} className={i===5 ? "bg-amber-50 font-semibold" : "hover:bg-gray-50"}>
                        <td className="px-3 py-1.5 border-b border-gray-100">{cat}</td>
                        {(m.cols ?? []).map((_, ci) => <td key={ci} className="text-right px-3 py-1.5 border-b border-gray-100 text-gray-500">—</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {m.id === "iva" && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-purple-50">
                    <th className="text-left px-3 py-2 font-semibold text-purple-800">Mês</th>
                    <th className="text-right px-3 py-2 font-semibold text-purple-800">Vendas Tributáveis</th>
                    <th className="text-right px-3 py-2 font-semibold text-purple-800">IVA Liquidado (14%)</th>
                    <th className="text-right px-3 py-2 font-semibold text-purple-800">Compras Tributáveis</th>
                    <th className="text-right px-3 py-2 font-semibold text-purple-800">IVA Dedutível</th>
                    <th className="text-right px-3 py-2 font-semibold text-purple-800">Saldo IVA</th>
                  </tr></thead>
                  <tbody>
                    {MESES.map(mes => (
                      <tr key={mes} className="hover:bg-purple-50">
                        <td className="px-3 py-1.5 border-b border-gray-100">{mes}</td>
                        {[...Array(5)].map((_,i) => <td key={i} className="text-right px-3 py-1.5 border-b border-gray-100 text-gray-500">—</td>)}
                      </tr>
                    ))}
                    <tr className="bg-purple-50 font-semibold">
                      <td className="px-3 py-2 text-purple-800">TOTAL {ano}</td>
                      {[...Array(5)].map((_,i) => <td key={i} className="text-right px-3 py-2 text-purple-800">—</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {m.id === "sel" && m.rows && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-gray-100">
                    <th className="text-left px-3 py-2 font-semibold text-gray-700">Descrição</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-700 w-36">Valor (Kz)</th>
                  </tr></thead>
                  <tbody>
                    {m.rows.map((r: any, i: number) => r.sep ? (
                      <tr key={i}><td colSpan={2} className="py-1 border-t-2 border-gray-300" /></tr>
                    ) : (
                      <tr key={i} className={r.bold ? "bg-gray-50 font-semibold" : "hover:bg-gray-50"}>
                        <td className="px-3 py-1.5 border-b border-gray-100">{r.label}</td>
                        <td className="text-right px-3 py-1.5 border-b border-gray-100 text-gray-400">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
              <button onClick={handleXLSX} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Exportar XLSX
              </button>
              <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Imprimir
              </button>
              <button onClick={() => alert("Funcionalidade de submissão eletrónica à AGT — disponível em breve.")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Submeter AGT
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── RELATÓRIO COMPLETO (Print-only / Preview) ─────────────────────────────────
function RelatorioPrintAll({ ano, show = false }: { ano: string; show?: boolean }) {
  const ds  = DATASETS[ano] ?? DATASETS["2025"];
  const cur = ds.cur;
  const pri = ds.pri;
  const c   = useMemo(() => calcApuramento(cur), [cur]);
  const { textos: notasTextos } = useNotasTextos(ano);

  const balanco    = useMemo(() => buildBalanco(cur, pri), [cur, pri]);
  const drNat      = useMemo(() => buildDRNatureza(cur, pri), [cur, pri]);
  const drFun      = useMemo(() => buildDRFuncoes(cur, pri), [cur, pri]);
  const dfcDir     = useMemo(() => buildDFCDirecto(cur, pri), [cur, pri]);
  const dfcInd     = useMemo(() => buildDFCIndirecto(cur, pri), [cur, pri]);
  const dacp       = useMemo(() => buildDACPRows(cur, pri) as unknown as FSRow[], [cur, pri]);
  const m1         = useMemo(() => buildModelo1(cur, pri), [cur, pri]);

  const existencias   = Math.max(0, sum(cur,"31","32","33","34","35","36") - sum(cur,"28.3","28.4","28.5"));
  const clientes      = sum(cur,"21");
  const disponibilidades = sum(cur,"11","12","13","14");
  const totalCP       = sum(cur,"51") + sum(cur,"52","55","56") + sum(cur,"57","59") + c.rle;
  const divida        = sum(cur,"23.1") + sum(cur,"23.2");
  const fornecedores  = sum(cur,"22");
  const imobCor       = sum(cur,"43","44") - sum(cur,"48.3","48.4","48.5","48.6");
  const imobInco      = sum(cur,"42") - sum(cur,"48.2");

  const raw = { exist: existencias, clientes, disp: disponibilidades, cp: totalCP, divida, forn: fornecedores, cor: imobCor, inco: imobInco };
  const fmtV = (v: number) => v === 0 ? "—" : Math.abs(v).toLocaleString("pt-PT");
  const pctFmt = (v: number) => v === 0 ? "—" : `${(v * 100).toFixed(1)}%`;

  const anoN1 = String(Number(ano) - 1);

  function PrintSection({ title, part }: { title: string; part: string }) {
    return (
      <div style={{ backgroundColor:"#1a2744", color:"white" }} className="px-6 py-3 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{part}</p>
          <p className="text-[14px] font-bold uppercase tracking-wide">{title}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold opacity-80">{DEMO_COMPANY.nome}</p>
          <p className="text-[10px] opacity-60">Exercício {ano}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-only" style={{ display: show ? "block" : "none" }}>
      {/* ── CAPA ── */}
      <div className="print-page-card min-h-[700px] flex flex-col items-center justify-center text-center px-12 py-16 bg-white">
        <div style={{ width:80, height:80, backgroundColor:"#1a2744", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px" }}>
          <span style={{ color:"white", fontSize:28, fontWeight:900 }}>ASE</span>
        </div>
        <p style={{ color:"#1a2744", fontSize:13, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:4 }}>
          {DEMO_COMPANY.nome}
        </p>
        <p style={{ color:"#6b7280", fontSize:11 }}>{DEMO_COMPANY.nifFormatado} · {DEMO_COMPANY.sede} · Capital Social: {DEMO_COMPANY.capitalSocialFmt}</p>
        <div style={{ width:60, height:3, backgroundColor:"#1a2744", margin:"24px auto" }} />
        <p style={{ color:"#1a2744", fontSize:22, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 }}>
          Relatório de Contas
        </p>
        <p style={{ color:"#1a2744", fontSize:36, fontWeight:900, marginBottom:8 }}>{ano}</p>
        <p style={{ color:"#6b7280", fontSize:12 }}>
          Relatório Técnico Contabilístico · PGCA Angola — Decreto n.º 82/01
        </p>
        <p style={{ color:"#6b7280", fontSize:11, marginTop:4 }}>
          Lei n.º 22/11 de 17 de Junho · Lei n.º 22/11 de 17 de Junho
        </p>
        <div style={{ marginTop:"auto", paddingTop:48 }}>
          <p style={{ color:"#9ca3af", fontSize:10 }}>EduContas ERP · Gerado automaticamente em {new Date().toLocaleDateString("pt-PT")}</p>
        </div>
      </div>

      {/* ── ÍNDICE ── */}
      <div className="print-page-card bg-white px-12 py-8" style={{ pageBreakBefore:"always" }}>
        <p style={{ color:"#1a2744", fontSize:16, fontWeight:700, marginBottom:20, borderBottom:"2px solid #1a2744", paddingBottom:8 }}>Índice</p>
        {[
          ["PARTE I",  "Identificação da Entidade",                        "3"],
          ["PARTE II", "Relatório de Gestão",                              "4"],
          ["",         "1. Actividade e Evolução dos Negócios",            "4"],
          ["",         "2. Análise do Desempenho Financeiro",              "4"],
          ["",         "3–10. Outras secções do Relatório de Gestão",      "5"],
          ["PARTE III","Demonstrações Financeiras",                        "6"],
          ["",         "Balanço em 31/12/" + ano,                          "6"],
          ["",         "Demonstração de Resultados por Natureza",          "7"],
          ["",         "Demonstração de Resultados por Funções",           "8"],
          ["",         "Demonstração de Fluxos de Caixa — Directo",       "9"],
          ["",         "Demonstração de Fluxos de Caixa — Indirecto",     "10"],
          ["",         "Demonstração das Alterações nos Capitais Próprios","11"],
          ["PARTE IV", "Notas às Demonstrações Financeiras",              "12"],
          ["PARTE V",  "Parecer do Contabilista / CLC",                   "16"],
          ["PARTE VI", "Mapas Fiscais — Modelo 1 / IRT / IVA / INSS",    "17"],
        ].map(([parte, titulo, pag], i) => (
          <div key={i} className="flex items-baseline justify-between py-0.5" style={{ borderBottom: "1px dotted #d1d5db" }}>
            <div className="flex gap-3">
              {parte && <span style={{ color:"#1a2744", fontSize:10, fontWeight:700, minWidth:60 }}>{parte}</span>}
              <span style={{ fontSize:11, color: parte ? "#1a2744" : "#4b5563", fontWeight: parte ? 600 : 400, paddingLeft: parte ? 0 : 63 }}>{titulo}</span>
            </div>
            <span style={{ fontSize:11, color:"#6b7280" }}>{pag}</span>
          </div>
        ))}
      </div>

      {/* ── PARTE II: RELATÓRIO DE GESTÃO ── */}
      <div className="print-page-card bg-white px-12 py-8" style={{ pageBreakBefore:"always" }}>
        <PrintSection title="Relatório de Gestão" part="Parte II" />
        <p style={{ fontSize:11, color:"#4b5563", marginBottom:16, lineHeight:1.7 }}>
          O Conselho de Administração da {DEMO_COMPANY.nome} apresenta o Relatório de Gestão referente ao exercício findo em 31 de Dezembro de {ano}, elaborado em cumprimento do artigo 451.º e seguintes da {DEMO_COMPANY.lgsc} (Lei Geral das Sociedades Comerciais).
        </p>
        {RG_SECOES.slice(0,4).map(sec => (
          <div key={sec.id} style={{ marginBottom:16 }}>
            <p style={{ fontSize:11, fontWeight:700, color:"#1a2744", marginBottom:4 }}>{sec.titulo}</p>
            <p style={{ fontSize:10, color:"#6b7280", fontStyle:"italic", lineHeight:1.6 }}>{sec.desc}</p>
            <p style={{ fontSize:10, color:"#9ca3af", marginTop:4 }}>[Secção a preencher pelo órgão de gestão]</p>
            <div style={{ borderBottom:"1px solid #e5e7eb", marginTop:8 }} />
          </div>
        ))}
      </div>

      {/* ── PARTE II (cont.) ── */}
      <div className="print-page-card bg-white px-12 py-8" style={{ pageBreakBefore:"always" }}>
        <PrintSection title="Relatório de Gestão (cont.)" part="Parte II" />
        {RG_SECOES.slice(4).map(sec => (
          <div key={sec.id} style={{ marginBottom:16 }}>
            <p style={{ fontSize:11, fontWeight:700, color:"#1a2744", marginBottom:4 }}>{sec.titulo}</p>
            <p style={{ fontSize:10, color:"#6b7280", fontStyle:"italic", lineHeight:1.6 }}>{sec.desc}</p>
            <p style={{ fontSize:10, color:"#9ca3af", marginTop:4 }}>[Secção a preencher pelo órgão de gestão]</p>
            <div style={{ borderBottom:"1px solid #e5e7eb", marginTop:8 }} />
          </div>
        ))}
      </div>

      {/* ── PARTE III: BALANÇO ── */}
      <div className="print-page-card bg-white" style={{ pageBreakBefore:"always" }}>
        <div className="px-8 py-4">
          <PrintSection title="Balanço" part="Parte III — Demonstrações Financeiras" />
          <div className="text-center mb-3">
            <p style={{ fontSize:11, color:"#374151" }}>Em 31 de Dezembro de {ano} · Valores em Kwanzas (AOA) · PGCA Angola — Decreto n.º 82/01</p>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
            <tbody>
              <tr style={{ backgroundColor:"#1a2744", color:"white" }}>
                <td style={{ padding:"6px 12px", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>ACTIVO</td>
                <td style={{ padding:"6px 8px", textAlign:"center", fontSize:9, color:"rgba(255,255,255,0.6)" }}>Notas</td>
                <td style={{ padding:"6px 12px", textAlign:"right", fontSize:9, fontWeight:600 }}>31/12/{ano}</td>
                <td style={{ padding:"6px 12px", textAlign:"right", fontSize:9, color:"rgba(255,255,255,0.6)" }}>31/12/{anoN1}</td>
              </tr>
              {balanco.activo.map((r, i) => {
                if (r.tipo === "spacer") return <tr key={i}><td colSpan={4} style={{ height:4 }} /></tr>;
                const isTot = r.tipo === "total";
                const isSub = r.tipo === "subtotal";
                return (
                  <tr key={i} style={{ backgroundColor: isTot ? "#1a2744" : isSub ? "#f3f4f6" : i%2===0 ? "#ffffff" : "#f9fafb" }}>
                    <td style={{ padding:"3px 12px", fontWeight: isTot||isSub ? 700 : 400, color: isTot ? "white" : "#374151", paddingLeft: r.tipo === "indent" ? 28 : 12 }}>{r.desc}</td>
                    <td style={{ padding:"3px 8px", textAlign:"center", fontSize:9, color: isTot ? "rgba(255,255,255,0.6)" : "#9ca3af" }}>{r.nota ?? ""}</td>
                    <td style={{ padding:"3px 12px", textAlign:"right", fontWeight: isTot||isSub ? 700 : 400, color: isTot ? "white" : "#374151" }}>{r.tipo !== "title" ? fmtFS(r.n, r.neg) : ""}</td>
                    <td style={{ padding:"3px 12px", textAlign:"right", color: isTot ? "rgba(255,255,255,0.7)" : "#9ca3af" }}>{r.tipo !== "title" ? fmtFS(r.n1, r.neg) : ""}</td>
                  </tr>
                );
              })}
              <tr><td colSpan={4} style={{ height:8 }} /></tr>
              <tr style={{ backgroundColor:"#1a2744", color:"white" }}>
                <td style={{ padding:"6px 12px", fontWeight:700, fontSize:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>CAPITAL PRÓPRIO E PASSIVO</td>
                <td style={{ padding:"6px 8px", textAlign:"center", fontSize:9, color:"rgba(255,255,255,0.6)" }}>Notas</td>
                <td style={{ padding:"6px 12px", textAlign:"right", fontSize:9, fontWeight:600 }}>31/12/{ano}</td>
                <td style={{ padding:"6px 12px", textAlign:"right", fontSize:9, color:"rgba(255,255,255,0.6)" }}>31/12/{anoN1}</td>
              </tr>
              {balanco.capitalPassivo.map((r, i) => {
                if (r.tipo === "spacer") return <tr key={i}><td colSpan={4} style={{ height:4 }} /></tr>;
                const isTot = r.tipo === "total";
                const isSub = r.tipo === "subtotal";
                return (
                  <tr key={i} style={{ backgroundColor: isTot ? "#1a2744" : isSub ? "#f3f4f6" : i%2===0 ? "#ffffff" : "#f9fafb" }}>
                    <td style={{ padding:"3px 12px", fontWeight: isTot||isSub ? 700 : 400, color: isTot ? "white" : "#374151", paddingLeft: r.tipo === "indent" ? 28 : 12 }}>{r.desc}</td>
                    <td style={{ padding:"3px 8px", textAlign:"center", fontSize:9, color: isTot ? "rgba(255,255,255,0.6)" : "#9ca3af" }}>{r.nota ?? ""}</td>
                    <td style={{ padding:"3px 12px", textAlign:"right", fontWeight: isTot||isSub ? 700 : 400, color: isTot ? "white" : "#374151" }}>{r.tipo !== "title" ? fmtFS(r.n, r.neg) : ""}</td>
                    <td style={{ padding:"3px 12px", textAlign:"right", color: isTot ? "rgba(255,255,255,0.7)" : "#9ca3af" }}>{r.tipo !== "title" ? fmtFS(r.n1, r.neg) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Assinaturas Balanço */}
          <div style={{ borderTop:"3px solid #1a2744", marginTop:24, paddingTop:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:32 }}>
              {["O Contabilista Certificado","O Presidente do CA","O Administrador Financeiro"].map(l => (
                <div key={l}>
                  <p style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"#1a2744", marginBottom:32 }}>{l}:</p>
                  <div style={{ borderBottom:"1px solid #1a2744", marginBottom:4 }} />
                  <p style={{ fontSize:9, color:"#9ca3af" }}>Nome e assinatura</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign:"center", fontSize:8, color:"#9ca3af", marginTop:12 }}>
              Luanda, ___ de __________________ de {ano} · EduContas ERP · PGCA Angola — Decreto n.º 82/01
            </p>
          </div>
        </div>
      </div>

      {/* ── DR NATUREZA ── */}
      {[
        { rows: drNat,  titulo: "Demonstração de Resultados por Natureza",         sub: "PGCA Angola — Decreto n.º 82/01" },
        { rows: drFun,  titulo: "Demonstração de Resultados por Funções",           sub: "PGCA Angola — Decreto n.º 82/01" },
        { rows: dfcDir, titulo: "Demonstração de Fluxos de Caixa — Método Directo",sub: "PGCA Angola — Decreto n.º 82/01" },
        { rows: dfcInd, titulo: "Demonstração de Fluxos de Caixa — Método Indirecto",sub:"PGCA Angola — Decreto n.º 82/01" },
        { rows: dacp,   titulo: "Demonstração das Alterações nos Capitais Próprios", sub: "PGCA Angola — Decreto n.º 82/01" },
      ].map(({ rows, titulo, sub }) => (
        <div key={titulo} className="print-page-card bg-white px-8 py-6" style={{ pageBreakBefore:"always" }}>
          <PrintSection title={titulo} part="Parte III — Demonstrações Financeiras" />
          <p style={{ fontSize:10, color:"#374151", marginBottom:12, textAlign:"center" }}>
            Exercício findo em 31 de Dezembro de {ano} · Valores em Kwanzas (AOA) · {sub}
          </p>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
            <thead>
              <tr style={{ backgroundColor:"#1a2744", color:"white" }}>
                <th style={{ textAlign:"left", padding:"6px 12px", fontWeight:700, fontSize:10 }}>Descrição</th>
                <th style={{ textAlign:"center", padding:"6px 8px", fontSize:9, fontWeight:600, width:40, color:"rgba(255,255,255,0.6)" }}>Nota</th>
                <th style={{ textAlign:"right", padding:"6px 12px", fontSize:9, fontWeight:600, width:140 }}>N — {ano}</th>
                <th style={{ textAlign:"right", padding:"6px 12px", fontSize:9, fontWeight:500, width:140, color:"rgba(255,255,255,0.6)" }}>N-1 — {anoN1}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: FSRow, i: number) => {
                if (r.tipo === "spacer") return <tr key={i}><td colSpan={4} style={{ height:4 }} /></tr>;
                const isTot = r.tipo === "total";
                const isSub = r.tipo === "subtotal";
                const isTit = r.tipo === "title";
                return (
                  <tr key={i} style={{ backgroundColor: isTot ? "#1a2744" : isSub ? "#f3f4f6" : isTit ? "#f9fafb" : i%2===0 ? "#ffffff" : "#f9fafb" }}>
                    <td style={{ padding:"3px 12px", fontWeight: isTot||isSub ? 700 : isTit ? 600 : 400, color: isTot ? "white" : "#374151", paddingLeft: r.tipo === "indent" ? 28 : 12, fontSize:10 }}>{r.desc}</td>
                    <td style={{ padding:"3px 8px", textAlign:"center", fontSize:9, color: isTot ? "rgba(255,255,255,0.6)" : "#9ca3af" }}>{r.nota ?? ""}</td>
                    <td style={{ padding:"3px 12px", textAlign:"right", fontWeight: isTot||isSub ? 700 : 400, color: isTot ? "white" : "#374151" }}>{!isTit ? fmtFS(r.n, r.neg) : ""}</td>
                    <td style={{ padding:"3px 12px", textAlign:"right", color: isTot ? "rgba(255,255,255,0.7)" : "#9ca3af" }}>{!isTit ? fmtFS(r.n1, r.neg) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Assinaturas */}
          <div style={{ borderTop:"3px solid #1a2744", marginTop:24, paddingTop:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:32 }}>
              {["O Contabilista Certificado","O Presidente do CA","O Administrador Financeiro"].map(l => (
                <div key={l}>
                  <p style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"#1a2744", marginBottom:28 }}>{l}:</p>
                  <div style={{ borderBottom:"1px solid #1a2744", marginBottom:4 }} />
                  <p style={{ fontSize:9, color:"#9ca3af" }}>Nome e assinatura</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign:"center", fontSize:8, color:"#9ca3af", marginTop:10 }}>
              Luanda, ___ de __________________ de {ano} · EduContas ERP · PGCA Angola — Decreto n.º 82/01
            </p>
          </div>
        </div>
      ))}

      {/* ── PARTE IV: NOTAS (49 PGCA) — 5 pages, 10 notes per page ── */}
      {[0,1,2,3,4].map(pageIdx => {
        const slice = NOTAS.slice(pageIdx * 10, pageIdx * 10 + 10);
        if (slice.length === 0) return null;
        return (
          <div key={pageIdx} className="print-page-card bg-white px-8 py-4" style={{ pageBreakBefore:"always" }}>
            <PrintSection
              title={pageIdx === 0 ? "Notas às Demonstrações Financeiras" : "Notas às Demonstrações Financeiras (cont.)"}
              part="Parte IV"
            />
            {pageIdx === 0 && (
              <p style={{ fontSize:10, color:"#6b7280", marginBottom:20 }}>
                Exercício findo em 31 de Dezembro de {ano} · PGCA Angola — Decreto n.º 82/01 · 49 Notas
              </p>
            )}
            <div style={{ columns:2, columnGap:32 }}>
              {slice.map(nota => {
                const texto = (notasTextos[nota.num] ?? "").trim();
                return (
                  <div key={nota.num} style={{ breakInside:"avoid", marginBottom:16 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <div style={{ width:22, height:22, borderRadius:"50%", backgroundColor:"#1a2744", display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ color:"white", fontSize:9, fontWeight:700 }}>{nota.num}</span>
                      </div>
                      <p style={{ fontSize:10, fontWeight:700, color:"#1a2744" }}>{nota.titulo}</p>
                    </div>
                    {texto
                      ? <p style={{ fontSize:9, color:"#374151", lineHeight:1.6, whiteSpace:"pre-line" }}>{texto}</p>
                      : <p style={{ fontSize:9, color:"#9ca3af", fontStyle:"italic" }}>{nota.desc}</p>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── PARTE V: PARECER ── */}
      <div className="print-page-card bg-white px-8 py-8" style={{ pageBreakBefore:"always" }}>
        <PrintSection title="Parecer do Contabilista Certificado" part="Parte V" />
        <div style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:24 }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#1a2744", marginBottom:12 }}>CERTIFICAÇÃO DO CONTABILISTA CERTIFICADO</p>
          <p style={{ fontSize:10, color:"#374151", lineHeight:1.7, marginBottom:16 }}>
            Ao abrigo do artigo 62.º do Código de Ética dos Contabilistas Certificados, certifico que as demonstrações financeiras da Empresa Demo Lda., referentes ao exercício findo em 31 de Dezembro de {ano}, foram elaboradas em conformidade com o Plano Geral de Contabilidade de Angola (PGCA), aprovado pelo Decreto n.º 82/01 de 26 de Outubro, e reflectem de forma verdadeira e apropriada a posição financeira da empresa nessa data, bem como os resultados das suas operações e os fluxos de caixa do exercício.
          </p>
          <p style={{ fontSize:10, color:"#374151", lineHeight:1.7, marginBottom:16 }}>
            A escrituração contabilística foi mantida regularmente e os documentos de suporte das operações registadas encontram-se devidamente arquivados.
          </p>
          <div style={{ borderTop:"1px solid #e5e7eb", marginTop:32, paddingTop:24, display:"grid", gridTemplateColumns:"1fr 1fr", gap:48 }}>
            <div>
              <p style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"#1a2744", marginBottom:36 }}>O Contabilista Certificado:</p>
              <div style={{ borderBottom:"1px solid #1a2744", marginBottom:4 }} />
              <p style={{ fontSize:9, color:"#9ca3af" }}>Nome e assinatura · Cédula CC n.º ______</p>
            </div>
            <div>
              <p style={{ fontSize:9, color:"#6b7280", marginBottom:4 }}>Local e data:</p>
              <p style={{ fontSize:10, color:"#374151" }}>Luanda, ___ de _____________ de {ano}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PARTE VI: MAPAS FISCAIS ── */}
      <div className="print-page-card bg-white px-8 py-4" style={{ pageBreakBefore:"always" }}>
        <PrintSection title="Mapas Fiscais — Modelo 1 (Imposto Industrial)" part="Parte VI" />
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10 }}>
          <thead>
            <tr style={{ backgroundColor:"#dbeafe" }}>
              <th style={{ textAlign:"left", padding:"6px 12px", fontWeight:700, color:"#1e40af" }}>Descrição — Modelo 1</th>
              <th style={{ textAlign:"right", padding:"6px 12px", fontWeight:700, color:"#1e40af", width:160 }}>N ({ano}) AOA</th>
              <th style={{ textAlign:"right", padding:"6px 12px", fontWeight:600, color:"#3b82f6", width:160 }}>N-1 ({anoN1}) AOA</th>
            </tr>
          </thead>
          <tbody>
            {m1.map((r, i) => r.sep ? (
              <tr key={i}><td colSpan={3} style={{ height:2, borderTop:"2px solid #bfdbfe" }} /></tr>
            ) : r.label === "" ? null : (
              <tr key={i} style={{ backgroundColor: r.bold ? "#eff6ff" : i%2===0 ? "#fff" : "#f9fafb" }}>
                <td style={{ padding:"3px 12px", fontWeight: r.bold ? 700 : 400, paddingLeft: r.indent ? 28 : 12, color:"#374151" }}>{r.label}</td>
                <td style={{ textAlign:"right", padding:"3px 12px", fontWeight: r.bold ? 700 : 400, color:"#1f2937" }}>{r.label.startsWith("Taxa") ? pctFmt(r.value) : fmtV(r.value)}</td>
                <td style={{ textAlign:"right", padding:"3px 12px", color:"#9ca3af" }}>{r.label.startsWith("Taxa") ? pctFmt(r.valueN1) : fmtV(r.valueN1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Final signature for entire report */}
        <div style={{ borderTop:"3px solid #1a2744", marginTop:40, paddingTop:20 }}>
          <p style={{ textAlign:"center", fontSize:10, fontWeight:700, color:"#1a2744", marginBottom:20 }}>
            APROVAÇÃO DO RELATÓRIO DE CONTAS
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:32, marginBottom:16 }}>
            {["O Contabilista Certificado","O Presidente do Conselho de Administração","O Administrador Financeiro"].map(l => (
              <div key={l}>
                <p style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"#1a2744", marginBottom:36 }}>{l}:</p>
                <div style={{ borderBottom:"1px solid #1a2744", marginBottom:4 }} />
                <p style={{ fontSize:9, color:"#9ca3af" }}>Nome e assinatura</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign:"center", fontSize:9, color:"#9ca3af" }}>
            Luanda, ___ de __________________ de {ano} &nbsp;·&nbsp;
            EduContas ERP &nbsp;·&nbsp; PGCA Angola — Decreto n.º 82/01 &nbsp;·&nbsp;
            Lei n.º 22/11 de 17 de Junho
          </p>
        </div>
      </div>
    </div>
  );
}

// ── DATA MODE TOGGLE ──────────────────────────────────────────────────────────
function DataModeToggle({ modoDemo, onChange }: { modoDemo: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 border border-gray-200 rounded-lg">
      <button
        onClick={() => onChange(false)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-all ${
          !modoDemo
            ? "bg-white shadow-sm text-gray-900 border border-gray-200"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <svg className={`w-4 h-4 ${!modoDemo ? "text-blue-600" : "text-gray-400"}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h18v2H3V3zm2 4h14v2H5V7zm-2 4h18v2H3v-2zm2 4h14v2H5v-2zm-2 4h18v2H3v-2z" />
          <rect x="3" y="10" width="4" height="8" rx="1" />
          <rect x="10" y="7" width="4" height="11" rx="1" />
          <rect x="17" y="4" width="4" height="14" rx="1" />
        </svg>
        Dados Reais
      </button>
      <button
        onClick={() => onChange(true)}
        className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${
          modoDemo
            ? "bg-red-50 text-red-600 border border-red-200"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Demo
      </button>
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────
export default function RelatorioTecnicoPage() {
  const [tab, setTab]         = useState<Tab>("gestao");
  const [ano, setAno]         = useState("2025");
  const [preview, setPreview] = useState(false);
  const [modoDemo, setModoDemo] = useState(true);
  const [printing, setPrinting] = useState(false);

  const handlePrint = useCallback(async () => {
    setPrinting(true);
    // Two animation frames ensure React commits + browser lays out the full report
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise<void>(r => setTimeout(r, 150));
    window.print();
    // Keep visible briefly so AfterPrint event fires, then reset
    await new Promise<void>(r => setTimeout(r, 800));
    setPrinting(false);
  }, []);

  const LEGAL_BADGES = [
    { label:"PGCA Angola",        color:"bg-blue-50 text-blue-700 border-blue-200" },
    { label:"Decreto n.º 82/01",  color:"bg-blue-50 text-blue-700 border-blue-200" },
    { label:"Lei n.º 22/11",      color:"bg-green-50 text-green-700 border-green-200" },
    { label:"IRT · Lei n.º 18/14",color:"bg-amber-50 text-amber-700 border-amber-200" },
    { label:"INSS · Lei n.º 7/04",color:"bg-green-50 text-green-700 border-green-200" },
    { label:"IVA · Lei n.º 7/19", color:"bg-purple-50 text-purple-700 border-purple-200" },
  ];

  if (preview) {
    return (
      <div className="min-h-screen bg-gray-300">
        {/* ── Preview Toolbar ── */}
        <div className="no-print sticky top-0 z-50 flex items-center justify-between px-6 py-3 shadow-lg"
          style={{ backgroundColor:"#1a2744" }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Pré-visualização — Relatório Completo {ano}</p>
              <p className="text-white/60 text-xs">{modoDemo ? "Dados demonstrativos" : "Dados reais"} · PGCA Angola — Decreto n.º 82/01</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DataModeToggle modoDemo={modoDemo} onChange={setModoDemo} />
            <select value={ano} onChange={e => setAno(e.target.value)}
              className="px-3 py-1.5 text-sm border border-white/20 rounded-lg bg-white/10 text-white focus:outline-none">
              {ANOS.map(a => <option key={a} value={a} style={{ color:"#000" }}>{a}</option>)}
            </select>
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold bg-white rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color:"#1a2744" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir / Exportar PDF
            </button>
            {/* Preview already has show={true}, so direct window.print() is fine here */}
            <button onClick={() => setPreview(false)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white/80 border border-white/20 rounded-lg hover:bg-white/10 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Fechar Pré-visualização
            </button>
          </div>
        </div>

        {/* ── Page counter info ── */}
        <div className="no-print flex items-center justify-center gap-4 py-2 bg-gray-400/40 text-xs text-gray-700">
          <span>Capa · Índice · Parte II Gestão · Parte III Demonstrações (×6) · Parte IV Notas · Parte V Parecer · Parte VI Mapas</span>
          <span className="font-semibold">· Dados Demonstrativos ASE Grupo</span>
        </div>

        {/* ── Report pages ── */}
        <div className="max-w-[900px] mx-auto py-6 space-y-4 px-4">
          <RelatorioPrintAll ano={ano} show={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatório Técnico Contabilístico</h1>
          <p className="text-sm text-gray-500 mt-1">
            Relatório de Contas Anual · PGCA Angola — Decreto n.º 82/01 · Exercício {ano}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataModeToggle modoDemo={modoDemo} onChange={setModoDemo} />
          <select value={ano} onChange={e => setAno(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => setPreview(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Pré-visualizar
          </button>
          <button onClick={handlePrint} disabled={printing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
            style={{ backgroundColor:"#1a2744" }}>
            {printing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                A preparar...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar Relatório Completo
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Badge bar ──────────────────────────────────────────────────── */}
      <div className="no-print flex flex-wrap gap-2">
        {LEGAL_BADGES.map(b => (
          <span key={b.label} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${b.color}`}>{b.label}</span>
        ))}
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────────── */}
      <div className="no-print flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Mode banner ────────────────────────────────────────────────── */}
      {!modoDemo && (
        <div className="no-print flex items-start gap-3 px-4 py-3 rounded-xl border border-blue-200 bg-blue-50">
          <svg className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-800">Modo Dados Reais activo</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Os valores serão alimentados automaticamente pelos lançamentos registados no módulo de Contabilidade.
              Adicione lançamentos em <strong>Contabilidade → Diário</strong> para que o relatório reflicta os dados reais da empresa.
            </p>
          </div>
        </div>
      )}
      {modoDemo && (
        <div className="no-print flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50">
          <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.96l-7-12a2 2 0 00-3.5 0l-7 12A2 2 0 005.07 19z" />
          </svg>
          <p className="text-xs text-amber-800">
            <strong>Modo Demo</strong> — dados demonstrativos de <strong>ASE Grupo Lda.</strong> Mude para <em>Dados Reais</em> para usar os lançamentos da sua empresa.
          </p>
        </div>
      )}

      {/* ── Tab Content ────────────────────────────────────────────────── */}
      <div className="no-print">
        {tab === "gestao"        && <RelatorioGestao ano={ano} modoDemo={modoDemo} />}
        {tab === "demonstracoes" && <DemonstracoesFin ano={ano} />}
        {tab === "notas"         && <NotasDF ano={ano} modoDemo={modoDemo} />}
        {tab === "parecer"       && <ParecerCLC ano={ano} />}
        {tab === "indicadores"   && <IndicadoresFiscais ano={ano} />}
        {tab === "mapas"         && <MapasFiscais ano={ano} />}
      </div>

      {/* ── Print-only comprehensive report (pre-rendered when printing=true) ── */}
      <RelatorioPrintAll ano={ano} show={printing} />
    </div>
  );
}
