"use client";

import { useState, useCallback } from "react";
import { useCollection } from "@/lib/useCollection";
import Topbar from "@/components/Topbar";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { useWindowManager } from "@/lib/windowManager";

type ApprovalStatus = "pendente" | "aprovado" | "rejeitado";

interface Approval {
  id: string;
  tipo: string;
  desc: string;
  solicitado_por: string;
  data: string;
  valor: string;
  modulo: string;
  estado: ApprovalStatus;
  urgente: boolean;
  nivel: number;
  motivo?: string;
  processado_por?: string;
  processado_em?: string;
}

// ── Seed data wired to real module transactions ────────────────────────────────
const SEED_2024: Approval[] = [
  { id:"AP-001", tipo:"COMPRA",     desc:"FC/2024/002206 — Petro Insumos Lda — 42M Kz",          solicitado_por:"carlos.lima",   data:"05/11 10:00", valor:"42.000.000",  modulo:"COMPRAS",       estado:"aprovado",  urgente:true,  nivel:3, processado_por:"Admin (CFO)",   processado_em:"2024-11-05T11:00:00Z" },
  { id:"AP-002", tipo:"EMPRÉSTIMO", desc:"Empréstimo BAI — 50M Kz — Ref.EMP-0044",               solicitado_por:"carlos.lima",   data:"27/11 09:00", valor:"50.000.000",  modulo:"TESOURARIA",    estado:"aprovado",  urgente:true,  nivel:3, processado_por:"Admin (CFO)",   processado_em:"2024-11-27T10:00:00Z" },
  { id:"AP-003", tipo:"COMPRA",     desc:"FC/2024/002207 — Sonangol EP — 28,5M Kz",               solicitado_por:"paulo.mendes",  data:"15/11 14:00", valor:"28.500.000",  modulo:"COMPRAS",       estado:"aprovado",  urgente:false, nivel:3, processado_por:"Admin (CFO)",   processado_em:"2024-11-16T09:00:00Z" },
  { id:"AP-004", tipo:"FOLHA SAL.", desc:"FS/2024/009 — Processamento Set. 2024 — 7 func.",        solicitado_por:"ana.rodrigues", data:"30/09 14:00", valor:"1.831.000",   modulo:"RH",            estado:"aprovado",  urgente:false, nivel:2, processado_por:"Gestor Fin.",   processado_em:"2024-09-30T15:00:00Z" },
  { id:"AP-005", tipo:"FOLHA SAL.", desc:"FS/2024/010 — Processamento Out. 2024 — 7 func.",        solicitado_por:"ana.rodrigues", data:"31/10 14:00", valor:"1.831.000",   modulo:"RH",            estado:"aprovado",  urgente:false, nivel:2, processado_por:"Gestor Fin.",   processado_em:"2024-10-31T15:00:00Z" },
  { id:"AP-006", tipo:"LANÇAMENTO", desc:"Depreciação activos Nov 2024 — DI/2024/000338",          solicitado_por:"maria.costa",   data:"28/11 08:00", valor:"5.309.083",   modulo:"ACTIVOS",       estado:"aprovado",  urgente:false, nivel:2, processado_por:"Gestor Fin.",   processado_em:"2024-11-28T09:00:00Z" },
  { id:"AP-007", tipo:"LANÇAMENTO", desc:"IVA Apuramento Out 2024 — DI/2024/000337",               solicitado_por:"maria.costa",   data:"28/11 08:00", valor:"12.600.000",  modulo:"FISCAL",        estado:"aprovado",  urgente:false, nivel:2, processado_por:"Contabilista",  processado_em:"2024-11-28T12:00:00Z" },
  { id:"AP-008", tipo:"ESTORNO",    desc:"ESTORNO DI/2024/000099 — Petrangol SA correção",         solicitado_por:"maria.costa",   data:"05/03 09:00", valor:"2.280.000",   modulo:"CONTABILIDADE", estado:"rejeitado", urgente:false, nivel:2, motivo:"Estorno desnecessário — reverificação necessária com contabilista sénior", processado_por:"Gestor Fin.", processado_em:"2024-03-05T11:00:00Z" },
  { id:"AP-009", tipo:"FOLHA SAL.", desc:"FS/2024/011 — Processamento Nov. 2024 — 7 func.",        solicitado_por:"ana.rodrigues", data:"30/11 14:00", valor:"1.831.000",   modulo:"RH",            estado:"pendente",  urgente:false, nivel:2 },
  { id:"AP-010", tipo:"PAGAMENTO",  desc:"IRT Novembro 2024 — AGT — 204.500 AOA",                  solicitado_por:"paulo.mendes",  data:"01/12 09:00", valor:"204.500",     modulo:"FISCAL",        estado:"pendente",  urgente:true,  nivel:1 },
  { id:"AP-011", tipo:"COMPRA",     desc:"FC/2024/002210 — Tech Supplies Angola — 12,8M Kz",      solicitado_por:"carlos.lima",   data:"30/11 11:00", valor:"12.800.000",  modulo:"COMPRAS",       estado:"pendente",  urgente:false, nivel:2 },
];

const SEED_2025: Approval[] = [
  { id:"AP2025-001", tipo:"LANÇAMENTO", desc:"Depreciação activos Jan 2025 — DI/2025/000001",      solicitado_por:"maria.costa",   data:"31/01 09:00", valor:"5.309.083",   modulo:"ACTIVOS",       estado:"aprovado",  urgente:false, nivel:2, processado_por:"Gestor Fin.",  processado_em:"2025-01-31T10:00:00Z" },
  { id:"AP2025-002", tipo:"FOLHA SAL.", desc:"Processamento salarial Jan 2025 — 7 func.",           solicitado_por:"ana.rodrigues", data:"31/01 14:00", valor:"1.831.000",   modulo:"RH",            estado:"aprovado",  urgente:false, nivel:2, processado_por:"Gestor Fin.",  processado_em:"2025-01-31T15:00:00Z" },
  { id:"AP2025-003", tipo:"PAGAMENTO",  desc:"Pagamento IVA Dez 2024 — AGT — 12.400.000 AOA",      solicitado_por:"paulo.mendes",  data:"20/01 10:00", valor:"12.400.000",  modulo:"FISCAL",        estado:"pendente",  urgente:true,  nivel:3 },
  { id:"AP2025-004", tipo:"PAGAMENTO",  desc:"Pagamento II Exercício 2024 — AGT — 23.600.000 AOA", solicitado_por:"paulo.mendes",  data:"31/01 10:00", valor:"23.600.000",  modulo:"FISCAL",        estado:"pendente",  urgente:true,  nivel:3 },
];

const SEEDS: Record<string, Approval[]> = { "2024": SEED_2024, "2025": SEED_2025 };

const tipoColor: Record<string, string> = {
  "LANÇAMENTO": "badge-aqua",
  "PAGAMENTO":  "badge-red",
  "COMPRA":     "badge-ink",
  "ESTORNO":    "badge-yellow",
  "EMPRÉSTIMO": "badge-gold",
  "FOLHA SAL.": "badge-green",
  "INVENTÁRIO": "badge-aqua",
};

// ── New request form state ─────────────────────────────────────────────────────
const TIPO_OPTIONS = ["LANÇAMENTO","PAGAMENTO","COMPRA","ESTORNO","EMPRÉSTIMO","FOLHA SAL.","INVENTÁRIO"];
const MODULO_OPTIONS = ["CONTABILIDADE","TESOURARIA","COMPRAS","RH","ACTIVOS","INVENTÁRIO","FISCAL","VENDAS"];

export default function AprovacoesPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [ano, setAno]             = useState("2024");
  const seed = SEEDS[ano] ?? [];
  const { items, setItems: persist } = useCollection<Approval>(`educontas-aprovacoes-${ano}`, seed);
  const [selected, setSelected]   = useState<string | null>(null);
  const [motivo, setMotivo]       = useState("");
  const [filterEstado, setFilterEstado] = useState<"todos" | ApprovalStatus>("todos");
  const [filterModulo, setFilterModulo] = useState("Todos");

  // ── Actions ───────────────────────────────────────────────────────────────
  function approve(id: string) {
    persist(items.map(i => i.id === id ? {
      ...i, estado: "aprovado" as const,
      motivo: motivo.trim() || undefined,
      processado_por: "Admin",
      processado_em: new Date().toISOString(),
    } : i));
    setSelected(null); setMotivo("");
  }

  function reject(id: string) {
    if (!motivo.trim()) return;
    persist(items.map(i => i.id === id ? {
      ...i, estado: "rejeitado" as const,
      motivo: motivo.trim(),
      processado_por: "Admin",
      processado_em: new Date().toISOString(),
    } : i));
    setSelected(null); setMotivo("");
  }

  function cancelAprovacao(id: string) {
    persist(items.map(i => i.id === id ? {
      ...i, estado: "rejeitado" as const,
      motivo: "Cancelado pelo utilizador",
      processado_por: "Admin",
      processado_em: new Date().toISOString(),
    } : i));
    setSelected(null); setMotivo("");
  }

  function deleteAprovacao(id: string) {
    persist(items.filter(i => i.id !== id));
    if (selected === id) { setSelected(null); setMotivo(""); }
  }

  function openRejeitar(item: Approval) {
    const winId = `rejeitar-aprovacao-${item.id}`;
    openWindow({
      id: winId,
      title: `Rejeitar — ${item.id}`,
      icon: "✕",
      content: <RejeitarForm
        item={item}
        onRejeitar={(motivo) => {
          persist(items.map(i => i.id === item.id ? {
            ...i, estado: "rejeitado" as const,
            motivo,
            processado_por: "Admin",
            processado_em: new Date().toISOString(),
          } : i));
          closeWindow(winId);
        }}
        onClose={() => closeWindow(winId)}
      />,
      x: 50, y: 30, width: 520, height: 320, minimized: false, maximized: false,
    });
  }

  function openCancelar(item: Approval) {
    const winId = `cancelar-aprovacao-${item.id}`;
    openWindow({
      id: winId,
      title: "Confirmar cancelamento",
      icon: "🚫",
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 p-6">
            <p className="text-gray-700">Tem a certeza que pretende cancelar o pedido <strong>{item.id}</strong>?</p>
            <p className="text-sm text-gray-500 mt-2 truncate">{item.desc}</p>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
            <button onClick={() => closeWindow(winId)} className="btn-secondary">Fechar</button>
            <button onClick={() => { cancelAprovacao(item.id); closeWindow(winId); }} className="btn-primary bg-red-600 hover:bg-red-700">Cancelar Pedido</button>
          </div>
        </div>
      ),
      x: 80, y: 80, width: 480, height: 220, minimized: false, maximized: false,
    });
  }

  function openDeleteAprovacao(item: Approval) {
    const winId = `delete-aprovacao-${item.id}`;
    openWindow({
      id: winId,
      title: "Confirmar eliminação",
      icon: "🗑️",
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 p-6">
            <p className="text-gray-700">Tem a certeza que pretende eliminar o pedido <strong>{item.id}</strong>?</p>
            <p className="text-sm text-gray-500 mt-2">Esta acção não pode ser desfeita.</p>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
            <button onClick={() => closeWindow(winId)} className="btn-secondary">Cancelar</button>
            <button onClick={() => { deleteAprovacao(item.id); closeWindow(winId); }} className="btn-primary bg-red-600 hover:bg-red-700">Eliminar</button>
          </div>
        </div>
      ),
      x: 80, y: 80, width: 480, height: 220, minimized: false, maximized: false,
    });
  }

  function openNovoPedido() {
    const winId = `aprovacao-nova-${ano}-${crypto.randomUUID()}`;
    openWindow({
      id: winId,
      title: `Novo Pedido de Aprovação — Exercício ${ano}`,
      icon: "✅",
      content: <NovoPedidoForm
        onSave={(novo) => {
          persist([novo, ...items]);
          closeWindow(winId);
        }}
        onClose={() => closeWindow(winId)}
      />,
      x: 40, y: 20, width: 680, height: 480, minimized: false, maximized: false,
    });
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const modulos = ["Todos", ...Array.from(new Set(items.map(i => i.modulo))).sort()];

  const filtered = items
    .filter(i => filterEstado === "todos" || i.estado === filterEstado)
    .filter(i => filterModulo === "Todos" || i.modulo === filterModulo);

  const pendentes  = items.filter(i => i.estado === "pendente");
  const aprovados  = items.filter(i => i.estado === "aprovado").length;
  const rejeitados = items.filter(i => i.estado === "rejeitado").length;

  const selectedItem = items.find(i => i.id === selected);

  return (
    <div>
      <Topbar
        title="Aprovações"
        subtitle="Fluxo de aprovação multinível · Segregação de funções · Auditoria"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setAno(y)}
                className={y === ano ? "btn-primary text-xs py-1.5 px-3" : "btn-secondary text-xs py-1.5 px-3"}>
                {y}
              </button>
            ))}
            <span className="badge-red badge">{pendentes.length} pendentes</span>
            <button onClick={openNovoPedido} className="btn-primary text-xs">
              + Novo Pedido
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5">
        {/* ── KPIs ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center border-l-4 border-gold-400">
            <p className="text-[11px] text-ink-400 uppercase tracking-wide font-semibold">Pendentes</p>
            <p className="text-3xl font-bold text-gold-600 mt-1">{pendentes.length}</p>
            <p className="text-xs text-ink-400 mt-0.5">{ano}</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-green-400">
            <p className="text-[11px] text-ink-400 uppercase tracking-wide font-semibold">Aprovados</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{aprovados}</p>
            <p className="text-xs text-ink-400 mt-0.5">no exercício</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-brand-500">
            <p className="text-[11px] text-ink-400 uppercase tracking-wide font-semibold">Rejeitados</p>
            <p className="text-3xl font-bold text-brand-600 mt-1">{rejeitados}</p>
            <p className="text-xs text-ink-400 mt-0.5">no exercício</p>
          </div>
        </div>

        {/* ── Fluxo de aprovação ── */}
        <div className="card p-4">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-3">Fluxo de Aprovação Configurado</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {[
              { label: "Operador (cria)", cls: "badge-gray" },
              { label: "→", cls: "text-ink-300 font-bold" },
              { label: "Contabilista (Nível 1)", cls: "badge-aqua" },
              { label: "→", cls: "text-ink-300 font-bold" },
              { label: "Gestor Financeiro (Nível 2)", cls: "badge-gold" },
              { label: "→", cls: "text-ink-300 font-bold" },
              { label: "Admin / CFO (Nível 3 — > 30M Kz)", cls: "badge-red" },
            ].map(({ label, cls }, i) => (
              <span key={i} className={cls === "text-ink-300 font-bold" ? cls : `badge ${cls}`}>{label}</span>
            ))}
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-2">
          {(["todos", "pendente", "aprovado", "rejeitado"] as const).map(e => (
            <button key={e} onClick={() => setFilterEstado(e)}
              className={filterEstado === e ? "btn-primary py-1.5 px-3 text-xs" : "btn-secondary py-1.5 px-3 text-xs"}>
              {e === "todos" ? `Todos (${items.length})` : e === "pendente" ? `Pendentes (${pendentes.length})` : e === "aprovado" ? `Aprovados (${aprovados})` : `Rejeitados (${rejeitados})`}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-ink-500">Módulo:</span>
            <select value={filterModulo} onChange={e => setFilterModulo(e.target.value)}
              className="input py-1.5 text-xs w-40">
              {modulos.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* ── Lista ── */}
          <div className="xl:col-span-2 card">
            <div className="card-header">
              <h3>Fila de Aprovação — {ano}</h3>
              <span className="badge-ink text-[11px]">{filtered.length} itens</span>
            </div>
            <div className="divide-y divide-ink-100">
              {filtered.length === 0 && (
                <div className="px-5 py-8 text-center text-ink-400 text-sm">
                  Nenhum pedido encontrado com os filtros seleccionados.
                </div>
              )}
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => item.estado === "pendente" ? setSelected(selected === item.id ? null : item.id) : undefined}
                  className={`px-5 py-4 flex items-start gap-4 transition-colors
                    ${item.estado === "pendente" ? "cursor-pointer hover:bg-ink-50" : ""}
                    ${selected === item.id ? "bg-brand-50 border-l-4 border-brand-500" : ""}
                  `}
                >
                  <div className="shrink-0 mt-0.5">
                    {item.urgente
                      ? <span className="badge-red text-[9px] badge">URGENTE</span>
                      : <span className="w-6 h-6 rounded-full bg-ink-100 text-ink-400 text-[10px] font-bold flex items-center justify-center">{item.nivel}</span>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge text-[10px] ${tipoColor[item.tipo] ?? "badge-gray"}`}>{item.tipo}</span>
                      <span className="text-xs text-ink-400">{item.modulo}</span>
                      <span className="text-xs text-ink-300">·</span>
                      <span className="text-xs text-ink-400">{item.data}</span>
                      <span className="text-xs text-ink-300">·</span>
                      <span className="text-xs font-mono text-ink-400">{item.id}</span>
                    </div>
                    <p className="text-sm font-medium text-ink-800 mt-1 truncate">{item.desc}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-ink-400">por <span className="font-mono text-brand-700">{item.solicitado_por}</span></p>
                      {item.processado_por && (
                        <>
                          <span className="text-ink-300">·</span>
                          <p className="text-xs text-ink-400">
                            {item.estado === "aprovado" ? "✓" : "✕"} <span className="font-mono text-ink-600">{item.processado_por}</span>
                            {item.processado_em && ` · ${new Date(item.processado_em).toLocaleDateString("pt-AO")}`}
                          </p>
                        </>
                      )}
                    </div>
                    {item.motivo && (
                      <p className="text-xs text-brand-600 mt-1 italic">"{item.motivo}"</p>
                    )}
                    {/* Action buttons for non-approved items */}
                    {item.estado === "pendente" && (
                      <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openRejeitar(item)}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-medium"
                        >
                          ✕ Rejeitar
                        </button>
                        <button
                          onClick={() => openCancelar(item)}
                          className="text-xs px-2 py-1 rounded bg-ink-100 text-ink-600 hover:bg-ink-200 font-medium"
                        >
                          🚫 Cancelar
                        </button>
                      </div>
                    )}
                    {item.estado === "rejeitado" && (
                      <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openDeleteAprovacao(item)}
                          className="btn-ghost p-1 text-xs"
                          title="Eliminar pedido"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-bold text-ink-800">{item.valor} AOA</p>
                    <span className={`badge text-[10px] mt-1 ${
                      item.estado === "pendente"  ? "badge-yellow" :
                      item.estado === "aprovado"  ? "badge-green"  : "badge-red"
                    }`}>
                      {item.estado.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Painel de acção ── */}
          <div>
            {selectedItem ? (
              <div className="card sticky top-20">
                <div className="card-header bg-brand-50 border-brand-100">
                  <h3 className="text-brand-800">Aprovar / Rejeitar</h3>
                  <p className="text-xs text-brand-600 mt-0.5">{selectedItem.id}</p>
                </div>
                <div className="card-body space-y-4">
                  <div className="space-y-2 text-sm">
                    {[
                      ["Tipo",    selectedItem.tipo],
                      ["Módulo", selectedItem.modulo],
                      ["Por",    selectedItem.solicitado_por],
                      ["Valor",  selectedItem.valor + " AOA"],
                      ["Nível",  `Aprovação Nível ${selectedItem.nivel}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-ink-400 text-xs">{k}</span>
                        <span className="font-semibold text-ink-800 text-xs">{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-ink-700 border-t border-ink-100 pt-3">{selectedItem.desc}</p>

                  <div>
                    <label className="label">Comentário (obrigatório para rejeição)</label>
                    <textarea
                      className="input resize-none"
                      rows={3}
                      placeholder="Adicione um comentário…"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => approve(selectedItem.id)} className="btn-primary flex-1 justify-center text-sm">
                      ✓ Aprovar
                    </button>
                    <button
                      onClick={() => reject(selectedItem.id)}
                      disabled={!motivo.trim()}
                      className="btn-secondary text-brand-700 border-brand-200 hover:bg-brand-50 flex-1 justify-center text-sm disabled:opacity-40"
                    >
                      ✕ Rejeitar
                    </button>
                  </div>
                  <button onClick={() => { setSelected(null); setMotivo(""); }} className="btn-ghost w-full justify-center text-xs">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="card p-8 text-center border-dashed">
                <p className="text-ink-400 font-medium">Seleccione um item</p>
                <p className="text-sm text-ink-300 mt-1">Clique num pedido pendente para aprovar ou rejeitar</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function RejeitarForm({
  item,
  onRejeitar,
  onClose,
}: {
  item: Approval;
  onRejeitar: (motivo: string) => void;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="p-3 rounded-lg bg-ink-50 text-xs text-ink-600">
          <p className="font-semibold text-ink-800">{item.id} — {item.tipo}</p>
          <p className="mt-1 truncate">{item.desc}</p>
          <p className="mt-1 font-mono font-bold">{item.valor} AOA</p>
        </div>
        <div>
          <label className="label">Motivo da rejeição *</label>
          <textarea
            className="input resize-none"
            rows={4}
            placeholder="Descreva o motivo da rejeição…"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button
          onClick={() => { if (motivo.trim()) onRejeitar(motivo.trim()); }}
          disabled={!motivo.trim()}
          className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-40"
        >
          ✕ Rejeitar
        </button>
      </div>
    </div>
  );
}

function NovoPedidoForm({
  onSave,
  onClose,
}: {
  onSave: (novo: Approval) => void;
  onClose: () => void;
}) {
  const [newForm, setNewForm] = useState({ tipo:"LANÇAMENTO", desc:"", valor:"", modulo:"CONTABILIDADE", urgente:false, nivel:1 });
  function create() {
    if (!newForm.desc.trim() || !newForm.valor.trim()) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const dataStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    onSave({
      id: `AP-${Date.now()}`,
      tipo: newForm.tipo,
      desc: newForm.desc,
      solicitado_por: "Admin",
      data: dataStr,
      valor: newForm.valor,
      modulo: newForm.modulo,
      estado: "pendente",
      urgente: newForm.urgente,
      nivel: newForm.nivel,
    });
  }
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={newForm.tipo} onChange={e => setNewForm(f => ({ ...f, tipo: e.target.value }))}>
              {TIPO_OPTIONS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Módulo</label>
            <select className="input" value={newForm.modulo} onChange={e => setNewForm(f => ({ ...f, modulo: e.target.value }))}>
              {MODULO_OPTIONS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Descrição</label>
          <input className="input" placeholder="Descreva o pedido…" value={newForm.desc}
            onChange={e => setNewForm(f => ({ ...f, desc: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valor (Kz)</label>
            <input className="input font-mono" placeholder="0" value={newForm.valor}
              onChange={e => setNewForm(f => ({ ...f, valor: e.target.value }))} />
          </div>
          <div>
            <label className="label">Nível de Aprovação</label>
            <select className="input" value={newForm.nivel} onChange={e => setNewForm(f => ({ ...f, nivel: +e.target.value }))}>
              <option value={1}>Nível 1 — Contabilista</option>
              <option value={2}>Nível 2 — Gestor Fin.</option>
              <option value={3}>Nível 3 — CFO</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
          <input type="checkbox" checked={newForm.urgente}
            onChange={e => setNewForm(f => ({ ...f, urgente: e.target.checked }))} />
          Marcar como urgente
        </label>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={create} disabled={!newForm.desc.trim() || !newForm.valor.trim()}
          className="btn-primary disabled:opacity-40">
          Criar Pedido
        </button>
      </div>
    </div>
  );
}
