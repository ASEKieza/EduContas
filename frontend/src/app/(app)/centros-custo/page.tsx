"use client";

import { useState, useMemo, useCallback } from "react";
import { useCollection } from "@/lib/useCollection";
import { useWindowManager } from "@/lib/windowManager";

interface CostCenter {
  id: string;
  code: string;
  name: string;
  type: "departamento" | "projecto" | "produto" | "geografico";
  responsible: string;
  budget: number;
  actual: number;
  active: boolean;
  parent?: string;
  children?: CostCenter[];
  color: string;
}

const COLORS = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-gold-500", "bg-aqua-500", "bg-brand-500", "bg-emerald-500", "bg-orange-500"];

const INITIAL_CENTERS: CostCenter[] = [
  { id: "adm", code: "ADM", name: "Administração Geral", type: "departamento", responsible: "João Silva", budget: 8500000, actual: 7234000, active: true, color: COLORS[0] },
  { id: "com", code: "COM", name: "Comercial & Vendas", type: "departamento", responsible: "Ana Lima", budget: 12000000, actual: 10876000, active: true, color: COLORS[1] },
  { id: "com-north", code: "COM-N", name: "Vendas Norte", type: "geografico", responsible: "Carlos Melo", budget: 5000000, actual: 4560000, active: true, parent: "com", color: COLORS[1] },
  { id: "com-south", code: "COM-S", name: "Vendas Sul/Luanda", type: "geografico", responsible: "Beatriz Costa", budget: 7000000, actual: 6316000, active: true, parent: "com", color: COLORS[1] },
  { id: "fin", code: "FIN", name: "Financeiro & Contabilidade", type: "departamento", responsible: "Maria Fernandes", budget: 4500000, actual: 3890000, active: true, color: COLORS[2] },
  { id: "rh", code: "RH", name: "Recursos Humanos", type: "departamento", responsible: "Pedro Neto", budget: 3200000, actual: 2980000, active: true, color: COLORS[3] },
  { id: "ops", code: "OPS", name: "Operações & Logística", type: "departamento", responsible: "Luís Carvalho", budget: 9800000, actual: 11240000, active: true, color: COLORS[4] },
  { id: "ti", code: "TI", name: "Tecnologias de Informação", type: "departamento", responsible: "Sofia Mendes", budget: 6000000, actual: 5120000, active: true, color: COLORS[5] },
  { id: "proj-a", code: "PRJ-A", name: "Projecto Alpha (Expansão)", type: "projecto", responsible: "João Silva", budget: 25000000, actual: 18450000, active: true, color: COLORS[6] },
  { id: "proj-b", code: "PRJ-B", name: "Projecto Beta (TI Cloud)", type: "projecto", responsible: "Sofia Mendes", budget: 8000000, actual: 3200000, active: true, color: COLORS[7] },
];

interface Allocation {
  id: string;
  date: string;
  description: string;
  centerId: string;
  account: string;
  amount: number;
  type: "debito" | "credito";
}

const ALLOCATIONS: Allocation[] = [
  { id: "1", date: "2026-05-28", description: "Salários — Comercial", centerId: "com", account: "72.2", amount: 1850000, type: "debito" },
  { id: "2", date: "2026-05-28", description: "Salários — Operações", centerId: "ops", account: "72.2", amount: 2100000, type: "debito" },
  { id: "3", date: "2026-05-27", description: "Aluguer escritório Luanda", centerId: "adm", account: "75.1.7", amount: 450000, type: "debito" },
  { id: "4", date: "2026-05-27", description: "Combustível frota comercial", centerId: "com", account: "75.1.2", amount: 320000, type: "debito" },
  { id: "5", date: "2026-05-26", description: "Licenças software TI", centerId: "ti", account: "75.1.5", amount: 280000, type: "debito" },
  { id: "6", date: "2026-05-25", description: "Formação profissional", centerId: "rh", account: "75.1.5", amount: 180000, type: "debito" },
  { id: "7", date: "2026-05-24", description: "Materiais construção — Alpha", centerId: "proj-a", account: "22.1", amount: 4500000, type: "debito" },
  { id: "8", date: "2026-05-24", description: "Servidores AWS — Beta", centerId: "proj-b", account: "75.1.5", amount: 380000, type: "debito" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(n) + " AOA";
}

function pct(actual: number, budget: number) {
  if (!budget) return 0;
  return Math.min(Math.round((actual / budget) * 100), 150);
}

type FilterType = "todos" | "departamento" | "projecto" | "produto" | "geografico";

const LS_KEY = "educontas-centros-custo";

export default function CentrosCustoPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const { items: centers, setItems: persistCenters } = useCollection<CostCenter>(LS_KEY, INITIAL_CENTERS);
  const [filter, setFilter] = useState<FilterType>("todos");
  const [search, setSearch] = useState("");
  const [selectedCenter, setSelectedCenter] = useState<CostCenter | null>(null);

  const updateCentro = useCallback((id: string, patch: Partial<CostCenter>) => {
    persistCenters(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, [persistCenters]);

  const deleteCentro = useCallback((id: string) => {
    persistCenters(prev => prev.filter(c => c.id !== id));
  }, [persistCenters]);

  const displayed = useMemo(() => {
    return centers.filter((c) => {
      if (filter !== "todos" && c.type !== filter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.code.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [centers, filter, search]);

  const totals = useMemo(() => ({
    budget: centers.filter((c) => !c.parent).reduce((s, c) => s + c.budget, 0),
    actual: centers.filter((c) => !c.parent).reduce((s, c) => s + c.actual, 0),
  }), [centers]);

  const centerAllocations = useMemo(() => {
    if (!selectedCenter) return [];
    return ALLOCATIONS.filter((a) => a.centerId === selectedCenter.id);
  }, [selectedCenter]);

  function openNovoCentro() {
    const winId = `centro-custo-novo-${crypto.randomUUID()}`;
    openWindow({
      id: winId,
      title: "Novo Centro de Custo",
      icon: "📊",
      content: <CentroCustoForm
        centersCount={centers.length}
        onSave={(newCenter) => {
          persistCenters([...centers, newCenter]);
          closeWindow(winId);
        }}
        onClose={() => closeWindow(winId)}
      />,
      x: 40, y: 20, width: 680, height: 480, minimized: false, maximized: false,
    });
  }

  function handleOpenEditar(c: CostCenter) {
    const winId = `editar-centro-${c.id}`;
    openWindow({
      id: winId,
      title: `Editar ${c.name}`,
      icon: "✏️",
      content: <EditarCentroModal
        centro={c}
        onClose={() => closeWindow(winId)}
        onSave={(patch) => {
          updateCentro(c.id, patch);
          if (selectedCenter?.id === c.id) setSelectedCenter(prev => prev ? { ...prev, ...patch } : null);
          closeWindow(winId);
        }}
      />,
      x: 50, y: 30, width: 680, height: 480, minimized: false, maximized: false,
    });
  }

  function handleOpenDelete(c: CostCenter) {
    const winId = `delete-centro-${c.id}`;
    openWindow({
      id: winId,
      title: "Confirmar eliminação",
      icon: "🗑️",
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 p-6">
            <p className="text-gray-700">Tem a certeza que pretende eliminar <strong>{c.name}</strong>?</p>
            <p className="text-sm text-gray-500 mt-2">Esta acção não pode ser desfeita.</p>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
            <button onClick={() => closeWindow(winId)} className="btn-secondary">Cancelar</button>
            <button onClick={() => {
              deleteCentro(c.id);
              if (selectedCenter?.id === c.id) setSelectedCenter(null);
              closeWindow(winId);
            }} className="btn-primary bg-red-600 hover:bg-red-700">Eliminar</button>
          </div>
        </div>
      ),
      x: 80, y: 80, width: 480, height: 220, minimized: false, maximized: false,
    });
  }

  const typeLabels: Record<string, string> = { departamento: "Departamento", projecto: "Projecto", produto: "Produto", geografico: "Geográfico" };

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2">
            <span>Centros de Custo</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Classe 9</span>
          </h1>
          <p className="text-sm text-ink-500 mt-0.5">Contabilidade analítica por departamento, projecto e zona geográfica</p>
        </div>
        <button onClick={openNovoCentro} className="btn-primary text-xs">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Centro
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Orçamento Total", value: fmt(totals.budget), color: "text-ink-800" },
          { label: "Custo Real", value: fmt(totals.actual), color: totals.actual > totals.budget ? "text-brand-600" : "text-ink-800" },
          { label: "Centros Activos", value: centers.filter((c) => c.active).length.toString(), color: "text-green-600" },
          { label: "Desvio Orçamental", value: `${totals.actual > totals.budget ? "+" : ""}${Math.round(((totals.actual - totals.budget) / totals.budget) * 100)}%`, color: totals.actual > totals.budget ? "text-brand-600" : "text-green-600" },
        ].map((k) => (
          <div key={k.label} className="card p-4">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="card p-4 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="input pl-9 text-sm" placeholder="Pesquisar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1">
              {(["todos","departamento","projecto","geografico"] as FilterType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    filter === t ? "bg-brand-600 text-white" : "text-ink-500 hover:bg-ink-100"
                  }`}
                >
                  {t === "todos" ? "Todos" : typeLabels[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div className="space-y-3">
            {displayed.map((c) => {
              const p = pct(c.actual, c.budget);
              const over = c.actual > c.budget;
              const isSelected = selectedCenter?.id === c.id;
              return (
                <div
                  key={c.id}
                  className={`card w-full text-left p-5 transition-all hover:shadow-md ${isSelected ? "ring-2 ring-brand-500" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <button
                      className="flex items-center gap-3 flex-1 text-left"
                      onClick={() => setSelectedCenter(isSelected ? null : c)}
                    >
                      <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {c.code.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-ink-800 text-sm">{c.name}</p>
                        <p className="text-xs text-ink-400">{c.code} · {typeLabels[c.type]} · {c.responsible}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        over ? "bg-brand-100 text-brand-700" : p > 80 ? "bg-gold-100 text-gold-700" : "bg-green-100 text-green-700"
                      }`}>
                        {p}%
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEditar(c); }}
                        className="btn-ghost p-1.5 text-xs"
                        title="Editar centro de custo"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenDelete(c); }}
                        className="btn-ghost p-1.5 text-xs"
                        title="Eliminar centro de custo"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="stat-bar">
                    <div
                      className={`stat-bar-fill ${over ? "bg-brand-500" : p > 80 ? "bg-gold-400" : "bg-green-500"}`}
                      style={{ width: `${Math.min(p, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-ink-400">
                    <span>Real: <strong className={over ? "text-brand-600" : "text-ink-700"}>{fmt(c.actual)}</strong></span>
                    <span>Orç: <strong className="text-ink-700">{fmt(c.budget)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-1">
          {selectedCenter ? (
            <div className="card overflow-hidden sticky top-4">
              <div className={`h-2 ${selectedCenter.color}`} />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg ${selectedCenter.color} flex items-center justify-center text-white font-bold`}>
                    {selectedCenter.code.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold text-ink-900">{selectedCenter.name}</p>
                    <p className="text-xs text-ink-400">{selectedCenter.code}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-ink-500">Responsável</span>
                    <span className="font-medium text-ink-800">{selectedCenter.responsible}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Tipo</span>
                    <span className="font-medium text-ink-800">{typeLabels[selectedCenter.type]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Orçamento</span>
                    <span className="font-medium text-ink-800">{fmt(selectedCenter.budget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Real</span>
                    <span className={`font-bold ${selectedCenter.actual > selectedCenter.budget ? "text-brand-600" : "text-ink-800"}`}>
                      {fmt(selectedCenter.actual)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500">Desvio</span>
                    <span className={`font-bold ${selectedCenter.actual > selectedCenter.budget ? "text-brand-600" : "text-green-600"}`}>
                      {selectedCenter.actual > selectedCenter.budget ? "+" : ""}
                      {fmt(selectedCenter.actual - selectedCenter.budget)}
                    </span>
                  </div>
                </div>
                <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wide mb-2">Últimas Imputações</h3>
                {centerAllocations.length > 0 ? (
                  <div className="space-y-2">
                    {centerAllocations.map((a) => (
                      <div key={a.id} className="flex items-start justify-between gap-2 text-xs">
                        <div>
                          <p className="font-medium text-ink-700">{a.description}</p>
                          <p className="text-ink-400">{a.date} · Conta {a.account}</p>
                        </div>
                        <span className="font-bold text-brand-600 shrink-0">{fmt(a.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink-400 italic">Sem imputações recentes</p>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center border-dashed">
              <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-sm text-ink-500">Seleccione um centro de custo para ver os detalhes e imputações</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function CentroCustoForm({
  centersCount,
  onSave,
  onClose,
}: {
  centersCount: number;
  onSave: (center: CostCenter) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ code: "", name: "", type: "departamento" as CostCenter["type"], responsible: "", budget: "" });
  function save() {
    const newCenter: CostCenter = {
      id: form.code.toLowerCase(),
      code: form.code.toUpperCase(),
      name: form.name,
      type: form.type,
      responsible: form.responsible,
      budget: parseFloat(form.budget) || 0,
      actual: 0,
      active: true,
      color: COLORS[centersCount % COLORS.length],
    };
    onSave(newCenter);
  }
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Código *</label>
            <input className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ex: MKT" />
          </div>
          <div>
            <label className="label">Tipo *</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CostCenter["type"] })}>
              <option value="departamento">Departamento</option>
              <option value="projecto">Projecto</option>
              <option value="produto">Produto</option>
              <option value="geografico">Geográfico</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Designação *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do centro de custo" />
        </div>
        <div>
          <label className="label">Responsável *</label>
          <input className="input" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} placeholder="Nome do gestor responsável" />
        </div>
        <div>
          <label className="label">Orçamento Anual (Kz)</label>
          <input className="input" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="0" />
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={save} disabled={!form.code || !form.name} className="btn-primary">Criar Centro</button>
      </div>
    </div>
  );
}

function EditarCentroModal({
  centro,
  onClose,
  onSave,
}: {
  centro: CostCenter;
  onClose: () => void;
  onSave: (patch: Partial<CostCenter>) => void;
}) {
  const [form, setForm] = useState({
    code: centro.code,
    name: centro.name,
    type: centro.type,
    responsible: centro.responsible,
    budget: centro.budget.toString(),
    active: centro.active,
  });

  function save() {
    onSave({
      code: form.code.toUpperCase(),
      name: form.name,
      type: form.type,
      responsible: form.responsible,
      budget: parseFloat(form.budget) || 0,
      active: form.active,
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Código *</label>
            <input className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="ex: MKT" />
          </div>
          <div>
            <label className="label">Tipo *</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CostCenter["type"] })}>
              <option value="departamento">Departamento</option>
              <option value="projecto">Projecto</option>
              <option value="produto">Produto</option>
              <option value="geografico">Geográfico</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Designação *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do centro de custo" />
        </div>
        <div>
          <label className="label">Responsável</label>
          <input className="input" value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} placeholder="Nome do gestor responsável" />
        </div>
        <div>
          <label className="label">Orçamento Anual (Kz)</label>
          <input className="input" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="0" />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
          Centro activo
        </label>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={save} disabled={!form.code || !form.name} className="btn-primary">Guardar Alterações</button>
      </div>
    </div>
  );
}
