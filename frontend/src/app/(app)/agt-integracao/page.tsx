"use client";

import { useState, useCallback } from "react";
import { useCollection } from "@/lib/useCollection";
import { useWindowManager } from "@/lib/windowManager";

// ── Tipos ─────────────────────────────────────────────────────────────────────
type SerieStatus = "activa" | "pendente" | "suspensa";
type DocumentType = "FT" | "FR" | "NC" | "ND" | "RC" | "GR";
type SubStatus = "pendente" | "submetido" | "aceite" | "rejeitado" | "erro";

interface Serie {
  id: string;
  serie: string;  // ex: "FT 2026/A"
  tipo: DocumentType;
  anoFiscal: number;
  codigoValidacaoAGT: string;
  prefixoATCUD: string;
  ultimoNumero: number;
  total: number;
  status: SerieStatus;
  registadoEm: string;
}

interface Fatura {
  id: string;
  numero: string; // ex: "FT 2026/A/00045"
  atcud: string;
  nifCliente: string;
  nomeCliente: string;
  data: string;
  totalSemIVA: number;
  iva: number;
  totalComIVA: number;
  hash: string;
  qrCode: string;
  subStatus: SubStatus;
  mensagemAGT?: string;
}

interface SaftSubmissao {
  id: string;
  periodo: string;
  ficheiro: string;
  tamanho: string;
  submissao: string;
  status: SubStatus;
  totalDocumentos: number;
  mensagem?: string;
}

const SERIES_SEED: Serie[] = [
  { id: "s1", serie: "FT 2026/A", tipo: "FT", anoFiscal: 2026, codigoValidacaoAGT: "CSDF3510", prefixoATCUD: "CSDF3510", ultimoNumero: 47, total: 47, status: "activa", registadoEm: "2026-01-02" },
  { id: "s2", serie: "FR 2026/A", tipo: "FR", anoFiscal: 2026, codigoValidacaoAGT: "CSDF3511", prefixoATCUD: "CSDF3511", ultimoNumero: 12, total: 12, status: "activa", registadoEm: "2026-01-02" },
  { id: "s3", serie: "NC 2026/A", tipo: "NC", anoFiscal: 2026, codigoValidacaoAGT: "CSDF3512", prefixoATCUD: "CSDF3512", ultimoNumero: 3, total: 3, status: "activa", registadoEm: "2026-01-02" },
  { id: "s4", serie: "ND 2026/A", tipo: "ND", anoFiscal: 2026, codigoValidacaoAGT: "CSDF3513", prefixoATCUD: "CSDF3513", ultimoNumero: 0, total: 0, status: "activa", registadoEm: "2026-01-02" },
  { id: "s5", serie: "RC 2026/A", tipo: "RC", anoFiscal: 2026, codigoValidacaoAGT: "CSDF3514", prefixoATCUD: "CSDF3514", ultimoNumero: 22, total: 22, status: "activa", registadoEm: "2026-01-02" },
];

const FATURAS_DEMO: Fatura[] = [
  { id: "f1", numero: "FT 2026/A/00047", atcud: "CSDF3510-47", nifCliente: "5412378901", nomeCliente: "Petro Distribuição SA", data: "2026-05-31", totalSemIVA: 1250000, iva: 175000, totalComIVA: 1425000, hash: "JkMn", qrCode: "A:5000123456*B:5412378901*C:AO*D:FT*E:N*F:20260531*G:CSDF3510-47*I5:1250000*I6:175000*O:175000*Q:1425000*R:JkMn", subStatus: "aceite" },
  { id: "f2", numero: "FT 2026/A/00046", atcud: "CSDF3510-46", nifCliente: "5399012345", nomeCliente: "Construções Unidas Lda.", data: "2026-05-30", totalSemIVA: 850000, iva: 119000, totalComIVA: 969000, hash: "LpQr", qrCode: "A:5000123456*B:5399012345*C:AO*D:FT*E:N*F:20260530*G:CSDF3510-46*I5:850000*I6:119000*O:119000*Q:969000*R:LpQr", subStatus: "aceite" },
  { id: "f3", numero: "FT 2026/A/00045", atcud: "CSDF3510-45", nifCliente: "5278934001", nomeCliente: "Telecom Angola SA", data: "2026-05-29", totalSemIVA: 3200000, iva: 448000, totalComIVA: 3648000, hash: "StUv", qrCode: "A:5000123456*B:5278934001*C:AO*D:FT*E:N*F:20260529*G:CSDF3510-45*I5:3200000*I6:448000*O:448000*Q:3648000*R:StUv", subStatus: "submetido" },
  { id: "f4", numero: "NC 2026/A/00003", atcud: "CSDF3512-3", nifCliente: "5412378901", nomeCliente: "Petro Distribuição SA", data: "2026-05-28", totalSemIVA: -150000, iva: -21000, totalComIVA: -171000, hash: "WxYz", qrCode: "A:5000123456*B:5412378901*C:AO*D:NC*E:N*F:20260528*G:CSDF3512-3*I5:150000*I6:21000*O:21000*Q:171000*R:WxYz", subStatus: "aceite" },
  { id: "f5", numero: "FT 2026/A/00044", atcud: "CSDF3510-44", nifCliente: "0000000000", nomeCliente: "Consumidor Final", data: "2026-05-27", totalSemIVA: 45000, iva: 6300, totalComIVA: 51300, hash: "AbCd", qrCode: "A:5000123456*B:0000000000*C:AO*D:FT*E:N*F:20260527*G:CSDF3510-44*I5:45000*I6:6300*O:6300*Q:51300*R:AbCd", subStatus: "erro", mensagemAGT: "NIF cliente inválido para valor acima de 50.000 AOA" },
];

const SAFT_DEMO: SaftSubmissao[] = [
  { id: "saft1", periodo: "Dezembro 2025", ficheiro: "SAFT_AO_5000123456_202512.xml", tamanho: "2.4 MB", submissao: "2026-01-15T09:00:00", status: "aceite", totalDocumentos: 128, mensagem: "Ficheiro aceite. Referência: AGT-2026-001234" },
  { id: "saft2", periodo: "Janeiro 2026",  ficheiro: "SAFT_AO_5000123456_202601.xml", tamanho: "1.8 MB", submissao: "2026-02-12T10:30:00", status: "aceite", totalDocumentos: 95, mensagem: "Ficheiro aceite. Referência: AGT-2026-002456" },
  { id: "saft3", periodo: "Fevereiro 2026",ficheiro: "SAFT_AO_5000123456_202602.xml", tamanho: "2.1 MB", submissao: "2026-03-10T11:15:00", status: "aceite", totalDocumentos: 112, mensagem: "Ficheiro aceite. Referência: AGT-2026-003789" },
  { id: "saft4", periodo: "Março 2026",    ficheiro: "SAFT_AO_5000123456_202603.xml", tamanho: "1.9 MB", submissao: "2026-04-08T09:45:00", status: "aceite", totalDocumentos: 103, mensagem: "Ficheiro aceite. Referência: AGT-2026-005012" },
  { id: "saft5", periodo: "Abril 2026",    ficheiro: "SAFT_AO_5000123456_202604.xml", tamanho: "2.3 MB", submissao: "2026-05-07T14:00:00", status: "aceite", totalDocumentos: 119, mensagem: "Ficheiro aceite. Referência: AGT-2026-006234" },
  { id: "saft6", periodo: "Maio 2026",     ficheiro: "SAFT_AO_5000123456_202605.xml", tamanho: "—",      submissao: "—",                   status: "pendente", totalDocumentos: 47, mensagem: "Prazo: 10 Junho 2026" },
];

const TIPO_LABELS: Record<DocumentType, { label: string; color: string }> = {
  FT: { label: "Factura",            color: "bg-blue-100 text-blue-700" },
  FR: { label: "Factura Recibo",     color: "bg-aqua-100 text-aqua-700" },
  NC: { label: "Nota de Crédito",    color: "bg-green-100 text-green-700" },
  ND: { label: "Nota de Débito",     color: "bg-gold-100 text-gold-700" },
  RC: { label: "Recibo",             color: "bg-purple-100 text-purple-700" },
  GR: { label: "Guia de Remessa",    color: "bg-ink-100 text-ink-600" },
};

const SUB_STATUS: Record<SubStatus, { label: string; color: string; dot: string }> = {
  pendente:   { label: "Pendente",   color: "bg-ink-100 text-ink-500",    dot: "bg-ink-400" },
  submetido:  { label: "Submetido",  color: "bg-gold-100 text-gold-700",  dot: "bg-gold-500" },
  aceite:     { label: "Aceite AGT", color: "bg-green-100 text-green-700",dot: "bg-green-500" },
  rejeitado:  { label: "Rejeitado",  color: "bg-brand-100 text-brand-700",dot: "bg-brand-500" },
  erro:       { label: "Erro",       color: "bg-brand-100 text-brand-700",dot: "bg-brand-600" },
};

function fmt(n: number) { return new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 0 }).format(Math.abs(n)) + " AOA"; }

type Tab = "series" | "faturas" | "saft" | "config";

const LS_KEY_SERIES = "educontas-agt-series";

// ── Editar Série Form ─────────────────────────────────────────────────────────
interface EditSerieFormProps {
  serie: Serie;
  onClose: () => void;
  onSave: (s: Serie) => void;
}

function EditSerieForm({ serie, onClose, onSave }: EditSerieFormProps) {
  const [form, setForm] = useState({
    serie: serie.serie,
    tipo: serie.tipo,
    anoFiscal: serie.anoFiscal,
    codigoValidacaoAGT: serie.codigoValidacaoAGT,
    prefixoATCUD: serie.prefixoATCUD,
    status: serie.status,
  });

  function handleSave() {
    onSave({
      ...serie,
      serie: form.serie,
      tipo: form.tipo,
      anoFiscal: form.anoFiscal,
      codigoValidacaoAGT: form.codigoValidacaoAGT,
      prefixoATCUD: form.prefixoATCUD,
      status: form.status,
    });
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="label">Tipo de Documento *</label>
          <select className="input" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as DocumentType }))}>
            {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Designação da Série *</label>
          <input className="input font-mono" value={form.serie}
            onChange={e => setForm(p => ({ ...p, serie: e.target.value }))} />
        </div>
        <div>
          <label className="label">Ano Fiscal</label>
          <input className="input" type="number" value={form.anoFiscal}
            onChange={e => setForm(p => ({ ...p, anoFiscal: +e.target.value }))} />
        </div>
        <div>
          <label className="label">Código de Validação AGT</label>
          <input className="input font-mono" value={form.codigoValidacaoAGT}
            onChange={e => setForm(p => ({ ...p, codigoValidacaoAGT: e.target.value }))} />
        </div>
        <div>
          <label className="label">Prefixo ATCUD</label>
          <input className="input font-mono" value={form.prefixoATCUD}
            onChange={e => setForm(p => ({ ...p, prefixoATCUD: e.target.value }))} />
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as SerieStatus }))}>
            <option value="activa">Activa</option>
            <option value="pendente">Pendente</option>
            <option value="suspensa">Suspensa</option>
          </select>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={handleSave} className="btn-primary">Guardar Alterações</button>
      </div>
    </div>
  );
}

// ── Registar Série Form ───────────────────────────────────────────────────────
interface RegistarSerieFormProps {
  onClose: () => void;
  onSave: (s: Serie) => void;
}

function RegistarSerieForm({ onClose, onSave }: RegistarSerieFormProps) {
  const [novaSerieForm, setNovaSerieForm] = useState({ tipo: "FT" as DocumentType, serie: "", ano: 2026 });

  function handleRegistar() {
    const codigoSimulado = "CSDF" + Math.floor(3515 + Math.random() * 100);
    const nova: Serie = {
      id: crypto.randomUUID(),
      serie: novaSerieForm.serie || `${novaSerieForm.tipo} ${novaSerieForm.ano}/A`,
      tipo: novaSerieForm.tipo,
      anoFiscal: novaSerieForm.ano,
      codigoValidacaoAGT: codigoSimulado,
      prefixoATCUD: codigoSimulado,
      ultimoNumero: 0,
      total: 0,
      status: "pendente",
      registadoEm: new Date().toISOString().split("T")[0],
    };
    onSave(nova);
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="label">Tipo de Documento *</label>
          <select className="input" value={novaSerieForm.tipo} onChange={e => setNovaSerieForm(p => ({ ...p, tipo: e.target.value as DocumentType }))}>
            {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Designação da Série *</label>
          <input className="input font-mono" value={novaSerieForm.serie}
            onChange={e => setNovaSerieForm(p => ({ ...p, serie: e.target.value }))}
            placeholder={`${novaSerieForm.tipo} ${novaSerieForm.ano}/A`} />
          <p className="text-xs text-ink-400 mt-1">Exemplo: FT 2026/B (para segunda série do ano)</p>
        </div>
        <div>
          <label className="label">Ano Fiscal</label>
          <input className="input" type="number" value={novaSerieForm.ano} onChange={e => setNovaSerieForm(p => ({ ...p, ano: +e.target.value }))} />
        </div>
        <div className="p-4 rounded-xl bg-gold-50 border border-gold-200 text-xs text-gold-700">
          <p className="font-semibold mb-1">Processo de registo:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>EduContas envia pedido ao WebService AGT</li>
            <li>AGT valida o NIF e o certificado de software</li>
            <li>AGT devolve o <strong>Código de Validação</strong></li>
            <li>Série fica activa para emissão de documentos</li>
          </ol>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={handleRegistar} className="btn-primary">Registar na AGT</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgtIntegracaoPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [tab, setTab] = useState<Tab>("series");
  const { items: series, setItems: setSeries } = useCollection<Serie>(LS_KEY_SERIES, SERIES_SEED);
  const [faturas] = useState<Fatura[]>(FATURAS_DEMO);
  const [saftList] = useState<SaftSubmissao[]>(SAFT_DEMO);
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null);
  const [gerandoSAFT, setGerandoSAFT] = useState(false);

  const addSerie    = useCallback((nova: Serie)    => setSeries(prev => [...prev, nova]),                             [setSeries]);
  const updateSerie = useCallback((updated: Serie) => setSeries(prev => prev.map(s => s.id === updated.id ? updated : s)), [setSeries]);
  const deleteSerie = useCallback((id: string)     => setSeries(prev => prev.filter(s => s.id !== id)),              [setSeries]);

  const stats = {
    totalSeries: series.filter(s => s.status === "activa").length,
    totalFaturas: series.reduce((s, x) => s + x.ultimoNumero, 0),
    pendentes: faturas.filter(f => f.subStatus === "pendente" || f.subStatus === "submetido").length,
    erros: faturas.filter(f => f.subStatus === "erro" || f.subStatus === "rejeitado").length,
  };

  const gerarSAFT = useCallback(() => {
    setGerandoSAFT(true);
    setTimeout(() => setGerandoSAFT(false), 2500);
  }, []);

  function openRegistarSerie() {
    const winId = `agt-serie-${crypto.randomUUID()}`;
    openWindow({
      id: winId,
      title: "Registar Nova Série na AGT",
      icon: "📋",
      content: <RegistarSerieForm
        onClose={() => closeWindow(winId)}
        onSave={addSerie}
      />,
      x: 40, y: 20, width: 680, height: 480, minimized: false, maximized: false,
    });
  }

  function openEditarSerie(s: Serie) {
    const winId = `agt-edit-serie-${s.id}`;
    openWindow({
      id: winId,
      title: "Editar Série",
      icon: "✏️",
      content: <EditSerieForm
        serie={s}
        onClose={() => closeWindow(winId)}
        onSave={updateSerie}
      />,
      x: 60, y: 30, width: 620, height: 520, minimized: false, maximized: false,
    });
  }

  function openDeleteSerie(s: Serie) {
    const winId = `agt-del-serie-${s.id}`;
    openWindow({
      id: winId,
      title: "Confirmar Eliminação",
      icon: "🗑️",
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-sm text-gray-700">
              Tem a certeza que deseja eliminar a série <strong className="font-mono">{s.serie}</strong>?
            </p>
            <p className="text-xs text-red-600 font-medium">Esta acção não pode ser revertida. A série ficará indisponível para emissão de documentos.</p>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
            <button onClick={() => closeWindow(winId)} className="btn-secondary">Cancelar</button>
            <button onClick={() => { deleteSerie(s.id); closeWindow(winId); }} className="btn-primary bg-red-600 hover:bg-red-700">
              Eliminar Série
            </button>
          </div>
        </div>
      ),
      x: 200, y: 150, width: 480, height: 220, minimized: false, maximized: false,
    });
  }

  const TABS: { id: Tab; label: string; badge?: string }[] = [
    { id: "series",  label: "Séries Documentais" },
    { id: "faturas", label: "Documentos",          badge: stats.erros > 0 ? stats.erros.toString() : undefined },
    { id: "saft",    label: "SAF-T AO" },
    { id: "config",  label: "Configuração AGT" },
  ];

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2 flex-wrap">
            <span>Integração AGT</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">● Ligado</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-ink-100 text-ink-600 rounded-full">Facturação Electrónica</span>
          </h1>
          <p className="text-sm text-ink-500 mt-0.5">Administração Geral Tributária · NIF 5000123456 · Agência Luanda Urbano</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={gerarSAFT} disabled={gerandoSAFT} className="btn-secondary text-xs">
            {gerandoSAFT ? (
              <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-ink-400 border-t-transparent rounded-full" />A gerar...</>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Exportar SAF-T</>
            )}
          </button>
          <button onClick={openRegistarSerie} className="btn-primary text-xs">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registar Série
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Séries Activas", value: stats.totalSeries, color: "text-green-600", icon: "●" },
          { label: "Documentos 2026", value: stats.totalFaturas, color: "text-ink-800", icon: "#" },
          { label: "Aguardam Confirmação", value: stats.pendentes, color: "text-gold-600", icon: "⏳" },
          { label: "Erros / Rejeições", value: stats.erros, color: stats.erros > 0 ? "text-brand-600" : "text-green-600", icon: stats.erros > 0 ? "!" : "✓" },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{k.label}</p>
            <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink-200 mb-6 gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? "border-brand-600 text-brand-600" : "border-transparent text-ink-500 hover:text-ink-700"}`}>
            {t.label}
            {t.badge && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-brand-600 text-white rounded-full">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── TAB: Séries Documentais ──────────────────────────────────────────── */}
      {tab === "series" && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="card-header">
              <h3 className="font-semibold text-ink-800">Séries Registadas na AGT</h3>
            </div>
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th>Série</th>
                  <th className="text-center">Tipo</th>
                  <th>Código AGT</th>
                  <th>Prefixo ATCUD</th>
                  <th className="text-right">Último Nº</th>
                  <th className="text-center">Estado</th>
                  <th className="text-center">Acções</th>
                </tr>
              </thead>
              <tbody>
                {series.map(s => {
                  const tc = TIPO_LABELS[s.tipo];
                  return (
                    <tr key={s.id} className="hover:bg-ink-50/50 transition-colors">
                      <td className="px-4 py-3 border-t border-ink-100">
                        <p className="font-mono font-bold text-ink-800">{s.serie}</p>
                        <p className="text-xs text-ink-400">Reg. {s.registadoEm}</p>
                      </td>
                      <td className="px-4 py-3 border-t border-ink-100 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${tc.color}`}>{tc.label}</span>
                      </td>
                      <td className="px-4 py-3 border-t border-ink-100">
                        <span className="font-mono text-sm text-ink-700">{s.codigoValidacaoAGT}</span>
                      </td>
                      <td className="px-4 py-3 border-t border-ink-100">
                        <span className="font-mono text-sm text-aqua-600">{s.prefixoATCUD}</span>
                      </td>
                      <td className="px-4 py-3 border-t border-ink-100 text-right">
                        <span className="font-bold text-ink-800">{s.ultimoNumero.toString().padStart(5, "0")}</span>
                      </td>
                      <td className="px-4 py-3 border-t border-ink-100 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.status === "activa" ? "bg-green-100 text-green-700" : s.status === "suspensa" ? "bg-red-100 text-red-700" : "bg-gold-100 text-gold-700"}`}>
                          {s.status === "activa" ? "Activa" : s.status === "suspensa" ? "Suspensa" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-t border-ink-100 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditarSerie(s)}
                            title="Editar série"
                            className="text-blue-600 hover:text-blue-800 px-1.5 py-1 rounded hover:bg-blue-50 transition-colors text-sm"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => openDeleteSerie(s)}
                            title="Eliminar série"
                            className="text-red-500 hover:text-red-700 px-1.5 py-1 rounded hover:bg-red-50 transition-colors text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 rounded-xl border border-gold-200 bg-gold-50 flex items-start gap-3">
            <svg className="w-5 h-5 text-gold-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="font-semibold text-gold-800">ATCUD — Código Único de Documento</p>
              <p className="text-xs text-gold-700 mt-1">
                Formato: <strong className="font-mono">CÓDIGO_VALIDAÇÃO-NÚMERO_SEQUENCIAL</strong> (ex: CSDF3510-47).
                O código de validação é atribuído pela AGT no registo da série. Obrigatório em todos os documentos fiscais desde 2024 (DP 71/25).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Documentos ─────────────────────────────────────────────────── */}
      {tab === "faturas" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="card overflow-hidden">
              <div className="card-header">
                <h3 className="font-semibold text-ink-800">Documentos Fiscais Recentes</h3>
              </div>
              <div className="divide-y divide-ink-100">
                {faturas.map(f => {
                  const ss = SUB_STATUS[f.subStatus];
                  const isSelected = selectedFatura?.id === f.id;
                  return (
                    <button key={f.id} onClick={() => setSelectedFatura(isSelected ? null : f)}
                      className={`w-full flex items-start gap-4 px-5 py-3.5 text-left transition-colors hover:bg-ink-50/50 ${isSelected ? "bg-brand-50" : ""}`}>
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${ss.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-ink-800">{f.numero}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ss.color}`}>{ss.label}</span>
                        </div>
                        <p className="text-xs text-ink-500 mt-0.5">{f.nomeCliente} · NIF {f.nifCliente}</p>
                        {f.mensagemAGT && <p className="text-xs text-brand-600 mt-0.5">{f.mensagemAGT}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-ink-800">{fmt(f.totalComIVA)}</p>
                        <p className="text-xs text-ink-400">{f.data}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detalhe fatura */}
          <div className="lg:col-span-2">
            {selectedFatura ? (
              <div className="card overflow-hidden">
                <div className={`h-1.5 ${selectedFatura.subStatus === "aceite" ? "bg-green-500" : selectedFatura.subStatus === "erro" ? "bg-brand-500" : "bg-gold-400"}`} />
                <div className="p-5 space-y-4">
                  <div>
                    <p className="font-mono font-bold text-ink-900">{selectedFatura.numero}</p>
                    <p className="text-xs text-ink-400">{selectedFatura.data} · {selectedFatura.nomeCliente}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-500">Base Tributável</span>
                      <span className="font-medium">{fmt(selectedFatura.totalSemIVA)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">IVA (14%)</span>
                      <span className="font-medium">{fmt(selectedFatura.iva)}</span>
                    </div>
                    <div className="flex justify-between border-t border-ink-100 pt-2">
                      <span className="font-bold text-ink-800">Total</span>
                      <span className="font-bold text-ink-900">{fmt(selectedFatura.totalComIVA)}</span>
                    </div>
                  </div>

                  {/* ATCUD */}
                  <div className="p-3 rounded-lg bg-aqua-50 border border-aqua-200">
                    <p className="text-[10px] font-bold text-aqua-600 uppercase tracking-wide mb-1">ATCUD</p>
                    <p className="font-mono font-bold text-aqua-700">{selectedFatura.atcud}</p>
                  </div>

                  {/* Hash */}
                  <div className="p-3 rounded-lg bg-ink-50 border border-ink-200">
                    <p className="text-[10px] font-bold text-ink-500 uppercase tracking-wide mb-1">Hash (4 caracteres)</p>
                    <p className="font-mono font-bold text-ink-700 text-lg">{selectedFatura.hash}</p>
                    <p className="text-[10px] text-ink-400 mt-1">Incluído no QR Code e no rodapé do documento</p>
                  </div>

                  {/* QR Code simulado */}
                  <div className="p-3 rounded-lg bg-white border border-ink-200">
                    <p className="text-[10px] font-bold text-ink-500 uppercase tracking-wide mb-2">QR Code AGT (conteúdo)</p>
                    <div className="w-24 h-24 mx-auto mb-2 bg-ink-900 rounded-lg flex items-center justify-center">
                      <div className="grid grid-cols-5 gap-0.5 p-2">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div key={i} className={`w-2.5 h-2.5 rounded-sm ${Math.random() > 0.5 ? "bg-white" : "bg-ink-900"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="text-[9px] text-ink-400 break-all leading-relaxed font-mono">{selectedFatura.qrCode.slice(0, 80)}...</p>
                  </div>

                  {selectedFatura.mensagemAGT && (
                    <div className="p-3 rounded-lg bg-brand-50 border border-brand-200">
                      <p className="text-xs font-semibold text-brand-700">Mensagem AGT</p>
                      <p className="text-xs text-brand-600 mt-1">{selectedFatura.mensagemAGT}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card p-6 text-center border-dashed">
                <div className="w-12 h-12 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-ink-500">Seleccione um documento para ver o ATCUD, hash e QR Code</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: SAF-T AO ───────────────────────────────────────────────────── */}
      {tab === "saft" && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="card-header flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink-800">Ficheiros SAF-T AO Submetidos</h3>
                <p className="text-xs text-ink-400 mt-0.5">Standard Audit File for Tax — Angola · Portaria n.º 163/21</p>
              </div>
              <button onClick={gerarSAFT} disabled={gerandoSAFT} className="btn-primary text-xs">
                {gerandoSAFT ? "A gerar..." : "Gerar SAF-T Maio 2026"}
              </button>
            </div>
            <table className="table-auto w-full">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Ficheiro</th>
                  <th className="text-center">Documentos</th>
                  <th>Data Submissão</th>
                  <th className="text-center">Estado</th>
                  <th>Referência AGT</th>
                </tr>
              </thead>
              <tbody>
                {saftList.map(s => {
                  const ss = SUB_STATUS[s.status];
                  return (
                    <tr key={s.id} className="hover:bg-ink-50/50 transition-colors">
                      <td className="px-4 py-3 border-t border-ink-100">
                        <span className="font-semibold text-ink-800 text-sm">{s.periodo}</span>
                      </td>
                      <td className="px-4 py-3 border-t border-ink-100">
                        <p className="font-mono text-xs text-ink-700">{s.ficheiro}</p>
                        <p className="text-[11px] text-ink-400">{s.tamanho}</p>
                      </td>
                      <td className="px-4 py-3 border-t border-ink-100 text-center">
                        <span className="font-bold text-ink-800">{s.totalDocumentos}</span>
                      </td>
                      <td className="px-4 py-3 border-t border-ink-100 text-xs text-ink-500">
                        {s.submissao === "—" ? "—" : new Date(s.submissao).toLocaleString("pt-PT")}
                      </td>
                      <td className="px-4 py-3 border-t border-ink-100 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ss.color}`}>{ss.label}</span>
                      </td>
                      <td className="px-4 py-3 border-t border-ink-100 text-xs text-ink-500">{s.mensagem}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50">
              <p className="font-semibold text-blue-800 text-sm mb-2">Estrutura SAF-T AO (XML)</p>
              <div className="font-mono text-xs text-blue-700 space-y-0.5">
                <p>📄 AuditFile</p>
                <p className="ml-3">├── Header (empresa, período, moeda)</p>
                <p className="ml-3">├── MasterFiles</p>
                <p className="ml-6">│   ├── GeneralLedgerAccounts (PGCA)</p>
                <p className="ml-6">│   ├── Customer (clientes)</p>
                <p className="ml-6">│   ├── Supplier (fornecedores)</p>
                <p className="ml-6">│   └── Product (artigos)</p>
                <p className="ml-3">├── GeneralLedgerEntries (diário)</p>
                <p className="ml-3">└── SourceDocuments</p>
                <p className="ml-6">    ├── SalesInvoices (FT/FR/NC/ND)</p>
                <p className="ml-6">    ├── MovementOfGoods (GR)</p>
                <p className="ml-6">    └── Payments (RC)</p>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-gold-200 bg-gold-50 space-y-3">
              <p className="font-semibold text-gold-800 text-sm">Obrigações SAF-T AO</p>
              <div className="space-y-2 text-xs text-gold-700">
                <div className="flex items-start gap-2">
                  <span className="text-gold-500 font-bold shrink-0">•</span>
                  <span>Submissão mensal até ao <strong>dia 10 do mês seguinte</strong> (art. 8.º Portaria 163/21)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gold-500 font-bold shrink-0">•</span>
                  <span>Ficheiro em formato <strong>XML</strong> com esquema XSD da AGT</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gold-500 font-bold shrink-0">•</span>
                  <span>Moeda base <strong>AOA</strong>; valores em moeda estrangeira incluem taxa de câmbio BNA</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gold-500 font-bold shrink-0">•</span>
                  <span>Todos os documentos com <strong>ATCUD</strong> obrigatório (DP 71/25)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gold-500 font-bold shrink-0">•</span>
                  <span>Coima por omissão: <strong>de 1% a 3%</strong> do imposto em falta</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Configuração AGT ────────────────────────────────────────────── */}
      {tab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-ink-800">Credenciais AGT WebService</h3>
            <div>
              <label className="label">NIF da Empresa</label>
              <input className="input font-mono" defaultValue="5000123456" readOnly />
            </div>
            <div>
              <label className="label">Username AGT Portal</label>
              <input className="input" defaultValue="empresa.demo@agt.minfin.gov.ao" />
            </div>
            <div>
              <label className="label">Password AGT</label>
              <input className="input" type="password" defaultValue="••••••••••" />
            </div>
            <div>
              <label className="label">Endpoint AGT WebService</label>
              <input className="input font-mono text-xs" defaultValue="https://www.agt.minfin.gov.ao/FacturacaoEletronica/api/v1" />
            </div>
            <div>
              <label className="label">Certificado de Software</label>
              <div className="flex gap-2">
                <input className="input font-mono text-xs flex-1" defaultValue="SW-CERT-2026-EDUCONTAS-001" readOnly />
                <button className="btn-secondary text-xs px-3">Renovar</button>
              </div>
              <p className="text-xs text-ink-400 mt-1">Valido até: 31/12/2026</p>
            </div>
            <button className="btn-primary w-full justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Testar Ligação AGT
            </button>
          </div>

          <div className="space-y-4">
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold text-ink-800">Assinatura de Documentos</h3>
              <div>
                <label className="label">Chave Privada RSA (1024 bits)</label>
                <textarea className="input font-mono text-[10px] resize-none" rows={4}
                  defaultValue="-----BEGIN PRIVATE KEY-----&#10;MIIEvQIBADANBgkqhkiG9w0BAQEF...&#10;[CHAVE PROTEGIDA — NÃO PARTILHAR]&#10;-----END PRIVATE KEY-----" readOnly />
              </div>
              <div>
                <label className="label">Chave Pública (registada na AGT)</label>
                <textarea className="input font-mono text-[10px] resize-none" rows={3}
                  defaultValue="-----BEGIN PUBLIC KEY-----&#10;MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCg...&#10;-----END PUBLIC KEY-----" readOnly />
              </div>
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
                ✓ Chave registada e validada pela AGT em 02/01/2026
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-ink-800 mb-3">Algoritmo de Assinatura</h3>
              <div className="space-y-2 text-xs text-ink-600">
                <div className="flex justify-between py-1.5 border-b border-ink-100">
                  <span>Algoritmo Hash</span><strong>SHA-1 (conforme AGT)</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-ink-100">
                  <span>Algoritmo Assinatura</span><strong>RSA 1024-bit</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-ink-100">
                  <span>Campos assinados</span><strong>Data; Total; Hash anterior</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span>Cadeia de hashes</span><strong className="text-green-600">Activa (anti-adulteração)</strong>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-ink-50 text-xs font-mono text-ink-600">
                <p className="text-[10px] text-ink-400 mb-1">Fórmula do hash (4 chars):</p>
                <p>Hash = RSA_SHA1(Data + &quot;;&quot; + TotalSemIVA + &quot;;&quot; + TotalComIVA + &quot;;&quot; + HashAnterior)</p>
                <p className="text-[10px] text-ink-400 mt-1">→ Codificado em Base64 → extrair posições 1, 11, 21, 31</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
