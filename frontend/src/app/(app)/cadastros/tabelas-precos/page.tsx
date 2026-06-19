"use client";

import { useState, useMemo } from "react";
import { useWindowManager } from "@/lib/windowManager";

type TipoTabela = "venda" | "compra" | "promocional" | "exportacao";
type TipoDesconto = "percentagem" | "valor_fixo" | "preco_fixo";

interface LinhaTabela {
  artigoCodigo: string;
  artigoNome: string;
  precoBase: number;
  precoTabela: number;
  descontoTipo: TipoDesconto;
  descontoValor: number;
  ivaTaxa: number;
  moeda: string;
  qtdMinima?: number;
}

interface TabelaPrecos {
  id: string;
  codigo: string;
  nome: string;
  tipo: TipoTabela;
  moeda: string;
  dataInicio: string;
  dataFim?: string;
  activa: boolean;
  descricao?: string;
  linhas: LinhaTabela[];
  clientesCodigos?: string[];
  clientesGrupo?: string;
  prioridade: number;
}

const TABELAS_DEMO: TabelaPrecos[] = [
  {
    id: "T001", codigo: "TP-001", nome: "Tabela Geral de Vendas", tipo: "venda",
    moeda: "Kz", dataInicio: "2026-01-01", activa: true, prioridade: 1,
    descricao: "Tabela de preços padrão para todos os clientes.",
    linhas: [
      { artigoCodigo: "ART-001", artigoNome: "Computador Portátil Dell Latitude 5540", precoBase: 450000, precoTabela: 450000, descontoTipo: "percentagem", descontoValor: 0,  ivaTaxa: 14, moeda: "Kz" },
      { artigoCodigo: "ART-002", artigoNome: "Monitor LG 24\" Full HD",                precoBase: 120000, precoTabela: 120000, descontoTipo: "percentagem", descontoValor: 0,  ivaTaxa: 14, moeda: "Kz" },
      { artigoCodigo: "ART-003", artigoNome: "Resma de Papel A4 80g/m²",              precoBase: 4500,   precoTabela: 4500,   descontoTipo: "percentagem", descontoValor: 0,  ivaTaxa: 14, moeda: "Kz" },
      { artigoCodigo: "SRV-001", artigoNome: "Consultoria em Sistemas de Informação", precoBase: 25000,  precoTabela: 25000,  descontoTipo: "percentagem", descontoValor: 0,  ivaTaxa: 14, moeda: "Kz" },
    ],
  },
  {
    id: "T002", codigo: "TP-002", nome: "Tabela Grandes Clientes (VIP)", tipo: "venda",
    moeda: "Kz", dataInicio: "2026-01-01", activa: true, prioridade: 2,
    descricao: "Desconto especial para clientes com volume anual > 10M Kz.",
    clientesGrupo: "VIP",
    linhas: [
      { artigoCodigo: "ART-001", artigoNome: "Computador Portátil Dell Latitude 5540", precoBase: 450000, precoTabela: 405000, descontoTipo: "percentagem", descontoValor: 10, ivaTaxa: 14, moeda: "Kz" },
      { artigoCodigo: "ART-002", artigoNome: "Monitor LG 24\" Full HD",                precoBase: 120000, precoTabela: 108000, descontoTipo: "percentagem", descontoValor: 10, ivaTaxa: 14, moeda: "Kz" },
      { artigoCodigo: "ART-003", artigoNome: "Resma de Papel A4 80g/m²",              precoBase: 4500,   precoTabela: 3825,   descontoTipo: "percentagem", descontoValor: 15, ivaTaxa: 14, moeda: "Kz" },
      { artigoCodigo: "SRV-001", artigoNome: "Consultoria em Sistemas de Informação", precoBase: 25000,  precoTabela: 22000,  descontoTipo: "percentagem", descontoValor: 12, ivaTaxa: 14, moeda: "Kz" },
    ],
  },
  {
    id: "T003", codigo: "TP-003", nome: "Campanha Junho 2026", tipo: "promocional",
    moeda: "Kz", dataInicio: "2026-06-01", dataFim: "2026-06-30", activa: true, prioridade: 3,
    descricao: "Promoção de fim de semestre. Válida até 30/06/2026.",
    linhas: [
      { artigoCodigo: "ART-001", artigoNome: "Computador Portátil Dell Latitude 5540", precoBase: 450000, precoTabela: 400000, descontoTipo: "preco_fixo",    descontoValor: 50000, ivaTaxa: 14, moeda: "Kz" },
      { artigoCodigo: "ART-002", artigoNome: "Monitor LG 24\" Full HD",                precoBase: 120000, precoTabela: 99000,  descontoTipo: "preco_fixo",    descontoValor: 21000, ivaTaxa: 14, moeda: "Kz" },
    ],
  },
  {
    id: "T004", codigo: "TP-004", nome: "Tabela Export (USD)", tipo: "exportacao",
    moeda: "USD", dataInicio: "2026-01-01", activa: true, prioridade: 1,
    descricao: "Preços em Dólares para clientes estrangeiros.",
    linhas: [
      { artigoCodigo: "ART-001", artigoNome: "Computador Portátil Dell Latitude 5540", precoBase: 517, precoTabela: 490, descontoTipo: "percentagem", descontoValor: 5, ivaTaxa: 0, moeda: "USD" },
      { artigoCodigo: "SRV-001", artigoNome: "Consultoria em Sistemas de Informação", precoBase: 29, precoTabela: 29, descontoTipo: "percentagem", descontoValor: 0, ivaTaxa: 0, moeda: "USD" },
    ],
  },
  {
    id: "T005", codigo: "TP-005", nome: "Tabela Compras — Fornecedores", tipo: "compra",
    moeda: "Kz", dataInicio: "2026-01-01", activa: false, prioridade: 1,
    descricao: "Preços de compra negociados com fornecedores (inactiva — em revisão).",
    linhas: [],
  },
];

const TIPO_LABEL: Record<TipoTabela, string> = {
  venda: "Venda", compra: "Compra", promocional: "Promocional", exportacao: "Exportação",
};
const TIPO_COLOR: Record<TipoTabela, string> = {
  venda: "#3b82f6", compra: "#8b5cf6", promocional: "#ef4444", exportacao: "#10b981",
};
const TIPO_ICON: Record<TipoTabela, string> = {
  venda: "🏷️", compra: "🛒", promocional: "🎁", exportacao: "🌍",
};
const DESCONTO_LABEL: Record<TipoDesconto, string> = {
  percentagem: "% Desconto", valor_fixo: "Valor Fixo", preco_fixo: "Preço Fixo",
};

function fmtAOA(v: number, moeda = "Kz") {
  if (moeda === "USD") return `$ ${v.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  return `Kz ${v.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}`;
}

const BLANK: Partial<TabelaPrecos> = {
  tipo: "venda", moeda: "Kz", activa: true, prioridade: 1,
  dataInicio: new Date().toISOString().slice(0, 10), linhas: [],
};

function TabelaPrecosFormWindow({
  initialForm, isEdit, onSave, onClose,
}: {
  initialForm: Partial<TabelaPrecos>; isEdit: boolean;
  onSave: (data: Partial<TabelaPrecos>) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<TabelaPrecos>>(initialForm);
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Código *" value={form.codigo || ""} onChange={v => setForm(f => ({ ...f, codigo: v }))} />
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Tipo *</label>
            <select value={form.tipo || "venda"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoTabela }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
              {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="col-span-2"><Field label="Nome *" value={form.nome || ""} onChange={v => setForm(f => ({ ...f, nome: v }))} /></div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-ink-600 mb-1">Descrição</label>
            <textarea value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Moeda</label>
            <select value={form.moeda || "Kz"} onChange={e => setForm(f => ({ ...f, moeda: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
              {["Kz","USD","EUR","GBP"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <Field label="Prioridade" value={String(form.prioridade ?? 1)} onChange={v => setForm(f => ({ ...f, prioridade: Number(v) }))} type="number" />
          <Field label="Data de Início" value={form.dataInicio || ""} onChange={v => setForm(f => ({ ...f, dataInicio: v }))} type="date" />
          <Field label="Data de Fim" value={form.dataFim || ""} onChange={v => setForm(f => ({ ...f, dataFim: v || undefined }))} type="date" />
          <Field label="Grupo de Clientes" value={form.clientesGrupo || ""} onChange={v => setForm(f => ({ ...f, clientesGrupo: v || undefined }))} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.activa ?? true} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))} className="rounded text-brand-600" />
          <span className="text-sm text-ink-700">Tabela activa</span>
        </label>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50">Cancelar</button>
        <button onClick={() => onSave(form)} className="px-5 py-2.5 text-sm font-semibold rounded-lg text-white" style={{ background: "#CC0000" }}>
          {isEdit ? "Guardar" : "Criar Tabela"}
        </button>
      </div>
    </div>
  );
}

export default function TabelasPrecosPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [tabelas, setTabelas] = useState<TabelaPrecos[]>(TABELAS_DEMO);
  const [selected, setSelected] = useState<TabelaPrecos | null>(null);
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  const filtered = useMemo(() =>
    tabelas.filter(t => filterTipo === "todos" || t.tipo === filterTipo),
  [tabelas, filterTipo]);

  function openCriar() {
    const winId = `criar-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Nova Tabela de Preços", icon: "🏷️",
      content: (
        <TabelaPrecosFormWindow
          initialForm={{ ...BLANK }}
          isEdit={false}
          onSave={(data) => {
            if (!data.nome || !data.codigo) return;
            const id = `T${String(tabelas.length + 1).padStart(3, "0")}`;
            setTabelas(l => [...l, {
              id, codigo: data.codigo!, nome: data.nome!, tipo: data.tipo as TipoTabela || "venda",
              moeda: data.moeda || "Kz", dataInicio: data.dataInicio || new Date().toISOString().slice(0, 10),
              dataFim: data.dataFim, activa: data.activa ?? true, descricao: data.descricao,
              linhas: [], prioridade: data.prioridade || 1, clientesGrupo: data.clientesGrupo,
            }]);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 40, y: 20, width: 680, height: 480, minimized: false, maximized: false,
    });
  }
  function openEditar(t: TabelaPrecos) {
    const winId = `editar-${t.id}`;
    openWindow({
      id: winId, title: `Editar Tabela — ${t.nome}`, icon: "🏷️",
      content: (
        <TabelaPrecosFormWindow
          initialForm={{ ...t }}
          isEdit={true}
          onSave={(data) => {
            if (!data.nome || !data.codigo) return;
            setTabelas(l => l.map(x => x.id === t.id ? { ...x, ...data } as TabelaPrecos : x));
            if (selected?.id === t.id) setSelected({ ...selected, ...data } as TabelaPrecos);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 60, y: 40, width: 680, height: 480, minimized: false, maximized: false,
    });
  }

  const hoje = new Date().toISOString().slice(0, 10);
  function statusTabela(t: TabelaPrecos) {
    if (!t.activa) return { label: "Inactiva", color: "#6b7280" };
    if (t.dataFim && t.dataFim < hoje) return { label: "Expirada", color: "#ef4444" };
    if (t.dataInicio > hoje) return { label: "Agendada", color: "#f59e0b" };
    return { label: "Activa", color: "#10b981" };
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Tabelas de Preços</h1>
          <p className="text-sm text-ink-500 mt-0.5">Preços de venda, compra, promoções e exportação</p>
        </div>
        <button onClick={openCriar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#CC0000" }}>
          <span className="text-lg leading-none">+</span> Nova Tabela
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Tabelas Activas", value: tabelas.filter(t => t.activa).length },
          { label: "Em Vigor Hoje", value: tabelas.filter(t => t.activa && t.dataInicio <= hoje && (!t.dataFim || t.dataFim >= hoje)).length },
          { label: "Promoções Activas", value: tabelas.filter(t => t.tipo === "promocional" && t.activa).length },
          { label: "Total de Linhas", value: tabelas.reduce((s, t) => s + t.linhas.length, 0) },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
            <p className="text-xs text-ink-500 font-medium">{k.label}</p>
            <p className="text-2xl font-bold text-ink-900 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tipo Filter */}
      <div className="flex gap-2">
        {[{ label: "Todas", value: "todos" }, ...Object.entries(TIPO_LABEL).map(([k, v]) => ({ label: v, value: k }))].map(t => (
          <button key={t.value} onClick={() => setFilterTipo(t.value)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${filterTipo === t.value ? "text-white" : "bg-white border border-ink-200 text-ink-600 hover:bg-ink-50"}`}
            style={filterTipo === t.value ? { background: "#CC0000" } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex gap-4">
        {/* Tabelas List */}
        <div className="flex-1 space-y-3">
          {filtered.map(t => {
            const st = statusTabela(t);
            return (
              <div key={t.id}
                onClick={() => setSelected(selected?.id === t.id ? null : t)}
                className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${selected?.id === t.id ? "border-brand-400 ring-1 ring-brand-200" : "border-ink-100"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                      style={{ background: TIPO_COLOR[t.tipo] + "18" }}>
                      {TIPO_ICON[t.tipo]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-ink-900 text-sm">{t.nome}</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                          style={{ background: TIPO_COLOR[t.tipo] }}>
                          {TIPO_LABEL[t.tipo]}
                        </span>
                      </div>
                      <p className="text-xs text-ink-400 mt-0.5">{t.codigo} · {t.moeda} · Prioridade {t.prioridade}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                      style={{ background: st.color }}>
                      {st.label}
                    </span>
                    <button onClick={e => { e.stopPropagation(); openEditar(t); }}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium">Editar</button>
                  </div>
                </div>

                {t.descricao && <p className="text-xs text-ink-500 mt-2 ml-13">{t.descricao}</p>}

                <div className="mt-3 pt-3 border-t border-ink-100 flex items-center gap-6 text-xs text-ink-500">
                  <span>Início: <strong className="text-ink-700">{t.dataInicio}</strong></span>
                  {t.dataFim && <span>Fim: <strong className="text-ink-700">{t.dataFim}</strong></span>}
                  {t.clientesGrupo && <span>Grupo: <strong className="text-ink-700">{t.clientesGrupo}</strong></span>}
                  <span className="ml-auto">{t.linhas.length} artigo{t.linhas.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selected && selected.linhas.length > 0 && (
          <div className="w-96 bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden shrink-0">
            <div className="p-4 border-b border-ink-100">
              <h2 className="font-bold text-ink-900 text-sm">{selected.nome}</h2>
              <p className="text-xs text-ink-400 mt-0.5">{selected.linhas.length} artigos nesta tabela · {selected.moeda}</p>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-ink-100 bg-ink-50">
                    <th className="px-3 py-2.5 text-left font-semibold text-ink-500 uppercase tracking-wide">Artigo</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-ink-500 uppercase tracking-wide">Preço Base</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-ink-500 uppercase tracking-wide">Preço Tabela</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-ink-500 uppercase tracking-wide">Desc.</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.linhas.map((l, i) => (
                    <tr key={i} className="border-b border-ink-50 hover:bg-ink-50">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-ink-800 leading-snug">{l.artigoNome}</p>
                        <p className="text-ink-400 font-mono">{l.artigoCodigo}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right text-ink-500">{fmtAOA(l.precoBase, l.moeda)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-ink-900">{fmtAOA(l.precoTabela, l.moeda)}</td>
                      <td className="px-3 py-2.5 text-right">
                        {l.descontoValor > 0 ? (
                          <span className="text-green-600 font-semibold">
                            {l.descontoTipo === "percentagem" ? `-${l.descontoValor}%` : `-${fmtAOA(l.descontoValor, l.moeda)}`}
                          </span>
                        ) : <span className="text-ink-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-ink-100">
              <button className="w-full py-2.5 text-xs font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50">
                Adicionar / Editar Linhas
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
