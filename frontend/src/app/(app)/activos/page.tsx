"use client";

import { useState, useMemo, useCallback } from "react";
import { useCollection } from "@/lib/useCollection";
import Topbar from "@/components/Topbar";
import { useWindowManager } from "@/lib/windowManager";
import { useJournal, JOURNAL_ACCOUNTS } from "@/lib/journal";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";

// ── Types ──────────────────────────────────────────────────────────────────────
type ClasseActivo = "11.1" | "11.2" | "11.3" | "11.4" | "11.5" | "12.3" | "14.1";

interface Activo {
  id: string;
  codigo: string;
  descricao: string;
  classe: ClasseActivo;
  contaDepCod: string;   // debit account for depreciation
  contaAcumCod: string;  // credit account for accumulated depreciation
  dataAquisicao: string;
  custoHistorico: number;
  depAcumulada: number;
  taxaAnual: number;     // decimal e.g. 0.20
  metodo: "Linear";
  estado: "ACTIVO" | "ABATIDO" | "ALIENADO";
}

// ── Seed ──────────────────────────────────────────────────────────────────────
const SEED_ACTIVOS: Activo[] = [
  {
    id:"af1", codigo:"AF-001", descricao:"Edifício sede — Luanda",
    classe:"11.2", contaDepCod:"73.1", contaAcumCod:"18.1.2",
    dataAquisicao:"2020-01-01", custoHistorico:500_000_000,
    depAcumulada:100_000_000, taxaAnual:0.02, metodo:"Linear", estado:"ACTIVO",
  },
  {
    id:"af2", codigo:"AF-002", descricao:"Frota veículos (5 viaturas)",
    classe:"11.4", contaDepCod:"73.1", contaAcumCod:"18.1.4",
    dataAquisicao:"2022-03-15", custoHistorico:120_000_000,
    depAcumulada:48_000_000, taxaAnual:0.20, metodo:"Linear", estado:"ACTIVO",
  },
  {
    id:"af3", codigo:"AF-003", descricao:"Servidores HP ProLiant",
    classe:"11.5", contaDepCod:"73.1", contaAcumCod:"18.1.5",
    dataAquisicao:"2022-06-10", custoHistorico:45_000_000,
    depAcumulada:27_000_000, taxaAnual:0.333, metodo:"Linear", estado:"ACTIVO",
  },
  {
    id:"af4", codigo:"AF-004", descricao:"Software ERP (licenças)",
    classe:"12.3", contaDepCod:"73.2", contaAcumCod:"18.1.5",
    dataAquisicao:"2023-01-01", custoHistorico:28_000_000,
    depAcumulada:18_666_667, taxaAnual:0.333, metodo:"Linear", estado:"ACTIVO",
  },
  {
    id:"af5", codigo:"AF-005", descricao:"Mobiliário escritórios",
    classe:"11.5", contaDepCod:"73.1", contaAcumCod:"18.1.5",
    dataAquisicao:"2021-08-20", custoHistorico:15_000_000,
    depAcumulada:9_000_000, taxaAnual:0.20, metodo:"Linear", estado:"ACTIVO",
  },
  {
    id:"af6", codigo:"AF-006", descricao:"Ar condicionado (6 unidades)",
    classe:"11.3", contaDepCod:"73.1", contaAcumCod:"18.1.3",
    dataAquisicao:"2020-11-05", custoHistorico:12_000_000,
    depAcumulada:9_600_000, taxaAnual:0.20, metodo:"Linear", estado:"ACTIVO",
  },
  {
    id:"af7", codigo:"AF-007", descricao:"Fotocopiadora Xerox",
    classe:"11.5", contaDepCod:"73.1", contaAcumCod:"18.1.5",
    dataAquisicao:"2019-07-01", custoHistorico:8_000_000,
    depAcumulada:8_000_000, taxaAnual:0.20, metodo:"Linear", estado:"ABATIDO",
  },
];

// Classe labels
const CLASSE_LABELS: Record<string, string> = {
  "11.1": "11.1 — Terrenos",
  "11.2": "11.2 — Edifícios e construções",
  "11.3": "11.3 — Equipamento básico",
  "11.4": "11.4 — Equipamento de transporte",
  "11.5": "11.5 — Equipamento administrativo",
  "12.3": "12.3 — Propriedade industrial e direitos",
  "14.1": "14.1 — Imobilizações em curso",
};

// Depreciation accounts per conta acum.
const ACUM_LABELS: Record<string, string> = {
  "18.1.2": "18.1.2 — Amort. Acum. Edifícios",
  "18.1.3": "18.1.3 — Amort. Acum. Equip. básico",
  "18.1.4": "18.1.4 — Amort. Acum. Equip. transporte",
  "18.1.5": "18.1.5 — Amort. Acum. Equip. adm.",
};

// ── Calc ───────────────────────────────────────────────────────────────────────
function depMensal(a: Activo): number {
  const valorLiquido = a.custoHistorico - a.depAcumulada;
  if (valorLiquido <= 0 || a.estado !== "ACTIVO") return 0;
  return Math.round((a.custoHistorico * a.taxaAnual) / 12);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
function useActivos() {
  const { items: activos, setItems: setActivos } = useCollection<Activo>("educontas-activos", SEED_ACTIVOS);

  const addActivo = useCallback((draft: Omit<Activo, "id" | "depAcumulada">) => {
    setActivos(prev => [...prev, { ...draft, id: crypto.randomUUID(), depAcumulada: 0 }]);
  }, [setActivos]);

  const processarDep = useCallback((ids: string[]) => {
    setActivos(prev => prev.map(a => {
      if (!ids.includes(a.id)) return a;
      const dep = depMensal(a);
      return { ...a, depAcumulada: Math.min(a.depAcumulada + dep, a.custoHistorico) };
    }));
  }, [setActivos]);

  const abater = useCallback((id: string) => {
    setActivos(prev => prev.map(a => a.id === id ? { ...a, estado: "ABATIDO" as const } : a));
  }, [setActivos]);

  const updateActivo = useCallback((id: string, patch: Partial<Omit<Activo, "id">>) => {
    setActivos(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  }, [setActivos]);

  const deleteActivo = useCallback((id: string) => {
    setActivos(prev => prev.filter(a => a.id !== id));
  }, [setActivos]);

  return { activos, addActivo, processarDep, abater, updateActivo, deleteActivo };
}

// ── Registar Activo Modal ─────────────────────────────────────────────────────
function RegistarActivoModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (a: Omit<Activo, "id" | "depAcumulada">) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [classe, setClasse] = useState<ClasseActivo>("11.5");
  const [dataAquisicao, setDataAquisicao] = useState(today);
  const [custoHistorico, setCustoHistorico] = useState("");
  const [taxaAnual, setTaxaAnual] = useState("20");

  const taxaMap: Record<ClasseActivo, number> = {
    "11.1": 0, "11.2": 2, "11.3": 20, "11.4": 20, "11.5": 20, "12.3": 33.3, "14.1": 0,
  };

  const contaDepCod  = classe.startsWith("12") ? "73.2" : "73.1";
  const contaAcumCod = classe === "11.2" ? "18.1.2"
    : classe === "11.3" ? "18.1.3"
    : classe === "11.4" ? "18.1.4"
    : "18.1.5";

  const valid = codigo.trim() && descricao.trim() && +custoHistorico > 0;
  const depM  = +custoHistorico > 0 ? Math.round(+custoHistorico * (+taxaAnual/100) / 12) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Código *</label>
            <input className="input" placeholder="AF-008" value={codigo} onChange={e => setCodigo(e.target.value)} />
          </div>
          <div>
            <label className="label">Classe PGCA *</label>
            <select className="input" value={classe} onChange={e => {
              const c = e.target.value as ClasseActivo;
              setClasse(c);
              setTaxaAnual(String(taxaMap[c] ?? 20));
            }}>
              {(Object.keys(CLASSE_LABELS) as ClasseActivo[]).map(k => (
                <option key={k} value={k}>{CLASSE_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Descrição *</label>
            <input className="input" placeholder="Descrição do activo" value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
          <div>
            <label className="label">Data Aquisição *</label>
            <input type="date" className="input" value={dataAquisicao} onChange={e => setDataAquisicao(e.target.value)} />
          </div>
          <div>
            <label className="label">Custo Histórico (Kz) *</label>
            <input type="number" className="input" min={0} value={custoHistorico} onChange={e => setCustoHistorico(e.target.value)} />
          </div>
          <div>
            <label className="label">Taxa Anual (%)</label>
            <input type="number" className="input" min={0} max={100} step={0.1}
              value={taxaAnual} onChange={e => setTaxaAnual(e.target.value)} />
          </div>
          <div>
            <label className="label">Método</label>
            <select className="input">
              <option>Linear (Linha Constante)</option>
            </select>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
          <p>Conta depreciação: <span className="font-mono font-semibold text-brand-700">{contaDepCod}</span></p>
          <p>Conta amort. acum.: <span className="font-mono font-semibold text-brand-700">{contaAcumCod}</span></p>
          {depM > 0 && (
            <p>Depreciação mensal estimada: <span className="font-mono font-semibold">{depM.toLocaleString("pt-PT")} Kz/mês</span></p>
          )}
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button disabled={!valid}
          onClick={() => {
            if (!valid) return;
            onSave({ codigo: codigo.trim(), descricao: descricao.trim(), classe,
              contaDepCod, contaAcumCod, dataAquisicao, custoHistorico: +custoHistorico,
              taxaAnual: +taxaAnual / 100, metodo: "Linear", estado: "ACTIVO" });
            onClose();
          }}
          className="btn-primary">Registar Activo</button>
      </div>
    </div>
  );
}

// ── Edit Activo Modal ─────────────────────────────────────────────────────────
function EditActivoModal({ activo, onClose, onSave }: {
  activo: Activo;
  onClose: () => void;
  onSave: (patch: Partial<Omit<Activo, "id">>) => void;
}) {
  const [descricao, setDescricao]         = useState(activo.descricao);
  const [classe, setClasse]               = useState<ClasseActivo>(activo.classe);
  const [dataAquisicao, setDataAquisicao] = useState(activo.dataAquisicao);
  const [custoHistorico, setCustoHistorico] = useState(String(activo.custoHistorico));
  const [taxaAnual, setTaxaAnual]         = useState(String(activo.taxaAnual * 100));
  const [estado, setEstado]               = useState<Activo["estado"]>(activo.estado);

  const contaDepCod  = classe.startsWith("12") ? "73.2" : "73.1";
  const contaAcumCod = classe === "11.2" ? "18.1.2"
    : classe === "11.3" ? "18.1.3"
    : classe === "11.4" ? "18.1.4"
    : "18.1.5";

  const valid = descricao.trim().length > 0 && +custoHistorico > 0;
  const depM  = +custoHistorico > 0 ? Math.round(+custoHistorico * (+taxaAnual / 100) / 12) : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Classe PGCA *</label>
            <select className="input" value={classe} onChange={e => setClasse(e.target.value as ClasseActivo)}>
              {(Object.keys(CLASSE_LABELS) as ClasseActivo[]).map(k => (
                <option key={k} value={k}>{CLASSE_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Estado</label>
            <select className="input" value={estado} onChange={e => setEstado(e.target.value as Activo["estado"])}>
              <option value="ACTIVO">ACTIVO</option>
              <option value="ABATIDO">ABATIDO</option>
              <option value="ALIENADO">ALIENADO</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Descrição *</label>
            <input className="input" value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>
          <div>
            <label className="label">Data Aquisição *</label>
            <input type="date" className="input" value={dataAquisicao} onChange={e => setDataAquisicao(e.target.value)} />
          </div>
          <div>
            <label className="label">Custo Histórico (Kz) *</label>
            <input type="number" className="input" min={0} value={custoHistorico} onChange={e => setCustoHistorico(e.target.value)} />
          </div>
          <div>
            <label className="label">Taxa Anual (%)</label>
            <input type="number" className="input" min={0} max={100} step={0.1} value={taxaAnual} onChange={e => setTaxaAnual(e.target.value)} />
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
          <p>Conta depreciação: <span className="font-mono font-semibold text-brand-700">{contaDepCod}</span></p>
          <p>Conta amort. acum.: <span className="font-mono font-semibold text-brand-700">{contaAcumCod}</span></p>
          {depM > 0 && (
            <p>Depreciação mensal estimada: <span className="font-mono font-semibold">{depM.toLocaleString("pt-PT")} Kz/mês</span></p>
          )}
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button disabled={!valid} onClick={() => {
          onSave({ descricao: descricao.trim(), classe, contaDepCod, contaAcumCod,
            dataAquisicao, custoHistorico: +custoHistorico, taxaAnual: +taxaAnual / 100, estado });
        }} className="btn-primary">Guardar Alterações</button>
      </div>
    </div>
  );
}

// ── Delete Activo Confirm ─────────────────────────────────────────────────────
function DeleteActivoConfirm({ activo, onClose, onConfirm }: {
  activo: Activo;
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
          <span className="font-mono font-semibold text-brand-700">{activo.codigo}</span> — {activo.descricao}
        </p>
        <p className="text-xs text-gray-400">Os lançamentos contabilísticos gerados não serão afectados.</p>
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

// ── Processar Depreciações Modal ──────────────────────────────────────────────
interface DepModalProps {
  activos: Activo[];
  exercicio: string;
  onClose: () => void;
  onSave: (ids: string[], mes: string, gerar: boolean) => void;
}

function ProcessarDepModal({ activos, exercicio, onClose, onSave }: DepModalProps) {
  const mes0 = `${exercicio}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [mes, setMes] = useState(mes0.startsWith(exercicio) ? mes0 : `${exercicio}-11`);
  const [gerar, setGerar] = useState(true);

  const actAtivos = activos.filter(a => a.estado === "ACTIVO" && depMensal(a) > 0);
  const totalDep  = actAtivos.reduce((s, a) => s + depMensal(a), 0);

  const mesLabel = (m: string) => {
    const [y, mo] = m.split("-");
    const labels = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${labels[(parseInt(mo, 10) - 1) % 12]} ${y}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <label className="label">Mês de Referência *</label>
          <input type="month" className="input max-w-xs" value={mes} onChange={e => setMes(e.target.value)} />
        </div>

        <div className="overflow-x-auto border border-gray-100 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-gray-600 font-semibold">Activo</th>
                <th className="px-3 py-2 text-right text-gray-600 font-semibold">Custo</th>
                <th className="px-3 py-2 text-right text-gray-600 font-semibold">Dep. Acum.</th>
                <th className="px-3 py-2 text-right text-gray-600 font-semibold">Líquido</th>
                <th className="px-3 py-2 text-right text-gray-600 font-semibold">Taxa</th>
                <th className="px-3 py-2 text-right text-gray-600 font-semibold">Dep. Mensal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {actAtivos.map(a => {
                const dep = depMensal(a);
                const liq = a.custoHistorico - a.depAcumulada;
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-gray-800">{a.codigo}</p>
                      <p className="text-gray-500">{a.descricao}</p>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{(a.custoHistorico/1e6).toFixed(2)}M</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">({(a.depAcumulada/1e6).toFixed(2)}M)</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{(liq/1e6).toFixed(2)}M</td>
                    <td className="px-3 py-2 text-right">{(a.taxaAnual * 100).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-orange-700">{dep.toLocaleString("pt-PT")}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-brand-50 font-bold">
                <td className="px-3 py-2 text-brand-800 text-xs uppercase tracking-wide" colSpan={5}>Total a depreciar — {mesLabel(mes)}</td>
                <td className="px-3 py-2 text-right font-mono text-orange-800">{totalDep.toLocaleString("pt-PT")} Kz</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {gerar && (
          <div className="bg-brand-50 rounded-xl p-4 text-xs">
            <p className="font-semibold text-brand-800 mb-2">Lançamento a gerar:</p>
            <div className="space-y-0.5 font-mono text-brand-700">
              {["73.1","73.2"].map(cod => {
                const v = actAtivos.filter(a => a.contaDepCod === cod).reduce((s,a) => s+depMensal(a), 0);
                if (!v) return null;
                const acc = JOURNAL_ACCOUNTS.find(a => a.code === cod);
                return <p key={cod}>D {cod} — {acc?.name}: {v.toLocaleString("pt-PT")}</p>;
              })}
              {(["18.1.2","18.1.3","18.1.4","18.1.5"] as const).map(cod => {
                const v = actAtivos.filter(a => a.contaAcumCod === cod).reduce((s,a) => s+depMensal(a), 0);
                if (!v) return null;
                return <p key={cod}>C {ACUM_LABELS[cod]}: {v.toLocaleString("pt-PT")}</p>;
              })}
            </div>
          </div>
        )}

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={gerar} onChange={e => setGerar(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-brand-600" />
          <div>
            <span className="text-sm font-medium text-gray-900">Gerar lançamento contabilístico automático</span>
            <p className="text-xs text-gray-500 mt-0.5">D 73.1/73.2 Amortizações / C 18.1.x Amort. Acumuladas</p>
          </div>
        </label>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button disabled={actAtivos.length === 0}
          onClick={() => onSave(actAtivos.map(a => a.id), mes, gerar)}
          className="btn-primary">
          Processar Depreciações
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ActivosPage() {
  const [exercicio, setExercicio] = useState(() => ANOS_DISPONIVEIS[0] ?? "2025");
  const { activos, addActivo, processarDep, abater, updateActivo, deleteActivo } = useActivos();
  const { addEntry } = useJournal(exercicio);
  const { openWindow, closeWindow } = useWindowManager();

  const [filtroEstado, setFiltroEstado] = useState("ACTIVO");

  const filtrados = useMemo(() =>
    activos.filter(a => filtroEstado === "Todos" || a.estado === filtroEstado),
  [activos, filtroEstado]);

  const totalCusto    = useMemo(() => activos.reduce((s, a) => s + a.custoHistorico, 0), [activos]);
  const totalDepAcum  = useMemo(() => activos.reduce((s, a) => s + a.depAcumulada, 0), [activos]);
  const totalLiquido  = totalCusto - totalDepAcum;
  const totalDepMensal = useMemo(() =>
    activos.filter(a => a.estado === "ACTIVO").reduce((s, a) => s + depMensal(a), 0), [activos]);

  function handleDep(ids: string[], mes: string, gerar: boolean) {
    processarDep(ids);
    if (gerar) {
      const actAtivos = activos.filter(a => ids.includes(a.id));
      const totalDep  = actAtivos.reduce((s, a) => s + depMensal(a), 0);
      if (totalDep === 0) return;

      const linhas: import("@/lib/journal").JournalLine[] = [];
      // Debit lines grouped by depreciation account
      ["73.1","73.2"].forEach(cod => {
        const v = actAtivos.filter(a => a.contaDepCod === cod).reduce((s,a) => s+depMensal(a), 0);
        if (!v) return;
        const acc = JOURNAL_ACCOUNTS.find(a => a.code === cod);
        if (acc) linhas.push({ conta: `${acc.code} — ${acc.name}`, contaCod: acc.code,
          descricao: `Dep. mensal — ${mes}`, debito: v, credito: 0 });
      });
      // Credit lines grouped by accumulated account
      ["18.1.2","18.1.3","18.1.4","18.1.5"].forEach(cod => {
        const v = actAtivos.filter(a => a.contaAcumCod === cod).reduce((s,a) => s+depMensal(a), 0);
        if (!v) return;
        const acc = JOURNAL_ACCOUNTS.find(a => a.code === cod);
        if (acc) linhas.push({ conta: `${acc.code} — ${acc.name}`, contaCod: acc.code,
          descricao: `Amort. acum. — ${mes}`, debito: 0, credito: v });
      });

      addEntry({
        data: `${mes}-30`,
        descricao: `Depreciações mensais — ${mes}`,
        tipo: "DEPRECIAÇÃO", modulo: "ACTIVOS",
        linhas, totalDebito: totalDep, totalCredito: totalDep, estado: "LANÇADO",
      });
    }
  }

  function handleOpenDep() {
    const winId = `processar-dep-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Processar Depreciações Mensais", icon: "⏱️",
      content: <ProcessarDepModal activos={activos} exercicio={exercicio}
        onClose={() => closeWindow(winId)}
        onSave={(ids, mes, gerar) => { handleDep(ids, mes, gerar); closeWindow(winId); }} />,
      x: 40, y: 20, width: 900, height: 640, minimized: false, maximized: false,
    });
  }

  function handleOpenRegistar() {
    const winId = `registar-activo-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Registar Activo Fixo", icon: "🏗️",
      content: <RegistarActivoModal onClose={() => closeWindow(winId)} onSave={a => { addActivo(a); closeWindow(winId); }} />,
      x: 60, y: 30, width: 720, height: 520, minimized: false, maximized: false,
    });
  }

  function handleOpenEditar(activo: Activo) {
    const winId = `editar-activo-${activo.id}`;
    openWindow({
      id: winId, title: `Editar Activo Fixo — ${activo.codigo}`, icon: "✏️",
      content: <EditActivoModal activo={activo} onClose={() => closeWindow(winId)}
        onSave={patch => { updateActivo(activo.id, patch); closeWindow(winId); }} />,
      x: 60, y: 40, width: 720, height: 520, minimized: false, maximized: false,
    });
  }

  function handleOpenDelete(activo: Activo) {
    const winId = `delete-activo-${activo.id}`;
    openWindow({
      id: winId, title: "Eliminar Activo?", icon: "🗑️",
      content: <DeleteActivoConfirm activo={activo} onClose={() => closeWindow(winId)}
        onConfirm={() => { deleteActivo(activo.id); closeWindow(winId); }} />,
      x: 80, y: 60, width: 480, height: 240, minimized: false, maximized: false,
    });
  }

  function handleOpenVer(activo: Activo) {
    const winId = `ver-activo-${activo.id}`;
    openWindow({
      id: winId, title: `${activo.codigo} — ${activo.descricao}`, icon: "📋",
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Classe PGCA", CLASSE_LABELS[activo.classe] ?? activo.classe],
                ["Data Aquisição", activo.dataAquisicao],
                ["Taxa Anual", `${(activo.taxaAnual * 100).toFixed(1)}%`],
                ["Método", activo.metodo],
                ["Conta Dep.", activo.contaDepCod],
                ["Conta Acum.", activo.contaAcumCod],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{l}</p>
                  <p className="font-mono mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Custo histórico</span><span className="font-mono">{activo.custoHistorico.toLocaleString("pt-PT")} Kz</span></div>
              <div className="flex justify-between text-red-600"><span>Dep. acumulada</span><span className="font-mono">({activo.depAcumulada.toLocaleString("pt-PT")})</span></div>
              <div className="flex justify-between font-bold border-t border-gray-200 pt-1.5">
                <span>Valor líquido</span>
                <span className="font-mono text-brand-700">{(activo.custoHistorico - activo.depAcumulada).toLocaleString("pt-PT")} Kz</span>
              </div>
              <div className="flex justify-between text-orange-600 text-xs"><span>Dep. mensal estimada</span><span className="font-mono">{depMensal(activo).toLocaleString("pt-PT")} Kz/mês</span></div>
            </div>
            <div className="flex justify-between items-center pt-1">
              <button className="text-xs text-brand-600 hover:text-brand-800 font-semibold"
                onClick={() => { closeWindow(winId); handleOpenEditar(activo); }}>
                ✏️ Editar activo
              </button>
              {activo.estado === "ACTIVO" && (
                <button className="text-xs text-red-600 hover:text-red-800 font-semibold"
                  onClick={() => { abater(activo.id); closeWindow(winId); }}>
                  Abater activo
                </button>
              )}
            </div>
          </div>
        </div>
      ),
      x: 50, y: 30, width: 780, height: 520, minimized: false, maximized: false,
    });
  }

  return (
    <div>
      <Topbar
        title="Activos Fixos"
        subtitle="Imobilizações corpóreas e incorpóreas · Depreciações automáticas"
        actions={
          <>
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setExercicio(y)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  exercicio === y ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}>{y}</button>
            ))}
            <button className="btn-secondary" onClick={handleOpenDep}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Processar Dep.
            </button>
            <button className="btn-primary" onClick={handleOpenRegistar}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Registar Activo
            </button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Custo histórico",   value: `${(totalCusto/1e6).toFixed(0)}M Kz`,    color: "text-gray-900" },
            { label: "Dep. acumuladas",   value: `${(totalDepAcum/1e6).toFixed(0)}M Kz`,  color: "text-red-600" },
            { label: "Valor líquido",     value: `${(totalLiquido/1e6).toFixed(0)}M Kz`,  color: "text-brand-700" },
            { label: "Dep. mensal actual",value: `${(totalDepMensal/1e6).toFixed(2)}M Kz`,color: "text-orange-600" },
          ].map(k => (
            <div key={k.label} className="card p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {["ACTIVO","ABATIDO","Todos"].map(s => (
            <button key={s} onClick={() => setFiltroEstado(s)}
              className={filtroEstado === s ? "btn-primary py-1 px-3 text-xs" : "btn-secondary py-1 px-3 text-xs"}>{s}</button>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>Mapa de Activos Fixos</h3>
            <span className="badge badge-blue">{filtrados.length} activos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Cl.</th>
                  <th>Aquisição</th>
                  <th className="text-right">Custo (Kz)</th>
                  <th className="text-right">Dep. Acum.</th>
                  <th className="text-right">Val. Líquido</th>
                  <th className="text-right">Dep./Mês</th>
                  <th>Taxa</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(a => {
                  const liq = a.custoHistorico - a.depAcumulada;
                  const dep = depMensal(a);
                  return (
                    <tr key={a.id} className={a.estado !== "ACTIVO" ? "opacity-50" : ""}>
                      <td className="font-mono text-xs text-brand-700 font-semibold">{a.codigo}</td>
                      <td className="font-medium text-sm">{a.descricao}</td>
                      <td className="text-xs text-gray-500 text-center font-mono">{a.classe}</td>
                      <td className="text-xs text-gray-500 whitespace-nowrap">{a.dataAquisicao}</td>
                      <td className="text-right font-mono text-xs text-gray-700">{(a.custoHistorico/1e6).toFixed(2)}M</td>
                      <td className="text-right font-mono text-xs text-red-600">({(a.depAcumulada/1e6).toFixed(2)}M)</td>
                      <td className="text-right font-mono text-xs font-semibold">
                        {liq > 0 ? (liq/1e6).toFixed(2)+"M" : "—"}
                      </td>
                      <td className="text-right font-mono text-xs text-orange-600">
                        {dep > 0 ? dep.toLocaleString("pt-PT") : "—"}
                      </td>
                      <td className="text-xs text-center text-gray-600">{(a.taxaAnual * 100).toFixed(0)}%</td>
                      <td>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          a.estado === "ACTIVO" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}>{a.estado}</span>
                      </td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          <button className="btn-ghost py-1 px-2 text-xs" onClick={() => handleOpenVer(a)}>Ver</button>
                          <button
                            onClick={() => handleOpenEditar(a)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Editar">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleOpenDelete(a)}
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
                  <td colSpan={4} className="px-4 py-3 font-bold text-sm uppercase tracking-wider">Totais</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{(totalCusto/1e6).toFixed(0)}M</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">({(totalDepAcum/1e6).toFixed(0)}M)</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{(totalLiquido/1e6).toFixed(0)}M</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{(totalDepMensal/1e3).toFixed(0)}K</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* PGCA accounts summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contas PGCA Associadas</p>
            <div className="space-y-1.5 text-xs">
              {["11","12"].map(cl => {
                const total = activos.filter(a => a.classe.startsWith(cl)).reduce((s,a) => s+a.custoHistorico, 0);
                if (!total) return null;
                return (
                  <div key={cl} className="flex justify-between">
                    <span className="text-gray-600">{cl === "11" ? "11 — Imobilizações Corpóreas" : "12 — Imobilizações Incorpóreas"}</span>
                    <span className="font-mono font-semibold">{(total/1e6).toFixed(0)}M Kz</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-red-600 border-t border-gray-100 pt-1">
                <span>18 — Amortizações Acumuladas</span>
                <span className="font-mono font-semibold">({(totalDepAcum/1e6).toFixed(0)}M) Kz</span>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Depreciação Mensal (Estimativa)</p>
            <p className="text-2xl font-bold text-brand-700">
              {totalDepMensal.toLocaleString("pt-PT")} <span className="text-sm font-normal text-gray-500">Kz</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {activos.filter(a => a.estado === "ACTIVO" && depMensal(a) > 0).length} activos em depreciação · Método linear
            </p>
            <button className="mt-2 text-xs text-brand-600 font-semibold hover:text-brand-800"
              onClick={handleOpenDep}>
              Processar para o mês →
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center pb-2">
          PGCA Angola — Decreto n.º 82/01 · Exercício {exercicio} · Valores em Kwanza (Kz)
        </p>
      </div>
    </div>
  );
}
