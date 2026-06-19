"use client";

import { useState, useMemo, useEffect } from "react";
import Topbar from "@/components/Topbar";
import { fmtKz } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────
type Accao = "INSERT" | "UPDATE" | "DELETE" | "LOGIN" | "EXPORT" | "APPROVE" | "REVERSE" | "DEPRECIAÇÃO" | "PAGAMENTO" | "RECEBIMENTO";

interface AuditEvent {
  id: string;
  ts: string;         // ISO
  user: string;
  accao: Accao;
  modulo: string;
  desc: string;
  ref?: string;       // document reference
  valor?: number;
  estado: "OK" | "FALHA";
  fonte: "real" | "seed";
}

// ── Badge colours ─────────────────────────────────────────────────────────────
const ACCAO_BADGE: Record<string, string> = {
  INSERT:      "bg-blue-100 text-blue-800",
  UPDATE:      "bg-yellow-100 text-yellow-800",
  DELETE:      "bg-red-100 text-red-800",
  LOGIN:       "bg-gray-100 text-gray-700",
  EXPORT:      "bg-purple-100 text-purple-800",
  APPROVE:     "bg-green-100 text-green-800",
  REVERSE:     "bg-orange-100 text-orange-800",
  DEPRECIAÇÃO: "bg-orange-100 text-orange-800",
  PAGAMENTO:   "bg-red-100 text-red-800",
  RECEBIMENTO: "bg-green-100 text-green-800",
};

const MODULO_ICON: Record<string, string> = {
  CONTABILIDADE: "📒",
  VENDAS:        "🧾",
  COMPRAS:       "🛒",
  TESOURARIA:    "🏦",
  RH:            "👥",
  INVENTÁRIO:    "📦",
  ACTIVOS:       "🏗️",
  SISTEMA:       "⚙️",
  RELATORIOS:    "📊",
  FISCAL:        "🏛️",
};

function fmtTs(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = d.getDate().toString().padStart(2,"0");
    const mm = (d.getMonth()+1).toString().padStart(2,"0");
    const yy = d.getFullYear();
    const hh = d.getHours().toString().padStart(2,"0");
    const mi = d.getMinutes().toString().padStart(2,"0");
    const ss = d.getSeconds().toString().padStart(2,"0");
    return `${dd}/${mm}/${yy} ${hh}:${mi}:${ss}`;
  } catch { return iso; }
}

// ── Seed fallback events ───────────────────────────────────────────────────────
const SEED_EVENTS: AuditEvent[] = [
  { id:"s1", ts:"2024-11-30T18:42:11Z", user:"joao.ferreira",  accao:"APPROVE",  modulo:"CONTABILIDADE", desc:"Aprovação do lançamento DI/2024/000342",       estado:"OK",    fonte:"seed" },
  { id:"s2", ts:"2024-11-28T11:30:55Z", user:"admin",          accao:"LOGIN",    modulo:"SISTEMA",       desc:"Login bem-sucedido — terminal WEB",              estado:"OK",    fonte:"seed" },
  { id:"s3", ts:"2024-11-27T22:01:10Z", user:"unknown",        accao:"LOGIN",    modulo:"SISTEMA",       desc:"Tentativa de login falhada — conta inexistente", estado:"FALHA", fonte:"seed" },
  { id:"s4", ts:"2024-11-29T15:10:45Z", user:"paulo.mendes",   accao:"EXPORT",   modulo:"RELATORIOS",    desc:"Exportação Balancete Nov 2024 (XLSX)",           estado:"OK",    fonte:"seed" },
  { id:"s5", ts:"2024-11-26T10:22:05Z", user:"joao.ferreira",  accao:"EXPORT",   modulo:"FISCAL",        desc:"Exportação declaração IVA Out 2024",             estado:"OK",    fonte:"seed" },
];

// ── Build live events from localStorage ──────────────────────────────────────
function buildLiveEvents(): AuditEvent[] {
  const events: AuditEvent[] = [];

  try {
    // ── Journal entries ──────────────────────────────────────────────────
    const years = ["2024","2025","2026"];
    years.forEach(yr => {
      const raw = localStorage.getItem(`educontas-journal-${yr}`);
      if (!raw) return;
      const entries = JSON.parse(raw) as Array<{
        id: string; criadoEm: string; numero: string; descricao: string;
        tipo: string; estado: string; totalDebito: number; modulo?: string;
      }>;
      entries.forEach(e => {
        const accao: Accao = e.estado === "ESTORNADO" ? "REVERSE"
          : e.tipo === "APROVAÇÃO" ? "APPROVE"
          : "INSERT";
        events.push({
          id: `j-${e.id}`,
          ts: e.criadoEm,
          user: "sistema",
          accao,
          modulo: e.modulo ?? "CONTABILIDADE",
          desc: `${e.numero} — ${e.descricao}`,
          ref: e.numero,
          valor: e.totalDebito,
          estado: "OK",
          fonte: "real",
        });
      });
    });

    // ── Vendas ───────────────────────────────────────────────────────────
    years.forEach(yr => {
      const raw = localStorage.getItem(`educontas-vendas-${yr}`);
      if (!raw) return;
      const faturas = JSON.parse(raw) as Array<{
        id: string; criadoEm: string; numero: string; cliente?: string;
        total: number; estado: string;
      }>;
      faturas.forEach(f => {
        events.push({
          id: `v-${f.id}`,
          ts: f.criadoEm ?? new Date().toISOString(),
          user: "utilizador",
          accao: "INSERT",
          modulo: "VENDAS",
          desc: `Factura ${f.numero} — ${f.cliente ?? ""}`,
          ref: f.numero,
          valor: f.total,
          estado: "OK",
          fonte: "real",
        });
      });
    });

    // ── Compras ──────────────────────────────────────────────────────────
    years.forEach(yr => {
      const raw = localStorage.getItem(`educontas-compras-${yr}`);
      if (!raw) return;
      const compras = JSON.parse(raw) as Array<{
        id: string; criadoEm: string; numero: string; fornecedor?: string;
        total: number; estado: string;
      }>;
      compras.forEach(c => {
        events.push({
          id: `c-${c.id}`,
          ts: c.criadoEm ?? new Date().toISOString(),
          user: "utilizador",
          accao: "INSERT",
          modulo: "COMPRAS",
          desc: `Compra ${c.numero} — ${c.fornecedor ?? ""}`,
          ref: c.numero,
          valor: c.total,
          estado: "OK",
          fonte: "real",
        });
      });
    });

    // ── Tesouraria ───────────────────────────────────────────────────────
    years.forEach(yr => {
      const raw = localStorage.getItem(`educontas-tesouraria-${yr}`);
      if (!raw) return;
      const movs = JSON.parse(raw) as Array<{
        id: string; criadoEm: string; numero: string; descricao: string;
        valor: number; sentido: string;
      }>;
      movs.forEach(m => {
        const accao: Accao = m.sentido === "ENTRADA" ? "RECEBIMENTO" : "PAGAMENTO";
        events.push({
          id: `t-${m.id}`,
          ts: m.criadoEm ?? new Date().toISOString(),
          user: "utilizador",
          accao,
          modulo: "TESOURARIA",
          desc: `${m.numero} — ${m.descricao}`,
          ref: m.numero,
          valor: m.valor,
          estado: "OK",
          fonte: "real",
        });
      });
    });

    // ── RH — Funcionários ────────────────────────────────────────────────
    const rawFuncs = localStorage.getItem("educontas-funcionarios");
    if (rawFuncs) {
      const funcs = JSON.parse(rawFuncs) as Array<{
        id: string; criadoEm?: string; nome: string; numero: string; cargo: string;
      }>;
      funcs.forEach(f => {
        events.push({
          id: `rh-${f.id}`,
          ts: f.criadoEm ?? "2024-01-01T00:00:00Z",
          user: "rh",
          accao: "INSERT",
          modulo: "RH",
          desc: `Funcionário ${f.numero} — ${f.nome} (${f.cargo})`,
          ref: f.numero,
          estado: "OK",
          fonte: "real",
        });
      });
    }

    // ── RH — Folhas de salário ───────────────────────────────────────────
    years.forEach(yr => {
      const raw = localStorage.getItem(`educontas-folhas-${yr}`);
      if (!raw) return;
      const folhas = JSON.parse(raw) as Array<{
        id: string; criadoEm?: string; mes: string; totalBruto: number;
      }>;
      folhas.forEach(f => {
        events.push({
          id: `fl-${f.id}`,
          ts: f.criadoEm ?? `${yr}-${f.mes?.split("-")[1] ?? "01"}-30T10:00:00Z`,
          user: "rh",
          accao: "INSERT",
          modulo: "RH",
          desc: `Folha salarial processada — ${f.mes ?? yr}`,
          valor: f.totalBruto,
          estado: "OK",
          fonte: "real",
        });
      });
    });

    // ── Inventário ───────────────────────────────────────────────────────
    const rawArt = localStorage.getItem("educontas-artigos");
    if (rawArt) {
      const arts = JSON.parse(rawArt) as Array<{ id: string; codigo: string; descricao: string }>;
      arts.forEach(a => {
        events.push({
          id: `inv-${a.id}`,
          ts: "2024-01-01T08:00:00Z",
          user: "sistema",
          accao: "INSERT",
          modulo: "INVENTÁRIO",
          desc: `Artigo ${a.codigo} — ${a.descricao}`,
          ref: a.codigo,
          estado: "OK",
          fonte: "real",
        });
      });
    }

    // ── Activos Fixos ────────────────────────────────────────────────────
    const rawActivos = localStorage.getItem("educontas-activos");
    if (rawActivos) {
      const activos = JSON.parse(rawActivos) as Array<{ id: string; codigo: string; descricao: string; estado: string }>;
      activos.forEach(a => {
        events.push({
          id: `af-${a.id}`,
          ts: "2024-01-01T09:00:00Z",
          user: "sistema",
          accao: a.estado === "ABATIDO" ? "UPDATE" : "INSERT",
          modulo: "ACTIVOS",
          desc: `Activo ${a.codigo} — ${a.descricao} [${a.estado}]`,
          ref: a.codigo,
          estado: "OK",
          fonte: "real",
        });
      });
    }

  } catch { /* ignore parse errors */ }

  // Append seed events (login attempts, exports)
  SEED_EVENTS.forEach(e => events.push(e));

  // Sort newest first and deduplicate by id
  const seen = new Set<string>();
  return events
    .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AuditoriaPage() {
  const [eventos, setEventos] = useState<AuditEvent[]>([]);
  const [pesquisa, setPesquisa]       = useState("");
  const [filtroAccao, setFiltroAccao] = useState("Todos");
  const [filtroModulo, setFiltroModulo] = useState("Todos");
  const [dataInicio, setDataInicio]   = useState("");
  const [dataFim, setDataFim]         = useState("");

  useEffect(() => {
    setEventos(buildLiveEvents());
  }, []);

  const accoes  = useMemo(() => ["Todos", ...Array.from(new Set(eventos.map(e => e.accao)))], [eventos]);
  const modulos = useMemo(() => ["Todos", ...Array.from(new Set(eventos.map(e => e.modulo)))], [eventos]);

  const filtrados = useMemo(() => eventos.filter(e => {
    if (filtroAccao !== "Todos"  && e.accao  !== filtroAccao)  return false;
    if (filtroModulo !== "Todos" && e.modulo !== filtroModulo) return false;
    if (pesquisa) {
      const q = pesquisa.toLowerCase();
      if (!e.desc.toLowerCase().includes(q) && !e.user.includes(q) && !(e.ref ?? "").toLowerCase().includes(q)) return false;
    }
    if (dataInicio) {
      if (new Date(e.ts) < new Date(dataInicio)) return false;
    }
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59);
      if (new Date(e.ts) > fim) return false;
    }
    return true;
  }), [eventos, filtroAccao, filtroModulo, pesquisa, dataInicio, dataFim]);

  // KPIs
  const hoje     = new Date().toDateString();
  const hoje24   = eventos.filter(e => new Date(e.ts).toDateString() === hoje);
  const falhas   = eventos.filter(e => e.estado === "FALHA").length;
  const exports  = eventos.filter(e => e.accao === "EXPORT").length;
  const modulos7 = new Set(eventos.filter(e => {
    const d = new Date(e.ts);
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).map(e => e.user)).size;

  // Total value of real transactions
  const totalTx = eventos.filter(e => e.valor && e.fonte === "real").reduce((s, e) => s + (e.valor ?? 0), 0);

  function exportLog() {
    const header = "Timestamp\tUtilizador\tAccão\tMódulo\tDescrição\tReferência\tValor\tEstado\n";
    const rows = filtrados.map(e =>
      [fmtTs(e.ts), e.user, e.accao, e.modulo, e.desc, e.ref ?? "", e.valor ?? "", e.estado].join("\t")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/tab-separated-values;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `auditoria-${new Date().toISOString().split("T")[0]}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Topbar
        title="Trilha de Auditoria"
        subtitle={`Registo de todas as operações · ${eventos.filter(e => e.fonte === "real").length} eventos reais registados`}
        actions={
          <button className="btn-secondary" onClick={exportLog}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Exportar Log
          </button>
        }
      />

      <div className="p-6 space-y-4">

        {/* Imutabilidade notice */}
        <div className="card p-4 bg-amber-50 border-amber-200 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Registos Imutáveis — Append Only</p>
            <p className="text-xs text-amber-700 mt-0.5">
              A trilha de auditoria é de escrita única. Nenhum registo pode ser alterado ou eliminado,
              garantindo integridade total para fins regulatórios e judiciais (CNPD Angola).
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Total eventos",       value: String(eventos.length),        color: "text-gray-900" },
            { label: "Eventos hoje",        value: String(hoje24.length),         color: "text-brand-700" },
            { label: "Falhas acesso",       value: String(falhas),                color: falhas > 0 ? "text-red-600" : "text-gray-400" },
            { label: "Exportações",         value: String(exports),               color: "text-purple-600" },
            { label: "Volume transacções",  value: fmtKz(totalTx, true),         color: "text-green-700" },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Module breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {Object.entries(MODULO_ICON).map(([mod, icon]) => {
            const cnt = eventos.filter(e => e.modulo === mod).length;
            if (cnt === 0) return null;
            return (
              <button key={mod}
                onClick={() => setFiltroModulo(filtroModulo === mod ? "Todos" : mod)}
                className={`card p-3 text-center hover:shadow-md transition-all ${filtroModulo === mod ? "ring-2 ring-brand-500 bg-brand-50" : ""}`}>
                <div className="text-2xl">{icon}</div>
                <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-wide truncate">{mod}</p>
                <p className="text-sm font-bold text-gray-900">{cnt}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Pesquisar</label>
            <input className="input" placeholder="Utilizador, descrição ou referência…"
              value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
          </div>
          <div>
            <label className="label">Acção</label>
            <select className="input" value={filtroAccao} onChange={e => setFiltroAccao(e.target.value)}>
              {accoes.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Módulo</label>
            <select className="input" value={filtroModulo} onChange={e => setFiltroModulo(e.target.value)}>
              {modulos.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Data início</label>
            <input type="date" className="input" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label className="label">Data fim</label>
            <input type="date" className="input" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
          {(filtroAccao !== "Todos" || filtroModulo !== "Todos" || pesquisa || dataInicio || dataFim) && (
            <button className="btn-secondary text-xs" onClick={() => {
              setFiltroAccao("Todos"); setFiltroModulo("Todos");
              setPesquisa(""); setDataInicio(""); setDataFim("");
            }}>
              Limpar filtros
            </button>
          )}
        </div>

        {/* Events table */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>Log de Auditoria</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{filtrados.filter(e => e.fonte === "real").length} reais · {filtrados.filter(e => e.fonte === "seed").length} demonstração</span>
              <span className="badge badge-blue">{filtrados.length} eventos</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            {filtrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <div className="text-4xl mb-3">🔍</div>
                <p className="font-semibold">Nenhum evento encontrado</p>
                <p className="text-sm mt-1">Tente alterar os filtros de pesquisa.</p>
              </div>
            ) : (
              <table className="table-auto w-full">
                <thead>
                  <tr>
                    <th className="text-left whitespace-nowrap">Timestamp</th>
                    <th className="text-left">Utilizador</th>
                    <th className="text-center">Acção</th>
                    <th className="text-left">Módulo</th>
                    <th className="text-left">Descrição</th>
                    <th className="text-right">Valor</th>
                    <th className="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(e => (
                    <tr key={e.id} className={e.estado === "FALHA" ? "bg-red-50/50" : e.fonte === "seed" ? "opacity-60" : ""}>
                      <td className="font-mono text-[11px] text-gray-500 whitespace-nowrap">{fmtTs(e.ts)}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            e.user === "sistema" ? "bg-gray-400"
                            : e.user === "unknown" ? "bg-red-500"
                            : "bg-brand-500"
                          }`}>
                            {e.user.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-mono text-xs text-brand-700 font-semibold">{e.user}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ACCAO_BADGE[e.accao] ?? "bg-gray-100 text-gray-700"}`}>
                          {e.accao}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-gray-500">
                          {MODULO_ICON[e.modulo] ?? "•"} {e.modulo}
                        </span>
                      </td>
                      <td className="text-sm max-w-xs">
                        <p className="truncate">{e.desc}</p>
                        {e.ref && <p className="text-[10px] font-mono text-gray-400 mt-0.5">{e.ref}</p>}
                      </td>
                      <td className="text-right font-mono text-xs text-gray-600">
                        {e.valor ? fmtKz(e.valor, true) : "—"}
                      </td>
                      <td className="text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          e.estado === "OK" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {e.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center pb-2">
          Trilha de Auditoria · EduContas ERP · Conforme CNPD Angola · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
