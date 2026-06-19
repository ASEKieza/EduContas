"use client";

import { useState, useMemo } from "react";
import { useWindowManager } from "@/lib/windowManager";

// ── Types ──────────────────────────────────────────────────────────────────────
type TipoArtigo = "produto" | "servico" | "materia_prima" | "embalagem";
type CategoriaArtigo = "informatica" | "escritorio" | "manutencao" | "consultoria" | "logistica" | "outros";

interface Artigo {
  id: string;
  codigo: string;
  codigoBarras?: string;
  tipo: TipoArtigo;
  categoria: CategoriaArtigo;
  nome: string;
  descricao?: string;
  unidade: string;
  precoVenda: number;
  precoCusto: number;
  margem: number;
  ivaTaxa: number;
  contaVenda: string;
  contaCompra: string;
  contaStockPGCA: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  armazem: string;
  pesoKg?: number;
  activo: boolean;
}

const ARTIGOS_DEMO: Artigo[] = [
  {
    id: "A001", codigo: "ART-001", codigoBarras: "6001101234567",
    tipo: "produto", categoria: "informatica",
    nome: "Computador Portátil Dell Latitude 5540",
    descricao: "Intel Core i5-1345U, 16GB RAM, 512GB SSD, 15.6\" FHD",
    unidade: "UN", precoVenda: 450000, precoCusto: 320000, margem: 40.6, ivaTaxa: 14,
    contaVenda: "61.3", contaCompra: "21.2", contaStockPGCA: "26",
    stockActual: 12, stockMinimo: 3, stockMaximo: 30, armazem: "Principal", pesoKg: 1.8, activo: true,
  },
  {
    id: "A002", codigo: "ART-002", codigoBarras: "6001101234568",
    tipo: "produto", categoria: "informatica",
    nome: "Monitor LG 24\" Full HD",
    descricao: "24MR400-B, 1920×1080, IPS, 100Hz",
    unidade: "UN", precoVenda: 120000, precoCusto: 82000, margem: 46.3, ivaTaxa: 14,
    contaVenda: "61.3", contaCompra: "21.2", contaStockPGCA: "26",
    stockActual: 8, stockMinimo: 2, stockMaximo: 20, armazem: "Principal", pesoKg: 3.5, activo: true,
  },
  {
    id: "A003", codigo: "ART-003",
    tipo: "produto", categoria: "escritorio",
    nome: "Resma de Papel A4 80g/m²",
    descricao: "500 folhas, branco brilhante",
    unidade: "CX", precoVenda: 4500, precoCusto: 3100, margem: 45.2, ivaTaxa: 14,
    contaVenda: "61.3", contaCompra: "21.2", contaStockPGCA: "26",
    stockActual: 145, stockMinimo: 20, stockMaximo: 300, armazem: "Armazém B", activo: true,
  },
  {
    id: "A004", codigo: "SRV-001",
    tipo: "servico", categoria: "consultoria",
    nome: "Consultoria em Sistemas de Informação",
    descricao: "Hora de consultoria especializada em ERP e TI",
    unidade: "HR", precoVenda: 25000, precoCusto: 18000, margem: 38.9, ivaTaxa: 14,
    contaVenda: "62.1", contaCompra: "75.1", contaStockPGCA: "—",
    stockActual: 0, stockMinimo: 0, stockMaximo: 0, armazem: "—", activo: true,
  },
  {
    id: "A005", codigo: "SRV-002",
    tipo: "servico", categoria: "manutencao",
    nome: "Manutenção Preventiva de Equipamentos",
    descricao: "Serviço de manutenção mensal de equipamentos informáticos",
    unidade: "SV", precoVenda: 85000, precoCusto: 55000, margem: 54.5, ivaTaxa: 14,
    contaVenda: "62.1", contaCompra: "75.1", contaStockPGCA: "—",
    stockActual: 0, stockMinimo: 0, stockMaximo: 0, armazem: "—", activo: true,
  },
  {
    id: "A006", codigo: "ART-004", codigoBarras: "6001101234570",
    tipo: "materia_prima", categoria: "manutencao",
    nome: "Óleo Lubrificante 5W30",
    descricao: "Óleo sintético para manutenção, lata 4 litros",
    unidade: "LT", precoVenda: 8500, precoCusto: 5800, margem: 46.6, ivaTaxa: 14,
    contaVenda: "61.3", contaCompra: "21.2", contaStockPGCA: "26",
    stockActual: 32, stockMinimo: 10, stockMaximo: 100, armazem: "Armazém B", pesoKg: 3.5, activo: true,
  },
  {
    id: "A007", codigo: "ART-005",
    tipo: "embalagem", categoria: "logistica",
    nome: "Caixa de Cartão 40×30×25 cm",
    descricao: "Caixa de cartão canelado, dupla parede",
    unidade: "UN", precoVenda: 850, precoCusto: 450, margem: 88.9, ivaTaxa: 14,
    contaVenda: "61.3", contaCompra: "21.2", contaStockPGCA: "26",
    stockActual: 2, stockMinimo: 50, stockMaximo: 500, armazem: "Armazém B", activo: false,
  },
];

const TIPO_LABEL: Record<TipoArtigo, string> = {
  produto: "Produto", servico: "Serviço", materia_prima: "Matéria-Prima", embalagem: "Embalagem",
};
const TIPO_COLOR: Record<TipoArtigo, string> = {
  produto: "#3b82f6", servico: "#8b5cf6", materia_prima: "#f59e0b", embalagem: "#6b7280",
};
const CAT_LABEL: Record<CategoriaArtigo, string> = {
  informatica: "Informática", escritorio: "Escritório", manutencao: "Manutenção",
  consultoria: "Consultoria", logistica: "Logística", outros: "Outros",
};
const CONTA_PGCA_VENDAS: Record<string, string> = {
  "61.3":   "61.3 — Vendas Mercadorias",
  "61.1":   "61.1 — Vendas Produtos Acabados e Intermédios",
  "61.2":   "61.2 — Vendas Sub-produtos e Desperdícios",
  "62.1":   "62.1 — Prestações de Serviços (Principais)",
  "62.2":   "62.2 — Serviços Secundários",
};
const CONTA_PGCA_COMPRAS: Record<string, string> = {
  "21.2":   "21.2 — Compras Mercadorias",
  "21.1":   "21.1 — Compras Matérias-primas e Subsidiárias",
  "75.1":   "75.1 — Fornecimentos e Serviços Externos",
  "75.1.5": "75.1.5 — Trabalhos Especializados",
};

function fmtAOA(v: number) {
  return `Kz ${v.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}`;
}

const BLANK: Partial<Artigo> = {
  tipo: "produto", categoria: "outros", unidade: "UN",
  ivaTaxa: 14, contaVenda: "61.3", contaCompra: "21.2", contaStockPGCA: "26",
  stockMinimo: 0, stockMaximo: 0, stockActual: 0, armazem: "Principal", activo: true,
};

// ── Form component ─────────────────────────────────────────────────────────────
function ArtigoFormWindow({
  initialForm, isEdit, onSave, onClose,
}: {
  initialForm: Partial<Artigo>; isEdit: boolean;
  onSave: (data: Partial<Artigo>) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Artigo>>(initialForm);
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Identificação */}
        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Identificação</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Código *" value={form.codigo || ""} onChange={v => setForm(f => ({ ...f, codigo: v }))} />
            <Field label="Código de Barras / EAN" value={form.codigoBarras || ""} onChange={v => setForm(f => ({ ...f, codigoBarras: v }))} />
            <div className="col-span-2"><Field label="Nome *" value={form.nome || ""} onChange={v => setForm(f => ({ ...f, nome: v }))} /></div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-ink-600 mb-1">Descrição</label>
              <textarea value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 focus:outline-none focus:border-brand-400 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Tipo *</label>
              <select value={form.tipo || "produto"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoArtigo }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Categoria</label>
              <select value={form.categoria || "outros"} onChange={e => setForm(f => ({ ...f, categoria: e.target.value as CategoriaArtigo }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Unidade de Medida</label>
              <select value={form.unidade || "UN"} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {["UN","KG","LT","M","M²","M³","CX","SV","HR","KM","TON"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <Field label="Peso (kg)" value={String(form.pesoKg || "")} onChange={v => setForm(f => ({ ...f, pesoKg: Number(v) || undefined }))} type="number" />
          </div>
        </section>

        {/* Preços */}
        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Preços & IVA</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Preço de Venda (AOA, s/ IVA)" value={String(form.precoVenda ?? "")} onChange={v => setForm(f => ({ ...f, precoVenda: Number(v) }))} type="number" />
            <Field label="Preço de Custo (Kz)" value={String(form.precoCusto ?? "")} onChange={v => setForm(f => ({ ...f, precoCusto: Number(v) }))} type="number" />
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Taxa IVA (%)</label>
              <select value={String(form.ivaTaxa ?? 14)} onChange={e => setForm(f => ({ ...f, ivaTaxa: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {[0, 5, 7, 14].map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Contabilidade */}
        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Contabilidade PGCA</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Conta de Venda</label>
              <select value={form.contaVenda || "61.3"} onChange={e => setForm(f => ({ ...f, contaVenda: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {Object.entries(CONTA_PGCA_VENDAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Conta de Compra</label>
              <select value={form.contaCompra || "21.2"} onChange={e => setForm(f => ({ ...f, contaCompra: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {Object.entries(CONTA_PGCA_COMPRAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Field label="Conta de Stock PGCA" value={form.contaStockPGCA || "26"} onChange={v => setForm(f => ({ ...f, contaStockPGCA: v }))} />
          </div>
        </section>

        {/* Stock (only for non-services) */}
        {form.tipo !== "servico" && (
          <section>
            <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Stock & Armazém</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Stock Actual" value={String(form.stockActual ?? 0)} onChange={v => setForm(f => ({ ...f, stockActual: Number(v) }))} type="number" />
              <Field label="Stock Mínimo" value={String(form.stockMinimo ?? 0)} onChange={v => setForm(f => ({ ...f, stockMinimo: Number(v) }))} type="number" />
              <Field label="Stock Máximo" value={String(form.stockMaximo ?? 0)} onChange={v => setForm(f => ({ ...f, stockMaximo: Number(v) }))} type="number" />
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Armazém</label>
                <select value={form.armazem || "Principal"} onChange={e => setForm(f => ({ ...f, armazem: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                  {["Principal","Armazém B","Armazém C","Consignação"].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          </section>
        )}
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50">Cancelar</button>
        <button onClick={() => onSave(form)} className="px-5 py-2.5 text-sm font-semibold rounded-lg text-white" style={{ background: "#CC0000" }}>
          {isEdit ? "Guardar Alterações" : "Criar Artigo"}
        </button>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ArtigosPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [lista, setLista] = useState<Artigo[]>(ARTIGOS_DEMO);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterCat, setFilterCat] = useState<string>("todos");
  const [filterActivo, setFilterActivo] = useState<string>("todos");
  const [selected, setSelected] = useState<Artigo | null>(null);
  const [tab, setTab] = useState<"ficha" | "stock" | "precos">("ficha");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return lista.filter(a => {
      if (filterTipo !== "todos" && a.tipo !== filterTipo) return false;
      if (filterCat !== "todos" && a.categoria !== filterCat) return false;
      if (filterActivo === "activo" && !a.activo) return false;
      if (filterActivo === "inactivo" && a.activo) return false;
      if (q && !a.nome.toLowerCase().includes(q) && !a.codigo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lista, search, filterTipo, filterCat, filterActivo]);

  const kpis = useMemo(() => ({
    total: lista.length,
    activos: lista.filter(a => a.activo).length,
    stockBaixo: lista.filter(a => a.tipo !== "servico" && a.stockActual < a.stockMinimo).length,
    valorStock: lista.reduce((s, a) => s + a.stockActual * a.precoCusto, 0),
  }), [lista]);

  function openCriar() {
    const winId = `criar-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Novo Artigo / Serviço", icon: "📦",
      content: (
        <ArtigoFormWindow
          initialForm={{ ...BLANK }}
          isEdit={false}
          onSave={(data) => {
            if (!data.nome || !data.codigo) return;
            const margem = data.precoCusto && data.precoVenda && data.precoCusto > 0
              ? ((data.precoVenda - data.precoCusto) / data.precoCusto) * 100 : 0;
            const id = `A${String(lista.length + 1).padStart(3, "0")}`;
            setLista(l => [...l, {
              id, codigo: data.codigo!, codigoBarras: data.codigoBarras,
              tipo: data.tipo as TipoArtigo || "produto", categoria: data.categoria as CategoriaArtigo || "outros",
              nome: data.nome!, descricao: data.descricao, unidade: data.unidade || "UN",
              precoVenda: data.precoVenda || 0, precoCusto: data.precoCusto || 0, margem,
              ivaTaxa: data.ivaTaxa || 14,
              contaVenda: data.contaVenda || "61.3", contaCompra: data.contaCompra || "21.2",
              contaStockPGCA: data.contaStockPGCA || "26",
              stockActual: data.stockActual || 0, stockMinimo: data.stockMinimo || 0,
              stockMaximo: data.stockMaximo || 0, armazem: data.armazem || "Principal",
              pesoKg: data.pesoKg, activo: data.activo ?? true,
            }]);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 40, y: 20, width: 780, height: 580, minimized: false, maximized: false,
    });
  }
  function openEditar(a: Artigo) {
    const winId = `editar-${a.id}`;
    openWindow({
      id: winId, title: `Editar Artigo — ${a.nome}`, icon: "📦",
      content: (
        <ArtigoFormWindow
          initialForm={{ ...a }}
          isEdit={true}
          onSave={(data) => {
            if (!data.nome || !data.codigo) return;
            const margem = data.precoCusto && data.precoVenda && data.precoCusto > 0
              ? ((data.precoVenda - data.precoCusto) / data.precoCusto) * 100 : 0;
            setLista(l => l.map(x => x.id === a.id ? { ...x, ...data, margem } as Artigo : x));
            if (selected?.id === a.id) setSelected({ ...selected, ...data, margem } as Artigo);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 60, y: 40, width: 780, height: 580, minimized: false, maximized: false,
    });
  }

  const stockStatus = (a: Artigo) => {
    if (a.tipo === "servico") return null;
    if (a.stockActual < a.stockMinimo) return { label: "Stock Baixo", color: "#ef4444" };
    if (a.stockActual > a.stockMaximo && a.stockMaximo > 0) return { label: "Stock Excedido", color: "#f59e0b" };
    return { label: "Stock Normal", color: "#10b981" };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Artigos & Serviços</h1>
          <p className="text-sm text-ink-500 mt-0.5">Catálogo de produtos e serviços · PGCA 311/711/721</p>
        </div>
        <button onClick={openCriar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#CC0000" }}>
          <span className="text-lg leading-none">+</span> Novo Artigo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total de Artigos", value: kpis.total, sub: `${kpis.activos} activos` },
          { label: "Stock Baixo", value: kpis.stockBaixo, sub: "abaixo do mínimo", alert: kpis.stockBaixo > 0 },
          { label: "Valor do Stock", value: fmtAOA(kpis.valorStock), sub: "ao preço de custo" },
          { label: "Artigos Activos", value: kpis.activos, sub: `${lista.length - kpis.activos} inactivos` },
        ].map(k => (
          <div key={k.label} className={`bg-white rounded-xl border shadow-sm p-4 ${k.alert ? "border-red-200" : "border-ink-100"}`}>
            <p className="text-xs text-ink-500 font-medium">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.alert ? "text-red-600" : "text-ink-900"}`}>{k.value}</p>
            <p className="text-xs text-ink-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex gap-4">
        {/* List */}
        <div className="flex-1 bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="flex items-center gap-3 p-4 border-b border-ink-100 flex-wrap">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por nome ou código..."
              className="flex-1 min-w-40 px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 focus:outline-none focus:border-brand-400" />
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none">
              <option value="todos">Todos os tipos</option>
              {(Object.entries(TIPO_LABEL)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none">
              <option value="todos">Todas categorias</option>
              {(Object.entries(CAT_LABEL)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filterActivo} onChange={e => setFilterActivo(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none">
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50">
                  {["Código","Nome","Tipo","Unid.","Preço Venda","Preço Custo","Margem","Stock",""].map(h =>
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => {
                  const ss = stockStatus(a);
                  return (
                    <tr key={a.id}
                      onClick={() => { setSelected(a); setTab("ficha"); }}
                      className={`border-b border-ink-50 cursor-pointer transition-colors ${selected?.id === a.id ? "bg-brand-50" : "hover:bg-ink-50"} ${!a.activo ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3 font-mono text-xs text-ink-500">{a.codigo}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink-900 truncate max-w-48">{a.nome}</p>
                        <p className="text-xs text-ink-400">{CAT_LABEL[a.categoria]}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                          style={{ background: TIPO_COLOR[a.tipo] }}>
                          {TIPO_LABEL[a.tipo]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-600 text-xs">{a.unidade}</td>
                      <td className="px-4 py-3 font-medium text-ink-900">{fmtAOA(a.precoVenda)}</td>
                      <td className="px-4 py-3 text-ink-600">{fmtAOA(a.precoCusto)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${a.margem > 50 ? "text-green-600" : a.margem > 25 ? "text-yellow-600" : "text-red-600"}`}>
                          {a.margem.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {ss ? (
                          <div>
                            <span className="font-medium text-ink-800">{a.stockActual} {a.unidade}</span>
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-white"
                              style={{ background: ss.color }}>
                              {ss.label}
                            </span>
                          </div>
                        ) : <span className="text-ink-400 text-xs">N/A</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={e => { e.stopPropagation(); openEditar(a); }}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium">Editar</button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-ink-400">Nenhum artigo encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail */}
        {selected && (
          <div className="w-80 bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden shrink-0">
            <div className="p-4 border-b border-ink-100">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                    style={{ background: TIPO_COLOR[selected.tipo] }}>
                    {TIPO_LABEL[selected.tipo]}
                  </span>
                  <h2 className="font-bold text-ink-900 text-sm mt-1 leading-snug">{selected.nome}</h2>
                  <p className="text-xs text-ink-400 mt-0.5">{selected.codigo}</p>
                </div>
                {!selected.activo && <span className="px-2 py-0.5 rounded-full text-[10px] bg-ink-200 text-ink-600 font-semibold shrink-0">Inactivo</span>}
              </div>
              <div className="flex gap-1 mt-3">
                {(["ficha","stock","precos"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${tab === t ? "text-white" : "text-ink-500 hover:bg-ink-100"}`}
                    style={tab === t ? { background: "#CC0000" } : {}}>
                    {t === "precos" ? "Preços" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
              {tab === "ficha" && (
                <dl className="space-y-2 text-sm">
                  {selected.descricao && (
                    <div className="bg-ink-50 rounded-lg p-2.5 text-xs text-ink-600 mb-3">{selected.descricao}</div>
                  )}
                  {[
                    ["Categoria", CAT_LABEL[selected.categoria]],
                    ["Unidade de Medida", selected.unidade],
                    ["Código de Barras", selected.codigoBarras || "—"],
                    ["Taxa IVA", `${selected.ivaTaxa}%`],
                    ["Conta de Venda PGCA", CONTA_PGCA_VENDAS[selected.contaVenda] || selected.contaVenda],
                    ["Conta de Compra PGCA", CONTA_PGCA_COMPRAS[selected.contaCompra] || selected.contaCompra],
                    ["Conta de Stock PGCA", selected.contaStockPGCA === "—" ? "N/A" : selected.contaStockPGCA],
                    ["Armazém", selected.armazem === "—" ? "N/A" : selected.armazem],
                    ["Peso (kg)", selected.pesoKg ? `${selected.pesoKg} kg` : "—"],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between gap-2">
                      <dt className="text-ink-400 text-xs shrink-0">{l}</dt>
                      <dd className="text-ink-800 text-xs font-medium text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {tab === "stock" && (
                <div className="space-y-4">
                  {selected.tipo === "servico" ? (
                    <div className="text-center py-8 text-ink-400 text-sm">Serviços não têm controlo de stock.</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Actual", value: selected.stockActual },
                          { label: "Mínimo", value: selected.stockMinimo },
                          { label: "Máximo", value: selected.stockMaximo },
                        ].map(s => (
                          <div key={s.label} className="bg-ink-50 rounded-lg p-2.5 text-center">
                            <p className="text-xs text-ink-400">{s.label}</p>
                            <p className="text-lg font-bold text-ink-900 mt-0.5">{s.value}</p>
                            <p className="text-[10px] text-ink-400">{selected.unidade}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-xs text-ink-500 mb-1.5">Nível de Stock</p>
                        <div className="h-3 bg-ink-100 rounded-full overflow-hidden">
                          {selected.stockMaximo > 0 && (
                            <div className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min((selected.stockActual / selected.stockMaximo) * 100, 100)}%`,
                                background: selected.stockActual < selected.stockMinimo ? "#ef4444" :
                                  selected.stockActual > selected.stockMaximo ? "#f59e0b" : "#10b981"
                              }} />
                          )}
                        </div>
                        <p className="text-xs text-ink-400 mt-1">Armazém: {selected.armazem}</p>
                      </div>
                      <div className="bg-ink-50 rounded-lg p-3">
                        <p className="text-xs text-ink-500">Valor em Stock (custo)</p>
                        <p className="text-lg font-bold text-ink-900 mt-0.5">{fmtAOA(selected.stockActual * selected.precoCusto)}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
              {tab === "precos" && (
                <div className="space-y-3">
                  {[
                    { label: "Preço de Venda (s/ IVA)", value: fmtAOA(selected.precoVenda), highlight: true },
                    { label: `IVA (${selected.ivaTaxa}%)`, value: fmtAOA(selected.precoVenda * selected.ivaTaxa / 100) },
                    { label: "Preço de Venda (c/ IVA)", value: fmtAOA(selected.precoVenda * (1 + selected.ivaTaxa / 100)), highlight: true },
                    { label: "Preço de Custo", value: fmtAOA(selected.precoCusto) },
                    { label: "Margem Bruta", value: `${selected.margem.toFixed(1)}%` },
                    { label: "Lucro Unitário", value: fmtAOA(selected.precoVenda - selected.precoCusto) },
                  ].map(p => (
                    <div key={p.label} className={`flex justify-between p-2.5 rounded-lg ${p.highlight ? "bg-brand-50 border border-brand-100" : "bg-ink-50"}`}>
                      <span className="text-xs text-ink-600">{p.label}</span>
                      <span className={`text-xs font-bold ${p.highlight ? "text-brand-700" : "text-ink-900"}`}>{p.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-ink-100 flex gap-2">
              <button onClick={() => openEditar(selected)}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50">Editar</button>
              <button onClick={() => {
                setLista(l => l.map(x => x.id === selected.id ? { ...x, activo: !x.activo } : x));
                setSelected(s => s ? { ...s, activo: !s.activo } : s);
              }} className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg text-white"
                style={{ background: selected.activo ? "#6b7280" : "#10b981" }}>
                {selected.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 focus:outline-none focus:border-brand-400" />
    </div>
  );
}
