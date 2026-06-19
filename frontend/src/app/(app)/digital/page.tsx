"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Topbar from "@/components/Topbar";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = "idle" | "uploading" | "ocr" | "ai" | "ready" | "posted";

type BatchEstado = "FILA" | "PROCESSANDO" | "PRONTO" | "LANÇADO" | "REVISÃO" | "ERRO";

interface BatchItem {
  id: string;
  nome: string;
  data: string;
  valor: string;
  confianca: number;
  estado: BatchEstado;
}

// ── Static data ───────────────────────────────────────────────────────────────

const fakeExtracted = {
  tipo: "Factura de Compra",
  confianca: 97,
  fornecedor: "Distribuidora Sul Lda.",
  nif_forn: "5012345678",
  numero: "FC/2024/002211",
  data: "02/12/2024",
  descricao: "Fornecimento de mercadorias diversas",
  linhas: [
    { desc: "Computadores Dell Inspiron 15",  qty: 2, pu: "350.000",  total: "700.000" },
    { desc: "Cabos HDMI 2m (Pack 10)",        qty: 3, pu: "45.000",   total: "135.000" },
    { desc: "Teclados e ratos (kit)",          qty: 5, pu: "18.500",   total: "92.500"  },
  ],
  subtotal: "927.500",
  iva_base: "927.500",
  iva_taxa: "14%",
  iva_valor: "129.850",
  total: "1.057.350",
};

const sugestaoCont = [
  { tipo: "D", conta: "32.1",   desc: "Fornecedores Nacionais — C/C",  valor: "1.057.350", conf: 99 },
  { tipo: "D", conta: "34.5.1", desc: "IVA Dedutível",                  valor: "129.850",   conf: 98 },
  { tipo: "C", conta: "26",     desc: "Mercadorias",                    valor: "927.500",   conf: 96 },
  { tipo: "C", conta: "34.5.3", desc: "IVA Liquidado",                  valor: "129.850",   conf: 98 },
];

const steps: { key: Stage; label: string }[] = [
  { key: "uploading", label: "A carregar ficheiro…" },
  { key: "ocr",       label: "OCR — a extrair texto…" },
  { key: "ai",        label: "IA — a identificar contas PGCA…" },
  { key: "ready",     label: "Pronto para lançamento" },
];

// Initial demo batch queue
const SEED_BATCH: BatchItem[] = [
  { id: "b1", nome: "FC_SulLda_Nov30.pdf",     estado: "LANÇADO",     valor: "842.500",   data: "30/11", confianca: 98 },
  { id: "b2", nome: "FT_Angola_Cables.pdf",    estado: "LANÇADO",     valor: "5.700.000", data: "27/11", confianca: 95 },
  { id: "b3", nome: "Extracto_BFA_Nov.xlsx",   estado: "PRONTO",      valor: "—",         data: "01/12", confianca: 100 },
  { id: "b4", nome: "Recibo_Canteen_001.jpg",  estado: "REVISÃO",     valor: "45.000",    data: "02/12", confianca: 72 },
];

// ── Badge helpers ─────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<BatchEstado, { cls: string; label: string }> = {
  FILA:         { cls: "bg-gray-100 text-gray-600",    label: "FILA" },
  PROCESSANDO:  { cls: "bg-blue-100 text-blue-700",    label: "A PROCESSAR" },
  PRONTO:       { cls: "bg-aqua-100 text-aqua-700",    label: "PRONTO" },
  LANÇADO:      { cls: "bg-green-100 text-green-700",  label: "LANÇADO" },
  REVISÃO:      { cls: "bg-yellow-100 text-yellow-700",label: "REVISÃO" },
  ERRO:         { cls: "bg-red-100 text-red-700",      label: "ERRO" },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DigitalPage() {
  // ── Single upload state ────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [activeTab, setActiveTab] = useState<"upload" | "batch">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  function simulateProcessing(name: string) {
    setFileName(name);
    setStage("uploading");
    setTimeout(() => setStage("ocr"),   1200);
    setTimeout(() => setStage("ai"),    2800);
    setTimeout(() => setStage("ready"), 4400);
  }

  function handleFile(file: File) { simulateProcessing(file.name); }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handlePost() { setStage("posted"); }
  function handleReset() { setStage("idle"); setFileName(""); }

  const stageIdx = steps.findIndex(s => s.key === stage);

  // ── Batch state ────────────────────────────────────────────────────────────
  const [batchItems, setBatchItems] = useState<BatchItem[]>(SEED_BATCH);
  const batchRef = useRef<HTMLInputElement>(null);

  /** Simulate per-item OCR/AI processing */
  const simulateBatchItem = useCallback((id: string) => {
    // 0.5s → PROCESSANDO
    setTimeout(() => {
      setBatchItems(prev => prev.map(b => b.id === id ? { ...b, estado: "PROCESSANDO" } : b));
    }, 500);
    // random 2–5s → PRONTO or REVISÃO
    const delay = 2000 + Math.random() * 3000;
    setTimeout(() => {
      setBatchItems(prev => prev.map(b => {
        if (b.id !== id) return b;
        const conf = Math.floor(65 + Math.random() * 35);
        return {
          ...b,
          confianca: conf,
          valor: `${(Math.floor(Math.random() * 9000) + 500).toLocaleString("pt-PT")}.000`,
          estado: conf >= 80 ? "PRONTO" : "REVISÃO",
        };
      }));
    }, delay);
  }, []);

  function handleBatchFiles(files: FileList) {
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}`;

    const newItems: BatchItem[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      nome: file.name,
      data: dateStr,
      valor: "—",
      confianca: 0,
      estado: "FILA" as BatchEstado,
    }));

    setBatchItems(prev => [...newItems, ...prev]);

    // Stagger simulations so they don't all start at once
    newItems.forEach((item, i) => {
      setTimeout(() => simulateBatchItem(item.id), i * 600);
    });
  }

  function handleLancar(id: string) {
    setBatchItems(prev => prev.map(b => b.id === id ? { ...b, estado: "LANÇADO" } : b));
  }

  function handleRemover(id: string) {
    setBatchItems(prev => prev.filter(b => b.id !== id));
  }

  // Counts
  const emFila       = batchItems.filter(b => b.estado === "FILA" || b.estado === "PROCESSANDO").length;
  const prontos      = batchItems.filter(b => b.estado === "PRONTO").length;
  const lancados     = batchItems.filter(b => b.estado === "LANÇADO").length;

  return (
    <div>
      <Topbar
        title="Contabilidade Digital"
        subtitle="Carregue qualquer documento — OCR + IA contabiliza automaticamente"
        actions={
          <div className="flex items-center gap-2">
            <span className="badge-gold badge text-[11px]">IA Activa</span>
            <span className="text-xs text-ink-400">Precisão média: 97,2%</span>
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* Hero stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Documentos processados",  value: "1.247",   sub: "este mês",    color: "text-ink-900" },
            { label: "Taxa de acerto IA",        value: "97,2%",   sub: "médio",       color: "text-green-600" },
            { label: "Tempo poupado",            value: "~47h",    sub: "este mês",    color: "text-aqua-600" },
            { label: "Lançamentos automáticos",  value: "1.180",   sub: "aprovados",   color: "text-gold-600" },
          ].map((k) => (
            <div key={k.label} className="card p-4">
              <p className="text-[11px] text-ink-400 uppercase tracking-wide font-semibold">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
              <p className="text-xs text-ink-400 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-ink-100 rounded-xl p-1 w-fit">
          {(["upload", "batch"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === t ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700"
              }`}
            >
              {t === "upload" ? "Carregar Documento" : (
                <span className="flex items-center gap-1.5">
                  Processamento em Lote
                  {emFila > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] font-bold">
                      {emFila}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Upload Tab ─────────────────────────────────────────────────────── */}
        {activeTab === "upload" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="space-y-4">
              {stage === "idle" && (
                <div
                  className={`drop-zone ${dragOver ? "drop-zone-active" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-ink-700">Arraste o documento aqui</p>
                    <p className="text-sm text-ink-400 mt-0.5">ou clique para seleccionar</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["PDF", "JPG", "PNG", "XLSX", "CSV", "OFX"].map((f) => (
                      <span key={f} className="badge-gray text-[10px]">{f}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-ink-400">Facturas · Recibos · Extractos bancários · Notas de crédito</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv,.ofx"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>
              )}

              {stage !== "idle" && stage !== "posted" && (
                <div className="card p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900 text-sm">{fileName || "documento.pdf"}</p>
                      <p className="text-xs text-ink-400">A processar…</p>
                    </div>
                    <div className="ml-auto">
                      {stage === "ready"
                        ? <span className="badge-green">Pronto</span>
                        : <span className="badge-aqua animate-pulse">A processar</span>
                      }
                    </div>
                  </div>
                  <div className="space-y-2">
                    {steps.map((s, i) => {
                      const done   = stageIdx > i || stage === "ready";
                      const active = stageIdx === i && stage !== "ready";
                      return (
                        <div key={s.key} className="flex items-center gap-3">
                          <div className={`step-dot ${done ? "step-dot-done" : active ? "step-dot-active" : "step-dot-idle"}`}>
                            {done ? "✓" : i + 1}
                          </div>
                          <p className={`text-sm ${done ? "text-green-700 font-medium" : active ? "text-brand-700 font-semibold" : "text-ink-400"}`}>
                            {s.label}
                          </p>
                          {active && (
                            <svg className="w-4 h-4 text-brand-500 animate-spin ml-auto" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {stage === "posted" && (
                <div className="card p-8 text-center border-green-200 bg-green-50">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-bold text-green-800 mt-4">Lançamento Efectuado!</p>
                  <p className="text-sm text-green-600 mt-1">DI/2024/000343 gerado automaticamente</p>
                  <p className="text-xs text-green-500 mt-0.5">D:32.1 · D:34.5.1 · C:26 · C:34.5.3 — Equilíbrio: ✓</p>
                  <button onClick={handleReset} className="btn-secondary mt-4 mx-auto">Carregar Outro Documento</button>
                </div>
              )}

              {stage === "idle" && (
                <div className="card p-4">
                  <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-3">Capacidades de Reconhecimento</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { icon: "📄", label: "Facturas de compra/venda" },
                      { icon: "🏦", label: "Extractos bancários BFA/BAI/BIC" },
                      { icon: "🧾", label: "Recibos e notas de crédito" },
                      { icon: "💰", label: "Folhas de salário" },
                      { icon: "📊", label: "Ficheiros Excel (XLSX/CSV)" },
                      { icon: "🔁", label: "Transferências OFX/MT940" },
                      { icon: "📷", label: "Fotos de recibos (câmara)" },
                      { icon: "📋", label: "Declarações AGT" },
                    ].map((c) => (
                      <div key={c.label} className="flex items-center gap-2 text-ink-600">
                        <span>{c.icon}</span><span>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Resultado OCR + Sugestão */}
            <div className="space-y-4">
              {(stage === "ready" || stage === "posted") ? (
                <>
                  <div className="card">
                    <div className="card-header flex items-center justify-between">
                      <h3>Dados Extraídos por OCR</h3>
                      <span className="badge-green text-[11px]">{fakeExtracted.confianca}% confiança</span>
                    </div>
                    <div className="card-body space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {[
                          ["Tipo",       fakeExtracted.tipo],
                          ["Fornecedor", fakeExtracted.fornecedor],
                          ["NIF",        fakeExtracted.nif_forn],
                          ["Nº Doc.",    fakeExtracted.numero],
                          ["Data",       fakeExtracted.data],
                          ["Subtotal",   fakeExtracted.subtotal + " AOA"],
                          ["IVA (14%)",  fakeExtracted.iva_valor + " AOA"],
                          ["TOTAL",      fakeExtracted.total + " AOA"],
                        ].map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-ink-400 text-xs w-20 shrink-0">{k}</span>
                            <span className="font-medium text-ink-800 text-xs">{v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-ink-100 pt-2 mt-2">
                        <p className="text-[11px] text-ink-400 font-semibold uppercase tracking-wide mb-1.5">Linhas detectadas</p>
                        {fakeExtracted.linhas.map((l, i) => (
                          <div key={i} className="flex justify-between text-xs py-1 border-b border-ink-50 last:border-0">
                            <span className="text-ink-600 flex-1 truncate">{l.qty}× {l.desc}</span>
                            <span className="font-mono font-semibold text-ink-800 ml-2">{l.total} Kz</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header flex items-center justify-between">
                      <h3>Lançamento Sugerido pela IA</h3>
                      <span className="badge-aqua text-[11px]">PGCA automático</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="table-auto w-full">
                        <thead>
                          <tr>
                            <th>D/C</th><th>Conta</th><th>Descrição</th>
                            <th className="text-right">Valor AOA</th><th>Conf.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sugestaoCont.map((r, i) => (
                            <tr key={i}>
                              <td>
                                <span className={`badge text-[10px] font-bold ${r.tipo === "D" ? "badge-red" : "badge-green"}`}>
                                  {r.tipo}
                                </span>
                              </td>
                              <td className="font-mono font-bold text-brand-700">{r.conta}</td>
                              <td className="text-sm text-ink-700">{r.desc}</td>
                              <td className="text-right font-mono text-sm">{r.valor}</td>
                              <td>
                                <span className={`text-xs font-semibold ${r.conf >= 95 ? "text-green-600" : "text-gold-600"}`}>
                                  {r.conf}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {stage !== "posted" && (
                      <div className="p-4 border-t border-ink-100 flex items-center justify-end gap-3">
                        <button onClick={handleReset} className="btn-secondary text-sm">Descartar</button>
                        <button onClick={handlePost} className="btn-primary text-sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Lançar no Diário
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="card p-10 flex flex-col items-center justify-center text-center gap-3 h-full min-h-[280px]">
                  <div className="w-14 h-14 bg-ink-100 rounded-2xl flex items-center justify-center mb-2">
                    <svg className="w-7 h-7 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <p className="text-ink-400 font-medium">O resultado aparece aqui</p>
                  <p className="text-sm text-ink-300 mt-1">Após carregar um documento, a IA extrai os dados e sugere o lançamento contabilístico correcto</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Batch Tab ──────────────────────────────────────────────────────── */}
        {activeTab === "batch" && (
          <div className="space-y-4">
            {/* Batch KPIs */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Em fila / a processar", value: emFila,   color: "text-brand-700" },
                { label: "Prontos para lançar",   value: prontos,  color: "text-aqua-700" },
                { label: "Lançados",              value: lancados, color: "text-green-700" },
              ].map(k => (
                <div key={k.label} className="card p-3 text-center">
                  <p className="text-[11px] text-ink-400 uppercase tracking-wide font-semibold">{k.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Batch queue card */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div>
                  <h3>Fila de Processamento em Lote</h3>
                  <p className="text-xs text-ink-400 mt-0.5">{batchItems.length} documento{batchItems.length !== 1 ? "s" : ""} na fila</p>
                </div>
                <div className="flex items-center gap-2">
                  {prontos > 0 && (
                    <button
                      className="btn-secondary text-xs py-1.5"
                      onClick={() => setBatchItems(prev =>
                        prev.map(b => b.estado === "PRONTO" ? { ...b, estado: "LANÇADO" } : b)
                      )}
                    >
                      Lançar Todos ({prontos})
                    </button>
                  )}
                  {/* Hidden multi-file input */}
                  <input
                    ref={batchRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv,.ofx"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files?.length) {
                        handleBatchFiles(e.target.files);
                        e.target.value = ""; // reset so same file can be re-added
                      }
                    }}
                  />
                  <button
                    className="btn-primary text-xs py-1.5"
                    onClick={() => batchRef.current?.click()}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar Documentos
                  </button>
                </div>
              </div>

              {batchItems.length === 0 ? (
                <div
                  className="p-12 flex flex-col items-center gap-3 text-center cursor-pointer hover:bg-ink-50 transition-colors"
                  onClick={() => batchRef.current?.click()}
                >
                  <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="font-medium text-ink-500">Nenhum documento na fila</p>
                  <p className="text-sm text-ink-400">Clique para seleccionar vários ficheiros de uma vez</p>
                  <p className="text-xs text-ink-300">PDF · JPG · PNG · XLSX · CSV · OFX</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-auto w-full">
                    <thead>
                      <tr>
                        <th>Ficheiro</th>
                        <th>Data</th>
                        <th className="text-right">Valor (Kz)</th>
                        <th>Confiança</th>
                        <th>Estado</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchItems.map((d) => {
                        const badge = ESTADO_BADGE[d.estado];
                        const isProcessing = d.estado === "FILA" || d.estado === "PROCESSANDO";
                        return (
                          <tr key={d.id} className={isProcessing ? "opacity-70" : ""}>
                            <td className="flex items-center gap-2">
                              {isProcessing ? (
                                <svg className="w-4 h-4 text-brand-500 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                              <span className="font-mono text-xs text-ink-700 truncate max-w-[200px]">{d.nome}</span>
                            </td>
                            <td className="text-xs text-ink-500">{d.data}</td>
                            <td className="text-right font-mono text-sm">{d.valor}</td>
                            <td>
                              {isProcessing ? (
                                <span className="text-xs text-ink-400">—</span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <div className="stat-bar w-16">
                                    <div
                                      className={`stat-bar-fill ${d.confianca >= 90 ? "bg-green-400" : d.confianca >= 75 ? "bg-gold-400" : "bg-brand-500"}`}
                                      style={{ width: `${d.confianca}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-ink-400">{d.confianca}%</span>
                                </div>
                              )}
                            </td>
                            <td>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                {d.estado === "PRONTO" && (
                                  <button
                                    onClick={() => handleLancar(d.id)}
                                    className="btn-primary py-1 px-2 text-[11px]"
                                  >
                                    Lançar
                                  </button>
                                )}
                                {d.estado === "REVISÃO" && (
                                  <button className="btn-secondary py-1 px-2 text-[11px] text-yellow-700 border-yellow-200">
                                    Rever
                                  </button>
                                )}
                                {(d.estado === "LANÇADO" || d.estado === "PRONTO" || d.estado === "REVISÃO" || d.estado === "ERRO") && (
                                  <button
                                    onClick={() => handleRemover(d.id)}
                                    className="btn-ghost py-1 px-1.5 text-xs text-ink-400 hover:text-red-500"
                                    title="Remover da fila"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Drag-and-drop zone for batch */}
            <div
              className="border-2 border-dashed border-ink-200 rounded-2xl p-6 flex flex-col items-center gap-2 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-colors"
              onClick={() => batchRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (e.dataTransfer.files.length) handleBatchFiles(e.dataTransfer.files);
              }}
            >
              <svg className="w-8 h-8 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-ink-500 font-medium">Arraste vários ficheiros aqui para adicionar ao lote</p>
              <p className="text-xs text-ink-400">PDF · JPG · PNG · XLSX · CSV · OFX — sem limite de ficheiros</p>
            </div>
          </div>
        )}

        {/* Diferenciais de mercado */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "⚡", title: "97% precisão",     desc: "Motor OCR treinado em documentos Angola (AGT, BFA, BAI, BIC, NIF)",         color: "card-gold" },
            { icon: "🔒", title: "100% local / nuvem",desc: "Funciona offline (modo Angola). Os dados nunca saem do seu servidor.",       color: "card-aqua" },
            { icon: "📱", title: "Câmara móvel",      desc: "Fotografe um recibo com o telemóvel — o sistema contabiliza em segundos.",   color: "card-red" },
          ].map((f) => (
            <div key={f.title} className={`${f.color} p-5`}>
              <span className="text-2xl">{f.icon}</span>
              <p className="font-bold text-ink-900 mt-2">{f.title}</p>
              <p className="text-sm text-ink-600 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
