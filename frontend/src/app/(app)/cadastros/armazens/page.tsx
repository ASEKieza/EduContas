"use client";

import { useState } from "react";
import { useWindowManager } from "@/lib/windowManager";

type TipoArmazem = "principal" | "secundario" | "consignacao" | "transito" | "devolucoes";

interface Armazem {
  id: string;
  codigo: string;
  nome: string;
  tipo: TipoArmazem;
  endereco?: string;
  cidade?: string;
  responsavel?: string;
  capacidadeM3?: number;
  ocupacaoM3?: number;
  activo: boolean;
  observacoes?: string;
  artigos: number;
  valorStock: number;
}

const ARMAZENS_DEMO: Armazem[] = [
  {
    id: "1", codigo: "ARM-001", nome: "Armazém Principal — Sede", tipo: "principal",
    endereco: "Zona Industrial, Lote 12", cidade: "Luanda",
    responsavel: "Chefe de Armazém", capacidadeM3: 2000, ocupacaoM3: 1240,
    activo: true, artigos: 156, valorStock: 48500000,
  },
  {
    id: "2", codigo: "ARM-002", nome: "Armazém B — Viana", tipo: "secundario",
    endereco: "Parque Industrial de Viana, Lote 78", cidade: "Viana",
    responsavel: "Almoxarife B", capacidadeM3: 800, ocupacaoM3: 320,
    activo: true, artigos: 42, valorStock: 12800000,
  },
  {
    id: "3", codigo: "ARM-003", nome: "Armazém Consignação", tipo: "consignacao",
    endereco: "Av. 4 de Fevereiro, 28", cidade: "Luanda",
    responsavel: "Gestor de Consignações", capacidadeM3: 200, ocupacaoM3: 85,
    activo: true, artigos: 12, valorStock: 3200000,
    observacoes: "Stock de propriedade dos fornecedores em consignação. Não contabilizado como activo.",
  },
  {
    id: "4", codigo: "ARM-004", nome: "Armazém de Trânsito", tipo: "transito",
    endereco: "Porto de Luanda — Terminal Sul", cidade: "Luanda",
    responsavel: "Agente Transitário", capacidadeM3: 500, ocupacaoM3: 120,
    activo: true, artigos: 8, valorStock: 8900000,
    observacoes: "Mercadoria em trânsito aguardando desalfandegamento.",
  },
  {
    id: "5", codigo: "ARM-005", nome: "Área de Devoluções", tipo: "devolucoes",
    endereco: "Zona Industrial, Lote 12 — Dep. D", cidade: "Luanda",
    responsavel: "Chefe de Armazém", capacidadeM3: 100, ocupacaoM3: 15,
    activo: true, artigos: 6, valorStock: 450000,
    observacoes: "Artigos devolvidos aguardando análise e decisão: reintegrar, reparar ou abater.",
  },
  {
    id: "6", codigo: "ARM-006", nome: "Armazém Lubango (Inactivo)", tipo: "secundario",
    endereco: "Rua das Acácias, 45", cidade: "Lubango",
    capacidadeM3: 400, ocupacaoM3: 0,
    activo: false, artigos: 0, valorStock: 0,
  },
];

const TIPO_LABEL: Record<TipoArmazem, string> = {
  principal: "Principal", secundario: "Secundário",
  consignacao: "Consignação", transito: "Trânsito", devolucoes: "Devoluções",
};
const TIPO_COLOR: Record<TipoArmazem, string> = {
  principal: "#3b82f6", secundario: "#10b981", consignacao: "#f59e0b",
  transito: "#8b5cf6", devolucoes: "#ef4444",
};
const TIPO_ICON: Record<TipoArmazem, string> = {
  principal: "🏭", secundario: "🏢", consignacao: "📦", transito: "🚢", devolucoes: "↩️",
};

function fmtAOA(v: number) {
  return `Kz ${v.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}`;
}

const BLANK: Partial<Armazem> = { tipo: "principal", activo: true, artigos: 0, valorStock: 0 };

function ArmazemFormWindow({
  initialForm, isEdit, onSave, onClose,
}: {
  initialForm: Partial<Armazem>; isEdit: boolean;
  onSave: (data: Partial<Armazem>) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Armazem>>(initialForm);
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Código *" value={form.codigo || ""} onChange={v => setForm(f => ({ ...f, codigo: v }))} />
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Tipo</label>
            <select value={form.tipo || "principal"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoArmazem }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
              {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="col-span-2"><Field label="Nome *" value={form.nome || ""} onChange={v => setForm(f => ({ ...f, nome: v }))} /></div>
          <div className="col-span-2"><Field label="Endereço" value={form.endereco || ""} onChange={v => setForm(f => ({ ...f, endereco: v }))} /></div>
          <Field label="Cidade" value={form.cidade || ""} onChange={v => setForm(f => ({ ...f, cidade: v }))} />
          <Field label="Responsável" value={form.responsavel || ""} onChange={v => setForm(f => ({ ...f, responsavel: v }))} />
          <Field label="Capacidade (m³)" value={String(form.capacidadeM3 ?? "")} onChange={v => setForm(f => ({ ...f, capacidadeM3: Number(v) || undefined }))} type="number" />
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Observações</label>
            <textarea value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 focus:outline-none focus:border-brand-400 resize-none" />
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50">Cancelar</button>
        <button onClick={() => onSave(form)} className="px-5 py-2.5 text-sm font-semibold rounded-lg text-white" style={{ background: "#CC0000" }}>
          {isEdit ? "Guardar" : "Criar Armazém"}
        </button>
      </div>
    </div>
  );
}

export default function ArmazensPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [lista, setLista] = useState<Armazem[]>(ARMAZENS_DEMO);
  const [selected, setSelected] = useState<Armazem | null>(null);

  function openCriar() {
    const winId = `criar-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Novo Armazém", icon: "🏭",
      content: (
        <ArmazemFormWindow
          initialForm={{ ...BLANK }}
          isEdit={false}
          onSave={(data) => {
            if (!data.nome || !data.codigo) return;
            setLista(l => [...l, {
              id: String(l.length + 1), codigo: data.codigo!, nome: data.nome!,
              tipo: data.tipo as TipoArmazem || "principal",
              endereco: data.endereco, cidade: data.cidade, responsavel: data.responsavel,
              capacidadeM3: data.capacidadeM3, ocupacaoM3: 0,
              activo: data.activo ?? true, observacoes: data.observacoes,
              artigos: 0, valorStock: 0,
            }]);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 40, y: 20, width: 680, height: 480, minimized: false, maximized: false,
    });
  }
  function openEditar(a: Armazem) {
    const winId = `editar-${a.id}`;
    openWindow({
      id: winId, title: `Editar Armazém — ${a.nome}`, icon: "🏭",
      content: (
        <ArmazemFormWindow
          initialForm={{ ...a }}
          isEdit={true}
          onSave={(data) => {
            if (!data.nome || !data.codigo) return;
            setLista(l => l.map(x => x.id === a.id ? { ...x, ...data } as Armazem : x));
            if (selected?.id === a.id) setSelected({ ...selected, ...data } as Armazem);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 60, y: 40, width: 680, height: 480, minimized: false, maximized: false,
    });
  }

  const valorTotal = lista.filter(a => a.activo && a.tipo !== "consignacao").reduce((s, a) => s + a.valorStock, 0);
  const artigosTotal = lista.filter(a => a.activo).reduce((s, a) => s + a.artigos, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Armazéns & Depósitos</h1>
          <p className="text-sm text-ink-500 mt-0.5">Gestão de localizações de stock · PGCA 31/32</p>
        </div>
        <button onClick={openCriar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#CC0000" }}>
          <span className="text-lg leading-none">+</span> Novo Armazém
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Armazéns Activos", value: lista.filter(a => a.activo).length },
          { label: "Artigos em Stock", value: artigosTotal },
          { label: "Valor Total Stock", value: fmtAOA(valorTotal), sub: "excl. consignação" },
          { label: "Capacidade Média", value: `${Math.round(lista.filter(a=>a.activo && a.capacidadeM3).reduce((s,a) => s + (a.ocupacaoM3||0)/(a.capacidadeM3||1)*100, 0) / lista.filter(a=>a.activo && a.capacidadeM3).length)}%`, sub: "ocupação média" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
            <p className="text-xs text-ink-500 font-medium">{k.label}</p>
            <p className="text-2xl font-bold text-ink-900 mt-1">{k.value}</p>
            {k.sub && <p className="text-xs text-ink-400 mt-0.5">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lista.map(a => (
          <div key={a.id}
            onClick={() => setSelected(selected?.id === a.id ? null : a)}
            className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${selected?.id === a.id ? "border-brand-400 ring-1 ring-brand-200" : "border-ink-100"} ${!a.activo ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ background: TIPO_COLOR[a.tipo] + "18" }}>
                  {TIPO_ICON[a.tipo]}
                </div>
                <div>
                  <p className="font-bold text-ink-900 text-sm">{a.nome}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{a.codigo} · {a.cidade || "—"}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                  style={{ background: TIPO_COLOR[a.tipo] }}>
                  {TIPO_LABEL[a.tipo]}
                </span>
                {!a.activo && <span className="px-2 py-0.5 rounded-full text-[10px] bg-ink-200 text-ink-600 font-semibold">Inactivo</span>}
              </div>
            </div>

            {a.capacidadeM3 && a.capacidadeM3 > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink-500">Ocupação</span>
                  <span className="text-ink-700 font-medium">{a.ocupacaoM3} / {a.capacidadeM3} m³</span>
                </div>
                <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(((a.ocupacaoM3 || 0) / a.capacidadeM3) * 100, 100)}%`,
                    background: (a.ocupacaoM3 || 0) / a.capacidadeM3 > 0.9 ? "#ef4444" :
                      (a.ocupacaoM3 || 0) / a.capacidadeM3 > 0.7 ? "#f59e0b" : "#10b981",
                  }} />
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-ink-100 grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-ink-400">Artigos</p>
                <p className="text-sm font-bold text-ink-900">{a.artigos}</p>
              </div>
              <div>
                <p className="text-xs text-ink-400">Valor Stock</p>
                <p className="text-sm font-bold text-ink-900">{fmtAOA(a.valorStock)}</p>
              </div>
              {a.responsavel && (
                <div className="col-span-2">
                  <p className="text-xs text-ink-400">Responsável: <span className="text-ink-600">{a.responsavel}</span></p>
                </div>
              )}
            </div>
            {a.observacoes && (
              <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-[11px] text-amber-700">{a.observacoes}</p>
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <button onClick={e => { e.stopPropagation(); openEditar(a); }}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50">Editar</button>
              <button onClick={e => {
                e.stopPropagation();
                setLista(l => l.map(x => x.id === a.id ? { ...x, activo: !x.activo } : x));
              }} className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-white"
                style={{ background: a.activo ? "#6b7280" : "#10b981" }}>
                {a.activo ? "Fechar" : "Activar"}
              </button>
            </div>
          </div>
        ))}
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
