"use client";

import { useState, useMemo } from "react";
import { useCollection } from "@/lib/useCollection";
import Topbar from "@/components/Topbar";
import { useWindowManager } from "@/lib/windowManager";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";

// ── Types ──────────────────────────────────────────────────────────────────────
type TipoDocumento = "FT" | "FR" | "FA" | "FG" | "FGL" | "ND" | "NC" | "AR" | "AC" | "TV" | "RC" | "RG" | "RE" | "AF" | "RF" | "RA" | "GT" | "GE";
type EstadoDocumento = "RASCUNHO" | "EMITIDO" | "CANCELADO" | "ESTORNADO";
type EstadoSerie = "A" | "U" | "F";
type MetodoFacturacao = "FESF" | "FEPC" | "SF";
type TipoRetencao = "IRT" | "II" | "IS" | "IVA" | "IP" | "IAC" | "OU" | "IRPC" | "IRPS";
type CodigoImposto = "IVA" | "IEC" | "ISENTO";
type MetodoPagamento = "DIN" | "TRF" | "CHQ" | "MUL" | "OUT";
type ClasseDocumento = "N" | "AF" | "AT";
type Tab = "documentos" | "series" | "retencoes" | "exportar";

interface LinhaDocumento {
  id: string;
  produtoCodigo: string;
  produtoDescricao: string;
  quantidade: number;
  precoUnitario: number;
  unidade: string;
  codigoImposto: CodigoImposto;
  taxaImposto: number;
  baseImponivel: number;
  valorImposto: number;
  valorDebito: number;
  valorCredito: number;
  codigoIsencao?: string;
  motivoIsencao?: string;
}

interface PagamentoFactura {
  id: string;
  metodo: MetodoPagamento;
  valor: number;
  data: string;
  referencia?: string;
}

interface RetencaoFonte {
  id: string;
  tipo: TipoRetencao;
  descricao?: string;
  taxa?: number;
  valor: number;
}

interface DocumentoFacturacao {
  id: string;
  documentoId: string;
  serie: string;
  numero: number;
  numeroDocumento: string;
  data: string;
  tipo: TipoDocumento;
  classe: ClasseDocumento;
  documentoCanceladoNumero?: string;
  preDocumentoNumero?: string;
  documentoOrigemId?: string;
  nifCliente: string;
  nomeCliente: string;
  paisCliente: string;
  linhas: LinhaDocumento[];
  pagamentos: PagamentoFactura[];
  retencoes: RetencaoFonte[];
  totalBase: number;
  totalIVA: number;
  totalBruto: number;
  totalRetencoes: number;
  totalAPagar: number;
  metodo: MetodoFacturacao;
  estado: EstadoDocumento;
  observacoes?: string;
  exercicio: string;
}

interface SerieFacturacao {
  id: string;
  codigo: string;
  tipo: TipoDocumento;
  ano: number;
  nif: string;
  estado: EstadoSerie;
  dataAbertura: string;
  dataFecho?: string;
  ultimoNumero: number;
  metodo: MetodoFacturacao;
  exercicio: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const EMPRESA_NIF = "5000123456";

const TIPO_LABELS: Record<TipoDocumento, string> = {
  FT:  "Factura",
  FR:  "Factura-Recibo",
  FA:  "Factura de Adiantamento",
  FG:  "Factura Genérica",
  FGL: "Factura Global",
  ND:  "Nota de Débito",
  NC:  "Nota de Crédito",
  AR:  "Aviso de Cobrança/Recibo",
  AC:  "Aviso de Cobrança",
  TV:  "Talão de Venda",
  RC:  "Recibo Emitido",
  RG:  "Outros Recibos Emitidos",
  RE:  "Estorno ou Recibo de Estorno",
  AF:  "Factura/Recibo de Auto-Facturação",
  RF:  "Prémio ou Recibo de Prémio",
  RA:  "Reasseguro Aceite",
  GT:  "Guia de Transporte",
  GE:  "Guia de Entrega",
};

const TIPO_BADGE_COLOR: Record<TipoDocumento, string> = {
  FT:  "bg-blue-100 text-blue-700",
  FR:  "bg-blue-100 text-blue-700",
  FA:  "bg-purple-100 text-purple-700",
  FG:  "bg-indigo-100 text-indigo-700",
  FGL: "bg-indigo-100 text-indigo-700",
  ND:  "bg-orange-100 text-orange-700",
  NC:  "bg-green-100 text-green-700",
  AR:  "bg-gray-100 text-gray-600",
  AC:  "bg-gray-100 text-gray-600",
  TV:  "bg-yellow-100 text-yellow-700",
  RC:  "bg-emerald-100 text-emerald-700",
  RG:  "bg-emerald-100 text-emerald-700",
  RE:  "bg-red-100 text-red-700",
  AF:  "bg-purple-100 text-purple-700",
  RF:  "bg-yellow-100 text-yellow-700",
  RA:  "bg-gray-100 text-gray-600",
  GT:  "bg-teal-100 text-teal-700",
  GE:  "bg-teal-100 text-teal-700",
};

const SERIE_ESTADO_BADGE: Record<EstadoSerie, { label: string; cls: string }> = {
  A: { label: "Aberta",         cls: "bg-blue-100 text-blue-700" },
  U: { label: "Em Utilização", cls: "bg-green-100 text-green-700" },
  F: { label: "Fechada",        cls: "bg-gray-100 text-gray-600" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtAOA(v: number) {
  return `Kz ${v.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}`;
}

const newId = () => crypto.randomUUID();

function calcLinha(l: LinhaDocumento): LinhaDocumento {
  const base = l.quantidade * l.precoUnitario;
  const imposto = l.codigoImposto !== "ISENTO" ? base * (l.taxaImposto / 100) : 0;
  const total = base + imposto;
  return { ...l, baseImponivel: base, valorImposto: imposto, valorDebito: total, valorCredito: 0 };
}

// ── Seeds ──────────────────────────────────────────────────────────────────────
function seedDocs(exercicio: string): DocumentoFacturacao[] {
  const nif = EMPRESA_NIF;
  const serie1 = `${nif}/FT/${exercicio}`;
  const serie2 = `${nif}/NC/${exercicio}`;
  const docs: DocumentoFacturacao[] = [
    {
      id: newId(), documentoId: "DOC-001", serie: serie1, numero: 1,
      numeroDocumento: `FT ${nif}/${exercicio}/1`,
      data: `${exercicio}-01-10`, tipo: "FT", classe: "N",
      nifCliente: "5412378901", nomeCliente: "PETRO DISTRIBUIÇÃO SA", paisCliente: "AO",
      linhas: [calcLinha({ id: newId(), produtoCodigo: "SRV001", produtoDescricao: "Serviços de Consultoria", quantidade: 10, precoUnitario: 50000, unidade: "HR", codigoImposto: "IVA", taxaImposto: 14, baseImponivel: 0, valorImposto: 0, valorDebito: 0, valorCredito: 0 })],
      pagamentos: [], retencoes: [],
      totalBase: 500000, totalIVA: 70000, totalBruto: 570000, totalRetencoes: 0, totalAPagar: 570000,
      metodo: "FESF", estado: "EMITIDO", exercicio,
    },
    {
      id: newId(), documentoId: "DOC-002", serie: serie1, numero: 2,
      numeroDocumento: `FT ${nif}/${exercicio}/2`,
      data: `${exercicio}-02-15`, tipo: "FT", classe: "N",
      nifCliente: "5399012345", nomeCliente: "CONSTRUÇÕES UNIDAS LDA", paisCliente: "AO",
      linhas: [calcLinha({ id: newId(), produtoCodigo: "MAT001", produtoDescricao: "Material de Construção", quantidade: 100, precoUnitario: 8500, unidade: "UN", codigoImposto: "IVA", taxaImposto: 14, baseImponivel: 0, valorImposto: 0, valorDebito: 0, valorCredito: 0 })],
      pagamentos: [], retencoes: [{ id: newId(), tipo: "IRPC", descricao: "Retenção IRPC 6.5%", taxa: 6.5, valor: 55250 }],
      totalBase: 850000, totalIVA: 119000, totalBruto: 969000, totalRetencoes: 55250, totalAPagar: 913750,
      metodo: "FESF", estado: "EMITIDO", exercicio,
    },
    {
      id: newId(), documentoId: "DOC-003", serie: serie2, numero: 1,
      numeroDocumento: `NC ${nif}/${exercicio}/1`,
      data: `${exercicio}-03-05`, tipo: "NC", classe: "N",
      documentoOrigemId: `FT ${nif}/${exercicio}/1`,
      nifCliente: "5412378901", nomeCliente: "PETRO DISTRIBUIÇÃO SA", paisCliente: "AO",
      linhas: [calcLinha({ id: newId(), produtoCodigo: "SRV001", produtoDescricao: "Devolução parcial — Serviços", quantidade: 2, precoUnitario: 50000, unidade: "HR", codigoImposto: "IVA", taxaImposto: 14, baseImponivel: 0, valorImposto: 0, valorDebito: 0, valorCredito: 0 })],
      pagamentos: [], retencoes: [],
      totalBase: 100000, totalIVA: 14000, totalBruto: 114000, totalRetencoes: 0, totalAPagar: 114000,
      metodo: "FESF", estado: "EMITIDO", exercicio,
    },
    {
      id: newId(), documentoId: "DOC-004", serie: serie1, numero: 3,
      numeroDocumento: `FT ${nif}/${exercicio}/3`,
      data: `${exercicio}-04-20`, tipo: "FT", classe: "N",
      nifCliente: "5278934001", nomeCliente: "ANGOLA TELECOM SA", paisCliente: "AO",
      linhas: [calcLinha({ id: newId(), produtoCodigo: "SFT001", produtoDescricao: "Licença de Software Anual", quantidade: 1, precoUnitario: 1200000, unidade: "UN", codigoImposto: "IVA", taxaImposto: 14, baseImponivel: 0, valorImposto: 0, valorDebito: 0, valorCredito: 0 })],
      pagamentos: [], retencoes: [],
      totalBase: 1200000, totalIVA: 168000, totalBruto: 1368000, totalRetencoes: 0, totalAPagar: 1368000,
      metodo: "FESF", estado: "RASCUNHO", exercicio,
    },
  ];
  return docs;
}

function seedSeries(exercicio: string): SerieFacturacao[] {
  const nif = EMPRESA_NIF;
  return [
    { id: newId(), codigo: `${nif}/FT/${exercicio}`, tipo: "FT", ano: +exercicio, nif, estado: "U", dataAbertura: `${exercicio}-01-02`, ultimoNumero: 3, metodo: "FESF", exercicio },
    { id: newId(), codigo: `${nif}/FR/${exercicio}`, tipo: "FR", ano: +exercicio, nif, estado: "U", dataAbertura: `${exercicio}-01-02`, ultimoNumero: 0, metodo: "FESF", exercicio },
    { id: newId(), codigo: `${nif}/NC/${exercicio}`, tipo: "NC", ano: +exercicio, nif, estado: "U", dataAbertura: `${exercicio}-01-02`, ultimoNumero: 1, metodo: "FESF", exercicio },
    { id: newId(), codigo: `${nif}/ND/${exercicio}`, tipo: "ND", ano: +exercicio, nif, estado: "A", dataAbertura: `${exercicio}-01-02`, ultimoNumero: 0, metodo: "FESF", exercicio },
  ];
}


// ── NovaSerieForm ─────────────────────────────────────────────────────────────
interface NovaSerieFormProps {
  onClose: () => void;
  onSave: (s: SerieFacturacao) => void;
  exercicio: string;
}

function NovaSerieForm({ onClose, onSave, exercicio }: NovaSerieFormProps) {
  const [tipo, setTipo] = useState<TipoDocumento>("FT");
  const [metodo, setMetodo] = useState<MetodoFacturacao>("FESF");
  const [ano, setAno] = useState(+exercicio);
  const hoje = new Date().toISOString().split("T")[0];

  function handleSave() {
    const nif = EMPRESA_NIF;
    const nova: SerieFacturacao = {
      id: newId(), codigo: `${nif}/${tipo}/${ano}`, tipo, ano, nif, estado: "A",
      dataAbertura: hoje, ultimoNumero: 0, metodo, exercicio: String(ano),
    };
    onSave(nova);
    onClose();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className="form-label">Tipo de Documento *</label>
          <select className="form-input" value={tipo} onChange={e => setTipo(e.target.value as TipoDocumento)}>
            {(Object.keys(TIPO_LABELS) as TipoDocumento[]).map(k => (
              <option key={k} value={k}>{k} &mdash; {TIPO_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Ano</label>
          <input className="form-input" type="number" value={ano} onChange={e => setAno(+e.target.value)} />
        </div>
        <div>
          <label className="form-label">NIF Empresa</label>
          <input className="form-input font-mono bg-ink-50 text-ink-500" readOnly value={EMPRESA_NIF} />
        </div>
        <div>
          <label className="form-label">M&eacute;todo</label>
          <select className="form-input" value={metodo} onChange={e => setMetodo(e.target.value as MetodoFacturacao)}>
            <option value="FESF">FESF</option>
            <option value="FEPC">FEPC</option>
            <option value="SF">SF</option>
          </select>
        </div>
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
          <p className="font-semibold">C&oacute;digo da S&eacute;rie:</p>
          <p className="font-mono mt-1">{EMPRESA_NIF}/{tipo}/{ano}</p>
        </div>
      </div>
      <div className="shrink-0 border-t border-ink-200 px-5 py-3 bg-ink-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={handleSave} className="btn-primary">Criar S&eacute;rie</button>
      </div>
    </div>
  );
}

// ── Tab: Visão Geral ──────────────────────────────────────────────────────────
function TabVisaoGeral({ docs, series, exercicio, onSetTab }: {
  docs: DocumentoFacturacao[];
  series: SerieFacturacao[];
  exercicio: string;
  onSetTab: (tab: Tab) => void;
}) {
  const seriesActivas = series.filter(
    s => s.exercicio === exercicio && (s.estado === "U" || s.estado === "A")
  ).length;
  const retencoesCount = docs.reduce((acc, d) => acc + d.retencoes.length, 0);

  const ultimaExportacaoRaw =
    typeof window !== "undefined"
      ? localStorage.getItem(`educontas-agt-ultima-exportacao-${exercicio}`)
      : null;
  const ultimaExportacao = ultimaExportacaoRaw
    ? new Date(ultimaExportacaoRaw).toLocaleDateString("pt-PT")
    : "Nunca";

  const statCards: { label: string; value: string; icon: string; color: string }[] = [
    { label: "Séries Activas",           value: String(seriesActivas),   icon: "📋", color: "blue" },
    { label: "Retenções Configuradas", value: String(retencoesCount), icon: "🏦", color: "orange" },
    { label: "Última Exportação AGT", value: ultimaExportacao,    icon: "📤", color: "green" },
    { label: "Prazo DP N.º 71/25",        value: "01/01/2026 — Vigente ✓", icon: "✅", color: "emerald" },
  ];

  const colorMap: Record<string, string> = {
    blue:    "border-blue-200 bg-blue-50",
    orange:  "border-orange-200 bg-orange-50",
    green:   "border-green-200 bg-green-50",
    emerald: "border-emerald-200 bg-emerald-50",
  };

  return (
    <div className="space-y-6">
      {/* Migration notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-800">
        <span className="text-lg shrink-0">&#x2139;&#xfe0f;</span>
        <div className="flex-1 text-sm">
          <p className="font-semibold mb-1">Os documentos s&atilde;o criados no m&oacute;dulo Vendas.</p>
          <p className="text-amber-700">Use esta &aacute;rea para configura&ccedil;&atilde;o AGT: s&eacute;ries, ATCUD, reten&ccedil;&otilde;es e exporta&ccedil;&atilde;o.</p>
        </div>
        <a href="/vendas" className="btn-primary text-sm shrink-0 whitespace-nowrap">
          Ir para Vendas &rarr;
        </a>
      </div>

      {/* Compliance status cards 2x2 */}
      <div className="grid grid-cols-2 gap-4">
        {statCards.map(c => (
          <div key={c.label} className={`card p-5 border ${colorMap[c.color]}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{c.icon}</span>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide">{c.label}</p>
            </div>
            <p className="text-xl font-bold text-ink-800">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mr-2">Acesso r&aacute;pido:</p>
        <button onClick={() => onSetTab("series")} className="btn-secondary text-sm">
          Configurar S&eacute;ries
        </button>
        <button onClick={() => onSetTab("retencoes")} className="btn-secondary text-sm">
          Gerir Reten&ccedil;&otilde;es
        </button>
        <button onClick={() => onSetTab("exportar")} className="btn-primary text-sm">
          Exportar para AGT
        </button>
      </div>
    </div>
  );
}

// ── Tab: Séries ───────────────────────────────────────────────────────────────
function TabSeries({ series, exercicio, onUpdate }: {
  series: SerieFacturacao[];
  exercicio: string;
  onUpdate: (s: SerieFacturacao[]) => void;
}) {
  const { openWindow, closeWindow } = useWindowManager();

  const seriesFiltradas = series.filter(s => s.exercicio === exercicio);

  function comunicarAGT(s: SerieFacturacao) {
    onUpdate(series.map(x => x.id === s.id ? { ...x, estado: "U" as EstadoSerie } : x));
  }

  function fechar(s: SerieFacturacao) {
    const winId = `fechar-serie-${s.id}`;
    openWindow({
      id: winId, title: "Fechar Série", icon: "🔒",
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 p-5">
            <p className="text-sm text-ink-700">Confirma o fecho da s&eacute;rie <strong className="font-mono">{s.codigo}</strong>?</p>
            <p className="text-xs text-red-600 mt-2">A s&eacute;rie ficar&aacute; indispon&iacute;vel para emiss&atilde;o de novos documentos.</p>
          </div>
          <div className="shrink-0 border-t border-ink-200 px-5 py-3 bg-ink-50 flex justify-end gap-3">
            <button onClick={() => closeWindow(winId)} className="btn-secondary">N&atilde;o</button>
            <button onClick={() => {
              onUpdate(series.map(x => x.id === s.id ? { ...x, estado: "F" as EstadoSerie, dataFecho: new Date().toISOString().split("T")[0] } : x));
              closeWindow(winId);
            }} className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500">Fechar S&eacute;rie</button>
          </div>
        </div>
      ),
      x: 200, y: 150, width: 460, height: 220, minimized: false, maximized: false,
    });
  }

  function openNovaSerie() {
    const winId = `nova-serie-${newId()}`;
    openWindow({
      id: winId, title: "Nova Série de Facturação", icon: "📋",
      content: <NovaSerieForm onClose={() => closeWindow(winId)} onSave={s => onUpdate([...series, s])} exercicio={exercicio} />,
      x: 80, y: 40, width: 540, height: 440, minimized: false, maximized: false,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={openNovaSerie} className="btn-primary text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nova S&eacute;rie
        </button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 border-b border-ink-200">
              {["Código","Tipo","Ano","Estado","Último Nº","Método","Data Abertura","Acções"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seriesFiltradas.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-400 italic">Nenhuma s&eacute;rie criada.</td></tr>
            )}
            {seriesFiltradas.map(s => (
              <tr key={s.id} className="border-t border-ink-100 hover:bg-ink-50/40 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-ink-800">{s.codigo}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIPO_BADGE_COLOR[s.tipo]}`}>{s.tipo}</span>
                </td>
                <td className="px-4 py-3 text-ink-700">{s.ano}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SERIE_ESTADO_BADGE[s.estado].cls}`}>{SERIE_ESTADO_BADGE[s.estado].label}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-ink-700">{s.ultimoNumero}</td>
                <td className="px-4 py-3 text-ink-600">{s.metodo}</td>
                <td className="px-4 py-3 text-ink-500">{s.dataAbertura}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {s.estado === "A" && (
                      <button onClick={() => comunicarAGT(s)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors whitespace-nowrap">Comunicar AGT</button>
                    )}
                    {s.estado === "U" && (
                      <button onClick={() => fechar(s)} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors">Fechar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-700">
        <p className="font-semibold mb-1">Regras de S&eacute;ries (DP N.&ordm; 71/25)</p>
        <p>C&oacute;digo: <strong className="font-mono">NIF/TipoDoc/Ano</strong> ex: <strong className="font-mono">5000123456/FT/2025</strong> &middot; N&uacute;mero: <strong className="font-mono">FT 5000123456/2025/1</strong></p>
        <p className="mt-1">Estados: A = Aberta (registada, aguarda comunica&ccedil;&atilde;o AGT) &middot; U = Em Utiliza&ccedil;&atilde;o &middot; F = Fechada</p>
      </div>
    </div>
  );
}

// ── Tab: Retenções na Fonte ───────────────────────────────────────────────────
function TabRetencoes({ docs }: { docs: DocumentoFacturacao[] }) {
  const today = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(today);

  const grouped = useMemo(() => {
    const filtered = mes
      ? docs.filter(d => d.data.startsWith(mes) && d.estado === "EMITIDO")
      : docs.filter(d => d.estado === "EMITIDO");
    const map = new Map<TipoRetencao, { tipo: TipoRetencao; nDocs: number; total: number }>();
    for (const doc of filtered) {
      for (const r of doc.retencoes) {
        const existing = map.get(r.tipo) ?? { tipo: r.tipo, nDocs: 0, total: 0 };
        map.set(r.tipo, { ...existing, nDocs: existing.nDocs + 1, total: existing.total + r.valor });
      }
    }
    return Array.from(map.values());
  }, [docs, mes]);

  const totalGeral = grouped.reduce((s, g) => s + g.total, 0);

  const TIPO_RETENCAO_LABEL: Record<TipoRetencao, string> = {
    IRT:  "Imposto sobre Rendimentos do Trabalho",
    II:   "Imposto Industrial",
    IS:   "Imposto de Sisa",
    IVA:  "Imposto sobre Valor Acrescentado",
    IP:   "Imposto Predial",
    IAC:  "Imposto sobre Aplicações de Capitais",
    OU:   "Outros",
    IRPC: "Imposto sobre Rendimento Pessoas Colectivas",
    IRPS: "Imposto sobre Rendimento Pessoas Singulares",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-ink-700">Per&iacute;odo (m&ecirc;s):</label>
        <input className="form-input w-44" type="month" value={mes} onChange={e => setMes(e.target.value)} />
        <button onClick={() => setMes("")} className="btn-secondary text-sm">Todos os Per&iacute;odos</button>
      </div>
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-semibold text-ink-800">Sum&aacute;rio de Reten&ccedil;&otilde;es na Fonte</h3>
          <p className="text-xs text-ink-400">{mes ? `Mês: ${mes}` : "Todos os documentos emitidos"}</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 border-b border-ink-200">
              {["Tipo","Descrição","Nº Documentos","Total Retido (Kz)"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-400 italic">Sem reten&ccedil;&otilde;es no per&iacute;odo seleccionado.</td></tr>
            )}
            {grouped.map(g => (
              <tr key={g.tipo} className="border-t border-ink-100 hover:bg-ink-50/40 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-700">{g.tipo}</span>
                </td>
                <td className="px-4 py-3 text-ink-700">{TIPO_RETENCAO_LABEL[g.tipo]}</td>
                <td className="px-4 py-3 text-center font-semibold text-ink-800">{g.nDocs}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink-800">{fmtAOA(g.total)}</td>
              </tr>
            ))}
          </tbody>
          {grouped.length > 0 && (
            <tfoot>
              <tr className="bg-ink-50 border-t-2 border-ink-300">
                <td colSpan={3} className="px-4 py-3 font-bold text-ink-800 text-right">Total Geral:</td>
                <td className="px-4 py-3 text-right font-bold text-ink-900">{fmtAOA(totalGeral)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// ── Tab: Exportar AGT ─────────────────────────────────────────────────────────
function TabExportarAGT({ docs, series, exercicio }: {
  docs: DocumentoFacturacao[];
  series: SerieFacturacao[];
  exercicio: string;
}) {
  const [dataInicio, setDataInicio] = useState(`${exercicio}-01-01`);
  const [dataFim, setDataFim]       = useState(`${exercicio}-12-31`);
  const [tiposSel, setTiposSel]     = useState<Set<TipoDocumento>>(new Set(["FT","FR","NC","ND"] as TipoDocumento[]));
  const [jsonOutput, setJsonOutput] = useState("");
  const [validated, setValidated]   = useState(false);
  const [validation, setValidation] = useState<{ label: string; ok: boolean }[]>([]);

  const docsFiltered = useMemo(() => docs.filter(d => {
    if (!tiposSel.has(d.tipo)) return false;
    if (d.data < dataInicio || d.data > dataFim) return false;
    return true;
  }), [docs, tiposSel, dataInicio, dataFim]);

  const byTipo = useMemo(() => {
    const m = new Map<TipoDocumento, number>();
    for (const d of docsFiltered) m.set(d.tipo, (m.get(d.tipo) ?? 0) + 1);
    return m;
  }, [docsFiltered]);

  function toggleTipo(t: TipoDocumento) {
    setTiposSel(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  function handleValidate() {
    const checks = [
      { label: "NIFs de clientes preenchidos", ok: docsFiltered.every(d => d.nifCliente.trim().length > 0) },
      { label: "Séries em estado U (Em Utilização)", ok: docsFiltered.every(d => { const s = series.find(x => x.codigo === d.serie); return s?.estado === "U"; }) },
      { label: "Linhas com descrição preenchida", ok: docsFiltered.every(d => d.linhas.every(l => l.produtoDescricao.trim().length > 0)) },
      { label: "Documentos com data de emissão", ok: docsFiltered.every(d => !!d.data) },
      { label: "Pelo menos um documento seleccionado", ok: docsFiltered.length > 0 },
      { label: "País do cliente preenchido", ok: docsFiltered.every(d => !!d.paisCliente) },
    ];
    setValidation(checks);
    setValidated(true);
  }

  function handleGerarJSON() {
    const submissionId = newId();
    const agtJson = {
      schemaVersion: "1.0",
      submissionId,
      submissionTimestamp: new Date().toISOString(),
      taxRegistrationNumber: EMPRESA_NIF,
      softwareInfo: {
        softwareDetail: { producerName: "EduContas ERP", productName: "EduContas", productVersion: "1.0", productId: "EDUCONTAS-001" },
        preSignature: "EDUCONTAS-HASH",
        invoicingMethod: "FESF",
      },
      numberOfDocuments: docsFiltered.length,
      documentList: docsFiltered.map(d => ({
        documentId: d.documentoId,
        documentDate: d.data,
        documentType: d.tipo,
        documentClassReason: d.classe,
        seriesCode: d.serie,
        customerTaxId: d.nifCliente,
        customerName: d.nomeCliente,
        country: d.paisCliente,
        lines: d.linhas.map(l => ({
          lineId: l.id,
          productCode: l.produtoCodigo,
          productDescription: l.produtoDescricao,
          quantity: l.quantidade,
          unitOfMeasure: l.unidade,
          unitPrice: l.precoUnitario,
          taxCode: l.codigoImposto,
          taxRate: l.taxaImposto,
          taxBase: l.baseImponivel,
          taxAmount: l.valorImposto,
          debitAmount: l.valorDebito,
          creditAmount: l.valorCredito,
        })),
        paymentFactors: d.pagamentos.map(p => ({
          paymentMethod: p.metodo,
          paymentAmount: p.valor,
          paymentDate: p.data,
          paymentReference: p.referencia,
        })),
        withholdingTaxList: d.retencoes.map(r => ({
          withholdingTaxType: r.tipo,
          withholdingTaxDescription: r.descricao,
          withholdingTaxRate: r.taxa,
          withholdingTaxAmount: r.valor,
        })),
        taxSummary: [
          { taxCode: "IVA", taxBase: d.totalBase, taxAmount: d.totalIVA },
        ],
        grossTotal: d.totalBruto,
        netTotal: d.totalAPagar,
        currency: "AOA",
      })),
    };
    setJsonOutput(JSON.stringify(agtJson, null, 2));
  }

  function handleCopiar() {
    navigator.clipboard.writeText(jsonOutput).catch(() => {});
  }

  function handleDownload() {
    const blob = new Blob([jsonOutput], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AGT_FE_${EMPRESA_NIF}_${exercicio}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allOk = validation.length > 0 && validation.every(v => v.ok);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Coluna Esquerda */}
      <div className="space-y-5">
        {/* Config */}
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-ink-800">Configura&ccedil;&atilde;o da Exporta&ccedil;&atilde;o</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Data In&iacute;cio</label>
              <input className="form-input" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Data Fim</label>
              <input className="form-input" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label mb-2">Tipos de Documentos</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(TIPO_LABELS) as TipoDocumento[]).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer text-sm text-ink-700 hover:text-ink-900">
                  <input type="checkbox" className="rounded" checked={tiposSel.has(t)} onChange={() => toggleTipo(t)} />
                  <span><strong>{t}</strong> &mdash; {TIPO_LABELS[t]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="card p-5">
          <h3 className="font-semibold text-ink-800 mb-3">Pr&eacute;-visualiza&ccedil;&atilde;o</h3>
          {docsFiltered.length === 0 ? (
            <p className="text-sm text-ink-400 italic">Nenhum documento corresponde aos filtros.</p>
          ) : (
            <div className="space-y-2">
              {Array.from(byTipo.entries()).map(([t, n]) => (
                <div key={t} className="flex justify-between items-center text-sm">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIPO_BADGE_COLOR[t]}`}>{t}</span>
                  <span className="text-ink-500">{TIPO_LABELS[t]}</span>
                  <span className="font-semibold text-ink-800">{n} doc{n !== 1 ? "s" : ""}</span>
                </div>
              ))}
              <div className="border-t border-ink-200 pt-2 flex justify-between font-bold text-ink-800">
                <span>Total</span>
                <span>{docsFiltered.length} documentos</span>
              </div>
            </div>
          )}
        </div>

        {/* Validação */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink-800">Valida&ccedil;&atilde;o</h3>
            <button onClick={handleValidate} className="btn-secondary text-xs">Validar</button>
          </div>
          {validated && (
            <div className="space-y-2">
              {validation.map(v => (
                <div key={v.label} className={`flex items-center gap-2 text-sm ${v.ok ? "text-green-700" : "text-red-600"}`}>
                  <span>{v.ok ? "✓" : "✗"}</span>
                  <span>{v.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botão */}
        <button onClick={handleGerarJSON} disabled={docsFiltered.length === 0 || (validated && !allOk)} className="btn-primary w-full justify-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Gerar JSON AGT
        </button>
      </div>

      {/* Coluna Direita — JSON */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink-800">JSON para Submiss&atilde;o &agrave; AGT</h3>
          {jsonOutput && (
            <div className="flex gap-2">
              <button onClick={handleCopiar} className="btn-secondary text-xs">Copiar</button>
              <button onClick={handleDownload} className="btn-primary text-xs">Download .json</button>
            </div>
          )}
        </div>
        <textarea
          readOnly
          value={jsonOutput || "// Clique em «Gerar JSON AGT» para produzir o ficheiro de submissão"}
          className="form-input w-full font-mono text-xs resize-none bg-ink-900 text-green-400 rounded-xl"
          style={{ minHeight: "520px" }}
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: "documentos", label: "Visão Geral" },
  { id: "series",     label: "Séries" },
  { id: "retencoes",  label: "Retenções na Fonte" },
  { id: "exportar",   label: "Exportar AGT" },
];

export default function FacturacaoElectronicaPage() {
  const [tab, setTab] = useState<Tab>("documentos");
  const [exercicio, setExercicio] = useState(ANOS_DISPONIVEIS[0]);

  const { items: docs, setItems: setDocs } = useCollection<DocumentoFacturacao>(
    `educontas-facturacao-electronica-${exercicio}`,
    seedDocs(exercicio),
  );

  const { items: series, setItems: setSeries } = useCollection<SerieFacturacao>(
    `educontas-series-fe-${exercicio}`,
    seedSeries(exercicio),
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="AGT — Conformidade"
        subtitle="Séries · ATCUD · Retenções · Exportação AGT · DP Facturação Electrónica"
        actions={
          <div className="flex items-center gap-2">
            <select className="form-input text-sm w-28" value={exercicio} onChange={e => setExercicio(e.target.value)}>
              {ANOS_DISPONIVEIS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        }
      />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-ink-200 gap-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.id ? "border-brand-600 text-brand-600" : "border-transparent text-ink-500 hover:text-ink-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "documentos" && <TabVisaoGeral docs={docs} series={series} exercicio={exercicio} onSetTab={setTab} />}
        {tab === "series"     && <TabSeries series={series} exercicio={exercicio} onUpdate={setSeries} />}
        {tab === "retencoes"  && <TabRetencoes docs={docs} />}
        {tab === "exportar"   && <TabExportarAGT docs={docs} series={series} exercicio={exercicio} />}
      </div>
    </div>
  );
}
