"use client";

import { useState, useMemo, useCallback } from "react";
import { useWindowManager } from "@/lib/windowManager";

interface Moeda {
  codigo: string;
  nome: string;
  simbolo: string;
  taxaParaAOA: number; // 1 unidade desta moeda = X AOA
  activa: boolean;
  base: boolean;
  ultimaActualizacao: string;
  variacao: number; // % variação 24h
}

const MOEDAS_INIT: Moeda[] = [
  { codigo: "Kz", nome: "Kwanza Angolano",     simbolo: "Kz",  taxaParaAOA: 1,       activa: true,  base: true,  ultimaActualizacao: "2026-06-01", variacao: 0 },
  { codigo: "USD", nome: "Dólar Americano",      simbolo: "$",   taxaParaAOA: 870.50,  activa: true,  base: false, ultimaActualizacao: "2026-06-01", variacao: +0.12 },
  { codigo: "EUR", nome: "Euro",                 simbolo: "€",   taxaParaAOA: 948.20,  activa: true,  base: false, ultimaActualizacao: "2026-06-01", variacao: -0.08 },
  { codigo: "GBP", nome: "Libra Esterlina",      simbolo: "£",   taxaParaAOA: 1105.40, activa: true,  base: false, ultimaActualizacao: "2026-06-01", variacao: +0.24 },
  { codigo: "ZAR", nome: "Rand Sul-Africano",    simbolo: "R",   taxaParaAOA: 47.80,   activa: true,  base: false, ultimaActualizacao: "2026-06-01", variacao: -0.35 },
  { codigo: "CNY", nome: "Yuan Chinês (Renminbi)",simbolo: "¥",  taxaParaAOA: 120.30,  activa: true,  base: false, ultimaActualizacao: "2026-06-01", variacao: +0.05 },
  { codigo: "BRL", nome: "Real Brasileiro",      simbolo: "R$",  taxaParaAOA: 165.20,  activa: false, base: false, ultimaActualizacao: "2026-05-30", variacao: -0.18 },
  { codigo: "XAF", nome: "Franco CFA BEAC",      simbolo: "CFA", taxaParaAOA: 1.45,    activa: false, base: false, ultimaActualizacao: "2026-05-30", variacao: +0.01 },
  { codigo: "GHC", nome: "Cedi Ganês",           simbolo: "₵",   taxaParaAOA: 56.40,   activa: false, base: false, ultimaActualizacao: "2026-05-28", variacao: -0.22 },
];

const LS_KEY = "educontas-moedas";

interface TaxaHistorico {
  data: string;
  codigo: string;
  taxaAnterior: number;
  taxaNova: number;
  utilizador: string;
}

const HISTORICO: TaxaHistorico[] = [
  { data: "2026-06-01", codigo: "USD", taxaAnterior: 869.00, taxaNova: 870.50, utilizador: "Maria Costa" },
  { data: "2026-06-01", codigo: "EUR", taxaAnterior: 949.00, taxaNova: 948.20, utilizador: "Maria Costa" },
  { data: "2026-05-31", codigo: "GBP", taxaAnterior: 1103.00, taxaNova: 1105.40, utilizador: "Admin" },
  { data: "2026-05-31", codigo: "USD", taxaAnterior: 868.50, taxaNova: 869.00, utilizador: "Maria Costa" },
  { data: "2026-05-30", codigo: "ZAR", taxaAnterior: 48.10, taxaNova: 47.80, utilizador: "Maria Costa" },
];

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function MoedasPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [moedas, setMoedas] = useState<Moeda[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return MOEDAS_INIT;
  });
  const [conversor, setConversor] = useState({ valor: "1000", de: "USD", para: "Kz" });
  const [showInactive, setShowInactive] = useState(false);

  const updateMoeda = useCallback((codigo: string, patch: Partial<Moeda>) => {
    setMoedas(prev => {
      const next = prev.map(m => m.codigo === codigo ? { ...m, ...patch } : m);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteMoeda = useCallback((codigo: string) => {
    setMoedas(prev => {
      const next = prev.filter(m => m.codigo !== codigo);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const activeMoedas = moedas.filter(m => showInactive || m.activa);

  const resultadoConversao = useMemo(() => {
    const val = parseFloat(conversor.valor) || 0;
    const de = moedas.find(m => m.codigo === conversor.de);
    const para = moedas.find(m => m.codigo === conversor.para);
    if (!de || !para || !val) return 0;
    // Converter: valor * taxaDe / taxaPara
    return (val * de.taxaParaAOA) / para.taxaParaAOA;
  }, [conversor, moedas]);

  function openEditTaxa(m: Moeda) {
    const winId = `moeda-taxa-${m.codigo}`;
    openWindow({
      id: winId,
      title: `Actualizar Taxa — ${m.codigo}`,
      icon: "💱",
      content: <EditTaxaForm
        moeda={m}
        onSave={(novaTaxa) => {
          updateMoeda(m.codigo, { taxaParaAOA: novaTaxa, ultimaActualizacao: new Date().toISOString().slice(0, 10) });
          closeWindow(winId);
        }}
        onClose={() => closeWindow(winId)}
      />,
      x: 40, y: 20, width: 480, height: 280, minimized: false, maximized: false,
    });
  }

  function handleOpenEditar(m: Moeda) {
    const winId = `editar-moeda-${m.codigo}`;
    openWindow({
      id: winId,
      title: `Editar ${m.nome}`,
      icon: "✏️",
      content: <EditarMoedaModal
        moeda={m}
        onClose={() => closeWindow(winId)}
        onSave={(patch) => {
          updateMoeda(m.codigo, patch);
          closeWindow(winId);
        }}
      />,
      x: 50, y: 30, width: 680, height: 480, minimized: false, maximized: false,
    });
  }

  function handleOpenDelete(m: Moeda) {
    const winId = `delete-moeda-${m.codigo}`;
    openWindow({
      id: winId,
      title: "Confirmar eliminação",
      icon: "🗑️",
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 p-6">
            <p className="text-gray-700">Tem a certeza que pretende eliminar <strong>{m.nome} ({m.codigo})</strong>?</p>
            <p className="text-sm text-gray-500 mt-2">Esta acção não pode ser desfeita.</p>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
            <button onClick={() => closeWindow(winId)} className="btn-secondary">Cancelar</button>
            <button onClick={() => { deleteMoeda(m.codigo); closeWindow(winId); }} className="btn-primary bg-red-600 hover:bg-red-700">Eliminar</button>
          </div>
        </div>
      ),
      x: 80, y: 80, width: 480, height: 220, minimized: false, maximized: false,
    });
  }

  function toggleActiva(codigo: string) {
    setMoedas(prev => {
      const next = prev.map(m => m.codigo === codigo && !m.base ? { ...m, activa: !m.activa } : m);
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      return next;
    });
  }

  const totalActivas = moedas.filter(m => m.activa).length;

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2">
            <span>Gestão Multi-Moeda</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-aqua-100 text-aqua-700 rounded-full">Multi-Currency</span>
          </h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Moeda base: <strong className="text-aqua-600">AOA (Kwanza)</strong> · {totalActivas} moedas activas
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-500 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Mostrar inactivas
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de taxas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold text-ink-800">Taxas de Câmbio</h3>
              <span className="text-xs text-ink-400">BNA · {new Date().toLocaleDateString("pt-PT")}</span>
            </div>
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th>Moeda</th>
                  <th className="text-right">1 unid. = AOA</th>
                  <th className="text-center">24h</th>
                  <th className="text-center">Estado</th>
                  <th className="text-right">Acções</th>
                </tr>
              </thead>
              <tbody>
                {activeMoedas.map(m => (
                  <tr key={m.codigo} className={`group hover:bg-ink-50/50 transition-colors ${!m.activa ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 border-t border-ink-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${m.base ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"}`}>
                          {m.simbolo}
                        </div>
                        <div>
                          <p className="font-semibold text-ink-800 text-sm">{m.codigo}</p>
                          <p className="text-xs text-ink-400">{m.nome}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-t border-ink-100 text-right">
                      {m.base ? (
                        <span className="font-bold text-ink-800">—</span>
                      ) : (
                        <span className="font-mono font-bold text-ink-800">{fmt(m.taxaParaAOA)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-t border-ink-100 text-center">
                      {m.variacao !== 0 ? (
                        <span className={`text-xs font-semibold ${m.variacao > 0 ? "text-green-600" : "text-brand-600"}`}>
                          {m.variacao > 0 ? "▲" : "▼"} {Math.abs(m.variacao).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-xs text-ink-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 border-t border-ink-100 text-center">
                      {m.base ? (
                        <span className="text-xs font-bold px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full">BASE</span>
                      ) : (
                        <button onClick={() => toggleActiva(m.codigo)}
                          className={`text-xs font-bold px-2 py-0.5 rounded-full transition-colors ${m.activa ? "bg-green-100 text-green-700 hover:bg-brand-100 hover:text-brand-700" : "bg-ink-100 text-ink-500 hover:bg-green-100 hover:text-green-700"}`}>
                          {m.activa ? "Activa" : "Inactiva"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 border-t border-ink-100 text-right">
                      {!m.base && (
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditTaxa(m)} className="text-xs btn-secondary py-1 px-2">
                            Taxa
                          </button>
                          <button onClick={() => handleOpenEditar(m)} className="btn-ghost p-1.5 text-xs" title="Editar moeda">
                            ✏️
                          </button>
                          <button onClick={() => handleOpenDelete(m)} className="btn-ghost p-1.5 text-xs" title="Eliminar moeda">
                            🗑️
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Histórico */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <h3 className="font-semibold text-ink-800">Histórico de Actualizações</h3>
            </div>
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th>Data</th>
                  <th className="text-center">Moeda</th>
                  <th className="text-right">Taxa anterior</th>
                  <th className="text-right">Taxa nova</th>
                  <th>Utilizador</th>
                </tr>
              </thead>
              <tbody>
                {HISTORICO.map((h, i) => {
                  const diff = ((h.taxaNova - h.taxaAnterior) / h.taxaAnterior) * 100;
                  return (
                    <tr key={i} className="hover:bg-ink-50/50 transition-colors">
                      <td className="px-4 py-2.5 border-t border-ink-100 text-xs text-ink-500">{h.data}</td>
                      <td className="px-4 py-2.5 border-t border-ink-100 text-center">
                        <span className="font-mono font-bold text-xs text-ink-700">{h.codigo}</span>
                      </td>
                      <td className="px-4 py-2.5 border-t border-ink-100 text-right text-xs font-mono text-ink-500">{fmt(h.taxaAnterior)}</td>
                      <td className="px-4 py-2.5 border-t border-ink-100 text-right">
                        <span className={`text-xs font-mono font-bold ${diff > 0 ? "text-green-600" : "text-brand-600"}`}>
                          {fmt(h.taxaNova)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 border-t border-ink-100 text-xs text-ink-500">{h.utilizador}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conversor + info */}
        <div className="space-y-4">
          {/* Conversor de moeda */}
          <div className="card p-5">
            <h3 className="font-semibold text-ink-800 mb-4">Conversor de Moeda</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Valor</label>
                <input className="input font-mono text-lg text-right" type="number" value={conversor.valor}
                  onChange={e => setConversor(p => ({ ...p, valor: e.target.value }))} />
              </div>
              <div>
                <label className="label">De</label>
                <select className="input" value={conversor.de} onChange={e => setConversor(p => ({ ...p, de: e.target.value }))}>
                  {moedas.filter(m => m.activa).map(m => (
                    <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-center">
                <button onClick={() => setConversor(p => ({ ...p, de: p.para, para: p.de }))}
                  className="w-8 h-8 rounded-full bg-ink-100 hover:bg-ink-200 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-ink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>
              <div>
                <label className="label">Para</label>
                <select className="input" value={conversor.para} onChange={e => setConversor(p => ({ ...p, para: e.target.value }))}>
                  {moedas.filter(m => m.activa).map(m => (
                    <option key={m.codigo} value={m.codigo}>{m.codigo} — {m.nome}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-aqua-50 border border-aqua-200 text-center">
                <p className="text-xs text-aqua-600 mb-1">{conversor.valor} {conversor.de} =</p>
                <p className="text-2xl font-bold text-aqua-700">
                  {fmt(resultadoConversao)} <span className="text-lg">{conversor.para}</span>
                </p>
                <p className="text-[11px] text-aqua-500 mt-1">
                  Taxa: 1 {conversor.de} = {fmt((moedas.find(m=>m.codigo===conversor.de)?.taxaParaAOA||1) / (moedas.find(m=>m.codigo===conversor.para)?.taxaParaAOA||1), 4)} {conversor.para}
                </p>
              </div>
            </div>
          </div>

          {/* Nota BNA */}
          <div className="card p-4 border-gold-200 bg-gold-50">
            <p className="text-xs font-bold text-gold-700 mb-1">Taxas BNA — Banco Nacional de Angola</p>
            <p className="text-xs text-gold-600">
              As taxas devem ser actualizadas conforme as taxas de referência publicadas pelo BNA (art. 12.º da Lei Cambial n.º 5/97). Para integração automática active a API BNA nas Configurações.
            </p>
          </div>

          {/* IFRS note */}
          <div className="card p-4 border-blue-200 bg-blue-50">
            <p className="text-xs font-bold text-blue-700 mb-1">IFRS — IAS 21</p>
            <p className="text-xs text-blue-600">
              As transacções em moeda estrangeira são convertidas à taxa de câmbio na data da transacção. As diferenças cambiais são reconhecidas em resultados (conta 68/78 PGCA).
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

function EditTaxaForm({
  moeda,
  onSave,
  onClose,
}: {
  moeda: Moeda;
  onSave: (novaTaxa: number) => void;
  onClose: () => void;
}) {
  const [novaTaxa, setNovaTaxa] = useState(moeda.taxaParaAOA.toString());
  function fmtLocal(n: number, decimals = 2) {
    return n.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center font-bold text-ink-700">{moeda.simbolo}</div>
        <div>
          <p className="font-bold text-ink-900">{moeda.codigo}</p>
          <p className="text-xs text-ink-400">{moeda.nome}</p>
        </div>
      </div>
      <label className="label">Nova taxa (1 {moeda.codigo} = X AOA)</label>
      <input className="input font-mono text-lg mb-1" type="number" step="0.01" value={novaTaxa} onChange={e => setNovaTaxa(e.target.value)} autoFocus />
      <p className="text-xs text-ink-400 mb-5">Taxa actual: <strong>{fmtLocal(moeda.taxaParaAOA)}</strong> AOA</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button onClick={() => { const t = parseFloat(novaTaxa); if (!isNaN(t) && t > 0) onSave(t); }} className="btn-aqua flex-1 justify-center">Actualizar</button>
      </div>
    </div>
  );
}

function EditarMoedaModal({
  moeda,
  onClose,
  onSave,
}: {
  moeda: Moeda;
  onClose: () => void;
  onSave: (patch: Partial<Moeda>) => void;
}) {
  const [form, setForm] = useState({
    nome: moeda.nome,
    simbolo: moeda.simbolo,
    taxaParaAOA: moeda.taxaParaAOA.toString(),
    activa: moeda.activa,
  });

  function save() {
    onSave({
      nome: form.nome,
      simbolo: form.simbolo,
      taxaParaAOA: parseFloat(form.taxaParaAOA) || moeda.taxaParaAOA,
      activa: form.activa,
      ultimaActualizacao: new Date().toISOString().slice(0, 10),
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Código</label>
            <input className="input font-mono bg-ink-50" value={moeda.codigo} readOnly disabled />
            <p className="text-xs text-ink-400 mt-1">O código não pode ser alterado</p>
          </div>
          <div>
            <label className="label">Símbolo *</label>
            <input className="input" value={form.simbolo} onChange={e => setForm({ ...form, simbolo: e.target.value })} placeholder="ex: $" />
          </div>
        </div>
        <div>
          <label className="label">Nome da moeda *</label>
          <input className="input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo da moeda" />
        </div>
        {!moeda.base && (
          <div>
            <label className="label">Taxa de câmbio para AOA (1 {moeda.codigo} = X AOA)</label>
            <input className="input font-mono" type="number" step="0.01" value={form.taxaParaAOA}
              onChange={e => setForm({ ...form, taxaParaAOA: e.target.value })} placeholder="0.00" />
          </div>
        )}
        {!moeda.base && (
          <label className="flex items-center gap-2 text-sm text-ink-700 cursor-pointer">
            <input type="checkbox" checked={form.activa} onChange={e => setForm({ ...form, activa: e.target.checked })} />
            Moeda activa
          </label>
        )}
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={save} disabled={!form.nome || !form.simbolo} className="btn-primary">Guardar Alterações</button>
      </div>
    </div>
  );
}
