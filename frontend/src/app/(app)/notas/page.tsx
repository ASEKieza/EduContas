"use client";

import { useState, useMemo } from "react";
import { computeNoteValues, buildModelo1, sum } from "@/lib/accounting/engine";
import { DATASETS, ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { journalEntriesToBalancesMap } from "@/lib/accounting/bridge";
import { useJournal, JOURNAL_ACCOUNTS } from "@/lib/journal";
import type { BalancesMap } from "@/lib/accounting/types";
import { NOTAS, CAT_LABELS, CAT_COLORS, useNotasTextos } from "@/lib/notas-shared";
import type { NotaCat, NotaDef } from "@/lib/notas-shared";

// ── Local types ────────────────────────────────────────────────────────────────
type ValRow = { n: number; n1: number } | null;
type NV = ReturnType<typeof computeNoteValues>;

const CATS: (NotaCat | "all")[] = ["all","politicas","ativo","cp","dr","dfc","outras"];

// ── Nota values mapping ────────────────────────────────────────────────────────
function getNoteVals(num: string, nv: NV, cur: BalancesMap, pri: BalancesMap): ValRow[] | undefined {
  const _ = null as ValRow;
  const v = (n: number, n1: number): ValRow => ({ n, n1 });
  const neg = (r: ValRow): ValRow => r ? { n: -r.n, n1: -r.n1 } : null;

  switch (num) {
    case "04":
      return [
        nv["04"].terrenos,   nv["04"].edificios, nv["04"].eqBasico,
        nv["04"].eqTransp,   _,                  nv["04"].eqAdmin,
        _, _, _,
        nv["04"].grossTotal,
      ];

    case "05":
      return [_, _, nv["05"].propriedade, _, _, nv["05"].grossTotal];

    case "06":
      return [_, _, _, _, _, nv["06"].total];

    case "07":
      return [
        nv["07"].mercadorias, nv["07"].materiasPrimas, _, _, _, _,
        nv["07"].grossTotal,
        neg(nv["07"].provisoes),
        nv["07"].netTotal,
      ];

    case "08":
      return [
        nv["08"].clientes,
        _,
        _,
        _,
        v(sum(cur,"24.1"), sum(pri,"24.1")),
        _,
        nv["08"].outrosDeved,
        v(nv["08"].clientes.n + nv["08"].outrosDeved.n, nv["08"].clientes.n1 + nv["08"].outrosDeved.n1),
        neg(nv["08"].provisoes),
        nv["08"].netTotal,
      ];

    case "10":
      return [_, _, _, _, v(sum(cur,"15"), sum(pri,"15"))];

    case "11": {
      const dOrd = v(sum(cur,"12"), sum(pri,"12"));
      const dPrz = v(sum(cur,"13"), sum(pri,"13"));
      return [nv["11"].caixa, _, dOrd, dPrz, _, nv["11"].total];
    }

    case "12":
      return [
        nv["12"].capital, _, _, _,
        v(sum(cur,"52.1"), sum(pri,"52.1")),
        _,
        v(sum(cur,"55.1"), sum(pri,"55.1")),
        _,
        nv["12"].transitados,
        nv["12"].resultado,
        nv["12"].total,
      ];

    case "14":
      return [_, _, _, nv["14"].total];

    case "15":
      return [
        nv["15"].fornecedores,
        _,
        _,
        nv["15"].estado,
        _,
        nv["15"].empCp,
        nv["15"].total,
      ];

    case "16":
      return [nv["16"].total, _, _, _, nv["16"].total];

    case "17":
      return [nv["17"].acrescCustos, nv["17"].provDiferidos, _, _, nv["17"].total];

    case "19":
      return [
        nv["19"].incorp,    nv["19"].edificios,
        nv["19"].eqBasico,  nv["19"].eqTransp,
        _,
        nv["19"].total,
      ];

    case "20": {
      const provExist  = nv["07"].provisoes  ?? v(0, 0);
      const provCobr   = nv["08"].provisoes  ?? v(0, 0);
      const totalProv  = v(provExist.n + provCobr.n, provExist.n1 + provCobr.n1);
      return [_, provExist, provCobr, totalProv];
    }

    case "22":
      return [
        nv["22"].vendas, _, nv["22"].psv,
        v(nv["22"].vendas.n + nv["22"].psv.n, nv["22"].vendas.n1 + nv["22"].psv.n1),
        _, _,
        v(0, 0),
        nv["22"].total,
      ];

    case "23": {
      const varN  = sum(cur,"63");
      const varN1 = sum(pri,"63");
      return [_, _, v(varN, varN1)];
    }

    case "25":
      return [_, _, _, _, _, nv["25"].total];

    case "26":
      return [nv["26"].mercadorias, _, _, nv["26"].total];

    case "27":
      return [
        nv["27"].elect,      nv["27"].comunic,    nv["27"].rendas,
        nv["27"].seguros,    nv["27"].honorarios, nv["27"].publicidade,
        nv["27"].conservacao,nv["27"].transp,      nv["27"].desloc,
        _,
        nv["27"].total,
      ];

    case "28":
      return [
        _,
        nv["28"].remuneracoes,
        nv["28"].inss,
        _, _,
        nv["28"].outros,
        nv["28"].total,
      ];

    case "29": {
      const sN  = sum(cur,"75.3.1.1") + sum(cur,"75.3.1.2");
      const sN1 = sum(pri,"75.3.1.1") + sum(pri,"75.3.1.2");
      return [v(sN, sN1), _, _, _, v(sN, sN1)];
    }

    case "30":
      return [
        nv["30"].amortIncorp, nv["30"].amortCorp,
        nv["30"].provCobrDuv, _, _,
        nv["30"].total,
      ];

    case "31":
      return [_, _, _, _, _, nv["31"].total];

    case "32":
      return [nv["32"].juros, _, nv["32"].cambiais, _, _, nv["32"].total];

    case "33":
      return [_, _, _, _, v(sum(cur,"67"), sum(pri,"67"))];

    case "34":
      return [_, _, _, _, v(sum(cur,"79"), sum(pri,"79"))];

    case "47": {
      const caixa    = v(sum(cur,"11"), sum(pri,"11"));
      const dOrd     = v(sum(cur,"12"), sum(pri,"12"));
      const dPrz     = v(sum(cur,"13"), sum(pri,"13"));
      const fim      = nv["47"].total;
      const inicio   = v(fim.n1, 0);
      const variacao = v(fim.n - fim.n1, 0);
      return [caixa, dOrd, dPrz, _, _, _, fim, _, inicio, variacao];
    }

    default:
      return undefined;
  }
}

// ── Format helpers ─────────────────────────────────────────────────────────────
function fmtV(v: number): string {
  if (v === 0) return "—";
  const abs = Math.abs(v);
  const s = abs.toLocaleString("pt-PT");
  return v < 0 ? `(${s})` : s;
}

// ── ExplicativaEditor ─────────────────────────────────────────────────────────
function ExplicativaEditor({
  num, texto, onChange,
}: { num: string; texto: string; onChange: (t: string) => void }) {
  return (
    <div className="mt-4 pt-3 border-t border-dashed border-gray-200 space-y-2">
      <div className="flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
          Notas Explicativas
        </span>
        {texto.trim().length > 0 && (
          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
            ✓ Guardado
          </span>
        )}
      </div>
      <textarea
        value={texto}
        onChange={e => onChange(e.target.value)}
        placeholder={`Inserir notas e explicações adicionais relativas à Nota ${num}…`}
        className="w-full min-h-[88px] px-3 py-2.5 text-xs border border-indigo-100 rounded-lg resize-y
          focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300
          text-gray-700 bg-white leading-relaxed placeholder-gray-300"
      />
      <p className="text-[10px] text-gray-400">
        Campo de texto livre · Guardado automaticamente no browser ·
        PGCA Angola, Decreto n.º 82/01
      </p>
    </div>
  );
}

// ── Movement Table ─────────────────────────────────────────────────────────────
function MovementTable({ rows, finalVals }: {
  rows: NotaDef["rows"];
  finalVals?: ValRow[];
}) {
  const movCols = ["Saldo Inicial", "Adições", "Abates/Alienaç.", "Transferências"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-700 w-44">Rubrica</th>
            {movCols.map(c => (
              <th key={c} className="text-right px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">{c}</th>
            ))}
            <th className="text-right px-3 py-2 font-semibold text-gray-800 bg-gray-200 whitespace-nowrap">Saldo Final N</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">Saldo Final N-1</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r, i) => r.sep ? (
            <tr key={i}><td colSpan={7} className="py-1 border-t-2 border-gray-300" /></tr>
          ) : (
            <tr key={i} className={r.total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}>
              <td className={`px-3 py-1.5 border-b border-gray-100 ${r.sub ? "pl-7 text-gray-500" : ""}`}>{r.label}</td>
              {movCols.map((_, ci) => (
                <td key={ci} className="text-right px-3 py-1.5 border-b border-gray-100 text-gray-400">—</td>
              ))}
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono font-semibold text-gray-800 bg-gray-50">
                {finalVals?.[i] != null ? fmtV(finalVals[i]!.n) : "—"}
              </td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-500">
                {finalVals?.[i] != null ? fmtV(finalVals[i]!.n1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Simple 2-col Table (N / N-1) ───────────────────────────────────────────────
function SimpleTable({ rows, ano, vals }: {
  rows: NotaDef["rows"];
  ano: string;
  vals?: ValRow[];
}) {
  const anoN1 = String(Number(ano) - 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-700">Rubrica</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-800 w-36">Exerc. N ({ano})</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-600 w-36">Exerc. N-1 ({anoN1})</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r, i) => r.sep ? (
            <tr key={i}><td colSpan={3} className="py-1 border-t-2 border-gray-300" /></tr>
          ) : (
            <tr key={i} className={r.total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}>
              <td className={`px-3 py-1.5 border-b border-gray-100 ${r.sub ? "pl-7 text-gray-500 italic" : ""}`}>
                {r.label}
              </td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-800">
                {vals?.[i] != null ? fmtV(vals[i]!.n) : "—"}
              </td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-600">
                {vals?.[i] != null ? fmtV(vals[i]!.n1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Aged Analysis Table ────────────────────────────────────────────────────────
function AgedTable({ rows, ano, vals }: { rows: NotaDef["rows"]; ano: string; vals?: ValRow[] }) {
  const anoN1 = String(Number(ano) - 1);
  const aging = ["Corrente", "30–60 dias", "61–90 dias", "91–180 dias", "> 180 dias"];
  return (
    <div className="overflow-x-auto space-y-0">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-700 min-w-[180px]">Rubrica</th>
            {aging.map(b => (
              <th key={b} className="text-right px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">{b}</th>
            ))}
            <th className="text-right px-3 py-2 font-bold text-gray-800 whitespace-nowrap bg-gray-200">Total N ({ano})</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">Total N-1 ({anoN1})</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r, i) => r.sep ? (
            <tr key={i}><td colSpan={8} className="py-1 border-t-2 border-gray-300" /></tr>
          ) : (
            <tr key={i} className={r.total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}>
              <td className={`px-3 py-1.5 border-b border-gray-100 ${r.sub ? "pl-7 text-gray-500 italic" : ""}`}>{r.label}</td>
              {aging.map((_, bi) => (
                <td key={bi} className="text-right px-3 py-1.5 border-b border-gray-100 text-gray-300 text-[10px]">—</td>
              ))}
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono font-semibold text-gray-800 bg-gray-50">
                {vals?.[i] != null ? fmtV(vals[i]!.n) : "—"}
              </td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-500">
                {vals?.[i] != null ? fmtV(vals[i]!.n1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {vals && (
        <p className="text-[10px] text-amber-700 bg-amber-50 border-t border-amber-100 px-3 py-1.5">
          ⚠ Desagregação por antiguidade disponível quando os documentos incluírem datas de vencimento individuais
        </p>
      )}
    </div>
  );
}

// ── Staff Table ────────────────────────────────────────────────────────────────
function StaffTable({ rows, ano, vals }: {
  rows: NotaDef["rows"];
  ano: string;
  vals?: ValRow[];
}) {
  const anoN1 = String(Number(ano) - 1);
  return (
    <div className="overflow-x-auto space-y-4">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-700">Rubrica</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-800 w-36">N ({ano}) AOA</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-600 w-36">N-1 ({anoN1}) AOA</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r, i) => (
            <tr key={i} className={r.total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}>
              <td className="px-3 py-1.5 border-b border-gray-100">{r.label}</td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-800">
                {vals?.[i] != null ? fmtV(vals[i]!.n) : "—"}
              </td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-600">
                {vals?.[i] != null ? fmtV(vals[i]!.n1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">Número Médio de Trabalhadores</div>
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-gray-100">
            <th className="text-left px-3 py-1.5 font-semibold text-gray-700">Categoria</th>
            <th className="text-right px-3 py-1.5 font-semibold text-gray-800">N</th>
            <th className="text-right px-3 py-1.5 font-semibold text-gray-600">N-1</th>
          </tr></thead>
          <tbody>
            {["Órgãos sociais","Quadros superiores","Técnicos","Administrativos","Operacionais","TOTAL"].map(cat => (
              <tr key={cat} className={cat === "TOTAL" ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}>
                <td className="px-3 py-1.5 border-b border-gray-100">{cat}</td>
                <td className="text-right px-3 py-1.5 border-b border-gray-100 text-gray-400">—</td>
                <td className="text-right px-3 py-1.5 border-b border-gray-100 text-gray-400">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TaxTable — wired to buildModelo1 ──────────────────────────────────────────
function TaxTable({ ano, cur, pri }: { ano: string; cur: BalancesMap; pri: BalancesMap }) {
  const anoN1 = String(Number(ano) - 1);
  const m1 = buildModelo1(cur, pri);

  const pct = (v: number) => v === 0 ? "—" : `${(v * 100).toFixed(1)}%`;
  const isRate = (label: string) => label.startsWith("Taxa");

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-amber-50">
            <th className="text-left px-3 py-2 font-semibold text-amber-800">Descrição — Apuramento Imposto Industrial</th>
            <th className="text-right px-3 py-2 font-semibold text-amber-800 w-40">N ({ano}) AOA</th>
            <th className="text-right px-3 py-2 font-semibold text-amber-700 w-40">N-1 ({anoN1}) AOA</th>
          </tr>
        </thead>
        <tbody>
          {m1.map((r, i) =>
            r.sep ? (
              <tr key={i}><td colSpan={3} className="py-1 border-t-2 border-amber-200" /></tr>
            ) : r.label === "" ? null : (
              <tr key={i} className={r.bold ? "bg-amber-50 font-semibold" : "hover:bg-gray-50"}>
                <td className={`px-3 py-1.5 border-b border-gray-100 ${r.indent ? "pl-7 text-gray-500" : r.bold ? "text-gray-800" : "text-gray-700"}`}>
                  {r.label}
                </td>
                <td className={`text-right px-3 py-1.5 border-b border-gray-100 font-mono ${r.bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                  {isRate(r.label) ? pct(r.value) : fmtV(r.value)}
                </td>
                <td className={`text-right px-3 py-1.5 border-b border-gray-100 font-mono ${r.bold ? "font-semibold text-gray-700" : "text-gray-500"}`}>
                  {isRate(r.label) ? pct(r.valueN1) : fmtV(r.valueN1)}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Narrative Box ──────────────────────────────────────────────────────────────
function NarrativeBox() {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-400 italic">
        Esta nota requer texto narrativo por parte do preparador das demonstrações financeiras.
      </p>
      <div className="h-2" />
    </div>
  );
}

// ── Note Content Dispatcher ────────────────────────────────────────────────────
function NoteContent({ nota, ano, nv, cur, pri }: {
  nota: NotaDef;
  ano: string;
  nv: NV;
  cur: BalancesMap;
  pri: BalancesMap;
}) {
  const vals = getNoteVals(nota.num, nv, cur, pri);

  if (nota.tipo === "movement") return <MovementTable rows={nota.rows} finalVals={vals} />;
  if (nota.tipo === "staff")    return <StaffTable rows={nota.rows} ano={ano} vals={vals} />;
  if (nota.tipo === "tax")      return <TaxTable ano={ano} cur={cur} pri={pri} />;
  if (nota.tipo === "aged")     return <AgedTable rows={nota.rows} ano={ano} vals={vals} />;
  if (nota.tipo === "narrative") return <NarrativeBox />;
  if (nota.rows) return <SimpleTable rows={nota.rows} ano={ano} vals={vals} />;
  return <NarrativeBox />;
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function NotasPage() {
  const [ano, setAno] = useState(ANOS_DISPONIVEIS[0]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<NotaCat | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [forceDemo, setForceDemo] = useState(false);
  const { textos, setTexto } = useNotasTextos(ano);

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

  const nv = useMemo(() => computeNoteValues(cur, pri), [cur, pri]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return NOTAS.filter(n =>
      (catFilter === "all" || n.cat === catFilter) &&
      (q === "" || n.titulo.toLowerCase().includes(q) || n.num.includes(q) || (n.contas ?? "").includes(q))
    );
  }, [search, catFilter]);

  const toggle = (num: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(num) ? s.delete(num) : s.add(num); return s; });

  const expandAll  = () => setExpanded(new Set(filtered.map(n => n.num)));
  const collapseAll = () => setExpanded(new Set());

  const catCount = useMemo(() => {
    const m: Record<string, number> = { all: NOTAS.length };
    NOTAS.forEach(n => { m[n.cat] = (m[n.cat] ?? 0) + 1; });
    return m;
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notas às Demonstrações Financeiras</h1>
          <p className="text-sm text-gray-500 mt-1">
            49 notas conforme PGCA Angola — Decreto n.º 82/01, de 16 de Novembro ·
            Valores calculados automaticamente a partir dos movimentos contabilísticos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Exercício:</label>
            <select
              value={ano} onChange={e => { setAno(e.target.value); setExpanded(new Set()); }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {ANOS_DISPONIVEIS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setForceDemo(false)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                !forceDemo ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              📊 Dados Reais
            </button>
            <button
              onClick={() => setForceDemo(true)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                forceDemo ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Demo
            </button>
          </div>
        </div>
      </div>

      {/* ── Data source banner ──────────────────────────────────────────────── */}
      {loaded && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
          hasReal
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            forceDemo ? "bg-amber-400" : hasReal ? "bg-green-500" : "bg-gray-400"
          }`} />
          {forceDemo
            ? <>● Modo Demonstração — a apresentar dados de exemplo</>
            : hasReal
              ? <>✓ {lancados} lançamento{lancados !== 1 ? "s" : ""} no diário para {ano} — {Object.keys(journalMap).length} contas mapeadas</>
              : <>○ Diário vazio para {ano} — notas a zeros. Lance movimentos no Diário Contabilístico.</>
          }
        </div>
      )}

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {(["politicas","ativo","cp","dr","dfc","outras"] as NotaCat[]).map(cat => {
          const c = CAT_COLORS[cat];
          return (
            <button
              key={cat}
              onClick={() => setCatFilter(catFilter === cat ? "all" : cat)}
              className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                catFilter === cat
                  ? `${c.bg} ${c.border} ${c.text}`
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <span className="text-2xl font-bold">{catCount[cat] ?? 0}</span>
              <span className="text-[10px] font-medium leading-tight mt-0.5">{CAT_LABELS[cat]}</span>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 relative min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar nota (número, título, conta)..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={catFilter} onChange={e => setCatFilter(e.target.value as NotaCat | "all")}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {CATS.map(c => (
              <option key={c} value={c}>{c === "all" ? "Todas as categorias" : CAT_LABELS[c as NotaCat]}</option>
            ))}
          </select>
          <button onClick={expandAll} className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Expandir todas
          </button>
          <button onClick={collapseAll} className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Colapsar
          </button>
        </div>
        <span className="text-sm text-gray-400">{filtered.length} nota{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Notes Accordion ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {filtered.map(nota => {
          const isOpen = expanded.has(nota.num);
          const c = CAT_COLORS[nota.cat];
          const hasTexto = (textos[nota.num] ?? "").trim().length > 0;
          return (
            <div key={nota.num} className={`border-2 rounded-xl overflow-hidden transition-all ${isOpen ? c.border : "border-gray-200"}`}>
              <button
                onClick={() => toggle(nota.num)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isOpen ? c.bg : "bg-white hover:bg-gray-50"}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  isOpen ? `${c.text} border-2 ${c.border}` : "bg-gray-100 text-gray-600"
                }`}>
                  {nota.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${isOpen ? c.text : "text-gray-800"}`}>{nota.titulo}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                      {CAT_LABELS[nota.cat]}
                    </span>
                    {nota.contas && (
                      <span className="text-[10px] text-gray-400 font-mono">contas: {nota.contas}</span>
                    )}
                    {hasTexto && !isOpen && (
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">✎ Com notas</span>
                    )}
                  </div>
                  {!isOpen && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{nota.desc}</p>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? `rotate-180 ${c.text}` : "text-gray-400"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 bg-white border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">{nota.desc}</p>
                  <NoteContent nota={nota} ano={ano} nv={nv} cur={cur} pri={pri} />
                  <ExplicativaEditor
                    num={nota.num}
                    texto={textos[nota.num] ?? ""}
                    onChange={t => setTexto(nota.num, t)}
                  />
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Imprimir nota
                    </button>
                    <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Exportar Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium">Nenhuma nota encontrada</p>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 pt-4 flex items-center justify-between text-xs text-gray-400">
        <span>PGCA Angola — Decreto n.º 82/01, de 16 de Novembro — 49 Notas oficiais</span>
        <span>Exercício {ano} / {String(Number(ano) - 1)}</span>
      </div>
    </div>
  );
}
