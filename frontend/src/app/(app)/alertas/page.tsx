"use client";

import { useState, useCallback } from "react";
import { useCollection } from "@/lib/useCollection";
import Topbar from "@/components/Topbar";
import { useWindowManager } from "@/lib/windowManager";

type AlertLevel = "critico" | "aviso" | "info";

type AlertModulo =
  | "FISCAL" | "VENDAS" | "TESOURARIA" | "COMPRAS" | "RH"
  | "INVENTÁRIO" | "CONTABILIDADE" | "APROVAÇÕES" | "DIGITAL" | "OUTRO";

interface Alert {
  id: string;
  nivel: AlertLevel;
  titulo: string;
  desc: string;
  modulo: AlertModulo | string;
  data: string;
  lido: boolean;
  acao?: string;
}

const STORAGE_KEY = "educontas-alertas";

const SEED_ALERTAS: Alert[] = [
  { id: "AL-001", nivel: "critico", titulo: "IRT Novembro 2024 vence em 3 dias",              desc: "Prazo limite: 10/12/2024. Valor: 3.200.000 AOA. Pagamento pendente via AGT.",               modulo: "FISCAL",        data: "07/12 08:00", lido: false, acao: "/fiscalidade" },
  { id: "AL-002", nivel: "critico", titulo: "Segurança Social Nov. vence em 3 dias",           desc: "Prazo limite: 10/12/2024. Valor: 8.800.000 AOA. Risco de coima por atraso.",             modulo: "FISCAL",        data: "07/12 08:00", lido: false, acao: "/fiscalidade" },
  { id: "AL-003", nivel: "aviso",   titulo: "Cliente Sonangol EP em dívida há 11 dias",        desc: "FT/2024/001200 — 28.500.000 AOA. PMR actual: 11 dias. Limite: 30 dias.",                 modulo: "VENDAS",        data: "07/12 07:30", lido: false, acao: "/vendas" },
  { id: "AL-004", nivel: "aviso",   titulo: "Aprovação urgente pendente",                      desc: "Pagamento 42M Kz a Petro Insumos aguarda aprovação Nível 3 há 4h.",                      modulo: "APROVAÇÕES",    data: "07/12 07:00", lido: false, acao: "/aprovacoes" },
  { id: "AL-005", nivel: "aviso",   titulo: "IVA Novembro vence em 13 dias",                   desc: "Prazo: 20/12/2024. Valor estimado: 12.400.000 AOA. Preparar declaração.",                modulo: "FISCAL",        data: "07/12 06:00", lido: true,  acao: "/fiscalidade" },
  { id: "AL-006", nivel: "info",    titulo: "Reconciliação bancária: 3 transacções pendentes", desc: "Extracto BFA importado — 3 débitos não reconciliados no total de 12.045.000 AOA.",       modulo: "TESOURARIA",    data: "06/12 18:00", lido: true,  acao: "/reconciliacao" },
  { id: "AL-007", nivel: "info",    titulo: "Produto UPS APC 1000VA sem stock",                desc: "Stock esgotado desde 01/12. Último fornecedor: Tech Supplies Angola. Rever encomenda.",  modulo: "INVENTÁRIO",    data: "06/12 12:00", lido: true,  acao: "/inventario" },
  { id: "AL-008", nivel: "info",    titulo: "Período Novembro pode ser encerrado",             desc: "Todos os lançamentos estão lançados. Balancete equilibrado. Pronto para fecho.",         modulo: "CONTABILIDADE", data: "06/12 09:00", lido: true,  acao: "/balancete" },
  { id: "AL-009", nivel: "aviso",   titulo: "Documento com baixa confiança OCR",              desc: "Recibo_Canteen_001.jpg — precisão 72%. Requer revisão manual antes de lançar.",          modulo: "DIGITAL",       data: "05/12 16:00", lido: true,  acao: "/digital" },
  { id: "AL-010", nivel: "info",    titulo: "Previsão fluxo de caixa — Dezembro",             desc: "IA prevê saldo de caixa de 180M Kz no final de Dezembro. Tendência positiva.",           modulo: "TESOURARIA",    data: "05/12 08:00", lido: true },
];

const nivelIcon: Record<AlertLevel, { icon: string; bg: string; text: string; badge: string }> = {
  critico: { icon: "🔴", bg: "bg-brand-50 border-brand-200",  text: "text-brand-700",  badge: "badge-red"    },
  aviso:   { icon: "🟡", bg: "bg-gold-50 border-gold-200",    text: "text-gold-700",   badge: "badge-yellow" },
  info:    { icon: "🔵", bg: "bg-aqua-50 border-aqua-200",    text: "text-aqua-700",   badge: "badge-aqua"   },
};

const MODULOS: AlertModulo[] = [
  "FISCAL","VENDAS","TESOURARIA","COMPRAS","RH","INVENTÁRIO","CONTABILIDADE","APROVAÇÕES","DIGITAL","OUTRO"
];

// ── Shared form fields ─────────────────────────────────────────────────────────

interface AlertaFormFields {
  titulo: string;
  desc: string;
  nivel: AlertLevel;
  modulo: AlertModulo | string;
  acao: string;
  lido?: boolean;
}

interface AlertaFormProps {
  value: AlertaFormFields;
  onChange: (v: AlertaFormFields) => void;
  showLido?: boolean;
}

function AlertaFormFields({ value, onChange, showLido }: AlertaFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Título *</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          value={value.titulo}
          onChange={e => onChange({ ...value, titulo: e.target.value })}
          placeholder="Título do alerta"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição *</label>
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
          rows={3}
          value={value.desc}
          onChange={e => onChange({ ...value, desc: e.target.value })}
          placeholder="Descrição detalhada do alerta"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Nível *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={value.nivel}
            onChange={e => onChange({ ...value, nivel: e.target.value as AlertLevel })}
          >
            <option value="critico">Crítico</option>
            <option value="aviso">Aviso</option>
            <option value="info">Info</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Módulo *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={value.modulo}
            onChange={e => onChange({ ...value, modulo: e.target.value as AlertModulo })}
          >
            {MODULOS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Acção (URL, opcional)</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          value={value.acao}
          onChange={e => onChange({ ...value, acao: e.target.value })}
          placeholder="/fiscalidade"
        />
      </div>
      {showLido && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="lido-check"
            checked={!!value.lido}
            onChange={e => onChange({ ...value, lido: e.target.checked })}
            className="w-4 h-4 accent-brand-600"
          />
          <label htmlFor="lido-check" className="text-sm text-gray-700">Marcar como lido</label>
        </div>
      )}
    </div>
  );
}

// ── NovoAlertaModal ─────────────────────────────────────────────────────────────

interface NovoAlertaModalProps {
  onSave: (a: Alert) => void;
  onClose: () => void;
  existingCount: number;
}

function NovoAlertaModal({ onSave, onClose, existingCount }: NovoAlertaModalProps) {
  const [form, setForm] = useState<AlertaFormFields>({
    titulo: "",
    desc: "",
    nivel: "info",
    modulo: "FISCAL",
    acao: "",
  });

  function handleSave() {
    if (!form.titulo.trim() || !form.desc.trim()) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dataStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const newNum = String(existingCount + 1).padStart(3, "0");
    const alerta: Alert = {
      id: `AL-${newNum}`,
      nivel: form.nivel,
      titulo: form.titulo.trim(),
      desc: form.desc.trim(),
      modulo: form.modulo,
      data: dataStr,
      lido: false,
      acao: form.acao.trim() || undefined,
    };
    onSave(alerta);
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AlertaFormFields value={form} onChange={setForm} />
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={handleSave} disabled={!form.titulo.trim() || !form.desc.trim()}>
          Criar Alerta
        </button>
      </div>
    </div>
  );
}

// ── EditarAlertaModal ───────────────────────────────────────────────────────────

interface EditarAlertaModalProps {
  alerta: Alert;
  onSave: (a: Alert) => void;
  onClose: () => void;
}

function EditarAlertaModal({ alerta, onSave, onClose }: EditarAlertaModalProps) {
  const [form, setForm] = useState<AlertaFormFields>({
    titulo: alerta.titulo,
    desc: alerta.desc,
    nivel: alerta.nivel,
    modulo: alerta.modulo as AlertModulo,
    acao: alerta.acao ?? "",
    lido: alerta.lido,
  });

  function handleSave() {
    if (!form.titulo.trim() || !form.desc.trim()) return;
    onSave({
      ...alerta,
      titulo: form.titulo.trim(),
      desc: form.desc.trim(),
      nivel: form.nivel,
      modulo: form.modulo,
      acao: form.acao.trim() || undefined,
      lido: !!form.lido,
    });
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AlertaFormFields value={form} onChange={setForm} showLido />
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={handleSave} disabled={!form.titulo.trim() || !form.desc.trim()}>
          Guardar
        </button>
      </div>
    </div>
  );
}

// ── Delete confirmation ─────────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  alerta: Alert;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmDelete({ alerta, onConfirm, onClose }: ConfirmDeleteProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-sm text-gray-700">
          Tem a certeza que pretende eliminar o alerta <strong>{alerta.id}</strong>?
        </p>
        <p className="text-xs text-gray-500 italic">{alerta.titulo}</p>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary bg-red-600 hover:bg-red-700 border-red-600" onClick={() => { onConfirm(); onClose(); }}>
          Eliminar
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AlertasPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const { items: data, setItems: persist } = useCollection<Alert>(STORAGE_KEY, SEED_ALERTAS);
  const [filter, setFilter] = useState<"todos" | AlertLevel | "nao_lidos">("todos");

  const addAlerta    = useCallback((a: Alert)    => persist(prev => [a, ...prev]),                               [persist]);
  const updateAlerta = useCallback((a: Alert)    => persist(prev => prev.map(x => x.id === a.id ? a : x)),      [persist]);
  const deleteAlerta = useCallback((id: string)  => persist(prev => prev.filter(x => x.id !== id)),             [persist]);

  function markRead(id: string) {
    persist(data.map(a => a.id === id ? { ...a, lido: true } : a));
  }

  function markAllRead() {
    persist(data.map(a => ({ ...a, lido: true })));
  }

  const filtered = data.filter(a => {
    if (filter === "nao_lidos") return !a.lido;
    if (filter === "todos") return true;
    return a.nivel === filter;
  });

  const naoLidos = data.filter(a => !a.lido).length;
  const criticos = data.filter(a => a.nivel === "critico").length;

  // ── Window openers ─────────────────────────────────────────────────────

  function handleOpenNovoAlerta() {
    openWindow({
      id: "novo-alerta",
      title: "Novo Alerta",
      icon: "🔔",
      content: (
        <NovoAlertaModal
          existingCount={data.length}
          onSave={addAlerta}
          onClose={() => closeWindow("novo-alerta")}
        />
      ),
      x: 200, y: 120, width: 520, height: 460,
      minimized: false, maximized: false,
    });
  }

  function handleOpenEditar(alerta: Alert) {
    const winId = `editar-alerta-${alerta.id}`;
    openWindow({
      id: winId,
      title: `Editar Alerta ${alerta.id}`,
      icon: "✏️",
      content: (
        <EditarAlertaModal
          alerta={alerta}
          onSave={updateAlerta}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 220, y: 140, width: 520, height: 480,
      minimized: false, maximized: false,
    });
  }

  function handleOpenDelete(alerta: Alert) {
    const winId = `delete-alerta-${alerta.id}`;
    openWindow({
      id: winId,
      title: `Eliminar Alerta ${alerta.id}`,
      icon: "🗑️",
      content: (
        <ConfirmDelete
          alerta={alerta}
          onConfirm={() => deleteAlerta(alerta.id)}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 260, y: 200, width: 480, height: 220,
      minimized: false, maximized: false,
    });
  }

  return (
    <div>
      <Topbar
        title="Alertas Inteligentes"
        subtitle="Monitorização em tempo real · Fiscal · Cash flow · Operacional"
        actions={
          <>
            {naoLidos > 0 && (
              <button onClick={markAllRead} className="btn-secondary text-xs py-1.5">
                Marcar todos como lidos
              </button>
            )}
            <button onClick={handleOpenNovoAlerta} className="btn-primary text-xs py-1.5">
              + Novo Alerta
            </button>
            <span className="badge-red badge">{naoLidos} não lidos</span>
          </>
        }
      />

      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
          <div className="card-red p-4 text-center">
            <p className="text-[11px] text-brand-600 font-bold uppercase tracking-wide">Críticos</p>
            <p className="text-3xl font-bold text-brand-700 mt-1">{criticos}</p>
            <p className="text-xs text-brand-500 mt-0.5">acção imediata</p>
          </div>
          <div className="card-gold p-4 text-center">
            <p className="text-[11px] text-gold-600 font-bold uppercase tracking-wide">Avisos</p>
            <p className="text-3xl font-bold text-gold-700 mt-1">{data.filter(a => a.nivel === "aviso").length}</p>
            <p className="text-xs text-gold-500 mt-0.5">atenção requerida</p>
          </div>
          <div className="card-aqua p-4 text-center">
            <p className="text-[11px] text-aqua-600 font-bold uppercase tracking-wide">Informação</p>
            <p className="text-3xl font-bold text-aqua-700 mt-1">{data.filter(a => a.nivel === "info").length}</p>
            <p className="text-xs text-aqua-500 mt-0.5">actualizações</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: "todos",     label: `Todos (${data.length})` },
            { key: "nao_lidos", label: `Não lidos (${naoLidos})` },
            { key: "critico",   label: `Críticos (${criticos})` },
            { key: "aviso",     label: "Avisos" },
            { key: "info",      label: "Info" },
          ] as { key: typeof filter; label: string }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={filter === f.key ? "btn-primary py-1.5 px-4 text-xs" : "btn-secondary py-1.5 px-4 text-xs"}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de alertas */}
        <div className="space-y-2">
          {filtered.map((alerta) => {
            const style = nivelIcon[alerta.nivel];
            return (
              <div
                key={alerta.id}
                className={`card border ${style.bg} ${!alerta.lido ? "shadow-card-md" : "opacity-80"} transition-all`}
              >
                <div className="p-4 flex items-start gap-4">
                  <span className="text-xl shrink-0 mt-0.5">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`badge text-[10px] ${style.badge}`}>{alerta.nivel.toUpperCase()}</span>
                      <span className="badge-gray text-[10px]">{alerta.modulo}</span>
                      <span className="text-[11px] text-ink-400 ml-auto">{alerta.data}</span>
                      {!alerta.lido && <span className="w-2 h-2 bg-brand-500 rounded-full" />}
                    </div>
                    <p className={`font-semibold text-sm ${style.text}`}>{alerta.titulo}</p>
                    <p className="text-xs text-ink-600 mt-0.5">{alerta.desc}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {alerta.acao && (
                      <a href={alerta.acao} className="btn-ghost py-1 px-2.5 text-xs">
                        Ver →
                      </a>
                    )}
                    {!alerta.lido && (
                      <button onClick={() => markRead(alerta.id)} className="btn-ghost py-1 px-2.5 text-xs text-ink-400">
                        Lido
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditar(alerta)}
                      className="btn-ghost py-1 px-2.5 text-xs text-ink-400"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleOpenDelete(alerta)}
                      className="btn-ghost py-1 px-2.5 text-xs text-brand-400"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="font-semibold text-ink-500">Sem alertas nesta categoria</p>
            </div>
          )}
        </div>

        {/* Configurações de alertas */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>Configuração de Notificações</h3>
            <span className="badge-aqua text-[11px]">Automáticas</span>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                { canal: "Email",    eventos: "Critérios críticos e de aprovação",     activo: true },
                { canal: "WhatsApp", eventos: "Vencimentos fiscais e alertas urgentes", activo: true },
                { canal: "SMS",      eventos: "Pagamentos aprovados acima de 10M Kz",  activo: false },
                { canal: "In-app",   eventos: "Todos os eventos",                       activo: true },
              ].map((n) => (
                <div key={n.canal} className="flex items-center justify-between p-3 bg-ink-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-ink-800">{n.canal}</p>
                    <p className="text-xs text-ink-400">{n.eventos}</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full flex items-center transition-colors ${n.activo ? "bg-green-400 justify-end" : "bg-ink-200 justify-start"} px-0.5`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
