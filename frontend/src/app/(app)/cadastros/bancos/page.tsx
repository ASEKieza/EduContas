"use client";

import { useState, useMemo } from "react";
import { useWindowManager } from "@/lib/windowManager";

// ── Types ──────────────────────────────────────────────────────────────────────
type TipoConta = "conta_corrente" | "conta_poupanca" | "caixa" | "cartao" | "deposito_prazo";
type EstadoConta = "activa" | "inactiva" | "bloqueada";

interface ContaBancaria {
  id: string;
  codigo: string;
  nome: string;
  tipo: TipoConta;
  banco: string;
  iban?: string;
  bic?: string;
  numeroConta?: string;
  agencia?: string;
  moeda: string;
  saldoActual: number;
  saldoContabilistico: number;
  limiteDescoberto?: number;
  contaPGCA: string;
  responsavel?: string;
  dataAbertura: string;
  estado: EstadoConta;
  reconciliadoAte?: string;
  observacoes?: string;
}

const CONTAS_DEMO: ContaBancaria[] = [
  {
    id: "CB001", codigo: "BNK-001",
    nome: "Conta Principal — BAI", tipo: "conta_corrente",
    banco: "BAI — Banco Angolano de Investimentos", iban: "AO06 0040 0000 1234 5678 1015 4",
    bic: "BAIAANLA", numeroConta: "4000123456789", agencia: "Agência Maianga — Luanda",
    moeda: "Kz", saldoActual: 48500000, saldoContabilistico: 48500000, limiteDescoberto: 5000000,
    contaPGCA: "43.1", responsavel: "Directora Financeira",
    dataAbertura: "2020-03-15", estado: "activa", reconciliadoAte: "2026-05-31",
  },
  {
    id: "CB002", codigo: "BNK-002",
    nome: "Conta USD — BPC", tipo: "conta_corrente",
    banco: "BPC — Banco de Poupança e Crédito", iban: "AO06 0006 0000 9876 5432 1015 7",
    bic: "BPCAANLA", numeroConta: "6000987654321", agencia: "Agência Ingombota",
    moeda: "USD", saldoActual: 125000, saldoContabilistico: 124850, limiteDescoberto: 0,
    contaPGCA: "43.2", responsavel: "Directora Financeira",
    dataAbertura: "2021-07-20", estado: "activa", reconciliadoAte: "2026-05-31",
  },
  {
    id: "CB003", codigo: "BNK-003",
    nome: "Caixa Geral — Sede", tipo: "caixa",
    banco: "—", moeda: "Kz",
    saldoActual: 1250000, saldoContabilistico: 1250000,
    contaPGCA: "45.2", responsavel: "Tesoureiro",
    dataAbertura: "2020-01-01", estado: "activa", reconciliadoAte: "2026-06-01",
  },
  {
    id: "CB004", codigo: "BNK-004",
    nome: "Caixa Câmbio — USD", tipo: "caixa",
    banco: "—", moeda: "USD",
    saldoActual: 8500, saldoContabilistico: 8500,
    contaPGCA: "45.2", responsavel: "Tesoureiro",
    dataAbertura: "2022-06-10", estado: "activa", reconciliadoAte: "2026-06-01",
  },
  {
    id: "CB005", codigo: "BNK-005",
    nome: "Depósito a Prazo 12M — BFA", tipo: "deposito_prazo",
    banco: "BFA — Banco de Fomento Angola", iban: "AO06 0055 0000 1111 2222 3333 8",
    bic: "BFAOANLA", numeroConta: "5500111122223333", agencia: "Agência Luanda Sul",
    moeda: "Kz", saldoActual: 25000000, saldoContabilistico: 25000000,
    contaPGCA: "42.1", responsavel: "Directora Financeira",
    dataAbertura: "2025-12-01", estado: "activa",
    observacoes: "Vencimento: 30/11/2026. Taxa: 8% ao ano. Não movimentável antes do vencimento.",
  },
  {
    id: "CB006", codigo: "BNK-006",
    nome: "Cartão Corporativo — VISA Gold", tipo: "cartao",
    banco: "Millennium Atlântico", numeroConta: "4000 **** **** 8712",
    moeda: "USD", saldoActual: -1250, saldoContabilistico: -1250, limiteDescoberto: 10000,
    contaPGCA: "43.2", responsavel: "Director Geral",
    dataAbertura: "2023-09-01", estado: "activa", reconciliadoAte: "2026-05-31",
  },
];

const TIPO_LABEL: Record<TipoConta, string> = {
  conta_corrente: "Conta Corrente", conta_poupanca: "Conta Poupança",
  caixa: "Caixa", cartao: "Cartão Corporativo", deposito_prazo: "Depósito a Prazo",
};
const TIPO_COLOR: Record<TipoConta, string> = {
  conta_corrente: "#3b82f6", conta_poupanca: "#10b981",
  caixa: "#f59e0b", cartao: "#8b5cf6", deposito_prazo: "#06b6d4",
};
const TIPO_ICON: Record<TipoConta, string> = {
  conta_corrente: "🏦", conta_poupanca: "💰", caixa: "🪙", cartao: "💳", deposito_prazo: "📋",
};
const ESTADO_COLOR: Record<EstadoConta, string> = {
  activa: "#10b981", inactiva: "#6b7280", bloqueada: "#ef4444",
};
const CONTA_PGCA_OPS: Record<string, string> = {
  "43.1": "43.1 — Depósitos à Ordem (Kz)",
  "43.2": "43.2 — Depósitos à Ordem (Moeda Estrangeira)",
  "42.1": "42.1 — Depósitos a Prazo (Kz)",
  "42.2": "42.2 — Depósitos a Prazo (Moeda Estrangeira)",
  "45.1": "45.1 — Caixa — Fundo Fixo",
  "45.2": "45.2 — Caixa — Valores para Depositar",
  "41.1": "41.1 — Títulos Negociáveis — Acções",
  "44.1": "44.1 — Outros Depósitos (Kz)",
  "44.2": "44.2 — Outros Depósitos (Moeda Estrangeira)",
};
const MOEDA_SIMBOLO: Record<string, string> = {
  AOA: "Kz", USD: "$", EUR: "€", GBP: "£", ZAR: "R", CNY: "¥",
};

function fmtMoeda(v: number, moeda: string) {
  return `${MOEDA_SIMBOLO[moeda] || moeda} ${Math.abs(v).toLocaleString("pt-AO", { minimumFractionDigits: 2 })}${v < 0 ? " (débito)" : ""}`;
}

const BLANK: Partial<ContaBancaria> = {
  tipo: "conta_corrente", moeda: "Kz", contaPGCA: "43.1", estado: "activa",
  saldoActual: 0, saldoContabilistico: 0, dataAbertura: new Date().toISOString().slice(0, 10),
};

const MOVS_DEMO = [
  { data: "2026-06-01", desc: "Transferência Recebida — Petro Dist. SA", valor: 12500000, ref: "TRF-2026-0891" },
  { data: "2026-05-30", desc: "Pagamento Fornecedor — Total Energias", valor: -8500000, ref: "PGF-2026-0224" },
  { data: "2026-05-28", desc: "Recebimento Factura FT 2026/0187", valor: 4200000, ref: "RCB-2026-0178" },
  { data: "2026-05-25", desc: "Débito — Prestação Leasing Automóvel", valor: -380000, ref: "LNG-2026-0055" },
  { data: "2026-05-20", desc: "Juros Depósito à Ordem", valor: 48500, ref: "JRS-2026-0012" },
];

function BancoFormWindow({
  initialForm, isEdit, onSave, onClose,
}: {
  initialForm: Partial<ContaBancaria>; isEdit: boolean;
  onSave: (data: Partial<ContaBancaria>) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<ContaBancaria>>(initialForm);
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Identificação</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Código" value={form.codigo || ""} onChange={v => setForm(f => ({ ...f, codigo: v }))} />
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Tipo *</label>
              <select value={form.tipo || "conta_corrente"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoConta }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2"><Field label="Nome da Conta *" value={form.nome || ""} onChange={v => setForm(f => ({ ...f, nome: v }))} /></div>
          </div>
        </section>
        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Dados Bancários</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Banco" value={form.banco || ""} onChange={v => setForm(f => ({ ...f, banco: v }))} />
            <Field label="Agência" value={form.agencia || ""} onChange={v => setForm(f => ({ ...f, agencia: v }))} />
            <Field label="IBAN" value={form.iban || ""} onChange={v => setForm(f => ({ ...f, iban: v }))} />
            <Field label="BIC / SWIFT" value={form.bic || ""} onChange={v => setForm(f => ({ ...f, bic: v }))} />
            <Field label="Nº Conta" value={form.numeroConta || ""} onChange={v => setForm(f => ({ ...f, numeroConta: v }))} />
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Moeda</label>
              <select value={form.moeda || "Kz"} onChange={e => setForm(f => ({ ...f, moeda: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {["Kz","USD","EUR","GBP","ZAR","CNY"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </section>
        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Contabilidade & Saldo</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Conta PGCA *</label>
              <select value={form.contaPGCA || "43.1"} onChange={e => setForm(f => ({ ...f, contaPGCA: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {Object.entries(CONTA_PGCA_OPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Field label="Saldo Inicial" value={String(form.saldoActual ?? 0)} onChange={v => setForm(f => ({ ...f, saldoActual: Number(v) }))} type="number" />
            <Field label="Limite Descoberto" value={String(form.limiteDescoberto ?? 0)} onChange={v => setForm(f => ({ ...f, limiteDescoberto: Number(v) }))} type="number" />
            <Field label="Responsável" value={form.responsavel || ""} onChange={v => setForm(f => ({ ...f, responsavel: v }))} />
            <Field label="Data Abertura" value={form.dataAbertura || ""} onChange={v => setForm(f => ({ ...f, dataAbertura: v }))} type="date" />
          </div>
        </section>
        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Observações</h3>
          <textarea value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
            rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 focus:outline-none focus:border-brand-400 resize-none" />
        </section>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50">Cancelar</button>
        <button onClick={() => onSave(form)} className="px-5 py-2.5 text-sm font-semibold rounded-lg text-white" style={{ background: "#CC0000" }}>
          {isEdit ? "Guardar Alterações" : "Criar Conta"}
        </button>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function BancosPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [lista, setLista] = useState<ContaBancaria[]>(CONTAS_DEMO);
  const [selected, setSelected] = useState<ContaBancaria | null>(null);
  const [tab, setTab] = useState<"ficha" | "movimentos" | "reconciliacao">("ficha");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  const filtered = useMemo(() => {
    return lista.filter(c => filterTipo === "todos" || c.tipo === filterTipo);
  }, [lista, filterTipo]);

  const kpis = useMemo(() => {
    const aoa = lista.filter(c => c.moeda === "Kz" && c.estado === "activa");
    const usd = lista.filter(c => c.moeda === "USD" && c.estado === "activa");
    return {
      contasActivas: lista.filter(c => c.estado === "activa").length,
      saldoTotalAOA: aoa.reduce((s, c) => s + c.saldoActual, 0),
      saldoTotalUSD: usd.reduce((s, c) => s + c.saldoActual, 0),
      pendentesReconciliacao: lista.filter(c => !c.reconciliadoAte).length,
    };
  }, [lista]);

  function openCriar() {
    const winId = `criar-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Nova Conta Bancária / Caixa", icon: "🏦",
      content: (
        <BancoFormWindow
          initialForm={{ ...BLANK }}
          isEdit={false}
          onSave={(data) => {
            if (!data.nome || !data.contaPGCA) return;
            const id = `CB${String(lista.length + 1).padStart(3, "0")}`;
            setLista(l => [...l, {
              id, codigo: data.codigo || `BNK-${String(lista.length + 1).padStart(3, "0")}`,
              nome: data.nome!, tipo: data.tipo as TipoConta || "conta_corrente",
              banco: data.banco || "—", iban: data.iban, bic: data.bic,
              numeroConta: data.numeroConta, agencia: data.agencia, moeda: data.moeda || "Kz",
              saldoActual: data.saldoActual || 0, saldoContabilistico: data.saldoActual || 0,
              limiteDescoberto: data.limiteDescoberto, contaPGCA: data.contaPGCA!,
              responsavel: data.responsavel, dataAbertura: data.dataAbertura || new Date().toISOString().slice(0, 10),
              estado: data.estado as EstadoConta || "activa", observacoes: data.observacoes,
            }]);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 40, y: 20, width: 680, height: 480, minimized: false, maximized: false,
    });
  }
  function openEditar(c: ContaBancaria) {
    const winId = `editar-${c.id}`;
    openWindow({
      id: winId, title: `Editar Conta — ${c.nome}`, icon: "🏦",
      content: (
        <BancoFormWindow
          initialForm={{ ...c }}
          isEdit={true}
          onSave={(data) => {
            if (!data.nome || !data.contaPGCA) return;
            setLista(l => l.map(x => x.id === c.id ? { ...x, ...data } as ContaBancaria : x));
            if (selected?.id === c.id) setSelected({ ...selected, ...data } as ContaBancaria);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 60, y: 40, width: 680, height: 480, minimized: false, maximized: false,
    });
  }

  const difReconciliacao = selected
    ? selected.saldoActual - selected.saldoContabilistico : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Contas Bancárias & Caixas</h1>
          <p className="text-sm text-ink-500 mt-0.5">Gestão de meios de pagamento · PGCA 43/42/45/41/44</p>
        </div>
        <button onClick={openCriar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#CC0000" }}>
          <span className="text-lg leading-none">+</span> Nova Conta
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Contas Activas", value: kpis.contasActivas, sub: `de ${lista.length} total` },
          { label: "Saldo Total (Kz)", value: fmtMoeda(kpis.saldoTotalAOA, "Kz"), sub: "contas em Kwanza" },
          { label: "Saldo Total (USD)", value: fmtMoeda(kpis.saldoTotalUSD, "USD"), sub: "contas em Dólar" },
          { label: "Pend. Reconciliação", value: kpis.pendentesReconciliacao, sub: "contas não reconciliadas", alert: kpis.pendentesReconciliacao > 0 },
        ].map(k => (
          <div key={k.label} className={`bg-white rounded-xl border shadow-sm p-4 ${(k as any).alert ? "border-amber-200" : "border-ink-100"}`}>
            <p className="text-xs text-ink-500 font-medium">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${(k as any).alert ? "text-amber-600" : "text-ink-900"}`}>{k.value}</p>
            <p className="text-xs text-ink-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: "Todas", value: "todos" },
          ...Object.entries(TIPO_LABEL).map(([k, v]) => ({ label: v, value: k })),
        ].map(t => (
          <button key={t.value} onClick={() => setFilterTipo(t.value)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${filterTipo === t.value ? "text-white" : "bg-white border border-ink-200 text-ink-600 hover:bg-ink-50"}`}
            style={filterTipo === t.value ? { background: "#CC0000" } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex gap-4">
        {/* Cards Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(c => (
              <div key={c.id}
                onClick={() => { setSelected(c); setTab("ficha"); }}
                className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${selected?.id === c.id ? "border-brand-400 shadow-md ring-1 ring-brand-200" : "border-ink-100"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: TIPO_COLOR[c.tipo] + "20" }}>
                      {TIPO_ICON[c.tipo]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-ink-900 text-sm truncate max-w-40">{c.nome}</p>
                      <p className="text-xs text-ink-400 mt-0.5">{c.banco !== "—" ? c.banco.split(" — ")[0] : "Caixa Interna"}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                      style={{ background: TIPO_COLOR[c.tipo] }}>
                      {TIPO_LABEL[c.tipo]}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                      style={{ background: ESTADO_COLOR[c.estado] }}>
                      {c.estado.charAt(0).toUpperCase() + c.estado.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-ink-100">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-ink-400">Saldo Actual</p>
                      <p className={`text-xl font-bold mt-0.5 ${c.saldoActual < 0 ? "text-red-600" : "text-ink-900"}`}>
                        {fmtMoeda(c.saldoActual, c.moeda)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ink-400">Conta PGCA</p>
                      <p className="text-sm font-semibold text-ink-700 mt-0.5">{c.contaPGCA}</p>
                    </div>
                  </div>
                  {c.iban && (
                    <p className="text-xs text-ink-400 mt-2 font-mono">{c.iban}</p>
                  )}
                  {c.reconciliadoAte && (
                    <p className="text-xs text-ink-400 mt-1">Reconciliado até: {c.reconciliadoAte}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        {selected && (
          <div className="w-80 bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden shrink-0">
            <div className="p-4 border-b border-ink-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: TIPO_COLOR[selected.tipo] + "20" }}>
                  {TIPO_ICON[selected.tipo]}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-ink-900 text-sm leading-tight truncate">{selected.nome}</h2>
                  <p className="text-xs text-ink-400 mt-0.5">{selected.codigo}</p>
                </div>
              </div>
              <div className="flex gap-1 mt-3">
                {(["ficha","movimentos","reconciliacao"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${tab === t ? "text-white" : "text-ink-500 hover:bg-ink-100"}`}
                    style={tab === t ? { background: "#CC0000" } : {}}>
                    {t === "reconciliacao" ? "Reconcil." : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
              {tab === "ficha" && (
                <dl className="space-y-2 text-sm">
                  {[
                    ["Tipo", TIPO_LABEL[selected.tipo]],
                    ["Banco", selected.banco],
                    ["IBAN", selected.iban || "—"],
                    ["BIC / SWIFT", selected.bic || "—"],
                    ["Nº Conta", selected.numeroConta || "—"],
                    ["Agência", selected.agencia || "—"],
                    ["Moeda", selected.moeda],
                    ["Conta PGCA", CONTA_PGCA_OPS[selected.contaPGCA] || selected.contaPGCA],
                    ["Limite Descoberto", selected.limiteDescoberto ? fmtMoeda(selected.limiteDescoberto, selected.moeda) : "—"],
                    ["Responsável", selected.responsavel || "—"],
                    ["Data Abertura", selected.dataAbertura],
                    ["Estado", selected.estado.charAt(0).toUpperCase() + selected.estado.slice(1)],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between gap-2">
                      <dt className="text-ink-400 text-xs shrink-0">{l}</dt>
                      <dd className="text-ink-800 text-xs font-medium text-right">{v}</dd>
                    </div>
                  ))}
                  {selected.observacoes && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mt-2">
                      <p className="text-xs text-amber-700">{selected.observacoes}</p>
                    </div>
                  )}
                </dl>
              )}

              {tab === "movimentos" && (
                <div className="space-y-2">
                  <div className="flex justify-between mb-3">
                    <span className="text-xs text-ink-500">Saldo Actual</span>
                    <span className={`text-sm font-bold ${selected.saldoActual < 0 ? "text-red-600" : "text-ink-900"}`}>
                      {fmtMoeda(selected.saldoActual, selected.moeda)}
                    </span>
                  </div>
                  {MOVS_DEMO.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-ink-50 text-xs">
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-800 truncate">{m.desc}</p>
                        <p className="text-ink-400 mt-0.5">{m.data} · {m.ref}</p>
                      </div>
                      <span className={`font-bold shrink-0 ml-2 ${m.valor > 0 ? "text-green-600" : "text-red-600"}`}>
                        {m.valor > 0 ? "+" : ""}{fmtMoeda(m.valor, selected.moeda)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {tab === "reconciliacao" && (
                <div className="space-y-4">
                  <div className="bg-ink-50 rounded-lg p-3">
                    <p className="text-xs text-ink-500">Saldo Extracto Bancário</p>
                    <p className="text-lg font-bold text-ink-900 mt-0.5">{fmtMoeda(selected.saldoActual, selected.moeda)}</p>
                  </div>
                  <div className="bg-ink-50 rounded-lg p-3">
                    <p className="text-xs text-ink-500">Saldo Contabilístico (PGCA {selected.contaPGCA})</p>
                    <p className="text-lg font-bold text-ink-900 mt-0.5">{fmtMoeda(selected.saldoContabilistico, selected.moeda)}</p>
                  </div>
                  <div className={`rounded-lg p-3 border ${Math.abs(difReconciliacao) < 0.01 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
                    <p className="text-xs text-ink-500">Diferença de Reconciliação</p>
                    <p className={`text-lg font-bold mt-0.5 ${Math.abs(difReconciliacao) < 0.01 ? "text-green-600" : "text-red-600"}`}>
                      {fmtMoeda(difReconciliacao, selected.moeda)}
                    </p>
                    <p className="text-xs mt-1 text-ink-500">
                      {Math.abs(difReconciliacao) < 0.01 ? "✓ Conta reconciliada" : "⚠ Diferença pendente de regularização"}
                    </p>
                  </div>
                  {selected.reconciliadoAte && (
                    <p className="text-xs text-ink-400 text-center">Última reconciliação: {selected.reconciliadoAte}</p>
                  )}
                  <button className="w-full py-2.5 text-xs font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50">
                    Lançar Extracto Bancário
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-ink-100 flex gap-2">
              <button onClick={() => openEditar(selected)}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50">Editar</button>
              <button onClick={() => {
                const next = selected.estado === "activa" ? "inactiva" : "activa";
                setLista(l => l.map(x => x.id === selected.id ? { ...x, estado: next } : x));
                setSelected({ ...selected, estado: next });
              }} className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg text-white"
                style={{ background: selected.estado === "activa" ? "#6b7280" : "#10b981" }}>
                {selected.estado === "activa" ? "Fechar" : "Reabrir"}
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
