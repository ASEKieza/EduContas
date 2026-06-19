"use client";

import { useState, useCallback } from "react";
import { useCollection } from "@/lib/useCollection";
import Topbar from "@/components/Topbar";
import { useWindowManager } from "@/lib/windowManager";

type PeriodStatus = "aberto" | "em_fecho" | "fechado" | "auditado";

interface Period {
  id: string;
  year: number;
  month: number;
  status: PeriodStatus;
  closedAt?: string;
  closedBy?: string;
  checks: PeriodCheck[];
}

interface PeriodCheck {
  id: string;
  label: string;
  status: "ok" | "warn" | "error" | "pending";
  detail?: string;
}

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── Seed data ─────────────────────────────────────────────────────────────────
const INITIAL_PERIODS: Period[] = [
  {
    id: "2025-12", year: 2025, month: 12, status: "auditado",
    closedAt: "2026-01-15", closedBy: "João Silva (CFO)",
    checks: [
      { id:"balance",  label:"Balancete equilibrado (D=C)",           status:"ok" },
      { id:"bank",     label:"Reconciliação bancária concluída",      status:"ok" },
      { id:"iva",      label:"IVA apurado e declarado à AGT",         status:"ok" },
      { id:"payroll",  label:"Processamento salarial fechado",        status:"ok" },
      { id:"assets",   label:"Amortizações do período lançadas",      status:"ok" },
      { id:"stock",    label:"Inventário reconciliado",               status:"ok" },
    ],
  },
  {
    id: "2026-01", year: 2026, month: 1, status: "fechado",
    closedAt: "2026-02-12", closedBy: "Maria Costa (Contabilista)",
    checks: [
      { id:"balance",  label:"Balancete equilibrado (D=C)",           status:"ok" },
      { id:"bank",     label:"Reconciliação bancária concluída",      status:"ok" },
      { id:"iva",      label:"IVA apurado e declarado à AGT",         status:"ok" },
      { id:"payroll",  label:"Processamento salarial fechado",        status:"ok" },
      { id:"assets",   label:"Amortizações do período lançadas",      status:"ok" },
      { id:"stock",    label:"Inventário reconciliado",               status:"warn", detail:"2 artigos com diferença de contagem" },
    ],
  },
  {
    id: "2026-02", year: 2026, month: 2, status: "fechado",
    closedAt: "2026-03-10", closedBy: "Maria Costa (Contabilista)",
    checks: [
      { id:"balance",  label:"Balancete equilibrado (D=C)",           status:"ok" },
      { id:"bank",     label:"Reconciliação bancária concluída",      status:"ok" },
      { id:"iva",      label:"IVA apurado e declarado à AGT",         status:"ok" },
      { id:"payroll",  label:"Processamento salarial fechado",        status:"ok" },
      { id:"assets",   label:"Amortizações do período lançadas",      status:"ok" },
      { id:"stock",    label:"Inventário reconciliado",               status:"ok" },
    ],
  },
  {
    id: "2026-03", year: 2026, month: 3, status: "fechado",
    closedAt: "2026-04-08", closedBy: "Maria Costa (Contabilista)",
    checks: [
      { id:"balance",  label:"Balancete equilibrado (D=C)",           status:"ok" },
      { id:"bank",     label:"Reconciliação bancária concluída",      status:"ok" },
      { id:"iva",      label:"IVA apurado e declarado à AGT",         status:"ok" },
      { id:"payroll",  label:"Processamento salarial fechado",        status:"ok" },
      { id:"assets",   label:"Amortizações do período lançadas",      status:"ok" },
      { id:"stock",    label:"Inventário reconciliado",               status:"ok" },
    ],
  },
  {
    id: "2026-04", year: 2026, month: 4, status: "fechado",
    closedAt: "2026-05-07", closedBy: "Maria Costa (Contabilista)",
    checks: [
      { id:"balance",  label:"Balancete equilibrado (D=C)",           status:"ok" },
      { id:"bank",     label:"Reconciliação bancária concluída",      status:"ok" },
      { id:"iva",      label:"IVA apurado e declarado à AGT",         status:"ok" },
      { id:"payroll",  label:"Processamento salarial fechado",        status:"ok" },
      { id:"assets",   label:"Amortizações do período lançadas",      status:"ok" },
      { id:"stock",    label:"Inventário reconciliado",               status:"ok" },
    ],
  },
  {
    id: "2026-05", year: 2026, month: 5, status: "em_fecho",
    checks: [
      { id:"balance",  label:"Balancete equilibrado (D=C)",           status:"ok",     detail:"Débitos = Créditos = 485.230.000 AOA" },
      { id:"bank",     label:"Reconciliação bancária concluída",      status:"warn",   detail:"3 movimentos por reconciliar (BAI, BFA)" },
      { id:"iva",      label:"IVA apurado e declarado à AGT",         status:"pending",detail:"Prazo: 10 Jun 2026" },
      { id:"payroll",  label:"Processamento salarial fechado",        status:"ok",     detail:"28 colaboradores processados" },
      { id:"assets",   label:"Amortizações do período lançadas",      status:"ok",     detail:"12 activos amortizados — 1.240.000 AOA" },
      { id:"stock",    label:"Inventário reconciliado",               status:"error",  detail:"Diferença de 450.000 AOA — requer ajuste" },
    ],
  },
  {
    id: "2026-06", year: 2026, month: 6, status: "aberto",
    checks: [
      { id:"balance",  label:"Balancete equilibrado (D=C)",           status:"pending" },
      { id:"bank",     label:"Reconciliação bancária concluída",      status:"pending" },
      { id:"iva",      label:"IVA apurado e declarado à AGT",         status:"pending" },
      { id:"payroll",  label:"Processamento salarial fechado",        status:"pending" },
      { id:"assets",   label:"Amortizações do período lançadas",      status:"pending" },
      { id:"stock",    label:"Inventário reconciliado",               status:"pending" },
    ],
  },
];

const STORAGE_KEY = "educontas-fecho-2026";

const STATUS_CONFIG: Record<PeriodStatus, { label: string; color: string; bg: string; icon: string }> = {
  aberto:   { label:"Aberto",   color:"text-ink-500",   bg:"bg-ink-100",   icon:"○" },
  em_fecho: { label:"Em Fecho", color:"text-gold-700",  bg:"bg-gold-100",  icon:"◔" },
  fechado:  { label:"Fechado",  color:"text-blue-700",  bg:"bg-blue-100",  icon:"●" },
  auditado: { label:"Auditado", color:"text-green-700", bg:"bg-green-100", icon:"✓" },
};

const CHECK_CONFIG = {
  ok:      { color:"text-green-600",  bg:"bg-green-50",   icon:"✓", label:"Concluído" },
  warn:    { color:"text-gold-600",   bg:"bg-gold-50",    icon:"!", label:"Aviso" },
  error:   { color:"text-brand-600",  bg:"bg-brand-50",   icon:"✗", label:"Erro" },
  pending: { color:"text-ink-400",    bg:"bg-ink-50",     icon:"○", label:"Pendente" },
};

export default function FechoPeriodoPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const { items: periods, setItems: persist } = useCollection<Period>(STORAGE_KEY, INITIAL_PERIODS);
  const [selectedId, setSelectedId] = useState<string>("2026-05");

  const selected = periods.find(p => p.id === selectedId) ?? periods[0];
  if (!selected) return null;

  function canClose(p: Period) {
    return p.status === "em_fecho" && p.checks.every(c => c.status === "ok" || c.status === "warn");
  }

  function closePeriod(winId: string) {
    const updated = periods.map(p =>
      p.id === selected.id
        ? { ...p, status: "fechado" as const, closedAt: new Date().toISOString().slice(0,10), closedBy: "Admin (Contabilista)" }
        : p
    );
    persist(updated);
    setSelectedId(selected.id);
    closeWindow(winId);
  }

  function reopenPeriod(winId: string) {
    const updated = periods.map(p =>
      p.id === selected.id
        ? { ...p, status: "em_fecho" as const, closedAt: undefined, closedBy: undefined }
        : p
    );
    persist(updated);
    setSelectedId(selected.id);
    closeWindow(winId);
  }

  function openConfirmClose() {
    const winId = `fecho-confirm-${currentPeriod.id}-${crypto.randomUUID()}`;
    openWindow({
      id: winId,
      title: "Confirmar Fecho de Período",
      icon: "🔒",
      content: <ConfirmCloseModal
        period={currentPeriod}
        onConfirm={() => closePeriod(winId)}
        onClose={() => closeWindow(winId)}
      />,
      x: 40, y: 20, width: 480, height: 280, minimized: false, maximized: false,
    });
  }

  function openConfirmReopen() {
    const winId = `fecho-reopen-${currentPeriod.id}-${crypto.randomUUID()}`;
    openWindow({
      id: winId,
      title: "Reabrir Período",
      icon: "🔓",
      content: <ConfirmReopenModal
        period={currentPeriod}
        onConfirm={() => reopenPeriod(winId)}
        onClose={() => closeWindow(winId)}
      />,
      x: 40, y: 20, width: 480, height: 280, minimized: false, maximized: false,
    });
  }

  // Derive current from persisted periods
  const currentPeriod = periods.find(p => p.id === selectedId) ?? selected;
  const sc = STATUS_CONFIG[currentPeriod.status];
  const checksOk  = currentPeriod.checks.filter(c => c.status === "ok").length;
  const checksErr = currentPeriod.checks.filter(c => c.status === "error").length;

  const allClosed  = periods.filter(p => p.status === "fechado" || p.status === "auditado").length;
  const allPeriods = periods.length;

  return (
    <div>
      <Topbar
        title="Fecho de Período"
        subtitle="Controlo de fecho mensal · Verificações obrigatórias · Histórico de auditoria"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-500 font-medium">{allClosed}/{allPeriods} períodos fechados</span>
            <div className="w-24 h-2 rounded-full bg-ink-100 overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(allClosed / allPeriods) * 100}%` }} />
            </div>
          </div>
        }
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Calendar column ── */}
          <div className="lg:col-span-1 space-y-3">
            <div className="card p-4">
              <h3 className="font-semibold text-ink-700 mb-3 text-sm">Períodos do Exercício 2026</h3>
              <div className="space-y-1">
                {periods.map((p) => {
                  const st = STATUS_CONFIG[p.status];
                  const isSelected = p.id === currentPeriod.id;
                  const errCount  = p.checks.filter(c => c.status === "error").length;
                  const warnCount = p.checks.filter(c => c.status === "warn").length;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        isSelected ? "bg-brand-600 text-white" : "hover:bg-ink-50"
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected ? "bg-white/20 text-white" : `${st.bg} ${st.color}`
                      }`}>
                        {st.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isSelected ? "text-white" : "text-ink-800"}`}>
                          {MONTHS[p.month - 1]} {p.year}
                        </p>
                        <p className={`text-[11px] ${isSelected ? "text-white/70" : st.color}`}>{st.label}</p>
                      </div>
                      {errCount > 0 && !isSelected && (
                        <span className="text-[10px] font-bold px-1.5 bg-brand-100 text-brand-700 rounded-full">{errCount} erro</span>
                      )}
                      {warnCount > 0 && errCount === 0 && !isSelected && (
                        <span className="text-[10px] font-bold px-1.5 bg-gold-100 text-gold-700 rounded-full">{warnCount} av.</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card p-4 border-brand-200 bg-brand-50">
              <p className="text-xs font-bold text-brand-700 mb-1">Fecho Anual 2026</p>
              <p className="text-xs text-brand-600">Disponível após fechar todos os meses de 2026. O sistema lança automaticamente o apuramento de resultados (conta 88).</p>
            </div>
          </div>

          {/* ── Detail column ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Period header */}
            <div className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-ink-900">
                      {MONTHS[currentPeriod.month - 1]} {currentPeriod.year}
                    </h2>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                      {sc.label}
                    </span>
                  </div>
                  {currentPeriod.closedAt && (
                    <p className="text-xs text-ink-400">
                      Fechado em {currentPeriod.closedAt} por <strong>{currentPeriod.closedBy}</strong>
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className="text-green-600 font-semibold">{checksOk}/{currentPeriod.checks.length} verificações OK</span>
                    {checksErr > 0 && <span className="text-brand-600 font-semibold">{checksErr} erro(s) bloqueante(s)</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {currentPeriod.status === "em_fecho" && (
                    <button
                      onClick={() => canClose(currentPeriod) && openConfirmClose()}
                      disabled={!canClose(currentPeriod)}
                      className="btn-primary text-xs"
                      title={!canClose(currentPeriod) ? "Resolva os erros antes de fechar" : ""}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Fechar Período
                    </button>
                  )}
                  {currentPeriod.status === "fechado" && (
                    <button onClick={openConfirmReopen} className="btn-secondary text-xs">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      Reabrir
                    </button>
                  )}
                  {currentPeriod.status === "aberto" && (
                    <button onClick={() => {
                      const updated = periods.map(p =>
                        p.id === currentPeriod.id ? { ...p, status: "em_fecho" as const } : p
                      );
                      persist(updated);
                    }} className="btn-secondary text-xs">
                      Iniciar Fecho
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="card overflow-hidden">
              <div className="card-header">
                <h3 className="font-semibold text-ink-800">Verificações Obrigatórias de Fecho</h3>
              </div>
              <div className="divide-y divide-ink-100">
                {currentPeriod.checks.map((check) => {
                  const cfg = CHECK_CONFIG[check.status];
                  return (
                    <div key={check.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-ink-50/50">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${cfg.bg} ${cfg.color}`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-800">{check.label}</p>
                        {check.detail && (
                          <p className={`text-xs mt-0.5 ${
                            check.status === "error" ? "text-brand-600" :
                            check.status === "warn"  ? "text-gold-600"  : "text-ink-400"
                          }`}>
                            {check.detail}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info box */}
            {(currentPeriod.status === "fechado" || currentPeriod.status === "auditado") ? (
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-800">Período Fechado — Lançamentos Imutáveis</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Nenhum lançamento pode ser criado, modificado ou eliminado neste período.
                    Correcções devem ser feitas através de diários de estorno no período actual.
                  </p>
                </div>
              </div>
            ) : currentPeriod.status === "em_fecho" && checksErr > 0 ? (
              <div className="p-4 rounded-xl border border-brand-200 bg-brand-50 flex items-start gap-3">
                <svg className="w-5 h-5 text-brand-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-brand-800">Não é possível fechar com erros</p>
                  <p className="text-xs text-brand-600 mt-0.5">
                    Resolva {checksErr} erro(s) antes de proceder ao fecho. Avisos (amarelo) permitem fecho com justificação.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

    </div>
  );
}

function ConfirmCloseModal({
  period,
  onConfirm,
  onClose,
}: {
  period: Period;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <p className="text-center text-sm text-ink-500 mb-2">
        <strong>{MONTHS[period.month - 1]} {period.year}</strong>
      </p>
      <p className="text-center text-xs text-ink-400 mb-5">
        Esta acção impede a criação de novos lançamentos neste período. Pode ser revertida por um administrador.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={onConfirm} className="btn-primary flex-1 justify-center">Confirmar Fecho</button>
      </div>
    </div>
  );
}

function ConfirmReopenModal({
  period,
  onConfirm,
  onClose,
}: {
  period: Period;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-center text-sm text-ink-500 mb-5">
        Reabrir <strong>{MONTHS[period.month - 1]} {period.year}</strong> permite lançamentos adicionais. Esta acção fica registada na auditoria.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={onConfirm} className="btn-gold flex-1 justify-center">Reabrir</button>
      </div>
    </div>
  );
}
