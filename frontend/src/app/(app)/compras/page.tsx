"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Topbar from "@/components/Topbar";
import { useJournal, JOURNAL_ACCOUNTS } from "@/lib/journal";
import { useCollection } from "@/lib/useCollection";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { useQuickActions } from "@/components/quickActions/useQuickActions";
import { useWindowManager } from "@/lib/windowManager";

// ── Types ──────────────────────────────────────────────────────────────────────
interface CompraLine {
  _key: string;
  descricao: string;
  qtd: number;
  preco: number;
  iva: number;
}

interface Compra {
  id: string;
  numero: string;
  data: string;
  fornecedor: string;
  nif: string;
  refFornecedor: string;
  linhas: CompraLine[];
  subtotal: number;
  ivaTotal: number;
  total: number;
  pago: number;
  estado: "RASCUNHO" | "LANÇADO" | "PARCIAL" | "PAGO" | "ANULADO";
  diarioRef?: string;
  criadoEm: string;
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_COMPRAS_2024: Compra[] = [
  {
    id: "c-2210", numero: "FC/2024/002210", data: "2024-11-28",
    fornecedor: "Distribuidora Sul Lda.", nif: "5417823654", refFornecedor: "C-0891",
    linhas: [{ _key:"1", descricao:"Mercadorias diversas — ref. C-0891", qtd:1, preco:7500000, iva:14 }],
    subtotal: 7500000, ivaTotal: 1050000, total: 8550000, pago: 0,
    estado: "LANÇADO", criadoEm: "2024-11-28T11:00:00Z",
  },
  {
    id: "c-2209", numero: "FC/2024/002209", data: "2024-11-26",
    fornecedor: "Import-Export SA", nif: "5234187653", refFornecedor: "IE-7732",
    linhas: [{ _key:"1", descricao:"Produto importado — ref. IE-7732", qtd:1, preco:13421053, iva:14 }],
    subtotal: 13421053, ivaTotal: 1878947, total: 15300000, pago: 15300000,
    estado: "PAGO", criadoEm: "2024-11-26T09:00:00Z",
  },
  {
    id: "c-2208", numero: "FC/2024/002208", data: "2024-11-22",
    fornecedor: "Petro Insumos EP", nif: "5001234567", refFornecedor: "PI-0348",
    linhas: [{ _key:"1", descricao:"Combustíveis e lubrificantes", qtd:1, preco:36842105, iva:14 }],
    subtotal: 36842105, ivaTotal: 5157895, total: 42000000, pago: 21000000,
    estado: "PARCIAL", criadoEm: "2024-11-22T10:00:00Z",
  },
  {
    id: "c-2207", numero: "FC/2024/002207", data: "2024-11-18",
    fornecedor: "ABC Comercial Lda.", nif: "5987456321", refFornecedor: "ABC-5534",
    linhas: [{ _key:"1", descricao:"Material de escritório e consumíveis", qtd:1, preco:5000000, iva:14 }],
    subtotal: 5000000, ivaTotal: 700000, total: 5700000, pago: 5700000,
    estado: "PAGO", criadoEm: "2024-11-18T08:00:00Z",
  },
  {
    id: "c-2206", numero: "FC/2024/002206", data: "2024-11-10",
    fornecedor: "Tech Supplies Angola", nif: "5543216789", refFornecedor: "TS-2241",
    linhas: [{ _key:"1", descricao:"Equipamento informático — ref. TS-2241", qtd:1, preco:11228070, iva:14 }],
    subtotal: 11228070, ivaTotal: 1571930, total: 12800000, pago: 0,
    estado: "LANÇADO", criadoEm: "2024-11-10T14:00:00Z",
  },
];

// ── Hook ──────────────────────────────────────────────────────────────────────
function useCompras(exercicio: string) {
  const key  = `educontas-compras-${exercicio}`;
  const seed = exercicio === "2024" ? SEED_COMPRAS_2024 : [];
  const { items: compras, setItems: setCompras, loading: loaded } = useCollection<Compra>(key, seed);

  const nextSeq = useCallback((prev: Compra[]) => {
    const nums = prev.map(c => parseInt(c.numero.split("/")[2] ?? "0", 10)).filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `FC/${exercicio}/${(max + 1).toString().padStart(6, "0")}`;
  }, [exercicio]);

  const addCompra = useCallback((
    draft: Omit<Compra, "id" | "numero" | "criadoEm">,
    onCreated?: (c: Compra) => void,
  ) => {
    setCompras(prev => {
      const c: Compra = {
        ...draft,
        id: crypto.randomUUID(),
        numero: nextSeq(prev),
        criadoEm: new Date().toISOString(),
      };
      onCreated?.(c);
      return [c, ...prev];
    });
  }, [setCompras, nextSeq]);

  const registarPagamento = useCallback((id: string, valor: number) => {
    setCompras(prev => prev.map(c => {
      if (c.id !== id) return c;
      const novoPago = c.pago + valor;
      const estado: Compra["estado"] = novoPago >= c.total ? "PAGO" : "PARCIAL";
      return { ...c, pago: novoPago, estado };
    }));
  }, [setCompras]);

  const deleteCompra = useCallback((id: string) => {
    setCompras(prev => prev.filter(c => c.id !== id));
  }, [setCompras]);

  const updateCompra = useCallback((id: string, patch: Partial<Compra>) => {
    setCompras(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, [setCompras]);

  return { compras, addCompra, registarPagamento, deleteCompra, updateCompra, loaded };
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function emptyLine(): CompraLine {
  return { _key: Math.random().toString(36).slice(2), descricao: "", qtd: 1, preco: 0, iva: 14 };
}

const ESTADO_BADGE: Record<string, string> = {
  PAGO:     "bg-green-100 text-green-800",
  LANÇADO:  "bg-blue-100 text-blue-800",
  PARCIAL:  "bg-yellow-100 text-yellow-800",
  ANULADO:  "bg-red-100 text-red-800",
  RASCUNHO: "bg-gray-100 text-gray-600",
};

// ── Nova Compra Modal ─────────────────────────────────────────────────────────
interface NovaCompraProps {
  exercicio: string;
  onClose: () => void;
  onSave: (draft: Omit<Compra, "id" | "numero" | "criadoEm">, gerar: boolean) => void;
}

function NovaCompraModal({ exercicio, onClose, onSave }: NovaCompraProps) {
  const today = new Date().toISOString().split("T")[0];
  const defaultDate = exercicio === new Date().getFullYear().toString() ? today : `${exercicio}-12-31`;
  const [data, setData] = useState(defaultDate);
  const [fornecedor, setFornecedor] = useState("");
  const [nif, setNif] = useState("");
  const [refFornecedor, setRefFornecedor] = useState("");
  const [linhas, setLinhas] = useState<CompraLine[]>([emptyLine(), emptyLine()]);
  const [gerar, setGerar] = useState(true);

  const subtotal = linhas.reduce((s, l) => s + l.qtd * l.preco, 0);
  const ivaTotal = linhas.reduce((s, l) => s + Math.round(l.qtd * l.preco * l.iva / 100), 0);
  const total = subtotal + ivaTotal;
  const valid = fornecedor.trim().length > 0 && data.length > 0 && total > 0;

  function setL(idx: number, field: keyof CompraLine, v: string | number) {
    setLinhas(p => p.map((l, i) => i === idx ? { ...l, [field]: v } : l));
  }

  function handleSave() {
    if (!valid) return;
    onSave({
      data, fornecedor: fornecedor.trim(), nif: nif.trim(),
      refFornecedor: refFornecedor.trim(), linhas,
      subtotal, ivaTotal, total, pago: 0, estado: "LANÇADO",
    }, gerar);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Fornecedor *</label>
              <input className="input" placeholder="Nome do fornecedor" value={fornecedor} onChange={e => setFornecedor(e.target.value)} />
            </div>
            <div>
              <label className="label">NIF</label>
              <input className="input" placeholder="NIF do fornecedor" value={nif} onChange={e => setNif(e.target.value)} />
            </div>
            <div>
              <label className="label">Ref. Fornecedor</label>
              <input className="input" placeholder="Nº factura fornecedor" value={refFornecedor} onChange={e => setRefFornecedor(e.target.value)} />
            </div>
            <div>
              <label className="label">Data *</label>
              <input type="date" className="input" value={data} onChange={e => setData(e.target.value)} />
            </div>
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Artigos / Serviços</label>
              <button onClick={() => setLinhas(p => [...p, emptyLine()])}
                className="text-xs text-brand-600 hover:text-brand-800 font-semibold">+ Linha</button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left text-gray-600 font-semibold">Descrição</th>
                    <th className="px-2 py-2 text-right text-gray-600 font-semibold w-14">Qtd</th>
                    <th className="px-2 py-2 text-right text-gray-600 font-semibold w-32">Preço Unit. (Kz)</th>
                    <th className="px-2 py-2 text-right text-gray-600 font-semibold w-16">IVA %</th>
                    <th className="px-2 py-2 text-right text-gray-600 font-semibold w-32">Total (Kz)</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {linhas.map((l, idx) => (
                    <tr key={l._key}>
                      <td className="px-2 py-1.5">
                        <input className="w-full text-xs border-0 outline-none bg-transparent"
                          placeholder="Descrição do artigo"
                          value={l.descricao} onChange={e => setL(idx, "descricao", e.target.value)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0}
                          className="w-full text-xs border-0 outline-none bg-transparent text-right"
                          value={l.qtd} onChange={e => setL(idx, "qtd", +e.target.value)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0}
                          className="w-full text-xs border-0 outline-none bg-transparent text-right"
                          value={l.preco} onChange={e => setL(idx, "preco", +e.target.value)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select className="w-full text-xs border-0 outline-none bg-transparent text-right"
                          value={l.iva} onChange={e => setL(idx, "iva", +e.target.value)}>
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={14}>14%</option>
                        </select>
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-gray-700">
                        {(l.qtd * l.preco + Math.round(l.qtd * l.preco * l.iva / 100)).toLocaleString("pt-PT")}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        {linhas.length > 1 && (
                          <button onClick={() => setLinhas(p => p.filter((_, i) => i !== idx))}
                            className="text-gray-300 hover:text-red-500 text-base leading-none">×</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-mono">{subtotal.toLocaleString("pt-PT")} Kz</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA</span>
              <span className="font-mono">{ivaTotal.toLocaleString("pt-PT")} Kz</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
              <span>Total a Pagar</span>
              <span className="font-mono text-brand-700">{total.toLocaleString("pt-PT")} Kz</span>
            </div>
          </div>

          {/* Auto-journal */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={gerar} onChange={e => setGerar(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-brand-600" />
            <div>
              <span className="text-sm font-medium text-gray-900">Gerar lançamento contabilístico automático</span>
              <p className="text-xs text-gray-500 mt-0.5">
                D 26.1 Mercadorias {ivaTotal > 0 ? "+ D 34.5.1.1 IVA Suportado " : ""}/ C 32.1.2.1 Fornecedores
              </p>
            </div>
          </label>
        </div>

        <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={!valid} className="btn-primary">
            Registar Factura
          </button>
        </div>
    </div>
  );
}

// ── Editar Compra Modal ───────────────────────────────────────────────────────
interface EditarCompraProps {
  compra: Compra;
  onClose: () => void;
  onSave: (patch: Partial<Compra>) => void;
}

function EditarCompraModal({ compra, onClose, onSave }: EditarCompraProps) {
  const [estado, setEstado] = useState<Compra["estado"]>(compra.estado);
  const [pago, setPago] = useState(compra.pago);
  const [data, setData] = useState(compra.data);

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors";
  const readonlyCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-100 bg-gray-100 text-gray-500";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Nº Documento</label>
            <input readOnly value={compra.numero} className={readonlyCls} />
          </div>
          <div>
            <label className="label">Fornecedor</label>
            <input readOnly value={compra.fornecedor} className={readonlyCls} />
          </div>
          <div>
            <label className="label">Total (Kz)</label>
            <input readOnly value={compra.total.toLocaleString("pt-PT")} className={readonlyCls} />
          </div>
          <div>
            <label className="label">Data</label>
            <input type="date" className={inputCls} value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className={inputCls} value={estado} onChange={e => setEstado(e.target.value as Compra["estado"])}>
              <option value="RASCUNHO">RASCUNHO</option>
              <option value="LANÇADO">LANÇADO</option>
              <option value="PARCIAL">PARCIAL</option>
              <option value="PAGO">PAGO</option>
              <option value="ANULADO">ANULADO</option>
            </select>
          </div>
          <div>
            <label className="label">Valor Pago (Kz)</label>
            <input type="number" min={0} max={compra.total} className={inputCls}
              value={pago} onChange={e => setPago(parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <p className="text-xs text-gray-400">As linhas da compra não podem ser editadas por razões de integridade contabilística.</p>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={() => onSave({ estado, pago, data })} className="btn-primary">Guardar</button>
      </div>
    </div>
  );
}

// ── Ver Compra Modal ──────────────────────────────────────────────────────────
interface VerCompraProps {
  compra: Compra;
  onClose: () => void;
  onPagar: (valor: number) => void;
  onEditar?: () => void;
}

function VerCompraModal({ compra, onClose, onPagar, onEditar }: VerCompraProps) {
  const [pagamento, setPagamento] = useState("");
  const saldo = compra.total - compra.pago;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="mb-1">
            <h2 className="text-lg font-bold font-mono text-gray-900">{compra.numero}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{compra.fornecedor}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Data</p>
              <p className="font-medium mt-0.5">{compra.data}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Estado</p>
              <span className={`inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_BADGE[compra.estado]}`}>
                {compra.estado}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">NIF Fornecedor</p>
              <p className="font-mono mt-0.5">{compra.nif || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Ref. Fornecedor</p>
              <p className="font-mono mt-0.5">{compra.refFornecedor || "—"}</p>
            </div>
            {compra.diarioRef && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Lançamento Diário</p>
                <p className="font-mono text-brand-700 mt-0.5">{compra.diarioRef}</p>
              </div>
            )}
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600 font-semibold">Descrição</th>
                  <th className="px-3 py-2 text-right text-gray-600 font-semibold">Qtd</th>
                  <th className="px-3 py-2 text-right text-gray-600 font-semibold">Preço</th>
                  <th className="px-3 py-2 text-right text-gray-600 font-semibold">IVA</th>
                  <th className="px-3 py-2 text-right text-gray-600 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {compra.linhas.map((l, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{l.descricao || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{l.qtd}</td>
                    <td className="px-3 py-2 text-right font-mono">{l.preco.toLocaleString("pt-PT")}</td>
                    <td className="px-3 py-2 text-right">{l.iva}%</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {Math.round(l.qtd * l.preco * (1 + l.iva / 100)).toLocaleString("pt-PT")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span className="font-mono">{compra.subtotal.toLocaleString("pt-PT")} Kz</span></div>
            <div className="flex justify-between text-gray-600"><span>IVA</span><span className="font-mono">{compra.ivaTotal.toLocaleString("pt-PT")} Kz</span></div>
            <div className="flex justify-between font-bold text-sm border-t border-gray-200 pt-1.5">
              <span>Total</span><span className="font-mono text-brand-700">{compra.total.toLocaleString("pt-PT")} Kz</span>
            </div>
            {compra.pago > 0 && (
              <div className="flex justify-between text-green-700"><span>Pago</span><span className="font-mono">{compra.pago.toLocaleString("pt-PT")} Kz</span></div>
            )}
            {saldo > 0 && (
              <div className="flex justify-between font-semibold text-orange-700"><span>Saldo em Aberto</span><span className="font-mono">{saldo.toLocaleString("pt-PT")} Kz</span></div>
            )}
          </div>

          {saldo > 0 && compra.estado !== "ANULADO" && (
            <div>
              <label className="label">Registar Pagamento (Kz)</label>
              <div className="flex gap-2">
                <input type="number" className="input flex-1" min={1} max={saldo}
                  placeholder={`Máx: ${saldo.toLocaleString("pt-PT")} AOA`}
                  value={pagamento} onChange={e => setPagamento(e.target.value)} />
                <button
                  className="btn-primary whitespace-nowrap"
                  disabled={!pagamento || +pagamento <= 0 || +pagamento > saldo}
                  onClick={() => { onPagar(+pagamento); onClose(); }}
                >
                  Registar
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ComprasPage() {
  const [exercicio, setExercicio] = useState(() => ANOS_DISPONIVEIS[0] ?? "2025");
  const { compras, addCompra, registarPagamento, deleteCompra, updateCompra, loaded } = useCompras(exercicio);
  const { addEntry } = useJournal(exercicio);
  const { openWindow, closeWindow } = useWindowManager();

  const [pesquisa, setPesquisa]     = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const { openNovoFornecedor } = useQuickActions();

  // Reset when year changes
  useEffect(() => {
    setPesquisa(""); setFiltroEstado("Todos");
  }, [exercicio]);

  const filtradas = useMemo(() => compras.filter(c => {
    if (filtroEstado !== "Todos" && c.estado !== filtroEstado) return false;
    if (pesquisa) {
      const q = pesquisa.toLowerCase();
      return c.numero.toLowerCase().includes(q) || c.fornecedor.toLowerCase().includes(q);
    }
    return true;
  }), [compras, pesquisa, filtroEstado]);

  const totalCompras = useMemo(() => compras.filter(c => c.estado !== "ANULADO").reduce((s, c) => s + c.total, 0), [compras]);
  const totalPago    = useMemo(() => compras.reduce((s, c) => s + c.pago, 0), [compras]);
  const totalAberto  = totalCompras - totalPago;
  const emAberto     = compras.filter(c => c.estado === "LANÇADO" || c.estado === "PARCIAL").length;

  function handleOpenNova() {
    const winId = `compras-nova-${crypto.randomUUID()}`;
    openWindow({
      id: winId,
      title: "Registar Factura de Compra",
      icon: "🏭",
      content: <NovaCompraModal exercicio={exercicio} onClose={() => closeWindow(winId)} onSave={(d, g) => { handleSave(d, g); closeWindow(winId); }} />,
      x: 40, y: 20,
      width: 720, height: 520,
      minimized: false, maximized: false,
    });
  }

  function handleOpenEditar(c: Compra) {
    const winId = `compras-editar-${c.id}`;
    openWindow({
      id: winId,
      title: `Editar ${c.numero}`,
      icon: "✏️",
      content: (
        <EditarCompraModal
          compra={c}
          onClose={() => closeWindow(winId)}
          onSave={(patch) => { updateCompra(c.id, patch); closeWindow(winId); }}
        />
      ),
      x: 60, y: 40,
      width: 560, height: 400,
      minimized: false, maximized: false,
    });
  }

  function handleOpenVer(c: Compra) {
    const winId = `compras-ver-${c.id}`;
    openWindow({
      id: winId,
      title: `Compra ${c.numero}`,
      icon: "📦",
      content: (
        <VerCompraModal
          compra={c}
          onClose={() => closeWindow(winId)}
          onPagar={v => registarPagamento(c.id, v)}
          onEditar={() => { closeWindow(winId); handleOpenEditar(c); }}
        />
      ),
      x: 60, y: 40,
      width: 780, height: 520,
      minimized: false, maximized: false,
    });
  }

  function handleOpenDelete(c: Compra) {
    const winId = `compras-del-${c.id}`;
    openWindow({
      id: winId,
      title: "Eliminar Factura",
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
                <h3 className="font-bold text-gray-900">Eliminar Factura?</h3>
                <p className="text-xs text-gray-500 mt-0.5">{c.numero} — {c.fornecedor}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">Esta acção é irreversível. O lançamento contabilístico associado não será eliminado automaticamente.</p>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
            <button className="btn-secondary" onClick={() => closeWindow(winId)}>Cancelar</button>
            <button className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              onClick={() => { deleteCompra(c.id); closeWindow(winId); }}>
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

  function handleSave(draft: Omit<Compra, "id" | "numero" | "criadoEm">, gerar: boolean) {
    if (gerar && draft.total > 0) {
      addCompra(draft, created => {
        const acc26  = JOURNAL_ACCOUNTS.find(a => a.code === "26.1")!;
        const acc34  = JOURNAL_ACCOUNTS.find(a => a.code === "34.5.1.1")!;
        const acc32  = JOURNAL_ACCOUNTS.find(a => a.code === "32.1.2.1")!;
        const linhas = [
          { conta: `${acc26.code} — ${acc26.name}`, contaCod: acc26.code,
            descricao: draft.refFornecedor || created.numero, debito: draft.subtotal, credito: 0 },
          ...(draft.ivaTotal > 0
            ? [{ conta: `${acc34.code} — ${acc34.name}`, contaCod: acc34.code,
                descricao: "IVA suportado 14%", debito: draft.ivaTotal, credito: 0 }]
            : []),
          { conta: `${acc32.code} — ${acc32.name}`, contaCod: acc32.code,
            descricao: `${draft.fornecedor} — ${created.numero}`, debito: 0, credito: draft.total },
        ];
        addEntry({
          data: draft.data,
          descricao: `Compra — ${created.numero} — ${draft.fornecedor}`,
          tipo: "COMPRA", modulo: "COMPRAS",
          linhas, totalDebito: draft.total, totalCredito: draft.total, estado: "LANÇADO",
        });
      });
    } else {
      addCompra(draft);
    }
  }

  return (
    <div>
      <Topbar
        title="Compras e Fornecedores"
        subtitle="Gestão de encomendas, facturas e pagamentos a fornecedores"
        actions={
          <>
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setExercicio(y)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  exercicio === y
                    ? "bg-brand-600 text-white border-brand-600"
                    : "text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>{y}</button>
            ))}
            <button className="btn-secondary" onClick={() => openNovoFornecedor()}>
              🏭 Novo Fornecedor
            </button>
            <button className="btn-primary" onClick={handleOpenNova}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Registar Factura
            </button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Compras",     value: `Kz ${(totalCompras/1e6).toFixed(2)} M`, color: "text-gray-900" },
            { label: "Total Pago",        value: `Kz ${(totalPago/1e6).toFixed(2)} M`,    color: "text-green-700" },
            { label: "Em Aberto",         value: `Kz ${(totalAberto/1e6).toFixed(2)} M`,  color: "text-orange-600" },
            { label: "Facturas s/ pagar", value: String(emAberto),                        color: "text-gray-900" },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <input className="input max-w-xs" placeholder="Pesquisar factura ou fornecedor…"
            value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
          <select className="input max-w-[180px]" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="Todos">Todos os estados</option>
            <option value="LANÇADO">LANÇADO</option>
            <option value="PARCIAL">PARCIAL</option>
            <option value="PAGO">PAGO</option>
            <option value="ANULADO">ANULADO</option>
          </select>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3>Facturas de Compra — {exercicio}</h3>
              {!loaded && <p className="text-xs text-gray-400 mt-0.5">A carregar…</p>}
            </div>
            <span className="badge badge-blue">{filtradas.length} documentos</span>
          </div>
          <div className="overflow-x-auto">
            {filtradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-3">
                <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p className="text-sm">
                  {compras.length === 0
                    ? "Nenhuma factura registada. Clique em «Registar Factura» para começar."
                    : "Nenhuma factura corresponde ao filtro seleccionado."}
                </p>
              </div>
            ) : (
              <table className="table-auto w-full">
                <thead>
                  <tr>
                    <th>Nº Documento</th>
                    <th>Data</th>
                    <th>Fornecedor</th>
                    <th className="text-right">Total (Kz)</th>
                    <th className="text-right">Pago (Kz)</th>
                    <th className="text-right">Saldo (Kz)</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map(c => {
                    const saldo = c.total - c.pago;
                    return (
                      <tr key={c.id} className={c.estado === "ANULADO" ? "opacity-50" : ""}>
                        <td className="font-mono text-xs text-brand-700 font-semibold">{c.numero}</td>
                        <td className="text-xs text-gray-500 whitespace-nowrap">{c.data}</td>
                        <td className="font-medium text-sm">{c.fornecedor}</td>
                        <td className="text-right font-mono text-sm">{c.total.toLocaleString("pt-PT")}</td>
                        <td className="text-right font-mono text-sm text-green-700">
                          {c.pago > 0 ? c.pago.toLocaleString("pt-PT") : "—"}
                        </td>
                        <td className={`text-right font-mono text-sm font-medium ${saldo > 0 ? "text-orange-600" : "text-gray-400"}`}>
                          {saldo > 0 ? saldo.toLocaleString("pt-PT") : "—"}
                        </td>
                        <td>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_BADGE[c.estado]}`}>
                            {c.estado}
                          </span>
                        </td>
                        <td className="flex items-center gap-1">
                          <button className="btn-ghost py-1 px-2 text-xs" onClick={() => handleOpenVer(c)}>Ver</button>
                          <button
                            className="py-1 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            onClick={() => handleOpenEditar(c)} title="Editar"
                          >✏️</button>
                          <button className="py-1 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => handleOpenDelete(c)} title="Eliminar">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-brand-700 text-white">
                    <td colSpan={3} className="px-4 py-3 font-bold text-sm uppercase tracking-wider">Totais do período</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {filtradas.reduce((s, c) => s + c.total, 0).toLocaleString("pt-PT")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {filtradas.reduce((s, c) => s + c.pago, 0).toLocaleString("pt-PT")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {filtradas.reduce((s, c) => s + (c.total - c.pago), 0).toLocaleString("pt-PT")}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center pb-2">
          PGCA Angola — Decreto n.º 82/01 · Exercício {exercicio} · Valores em Kwanza (Kz)
        </p>
      </div>
    </div>
  );
}
