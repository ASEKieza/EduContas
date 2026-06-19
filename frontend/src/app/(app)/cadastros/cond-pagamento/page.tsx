"use client";

import { useState } from "react";
import { useWindowManager } from "@/lib/windowManager";

type TipoCondicao = "pronto" | "prazo" | "parcelas" | "adiantamento" | "consignacao";

interface CondicaoPagamento {
  id: string;
  codigo: string;
  descricao: string;
  tipo: TipoCondicao;
  dias: number;
  numeroParcelas?: number;
  diasEntreParcelas?: number;
  descontoComercial?: number;
  descontoFinanceiro?: number;
  activa: boolean;
  observacoes?: string;
}

const COND_DEMO: CondicaoPagamento[] = [
  { id: "1", codigo: "PP",    descricao: "Pronto Pagamento",           tipo: "pronto",        dias: 0,  activa: true },
  { id: "2", codigo: "08D",   descricao: "8 Dias",                     tipo: "prazo",         dias: 8,  activa: true },
  { id: "3", codigo: "15D",   descricao: "15 Dias",                    tipo: "prazo",         dias: 15, activa: true },
  { id: "4", codigo: "30D",   descricao: "30 Dias",                    tipo: "prazo",         dias: 30, activa: true },
  { id: "5", codigo: "45D",   descricao: "45 Dias",                    tipo: "prazo",         dias: 45, activa: true },
  { id: "6", codigo: "60D",   descricao: "60 Dias",                    tipo: "prazo",         dias: 60, activa: true },
  { id: "7", codigo: "90D",   descricao: "90 Dias",                    tipo: "prazo",         dias: 90, activa: true },
  { id: "8", codigo: "30/60", descricao: "50% 30 Dias + 50% 60 Dias", tipo: "parcelas",      dias: 60, numeroParcelas: 2, diasEntreParcelas: 30, activa: true },
  { id: "9", codigo: "3×30",  descricao: "3 Parcelas de 30 dias",     tipo: "parcelas",      dias: 90, numeroParcelas: 3, diasEntreParcelas: 30, activa: true },
  { id: "10",codigo: "ADT",   descricao: "Adiantamento 100%",         tipo: "adiantamento",  dias: 0,  activa: true },
  { id: "11",codigo: "ADT50", descricao: "Adiantamento 50% + 50% entrega", tipo: "adiantamento", dias: 30, numeroParcelas: 2, activa: true },
  { id: "12",codigo: "CSGN",  descricao: "Consignação",               tipo: "consignacao",   dias: 30, activa: false,
    observacoes: "Pagamento apenas após venda ao cliente final." },
];

const TIPO_LABEL: Record<TipoCondicao, string> = {
  pronto: "Pronto Pagamento", prazo: "Crédito a Prazo",
  parcelas: "Pagamento Parcelado", adiantamento: "Adiantamento", consignacao: "Consignação",
};
const TIPO_COLOR: Record<TipoCondicao, string> = {
  pronto: "#10b981", prazo: "#3b82f6", parcelas: "#f59e0b",
  adiantamento: "#8b5cf6", consignacao: "#6b7280",
};

const BLANK: Partial<CondicaoPagamento> = { tipo: "prazo", dias: 30, activa: true };

function CondPagamentoFormWindow({
  initialForm, isEdit, onSave, onClose,
}: {
  initialForm: Partial<CondicaoPagamento>; isEdit: boolean;
  onSave: (data: Partial<CondicaoPagamento>) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<CondicaoPagamento>>(initialForm);
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Código *" value={form.codigo || ""} onChange={v => setForm(f => ({ ...f, codigo: v }))} />
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Tipo *</label>
            <select value={form.tipo || "prazo"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoCondicao }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
              {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="col-span-2"><Field label="Descrição *" value={form.descricao || ""} onChange={v => setForm(f => ({ ...f, descricao: v }))} /></div>
          <Field label="Prazo (dias)" value={String(form.dias ?? 30)} onChange={v => setForm(f => ({ ...f, dias: Number(v) }))} type="number" />
          <Field label="Nº Parcelas" value={String(form.numeroParcelas ?? "")} onChange={v => setForm(f => ({ ...f, numeroParcelas: Number(v) || undefined }))} type="number" />
          <Field label="Dias entre Parcelas" value={String(form.diasEntreParcelas ?? "")} onChange={v => setForm(f => ({ ...f, diasEntreParcelas: Number(v) || undefined }))} type="number" />
          <Field label="Desconto Comercial (%)" value={String(form.descontoComercial ?? "")} onChange={v => setForm(f => ({ ...f, descontoComercial: Number(v) || undefined }))} type="number" />
          <Field label="Desconto Financeiro (%)" value={String(form.descontoFinanceiro ?? "")} onChange={v => setForm(f => ({ ...f, descontoFinanceiro: Number(v) || undefined }))} type="number" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">Observações</label>
          <textarea value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
            rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 focus:outline-none focus:border-brand-400 resize-none" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.activa ?? true} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))}
            className="rounded text-brand-600" />
          <span className="text-sm text-ink-700">Condição activa</span>
        </label>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50">Cancelar</button>
        <button onClick={() => onSave(form)} className="px-5 py-2.5 text-sm font-semibold rounded-lg text-white" style={{ background: "#CC0000" }}>
          {isEdit ? "Guardar" : "Criar"}
        </button>
      </div>
    </div>
  );
}

export default function CondPagamentoPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [lista, setLista] = useState<CondicaoPagamento[]>(COND_DEMO);

  function openCriar() {
    const winId = `criar-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Nova Condição de Pagamento", icon: "💳",
      content: (
        <CondPagamentoFormWindow
          initialForm={{ ...BLANK }}
          isEdit={false}
          onSave={(data) => {
            if (!data.descricao || !data.codigo) return;
            setLista(l => [...l, {
              id: String(l.length + 1), codigo: data.codigo!, descricao: data.descricao!,
              tipo: data.tipo as TipoCondicao || "prazo", dias: data.dias || 0,
              numeroParcelas: data.numeroParcelas, diasEntreParcelas: data.diasEntreParcelas,
              descontoComercial: data.descontoComercial, descontoFinanceiro: data.descontoFinanceiro,
              activa: data.activa ?? true, observacoes: data.observacoes,
            }]);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 40, y: 20, width: 680, height: 480, minimized: false, maximized: false,
    });
  }
  function openEditar(c: CondicaoPagamento) {
    const winId = `editar-${c.id}`;
    openWindow({
      id: winId, title: `Editar Condição — ${c.descricao}`, icon: "💳",
      content: (
        <CondPagamentoFormWindow
          initialForm={{ ...c }}
          isEdit={true}
          onSave={(data) => {
            if (!data.descricao || !data.codigo) return;
            setLista(l => l.map(x => x.id === c.id ? { ...x, ...data } as CondicaoPagamento : x));
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 60, y: 40, width: 680, height: 480, minimized: false, maximized: false,
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Condições de Pagamento</h1>
          <p className="text-sm text-ink-500 mt-0.5">Termos de pagamento para clientes e fornecedores</p>
        </div>
        <button onClick={openCriar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#CC0000" }}>
          <span className="text-lg leading-none">+</span> Nova Condição
        </button>
      </div>

      <div className="bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50">
              {["Código","Descrição","Tipo","Prazo (dias)","Parcelas","Desc. Comercial","Estado",""].map(h =>
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {lista.map(c => (
              <tr key={c.id} className={`border-b border-ink-50 hover:bg-ink-50 ${!c.activa ? "opacity-60" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs font-bold text-ink-700">{c.codigo}</td>
                <td className="px-4 py-3 font-medium text-ink-900">{c.descricao}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                    style={{ background: TIPO_COLOR[c.tipo] }}>
                    {TIPO_LABEL[c.tipo]}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-600">{c.dias} dias</td>
                <td className="px-4 py-3 text-ink-600">
                  {c.numeroParcelas ? `${c.numeroParcelas}× (${c.diasEntreParcelas}d)` : "—"}
                </td>
                <td className="px-4 py-3 text-ink-600">{c.descontoComercial ? `${c.descontoComercial}%` : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.activa ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-500"}`}>
                    {c.activa ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEditar(c)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
