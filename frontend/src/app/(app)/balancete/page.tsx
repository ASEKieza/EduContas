"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import Topbar from "@/components/Topbar";
import { useWindowManager } from "@/lib/windowManager";
import { useJournal, type JournalEntry } from "@/lib/journal";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";

// ── Types ──────────────────────────────────────────────────────────────────────
type PeriodKey =
  | "abertura"
  | "jan" | "fev" | "mar" | "abr" | "mai" | "jun"
  | "jul" | "ago" | "set" | "out" | "nov" | "dez"
  | "m13" | "m14" | "m15";

interface PeriodInfo {
  label: string;
  tipo: "abertura" | "normal" | "especial";
  desc: string;
  months?: number[]; // ISO month numbers (1-12) this period covers
}

const PERIODOS: Record<PeriodKey, PeriodInfo> = {
  abertura: { label:"Abertura",  tipo:"abertura", desc:"Saldos de abertura do exercício" },
  jan:      { label:"Janeiro",   tipo:"normal",   desc:"Período: 01/01 — 31/01", months:[1] },
  fev:      { label:"Fevereiro", tipo:"normal",   desc:"Período: 01/02 — 28/02", months:[2] },
  mar:      { label:"Março",     tipo:"normal",   desc:"Período: 01/03 — 31/03", months:[3] },
  abr:      { label:"Abril",     tipo:"normal",   desc:"Período: 01/04 — 30/04", months:[4] },
  mai:      { label:"Maio",      tipo:"normal",   desc:"Período: 01/05 — 31/05", months:[5] },
  jun:      { label:"Junho",     tipo:"normal",   desc:"Período: 01/06 — 30/06", months:[6] },
  jul:      { label:"Julho",     tipo:"normal",   desc:"Período: 01/07 — 31/07", months:[7] },
  ago:      { label:"Agosto",    tipo:"normal",   desc:"Período: 01/08 — 31/08", months:[8] },
  set:      { label:"Setembro",  tipo:"normal",   desc:"Período: 01/09 — 30/09", months:[9] },
  out:      { label:"Outubro",   tipo:"normal",   desc:"Período: 01/10 — 31/10", months:[10] },
  nov:      { label:"Novembro",  tipo:"normal",   desc:"Período: 01/11 — 30/11", months:[11] },
  dez:      { label:"Dezembro",  tipo:"normal",   desc:"Período: 01/12 — 31/12", months:[12] },
  m13:      { label:"Mês 13",    tipo:"especial", desc:"Regularizações e ajustamentos de fim de exercício", months:[13] },
  m14:      { label:"Mês 14",    tipo:"especial", desc:"Apuramento de resultados — transferências para Classe 8", months:[14] },
  m15:      { label:"Mês 15",    tipo:"especial", desc:"Saldos finais — encerramento do exercício", months:[15] },
};

const ANOS = ANOS_DISPONIVEIS;

// ── Static ledger data (demonstration baseline) ────────────────────────────────
interface Linha { cod: string; desc: string; siD: number; siC: number; mD: number; mC: number; cl: number; }

const DADOS: Linha[] = [
  // Classe 1 — Meios Fixos
  { cod:"11",     desc:"Imobilizações Corpóreas",              siD:750000000, siC:0,          mD:100000000, mC:0,          cl:1 },
  { cod:"12",     desc:"Imobilizações Incorpóreas",            siD:30000000,  siC:0,          mD:0,         mC:0,          cl:1 },
  { cod:"13",     desc:"Investimentos Financeiros",            siD:50000000,  siC:0,          mD:0,         mC:0,          cl:1 },
  { cod:"18",     desc:"Amortizações Acumuladas",              siD:0,         siC:305000000,  mD:0,         mC:15000000,   cl:1 },
  { cod:"19",     desc:"Prov. para Investimentos Financeiros", siD:0,         siC:2000000,    mD:0,         mC:0,          cl:1 },
  // Classe 2 — Existências
  { cod:"26",     desc:"Mercadorias",                          siD:50000000,  siC:0,          mD:185000000, mC:92000000,   cl:2 },
  { cod:"28",     desc:"Adiantamentos por Conta de Compras",   siD:5000000,   siC:0,          mD:0,         mC:5000000,    cl:2 },
  { cod:"29",     desc:"Provisões para Depreciação de Exist.", siD:0,         siC:1500000,    mD:0,         mC:0,          cl:2 },
  // Classe 3 — Terceiros
  { cod:"31.1",   desc:"Clientes Nacionais — C/C",             siD:25000000,  siC:0,          mD:680400000, mC:667200000,  cl:3 },
  { cod:"31.2",   desc:"Clientes de Cobrança Duvidosa",        siD:3000000,   siC:0,          mD:500000,    mC:0,          cl:3 },
  { cod:"32.1",   desc:"Fornecedores Nacionais — C/C",         siD:0,         siC:20000000,   mD:142000000, mC:148500000,  cl:3 },
  { cod:"33.1",   desc:"Empréstimos Bancários",                siD:0,         siC:60000000,   mD:10000000,  mC:0,          cl:3 },
  { cod:"34.1",   desc:"Imposto Industrial",                   siD:0,         siC:0,          mD:18000000,  mC:23600000,   cl:3 },
  { cod:"34.5.3", desc:"IVA Liquidado",                        siD:0,         siC:0,          mD:122256000, mC:122256000,  cl:3 },
  { cod:"36.1",   desc:"Remunerações a Pagar",                 siD:0,         siC:0,          mD:42000000,  mC:48200000,   cl:3 },
  { cod:"38",     desc:"Acréscimos e Diferimentos",            siD:2000000,   siC:8000000,    mD:0,         mC:0,          cl:3 },
  // Classe 4 — Meios Monetários
  { cod:"43.1",   desc:"Banco BFA — C/C",                      siD:108000000, siC:0,          mD:384600000, mC:277000000,  cl:4 },
  { cod:"43.2",   desc:"Banco BIC — C/C",                      siD:30000000,  siC:0,          mD:50000000,  mC:64400000,   cl:4 },
  { cod:"45.1",   desc:"Caixa Principal — AOA",                siD:1000000,   siC:0,          mD:12400000,  mC:9200000,    cl:4 },
  // Classe 5 — Capital
  { cod:"51.1",   desc:"Capital Subscrito e Realizado",        siD:0,         siC:500000000,  mD:0,         mC:0,          cl:5 },
  { cod:"55",     desc:"Reservas Legais",                      siD:0,         siC:32000000,   mD:0,         mC:0,          cl:5 },
  { cod:"56",     desc:"Reservas Livres",                      siD:0,         siC:18000000,   mD:0,         mC:0,          cl:5 },
  // Classe 6 — Proveitos
  { cod:"61.1",   desc:"Vendas — Mercado Nacional",            siD:0,         siC:0,          mD:0,         mC:680400000,  cl:6 },
  { cod:"62.1",   desc:"Serviços Suplementares",               siD:0,         siC:0,          mD:0,         mC:24000000,   cl:6 },
  { cod:"63.5",   desc:"IVA Suportado Dedutível",              siD:0,         siC:0,          mD:122256000, mC:122256000,  cl:6 },
  // Classe 7 — Custos
  { cod:"71.1",   desc:"CMVMC — Mercadorias",                  siD:0,         siC:0,          mD:408240000, mC:0,          cl:7 },
  { cod:"72.2",   desc:"Remunerações do Pessoal",              siD:0,         siC:0,          mD:174400000, mC:0,          cl:7 },
  { cod:"72.5",   desc:"Encargos sobre Remunerações",          siD:0,         siC:0,          mD:26160000,  mC:0,          cl:7 },
  { cod:"73.1",   desc:"Amortizações — Imob. Corpóreas",       siD:0,         siC:0,          mD:15000000,  mC:0,          cl:7 },
  { cod:"75.2",   desc:"Fornecimentos e Serviços de Terceiros",siD:0,         siC:0,          mD:18000000,  mC:0,          cl:7 },
  { cod:"75.3",   desc:"Impostos e Taxas",                     siD:0,         siC:0,          mD:3200000,   mC:0,          cl:7 },
  // Classe 8 — Resultados
  { cod:"87",     desc:"Impostos sobre os Lucros",             siD:0,         siC:0,          mD:23600000,  mC:0,          cl:8 },
  { cod:"88",     desc:"Resultado Líquido do Exercício",       siD:0,         siC:0,          mD:0,         mC:94160000,   cl:8 },
];

function fmtN(n: number): string {
  if (n === 0) return "—";
  return n.toLocaleString("pt-PT");
}

// ── Import Modal ───────────────────────────────────────────────────────────────
interface ImportRow { codigo: string; descricao: string; debito: number; credito: number; }

type ImportFormat = "csv" | "xlsx" | "saft" | "manual";

const FORMAT_LABELS: Record<ImportFormat, string> = {
  csv:    "CSV / TXT (separado por ; ou ,)",
  xlsx:   "Excel (XLSX)",
  saft:   "SAF-T Angola (XML)",
  manual: "Entrada Manual",
};

/** Parse CSV text → ImportRow[] */
function parseCSV(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  // Auto-detect separator
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase());
  const idx = {
    cod:  headers.findIndex(h => /cod|conta|code/i.test(h)),
    desc: headers.findIndex(h => /desc|name|designa|nome/i.test(h)),
    deb:  headers.findIndex(h => /deb/i.test(h)),
    cred: headers.findIndex(h => /cred/i.test(h)),
  };
  return lines.slice(1).map(line => {
    const cols = line.split(sep);
    const parse = (i: number) => i >= 0 ? parseFloat(cols[i]?.replace(/\./g,"").replace(",",".") ?? "0") || 0 : 0;
    return {
      codigo:    idx.cod  >= 0 ? cols[idx.cod]?.trim()  ?? "" : cols[0]?.trim() ?? "",
      descricao: idx.desc >= 0 ? cols[idx.desc]?.trim() ?? "" : cols[1]?.trim() ?? "",
      debito:    parse(idx.deb  >= 0 ? idx.deb  : 2),
      credito:   parse(idx.cred >= 0 ? idx.cred : 3),
    };
  }).filter(r => r.codigo);
}

/** Parse SAF-T Angola XML (simplified) */
function parseSAFT(text: string): ImportRow[] {
  const rows: ImportRow[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");
  // SAF-T GL entries or OpeningBalance elements
  const entries = doc.querySelectorAll("OpeningCreditBalance, OpeningDebitBalance, GeneralLedgerEntry");
  if (entries.length === 0) {
    // Try generic SAF-T structure
    const accounts = doc.querySelectorAll("Account");
    accounts.forEach(acc => {
      const cod  = acc.querySelector("AccountID")?.textContent?.trim() ?? "";
      const desc = acc.querySelector("AccountDescription")?.textContent?.trim() ?? "";
      const ob   = acc.querySelector("OpeningBalance")?.textContent ?? "0";
      const cb   = acc.querySelector("ClosingBalance")?.textContent ?? "0";
      const val  = parseFloat(ob) || parseFloat(cb) || 0;
      if (cod) rows.push({ codigo: cod, descricao: desc, debito: val > 0 ? val : 0, credito: val < 0 ? -val : 0 });
    });
  }
  return rows;
}

function ImportModal({ exercicio, addEntry, onClose }: {
  exercicio: string;
  addEntry: (e: Omit<JournalEntry, "id" | "numero" | "criadoEm">) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<ImportFormat>("csv");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [manualCod, setManualCod]  = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualDeb, setManualDeb]  = useState("");
  const [manualCred, setManualCred] = useState("");

  const processFile = useCallback((file: File) => {
    setError("");
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      try {
        let parsed: ImportRow[] = [];
        if (format === "csv") parsed = parseCSV(text);
        else if (format === "saft") parsed = parseSAFT(text);
        else if (format === "xlsx") {
          setError("Para XLSX, exporte o ficheiro como CSV do Excel e importe como CSV.");
          return;
        }
        if (parsed.length === 0) { setError("Nenhuma linha válida encontrada. Verifique o formato do ficheiro."); return; }
        setRows(parsed);
        setStep("preview");
      } catch (ex) {
        setError(`Erro ao processar: ${ex instanceof Error ? ex.message : "Formato inválido"}`);
      }
    };
    reader.readAsText(file, "UTF-8");
  }, [format]);

  function addManualRow() {
    if (!manualCod.trim()) return;
    setRows(prev => [...prev, {
      codigo: manualCod.trim(),
      descricao: manualDesc.trim(),
      debito: parseFloat(manualDeb) || 0,
      credito: parseFloat(manualCred) || 0,
    }]);
    setManualCod(""); setManualDesc(""); setManualDeb(""); setManualCred("");
  }

  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  }

  function doImport() {
    if (rows.length === 0) return;
    const totalD = rows.reduce((s, r) => s + r.debito, 0);
    const totalC = rows.reduce((s, r) => s + r.credito, 0);
    addEntry({
      data: `${exercicio}-01-01`,
      descricao: `Saldos de Abertura ${exercicio} — Importação`,
      tipo: "OUTRO",
      modulo: "CONTABILIDADE",
      linhas: rows.map(r => ({
        conta: r.codigo + (r.descricao ? ` — ${r.descricao}` : ""),
        contaCod: r.codigo,
        descricao: `Saldo de abertura ${r.codigo}`,
        debito: r.debito,
        credito: r.credito,
      })),
      totalDebito: totalD,
      totalCredito: totalC,
      estado: "LANÇADO",
    });
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500 mt-1">{rows.length} contas importadas como saldos de abertura de {exercicio}.</p>
          </div>
        </div>
        <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
          <button className="btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {step === "upload" && (
            <>
              {/* Format selector */}
              <div>
                <label className="label">Formato do ficheiro</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(Object.keys(FORMAT_LABELS) as ImportFormat[]).map(f => (
                    <button key={f} onClick={() => setFormat(f)}
                      className={`px-3 py-2.5 text-xs rounded-xl border text-left transition-all ${
                        format === f ? "border-brand-500 bg-brand-50 text-brand-800 font-semibold" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}>
                      {FORMAT_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>

              {format !== "manual" ? (
                <>
                  {/* Drop zone */}
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-all"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
                  >
                    <div className="text-4xl mb-3">📂</div>
                    <p className="text-sm font-semibold text-gray-700">Clique para seleccionar ou arraste o ficheiro</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format === "csv" ? "Ficheiros .csv, .txt (colunas: Código, Descrição, Débito, Crédito)" : ""}
                      {format === "xlsx" ? "Exporte primeiro como CSV do Excel" : ""}
                      {format === "saft" ? "Ficheiro SAF-T Angola (.xml)" : ""}
                    </p>
                    <input ref={fileRef} type="file"
                      accept={format === "saft" ? ".xml" : ".csv,.txt,.xlsx"}
                      className="hidden"
                      onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
                    />
                  </div>

                  {/* CSV template */}
                  {format === "csv" && (
                    <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-600">
                      <p className="font-semibold text-gray-700 mb-1 not-italic font-sans">Formato esperado (exemplo):</p>
                      <p>Codigo;Descricao;Debito;Credito</p>
                      <p>43.1;Banco BFA C/C;108000000;0</p>
                      <p>51.1;Capital Subscrito;0;500000000</p>
                    </div>
                  )}
                </>
              ) : (
                /* Manual entry */
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Insira as contas manualmente, uma de cada vez.</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="label">Código</label>
                      <input className="input font-mono" placeholder="43.1" value={manualCod} onChange={e => setManualCod(e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <label className="label">Descrição</label>
                      <input className="input" placeholder="Banco BFA" value={manualDesc} onChange={e => setManualDesc(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Débito</label>
                      <input type="number" min={0} className="input" placeholder="0" value={manualDeb} onChange={e => setManualDeb(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Crédito</label>
                      <input type="number" min={0} className="input" placeholder="0" value={manualCred} onChange={e => setManualCred(e.target.value)} />
                    </div>
                  </div>
                  <button className="btn-secondary w-full" onClick={addManualRow} disabled={!manualCod.trim()}>
                    + Adicionar Linha
                  </button>
                  {rows.length > 0 && (
                    <button className="btn-primary w-full" onClick={() => setStep("preview")}>
                      Pré-visualizar ({rows.length} linhas)
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>
              )}
            </>
          )}

          {step === "preview" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">{rows.length} contas encontradas</p>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span>Total Débito: <strong className="font-mono text-blue-700">Kz {rows.reduce((s,r)=>s+r.debito,0).toLocaleString("pt-PT")}</strong></span>
                  <span>Total Crédito: <strong className="font-mono text-blue-700">Kz {rows.reduce((s,r)=>s+r.credito,0).toLocaleString("pt-PT")}</strong></span>
                </div>
              </div>

              {/* Balance warning */}
              {Math.abs(rows.reduce((s,r)=>s+r.debito,0) - rows.reduce((s,r)=>s+r.credito,0)) > 1 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>Os totais de débito e crédito não estão equilibrados. Verifique os valores antes de importar.</span>
                </div>
              )}

              <div className="overflow-x-auto border border-gray-100 rounded-xl max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Código</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Descrição</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Débito</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">Crédito</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-3 py-1.5 font-mono text-brand-700 font-semibold">{r.codigo}</td>
                        <td className="px-3 py-1.5 text-gray-700 truncate max-w-[180px]">{r.descricao}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{r.debito > 0 ? r.debito.toLocaleString("pt-PT") : "—"}</td>
                        <td className="px-3 py-1.5 text-right font-mono">{r.credito > 0 ? r.credito.toLocaleString("pt-PT") : "—"}</td>
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-between">
          <button className="btn-ghost text-sm" onClick={() => step === "preview" ? setStep("upload") : onClose}>
            {step === "preview" ? "← Voltar" : "Cancelar"}
          </button>
          {step === "preview" && (
            <button className="btn-primary" disabled={rows.length === 0} onClick={doImport}>
              Importar {rows.length} contas como Saldos de Abertura
            </button>
          )}
        </div>
    </div>
  );
}

/** Returns true if journalCod falls under balanceteCod hierarchy */
function matchAccount(journalCod: string, balanceteCod: string): boolean {
  return journalCod === balanceteCod || journalCod.startsWith(balanceteCod + ".");
}

const CL_COLORS: Record<number, string> = {
  1:"text-blue-700", 2:"text-green-700", 3:"text-purple-700", 4:"text-cyan-700",
  5:"text-yellow-700", 6:"text-emerald-700", 7:"text-red-700", 8:"text-slate-700",
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function BalancetePage() {
  const currentYear  = ANOS_DISPONIVEIS[0] ?? new Date().getFullYear().toString();
  const currentMonth = (["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"] as PeriodKey[])[new Date().getMonth()] ?? "jan";
  const [ano, setAno]             = useState(currentYear);
  const [periodo, setPeriodo]     = useState<PeriodKey>(currentMonth);
  const [dataIni, setDataIni]     = useState(`${currentYear}-01-01`);
  const [dataFim, setDataFim]     = useState(`${currentYear}-12-31`);
  const [showRange, setShowRange] = useState(false);
  const [rangeActive, setRangeActive] = useState(false);
  const [filterCl, setFilterCl]   = useState<number | null>(null);
  const [showZeros, setShowZeros] = useState(false);
  const [mode, setMode]           = useState<"demo" | "real">("real");

  const { entries, addEntry, loaded } = useJournal(ano);
  const { openWindow, closeWindow } = useWindowManager();
  const info = PERIODOS[periodo];

  // ── Helper: aggregate journal lines into a movements map ─────────────
  function buildMap(subset: typeof entries): Map<string, { mD: number; mC: number }> {
    const map = new Map<string, { mD: number; mC: number }>();
    subset.forEach(entry => {
      entry.linhas.forEach(line => {
        for (const dado of DADOS) {
          if (matchAccount(line.contaCod, dado.cod)) {
            const cur = map.get(dado.cod) ?? { mD: 0, mC: 0 };
            map.set(dado.cod, { mD: cur.mD + line.debito, mC: cur.mC + line.credito });
            break;
          }
        }
      });
    });
    return map;
  }

  // ── Opening balances: journal entries that describe "abertura" ─────────
  const aperturaMovements = useMemo(() => {
    if (mode !== "real") return new Map<string, { mD: number; mC: number }>();
    const aberEntries = entries.filter(e =>
      e.estado === "LANÇADO" &&
      e.data.startsWith(ano) &&
      e.descricao.toLowerCase().includes("abertura")
    );
    return buildMap(aberEntries);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, ano, mode]);

  // ── Period movements: journal entries for the selected period ──────────
  const journalMovements = useMemo(() => {
    if (mode !== "real") return new Map<string, { mD: number; mC: number }>();
    if (periodo === "abertura" || info.tipo === "especial") {
      return new Map<string, { mD: number; mC: number }>();
    }
    const subset = entries.filter(e => {
      if (e.estado !== "LANÇADO") return false;
      if (!e.data.startsWith(ano)) return false;
      if (e.descricao.toLowerCase().includes("abertura")) return false;
      if (rangeActive) {
        return e.data >= dataIni && e.data <= dataFim;
      }
      const periodMonths = info.months ?? [];
      const month = parseInt(e.data.slice(5, 7), 10);
      return periodMonths.includes(month);
    });
    return buildMap(subset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, ano, periodo, info, mode, rangeActive, dataIni, dataFim]);

  // ── Build final linhas — real mode drives ALL values from journal ───────
  const linhas = useMemo(() => {
    return DADOS
      .filter(l => filterCl === null || l.cl === filterCl)
      .map(l => {
        let siD: number, siC: number, mD: number, mC: number;

        if (mode === "demo") {
          // Demo: use hardcoded sample values as-is
          siD = l.siD; siC = l.siC; mD = l.mD; mC = l.mC;
        } else {
          // Real mode: everything from journal — zero by default
          siD = 0; siC = 0; mD = 0; mC = 0;

          if (periodo === "abertura") {
            // Abertura period: movements ARE the opening entries
            const ab = aperturaMovements.get(l.cod);
            if (ab) { mD = ab.mD; mC = ab.mC; }
          } else {
            // Other periods: SI from abertura entries, movements from period entries
            const ab = aperturaMovements.get(l.cod);
            if (ab) { siD = ab.mD; siC = ab.mC; }
            const jm = journalMovements.get(l.cod);
            if (jm) { mD = jm.mD; mC = jm.mC; }
          }
        }

        const net = (siD + mD) - (siC + mC);
        return {
          ...l,
          siD, siC, mD, mC,
          sfD: Math.max(0,  net),
          sfC: Math.max(0, -net),
        };
      })
      .filter(l => showZeros || (l.siD + l.siC + l.mD + l.mC > 0));
  }, [aperturaMovements, journalMovements, filterCl, showZeros, mode, periodo]);

  const totals = linhas.reduce(
    (acc, l) => ({ siD:acc.siD+l.siD, siC:acc.siC+l.siC, mD:acc.mD+l.mD, mC:acc.mC+l.mC, sfD:acc.sfD+l.sfD, sfC:acc.sfC+l.sfC }),
    { siD:0, siC:0, mD:0, mC:0, sfD:0, sfC:0 }
  );

  const equilibrado = Math.abs(totals.sfD - totals.sfC) < 1;
  const periodos = Object.keys(PERIODOS) as PeriodKey[];

  const journalCount   = mode === "real" ? journalMovements.size : 0;
  const aperturaCount  = mode === "real" ? aperturaMovements.size : 0;
  const lancadosCount  = entries.filter(e => e.estado === "LANÇADO").length;

  function handleXLSX() {
    const data = linhas.map(l => ({
      "Conta": l.cod,
      "Descrição": l.desc,
      "Cl.": l.cl,
      "SI Débito": l.siD || "",
      "SI Crédito": l.siC || "",
      "Mov. Débito": l.mD || "",
      "Mov. Crédito": l.mC || "",
      "SF Débito": l.sfD || "",
      "SF Crédito": l.sfC || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Balancete ${ano}`);
    XLSX.writeFile(wb, `EduContas_Balancete_${ano}_${info.label}.xlsx`);
  }

  function handlePrint() { window.print(); }

  function handleOpenImport() {
    const winId = `importar-saldos-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Importar Saldos de Abertura", icon: "📥",
      content: <ImportModal exercicio={ano} addEntry={addEntry} onClose={() => closeWindow(winId)} />,
      x: 40, y: 20, width: 900, height: 640, minimized: false, maximized: false,
    });
  }

  return (
    <div>
      <Topbar
        title="Balancete"
        subtitle={`${info.label} · ${ano} · ${info.desc}`}
        actions={
          <>
            <button className="btn-secondary" onClick={handleOpenImport}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importar Saldos
            </button>
            <button className="btn-secondary" onClick={handlePrint}>Exportar PDF</button>
            <button className="btn-secondary" onClick={handleXLSX}>Exportar XLSX</button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* ── Controls ── */}
        <div className="no-print card p-4 space-y-4">
          {/* Ano + modo + intervalo */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Exercício:</span>
              <div className="flex gap-1">
                {ANOS.map(y => (
                  <button key={y} onClick={() => setAno(y)}
                    className={`px-3 py-1 text-sm rounded-lg border font-semibold transition-colors ${
                      ano === y ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
                    }`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Source toggle */}
            <div className="flex items-center gap-1 bg-ink-100 rounded-lg p-1">
              <button onClick={() => setMode("real")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${mode === "real" ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-700"}`}>
                📊 Dados Reais do Diário
              </button>
              <button onClick={() => setMode("demo")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${mode === "demo" ? "bg-white text-brand-700 shadow-sm" : "text-ink-500 hover:text-ink-700"}`}>
                Demo
              </button>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 cursor-pointer">
                <input type="checkbox" checked={showZeros} onChange={e => setShowZeros(e.target.checked)} className="w-3.5 h-3.5" />
                Contas sem movimento
              </label>
              <button onClick={() => setShowRange(!showRange)}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {showRange ? "Ocultar intervalo" : "Filtro por datas"}
              </button>
            </div>
          </div>

          {/* Real mode status */}
          {mode === "real" && (
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
              lancadosCount > 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              {lancadosCount > 0 ? (
                <>
                  ✓ {lancadosCount} lançamento{lancadosCount !== 1 ? "s" : ""} no diário para {ano}
                  {aperturaCount > 0 && <> · {aperturaCount} contas com saldo de abertura</>}
                  {journalCount > 0 && <> · {journalCount} contas com movimento em {info.label}</>}
                </>
              ) : (
                <>○ Diário vazio para {ano} — todos os valores a zero. Lance saldos de abertura e movimentos do período.</>
              )}
            </div>
          )}

          {showRange && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-gray-600">Data Inicial:</span>
              <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
              <span className="text-gray-400 text-sm">—</span>
              <span className="text-xs font-semibold text-gray-600">Data Final:</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
              <button
                className="btn-primary py-1.5 px-4 text-sm"
                onClick={() => setRangeActive(true)}
              >
                Aplicar
              </button>
              {rangeActive && (
                <button
                  className="btn-ghost py-1.5 px-3 text-sm text-gray-500"
                  onClick={() => setRangeActive(false)}
                >
                  ✕ Limpar filtro
                </button>
              )}
            </div>
          )}

          {/* Period tabs */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              Tipo de Balancete — {periodos.length} períodos disponíveis
            </p>
            <div className="flex flex-wrap gap-1.5">
              {periodos.map(k => {
                const p   = PERIODOS[k];
                const act = periodo === k;
                const cls =
                  p.tipo === "abertura"
                    ? act ? "bg-blue-600 text-white border-blue-600 shadow-sm"   : "text-blue-700 border-blue-300 hover:bg-blue-50"
                    : p.tipo === "especial"
                    ? act ? "bg-amber-600 text-white border-amber-600 shadow-sm" : "text-amber-700 border-amber-300 hover:bg-amber-50"
                    : act ? "bg-brand-600 text-white border-brand-600 shadow-sm" : "text-gray-700 border-gray-300 hover:bg-gray-50";
                return (
                  <button key={k} onClick={() => { setPeriodo(k); setRangeActive(false); }} title={p.desc}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${cls}`}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classe filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Filtrar por Classe:</span>
            {([null, 1, 2, 3, 4, 5, 6, 7, 8, 9] as (number | null)[]).map(c => (
              <button key={c ?? 0} onClick={() => setFilterCl(c)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  filterCl === c
                    ? "bg-brand-600 text-white border-brand-600"
                    : "text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>
                {c === null ? "Todas" : `Classe ${c}`}
              </button>
            ))}
          </div>
        </div>

        {/* ── Special period banner ── */}
        {info.tipo !== "normal" && (
          <div className={`no-print card p-3 flex items-start gap-3 border ${
            info.tipo === "abertura" ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"
          }`}>
            <svg className={`w-5 h-5 shrink-0 mt-0.5 ${info.tipo === "abertura" ? "text-blue-600" : "text-amber-600"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className={`font-bold text-sm ${info.tipo === "abertura" ? "text-blue-800" : "text-amber-800"}`}>
                {info.label} — {info.desc}
              </p>
              <p className={`text-xs mt-0.5 ${info.tipo === "abertura" ? "text-blue-600" : "text-amber-600"}`}>
                {periodo === "abertura" && "Saldos reportados do exercício anterior após aprovação de contas."}
                {periodo === "m13" && "Período de regularizações: provisões, acréscimos, diferimentos, ajustamentos de inventário."}
                {periodo === "m14" && "Período de apuramento: transferências dos saldos Cl. 6/7 para Cl. 8 (Resultados)."}
                {periodo === "m15" && "Período de encerramento: distribuição de dividendos, resultados transitados."}
              </p>
            </div>
          </div>
        )}

        {/* ── Balance check ── */}
        <div className={`no-print card p-3 flex items-center gap-3 border ${
          equilibrado ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
        }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            equilibrado ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}>
            {equilibrado
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            }
          </div>
          <div className="flex-1">
            <p className={`font-bold text-sm ${equilibrado ? "text-green-800" : "text-red-800"}`}>
              {equilibrado
                ? "Balancete Equilibrado — Total Devedores = Total Credores"
                : "Balancete Desequilibrado — Verificar lançamentos contabilísticos"
              }
            </p>
            <p className={`text-xs ${equilibrado ? "text-green-600" : "text-red-600"}`}>
              {equilibrado
                ? `Princípio das partidas dobradas verificado · PGCA Decreto n.º 82/01 · ${info.label} ${ano} · ${mode === "real" ? "Dados Reais" : "Demo"}`
                : `Diferença apurada: ${Math.abs(totals.sfD - totals.sfC).toLocaleString("pt-PT")} Kz`
              }
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Saldo Final Total</p>
            <p className="font-mono font-bold text-sm text-gray-900">{totals.sfD.toLocaleString("pt-PT")} Kz</p>
          </div>
        </div>

        {/* ── Document header ── */}
        <div className="bg-white border border-gray-200 rounded-t-xl border-b-0 px-6 py-3 flex items-center justify-between gap-6 border-b-2 border-gray-900">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded bg-[#1a2744] flex items-center justify-center shrink-0">
              <span className="text-white text-[9px] font-bold tracking-widest">ASE</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wide leading-tight">Empresa Demo Lda.</p>
              <p className="text-[10px] text-gray-500 leading-tight">NIF 5000123456 · Luanda, Angola</p>
            </div>
          </div>
          <div className="flex-1 text-center">
            <p className="text-[12px] font-bold text-gray-900 uppercase tracking-widest leading-tight">
              Balancete — {info.label} {ano}
            </p>
            <p className="text-[10px] text-gray-500 leading-tight mt-0.5">
              {info.desc} &nbsp;·&nbsp; Valores em AOA &nbsp;·&nbsp; PGCA Angola — Decreto n.º 82/01
            </p>
          </div>
          <span className={`no-print shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            mode === "real" ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${mode === "real" ? "bg-green-500" : "bg-amber-500"}`} />
            {mode === "real" ? "Real" : "Demo"}
          </span>
        </div>

        {/* ── Table ── */}
        <div className="card rounded-t-none border-t-0">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3>Balancete — {info.label} {ano}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {linhas.length} contas · {info.desc} · {mode === "real" ? "Fonte: Diário Real" : "Fonte: Demonstração"} · Valores em Kwanza (Kz)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${mode === "real" ? "badge-green" : "badge-gray"} text-[10px]`}>
                {mode === "real" ? "REAL" : "DEMO"}
              </span>
              <span className="badge badge-blue">{linhas.length} contas</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th rowSpan={2} className="text-left px-3 py-2 border-b-2 border-r border-gray-200 font-bold text-gray-700 whitespace-nowrap">Código</th>
                  <th rowSpan={2} className="text-left px-3 py-2 border-b-2 border-r border-gray-200 font-bold text-gray-700 min-w-[240px]">Designação da Conta</th>
                  <th rowSpan={2} className="text-center px-2 py-2 border-b-2 border-r border-gray-200 font-bold text-gray-600 w-8">Cl.</th>
                  <th colSpan={2} className="text-center px-3 py-1.5 border-b border-r border-gray-200 font-bold text-blue-700 bg-blue-50">
                    Saldo Inicial
                  </th>
                  <th colSpan={2} className="text-center px-3 py-1.5 border-b border-r border-gray-200 font-bold text-green-700 bg-green-50">
                    Movimentos do Período
                  </th>
                  <th colSpan={2} className="text-center px-3 py-1.5 border-b border-gray-200 font-bold text-brand-700 bg-brand-50">
                    Saldo Final
                  </th>
                </tr>
                <tr className="bg-gray-50">
                  <th className="text-right px-3 py-1.5 border-b-2 border-r border-gray-200 font-semibold text-blue-600 bg-blue-50 whitespace-nowrap">Devedor</th>
                  <th className="text-right px-3 py-1.5 border-b-2 border-r border-gray-200 font-semibold text-blue-600 bg-blue-50 whitespace-nowrap">Credor</th>
                  <th className="text-right px-3 py-1.5 border-b-2 border-r border-gray-200 font-semibold text-green-600 bg-green-50 whitespace-nowrap">Débito</th>
                  <th className="text-right px-3 py-1.5 border-b-2 border-r border-gray-200 font-semibold text-green-600 bg-green-50 whitespace-nowrap">Crédito</th>
                  <th className="text-right px-3 py-1.5 border-b-2 border-r border-gray-200 font-semibold text-brand-700 bg-brand-50 whitespace-nowrap">Devedor</th>
                  <th className="text-right px-3 py-1.5 border-b-2 border-gray-200 font-semibold text-brand-700 bg-brand-50 whitespace-nowrap">Credor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {linhas.map(l => (
                  <tr key={l.cod} className={`hover:bg-gray-50/80 transition-colors ${
                    mode === "real" && journalMovements.has(l.cod) ? "bg-green-50/30" : ""
                  }`}>
                    <td className="px-3 py-2 font-mono font-bold text-brand-700 whitespace-nowrap border-r border-gray-100">
                      {l.cod}
                      {mode === "real" && journalMovements.has(l.cod) && (
                        <span className="ml-1 text-[9px] text-green-600 font-bold">●</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700 border-r border-gray-100">{l.desc}</td>
                    <td className={`px-2 py-2 text-center font-bold border-r border-gray-100 ${CL_COLORS[l.cl]}`}>{l.cl}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-600 border-r border-gray-100">{fmtN(l.siD)}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-600 border-r border-gray-100">{fmtN(l.siC)}</td>
                    <td className={`px-3 py-2 text-right font-mono border-r border-gray-100 ${l.mD > 0 ? "text-green-700 font-semibold" : "text-gray-600"}`}>{fmtN(l.mD)}</td>
                    <td className={`px-3 py-2 text-right font-mono border-r border-gray-100 ${l.mC > 0 ? "text-green-700 font-semibold" : "text-gray-600"}`}>{fmtN(l.mC)}</td>
                    <td className={`px-3 py-2 text-right font-mono font-semibold border-r border-gray-100 ${l.sfD > 0 ? "text-gray-900" : "text-gray-300"}`}>
                      {fmtN(l.sfD)}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono font-semibold ${l.sfC > 0 ? "text-gray-900" : "text-gray-300"}`}>
                      {fmtN(l.sfC)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-brand-700 text-white">
                  <td colSpan={3} className="px-3 py-3 font-bold text-sm uppercase tracking-wider">TOTAIS</td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{totals.siD.toLocaleString("pt-PT")}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{totals.siC.toLocaleString("pt-PT")}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{totals.mD.toLocaleString("pt-PT")}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{totals.mC.toLocaleString("pt-PT")}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{totals.sfD.toLocaleString("pt-PT")}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold">{totals.sfC.toLocaleString("pt-PT")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Signature block ── */}
        <div className="bg-white border border-gray-200 rounded-b-xl border-t-0 px-6 py-4 bg-gray-50/60 border-t border-gray-300">
          <div className="grid grid-cols-3 gap-4 items-end">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-7">O Contabilista Certificado (CC):</p>
              <div className="border-b border-gray-500 mb-1.5" />
              <p className="text-[10px] text-gray-600">Nome: <span className="inline-block w-32 border-b border-dotted border-gray-400" />&ensp;N.º CC: <span className="inline-block w-16 border-b border-dotted border-gray-400" /></p>
            </div>
            <div className="text-center pb-0.5">
              <p className="text-[10px] text-gray-500">
                Luanda, <span className="inline-block w-6 border-b border-dotted border-gray-400 align-bottom" /> de{" "}
                <span className="inline-block w-20 border-b border-dotted border-gray-400 align-bottom" /> de {ano}
              </p>
              <p className="text-[9px] text-gray-400 mt-1">
                EduContas ERP · PGCA Angola — Decreto n.º 82/01 · NIF 5000123456
                {mode === "real" && entries.length > 0 && ` · ${entries.length} lançamentos`}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-7">O Gerente / Administrador:</p>
              <div className="border-b border-gray-500 mb-1.5" />
              <p className="text-[10px] text-gray-600">Nome: <span className="inline-block w-32 border-b border-dotted border-gray-400" />&ensp;Cargo: <span className="inline-block w-16 border-b border-dotted border-gray-400" /></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
