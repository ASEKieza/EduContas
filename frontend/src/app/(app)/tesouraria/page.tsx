"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Topbar from "@/components/Topbar";
import { useJournal, JOURNAL_ACCOUNTS, type PGCAAccount } from "@/lib/journal";
import { useCollection } from "@/lib/useCollection";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { useWindowManager } from "@/lib/windowManager";

// ── Types ──────────────────────────────────────────────────────────────────────
type MovTipo = "RECEBIMENTO" | "PAGAMENTO" | "EMPRÉSTIMO" | "TRANSFERÊNCIA" | "OUTRO";

interface MovTesouraria {
  id: string;
  numero: string;
  data: string;
  descricao: string;
  tipo: MovTipo;
  sentido: "ENTRADA" | "SAÍDA";
  contaCod: string;
  contaNome: string;
  contrapartidaCod: string;
  contrapartidaNome: string;
  valor: number;
  estado: "REGISTADO" | "CONCILIADO" | "ANULADO";
  diarioRef?: string;
  criadoEm: string;
}

// ── Bank accounts list ────────────────────────────────────────────────────────
const CONTAS_BANCARIAS = [
  { cod: "43.1", nome: "Banco BFA — C/C" },
  { cod: "43.2", nome: "Banco BIC — C/C" },
  { cod: "43.3", nome: "Banco BAI — C/C" },
  { cod: "43.4", nome: "Banco Millennium — C/C" },
  { cod: "43.9", nome: "Outros depósitos bancários" },
  { cod: "45.1", nome: "Caixa Principal — Kz" },
  { cod: "45.2", nome: "Caixa em divisas (USD)" },
];

const CONTRAPARTIDA_DEFAULTS: Record<MovTipo, string> = {
  RECEBIMENTO:   "31.1.2.1",
  PAGAMENTO:     "32.1.2.1",
  EMPRÉSTIMO:    "33.1.1.1",
  TRANSFERÊNCIA: "43.3",
  OUTRO:         "",
};

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_MOV_2024: MovTesouraria[] = [
  {
    id: "t-341", numero: "RE/2024/000341", data: "2024-11-30",
    descricao: "Recebimento FT/2024/001201 — Petrangol SA",
    tipo: "RECEBIMENTO", sentido: "ENTRADA",
    contaCod: "43.1", contaNome: "Banco BFA — C/C",
    contrapartidaCod: "31.1.2.1", contrapartidaNome: "Clientes Nacionais — correntes",
    valor: 11400000, estado: "REGISTADO", criadoEm: "2024-11-30T11:00:00Z",
  },
  {
    id: "t-340", numero: "PG/2024/000340", data: "2024-11-29",
    descricao: "Pagamento ABC Lda. — Ref.C-0891",
    tipo: "PAGAMENTO", sentido: "SAÍDA",
    contaCod: "43.1", contaNome: "Banco BFA — C/C",
    contrapartidaCod: "32.1.2.1", contrapartidaNome: "Fornecedores Nacionais — correntes",
    valor: 5700000, estado: "REGISTADO", criadoEm: "2024-11-29T15:00:00Z",
  },
  {
    id: "t-335", numero: "TR/2024/000335", data: "2024-11-27",
    descricao: "Empréstimo BAI — Ref.EMP-0044",
    tipo: "EMPRÉSTIMO", sentido: "ENTRADA",
    contaCod: "43.3", contaNome: "Banco BAI — C/C",
    contrapartidaCod: "33.1.1.1", contrapartidaNome: "Empréstimos bancários — moeda nacional",
    valor: 50000000, estado: "REGISTADO", criadoEm: "2024-11-27T10:00:00Z",
  },
  {
    id: "t-332", numero: "RE/2024/000332", data: "2024-11-25",
    descricao: "Recebimento parcial FT/2024/001198 — BFA",
    tipo: "RECEBIMENTO", sentido: "ENTRADA",
    contaCod: "43.1", contaNome: "Banco BFA — C/C",
    contrapartidaCod: "31.1.2.1", contrapartidaNome: "Clientes Nacionais — correntes",
    valor: 7125000, estado: "REGISTADO", criadoEm: "2024-11-25T09:00:00Z",
  },
  {
    id: "t-328", numero: "PG/2024/000328", data: "2024-11-22",
    descricao: "IRT Outubro 2024 — AGT",
    tipo: "PAGAMENTO", sentido: "SAÍDA",
    contaCod: "43.1", contaNome: "Banco BFA — C/C",
    contrapartidaCod: "34.3.1", contrapartidaNome: "Imposto de Rendimento do Trabalho (IRT)",
    valor: 3200000, estado: "REGISTADO", criadoEm: "2024-11-22T10:00:00Z",
  },
  {
    id: "t-325", numero: "PG/2024/000325", data: "2024-11-20",
    descricao: "Folha salarial Outubro 2024",
    tipo: "PAGAMENTO", sentido: "SAÍDA",
    contaCod: "43.1", contaNome: "Banco BFA — C/C",
    contrapartidaCod: "36.1.2.1", contrapartidaNome: "Remunerações a pagar — Empregados",
    valor: 42000000, estado: "REGISTADO", criadoEm: "2024-11-20T08:00:00Z",
  },
  {
    id: "t-318", numero: "RE/2024/000318", data: "2024-11-15",
    descricao: "Recebimento FT/2024/001195 — Angola Cables",
    tipo: "RECEBIMENTO", sentido: "ENTRADA",
    contaCod: "43.1", contaNome: "Banco BFA — C/C",
    contrapartidaCod: "31.1.2.1", contrapartidaNome: "Clientes Nacionais — correntes",
    valor: 5700000, estado: "CONCILIADO", criadoEm: "2024-11-15T14:00:00Z",
  },
  {
    id: "t-310", numero: "PG/2024/000310", data: "2024-11-10",
    descricao: "Segurança Social Outubro 2024",
    tipo: "PAGAMENTO", sentido: "SAÍDA",
    contaCod: "43.1", contaNome: "Banco BFA — C/C",
    contrapartidaCod: "34.1.1", contrapartidaNome: "Segurança Social",
    valor: 8800000, estado: "CONCILIADO", criadoEm: "2024-11-10T09:00:00Z",
  },
];

const SALDO_ABERTURA: Record<string, number> = {
  "43.1": 202_475_000,
  "43.3": 0,
  "45.1": 4_200_000,
};

// ── Hook ──────────────────────────────────────────────────────────────────────
function useTesouraria(exercicio: string) {
  const key  = `educontas-tesouraria-${exercicio}`;
  const seed = exercicio === "2024" ? SEED_MOV_2024 : [];
  const { items: movimentos, setItems: setMovimentos, loading: loaded } = useCollection<MovTesouraria>(key, seed);

  const nextSeq = useCallback((prev: MovTesouraria[], prefix: string): string => {
    const nums = prev
      .filter(m => m.numero.startsWith(prefix))
      .map(m => parseInt(m.numero.split("/")[2] ?? "0", 10))
      .filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `${prefix}/${exercicio}/${(max + 1).toString().padStart(6, "0")}`;
  }, [exercicio]);

  const addMovimento = useCallback((draft: Omit<MovTesouraria, "id" | "numero" | "criadoEm">) => {
    setMovimentos(prev => {
      const prefix = draft.sentido === "ENTRADA" ? "RE" : "PG";
      const m: MovTesouraria = {
        ...draft,
        id: crypto.randomUUID(),
        numero: nextSeq(prev, prefix),
        criadoEm: new Date().toISOString(),
      };
      return [m, ...prev];
    });
  }, [setMovimentos, nextSeq]);

  const deleteMovimento = useCallback((id: string) => {
    setMovimentos(prev => prev.filter(m => m.id !== id));
  }, [setMovimentos]);

  const updateMovimento = useCallback((id: string, patch: Partial<Pick<MovTesouraria, "descricao" | "data" | "valor" | "contaCod" | "contaNome" | "contrapartidaCod" | "contrapartidaNome" | "estado">>) => {
    setMovimentos(prev => prev.map(m => {
      if (m.id !== id) return m;
      const contaNome = patch.contaCod
        ? (CONTAS_BANCARIAS.find(c => c.cod === patch.contaCod)?.nome ?? m.contaNome)
        : m.contaNome;
      return { ...m, ...patch, contaNome };
    }));
  }, [setMovimentos]);

  return { movimentos, addMovimento, deleteMovimento, updateMovimento, loaded };
}

// ── Account Selector ──────────────────────────────────────────────────────────
function AccSelector({ value, onChange, placeholder = "Pesquisar conta…" }: {
  value: string;
  onChange: (code: string, name: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!q.trim()) return JOURNAL_ACCOUNTS.slice(0, 20);
    const lq = q.toLowerCase();
    return JOURNAL_ACCOUNTS.filter(a =>
      a.code.includes(lq) || a.name.toLowerCase().includes(lq)
    ).slice(0, 20);
  }, [q]);

  function select(a: PGCAAccount) {
    setQ(`${a.code} — ${a.name}`);
    onChange(a.code, a.name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input className="input" placeholder={placeholder} value={q}
        onChange={e => { setQ(e.target.value); setOpen(true); onChange("", e.target.value); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && filtered.length > 0 && (
        <div className="absolute z-30 top-full left-0 mt-1 w-full max-h-52 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl">
          {filtered.map(a => (
            <button key={a.code} className="w-full text-left px-3 py-2 text-xs hover:bg-brand-50 border-b border-gray-50 last:border-0 font-mono"
              onMouseDown={e => { e.preventDefault(); select(a); }}>
              <span className="text-brand-700 font-bold">{a.code}</span>
              <span className="text-gray-500 ml-2">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tipo helpers ──────────────────────────────────────────────────────────────
const TIPO_LABELS: Record<MovTipo, string> = {
  RECEBIMENTO:   "Recebimento de Cliente",
  PAGAMENTO:     "Pagamento a Fornecedor / Despesa",
  EMPRÉSTIMO:    "Empréstimo Bancário",
  TRANSFERÊNCIA: "Transferência entre Contas",
  OUTRO:         "Outro Movimento",
};

const TIPO_SENTIDO: Record<MovTipo, "ENTRADA" | "SAÍDA"> = {
  RECEBIMENTO:   "ENTRADA",
  PAGAMENTO:     "SAÍDA",
  EMPRÉSTIMO:    "ENTRADA",
  TRANSFERÊNCIA: "ENTRADA",
  OUTRO:         "ENTRADA",
};

// ── Novo Movimento Modal ──────────────────────────────────────────────────────
function NovoMovModal({ exercicio, onClose, onSave }: {
  exercicio: string;
  onClose: () => void;
  onSave: (draft: Omit<MovTesouraria, "id" | "numero" | "criadoEm">, gerar: boolean) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const defaultDate = exercicio === new Date().getFullYear().toString() ? today : `${exercicio}-11-30`;

  const [tipo, setTipo] = useState<MovTipo>("RECEBIMENTO");
  const [sentido, setSentido] = useState<"ENTRADA" | "SAÍDA">("ENTRADA");
  const [data, setData] = useState(defaultDate);
  const [descricao, setDescricao] = useState("");
  const [contaCod, setContaCod] = useState("43.1");
  const [contrapartidaCod, setContrapartidaCod] = useState("31.1.2.1");
  const [contrapartidaNome, setContrapartidaNome] = useState("Clientes Nacionais — correntes");
  const [valor, setValor] = useState("");
  const [gerar, setGerar] = useState(true);

  function handleTipo(t: MovTipo) {
    setTipo(t);
    setSentido(TIPO_SENTIDO[t]);
    const defCod = CONTRAPARTIDA_DEFAULTS[t];
    if (defCod) {
      const acc = JOURNAL_ACCOUNTS.find(a => a.code === defCod);
      if (acc) { setContrapartidaCod(acc.code); setContrapartidaNome(acc.name); }
    }
  }

  const contaBancaria = CONTAS_BANCARIAS.find(c => c.cod === contaCod);
  const v = +valor || 0;
  const valid = descricao.trim().length > 0 && v > 0 && contrapartidaCod.length > 0;

  const debitoLabel  = sentido === "ENTRADA" ? `${contaCod} — ${contaBancaria?.nome}` : `${contrapartidaCod} — ${contrapartidaNome}`;
  const creditoLabel = sentido === "ENTRADA" ? `${contrapartidaCod} — ${contrapartidaNome}` : `${contaCod} — ${contaBancaria?.nome}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <label className="label">Tipo de Movimento *</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TIPO_LABELS) as MovTipo[]).map(t => (
                <button key={t}
                  className={`text-xs px-3 py-2.5 rounded-lg border font-medium text-left transition-colors ${
                    tipo === t
                      ? "bg-brand-50 border-brand-400 text-brand-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => handleTipo(t)}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${TIPO_SENTIDO[t] === "ENTRADA" ? "bg-green-400" : "bg-red-400"}`}></span>
                  {TIPO_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {(tipo === "OUTRO" || tipo === "TRANSFERÊNCIA") && (
            <div>
              <label className="label">Sentido</label>
              <div className="flex gap-2">
                {(["ENTRADA", "SAÍDA"] as const).map(s => (
                  <button key={s}
                    className={`flex-1 text-xs py-2 rounded-lg border font-medium transition-colors ${
                      sentido === s
                        ? s === "ENTRADA" ? "bg-green-50 border-green-400 text-green-700" : "bg-red-50 border-red-400 text-red-700"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => setSentido(s)}>
                    {s === "ENTRADA" ? "▲ ENTRADA" : "▼ SAÍDA"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Descrição *</label>
              <input className="input" placeholder="Descrição do movimento" value={descricao} onChange={e => setDescricao(e.target.value)} />
            </div>
            <div>
              <label className="label">Data *</label>
              <input type="date" className="input" value={data} onChange={e => setData(e.target.value)} />
            </div>
            <div>
              <label className="label">Valor (Kz) *</label>
              <input type="number" className="input" min={0} placeholder="0" value={valor} onChange={e => setValor(e.target.value)} />
            </div>
            <div>
              <label className="label">Conta Bancária</label>
              <select className="input" value={contaCod} onChange={e => setContaCod(e.target.value)}>
                {CONTAS_BANCARIAS.map(c => (
                  <option key={c.cod} value={c.cod}>{c.cod} — {c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Contrapartida</label>
              <AccSelector
                value={contrapartidaCod ? `${contrapartidaCod} — ${contrapartidaNome}` : ""}
                onChange={(code, name) => { setContrapartidaCod(code); setContrapartidaNome(name); }}
              />
            </div>
          </div>

          {gerar && v > 0 && (
            <div className="bg-brand-50 rounded-xl p-3 text-xs">
              <p className="font-semibold text-brand-800 mb-1.5">Lançamento a gerar:</p>
              <div className="space-y-0.5 font-mono text-brand-700">
                <p>D {debitoLabel}: {v.toLocaleString("pt-PT")}</p>
                <p>C {creditoLabel}: {v.toLocaleString("pt-PT")}</p>
              </div>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={gerar} onChange={e => setGerar(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-brand-600" />
            <div>
              <span className="text-sm font-medium text-gray-900">Gerar lançamento contabilístico automático</span>
              <p className="text-xs text-gray-500 mt-0.5">Regista a partida dobrada no Diário Contabilístico</p>
            </div>
          </label>
        </div>

        <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={() => {
            if (!valid) return;
            onSave({
              data, descricao: descricao.trim(), tipo, sentido,
              contaCod, contaNome: contaBancaria?.nome ?? contaCod,
              contrapartidaCod, contrapartidaNome, valor: v, estado: "REGISTADO",
            }, gerar);
          }} disabled={!valid} className="btn-primary">
            Registar Movimento
          </button>
        </div>
      </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditMovModal({ mov, onClose, onSave }: {
  mov: MovTesouraria;
  onClose: () => void;
  onSave: (patch: Partial<Pick<MovTesouraria, "descricao" | "data" | "valor" | "contaCod" | "contaNome" | "contrapartidaCod" | "contrapartidaNome" | "estado">>) => void;
}) {
  const [descricao, setDescricao] = useState(mov.descricao);
  const [data, setData]           = useState(mov.data);
  const [valor, setValor]         = useState(String(mov.valor));
  const [estado, setEstado]       = useState<MovTesouraria["estado"]>(mov.estado);
  const [contaCod, setContaCod]   = useState(mov.contaCod);

  const valid = descricao.trim().length > 0 && +valor > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            ⚠️ Edições disponíveis para movimentos REGISTADOS. Para movimentos CONCILIADOS só é possível alterar o estado.
          </div>

          <div>
            <label className="label">Descrição *</label>
            <input className="input" value={descricao} onChange={e => setDescricao(e.target.value)} disabled={mov.estado === "CONCILIADO"} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data *</label>
              <input type="date" className="input" value={data} onChange={e => setData(e.target.value)} disabled={mov.estado === "CONCILIADO"} />
            </div>
            <div>
              <label className="label">Valor (Kz) *</label>
              <input type="number" className="input" min={0} value={valor} onChange={e => setValor(e.target.value)} disabled={mov.estado === "CONCILIADO"} />
            </div>
            <div>
              <label className="label">Conta Bancária</label>
              <select className="input" value={contaCod} onChange={e => setContaCod(e.target.value)} disabled={mov.estado === "CONCILIADO"}>
                {CONTAS_BANCARIAS.map(c => (
                  <option key={c.cod} value={c.cod}>{c.cod} — {c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={estado} onChange={e => setEstado(e.target.value as MovTesouraria["estado"])}>
                <option value="REGISTADO">REGISTADO</option>
                <option value="CONCILIADO">CONCILIADO</option>
                <option value="ANULADO">ANULADO</option>
              </select>
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button disabled={!valid} onClick={() => {
            const contaNome = CONTAS_BANCARIAS.find(c => c.cod === contaCod)?.nome ?? mov.contaNome;
            onSave({ descricao: descricao.trim(), data, valor: +valor, contaCod, contaNome, estado });
          }} className="btn-primary">Guardar</button>
        </div>
      </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ mov, onClose, onConfirm }: {
  mov: MovTesouraria;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Eliminar Movimento?</h3>
          <p className="text-sm text-gray-600">
            <span className="font-mono font-semibold text-brand-700">{mov.numero}</span> — {mov.descricao}
          </p>
          <p className="text-xs text-gray-400">Esta acção não pode ser revertida.</p>
        </div>
        <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            Eliminar
          </button>
        </div>
      </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TesourariaPage() {
  const [exercicio, setExercicio] = useState(() => ANOS_DISPONIVEIS[0] ?? "2025");
  const { movimentos, addMovimento, deleteMovimento, updateMovimento, loaded } = useTesouraria(exercicio);
  const { addEntry } = useJournal(exercicio);
  const { openWindow, closeWindow } = useWindowManager();

  const [filtroTipo, setFiltroTipo]   = useState("Todos");
  const [filtroConta, setFiltroConta] = useState("Todas");

  useEffect(() => { setFiltroTipo("Todos"); setFiltroConta("Todas"); }, [exercicio]);

  const filtrados = useMemo(() => movimentos.filter(m => {
    if (filtroTipo !== "Todos" && m.sentido !== filtroTipo) return false;
    if (filtroConta !== "Todas" && m.contaCod !== filtroConta) return false;
    return true;
  }), [movimentos, filtroTipo, filtroConta]);

  const saldosPorConta = useMemo(() => {
    const map: Record<string, number> = {};
    CONTAS_BANCARIAS.forEach(c => { map[c.cod] = SALDO_ABERTURA[c.cod] ?? 0; });
    movimentos.filter(m => m.estado !== "ANULADO").forEach(m => {
      if (m.contaCod in map) {
        map[m.contaCod] += m.sentido === "ENTRADA" ? m.valor : -m.valor;
      }
    });
    return map;
  }, [movimentos]);

  const totalEntradas  = useMemo(() => movimentos.filter(m => m.sentido === "ENTRADA" && m.estado !== "ANULADO").reduce((s, m) => s + m.valor, 0), [movimentos]);
  const totalSaidas    = useMemo(() => movimentos.filter(m => m.sentido === "SAÍDA"   && m.estado !== "ANULADO").reduce((s, m) => s + m.valor, 0), [movimentos]);
  const saldoTotal     = useMemo(() => Object.values(saldosPorConta).reduce((s, v) => s + v, 0), [saldosPorConta]);

  function handleOpenNovo() {
    const winId = `tesouraria-novo-${crypto.randomUUID()}`;
    openWindow({
      id: winId,
      title: "Novo Movimento de Tesouraria",
      icon: "💳",
      content: <NovoMovModal exercicio={exercicio} onClose={() => closeWindow(winId)} onSave={(d, g) => { handleSave(d, g); closeWindow(winId); }} />,
      x: 40, y: 20,
      width: 720, height: 520,
      minimized: false, maximized: false,
    });
  }

  function handleOpenEdit(m: MovTesouraria) {
    const winId = `tesouraria-edit-${m.id}`;
    openWindow({
      id: winId,
      title: `Editar Movimento — ${m.numero}`,
      icon: "✏️",
      content: <EditMovModal mov={m} onClose={() => closeWindow(winId)} onSave={patch => { updateMovimento(m.id, patch); closeWindow(winId); }} />,
      x: 60, y: 40,
      width: 560, height: 380,
      minimized: false, maximized: false,
    });
  }

  function handleOpenDelete(m: MovTesouraria) {
    const winId = `tesouraria-del-${m.id}`;
    openWindow({
      id: winId,
      title: "Eliminar Movimento",
      icon: "⚠️",
      content: <DeleteConfirm mov={m} onClose={() => closeWindow(winId)} onConfirm={() => { deleteMovimento(m.id); closeWindow(winId); }} />,
      x: 80, y: 60,
      width: 480, height: 240,
      minimized: false, maximized: false,
    });
  }

  function handleSave(draft: Omit<MovTesouraria, "id" | "numero" | "criadoEm">, gerar: boolean) {
    addMovimento(draft);
    if (gerar && draft.valor > 0 && draft.contrapartidaCod) {
      const banco = JOURNAL_ACCOUNTS.find(a => a.code === draft.contaCod) ??
        { code: draft.contaCod, name: draft.contaNome, nature: "devedora" as const, classe: 4 };
      const contra = JOURNAL_ACCOUNTS.find(a => a.code === draft.contrapartidaCod) ??
        { code: draft.contrapartidaCod, name: draft.contrapartidaNome, nature: "devedora" as const, classe: 3 };

      const debitoCod   = draft.sentido === "ENTRADA" ? banco.code  : contra.code;
      const debitoNome  = draft.sentido === "ENTRADA" ? banco.name  : contra.name;
      const creditoCod  = draft.sentido === "ENTRADA" ? contra.code : banco.code;
      const creditoNome = draft.sentido === "ENTRADA" ? contra.name : banco.name;

      addEntry({
        data: draft.data,
        descricao: draft.descricao,
        tipo: draft.tipo === "RECEBIMENTO" ? "RECEBIMENTO" : draft.tipo === "EMPRÉSTIMO" ? "EMPRÉSTIMO" : "PAGAMENTO",
        modulo: "TESOURARIA",
        linhas: [
          { conta: `${debitoCod} — ${debitoNome}`,   contaCod: debitoCod,  descricao: draft.descricao, debito: draft.valor, credito: 0 },
          { conta: `${creditoCod} — ${creditoNome}`, contaCod: creditoCod, descricao: draft.descricao, debito: 0, credito: draft.valor },
        ],
        totalDebito: draft.valor, totalCredito: draft.valor, estado: "LANÇADO",
      });
    }
  }

  if (!loaded) return null;

  return (
    <div>
      <Topbar
        title="Tesouraria"
        subtitle="Gestão de contas bancárias, caixa e fluxos de pagamento"
        actions={
          <>
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setExercicio(y)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  exercicio === y ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>{y}</button>
            ))}
            <button className="btn-primary" onClick={handleOpenNovo}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Novo Movimento
            </button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* Bank accounts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CONTAS_BANCARIAS.filter(c => ["43.1","43.3","45.1","43.2"].includes(c.cod)).map(c => {
            const saldo = saldosPorConta[c.cod] ?? 0;
            return (
              <div key={c.cod} className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFiltroConta(filtroConta === c.cod ? "Todas" : c.cod)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-brand-700 font-bold">{c.cod}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    saldo > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>DEVEDOR</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{c.nome.replace(" — C/C", "")}</p>
                <p className={`font-mono font-bold text-lg mt-1 ${saldo > 0 ? "text-gray-900" : "text-gray-400"}`}>
                  {saldo > 0 ? (saldo / 1e6).toFixed(2) + "M" : "—"}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Kz</p>
              </div>
            );
          })}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 border-l-4 border-green-400">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Entradas ({exercicio})</p>
            <p className="text-xl font-bold text-green-600 mt-1">{(totalEntradas / 1e6).toFixed(2)}M Kz</p>
          </div>
          <div className="card p-4 border-l-4 border-red-400">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Saídas ({exercicio})</p>
            <p className="text-xl font-bold text-red-600 mt-1">{(totalSaidas / 1e6).toFixed(2)}M Kz</p>
          </div>
          <div className="card p-4 border-l-4 border-brand-400">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo Disponível</p>
            <p className="text-xl font-bold text-brand-700 mt-1">{(saldoTotal / 1e6).toFixed(2)}M Kz</p>
          </div>
        </div>

        {/* Movements table */}
        <div className="card">
          <div className="card-header flex flex-wrap items-center gap-3">
            <h3 className="flex-1">Movimentos de Tesouraria — {exercicio}</h3>
            <div className="flex gap-2 flex-wrap">
              {["Todos","ENTRADA","SAÍDA"].map(t => (
                <button key={t} onClick={() => setFiltroTipo(t)}
                  className={filtroTipo === t ? "btn-primary py-1 px-3 text-xs" : "btn-secondary py-1 px-3 text-xs"}>
                  {t}
                </button>
              ))}
              <select className="input py-1 text-xs max-w-[160px]" value={filtroConta}
                onChange={e => setFiltroConta(e.target.value)}>
                <option value="Todas">Todas as contas</option>
                {CONTAS_BANCARIAS.map(c => <option key={c.cod} value={c.cod}>{c.cod}</option>)}
              </select>
            </div>
            <span className="badge badge-blue">{filtrados.length} mov.</span>
          </div>
          <div className="overflow-x-auto">
            {filtrados.length === 0 ? (
              <div className="flex items-center justify-center py-14 text-gray-400 text-sm">
                {movimentos.length === 0
                  ? "Nenhum movimento registado. Clique em «Novo Movimento» para começar."
                  : "Nenhum movimento corresponde ao filtro seleccionado."}
              </div>
            ) : (
              <table className="table-auto w-full">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Documento</th>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th>Conta</th>
                    <th className="text-right">Valor (Kz)</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(m => (
                    <tr key={m.id} className={m.estado === "ANULADO" ? "opacity-50" : ""}>
                      <td className="text-xs text-gray-500 whitespace-nowrap">{m.data}</td>
                      <td className="font-mono text-xs text-brand-700 font-semibold whitespace-nowrap">{m.numero}</td>
                      <td className="text-sm max-w-xs truncate">{m.descricao}</td>
                      <td>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          m.sentido === "ENTRADA" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {m.sentido === "ENTRADA" ? "▲ " : "▼ "}{m.tipo}
                        </span>
                      </td>
                      <td className="text-xs text-gray-500 whitespace-nowrap">{m.contaCod}</td>
                      <td className={`text-right font-mono text-sm font-semibold ${
                        m.sentido === "ENTRADA" ? "text-green-700" : "text-red-600"
                      }`}>
                        {m.sentido === "SAÍDA" ? "− " : "+ "}
                        {m.valor.toLocaleString("pt-PT")}
                      </td>
                      <td>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          m.estado === "CONCILIADO" ? "bg-green-100 text-green-800"
                          : m.estado === "ANULADO"  ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                        }`}>{m.estado}</span>
                      </td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Editar">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          {m.estado === "REGISTADO" && (
                            <button
                              onClick={() => handleOpenDelete(m)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Eliminar">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-brand-700 text-white">
                    <td colSpan={5} className="px-4 py-3 font-bold text-sm uppercase tracking-wider">
                      Totais do período
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span className="block text-green-200 text-xs">
                        + {filtrados.filter(m => m.sentido === "ENTRADA").reduce((s, m) => s + m.valor, 0).toLocaleString("pt-PT")}
                      </span>
                      <span className="block text-red-200 text-xs">
                        − {filtrados.filter(m => m.sentido === "SAÍDA").reduce((s, m) => s + m.valor, 0).toLocaleString("pt-PT")}
                      </span>
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center pb-2">
          PGCA Angola — Decreto n.º 82/01 · Exercício {exercicio} · Valores em Kwanza (Kz)
        </p>
      </div>
    </div>
  );
}
