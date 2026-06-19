"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Topbar from "@/components/Topbar";
import { fmtKz } from "@/lib/utils";
import { useWindowManager } from "@/lib/windowManager";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tipo = "clientes" | "fornecedores";
type TipoVenc = "A RECEBER" | "A PAGAR";
type Modulo = "VENDAS" | "COMPRAS" | "FISCAL" | "RH" | "OUTRO";
type EstadoVenc = "PENDENTE" | "PAGO" | "ATRASADO" | "CANCELADO";

interface Vencimento {
  id: string;
  entidade: string;
  tipo: TipoVenc;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  referencia: string;
  modulo: Modulo;
  estado: EstadoVenc;
  criadoEm: string;
}

interface AgingRow {
  entidade: string;
  nif: string;
  referencia: string;
  dataVenc: string;
  diasAtraso: number;
  valor: number;
  pago: number;
  saldo: number;
  bucket: "corrente" | "0-30" | "31-60" | "61-90" | "91-120" | ">120";
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_VENCIMENTOS: Vencimento[] = [
  { id: "v1", entidade: "Petro Distribuição SA", tipo: "A RECEBER", valor: 1425000, dataVencimento: "2026-06-15", referencia: "FT 2026/A/00047", modulo: "VENDAS", estado: "PENDENTE", criadoEm: "2026-05-31" },
  { id: "v2", entidade: "Construções Unidas Lda.", tipo: "A RECEBER", valor: 969000, dataVencimento: "2026-06-30", referencia: "FT 2026/A/00046", modulo: "VENDAS", estado: "PENDENTE", criadoEm: "2026-05-30" },
  { id: "v3", entidade: "Fornecedores Angola Lda.", tipo: "A PAGAR", valor: 750000, dataVencimento: "2026-06-10", referencia: "FC 2026/001", modulo: "COMPRAS", estado: "PENDENTE", criadoEm: "2026-05-10" },
  { id: "v4", entidade: "AT Angola SARL", tipo: "A PAGAR", valor: 320000, dataVencimento: "2026-05-30", referencia: "FC 2026/002", modulo: "FISCAL", estado: "ATRASADO", criadoEm: "2026-04-30" },
  { id: "v5", entidade: "Telecom Angola SA", tipo: "A RECEBER", valor: 3648000, dataVencimento: "2026-07-01", referencia: "FT 2026/A/00045", modulo: "VENDAS", estado: "PAGO", dataPagamento: "2026-06-01", criadoEm: "2026-05-29" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function diasAtraso(dataStr: string): number {
  const hoje = new Date();
  const d = new Date(dataStr);
  const diff = Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function bucket(dias: number): AgingRow["bucket"] {
  if (dias <= 0)   return "corrente";
  if (dias <= 30)  return "0-30";
  if (dias <= 60)  return "31-60";
  if (dias <= 90)  return "61-90";
  if (dias <= 120) return "91-120";
  return ">120";
}

function bucketColor(b: AgingRow["bucket"]): string {
  switch (b) {
    case "corrente": return "bg-green-100 text-green-800";
    case "0-30":     return "bg-blue-100 text-blue-800";
    case "31-60":    return "bg-yellow-100 text-yellow-800";
    case "61-90":    return "bg-orange-100 text-orange-800";
    case "91-120":   return "bg-red-100 text-red-800";
    case ">120":     return "bg-red-200 text-red-900 font-bold";
  }
}

function fmtData(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const BUCKETS: AgingRow["bucket"][] = ["corrente", "0-30", "31-60", "61-90", "91-120", ">120"];
const BUCKET_LABELS: Record<AgingRow["bucket"], string> = {
  "corrente": "Corrente",
  "0-30":     "1–30 dias",
  "31-60":    "31–60 dias",
  "61-90":    "61–90 dias",
  "91-120":   "91–120 dias",
  ">120":     "> 120 dias",
};

const ESTADO_COLOR: Record<EstadoVenc, string> = {
  PENDENTE:   "bg-yellow-100 text-yellow-800",
  PAGO:       "bg-green-100 text-green-800",
  ATRASADO:   "bg-red-100 text-red-800",
  CANCELADO:  "bg-gray-100 text-gray-600",
};

// ── Modal: Novo Vencimento ─────────────────────────────────────────────────────
interface NovoVencimentoModalProps {
  onClose: () => void;
  onSave: (v: Vencimento) => void;
}

function NovoVencimentoModal({ onClose, onSave }: NovoVencimentoModalProps) {
  const [form, setForm] = useState({
    entidade: "",
    tipo: "A RECEBER" as TipoVenc,
    valor: "",
    dataVencimento: "",
    referencia: "",
    modulo: "VENDAS" as Modulo,
    estado: "PENDENTE" as EstadoVenc,
  });

  function handleSave() {
    if (!form.entidade || !form.valor || !form.dataVencimento) return;
    const venc: Vencimento = {
      id: crypto.randomUUID(),
      entidade: form.entidade,
      tipo: form.tipo,
      valor: parseFloat(form.valor),
      dataVencimento: form.dataVencimento,
      referencia: form.referencia,
      modulo: form.modulo,
      estado: form.estado,
      criadoEm: new Date().toISOString().split("T")[0],
    };
    onSave(venc);
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Entidade *</label>
            <input className="input" placeholder="Nome do cliente ou fornecedor" value={form.entidade} onChange={e => setForm(p => ({ ...p, entidade: e.target.value }))} />
          </div>
          <div>
            <label className="label">Tipo *</label>
            <select className="input" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as TipoVenc }))}>
              <option value="A RECEBER">A RECEBER</option>
              <option value="A PAGAR">A PAGAR</option>
            </select>
          </div>
          <div>
            <label className="label">Módulo *</label>
            <select className="input" value={form.modulo} onChange={e => setForm(p => ({ ...p, modulo: e.target.value as Modulo }))}>
              <option value="VENDAS">VENDAS</option>
              <option value="COMPRAS">COMPRAS</option>
              <option value="FISCAL">FISCAL</option>
              <option value="RH">RH</option>
              <option value="OUTRO">OUTRO</option>
            </select>
          </div>
          <div>
            <label className="label">Valor (AOA) *</label>
            <input className="input font-mono" type="number" min="0" step="0.01" placeholder="0.00" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} />
          </div>
          <div>
            <label className="label">Data de Vencimento *</label>
            <input className="input" type="date" value={form.dataVencimento} onChange={e => setForm(p => ({ ...p, dataVencimento: e.target.value }))} />
          </div>
          <div>
            <label className="label">Referência</label>
            <input className="input font-mono" placeholder="Ex: FT 2026/A/00001" value={form.referencia} onChange={e => setForm(p => ({ ...p, referencia: e.target.value }))} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value as EstadoVenc }))}>
              <option value="PENDENTE">PENDENTE</option>
              <option value="PAGO">PAGO</option>
              <option value="ATRASADO">ATRASADO</option>
              <option value="CANCELADO">CANCELADO</option>
            </select>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={handleSave} className="btn-primary" disabled={!form.entidade || !form.valor || !form.dataVencimento}>
          Guardar Vencimento
        </button>
      </div>
    </div>
  );
}

// ── Modal: Editar Vencimento ───────────────────────────────────────────────────
interface EditarVencimentoModalProps {
  vencimento: Vencimento;
  onClose: () => void;
  onSave: (v: Vencimento) => void;
}

function EditarVencimentoModal({ vencimento, onClose, onSave }: EditarVencimentoModalProps) {
  const [form, setForm] = useState({
    entidade: vencimento.entidade,
    tipo: vencimento.tipo,
    valor: vencimento.valor.toString(),
    dataVencimento: vencimento.dataVencimento,
    dataPagamento: vencimento.dataPagamento ?? "",
    referencia: vencimento.referencia,
    modulo: vencimento.modulo,
    estado: vencimento.estado,
  });

  function handleSave() {
    if (!form.entidade || !form.valor || !form.dataVencimento) return;
    onSave({
      ...vencimento,
      entidade: form.entidade,
      tipo: form.tipo,
      valor: parseFloat(form.valor),
      dataVencimento: form.dataVencimento,
      dataPagamento: form.dataPagamento || undefined,
      referencia: form.referencia,
      modulo: form.modulo,
      estado: form.estado,
    });
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Entidade *</label>
            <input className="input" value={form.entidade} onChange={e => setForm(p => ({ ...p, entidade: e.target.value }))} />
          </div>
          <div>
            <label className="label">Tipo *</label>
            <select className="input" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as TipoVenc }))}>
              <option value="A RECEBER">A RECEBER</option>
              <option value="A PAGAR">A PAGAR</option>
            </select>
          </div>
          <div>
            <label className="label">Módulo</label>
            <select className="input" value={form.modulo} onChange={e => setForm(p => ({ ...p, modulo: e.target.value as Modulo }))}>
              <option value="VENDAS">VENDAS</option>
              <option value="COMPRAS">COMPRAS</option>
              <option value="FISCAL">FISCAL</option>
              <option value="RH">RH</option>
              <option value="OUTRO">OUTRO</option>
            </select>
          </div>
          <div>
            <label className="label">Valor (AOA) *</label>
            <input className="input font-mono" type="number" min="0" step="0.01" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} />
          </div>
          <div>
            <label className="label">Data de Vencimento *</label>
            <input className="input" type="date" value={form.dataVencimento} onChange={e => setForm(p => ({ ...p, dataVencimento: e.target.value }))} />
          </div>
          <div>
            <label className="label">Data de Pagamento</label>
            <input className="input" type="date" value={form.dataPagamento} onChange={e => setForm(p => ({ ...p, dataPagamento: e.target.value }))} />
          </div>
          <div>
            <label className="label">Referência</label>
            <input className="input font-mono" value={form.referencia} onChange={e => setForm(p => ({ ...p, referencia: e.target.value }))} />
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value as EstadoVenc }))}>
              <option value="PENDENTE">PENDENTE</option>
              <option value="PAGO">PAGO</option>
              <option value="ATRASADO">ATRASADO</option>
              <option value="CANCELADO">CANCELADO</option>
            </select>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={handleSave} className="btn-primary">Guardar Alterações</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MapaVencimentosPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [tipo, setTipo] = useState<Tipo>("clientes");
  const [exercicio] = useState("2025");
  const [pesquisa, setPesquisa] = useState("");
  const [filtroB, setFiltroB] = useState<AgingRow["bucket"] | "Todos">("Todos");
  const [activeTab, setActiveTab] = useState<"aging" | "vencimentos">("aging");

  // ── Vencimentos CRUD state ─────────────────────────────────────────────────
  const [vencimentos, setVencimentos] = useState<Vencimento[]>(() => {
    if (typeof window === "undefined") return SEED_VENCIMENTOS;
    try {
      const raw = localStorage.getItem("educontas-vencimentos");
      return raw ? JSON.parse(raw) : SEED_VENCIMENTOS;
    } catch { return SEED_VENCIMENTOS; }
  });

  useEffect(() => {
    try { localStorage.setItem("educontas-vencimentos", JSON.stringify(vencimentos)); } catch { /* ignore */ }
  }, [vencimentos]);

  const addVencimento = useCallback((v: Vencimento) => {
    setVencimentos(prev => [v, ...prev]);
  }, []);

  const updateVencimento = useCallback((updated: Vencimento) => {
    setVencimentos(prev => prev.map(v => v.id === updated.id ? updated : v));
  }, []);

  const deleteVencimento = useCallback((id: string) => {
    setVencimentos(prev => prev.filter(v => v.id !== id));
  }, []);

  const markAsPago = useCallback((id: string) => {
    setVencimentos(prev => prev.map(v =>
      v.id === id
        ? { ...v, estado: "PAGO", dataPagamento: new Date().toISOString().split("T")[0] }
        : v
    ));
  }, []);

  // ── Window helpers ─────────────────────────────────────────────────────────
  function openNovoVencimento() {
    const winId = `novo-venc-${crypto.randomUUID()}`;
    openWindow({
      id: winId,
      title: "Novo Vencimento",
      icon: "📅",
      content: <NovoVencimentoModal onClose={() => closeWindow(winId)} onSave={addVencimento} />,
      x: 60, y: 30, width: 620, height: 500, minimized: false, maximized: false,
    });
  }

  function openEditarVencimento(venc: Vencimento) {
    const winId = `edit-venc-${venc.id}`;
    openWindow({
      id: winId,
      title: "Editar Vencimento",
      icon: "✏️",
      content: <EditarVencimentoModal vencimento={venc} onClose={() => closeWindow(winId)} onSave={updateVencimento} />,
      x: 80, y: 40, width: 620, height: 540, minimized: false, maximized: false,
    });
  }

  function openDeleteConfirm(venc: Vencimento) {
    const winId = `del-venc-${venc.id}`;
    openWindow({
      id: winId,
      title: "Confirmar Eliminação",
      icon: "🗑️",
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-sm text-gray-700">
              Tem a certeza que deseja eliminar o vencimento <strong>{venc.referencia || venc.entidade}</strong>?
            </p>
            <p className="text-xs text-gray-500">Esta acção é irreversível.</p>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
            <button onClick={() => closeWindow(winId)} className="btn-secondary">Cancelar</button>
            <button onClick={() => { deleteVencimento(venc.id); closeWindow(winId); }} className="btn-primary bg-red-600 hover:bg-red-700">
              Eliminar
            </button>
          </div>
        </div>
      ),
      x: 200, y: 150, width: 480, height: 220, minimized: false, maximized: false,
    });
  }

  // ── Load real data from localStorage ──────────────────────────────────────
  const vendas = useMemo(() => {
    try {
      const raw = localStorage.getItem(`educontas-vendas-${exercicio}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [exercicio]);

  const compras = useMemo(() => {
    try {
      const raw = localStorage.getItem(`educontas-compras-${exercicio}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [exercicio]);

  const vendas24 = useMemo(() => {
    try {
      const raw = localStorage.getItem("educontas-vendas-2024");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const compras24 = useMemo(() => {
    try {
      const raw = localStorage.getItem("educontas-compras-2024");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  // ── Build aging rows ──────────────────────────────────────────────────────
  const rows = useMemo((): AgingRow[] => {
    const allVendas = [...vendas, ...vendas24].filter((f: { estado: string }) =>
      f.estado === "LANÇADO" || f.estado === "PARCIAL"
    );
    const allCompras = [...compras, ...compras24].filter((c: { estado: string }) =>
      c.estado === "LANÇADO" || c.estado === "PARCIAL"
    );

    const source = tipo === "clientes" ? allVendas : allCompras;

    return source.map((item: {
      numero: string; data: string; cliente?: string; fornecedor?: string;
      nif: string; total: number; pago: number;
    }) => {
      const dataVenc = new Date(item.data);
      dataVenc.setDate(dataVenc.getDate() + 30);
      const vencStr = dataVenc.toISOString().split("T")[0];
      const dias = diasAtraso(vencStr);
      const saldo = item.total - item.pago;

      return {
        entidade: tipo === "clientes" ? (item.cliente ?? "—") : (item.fornecedor ?? "—"),
        nif: item.nif ?? "—",
        referencia: item.numero,
        dataVenc: vencStr,
        diasAtraso: dias,
        valor: item.total,
        pago: item.pago,
        saldo,
        bucket: bucket(dias),
      } as AgingRow;
    }).filter((r: AgingRow) => r.saldo > 0);
  }, [tipo, vendas, compras, vendas24, compras24]);

  // ── Filter aging ───────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    rows.filter(r => {
      if (filtroB !== "Todos" && r.bucket !== filtroB) return false;
      if (pesquisa) {
        const q = pesquisa.toLowerCase();
        return r.entidade.toLowerCase().includes(q) || r.referencia.toLowerCase().includes(q);
      }
      return true;
    }),
  [rows, filtroB, pesquisa]);

  // ── Totals per bucket ─────────────────────────────────────────────────────
  const totaisBucket = useMemo(() => {
    const map: Record<AgingRow["bucket"], number> = {
      "corrente": 0, "0-30": 0, "31-60": 0, "61-90": 0, "91-120": 0, ">120": 0,
    };
    rows.forEach(r => { map[r.bucket] += r.saldo; });
    return map;
  }, [rows]);

  const totalGeral = rows.reduce((s, r) => s + r.saldo, 0);
  const totalVencido = rows.filter(r => r.bucket !== "corrente").reduce((s, r) => s + r.saldo, 0);
  const percVencido = totalGeral > 0 ? (totalVencido / totalGeral * 100).toFixed(1) : "0.0";

  // ── Filtered vencimentos ───────────────────────────────────────────────────
  const filteredVenc = useMemo(() => {
    if (!pesquisa) return vencimentos;
    const q = pesquisa.toLowerCase();
    return vencimentos.filter(v =>
      v.entidade.toLowerCase().includes(q) || v.referencia.toLowerCase().includes(q)
    );
  }, [vencimentos, pesquisa]);

  return (
    <div>
      <Topbar
        title="Mapa de Vencimentos"
        subtitle={`Aging Report · ${tipo === "clientes" ? "Contas a Receber" : "Contas a Pagar"} · Exercício ${exercicio}`}
        actions={
          <>
            <button onClick={openNovoVencimento} className="btn-primary">+ Novo Vencimento</button>
            <button className="btn-secondary">Exportar PDF</button>
            <button className="btn-secondary">Exportar XLSX</button>
          </>
        }
      />

      <div className="p-6 space-y-5">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          <button onClick={() => setActiveTab("aging")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === "aging" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Aging Report
          </button>
          <button onClick={() => setActiveTab("vencimentos")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === "vencimentos" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Vencimentos ({vencimentos.length})
          </button>
        </div>

        {activeTab === "aging" && (
          <>
            {/* Tipo toggle */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                <button onClick={() => setTipo("clientes")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tipo === "clientes" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  👥 Clientes (a Receber)
                </button>
                <button onClick={() => setTipo("fornecedores")}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tipo === "fornecedores" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  🏭 Fornecedores (a Pagar)
                </button>
              </div>
            </div>

            {/* Bucket summary cards */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {BUCKETS.map(b => {
                const v = totaisBucket[b];
                const pct = totalGeral > 0 ? (v / totalGeral * 100).toFixed(0) : "0";
                const isSelected = filtroB === b;
                return (
                  <button key={b} onClick={() => setFiltroB(isSelected ? "Todos" : b)}
                    className={`card p-3 text-left transition-all hover:shadow-md ${isSelected ? "ring-2 ring-brand-500" : ""}`}>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">{BUCKET_LABELS[b]}</p>
                    <p className={`text-sm font-bold mt-1 font-mono ${
                      b === "corrente" ? "text-green-700" :
                      b === "0-30"     ? "text-blue-700" :
                      b === "31-60"    ? "text-yellow-700" :
                      b === "61-90"    ? "text-orange-700" :
                      "text-red-700"
                    }`}>{fmtKz(v, true)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{pct}% do total</p>
                  </button>
                );
              })}
            </div>

            {/* Alert */}
            {parseFloat(percVencido) > 20 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-800 text-sm">{percVencido}% da carteira está vencida</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    {tipo === "clientes"
                      ? "Reforce as cobranças e renegociação de prazos com clientes em atraso."
                      : "Negoceie extensões de prazo ou acione pagamentos parciais para fornecedores."}
                  </p>
                </div>
              </div>
            )}

            {/* Aging Table */}
            <div className="card">
              <div className="card-header flex flex-wrap items-center gap-3">
                <h3 className="flex-1">{tipo === "clientes" ? "Clientes com Saldo em Aberto" : "Fornecedores com Saldo em Aberto"}</h3>
                <input className="input max-w-[220px]" placeholder="Pesquisar entidade…"
                  value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
                <select className="input max-w-[160px]" value={filtroB} onChange={e => setFiltroB(e.target.value as typeof filtroB)}>
                  <option value="Todos">Todos os escalões</option>
                  {BUCKETS.map(b => <option key={b} value={b}>{BUCKET_LABELS[b]}</option>)}
                </select>
                <span className="badge badge-blue">{filtered.length} registos</span>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="font-semibold">Sem saldos em aberto</p>
                  <p className="text-sm mt-1">{tipo === "clientes" ? "Todos os clientes estão com pagamentos em dia." : "Todos os fornecedores estão pagos."}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-auto w-full">
                    <thead>
                      <tr>
                        <th className="text-left">Entidade</th>
                        <th className="text-left">Referência</th>
                        <th className="text-left">Vencimento</th>
                        <th className="text-right">Valor Total</th>
                        <th className="text-right">Pago</th>
                        <th className="text-right">Saldo</th>
                        <th className="text-center">Atraso</th>
                        <th className="text-center">Escalão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered
                        .sort((a, b) => b.diasAtraso - a.diasAtraso)
                        .map((r, i) => (
                        <tr key={i} className={r.diasAtraso > 90 ? "bg-red-50/30" : ""}>
                          <td>
                            <p className="font-semibold text-sm">{r.entidade}</p>
                            <p className="text-xs text-gray-400 font-mono">{r.nif}</p>
                          </td>
                          <td className="font-mono text-xs text-brand-700">{r.referencia}</td>
                          <td className="text-sm">{fmtData(r.dataVenc)}</td>
                          <td className="text-right font-mono text-sm">{fmtKz(r.valor)}</td>
                          <td className="text-right font-mono text-sm text-green-700">{fmtKz(r.pago)}</td>
                          <td className="text-right font-mono font-bold text-sm">{fmtKz(r.saldo)}</td>
                          <td className="text-center">
                            {r.diasAtraso === 0 ? (
                              <span className="text-xs text-green-600">Em dia</span>
                            ) : (
                              <span className="text-xs font-semibold text-red-700">{r.diasAtraso}d</span>
                            )}
                          </td>
                          <td className="text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${bucketColor(r.bucket)}`}>
                              {BUCKET_LABELS[r.bucket]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-brand-700 text-white font-bold">
                        <td colSpan={4} className="px-4 py-3 text-sm uppercase tracking-wide">
                          Total ({filtered.length} {tipo === "clientes" ? "clientes" : "fornecedores"})
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{fmtKz(filtered.reduce((s, r) => s + r.pago, 0))}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmtKz(filtered.reduce((s, r) => s + r.saldo, 0))}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "vencimentos" && (
          <div className="card">
            <div className="card-header flex flex-wrap items-center gap-3">
              <h3 className="flex-1">Vencimentos Registados</h3>
              <input className="input max-w-[220px]" placeholder="Pesquisar…"
                value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
              <span className="badge badge-blue">{filteredVenc.length} registos</span>
            </div>

            {filteredVenc.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📅</div>
                <p className="font-semibold">Nenhum vencimento registado</p>
                <p className="text-sm mt-1">Clique em &ldquo;Novo Vencimento&rdquo; para adicionar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-auto w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Entidade</th>
                      <th className="text-left">Referência</th>
                      <th className="text-center">Tipo</th>
                      <th className="text-center">Módulo</th>
                      <th className="text-right">Valor</th>
                      <th className="text-center">Vencimento</th>
                      <th className="text-center">Pagamento</th>
                      <th className="text-center">Estado</th>
                      <th className="text-center">Acções</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVenc.map(v => (
                      <tr key={v.id}>
                        <td>
                          <p className="font-semibold text-sm">{v.entidade}</p>
                          <p className="text-xs text-gray-400">{v.criadoEm}</p>
                        </td>
                        <td className="font-mono text-xs text-brand-700">{v.referencia || "—"}</td>
                        <td className="text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${v.tipo === "A RECEBER" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}>
                            {v.tipo}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="text-xs text-gray-600">{v.modulo}</span>
                        </td>
                        <td className="text-right font-mono text-sm font-semibold">{fmtKz(v.valor)}</td>
                        <td className="text-center text-sm">{fmtData(v.dataVencimento)}</td>
                        <td className="text-center text-sm text-green-700">{v.dataPagamento ? fmtData(v.dataPagamento) : "—"}</td>
                        <td className="text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLOR[v.estado]}`}>
                            {v.estado}
                          </span>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {v.estado === "PENDENTE" && (
                              <button
                                onClick={() => markAsPago(v.id)}
                                title="Marcar como Pago"
                                className="text-green-600 hover:text-green-800 px-1.5 py-1 rounded hover:bg-green-50 transition-colors text-sm"
                              >
                                ✅
                              </button>
                            )}
                            <button
                              onClick={() => openEditarVencimento(v)}
                              title="Editar"
                              className="text-blue-600 hover:text-blue-800 px-1.5 py-1 rounded hover:bg-blue-50 transition-colors text-sm"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(v)}
                              title="Eliminar"
                              className="text-red-500 hover:text-red-700 px-1.5 py-1 rounded hover:bg-red-50 transition-colors text-sm"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-brand-700 text-white font-bold">
                      <td colSpan={4} className="px-4 py-3 text-sm uppercase tracking-wide">
                        Total ({filteredVenc.length} vencimentos)
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{fmtKz(filteredVenc.reduce((s, v) => s + v.valor, 0))}</td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Mapa de Vencimentos · Prazo de pagamento base: 30 dias · Exercício {exercicio}
        </p>
      </div>
    </div>
  );
}
