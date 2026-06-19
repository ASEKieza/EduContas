"use client";

import { useState, useMemo, useCallback } from "react";
import { useCollection } from "@/lib/useCollection";
import Topbar from "@/components/Topbar";
import { useJournal } from "@/lib/journal";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { fmtKz } from "@/lib/utils";
import { useWindowManager } from "@/lib/windowManager";

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrcamentoLinha {
  id: string;
  conta: string;    // e.g. "61.1"
  descricao: string;
  tipo: "receita" | "custo" | "despesa" | "investimento";
  mensal: number[];  // 12 months
  anual: number;     // sum of mensal
}

interface Orcamento {
  id: string;
  nome: string;
  exercicio: string;
  linhas: OrcamentoLinha[];
  criadoEm: string;
  estado: "RASCUNHO" | "APROVADO";
}

// ── Seed ─────────────────────────────────────────────────────────────────────
const meses12 = (v: number) => Array.from({ length: 12 }, () => Math.round(v / 12));

const SEED_ORC_2025: Orcamento = {
  id: "orc-2025",
  nome: "Orçamento 2025",
  exercicio: "2025",
  estado: "APROVADO",
  criadoEm: "2025-01-10T09:00:00Z",
  linhas: [
    { id: "ol1", conta: "61.1", descricao: "Vendas — Mercado Nacional",          tipo: "receita",      mensal: meses12(750_000_000), anual: 750_000_000 },
    { id: "ol2", conta: "62.1", descricao: "Serviços Suplementares",             tipo: "receita",      mensal: meses12( 30_000_000), anual:  30_000_000 },
    { id: "ol3", conta: "71.1", descricao: "Custo das Mercadorias Vendidas",     tipo: "custo",        mensal: meses12(450_000_000), anual: 450_000_000 },
    { id: "ol4", conta: "72.1", descricao: "Remunerações do Pessoal",            tipo: "despesa",      mensal: meses12( 25_200_000), anual:  25_200_000 },
    { id: "ol5", conta: "72.2", descricao: "Encargos Sociais",                   tipo: "despesa",      mensal: meses12(  3_780_000), anual:   3_780_000 },
    { id: "ol6", conta: "75.2", descricao: "Fornecimentos e Serviços de Terceiros", tipo: "despesa",   mensal: meses12( 24_000_000), anual:  24_000_000 },
    { id: "ol7", conta: "73.1", descricao: "Amortizações",                       tipo: "despesa",      mensal: meses12( 18_000_000), anual:  18_000_000 },
    { id: "ol8", conta: "11",   descricao: "Investimento em Imobilizado",        tipo: "investimento", mensal: meses12( 50_000_000), anual:  50_000_000 },
  ],
};

const SEED_ORC_2024: Orcamento = {
  id: "orc-2024",
  nome: "Orçamento 2024",
  exercicio: "2024",
  estado: "APROVADO",
  criadoEm: "2024-01-08T09:00:00Z",
  linhas: [
    { id: "ol1", conta: "61.1", descricao: "Vendas — Mercado Nacional",      tipo: "receita",  mensal: meses12(680_000_000), anual: 680_000_000 },
    { id: "ol2", conta: "71.1", descricao: "Custo das Mercadorias Vendidas", tipo: "custo",    mensal: meses12(408_000_000), anual: 408_000_000 },
    { id: "ol3", conta: "72.1", descricao: "Remunerações do Pessoal",        tipo: "despesa",  mensal: meses12( 22_800_000), anual:  22_800_000 },
    { id: "ol4", conta: "75.2", descricao: "Fornecimentos e Serviços",       tipo: "despesa",  mensal: meses12( 18_000_000), anual:  18_000_000 },
    { id: "ol5", conta: "73.1", descricao: "Amortizações",                   tipo: "despesa",  mensal: meses12( 15_000_000), anual:  15_000_000 },
  ],
};

// ── Hook ──────────────────────────────────────────────────────────────────────
function useOrcamentos() {
  const seed = [SEED_ORC_2025, SEED_ORC_2024];
  const { items: orcs, setItems: save } = useCollection<Orcamento>("educontas-orcamentos", seed);

  const addOrcamento = useCallback((draft: Omit<Orcamento, "id" | "criadoEm">) => {
    save(prev => [{ ...draft, id: crypto.randomUUID(), criadoEm: new Date().toISOString() }, ...prev]);
  }, [save]);

  const addLinha = useCallback((orcId: string, linha: Omit<OrcamentoLinha, "id">) => {
    save(prev => prev.map(o => o.id !== orcId ? o : {
      ...o, linhas: [...o.linhas, { ...linha, id: crypto.randomUUID() }],
    }));
  }, [save]);

  const updateLinha = useCallback((orcId: string, linhaId: string, patch: Partial<OrcamentoLinha>) => {
    save(prev => prev.map(o => o.id !== orcId ? o : {
      ...o,
      linhas: o.linhas.map(l => l.id !== linhaId ? l : {
        ...l, ...patch, anual: patch.mensal ? patch.mensal.reduce((s, v) => s + v, 0) : l.anual,
      }),
    }));
  }, [save]);

  const deleteLinha = useCallback((orcId: string, linhaId: string) => {
    save(prev => prev.map(o => o.id !== orcId ? o : { ...o, linhas: o.linhas.filter(l => l.id !== linhaId) }));
  }, [save]);

  return { orcs, addOrcamento, addLinha, updateLinha, deleteLinha, save };
}

// ── Variance bar ──────────────────────────────────────────────────────────────
function VarBar({ orc, real, isRevenue }: { orc: number; real: number; isRevenue: boolean }) {
  if (orc === 0) return <span className="text-gray-400 text-xs">—</span>;
  const pct = ((real - orc) / orc * 100);
  const favorable = isRevenue ? real >= orc : real <= orc;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${favorable ? "bg-green-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(100, Math.abs(Math.min(200, Math.max(0, real / orc * 100))))}%` }} />
      </div>
      <span className={`text-[10px] font-bold w-14 text-right ${favorable ? "text-green-700" : "text-red-700"}`}>
        {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
      </span>
    </div>
  );
}

// ── Linha form fields ─────────────────────────────────────────────────────────

interface LinhaFormData {
  conta: string;
  descricao: string;
  tipo: OrcamentoLinha["tipo"];
  anualStr: string; // total annual in Kz — we'll distribute evenly across months
}

interface LinhaFormProps {
  value: LinhaFormData;
  onChange: (v: LinhaFormData) => void;
}

function LinhaFormFields({ value, onChange }: LinhaFormProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Código de Conta *</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={value.conta}
            onChange={e => onChange({ ...value, conta: e.target.value })}
            placeholder="ex: 61.1"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo *</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            value={value.tipo}
            onChange={e => onChange({ ...value, tipo: e.target.value as OrcamentoLinha["tipo"] })}
          >
            <option value="receita">Receita</option>
            <option value="custo">Custo</option>
            <option value="despesa">Despesa</option>
            <option value="investimento">Investimento</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição *</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          value={value.descricao}
          onChange={e => onChange({ ...value, descricao: e.target.value })}
          placeholder="Descrição da linha orçamental"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Valor Anual (Kz) *</label>
        <input
          type="number"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300"
          value={value.anualStr}
          onChange={e => onChange({ ...value, anualStr: e.target.value })}
          placeholder="750000000"
          min="0"
        />
        {value.anualStr && !isNaN(Number(value.anualStr)) && (
          <p className="text-[10px] text-gray-400 mt-1">
            ≈ {fmtKz(Number(value.anualStr) / 12)} / mês
          </p>
        )}
      </div>
    </div>
  );
}

// ── NovaLinhaModal ────────────────────────────────────────────────────────────

interface NovaLinhaModalProps {
  orcId: string;
  onSave: (orcId: string, linha: Omit<OrcamentoLinha, "id">) => void;
  onClose: () => void;
}

function NovaLinhaModal({ orcId, onSave, onClose }: NovaLinhaModalProps) {
  const [form, setForm] = useState<LinhaFormData>({
    conta: "",
    descricao: "",
    tipo: "receita",
    anualStr: "",
  });

  function handleSave() {
    const anual = Number(form.anualStr);
    if (!form.conta.trim() || !form.descricao.trim() || isNaN(anual) || anual < 0) return;
    const mensal = meses12(anual);
    onSave(orcId, { conta: form.conta.trim(), descricao: form.descricao.trim(), tipo: form.tipo, mensal, anual });
    onClose();
  }

  const valid = form.conta.trim() && form.descricao.trim() && !isNaN(Number(form.anualStr));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <LinhaFormFields value={form} onChange={setForm} />
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={handleSave} disabled={!valid}>Criar Linha</button>
      </div>
    </div>
  );
}

// ── EditarLinhaModal ──────────────────────────────────────────────────────────

interface EditarLinhaModalProps {
  orcId: string;
  linha: OrcamentoLinha;
  onSave: (orcId: string, linhaId: string, patch: Partial<OrcamentoLinha>) => void;
  onClose: () => void;
}

function EditarLinhaModal({ orcId, linha, onSave, onClose }: EditarLinhaModalProps) {
  const [form, setForm] = useState<LinhaFormData>({
    conta: linha.conta,
    descricao: linha.descricao,
    tipo: linha.tipo,
    anualStr: String(linha.anual),
  });

  function handleSave() {
    const anual = Number(form.anualStr);
    if (!form.conta.trim() || !form.descricao.trim() || isNaN(anual) || anual < 0) return;
    const mensal = meses12(anual);
    onSave(orcId, linha.id, { conta: form.conta.trim(), descricao: form.descricao.trim(), tipo: form.tipo, mensal, anual });
    onClose();
  }

  const valid = form.conta.trim() && form.descricao.trim() && !isNaN(Number(form.anualStr));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <LinhaFormFields value={form} onChange={setForm} />
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={handleSave} disabled={!valid}>Guardar</button>
      </div>
    </div>
  );
}

// ── ConfirmDeleteLinha ────────────────────────────────────────────────────────

interface ConfirmDeleteLinhaProps {
  linha: OrcamentoLinha;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmDeleteLinha({ linha, onConfirm, onClose }: ConfirmDeleteLinhaProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-sm text-gray-700">
          Tem a certeza que pretende eliminar a linha orçamental <strong>{linha.conta}</strong>?
        </p>
        <p className="text-xs text-gray-500 italic">{linha.descricao}</p>
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
export default function OrcamentacaoPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [exercicio, setExercicio] = useState(ANOS_DISPONIVEIS[0] ?? "2025");
  const { orcs, addLinha, updateLinha, deleteLinha } = useOrcamentos();
  const { entries } = useJournal(exercicio);
  const [activeTab, setActiveTab] = useState<"resumo" | "detalhe" | "mensal">("resumo");
  const [mesSel, setMesSel] = useState(new Date().getMonth()); // 0-based

  // Find active budget for exercicio
  const orc = useMemo(() => orcs.find(o => o.exercicio === exercicio), [orcs, exercicio]);

  // Compute real values from journal by account code
  const realByAccount = useMemo(() => {
    const map = new Map<string, { debito: number; credito: number }>();
    entries.filter(e => e.estado === "LANÇADO").forEach(e => {
      e.linhas.forEach(l => {
        const cur = map.get(l.contaCod) ?? { debito: 0, credito: 0 };
        map.set(l.contaCod, { debito: cur.debito + l.debito, credito: cur.credito + l.credito });
      });
    });
    return map;
  }, [entries]);

  function realForConta(conta: string): number {
    // Sum all accounts starting with this prefix
    let total = 0;
    realByAccount.forEach((v, k) => {
      if (k === conta || k.startsWith(conta + ".")) {
        total += v.debito + v.credito;
      }
    });
    return total;
  }

  const linhasComReal = useMemo(() => {
    if (!orc) return [];
    return orc.linhas.map(l => ({
      ...l,
      realAnual: realForConta(l.conta),
      varAbsoluta: realForConta(l.conta) - l.anual,
      varPct: l.anual > 0 ? (realForConta(l.conta) - l.anual) / l.anual * 100 : 0,
    }));
  }, [orc, realByAccount]);

  const totalOrcReceit = linhasComReal.filter(l => l.tipo === "receita").reduce((s, l) => s + l.anual, 0);
  const totalOrcCusto  = linhasComReal.filter(l => l.tipo !== "receita").reduce((s, l) => s + l.anual, 0);
  const totalRealReceit = linhasComReal.filter(l => l.tipo === "receita").reduce((s, l) => s + l.realAnual, 0);
  const totalRealCusto  = linhasComReal.filter(l => l.tipo !== "receita").reduce((s, l) => s + l.realAnual, 0);
  const resultOrc   = totalOrcReceit  - totalOrcCusto;
  const resultReal  = totalRealReceit - totalRealCusto;

  const TIPO_COLORS: Record<string, string> = {
    receita:     "text-green-700",
    custo:       "text-red-700",
    despesa:     "text-orange-700",
    investimento:"text-blue-700",
  };
  const TIPO_BADGES: Record<string, string> = {
    receita:     "bg-green-100 text-green-800",
    custo:       "bg-red-100 text-red-800",
    despesa:     "bg-orange-100 text-orange-800",
    investimento:"bg-blue-100 text-blue-800",
  };

  const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  // ── Window openers ─────────────────────────────────────────────────────

  function handleOpenNovaLinha() {
    if (!orc) return;
    const winId = "nova-linha-orcamento";
    openWindow({
      id: winId,
      title: `Nova Linha — ${orc.nome}`,
      icon: "➕",
      content: (
        <NovaLinhaModal
          orcId={orc.id}
          onSave={addLinha}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 200, y: 120, width: 520, height: 400,
      minimized: false, maximized: false,
    });
  }

  function handleOpenEditar(linha: OrcamentoLinha) {
    if (!orc) return;
    const winId = `editar-linha-${linha.id}`;
    openWindow({
      id: winId,
      title: `Editar Linha ${linha.conta}`,
      icon: "✏️",
      content: (
        <EditarLinhaModal
          orcId={orc.id}
          linha={linha}
          onSave={updateLinha}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 220, y: 140, width: 520, height: 400,
      minimized: false, maximized: false,
    });
  }

  function handleOpenDelete(linha: OrcamentoLinha) {
    if (!orc) return;
    const winId = `delete-linha-${linha.id}`;
    openWindow({
      id: winId,
      title: `Eliminar Linha ${linha.conta}`,
      icon: "🗑️",
      content: (
        <ConfirmDeleteLinha
          linha={linha}
          onConfirm={() => deleteLinha(orc.id, linha.id)}
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
        title="Orçamentação"
        subtitle={`Orçamento vs Real · ${exercicio} · Variância por conta e período`}
        actions={
          <>
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setExercicio(y)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  exercicio === y ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>{y}</button>
            ))}
            {orc && (
              <button className="btn-primary text-xs py-1.5" onClick={handleOpenNovaLinha}>
                + Nova Linha
              </button>
            )}
            <button className="btn-secondary">Exportar XLSX</button>
          </>
        }
      />

      <div className="p-6 space-y-5">
        {!orc ? (
          <div className="card flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-5xl">📊</div>
            <p className="font-semibold text-gray-700">Nenhum orçamento para {exercicio}</p>
            <p className="text-sm text-gray-500">Os dados de 2024 e 2025 estão disponíveis como demonstração.</p>
          </div>
        ) : (
          <>
            {/* KPI summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Receitas Orçamentadas",  value: totalOrcReceit,   color: "text-green-700" },
                { label: "Receitas Reais",          value: totalRealReceit,  color: "text-green-600" },
                { label: "Resultado Orçamentado",   value: resultOrc,        color: "text-brand-700" },
                { label: "Resultado Real",          value: resultReal,       color: resultReal >= resultOrc ? "text-green-700" : "text-red-700" },
              ].map(k => (
                <div key={k.label} className="card p-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">{k.label}</p>
                  <p className={`text-lg font-bold mt-1 font-mono ${k.color}`}>{fmtKz(k.value, true)}</p>
                  {k.label.includes("Real") && k.label.includes("Resultado") && (
                    <p className="text-[10px] mt-1 text-gray-400">
                      vs orçamento: <span className={resultReal >= resultOrc ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                        {resultReal >= resultOrc ? "+" : ""}{fmtKz(resultReal - resultOrc, true)}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
              {([["resumo","Resumo"],["detalhe","Detalhe por Conta"],["mensal","Breakdown Mensal"]] as const).map(([t,l]) => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === t ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}>{l}</button>
              ))}
            </div>

            {/* Tab: Resumo */}
            {activeTab === "resumo" && (
              <div className="card overflow-hidden">
                <div className="card-header">
                  <h3>Orçamento vs Real — {orc.nome}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    orc.estado === "APROVADO" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>{orc.estado}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Conta</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Descrição</th>
                        <th className="px-4 py-3 text-center font-semibold text-gray-600">Tipo</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Orçamento Anual</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Real Acumulado</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Variação (Kz)</th>
                        <th className="px-4 py-3 font-semibold text-gray-600 w-36">Execução</th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {linhasComReal.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-brand-700 font-semibold">{l.conta}</td>
                          <td className="px-4 py-3 text-gray-800">{l.descricao}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${TIPO_BADGES[l.tipo]}`}>
                              {l.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{fmtKz(l.anual, true)}</td>
                          <td className="px-4 py-3 text-right font-mono">{fmtKz(l.realAnual, true)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-semibold ${
                            l.tipo === "receita"
                              ? l.varAbsoluta >= 0 ? "text-green-700" : "text-red-700"
                              : l.varAbsoluta <= 0 ? "text-green-700" : "text-red-700"
                          }`}>
                            {l.varAbsoluta >= 0 ? "+" : ""}{fmtKz(l.varAbsoluta, true)}
                          </td>
                          <td className="px-4 py-3">
                            <VarBar orc={l.anual} real={l.realAnual} isRevenue={l.tipo === "receita"} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleOpenEditar(l)}
                                className="btn-ghost py-0.5 px-1.5 text-xs"
                                title="Editar"
                              >✏️</button>
                              <button
                                onClick={() => handleOpenDelete(l)}
                                className="btn-ghost py-0.5 px-1.5 text-xs text-brand-400"
                                title="Eliminar"
                              >🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-brand-700 text-white font-bold">
                        <td colSpan={3} className="px-4 py-3 text-sm uppercase tracking-wide">RESULTADO</td>
                        <td className="px-4 py-3 text-right font-mono">{fmtKz(resultOrc, true)}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmtKz(resultReal, true)}</td>
                        <td className={`px-4 py-3 text-right font-mono ${resultReal >= resultOrc ? "text-green-300" : "text-red-300"}`}>
                          {resultReal >= resultOrc ? "+" : ""}{fmtKz(resultReal - resultOrc, true)}
                        </td>
                        <td />
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Mensal */}
            {activeTab === "mensal" && (
              <div className="card overflow-hidden">
                <div className="card-header flex items-center gap-4">
                  <h3 className="flex-1">Breakdown Mensal — {orc.nome}</h3>
                  <div className="flex gap-1">
                    {MESES.map((m, i) => (
                      <button key={m} onClick={() => setMesSel(i)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                          mesSel === i ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-100"
                        }`}>{m}</button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Conta</th>
                        <th className="px-4 py-3 text-left">Descrição</th>
                        <th className="px-4 py-3 text-right text-gray-600">Orç. {MESES[mesSel]}</th>
                        <th className="px-4 py-3 text-right text-gray-600">Real {MESES[mesSel]}</th>
                        <th className="px-4 py-3 text-right text-gray-600">Variação</th>
                        <th className="px-4 py-3 text-right text-gray-600">Orç. Acum.</th>
                        <th className="px-4 py-3 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orc.linhas.map(l => {
                        const orcMes = l.mensal[mesSel] ?? 0;
                        // Real for this month (rough: divide realAnual / 12)
                        const realMes = Math.round((linhasComReal.find(lr => lr.id === l.id)?.realAnual ?? 0) / 12);
                        const orcAcum = l.mensal.slice(0, mesSel + 1).reduce((s, v) => s + v, 0);
                        const varAbs  = realMes - orcMes;
                        return (
                          <tr key={l.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-brand-700 font-semibold">{l.conta}</td>
                            <td className="px-4 py-3">{l.descricao}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmtKz(orcMes)}</td>
                            <td className="px-4 py-3 text-right font-mono">{fmtKz(realMes)}</td>
                            <td className={`px-4 py-3 text-right font-mono font-semibold ${
                              l.tipo === "receita"
                                ? varAbs >= 0 ? "text-green-700" : "text-red-700"
                                : varAbs <= 0 ? "text-green-700" : "text-red-700"
                            }`}>{varAbs >= 0 ? "+" : ""}{fmtKz(varAbs)}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-500">{fmtKz(orcAcum)}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button onClick={() => handleOpenEditar(l)} className="btn-ghost py-0.5 px-1.5 text-xs" title="Editar">✏️</button>
                                <button onClick={() => handleOpenDelete(l)} className="btn-ghost py-0.5 px-1.5 text-xs text-brand-400" title="Eliminar">🗑️</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Detalhe */}
            {activeTab === "detalhe" && (
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">Linhas do Orçamento — {orc.nome}</h3>
                  <button className="btn-primary text-xs py-1.5" onClick={handleOpenNovaLinha}>
                    + Nova Linha
                  </button>
                </div>
                <p className="text-xs text-gray-500">Clique num valor mensal para editar directamente.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Conta</th>
                        <th className="px-3 py-2 text-left">Descrição</th>
                        {MESES.map(m => <th key={m} className="px-2 py-2 text-right">{m}</th>)}
                        <th className="px-3 py-2 text-right font-bold">Total</th>
                        <th className="px-3 py-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {orc.linhas.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-brand-700 font-semibold">{l.conta}</td>
                          <td className="px-3 py-2 text-gray-700">{l.descricao}</td>
                          {l.mensal.map((v, i) => (
                            <td key={i} className="px-2 py-2 text-right font-mono text-gray-600">
                              {(v / 1_000_000).toFixed(1)}M
                            </td>
                          ))}
                          <td className={`px-3 py-2 text-right font-mono font-bold ${TIPO_COLORS[l.tipo]}`}>
                            {fmtKz(l.anual, true)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => handleOpenEditar(l)} className="btn-ghost py-0.5 px-1.5 text-xs" title="Editar">✏️</button>
                              <button onClick={() => handleOpenDelete(l)} className="btn-ghost py-0.5 px-1.5 text-xs text-brand-400" title="Eliminar">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
