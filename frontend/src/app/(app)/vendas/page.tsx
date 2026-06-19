"use client";

import { useState, useMemo, useCallback } from "react";
import Topbar from "@/components/Topbar";
import { useJournal } from "@/lib/journal";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { useQuickActions } from "@/components/quickActions/useQuickActions";
import { useWindowManager } from "@/lib/windowManager";
import { useCollection } from "@/lib/useCollection";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FacturaLine {
  descricao: string;
  qtd: number;
  preco: number;
  iva: number; // %
}

interface Factura {
  id: string;
  numero: string;      // TIPO/YYYY/NNNNNN
  tipo: "FT" | "FR" | "FA" | "FG" | "FGL" | "NC" | "ND" | "TV" | "AF" | "RC" | "RG";
  data: string;
  cliente: string;
  nif: string;
  linhas: FacturaLine[];
  subtotal: number;
  ivaTotal: number;
  total: number;
  pago: number;
  estado: "RASCUNHO" | "LANÇADO" | "PARCIAL" | "LIQUIDADO" | "ANULADO";
  diarioRef?: string; // journal entry numero
  docOrigemRef?: string; // for NC/ND: reference to original document
  criadoEm: string;
}

// ── Document type constants ────────────────────────────────────────────────────
const TIPO_LABELS: Record<string, string> = {
  FT:  "Factura",
  FR:  "Factura-Recibo",
  FA:  "Factura de Adiantamento",
  FG:  "Factura Genérica",
  FGL: "Factura Global",
  NC:  "Nota de Crédito",
  ND:  "Nota de Débito",
  TV:  "Talão de Venda",
  AF:  "Auto-Facturação",
  RC:  "Recibo",
  RG:  "Outros Recibos",
};

const TIPO_COLOR: Record<string, string> = {
  FT:  "bg-blue-100 text-blue-700",
  FR:  "bg-blue-100 text-blue-700",
  FA:  "bg-purple-100 text-purple-700",
  FG:  "bg-indigo-100 text-indigo-700",
  FGL: "bg-indigo-100 text-indigo-700",
  NC:  "bg-green-100 text-green-700",
  ND:  "bg-orange-100 text-orange-700",
  TV:  "bg-yellow-100 text-yellow-700",
  AF:  "bg-purple-100 text-purple-700",
  RC:  "bg-green-100 text-green-700",
  RG:  "bg-green-100 text-green-700",
};

// ── Hook ───────────────────────────────────────────────────────────────────────
function useFacturas(exercicio: string) {
  const seed = exercicio === "2024" ? SEED_FACTURAS_2024 : [];
  const { items: facturas, setItems: setFacturas } = useCollection<Factura>(
    `educontas-vendas-${exercicio}`,
    seed,
  );

  const nextNum = (prev: Factura[], tipo: string) => {
    const docs = prev.filter(f => (f.tipo ?? "FT") === tipo);
    const nums = docs.map(f => parseInt(f.numero.split("/")[2] ?? "0", 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : (tipo === "FT" ? 1198 : 0);
    return `${tipo}/${exercicio}/${(max + 1).toString().padStart(6, "0")}`;
  };

  const addFactura = useCallback((draft: Omit<Factura, "id" | "numero" | "criadoEm">) => {
    setFacturas(prev => {
      const numero = nextNum(prev, draft.tipo ?? "FT");
      const f: Factura = {
        ...draft, id: crypto.randomUUID(), numero, criadoEm: new Date().toISOString(),
      };
      return [f, ...prev];
    });
  }, [setFacturas, exercicio]); // eslint-disable-line react-hooks/exhaustive-deps

  const marcarPago = useCallback((id: string, valor: number) => {
    setFacturas(prev => prev.map(f => {
      if (f.id !== id) return f;
      const newPago = Math.min(f.pago + valor, f.total);
      const estado: Factura["estado"] =
        newPago >= f.total ? "LIQUIDADO" : newPago > 0 ? "PARCIAL" : f.estado;
      return { ...f, pago: newPago, estado };
    }));
  }, [setFacturas]);

  const deleteFactura = useCallback((id: string) => {
    setFacturas(prev => prev.filter(f => f.id !== id));
  }, [setFacturas]);

  const updateFactura = useCallback((id: string, patch: Partial<Factura>) => {
    setFacturas(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }, [setFacturas]);

  return { facturas, addFactura, marcarPago, deleteFactura, updateFactura };
}

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_FACTURAS_2024: Factura[] = [
  {
    id: "ft-1201", numero: "FT/2024/001201", tipo: "FT", data: "2024-11-30",
    cliente: "Petrangol SA", nif: "5400123456",
    linhas: [{ descricao: "Prestação de serviços de consultoria", qtd: 1, preco: 10000000, iva: 14 }],
    subtotal: 10000000, ivaTotal: 1400000, total: 11400000, pago: 11400000,
    estado: "LIQUIDADO", diarioRef: "DI/2024/000342", criadoEm: "2024-11-30T10:00:00Z",
  },
  {
    id: "ft-1200", numero: "FT/2024/001200", tipo: "FT", data: "2024-11-27",
    cliente: "Sonangol EP", nif: "5400098765",
    linhas: [{ descricao: "Fornecimento de material técnico", qtd: 5, preco: 5000000, iva: 14 }],
    subtotal: 25000000, ivaTotal: 3500000, total: 28500000, pago: 0,
    estado: "LANÇADO", diarioRef: "DI/2024/000336", criadoEm: "2024-11-27T14:00:00Z",
  },
  {
    id: "ft-1199", numero: "FT/2024/001199", tipo: "FT", data: "2024-11-26",
    cliente: "Angola Cables SA", nif: "5400334455",
    linhas: [{ descricao: "Consultoria técnica — Projecto Rede", qtd: 1, preco: 5000000, iva: 14 }],
    subtotal: 5000000, ivaTotal: 700000, total: 5700000, pago: 5700000,
    estado: "LIQUIDADO", criadoEm: "2024-11-26T09:00:00Z",
  },
  {
    id: "ft-1198", numero: "FT/2024/001198", tipo: "FT", data: "2024-11-25",
    cliente: "BFA Banco", nif: "5400556677",
    linhas: [{ descricao: "Serviços de auditoria financeira", qtd: 1, preco: 12500000, iva: 14 }],
    subtotal: 12500000, ivaTotal: 1750000, total: 14250000, pago: 7125000,
    estado: "PARCIAL", criadoEm: "2024-11-25T11:00:00Z",
  },
  {
    id: "ft-1197", numero: "FT/2024/001197", tipo: "FT", data: "2024-11-22",
    cliente: "Unitel SA", nif: "5400778899",
    linhas: [{ descricao: "Gestão e manutenção de sistemas", qtd: 3, preco: 2500000, iva: 14 }],
    subtotal: 7500000, ivaTotal: 1050000, total: 8550000, pago: 0,
    estado: "LANÇADO", criadoEm: "2024-11-22T16:00:00Z",
  },
];

// ── NovaFacturaModal ───────────────────────────────────────────────────────────
function NovaFacturaModal({
  exercicio, onClose, onSave,
}: {
  exercicio: string;
  onClose: () => void;
  onSave: (f: Omit<Factura, "id" | "numero" | "criadoEm">, lancarJournal: boolean) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [tipo, setTipo] = useState<Factura["tipo"]>("FT");
  const [data, setData] = useState(today);
  const [cliente, setCliente] = useState("");
  const [nif, setNif] = useState("");
  const [docOrigemRef, setDocOrigemRef] = useState("");
  const [refPagamento, setRefPagamento] = useState("");
  const [lancarJournal, setLancarJournal] = useState(true);
  const [lines, setLines] = useState<(FacturaLine & { _key: string })[]>([
    { _key: "l1", descricao: "", qtd: 1, preco: 0, iva: 14 },
  ]);

  const showDocOrigem = tipo === "NC" || tipo === "ND";
  const showRefPagamento = tipo === "RC" || tipo === "RG" || tipo === "FR";

  function updateLine(idx: number, field: keyof FacturaLine, val: string | number) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: val } : l));
  }
  function addLine() {
    setLines(prev => [...prev, { _key: Math.random().toString(36), descricao: "", qtd: 1, preco: 0, iva: 14 }]);
  }
  function removeLine(idx: number) {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  const subtotal = lines.reduce((s, l) => s + (l.qtd || 0) * (l.preco || 0), 0);
  const ivaTotal = lines.reduce((s, l) => s + (l.qtd || 0) * (l.preco || 0) * (l.iva || 0) / 100, 0);
  const total = subtotal + ivaTotal;

  const canSave = cliente.trim() && total > 0;

  function handleSave() {
    if (!canSave) return;
    const extra: Partial<Factura> = {};
    if (showDocOrigem && docOrigemRef.trim()) extra.docOrigemRef = docOrigemRef.trim();
    onSave({
      tipo,
      data, cliente: cliente.trim(), nif: nif.trim(),
      linhas: lines.map(({ _key, ...l }) => l),
      subtotal, ivaTotal, total, pago: 0, estado: "LANÇADO",
      ...extra,
    }, lancarJournal);
    onClose();
  }

  const inputCls = "border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Tipo de Documento */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Documento *</label>
          <select value={tipo} onChange={e => setTipo(e.target.value as Factura["tipo"])} className={inputCls}>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{k} — {v}</option>
            ))}
          </select>
        </div>

        {/* Doc origem / ref pagamento */}
        {showDocOrigem && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Documento de Origem <span className="text-gray-400">(ref. do doc. original)</span>
            </label>
            <input type="text" value={docOrigemRef} onChange={e => setDocOrigemRef(e.target.value)}
              placeholder="Ex: FT/2025/000001" className={inputCls} />
          </div>
        )}
        {showRefPagamento && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Referência de Pagamento
            </label>
            <input type="text" value={refPagamento} onChange={e => setRefPagamento(e.target.value)}
              placeholder="Ex: FT/2025/000001" className={inputCls} />
          </div>
        )}

        {/* Header */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data *</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente *</label>
              <input type="text" value={cliente} onChange={e => setCliente(e.target.value)}
                placeholder="Nome do cliente" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">NIF do Cliente</label>
              <input type="text" value={nif} onChange={e => setNif(e.target.value)}
                placeholder="NIF / contribuinte" className={inputCls} />
            </div>
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Linhas do Documento</label>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[3fr_80px_1fr_80px_auto] gap-2 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600 border-b border-gray-200">
                <span>Descrição</span>
                <span className="text-right">Qtd.</span>
                <span className="text-right">Preço Unit. (Kz)</span>
                <span className="text-right">IVA %</span>
                <span className="w-6"></span>
              </div>
              {lines.map((l, idx) => (
                <div key={l._key}
                  className={`grid grid-cols-[3fr_80px_1fr_80px_auto] gap-2 px-3 py-2 items-center border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                  <input type="text" value={l.descricao} onChange={e => updateLine(idx, "descricao", e.target.value)}
                    placeholder="Descrição do serviço ou produto"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs w-full focus:ring-2 focus:ring-brand-500" />
                  <input type="number" min="1" value={l.qtd || ""} onChange={e => updateLine(idx, "qtd", parseFloat(e.target.value) || 1)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-right font-mono w-full focus:ring-2 focus:ring-brand-500" />
                  <input type="number" min="0" value={l.preco || ""} onChange={e => updateLine(idx, "preco", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono w-full focus:ring-2 focus:ring-brand-500" />
                  <select value={l.iva} onChange={e => updateLine(idx, "iva", parseFloat(e.target.value))}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs w-full focus:ring-2 focus:ring-brand-500">
                    <option value={14}>14%</option>
                    <option value={7}>7%</option>
                    <option value={5}>5%</option>
                    <option value={2}>2%</option>
                    <option value={0}>0%</option>
                  </select>
                  <button type="button" onClick={() => removeLine(idx)} disabled={lines.length <= 1}
                    className="text-gray-300 hover:text-red-500 disabled:opacity-20 p-0.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <div className="px-3 py-2 border-t border-gray-100">
                <button type="button" onClick={addLine}
                  className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar linha
                </button>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal (s/IVA)</span>
              <span className="font-mono">{subtotal.toLocaleString("pt-PT")} Kz</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA</span>
              <span className="font-mono">{ivaTotal.toLocaleString("pt-PT")} Kz</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
              <span>Total</span>
              <span className="font-mono text-brand-700">{total.toLocaleString("pt-PT")} Kz</span>
            </div>
          </div>

          {/* Auto-journal option */}
          <label className="flex items-center gap-2.5 p-3 bg-brand-50 rounded-xl border border-brand-100 cursor-pointer">
            <input type="checkbox" checked={lancarJournal} onChange={e => setLancarJournal(e.target.checked)}
              className="w-4 h-4 accent-brand-600" />
            <div>
              <p className="text-sm font-semibold text-brand-800">Gerar lançamento contabilístico automático</p>
              <p className="text-xs text-brand-600">
                Cria automaticamente o lançamento: D 31.1 Clientes / C 61.1 Vendas + C 34.5.3 IVA
              </p>
            </div>
          </label>
        </div>

        <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={!canSave}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Emitir {TIPO_LABELS[tipo] ?? tipo}
          </button>
        </div>
      </div>
  );
}

// ── EditarFacturaModal ────────────────────────────────────────────────────────
function EditarFacturaModal({
  factura, onClose, onSave,
}: {
  factura: Factura;
  onClose: () => void;
  onSave: (patch: Partial<Factura>) => void;
}) {
  const [estado, setEstado] = useState<Factura["estado"]>(factura.estado);
  const [pago, setPago] = useState(factura.pago);
  const [data, setData] = useState(factura.data);

  const inputCls = "border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent w-full";
  const readonlyCls = "border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-gray-50 text-gray-500 w-full";

  function handleSave() {
    onSave({ estado, pago, data });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nº Documento</label>
            <input readOnly value={factura.numero} className={readonlyCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Cliente</label>
            <input readOnly value={factura.cliente} className={readonlyCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Total (Kz)</label>
            <input readOnly value={factura.total.toLocaleString("pt-PT")} className={readonlyCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as Factura["estado"])} className={inputCls}>
              <option value="RASCUNHO">RASCUNHO</option>
              <option value="LANÇADO">LANÇADO</option>
              <option value="PARCIAL">PARCIAL</option>
              <option value="LIQUIDADO">LIQUIDADO</option>
              <option value="ANULADO">ANULADO</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Valor Pago (Kz)</label>
            <input type="number" min={0} max={factura.total} value={pago}
              onChange={e => setPago(parseFloat(e.target.value) || 0)} className={inputCls} />
          </div>
        </div>
        <p className="text-xs text-gray-400">As linhas da factura não podem ser editadas por razões de integridade contabilística.</p>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={handleSave} className="btn-primary">Guardar</button>
      </div>
    </div>
  );
}

// ── VerFacturaModal ───────────────────────────────────────────────────────────
function VerFacturaModal({
  factura, onClose, onPago, onEditar,
}: {
  factura: Factura;
  onClose: () => void;
  onPago: (valor: number) => void;
  onEditar?: () => void;
}) {
  const [valorPag, setValorPag] = useState("");
  const saldo = factura.total - factura.pago;

  const ESTADO_STYLE: Record<string, string> = {
    "LIQUIDADO": "bg-green-100 text-green-800",
    "LANÇADO":   "bg-blue-100 text-blue-800",
    "PARCIAL":   "bg-yellow-100 text-yellow-800",
    "ANULADO":   "bg-red-100 text-red-800",
    "RASCUNHO":  "bg-gray-100 text-gray-700",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-bold text-brand-700 font-mono">{factura.numero}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ESTADO_STYLE[factura.estado] ?? ""}`}>
              {factura.estado}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {[
              { l: "Data", v: factura.data },
              { l: "Cliente", v: factura.cliente },
              { l: "NIF", v: factura.nif || "—" },
              { l: "Total", v: `${factura.total.toLocaleString("pt-PT")} AOA` },
              { l: "Pago", v: `${factura.pago.toLocaleString("pt-PT")} AOA` },
              { l: "Saldo em dívida", v: `${saldo.toLocaleString("pt-PT")} AOA` },
            ].map(({ l, v }) => (
              <div key={l} className="bg-gray-50 rounded-xl p-3">
                <p className="text-gray-500 uppercase tracking-wide font-semibold">{l}</p>
                <p className="text-gray-900 font-medium mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {factura.diarioRef && (
            <div className="text-xs bg-brand-50 rounded-xl p-3 text-brand-700 font-medium">
              Lançamento contabilístico: <span className="font-mono font-bold">{factura.diarioRef}</span>
            </div>
          )}

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold text-gray-700">Descrição</th>
                  <th className="text-right px-4 py-2.5 font-bold text-gray-700">Qtd.</th>
                  <th className="text-right px-4 py-2.5 font-bold text-gray-700">Preço Unit.</th>
                  <th className="text-right px-4 py-2.5 font-bold text-gray-700">IVA</th>
                  <th className="text-right px-4 py-2.5 font-bold text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {factura.linhas.map((l, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 text-gray-700">{l.descricao}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{l.qtd}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{l.preco.toLocaleString("pt-PT")}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{l.iva}%</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      {(l.qtd * l.preco * (1 + l.iva / 100)).toLocaleString("pt-PT")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="border-t border-gray-200">
                  <td colSpan={4} className="px-4 py-2.5 text-right font-semibold text-gray-700">Subtotal</td>
                  <td className="px-4 py-2.5 text-right font-mono">{factura.subtotal.toLocaleString("pt-PT")}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 text-right font-semibold text-gray-700">IVA</td>
                  <td className="px-4 py-2.5 text-right font-mono">{factura.ivaTotal.toLocaleString("pt-PT")}</td>
                </tr>
                <tr className="bg-brand-700 text-white">
                  <td colSpan={4} className="px-4 py-2.5 text-right font-bold text-sm">TOTAL</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold">{factura.total.toLocaleString("pt-PT")}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Register payment */}
          {saldo > 0 && factura.estado !== "ANULADO" && (
            <div className="border border-green-200 bg-green-50 rounded-xl p-4">
              <p className="text-xs font-bold text-green-800 mb-2">Registar Recebimento</p>
              <div className="flex gap-2">
                <input
                  type="number" min="0" max={saldo}
                  value={valorPag}
                  onChange={e => setValorPag(e.target.value)}
                  placeholder={`Máx: ${saldo.toLocaleString("pt-PT")} AOA`}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono flex-1 focus:ring-2 focus:ring-green-400"
                />
                <button
                  onClick={() => {
                    const v = Math.min(parseFloat(valorPag) || 0, saldo);
                    if (v > 0) { onPago(v); setValorPag(""); }
                  }}
                  className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700"
                >
                  Registar
                </button>
                <button
                  onClick={() => { onPago(saldo); setValorPag(""); }}
                  className="px-3 py-1.5 bg-green-100 text-green-800 text-xs font-bold rounded-lg hover:bg-green-200"
                >
                  Pago total
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
          {onEditar && (
            <button onClick={onEditar} className="btn-secondary">
              ✏️ Editar
            </button>
          )}
          <button onClick={onClose} className="btn-secondary">Fechar</button>
        </div>
      </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
const ESTADO_BADGE: Record<string, string> = {
  "LIQUIDADO": "bg-green-100 text-green-800",
  "LANÇADO":   "bg-blue-100 text-blue-800",
  "PARCIAL":   "bg-yellow-100 text-yellow-800",
  "ANULADO":   "bg-red-100 text-red-800",
  "RASCUNHO":  "bg-gray-100 text-gray-700",
};

export default function VendasPage() {
  const [exercicio, setExercicio] = useState(() => ANOS_DISPONIVEIS[0] ?? "2025");
  const { facturas, addFactura, marcarPago, deleteFactura, updateFactura } = useFacturas(exercicio);
  const { addEntry } = useJournal(exercicio);
  const { openWindow, closeWindow } = useWindowManager();

  const [pesquisa, setPesquisa] = useState("");
  const { openNovoCliente } = useQuickActions();
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  const filtered = useMemo(() => facturas.filter(f => {
    if (pesquisa && !f.numero.includes(pesquisa) && !f.cliente.toLowerCase().includes(pesquisa.toLowerCase())) return false;
    if (filtroEstado !== "Todos" && f.estado !== filtroEstado) return false;
    if (filtroTipo !== "Todos" && (f.tipo ?? "FT") !== filtroTipo) return false;
    return true;
  }), [facturas, pesquisa, filtroEstado, filtroTipo]);

  const totalFact  = facturas.reduce((s, f) => s + f.total, 0);
  const totalPago  = facturas.reduce((s, f) => s + f.pago, 0);
  const totalDivida = totalFact - totalPago;
  const emAberto   = facturas.filter(f => ["LANÇADO", "PARCIAL"].includes(f.estado)).length;
  const ncndCount  = facturas.filter(f => (f.tipo ?? "FT") === "NC" || (f.tipo ?? "FT") === "ND").length;

  function handleOpenNova() {
    const winId = `vendas-nova-${crypto.randomUUID()}`;
    openWindow({
      id: winId,
      title: "Novo Documento Comercial",
      icon: "🧾",
      content: <NovaFacturaModal exercicio={exercicio} onClose={() => closeWindow(winId)} onSave={handleSaveFactura} />,
      x: 40, y: 20,
      width: 900, height: 640,
      minimized: false, maximized: false,
    });
  }

  function handleOpenVer(f: Factura) {
    const winId = `vendas-ver-${f.id}`;
    openWindow({
      id: winId,
      title: `${TIPO_LABELS[f.tipo ?? "FT"] ?? f.tipo} ${f.numero}`,
      icon: "📄",
      content: (
        <VerFacturaModal
          factura={f}
          onClose={() => closeWindow(winId)}
          onPago={v => { marcarPago(f.id, v); closeWindow(winId); }}
          onEditar={() => { closeWindow(winId); handleOpenEditar(f); }}
        />
      ),
      x: 60, y: 40,
      width: 780, height: 520,
      minimized: false, maximized: false,
    });
  }

  function handleOpenDelete(f: Factura) {
    const winId = `vendas-del-${f.id}`;
    openWindow({
      id: winId,
      title: "Eliminar Documento",
      icon: "⚠️",
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Eliminar Documento?</h3>
                <p className="text-xs text-gray-500 mt-0.5">{f.numero} — {f.cliente}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Esta acção é irreversível. O lançamento contabilístico associado não será eliminado automaticamente.</p>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
            <button className="btn-secondary" onClick={() => closeWindow(winId)}>Cancelar</button>
            <button className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              onClick={() => { deleteFactura(f.id); closeWindow(winId); }}>
              Sim, eliminar
            </button>
          </div>
        </div>
      ),
      x: 80, y: 60,
      width: 480, height: 240,
      minimized: false, maximized: false,
    });
  }

  function handleOpenEditar(f: Factura) {
    const winId = `vendas-editar-${f.id}`;
    openWindow({
      id: winId,
      title: `Editar ${f.tipo ?? "FT"} ${f.numero}`,
      icon: "✏️",
      content: (
        <EditarFacturaModal
          factura={f}
          onClose={() => closeWindow(winId)}
          onSave={(patch) => { updateFactura(f.id, patch); closeWindow(winId); }}
        />
      ),
      x: 60, y: 40,
      width: 560, height: 400,
      minimized: false, maximized: false,
    });
  }

  function handleSaveFactura(
    draft: Omit<Factura, "id" | "numero" | "criadoEm">,
    lancarJournal: boolean
  ) {
    const tipoDoc = draft.tipo ?? "FT";
    // Build a temp numero for the journal reference (we'll use placeholder)
    const nextFtNum = `${tipoDoc}/${exercicio}/${(facturas.filter(f => (f.tipo ?? "FT") === tipoDoc).length + 1).toString().padStart(6, "0")}`;

    addFactura({ ...draft });

    if (lancarJournal) {
      // Auto-generate journal entry
      addEntry({
        data: draft.data,
        descricao: `Venda a crédito — ${nextFtNum} — ${draft.cliente}`,
        tipo: "VENDA",
        modulo: "VENDAS",
        linhas: [
          {
            conta: "31.1.2.1 — Clientes Nacionais — correntes",
            contaCod: "31.1.2.1",
            descricao: nextFtNum,
            debito: draft.total,
            credito: 0,
          },
          {
            conta: "61.1 — Vendas — Mercado Nacional",
            contaCod: "61.1",
            descricao: draft.linhas[0]?.descricao || nextFtNum,
            debito: 0,
            credito: draft.subtotal,
          },
          ...(draft.ivaTotal > 0 ? [{
            conta: "34.5.3.1 — IVA Liquidado — Operações gerais",
            contaCod: "34.5.3.1",
            descricao: `IVA ${nextFtNum}`,
            debito: 0,
            credito: draft.ivaTotal,
          }] : []),
        ],
        totalDebito: draft.total,
        totalCredito: draft.total,
        estado: "LANÇADO" as const,
      });
    }
  }

  return (
    <div>
      <Topbar
        title="Vendas e Facturação"
        subtitle="Documentos Comerciais · FT · FR · FA · NC · ND · RC · TV · DP N.º 71/25"
        actions={
          <>
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setExercicio(y)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  exercicio === y ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>{y}</button>
            ))}
            <button className="btn-secondary" onClick={() => openNovoCliente()}>
              👤 Novo Cliente
            </button>
            <button className="btn-secondary">Exportar</button>
            <button className="btn-primary" onClick={handleOpenNova}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Documento
            </button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Facturado total",    value: `Kz ${(totalFact / 1e6).toLocaleString("pt-PT", { maximumFractionDigits: 2 })}M`,   color: "text-gray-900" },
            { label: "Recebido",           value: `Kz ${(totalPago / 1e6).toLocaleString("pt-PT", { maximumFractionDigits: 2 })}M`,   color: "text-green-700" },
            { label: "Em dívida",          value: `Kz ${(totalDivida / 1e6).toLocaleString("pt-PT", { maximumFractionDigits: 2 })}M`, color: "text-orange-600" },
            { label: "Docs em aberto",     value: emAberto.toString(),                        color: "text-gray-900" },
            { label: "NC + ND emitidas",   value: ncndCount.toString(),                       color: "text-purple-700" },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <input className="input max-w-xs" placeholder="Pesquisar documento ou cliente…"
            value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
          <select className="input max-w-[160px]" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            {["Todos", "LANÇADO", "PARCIAL", "LIQUIDADO", "ANULADO"].map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="input max-w-[200px]" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="Todos">Todos os tipos</option>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{k} — {v}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>Documentos Comerciais — {exercicio}</h3>
            <span className="badge badge-blue">{filtered.length} documentos</span>
          </div>
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <p className="text-sm">Nenhum documento encontrado</p>
                <button className="btn-primary text-sm" onClick={handleOpenNova}>
                  Criar primeiro documento
                </button>
              </div>
            ) : (
              <table className="table-auto w-full">
                <thead>
                  <tr>
                    <th>Nº Documento</th>
                    <th>Tipo</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th className="text-right">Total (Kz)</th>
                    <th className="text-right">Pago (Kz)</th>
                    <th className="text-right">Saldo (Kz)</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => {
                    const tipoDoc = f.tipo ?? "FT";
                    return (
                    <tr key={f.id} className="cursor-pointer">
                      <td>
                        <span className="font-mono text-xs text-brand-700 font-semibold">{f.numero}</span>
                        {f.docOrigemRef && (
                          <span className="block text-[10px] text-gray-400 font-normal">orig: {f.docOrigemRef}</span>
                        )}
                      </td>
                      <td>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TIPO_COLOR[tipoDoc] ?? "bg-gray-100 text-gray-600"}`}>
                          {tipoDoc}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500 whitespace-nowrap">{f.data}</td>
                      <td className="font-medium text-sm">{f.cliente}</td>
                      <td className="text-right font-mono text-sm">{`Kz ${f.total.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}`}</td>
                      <td className={`text-right font-mono text-sm ${f.pago > 0 ? "text-green-700" : "text-gray-400"}`}>
                        {f.pago > 0 ? `Kz ${f.pago.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}` : "—"}
                      </td>
                      <td className={`text-right font-mono text-sm font-medium ${
                        f.total - f.pago > 0 ? "text-orange-600" : "text-gray-400"
                      }`}>
                        {f.total - f.pago > 0 ? `Kz ${(f.total - f.pago).toLocaleString("pt-PT", { maximumFractionDigits: 0 })}` : "—"}
                      </td>
                      <td>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_BADGE[f.estado] ?? ""}`}>
                          {f.estado}
                        </span>
                      </td>
                      <td className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenVer(f)}
                          className="btn-ghost py-1 px-2 text-xs"
                        >Ver</button>
                        <button
                          onClick={() => handleOpenEditar(f)}
                          className="py-1 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >✏️</button>
                        <button className="py-1 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          onClick={() => handleOpenDelete(f)} title="Eliminar">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
