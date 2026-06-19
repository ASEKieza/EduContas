"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useCollection } from "@/lib/useCollection";
import Topbar from "@/components/Topbar";
import { useJournal } from "@/lib/journal";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { useWindowManager } from "@/lib/windowManager";

// ── Types ─────────────────────────────────────────────────────────────────────
type OEstado = "PAGO" | "PENDENTE" | "FUTURO" | "ATRASADO";

type ImpostoTipo = "IRT" | "IVA" | "IS" | "IPU" | "IPC" | "OUTRO";

interface Obrigacao {
  id: string;
  imposto: string;
  periodo: string;
  vencimento: string;
  valor: number | null; // null = calculado
  valorDisplay?: string; // for non-numeric (e.g. "—")
  estado: OEstado;
  referencia: string;
  pagamentoDiarioRef?: string;
  pagamentoEm?: string;
}

// ── Static obligations (non-IVA/IRT/SS — computed from journal) ───────────────
const OBRIGACOES_BASE_2024: Omit<Obrigacao, "id">[] = [
  { imposto:"IVA",                periodo:"Outubro 2024",    vencimento:"2024-11-20", valor:null,       estado:"PAGO",    referencia:"IVA-2024-10" },
  { imposto:"IRT",                periodo:"Outubro 2024",    vencimento:"2024-11-10", valor:null,       estado:"PAGO",    referencia:"IRT-2024-10" },
  { imposto:"Seg. Social",        periodo:"Outubro 2024",    vencimento:"2024-11-10", valor:null,       estado:"PAGO",    referencia:"SS-2024-10" },
  { imposto:"IVA",                periodo:"Novembro 2024",   vencimento:"2024-12-20", valor:null,       estado:"PENDENTE",referencia:"IVA-2024-11" },
  { imposto:"IRT",                periodo:"Novembro 2024",   vencimento:"2024-12-10", valor:null,       estado:"PENDENTE",referencia:"IRT-2024-11" },
  { imposto:"Seg. Social",        periodo:"Novembro 2024",   vencimento:"2024-12-10", valor:null,       estado:"PENDENTE",referencia:"SS-2024-11" },
  { imposto:"Imposto Industrial", periodo:"Exercício 2024",  vencimento:"2025-01-31", valor:23_600_000, estado:"FUTURO",  referencia:"II-2024" },
  { imposto:"1.ª Prestação II",   periodo:"Exercício 2025",  vencimento:"2025-06-30", valorDisplay:"—", valor:0, estado:"FUTURO",  referencia:"II-2025-P1" },
];

const OBRIGACOES_BASE_2025: Omit<Obrigacao, "id">[] = [
  { imposto:"IVA",                periodo:"Dezembro 2024",   vencimento:"2025-01-20", valor:null,       estado:"PAGO",    referencia:"IVA-2024-12" },
  { imposto:"IRT",                periodo:"Dezembro 2024",   vencimento:"2025-01-10", valor:null,       estado:"PAGO",    referencia:"IRT-2024-12" },
  { imposto:"Seg. Social",        periodo:"Dezembro 2024",   vencimento:"2025-01-10", valor:null,       estado:"PAGO",    referencia:"SS-2024-12" },
  { imposto:"Imposto Industrial", periodo:"Exercício 2024",  vencimento:"2025-01-31", valor:23_600_000, estado:"PENDENTE",referencia:"II-2024" },
  { imposto:"IVA",                periodo:"Janeiro 2025",    vencimento:"2025-02-20", valor:null,       estado:"PENDENTE",referencia:"IVA-2025-01" },
  { imposto:"IRT",                periodo:"Janeiro 2025",    vencimento:"2025-02-10", valor:null,       estado:"PENDENTE",referencia:"IRT-2025-01" },
  { imposto:"Seg. Social",        periodo:"Janeiro 2025",    vencimento:"2025-02-10", valor:null,       estado:"PENDENTE",referencia:"SS-2025-01" },
  { imposto:"1.ª Prestação II",   periodo:"Exercício 2025",  vencimento:"2025-06-30", valorDisplay:"—", valor:0, estado:"FUTURO",  referencia:"II-2025-P1" },
];

const BASES: Record<string, Omit<Obrigacao, "id">[]> = {
  "2024": OBRIGACOES_BASE_2024,
  "2025": OBRIGACOES_BASE_2025,
};

// ── RH Folha type (minimal) ───────────────────────────────────────────────────
interface FolhaRH {
  id: string;
  numero: string;
  periodo: string; // "YYYY-MM"
  estado: string;
  totalBruto: number;
  totalIrt: number;
  totalSsTrabalhador: number;
  totalSsPatronal: number;
  totalLiquido: number;
}

const estadoBadge: Record<string, string> = {
  "PAGO":     "badge-green",
  "PENDENTE": "badge-yellow",
  "FUTURO":   "badge-blue",
  "ATRASADO": "badge-red",
};

const fmt = (v: number) => v.toLocaleString("pt-AO");

// ── NovaObrigacaoModal ────────────────────────────────────────────────────────

interface NovaObrigacaoForm {
  tipo: ImpostoTipo | string;
  periodo: string;
  prazo: string;
  valorStr: string;
  estado: OEstado;
  referencia: string;
}

interface NovaObrigacaoModalProps {
  ano: string;
  onSave: (o: Obrigacao) => void;
  onClose: () => void;
}

function NovaObrigacaoModal({ ano, onSave, onClose }: NovaObrigacaoModalProps) {
  const [form, setForm] = useState<NovaObrigacaoForm>({
    tipo: "IVA",
    periodo: "",
    prazo: "",
    valorStr: "",
    estado: "PENDENTE",
    referencia: "",
  });

  function handleSave() {
    if (!form.tipo || !form.periodo.trim() || !form.prazo || !form.referencia.trim()) return;
    const valor = form.valorStr ? Number(form.valorStr) : null;
    const newId = crypto.randomUUID().slice(0, 8).toUpperCase();
    const o: Obrigacao = {
      id: `OB-${ano}-${newId}`,
      imposto: form.tipo,
      periodo: form.periodo.trim(),
      vencimento: form.prazo,
      valor,
      estado: form.estado,
      referencia: form.referencia.trim(),
    };
    onSave(o);
    onClose();
  }

  const valid = form.tipo && form.periodo.trim() && form.prazo && form.referencia.trim();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Imposto *</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
            >
              {(["IRT","IVA","IS","IPU","IPC","OUTRO"] as ImpostoTipo[]).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Estado *</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              value={form.estado}
              onChange={e => setForm(f => ({ ...f, estado: e.target.value as OEstado }))}
            >
              <option value="PENDENTE">PENDENTE</option>
              <option value="PAGO">PAGO</option>
              <option value="ATRASADO">ATRASADO</option>
              <option value="FUTURO">FUTURO</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Período *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={form.periodo}
            onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
            placeholder="ex: Janeiro 2025"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Prazo (vencimento) *</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={form.prazo}
            onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Valor (Kz, opcional)</label>
          <input
            type="number"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={form.valorStr}
            onChange={e => setForm(f => ({ ...f, valorStr: e.target.value }))}
            placeholder="0 ou vazio para calculado"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Referência *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={form.referencia}
            onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
            placeholder="ex: IVA-2025-01"
          />
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={handleSave} disabled={!valid}>Criar Obrigação</button>
      </div>
    </div>
  );
}

// ── EditarObrigacaoModal ──────────────────────────────────────────────────────

interface EditarObrigacaoForm {
  estado: OEstado;
  valorStr: string;
  dataPagamento: string;
  referencia: string;
}

interface EditarObrigacaoModalProps {
  obrigacao: Obrigacao;
  onSave: (o: Obrigacao) => void;
  onClose: () => void;
}

function EditarObrigacaoModal({ obrigacao, onSave, onClose }: EditarObrigacaoModalProps) {
  const [form, setForm] = useState<EditarObrigacaoForm>({
    estado: obrigacao.estado,
    valorStr: obrigacao.valor !== null ? String(obrigacao.valor) : "",
    dataPagamento: obrigacao.pagamentoEm ? obrigacao.pagamentoEm.slice(0, 10) : "",
    referencia: obrigacao.referencia,
  });

  function handleSave() {
    const valorResolvido = form.valorStr && !isNaN(Number(form.valorStr))
      ? Number(form.valorStr)
      : obrigacao.valor;
    onSave({
      ...obrigacao,
      estado: form.estado,
      valor: valorResolvido,
      pagamentoEm: form.dataPagamento ? new Date(form.dataPagamento).toISOString() : obrigacao.pagamentoEm,
      referencia: form.referencia.trim() || obrigacao.referencia,
    });
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p><strong>{obrigacao.imposto}</strong> — {obrigacao.periodo}</p>
          <p className="text-gray-400 mt-0.5">Vencimento: {new Date(obrigacao.vencimento + "T00:00:00").toLocaleDateString("pt-AO")}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Estado *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={form.estado}
            onChange={e => setForm(f => ({ ...f, estado: e.target.value as OEstado }))}
          >
            <option value="PENDENTE">PENDENTE</option>
            <option value="PAGO">PAGO</option>
            <option value="ATRASADO">ATRASADO</option>
            <option value="FUTURO">FUTURO</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Valor Pago (Kz)</label>
          <input
            type="number"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={form.valorStr}
            onChange={e => setForm(f => ({ ...f, valorStr: e.target.value }))}
            placeholder="Deixar em branco para manter calculado"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Data de Pagamento</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={form.dataPagamento}
            onChange={e => setForm(f => ({ ...f, dataPagamento: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Referência</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={form.referencia}
            onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
          />
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={handleSave}>Guardar</button>
      </div>
    </div>
  );
}

// ── ConfirmDeleteObrigacao ────────────────────────────────────────────────────

interface ConfirmDeleteObrigacaoProps {
  obrigacao: Obrigacao;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmDeleteObrigacao({ obrigacao, onConfirm, onClose }: ConfirmDeleteObrigacaoProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-sm text-gray-700">
          Tem a certeza que pretende eliminar a obrigação <strong>{obrigacao.referencia}</strong>?
        </p>
        <p className="text-xs text-gray-500 italic">{obrigacao.imposto} — {obrigacao.periodo}</p>
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FiscalidadePage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [ano, setAno] = useState("2024");
  const { entries } = useJournal(ano);

  // ── RH payrolls (read-only from RH module key) ────────────────────────────
  const { items: folhasRH } = useCollection<FolhaRH>(`educontas-folhas-${ano}`);

  // ── Obligations state ────────────────────────────────────────────────────
  const obrigacoesSeed = (BASES[ano] ?? OBRIGACOES_BASE_2024).map((o, i) => ({ ...o, id: `OB-${ano}-${i}` }));
  const { items: obrigacoes, setItems: persist } = useCollection<Obrigacao>(`educontas-fiscalidade-${ano}`, obrigacoesSeed);

  const addObrigacao    = useCallback((o: Obrigacao) => persist(prev => [...prev, o]),                                [persist]);
  const updateObrigacao = useCallback((o: Obrigacao) => persist(prev => prev.map(x => x.id === o.id ? o : x)),       [persist]);
  const deleteObrigacao = useCallback((id: string)   => persist(prev => prev.filter(x => x.id !== id)),              [persist]);

  // ── Compute IVA from journal entries ──────────────────────────────────────
  const ivaData = useMemo(() => {
    const lançados = entries.filter(e => e.estado === "LANÇADO");
    let liquidado = 0; // credits on 34.5.3.1
    let dedutivel = 0; // debits on 34.5.1.1 (and 34.5.1.2, 34.5.1.3)

    lançados.forEach(e => {
      e.linhas.forEach(l => {
        if (l.contaCod.startsWith("34.5.3")) liquidado += l.credito;
        if (l.contaCod.startsWith("34.5.1")) dedutivel += l.debito;
      });
    });

    const saldo = Math.max(0, liquidado - dedutivel);
    return { liquidado, dedutivel, saldo };
  }, [entries]);

  // ── Compute IRT and SS from RH payrolls ──────────────────────────────────
  const rhData = useMemo(() => {
    const processados = folhasRH.filter(f => f.estado === "PROCESSADO" || f.estado === "PAGO" || f.estado === "PAGA");
    return {
      totalIrt:          processados.reduce((s, f) => s + f.totalIrt,          0),
      totalSsTrabalhador: processados.reduce((s, f) => s + f.totalSsTrabalhador, 0),
      totalSsPatronal:   processados.reduce((s, f) => s + f.totalSsPatronal,   0),
    };
  }, [folhasRH]);

  // ── Resolve obligation values dynamically ──────────────────────────────────
  const obrigacoesWithValues = useMemo((): (Obrigacao & { valorResolvido: number | null })[] => {
    return obrigacoes.map(o => {
      let valorResolvido: number | null = o.valor;

      if (o.valor === null) {
        if (o.imposto === "IVA")          valorResolvido = ivaData.saldo;
        else if (o.imposto === "IRT")     valorResolvido = rhData.totalIrt;
        else if (o.imposto === "Seg. Social") valorResolvido = rhData.totalSsTrabalhador + rhData.totalSsPatronal;
      }
      return { ...o, valorResolvido };
    });
  }, [obrigacoes, ivaData, rhData]);

  // ── Payment action ──────────────────────────────────────────────────────
  function markPago(id: string) {
    persist(obrigacoes.map(o => o.id === id ? {
      ...o,
      estado: "PAGO" as const,
      pagamentoEm: new Date().toISOString(),
    } : o));
  }

  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const filtradas = filtroEstado === "Todos"
    ? obrigacoesWithValues
    : obrigacoesWithValues.filter(o => o.estado === filtroEstado);

  const totalPendente = obrigacoesWithValues
    .filter(o => o.estado === "PENDENTE")
    .reduce((s, o) => s + (o.valorResolvido ?? 0), 0);

  // ── IVA apuramento month label ──────────────────────────────────────────
  const ivaMonthLabel = ano === "2024" ? "Novembro 2024" : "Janeiro " + ano;

  // ── Window openers ─────────────────────────────────────────────────────

  function handleOpenNovaObrigacao() {
    const winId = "nova-obrigacao-fiscal";
    openWindow({
      id: winId,
      title: "Nova Obrigação Fiscal",
      icon: "🧾",
      content: (
        <NovaObrigacaoModal
          ano={ano}
          onSave={addObrigacao}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 200, y: 120, width: 520, height: 480,
      minimized: false, maximized: false,
    });
  }

  function handleOpenEditar(o: Obrigacao) {
    const winId = `editar-obrigacao-${o.id}`;
    openWindow({
      id: winId,
      title: `Editar ${o.referencia}`,
      icon: "✏️",
      content: (
        <EditarObrigacaoModal
          obrigacao={o}
          onSave={updateObrigacao}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 220, y: 140, width: 480, height: 440,
      minimized: false, maximized: false,
    });
  }

  function handleOpenDelete(o: Obrigacao) {
    const winId = `delete-obrigacao-${o.id}`;
    openWindow({
      id: winId,
      title: `Eliminar ${o.referencia}`,
      icon: "🗑️",
      content: (
        <ConfirmDeleteObrigacao
          obrigacao={o}
          onConfirm={() => deleteObrigacao(o.id)}
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
        title="Fiscalidade Angolana"
        subtitle="IVA · IRT · Segurança Social · Imposto Industrial · AGT"
        actions={
          <div className="flex items-center gap-2">
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setAno(y)}
                className={y === ano ? "btn-primary text-xs py-1.5 px-3" : "btn-secondary text-xs py-1.5 px-3"}>
                {y}
              </button>
            ))}
            <button className="btn-primary text-xs py-1.5 px-3" onClick={handleOpenNovaObrigacao}>
              + Nova Obrigação
            </button>
            <button className="btn-secondary">Declarações AGT</button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* ── IVA Apuramento (live from journal) ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-ink-500 uppercase tracking-wide">
              Apuramento IVA — {ivaMonthLabel}
            </p>
            <span className="text-[10px] text-ink-400 bg-ink-100 px-2 py-0.5 rounded-full font-mono">
              {entries.filter(e => e.estado === "LANÇADO").length} lançamentos · {ano}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
              <p className="text-xs text-green-600 font-semibold">IVA Liquidado (34.5.3)</p>
              <p className="font-mono font-bold text-green-900 text-lg mt-1">{fmt(ivaData.liquidado)}</p>
              <p className="text-xs text-green-500 mt-0.5">AOA — vendas/serviços</p>
            </div>
            <div className="p-3 bg-aqua-50 rounded-xl border border-aqua-100">
              <p className="text-xs text-aqua-600 font-semibold">IVA Dedutível (34.5.1)</p>
              <p className="font-mono font-bold text-aqua-900 text-lg mt-1">({fmt(ivaData.dedutivel)})</p>
              <p className="text-xs text-aqua-500 mt-0.5">AOA — compras</p>
            </div>
            <div className="p-3 bg-brand-50 rounded-xl border border-brand-100">
              <p className="text-xs text-brand-600 font-semibold">IVA a Pagar (34.5.4)</p>
              <p className="font-mono font-bold text-brand-900 text-lg mt-1">{fmt(ivaData.saldo)}</p>
              <p className="text-xs text-brand-500 mt-0.5">AOA — a entregar AGT</p>
            </div>
            <div className="flex flex-col justify-center items-start gap-2">
              <span className={`badge ${ivaData.saldo > 0 ? "badge-yellow" : "badge-green"}`}>
                {ivaData.saldo > 0 ? "A ENTREGAR" : "SEM SALDO"}
              </span>
              {ivaData.saldo > 0 && (
                <p className="text-xs text-ink-500">Taxa: 14% — CIVA</p>
              )}
            </div>
          </div>
        </div>

        {/* ── RH — IRT e SS (live from folhas) ── */}
        <div className="card p-5">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-4">
            Remunerações e Encargos — {ano} ({folhasRH.filter(f => f.estado === "PROCESSADO" || f.estado === "PAGO" || f.estado === "PAGA").length} folhas processadas)
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100">
              <p className="text-xs text-ink-500 font-semibold">IRT Retido (34.3.1)</p>
              <p className="font-mono font-bold text-ink-900 text-lg mt-1">{fmt(rhData.totalIrt)}</p>
              <p className="text-xs text-ink-400 mt-0.5">AOA · Entregue à AGT</p>
            </div>
            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100">
              <p className="text-xs text-ink-500 font-semibold">SS Trabalhador (3%)</p>
              <p className="font-mono font-bold text-ink-900 text-lg mt-1">{fmt(rhData.totalSsTrabalhador)}</p>
              <p className="text-xs text-ink-400 mt-0.5">AOA · Lei n.º 7/04</p>
            </div>
            <div className="p-3 bg-ink-50 rounded-xl border border-ink-100">
              <p className="text-xs text-ink-500 font-semibold">SS Patronal (8%)</p>
              <p className="font-mono font-bold text-ink-900 text-lg mt-1">{fmt(rhData.totalSsPatronal)}</p>
              <p className="text-xs text-ink-400 mt-0.5">AOA · Encargo empresa</p>
            </div>
          </div>
        </div>

        {/* ── Taxas de referência ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label:"IVA Taxa Geral",    value:"14%",  desc:"Art.º 22.º CIVA (Lei n.º 7/19)" },
            { label:"IVA Taxa Reduzida", value:"7%",   desc:"Bens essenciais" },
            { label:"Imposto Industrial",value:"25%",  desc:"Regime Geral (Lei n.º 19/14)" },
            { label:"SS Patronal",       value:"8%",   desc:"Sobre remuneração bruta" },
          ].map(t => (
            <div key={t.label} className="card p-4 text-center">
              <p className="text-xs text-ink-500 uppercase tracking-wide">{t.label}</p>
              <p className="text-2xl font-bold text-brand-700 mt-1">{t.value}</p>
              <p className="text-xs text-ink-400 mt-0.5">{t.desc}</p>
            </div>
          ))}
        </div>

        {/* ── KPI pending ── */}
        {totalPendente > 0 && (
          <div className="p-4 rounded-xl border border-gold-200 bg-gold-50 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gold-800">Obrigações Pendentes</p>
              <p className="text-xs text-gold-600 mt-0.5">Total a pagar: <strong>{fmt(totalPendente)} AOA</strong></p>
            </div>
          </div>
        )}

        {/* ── Calendário fiscal ── */}
        <div className="card">
          <div className="card-header flex flex-wrap items-center gap-3">
            <h3 className="flex-1">Obrigações Fiscais — {ano}</h3>
            <div className="flex gap-2 flex-wrap">
              {["Todos","PENDENTE","PAGO","FUTURO"].map(e => (
                <button key={e} onClick={() => setFiltroEstado(e)}
                  className={filtroEstado === e ? "btn-primary py-1 px-3 text-xs" : "btn-secondary py-1 px-3 text-xs"}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th>Imposto</th>
                  <th>Período</th>
                  <th>Vencimento</th>
                  <th className="text-right">Valor (Kz)</th>
                  <th>Estado</th>
                  <th>Referência</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((o) => {
                  const valorNum = o.valorResolvido;
                  const valorStr = o.valorDisplay ??
                    (valorNum !== null && valorNum > 0 ? fmt(valorNum) : "—");
                  const isOverdue = o.estado === "PENDENTE" && new Date(o.vencimento) < new Date();
                  const finalEstado: OEstado = isOverdue && o.estado === "PENDENTE" ? "ATRASADO" : o.estado;

                  return (
                    <tr key={o.id} className={isOverdue ? "bg-brand-50/30" : ""}>
                      <td className="font-semibold text-sm">{o.imposto}</td>
                      <td className="text-xs text-ink-500">{o.periodo}</td>
                      <td className={`text-xs font-medium whitespace-nowrap ${isOverdue ? "text-brand-600" : "text-ink-500"}`}>
                        {new Date(o.vencimento + "T00:00:00").toLocaleDateString("pt-AO")}
                      </td>
                      <td className="text-right font-mono text-sm">{valorStr}</td>
                      <td>
                        <span className={`badge ${estadoBadge[finalEstado] ?? "badge-gray"} text-[10px]`}>
                          {finalEstado}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-ink-400">{o.referencia}</td>
                      <td>
                        <div className="flex gap-1 items-center">
                          {(o.estado === "PENDENTE" || finalEstado === "ATRASADO") && (
                            <button onClick={() => markPago(o.id)} className="btn-primary py-1 px-2 text-xs">
                              Pagar
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditar(o)}
                            className="btn-ghost py-1 px-1.5 text-xs"
                            title="Editar"
                          >✏️</button>
                          <button
                            onClick={() => handleOpenDelete(o)}
                            className="btn-ghost py-1 px-1.5 text-xs text-brand-400"
                            title="Eliminar"
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {filtradas.length === 0 && (
                <tbody>
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-ink-400 text-sm">Nenhuma obrigação com o filtro seleccionado.</td>
                  </tr>
                </tbody>
              )}
            </table>
          </div>
        </div>

        {/* ── Referências legais ── */}
        <div className="card p-4 bg-blue-50 border-blue-200">
          <p className="text-sm font-semibold text-blue-800">Referências Legais</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs text-blue-700">
            <p>· PGCA — Decreto n.º 82/01 de 7 de Dezembro de 2001</p>
            <p>· IVA — Código do IVA (Lei n.º 7/19 de 24 de Abril)</p>
            <p>· IRT — Lei n.º 26/20 (Tabela 2024)</p>
            <p>· Segurança Social — Lei n.º 7/04 de 15 de Outubro</p>
            <p>· Imposto Industrial — Lei n.º 19/14 de 22 de Outubro</p>
            <p>· Declarações via AGT — Portal e-Angola (eFiscal)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
