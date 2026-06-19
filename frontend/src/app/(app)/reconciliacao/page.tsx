"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useCollection } from "@/lib/useCollection";
import Topbar from "@/components/Topbar";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { useWindowManager } from "@/lib/windowManager";

// ── Types ─────────────────────────────────────────────────────────────────────
type MatchState = "matched" | "unmatched" | "partial";

interface BankTx {
  id: string;
  data: string;
  desc: string;
  valor: number;
  tipo: "C" | "D"; // C = crédito (entrada), D = débito (saída)
  estado: MatchState;
  match?: string;   // numero do movimento tesouraria
}

// ── Minimal Tesouraria movement type ─────────────────────────────────────────
interface MovTesouraria {
  id: string;
  numero: string;
  data: string;
  descricao: string;
  tipo: string;
  sentido: "ENTRADA" | "SAÍDA";
  contaCod: string;
  contaNome: string;
  valor: number;
  estado: string;
}

// ── Seed bank statements (BFA Nov 2024) ──────────────────────────────────────
const SEED_BANK_2024: BankTx[] = [
  { id:"B01", data:"2024-11-30", desc:"Transferência PETRANGOL SA",             valor:11_400_000, tipo:"C", estado:"matched",   match:"RE/2024/000341" },
  { id:"B02", data:"2024-11-29", desc:"Débito pagamento ABC COMERCIAL LDA",     valor: 5_700_000, tipo:"D", estado:"matched",   match:"PG/2024/000340" },
  { id:"B03", data:"2024-11-27", desc:"Crédito BAI BANCO — Empréstimo EMP-0044",valor:50_000_000, tipo:"C", estado:"matched",   match:"TR/2024/000335" },
  { id:"B04", data:"2024-11-27", desc:"Transferência BFA — Recebimento cliente", valor: 7_125_000, tipo:"C", estado:"matched",   match:"RE/2024/000332" },
  { id:"B05", data:"2024-11-22", desc:"AGT IMPOSTO IRT NOV 2024",               valor: 3_200_000, tipo:"D", estado:"unmatched" },
  { id:"B06", data:"2024-11-20", desc:"PAGAMENTO SALÁRIOS NOV 2024",            valor:42_000_000, tipo:"D", estado:"matched",   match:"PG/2024/000325" },
  { id:"B07", data:"2024-11-15", desc:"ANGOLA CABLES SA — Recebimento",         valor: 5_700_000, tipo:"C", estado:"matched",   match:"RE/2024/000318" },
  { id:"B08", data:"2024-11-10", desc:"SEGURANÇA SOCIAL OUT 2024",              valor: 8_800_000, tipo:"D", estado:"partial",   match:"PG/2024/000310" },
  { id:"B09", data:"2024-11-05", desc:"COMISSÃO MANUTENÇÃO CONTA BFA",          valor:     45_000, tipo:"D", estado:"unmatched" },
  { id:"B10", data:"2024-11-02", desc:"UNITEL SA — Recebimento FT/2024/001197", valor: 8_550_000, tipo:"C", estado:"unmatched" },
];

const SEED_BANK_2025: BankTx[] = [
  { id:"B2501", data:"2025-01-31", desc:"Recebimento BFA — FT/2025/000012",       valor: 5_700_000, tipo:"C", estado:"matched",   match:"RE/2025/000005" },
  { id:"B2502", data:"2025-01-30", desc:"Pagamento Imposto Industrial 2024",       valor:23_600_000, tipo:"D", estado:"unmatched" },
  { id:"B2503", data:"2025-01-25", desc:"Recebimento LUANDA TECH — FT/2025/0009", valor: 8_550_000, tipo:"C", estado:"matched",   match:"RE/2025/000003" },
  { id:"B2504", data:"2025-01-20", desc:"AGT PAGAMENTO IVA DEZ 2024",              valor:12_400_000, tipo:"D", estado:"unmatched" },
  { id:"B2505", data:"2025-01-15", desc:"PAGAMENTO SALÁRIOS JAN 2025",             valor:42_000_000, tipo:"D", estado:"matched",   match:"PG/2025/000010" },
];

const SEEDS: Record<string, BankTx[]> = { "2024": SEED_BANK_2024, "2025": SEED_BANK_2025 };

const fmt = (v: number) => v.toLocaleString("pt-AO");

// ── Saldo de abertura BFA (alinhar com tesouraria) ────────────────────────────
const SALDO_ABERTURA_BFA: Record<string, number> = { "2024": 202_475_000, "2025": 167_000_000 };

export default function ReconciliacaoPage() {
  const [ano, setAno]       = useState("2024");
  const seed = SEEDS[ano] ?? [];
  const { items: bankTxs, setItems: persist } = useCollection<BankTx>(`educontas-reconciliacao-${ano}`, seed);
  // Read-only view into tesouraria (written by the Tesouraria module)
  const { items: tesMovs } = useCollection<MovTesouraria>(`educontas-tesouraria-${ano}`);
  const { openWindow, closeWindow } = useWindowManager();
  const [filter, setFilter] = useState<"todos" | MatchState>("todos");
  const [selected, setSelected] = useState<string[]>([]);

  // ── Computed ─────────────────────────────────────────────────────────
  const matched   = bankTxs.filter(t => t.estado === "matched").length;
  const unmatched = bankTxs.filter(t => t.estado === "unmatched").length;
  const partial   = bankTxs.filter(t => t.estado === "partial").length;

  const filtered = filter === "todos" ? bankTxs : bankTxs.filter(t => t.estado === filter);

  const totalEntradas = bankTxs.filter(t => t.tipo === "C").reduce((s, t) => s + t.valor, 0);
  const totalSaidas   = bankTxs.filter(t => t.tipo === "D").reduce((s, t) => s + t.valor, 0);
  const saldoBanco    = (SALDO_ABERTURA_BFA[ano] ?? 0) + totalEntradas - totalSaidas;

  // Razão balance: opening + ENTRADA - SAÍDA from tesouraria BFA movements
  const saldoRazao = useMemo(() => {
    const bfaMovs = tesMovs.filter(m => m.contaCod === "43.1" && m.estado !== "ANULADO");
    const entradas = bfaMovs.filter(m => m.sentido === "ENTRADA").reduce((s, m) => s + m.valor, 0);
    const saidas   = bfaMovs.filter(m => m.sentido === "SAÍDA").reduce((s, m) => s + m.valor, 0);
    return (SALDO_ABERTURA_BFA[ano] ?? 0) + entradas - saidas;
  }, [tesMovs, ano]);

  const diferenca = Math.abs(saldoBanco - saldoRazao);
  const reconciliado = diferenca < 1;

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const updateReconciliacao = useCallback((id: string, patch: Partial<BankTx>) => {
    const next = bankTxs.map(t => t.id === id ? { ...t, ...patch } : t);
    persist(next);
  }, [bankTxs, persist]);

  const deleteReconciliacao = useCallback((id: string) => {
    const next = bankTxs.filter(t => t.id !== id);
    persist(next);
    setSelected(prev => prev.filter(x => x !== id));
  }, [bankTxs, persist]);

  function handleOpenEditar(tx: BankTx) {
    const winId = `editar-recon-${tx.id}`;
    openWindow({
      id: winId,
      title: `Editar Transacção — ${tx.id}`,
      icon: "✏️",
      content: <EditarReconciliacaoModal
        tx={tx}
        onClose={() => closeWindow(winId)}
        onSave={(patch) => {
          updateReconciliacao(tx.id, patch);
          closeWindow(winId);
        }}
      />,
      x: 50, y: 30, width: 580, height: 380, minimized: false, maximized: false,
    });
  }

  function handleOpenDelete(tx: BankTx) {
    const winId = `delete-recon-${tx.id}`;
    openWindow({
      id: winId,
      title: "Confirmar eliminação",
      icon: "🗑️",
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 p-6">
            <p className="text-gray-700">Tem a certeza que pretende eliminar a transacção <strong>{tx.id}</strong>?</p>
            <p className="text-sm text-gray-500 mt-1 truncate">{tx.desc}</p>
            <p className="text-sm text-gray-500 mt-2">Esta acção não pode ser desfeita.</p>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
            <button onClick={() => closeWindow(winId)} className="btn-secondary">Cancelar</button>
            <button onClick={() => { deleteReconciliacao(tx.id); closeWindow(winId); }} className="btn-primary bg-red-600 hover:bg-red-700">Eliminar</button>
          </div>
        </div>
      ),
      x: 80, y: 80, width: 480, height: 240, minimized: false, maximized: false,
    });
  }

  // ── Auto-reconcile: match unmatched bank txs to tesouraria by valor+sentido ──
  function autoReconcile() {
    const updated = bankTxs.map(tx => {
      if (tx.estado !== "unmatched") return tx;

      const sentidoBuscado = tx.tipo === "C" ? "ENTRADA" : "SAÍDA";
      const match = tesMovs.find(m =>
        m.estado !== "ANULADO" &&
        m.sentido === sentidoBuscado &&
        m.valor === tx.valor &&
        !bankTxs.some(bt => bt.match === m.numero && bt.id !== tx.id)
      );

      if (match) return { ...tx, estado: "matched" as const, match: match.numero };
      return tx;
    });
    persist(updated);
  }

  // ── Manual association ────────────────────────────────────────────────
  function associar(bankId: string, movNumero: string, winId: string) {
    persist(bankTxs.map(t => t.id === bankId ? { ...t, estado: "matched" as const, match: movNumero } : t));
    closeWindow(winId);
  }

  function openAssoc(bankTx: BankTx) {
    const winId = `assoc-${bankTx.id}-${crypto.randomUUID()}`;
    const sentido = bankTx.tipo === "C" ? "ENTRADA" : "SAÍDA";
    const candidatos = tesMovs.filter(m =>
      m.estado !== "ANULADO" && m.sentido === sentido
    );
    openWindow({
      id: winId,
      title: "Associar Transacção Bancária",
      icon: "🔗",
      content: <AssocModal
        bankTx={bankTx}
        initialCandidatos={candidatos}
        tesMovs={tesMovs}
        onAssociar={(movNumero) => associar(bankTx.id, movNumero, winId)}
        onClose={() => closeWindow(winId)}
      />,
      x: 40, y: 20, width: 680, height: 480, minimized: false, maximized: false,
    });
  }

  // ── Reconcile selected (mark as matched without tesouraria link) ──────
  function reconcileSelected() {
    persist(bankTxs.map(t => selected.includes(t.id) ? { ...t, estado: "matched" as const } : t));
    setSelected([]);
  }

  return (
    <div>
      <Topbar
        title="Reconciliação Bancária"
        subtitle="BFA · BAI · BIC · BPC — Importação CSV / OFX / MT940"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setAno(y)}
                className={y === ano ? "btn-primary text-xs py-1.5 px-3" : "btn-secondary text-xs py-1.5 px-3"}>
                {y}
              </button>
            ))}
            <button className="btn-secondary text-xs">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importar Extracto
            </button>
            <button onClick={autoReconcile} className="btn-primary text-xs">
              Reconciliar Automaticamente
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 border-l-4 border-green-400">
            <p className="text-[11px] text-ink-400 uppercase tracking-wide font-semibold">Conciliadas</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{matched}</p>
            <p className="text-xs text-ink-400 mt-0.5">de {bankTxs.length} transacções</p>
          </div>
          <div className="card p-4 border-l-4 border-brand-500">
            <p className="text-[11px] text-ink-400 uppercase tracking-wide font-semibold">Por reconciliar</p>
            <p className="text-3xl font-bold text-brand-600 mt-1">{unmatched}</p>
            <p className="text-xs text-ink-400 mt-0.5">requerem acção</p>
          </div>
          <div className="card p-4 border-l-4 border-gold-400">
            <p className="text-[11px] text-ink-400 uppercase tracking-wide font-semibold">Parciais</p>
            <p className="text-3xl font-bold text-gold-600 mt-1">{partial}</p>
            <p className="text-xs text-ink-400 mt-0.5">diferença de valor</p>
          </div>
          <div className={`card p-4 border-l-4 ${reconciliado ? "border-green-400" : "border-brand-500"}`}>
            <p className="text-[11px] text-ink-400 uppercase tracking-wide font-semibold">Diferença</p>
            <p className={`text-xl font-bold mt-1 ${reconciliado ? "text-green-600" : "text-brand-600"}`}>
              {fmt(diferenca)} AOA
            </p>
            <p className="text-xs text-ink-400 mt-0.5">banco vs. razão</p>
          </div>
        </div>

        {/* ── Comparação de saldos ── */}
        <div className="card p-5">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-4">
            Comparação de Saldos — BFA — {ano}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div className="text-center p-4 bg-aqua-50 rounded-xl border border-aqua-200">
              <p className="text-xs text-aqua-600 font-semibold uppercase tracking-wide">Saldo no Banco (BFA)</p>
              <p className="text-2xl font-bold text-aqua-800 mt-1 font-mono">{fmt(saldoBanco)}</p>
              <p className="text-xs text-aqua-500 mt-0.5">Extracto importado</p>
            </div>
            <div className="text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                reconciliado ? "bg-green-100 text-green-700" : "bg-brand-100 text-brand-700"
              }`}>
                {reconciliado ? "✓ RECONCILIADO" : "≠ DIFERENÇA"}
              </div>
              {!reconciliado && (
                <p className="text-xs text-ink-400 mt-2 font-mono">Δ {fmt(diferenca)} AOA</p>
              )}
            </div>
            <div className="text-center p-4 bg-brand-50 rounded-xl border border-brand-200">
              <p className="text-xs text-brand-600 font-semibold uppercase tracking-wide">Saldo no Razão (43.1)</p>
              <p className="text-2xl font-bold text-brand-800 mt-1 font-mono">{fmt(saldoRazao)}</p>
              <p className="text-xs text-brand-500 mt-0.5">
                {tesMovs.filter(m => m.contaCod === "43.1").length > 0
                  ? `${tesMovs.filter(m => m.contaCod === "43.1" && m.estado !== "ANULADO").length} movimentos reais`
                  : "Contabilidade interna"
                }
              </p>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {([
            { key:"todos",     label:`Todas (${bankTxs.length})` },
            { key:"matched",   label:`Conciliadas (${matched})` },
            { key:"unmatched", label:`Por reconciliar (${unmatched})` },
            { key:"partial",   label:`Parciais (${partial})` },
          ] as { key:"todos" | MatchState; label:string }[]).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={filter === f.key ? "btn-primary py-1.5 px-4 text-xs" : "btn-secondary py-1.5 px-4 text-xs"}>
              {f.label}
            </button>
          ))}
          {selected.length > 0 && (
            <button onClick={reconcileSelected} className="btn-aqua py-1.5 px-4 text-xs ml-auto">
              Reconciliar {selected.length} seleccionadas
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>Transacções Banco BFA — {ano}</h3>
            <span className="badge-aqua text-[11px]">{filtered.length} transacções</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th>Data</th>
                  <th>Descrição (Banco)</th>
                  <th>T</th>
                  <th className="text-right">Valor (Kz)</th>
                  <th>Estado</th>
                  <th>Correspondência (Tesouraria)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id}
                    className={tx.estado === "unmatched" ? "bg-brand-50/40" : tx.estado === "partial" ? "bg-gold-50/40" : ""}>
                    <td>
                      {tx.estado !== "matched" && (
                        <input type="checkbox" checked={selected.includes(tx.id)}
                          onChange={() => toggleSelect(tx.id)} className="rounded" />
                      )}
                    </td>
                    <td className="text-xs text-ink-500 whitespace-nowrap font-mono">
                      {new Date(tx.data + "T00:00:00").toLocaleDateString("pt-AO")}
                    </td>
                    <td className="text-sm max-w-xs truncate">{tx.desc}</td>
                    <td>
                      <span className={`badge text-[10px] font-bold ${tx.tipo === "C" ? "badge-green" : "badge-red"}`}>
                        {tx.tipo === "C" ? "ENT" : "SAÍ"}
                      </span>
                    </td>
                    <td className={`text-right font-mono text-sm font-semibold ${tx.tipo === "C" ? "text-green-700" : "text-brand-700"}`}>
                      {tx.tipo === "D" ? "- " : ""}{fmt(tx.valor)}
                    </td>
                    <td>
                      <span className={`badge text-[10px] ${
                        tx.estado === "matched"   ? "badge-green" :
                        tx.estado === "partial"   ? "badge-yellow" : "badge-red"
                      }`}>
                        {tx.estado === "matched" ? "✓ OK" : tx.estado === "partial" ? "PARCIAL" : "POR RECONCILIAR"}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-aqua-700">
                      {tx.match
                        ? <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                            {tx.match}
                          </span>
                        : <span className="text-ink-300">—</span>
                      }
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {tx.estado !== "matched" && (
                          <button onClick={() => openAssoc(tx)}
                            className="btn-ghost py-1 px-2 text-xs">
                            Associar
                          </button>
                        )}
                        <button onClick={() => handleOpenEditar(tx)} className="btn-ghost p-1 text-xs" title="Editar transacção">✏️</button>
                        <button onClick={() => handleOpenDelete(tx)} className="btn-ghost p-1 text-xs" title="Eliminar transacção">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Tesouraria movements list ── */}
        {tesMovs.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3>Movimentos BFA em Tesouraria — {ano}</h3>
              <span className="text-xs text-ink-400">{tesMovs.filter(m => m.contaCod === "43.1").length} movimentos conta 43.1</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Sentido</th>
                    <th className="text-right">Valor (Kz)</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tesMovs.filter(m => m.contaCod === "43.1" && m.estado !== "ANULADO").map(m => (
                    <tr key={m.id}>
                      <td className="font-mono text-xs text-brand-700">{m.numero}</td>
                      <td className="text-xs text-ink-500 whitespace-nowrap">{m.data}</td>
                      <td className="text-sm max-w-xs truncate">{m.descricao}</td>
                      <td>
                        <span className={`badge text-[10px] ${m.sentido === "ENTRADA" ? "badge-green" : "badge-red"}`}>
                          {m.sentido}
                        </span>
                      </td>
                      <td className={`text-right font-mono text-sm ${m.sentido === "ENTRADA" ? "text-green-700" : "text-brand-700"}`}>
                        {m.sentido === "SAÍDA" ? "- " : ""}{fmt(m.valor)}
                      </td>
                      <td>
                        <span className="badge badge-green text-[10px]">{m.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function EditarReconciliacaoModal({
  tx,
  onClose,
  onSave,
}: {
  tx: BankTx;
  onClose: () => void;
  onSave: (patch: Partial<BankTx>) => void;
}) {
  const [form, setForm] = useState({
    desc: tx.desc,
    valor: tx.valor.toString(),
    data: tx.data,
    estado: tx.estado,
  });

  function save() {
    onSave({
      desc: form.desc,
      valor: parseFloat(form.valor) || tx.valor,
      data: form.data,
      estado: form.estado as MatchState,
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">ID Transacção</label>
            <input className="input bg-ink-50 font-mono" value={tx.id} readOnly disabled />
          </div>
          <div>
            <label className="label">Data</label>
            <input className="input" type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Descrição *</label>
          <input className="input" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="Descrição da transacção" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Valor (Kz) *</label>
            <input className="input font-mono" type="number" step="0.01" value={form.valor}
              onChange={e => setForm({ ...form, valor: e.target.value })} placeholder="0" />
          </div>
          <div>
            <label className="label">Estado de reconciliação</label>
            <select className="input" value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as MatchState })}>
              <option value="matched">Conciliada</option>
              <option value="unmatched">Por reconciliar</option>
              <option value="partial">Parcial</option>
            </select>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={save} disabled={!form.desc || !form.valor} className="btn-primary">Guardar Alterações</button>
      </div>
    </div>
  );
}

function AssocModal({
  bankTx,
  initialCandidatos,
  tesMovs,
  onAssociar,
  onClose,
}: {
  bankTx: BankTx;
  initialCandidatos: MovTesouraria[];
  tesMovs: MovTesouraria[];
  onAssociar: (movNumero: string) => void;
  onClose: () => void;
}) {
  const [assocSearch, setAssocSearch] = useState("");
  const sentido = bankTx.tipo === "C" ? "ENTRADA" : "SAÍDA";
  const candidatos = assocSearch === ""
    ? initialCandidatos
    : tesMovs.filter(m =>
        m.estado !== "ANULADO" &&
        m.sentido === sentido &&
        (m.numero.toLowerCase().includes(assocSearch.toLowerCase()) ||
          m.descricao.toLowerCase().includes(assocSearch.toLowerCase()))
      );
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-ink-100">
          <p className="text-xs text-ink-400">
            {bankTx.desc} — {fmt(bankTx.valor)} AOA
          </p>
        </div>
        <div className="p-4 border-b border-ink-100">
          <input className="input text-sm" placeholder="Pesquisar movimento (número ou descrição)…"
            value={assocSearch} onChange={e => setAssocSearch(e.target.value)} />
        </div>
        <div className="divide-y divide-ink-100">
          {candidatos.length === 0 && (
            <p className="p-5 text-center text-sm text-ink-400">
              {tesMovs.length === 0
                ? "Nenhum movimento de tesouraria encontrado. Registe movimentos na Tesouraria primeiro."
                : "Nenhum movimento corresponde ao filtro."}
            </p>
          )}
          {candidatos.map(m => (
            <button key={m.id} onClick={() => onAssociar(m.numero)}
              className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-brand-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-brand-700 font-semibold">{m.numero}</p>
                <p className="text-xs text-ink-600 truncate">{m.descricao}</p>
                <p className="text-xs text-ink-400">{m.data}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold text-ink-800">{fmt(m.valor)} AOA</p>
                <span className={`badge text-[10px] ${m.sentido === "ENTRADA" ? "badge-green" : "badge-red"}`}>
                  {m.sentido}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </div>
  );
}
