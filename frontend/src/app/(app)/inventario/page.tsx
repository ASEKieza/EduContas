"use client";

import { useState, useMemo, useCallback } from "react";
import { useCollection } from "@/lib/useCollection";
import Topbar from "@/components/Topbar";
import { useWindowManager } from "@/lib/windowManager";
import { useJournal, JOURNAL_ACCOUNTS } from "@/lib/journal";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";

// ── Types ──────────────────────────────────────────────────────────────────────
type MetodoValorizacao = "CMP" | "FIFO";
type MovTipo = "ENTRADA" | "SAÍDA" | "AJUSTE" | "TRANSFERÊNCIA";

interface Artigo {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  custoMedio: number;
  stockAtual: number;
  stockMinimo: number;
  metodo: MetodoValorizacao;
  estado: "ACTIVO" | "DESCONTINUADO";
}

interface MovStock {
  id: string;
  data: string;
  artigoId: string;
  artCodigo: string;
  artDescricao: string;
  tipo: MovTipo;
  quantidade: number;
  custoUnit: number;
  totalCusto: number;
  descricao: string;
  docRef?: string;
  diarioRef?: string;
  criadoEm: string;
}

// ── Seed ──────────────────────────────────────────────────────────────────────
const SEED_ARTIGOS: Artigo[] = [
  { id:"p1", codigo:"PROD-001", descricao:"Computador Portátil Dell",  unidade:"UN",  custoMedio:350000,  stockAtual:12, stockMinimo:5, metodo:"CMP",  estado:"ACTIVO" },
  { id:"p2", codigo:"PROD-002", descricao:'Monitor Samsung 24"',        unidade:"UN",  custoMedio:120000,  stockAtual:8,  stockMinimo:3, metodo:"CMP",  estado:"ACTIVO" },
  { id:"p3", codigo:"PROD-003", descricao:"Teclado e Rato (Kit)",       unidade:"KIT", custoMedio:18500,   stockAtual:25, stockMinimo:10,metodo:"CMP",  estado:"ACTIVO" },
  { id:"p4", codigo:"PROD-004", descricao:"Impressora HP LaserJet",     unidade:"UN",  custoMedio:180000,  stockAtual:3,  stockMinimo:5, metodo:"FIFO", estado:"ACTIVO" },
  { id:"p5", codigo:"PROD-005", descricao:"Cabo HDMI 2m",               unidade:"UN",  custoMedio:4500,    stockAtual:50, stockMinimo:20,metodo:"CMP",  estado:"ACTIVO" },
  { id:"p6", codigo:"PROD-006", descricao:"UPS APC 1000VA",             unidade:"UN",  custoMedio:95000,   stockAtual:0,  stockMinimo:2, metodo:"FIFO", estado:"ACTIVO" },
  { id:"p7", codigo:"PROD-007", descricao:"Switch Cisco 24 portas",     unidade:"UN",  custoMedio:285000,  stockAtual:6,  stockMinimo:2, metodo:"CMP",  estado:"ACTIVO" },
];

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useArtigos() {
  const { items: artigos, setItems: setArtigos } = useCollection<Artigo>("educontas-artigos", SEED_ARTIGOS);

  const addArtigo = useCallback((draft: Omit<Artigo, "id">) => {
    setArtigos(prev => [...prev, { ...draft, id: crypto.randomUUID() }]);
  }, [setArtigos]);

  const updateArtigo = useCallback((id: string, patch: Partial<Omit<Artigo, "id">>) => {
    setArtigos(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  }, [setArtigos]);

  const deleteArtigo = useCallback((id: string) => {
    setArtigos(prev => prev.filter(a => a.id !== id));
  }, [setArtigos]);

  const updateStock = useCallback((artigoId: string, delta: number, novoCusto?: number) => {
    setArtigos(prev => prev.map(a => {
      if (a.id !== artigoId) return a;
      const novoStock = a.stockAtual + delta;
      if (delta > 0 && novoCusto !== undefined && novoCusto > 0) {
        const totalAnterior = a.stockAtual * a.custoMedio;
        const totalEntrada  = delta * novoCusto;
        const novoQtd       = novoStock > 0 ? novoStock : 1;
        const novoCMP       = Math.round((totalAnterior + totalEntrada) / novoQtd);
        return { ...a, stockAtual: novoStock, custoMedio: novoCMP };
      }
      return { ...a, stockAtual: Math.max(0, novoStock) };
    }));
  }, [setArtigos]);

  return { artigos, addArtigo, updateArtigo, deleteArtigo, updateStock };
}

function useMovStock(exercicio: string) {
  const { items: movimentos, setItems: setMovimentos } = useCollection<MovStock>(`educontas-movstock-${exercicio}`);

  const addMov = useCallback((draft: Omit<MovStock, "id" | "criadoEm">) => {
    setMovimentos(prev => [{ ...draft, id: crypto.randomUUID(), criadoEm: new Date().toISOString() }, ...prev]);
  }, [setMovimentos]);

  return { movimentos, addMov };
}

// ── Estado stock ──────────────────────────────────────────────────────────────
function stockStatus(a: Artigo) {
  if (a.stockAtual === 0) return "ESGOTADO";
  if (a.stockAtual < a.stockMinimo) return "BAIXO";
  return "OK";
}

const ESTADO_BADGE: Record<string, string> = {
  OK:       "bg-green-100 text-green-800",
  BAIXO:    "bg-yellow-100 text-yellow-800",
  ESGOTADO: "bg-red-100 text-red-800",
};

// ── Novo Artigo Modal ─────────────────────────────────────────────────────────
function NovoArtigoModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (a: Omit<Artigo, "id">) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidade, setUnidade] = useState("UN");
  const [custoMedio, setCustoMedio] = useState("");
  const [stockAtual, setStockAtual] = useState("0");
  const [stockMinimo, setStockMinimo] = useState("5");
  const [metodo, setMetodo] = useState<MetodoValorizacao>("CMP");

  const valid = codigo.trim() && descricao.trim() && +custoMedio > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Código *</label>
            <input className="input" placeholder="PROD-001" value={codigo} onChange={e => setCodigo(e.target.value)} />
          </div>
          <div>
            <label className="label">Unidade</label>
            <select className="input" value={unidade} onChange={e => setUnidade(e.target.value)}>
              {["UN","KIT","CX","KG","L","M","M2","PAR"].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Descrição *</label>
            <input className="input" placeholder="Descrição do artigo" value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
          <div>
            <label className="label">Custo Unitário (Kz) *</label>
            <input type="number" className="input" min={0} value={custoMedio} onChange={e => setCustoMedio(e.target.value)} />
          </div>
          <div>
            <label className="label">Stock Inicial</label>
            <input type="number" className="input" min={0} value={stockAtual} onChange={e => setStockAtual(e.target.value)} />
          </div>
          <div>
            <label className="label">Stock Mínimo</label>
            <input type="number" className="input" min={0} value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} />
          </div>
          <div>
            <label className="label">Método Valorização</label>
            <select className="input" value={metodo} onChange={e => setMetodo(e.target.value as MetodoValorizacao)}>
              <option value="CMP">CMP — Custo Médio Ponderado</option>
              <option value="FIFO">FIFO — First In First Out</option>
            </select>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button disabled={!valid}
          onClick={() => {
            if (!valid) return;
            onSave({ codigo: codigo.trim(), descricao: descricao.trim(), unidade, custoMedio: +custoMedio,
              stockAtual: +stockAtual, stockMinimo: +stockMinimo, metodo, estado: "ACTIVO" });
            onClose();
          }}
          className="btn-primary">Registar</button>
      </div>
    </div>
  );
}

// ── Edit Artigo Modal ─────────────────────────────────────────────────────────
function EditArtigoModal({ artigo, onClose, onSave }: {
  artigo: Artigo;
  onClose: () => void;
  onSave: (patch: Partial<Omit<Artigo, "id">>) => void;
}) {
  const [descricao, setDescricao]   = useState(artigo.descricao);
  const [unidade, setUnidade]       = useState(artigo.unidade);
  const [custoMedio, setCustoMedio] = useState(String(artigo.custoMedio));
  const [stockMinimo, setStockMinimo] = useState(String(artigo.stockMinimo));
  const [metodo, setMetodo]         = useState<MetodoValorizacao>(artigo.metodo);
  const [estado, setEstado]         = useState<Artigo["estado"]>(artigo.estado);

  const valid = descricao.trim().length > 0 && +custoMedio > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Descrição *</label>
            <input className="input" value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
          <div>
            <label className="label">Unidade</label>
            <select className="input" value={unidade} onChange={e => setUnidade(e.target.value)}>
              {["UN","KIT","CX","KG","L","M","M2","PAR"].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Custo Médio (Kz) *</label>
            <input type="number" className="input" min={0} value={custoMedio} onChange={e => setCustoMedio(e.target.value)} />
          </div>
          <div>
            <label className="label">Stock Mínimo</label>
            <input type="number" className="input" min={0} value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} />
          </div>
          <div>
            <label className="label">Método Valorização</label>
            <select className="input" value={metodo} onChange={e => setMetodo(e.target.value as MetodoValorizacao)}>
              <option value="CMP">CMP — Custo Médio Ponderado</option>
              <option value="FIFO">FIFO — First In First Out</option>
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={estado} onChange={e => setEstado(e.target.value as Artigo["estado"])}>
              <option value="ACTIVO">ACTIVO</option>
              <option value="DESCONTINUADO">DESCONTINUADO</option>
            </select>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button disabled={!valid} onClick={() => {
          onSave({ descricao: descricao.trim(), unidade, custoMedio: +custoMedio, stockMinimo: +stockMinimo, metodo, estado });
        }} className="btn-primary">Guardar</button>
      </div>
    </div>
  );
}

// ── Delete Artigo Confirm ─────────────────────────────────────────────────────
function DeleteArtigoConfirm({ artigo, onClose, onConfirm }: {
  artigo: Artigo;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-mono font-semibold text-brand-700">{artigo.codigo}</span> — {artigo.descricao}
        </p>
        <p className="text-xs text-gray-400">O historial de movimentos não será afectado.</p>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          Eliminar
        </button>
      </div>
    </div>
  );
}

// ── Movimento Modal ───────────────────────────────────────────────────────────
interface MovModalProps {
  artigo: Artigo | null;
  artigos: Artigo[];
  exercicio: string;
  onClose: () => void;
  onSave: (artigoId: string, tipo: MovTipo, qtd: number, custo: number, desc: string, docRef: string, gerar: boolean) => void;
}

function MovModal({ artigo: artigoPre, artigos, exercicio, onClose, onSave }: MovModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const defaultDate = exercicio === new Date().getFullYear().toString() ? today : `${exercicio}-11-30`;
  const [data, setData] = useState(defaultDate);
  const [artigoId, setArtigoId] = useState(artigoPre?.id ?? artigos[0]?.id ?? "");
  const [tipo, setTipo] = useState<MovTipo>("ENTRADA");
  const [quantidade, setQuantidade] = useState("1");
  const [custoUnit, setCustoUnit] = useState("");
  const [descricao, setDescricao] = useState("");
  const [docRef, setDocRef] = useState("");
  const [gerar, setGerar] = useState(true);

  const artigo = artigos.find(a => a.id === artigoId);
  const qtd    = +quantidade || 0;
  const custo  = +custoUnit || artigo?.custoMedio || 0;
  const total  = qtd * custo;
  const valid  = artigoId && qtd > 0 && descricao.trim();

  const gerarDesc = tipo === "ENTRADA"
    ? `D 26.1 Mercadorias / C 32.1.2.1 Fornecedores (${total.toLocaleString("pt-PT")} Kz)`
    : `D 71.1 CMVMC / C 26.1 Mercadorias (${total.toLocaleString("pt-PT")} Kz)`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tipo */}
        <div className="flex gap-2">
          {(["ENTRADA","SAÍDA","AJUSTE"] as MovTipo[]).map(t => (
            <button key={t} onClick={() => setTipo(t)}
              className={`flex-1 text-xs py-2 rounded-lg border font-semibold transition-colors ${
                tipo === t
                  ? t === "ENTRADA" ? "bg-green-50 border-green-400 text-green-800"
                  : t === "SAÍDA"   ? "bg-red-50 border-red-400 text-red-800"
                  : "bg-brand-50 border-brand-400 text-brand-800"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              {t === "ENTRADA" ? "▲ " : t === "SAÍDA" ? "▼ " : "± "}{t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Artigo *</label>
            <select className="input" value={artigoId} onChange={e => setArtigoId(e.target.value)}>
              {artigos.map(a => (
                <option key={a.id} value={a.id}>{a.codigo} — {a.descricao}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Data *</label>
            <input type="date" className="input" value={data} onChange={e => setData(e.target.value)} />
          </div>
          <div>
            <label className="label">Quantidade *</label>
            <input type="number" className="input" min={0} value={quantidade} onChange={e => setQuantidade(e.target.value)} />
          </div>
          <div>
            <label className="label">Custo Unit. (Kz)</label>
            <input type="number" className="input" min={0}
              placeholder={artigo ? artigo.custoMedio.toString() : "0"}
              value={custoUnit} onChange={e => setCustoUnit(e.target.value)} />
          </div>
          <div>
            <label className="label">Total</label>
            <p className="input bg-gray-50 text-gray-700 font-mono">{total.toLocaleString("pt-PT")} Kz</p>
          </div>
          <div className="col-span-2">
            <label className="label">Descrição *</label>
            <input className="input" placeholder="Descrição do movimento"
              value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label">Ref. Documento</label>
            <input className="input" placeholder="Nº da factura / guia de remessa"
              value={docRef} onChange={e => setDocRef(e.target.value)} />
          </div>
        </div>

        {artigo && tipo === "ENTRADA" && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-0.5">
            <p>Stock actual: <span className="font-semibold">{artigo.stockAtual} {artigo.unidade}</span></p>
            <p>Após entrada: <span className="font-semibold text-green-700">{artigo.stockAtual + qtd} {artigo.unidade}</span></p>
            {+custoUnit > 0 && (
              <p>Novo CMP: <span className="font-mono font-semibold">
                {artigo.stockAtual > 0
                  ? Math.round((artigo.stockAtual * artigo.custoMedio + qtd * custo) / (artigo.stockAtual + qtd)).toLocaleString("pt-PT")
                  : custo.toLocaleString("pt-PT")} Kz
              </span></p>
            )}
          </div>
        )}
        {artigo && tipo === "SAÍDA" && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-0.5">
            <p>Stock actual: <span className="font-semibold">{artigo.stockAtual} {artigo.unidade}</span></p>
            <p>Após saída: <span className={`font-semibold ${artigo.stockAtual - qtd < artigo.stockMinimo ? "text-red-700" : "text-gray-700"}`}>
              {artigo.stockAtual - qtd} {artigo.unidade}
            </span></p>
            <p>Custo CMVMC: <span className="font-mono font-semibold text-red-700">{total.toLocaleString("pt-PT")} Kz</span></p>
          </div>
        )}

        {(tipo === "ENTRADA" || tipo === "SAÍDA") && (
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={gerar} onChange={e => setGerar(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-brand-600" />
            <div>
              <span className="text-sm font-medium text-gray-900">Gerar lançamento contabilístico</span>
              <p className="text-xs text-gray-500 mt-0.5">{gerarDesc}</p>
            </div>
          </label>
        )}
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button disabled={!valid}
          onClick={() => {
            if (!valid) return;
            onSave(artigoId, tipo, qtd, custo, descricao.trim(), docRef.trim(), gerar);
          }}
          className={`${tipo === "ENTRADA" ? "btn-primary" : "bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"}`}>
          Registar {tipo}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InventarioPage() {
  const [exercicio, setExercicio] = useState(() => ANOS_DISPONIVEIS[0] ?? "2025");
  const { artigos, addArtigo, updateArtigo, deleteArtigo, updateStock } = useArtigos();
  const { movimentos, addMov } = useMovStock(exercicio);
  const { addEntry } = useJournal(exercicio);
  const { openWindow, closeWindow } = useWindowManager();

  const [pesquisa, setPesquisa]         = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [activeTab, setActiveTab]       = useState<"stock"|"movimentos">("stock");

  const filtrados = useMemo(() => artigos.filter(a => {
    const status = stockStatus(a);
    if (filtroEstado !== "Todos" && status !== filtroEstado) return false;
    if (pesquisa) {
      const q = pesquisa.toLowerCase();
      return a.descricao.toLowerCase().includes(q) || a.codigo.toLowerCase().includes(q);
    }
    return true;
  }), [artigos, pesquisa, filtroEstado]);

  const valorTotal  = useMemo(() => artigos.reduce((s, a) => s + a.stockAtual * a.custoMedio, 0), [artigos]);
  const artEsgotado = useMemo(() => artigos.filter(a => a.stockAtual === 0).length, [artigos]);
  const artBaixo    = useMemo(() => artigos.filter(a => a.stockAtual > 0 && a.stockAtual < a.stockMinimo).length, [artigos]);
  const artActivos  = useMemo(() => artigos.filter(a => a.stockAtual > 0).length, [artigos]);

  function handleMovimento(artigoId: string, tipo: MovTipo, qtd: number, custo: number, desc: string, docRef: string, gerar: boolean) {
    const artigo  = artigos.find(a => a.id === artigoId);
    if (!artigo) return;

    const totalCusto = qtd * custo;
    const delta = tipo === "ENTRADA" ? qtd : tipo === "SAÍDA" ? -qtd : 0;

    // Update stock
    updateStock(artigoId, delta, tipo === "ENTRADA" ? custo : undefined);

    // Record movement
    addMov({
      data: new Date().toISOString().split("T")[0],
      artigoId,
      artCodigo: artigo.codigo,
      artDescricao: artigo.descricao,
      tipo,
      quantidade: qtd,
      custoUnit: custo,
      totalCusto,
      descricao: desc,
      docRef: docRef || undefined,
    });

    // Auto-journal
    if (gerar && totalCusto > 0 && (tipo === "ENTRADA" || tipo === "SAÍDA")) {
      const acc26  = JOURNAL_ACCOUNTS.find(a => a.code === "26.1")!;
      const acc32  = JOURNAL_ACCOUNTS.find(a => a.code === "32.1.2.1")!;
      const acc71  = JOURNAL_ACCOUNTS.find(a => a.code === "71.1")!;

      if (tipo === "ENTRADA") {
        addEntry({
          data: new Date().toISOString().split("T")[0],
          descricao: `Entrada stock — ${artigo.codigo} — ${desc}`,
          tipo: "ENTRADA STOCK", modulo: "INVENTÁRIO",
          linhas: [
            { conta: `${acc26.code} — ${acc26.name}`, contaCod: acc26.code,
              descricao: `${artigo.descricao} × ${qtd}`, debito: totalCusto, credito: 0 },
            { conta: `${acc32.code} — ${acc32.name}`, contaCod: acc32.code,
              descricao: docRef || desc, debito: 0, credito: totalCusto },
          ],
          totalDebito: totalCusto, totalCredito: totalCusto, estado: "LANÇADO",
        });
      } else {
        addEntry({
          data: new Date().toISOString().split("T")[0],
          descricao: `Saída stock (CMVMC) — ${artigo.codigo} — ${desc}`,
          tipo: "CMVMC", modulo: "INVENTÁRIO",
          linhas: [
            { conta: `${acc71.code} — ${acc71.name}`, contaCod: acc71.code,
              descricao: `${artigo.descricao} × ${qtd}`, debito: totalCusto, credito: 0 },
            { conta: `${acc26.code} — ${acc26.name}`, contaCod: acc26.code,
              descricao: `${artigo.descricao} × ${qtd}`, debito: 0, credito: totalCusto },
          ],
          totalDebito: totalCusto, totalCredito: totalCusto, estado: "LANÇADO",
        });
      }
    }
  }

  function handleOpenMov(preArtigo: Artigo | null = null) {
    const winId = `movimento-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: preArtigo ? `Movimento — ${preArtigo.codigo}` : "Movimento de Stock", icon: "📊",
      content: <MovModal artigo={preArtigo} artigos={artigos} exercicio={exercicio}
        onClose={() => closeWindow(winId)}
        onSave={(artigoId, tipo, qtd, custo, desc, docRef, gerar) => {
          handleMovimento(artigoId, tipo, qtd, custo, desc, docRef, gerar);
          closeWindow(winId);
        }} />,
      x: 40, y: 20, width: 720, height: 520, minimized: false, maximized: false,
    });
  }

  function handleOpenNovoArtigo() {
    const winId = `novo-artigo-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Registar Artigo", icon: "📦",
      content: <NovoArtigoModal onClose={() => closeWindow(winId)} onSave={a => { addArtigo(a); closeWindow(winId); }} />,
      x: 60, y: 30, width: 720, height: 520, minimized: false, maximized: false,
    });
  }

  function handleOpenEditArtigo(artigo: Artigo) {
    const winId = `editar-artigo-${artigo.id}`;
    openWindow({
      id: winId, title: `Editar Artigo — ${artigo.codigo}`, icon: "✏️",
      content: <EditArtigoModal artigo={artigo} onClose={() => closeWindow(winId)}
        onSave={patch => { updateArtigo(artigo.id, patch); closeWindow(winId); }} />,
      x: 60, y: 40, width: 720, height: 520, minimized: false, maximized: false,
    });
  }

  function handleOpenDeleteArtigo(artigo: Artigo) {
    const winId = `delete-artigo-${artigo.id}`;
    openWindow({
      id: winId, title: "Eliminar Artigo?", icon: "🗑️",
      content: <DeleteArtigoConfirm artigo={artigo} onClose={() => closeWindow(winId)}
        onConfirm={() => { deleteArtigo(artigo.id); closeWindow(winId); }} />,
      x: 80, y: 60, width: 480, height: 240, minimized: false, maximized: false,
    });
  }

  return (
    <div>
      <Topbar
        title="Inventário e Armazém"
        subtitle="Gestão de existências · CMP e FIFO · LIFO proibido (PGCA/IFRS)"
        actions={
          <>
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setExercicio(y)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  exercicio === y ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>{y}</button>
            ))}
            <button className="btn-secondary" onClick={handleOpenNovoArtigo}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Novo Artigo
            </button>
            <button className="btn-primary" onClick={() => handleOpenMov(null)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
              </svg>
              Movimento
            </button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Artigos c/ stock",  value: String(artActivos),                   color: "text-gray-900" },
            { label: "Stock baixo",       value: String(artBaixo),                     color: "text-yellow-700" },
            { label: "Esgotados",         value: String(artEsgotado),                  color: "text-red-600" },
            { label: "Valor total (26)",  value: `${(valorTotal/1e6).toFixed(2)}M Kz`, color: "text-brand-700" },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {([["stock","Artigos em Stock"],["movimentos","Movimentos"]] as const).map(([t,l]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === t ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>{l}</button>
          ))}
        </div>

        {/* Tab: Stock */}
        {activeTab === "stock" && (
          <>
            <div className="card p-4 flex flex-wrap gap-3 items-center">
              <input className="input max-w-xs" placeholder="Pesquisar artigo ou código…"
                value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
              <div className="flex gap-2">
                {["Todos","OK","BAIXO","ESGOTADO"].map(s => (
                  <button key={s} onClick={() => setFiltroEstado(s)}
                    className={filtroEstado === s ? "btn-primary py-1 px-3 text-xs" : "btn-secondary py-1 px-3 text-xs"}>{s}</button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h3>Artigos em Stock</h3>
                <span className="badge badge-blue">{filtrados.length} artigos</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table-auto w-full">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descrição</th>
                      <th>Und.</th>
                      <th className="text-right">Stock</th>
                      <th className="text-right">Mínimo</th>
                      <th className="text-right">CMP (Kz)</th>
                      <th className="text-right">Valor Total (Kz)</th>
                      <th>Método</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(a => {
                      const status = stockStatus(a);
                      return (
                        <tr key={a.id}>
                          <td className="font-mono text-xs text-brand-700 font-semibold">{a.codigo}</td>
                          <td className="font-medium text-sm">{a.descricao}</td>
                          <td className="text-xs text-gray-500 text-center">{a.unidade}</td>
                          <td className={`text-right font-mono text-sm font-semibold ${
                            a.stockAtual === 0 ? "text-red-600"
                            : a.stockAtual < a.stockMinimo ? "text-yellow-700"
                            : "text-gray-900"
                          }`}>{a.stockAtual}</td>
                          <td className="text-right font-mono text-xs text-gray-400">{a.stockMinimo}</td>
                          <td className="text-right font-mono text-xs text-gray-700">{a.custoMedio.toLocaleString("pt-PT")}</td>
                          <td className="text-right font-mono text-xs text-gray-700">
                            {a.stockAtual > 0 ? (a.stockAtual * a.custoMedio).toLocaleString("pt-PT") : "—"}
                          </td>
                          <td><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800">{a.metodo}</span></td>
                          <td><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_BADGE[status]}`}>{status}</span></td>
                          <td>
                            <div className="flex gap-1 justify-end">
                              <button className="btn-ghost py-1 px-2 text-xs text-green-700"
                                onClick={() => handleOpenMov(a)}>Mov.</button>
                              <button
                                onClick={() => handleOpenEditArtigo(a)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                                title="Editar">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                              </button>
                              <button
                                onClick={() => handleOpenDeleteArtigo(a)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Eliminar">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-brand-700 text-white">
                      <td colSpan={6} className="px-4 py-3 font-bold text-sm uppercase tracking-wider">Valor total em inventário</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {valorTotal.toLocaleString("pt-PT")}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Tab: Movimentos */}
        {activeTab === "movimentos" && (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3>Movimentos de Stock — {exercicio}</h3>
              <span className="badge badge-blue">{movimentos.length} movimentos</span>
            </div>
            <div className="overflow-x-auto">
              {movimentos.length === 0 ? (
                <div className="flex items-center justify-center py-14 text-gray-400 text-sm">
                  Nenhum movimento registado para {exercicio}.
                </div>
              ) : (
                <table className="table-auto w-full">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Artigo</th>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th className="text-right">Qtd</th>
                      <th className="text-right">Custo Unit.</th>
                      <th className="text-right">Total (Kz)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentos.map(m => (
                      <tr key={m.id}>
                        <td className="text-xs text-gray-500 whitespace-nowrap">{m.data}</td>
                        <td className="font-mono text-xs text-brand-700 font-semibold">{m.artCodigo}</td>
                        <td className="text-sm max-w-xs truncate">{m.descricao}</td>
                        <td>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            m.tipo === "ENTRADA" ? "bg-green-100 text-green-800"
                            : m.tipo === "SAÍDA"  ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                          }`}>{m.tipo === "ENTRADA" ? "▲ " : m.tipo === "SAÍDA" ? "▼ " : "± "}{m.tipo}</span>
                        </td>
                        <td className={`text-right font-mono text-sm font-semibold ${m.tipo === "ENTRADA" ? "text-green-700" : "text-red-600"}`}>
                          {m.tipo === "SAÍDA" ? "−" : "+"}{m.quantidade}
                        </td>
                        <td className="text-right font-mono text-xs text-gray-600">{m.custoUnit.toLocaleString("pt-PT")}</td>
                        <td className="text-right font-mono text-sm font-semibold">{m.totalCusto.toLocaleString("pt-PT")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* LIFO warning */}
        <div className="card p-4 bg-amber-50 border-amber-200 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Método LIFO Proibido — PGCA Angola / IFRS</p>
            <p className="text-xs text-amber-700 mt-0.5">
              O sistema apenas permite CMP (Custo Médio Ponderado) e FIFO, em conformidade com o Decreto n.º 82/01 e a NIC 2 / IFRS para PME.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center pb-2">
          PGCA Angola — Decreto n.º 82/01 · Exercício {exercicio} · Valores em Kwanza (Kz)
        </p>
      </div>
    </div>
  );
}
