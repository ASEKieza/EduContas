"use client";

import { useState, useCallback, useRef } from "react";
import { useCollection } from "@/lib/useCollection";
import Topbar from "@/components/Topbar";
import { useWindowManager } from "@/lib/windowManager";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { agtLookupNif } from "@/lib/agt-nif";

// ── Types ──────────────────────────────────────────────────────────────────────
type TipoGuia = "GR" | "GT" | "GE";
type TipoMercadoria = "PESCADO" | "AGROPECUARIO" | "OUTRO";
type EstadoGuia = "RASCUNHO" | "EMITIDA" | "EM_TRANSITO" | "ENTREGUE" | "CONVERTIDA" | "CANCELADA";
type NifStatus = "pendente" | "ok" | "invalido" | "verificando";

interface NifParty {
  nif: string;
  nome: string;
  endereco: string;
  status: NifStatus;
}

interface GuiaRemessa {
  id: string;
  numero: string;
  tipoGuia: TipoGuia; // default "GR" for backward compat
  data: string;
  dataTransporte: string;
  dataEntrega?: string;
  assinadoPor?: string;
  tipoMercadoria: TipoMercadoria;
  descricaoMercadoria: string;
  quantidade: number;
  unidade: string;
  valorMercadoria: number;
  remetente: NifParty;
  destinatario: NifParty;
  transportadora: NifParty & { matricula: string; motorista: string };
  localOrigem: string;
  localDestino: string;
  facturaRef: string;
  facturaConvertida?: string; // FT number generated on conversion
  estado: EstadoGuia;
  observacoes: string;
  exercicio: string;
}

// Minimal Factura shape — mirrors vendas/page.tsx
interface Factura {
  id: string;
  numero: string;
  tipo: "FT" | "FR" | "FA" | "FG" | "FGL" | "NC" | "ND" | "TV" | "AF" | "RC" | "RG";
  data: string;
  cliente: string;
  nif: string;
  linhas: { descricao: string; qtd: number; preco: number; iva: number }[];
  subtotal: number;
  ivaTotal: number;
  total: number;
  pago: number;
  estado: "RASCUNHO" | "LANÇADO" | "PARCIAL" | "LIQUIDADO" | "ANULADO";
  criadoEm: string;
  guiaRef?: string;
}

// ── Document type constants ────────────────────────────────────────────────────
const TIPO_GUIA_LABELS: Record<string, string> = {
  GR: "Guia de Remessa",
  GT: "Guia de Transporte",
  GE: "Guia de Entrega",
};

const TIPO_GUIA_COLOR: Record<string, string> = {
  GR: "bg-teal-100 text-teal-700",
  GT: "bg-cyan-100 text-cyan-700",
  GE: "bg-emerald-100 text-emerald-700",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtAOA(v: number) {
  return `Kz ${v.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}`;
}
function nowDate() { return new Date().toISOString().slice(0, 10); }

function nextSeq(prev: GuiaRemessa[], tipo: TipoGuia, exercicio: string): string {
  const same = prev.filter(g => (g.tipoGuia ?? "GR") === tipo);
  const nums = same.map(g => parseInt(g.numero.split("-")[2] ?? "0", 10)).filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `${tipo}-${exercicio}-${String(max + 1).padStart(4, "0")}`;
}

const BADGE: Record<EstadoGuia, string> = {
  RASCUNHO: "badge-gray",
  EMITIDA: "badge-blue",
  EM_TRANSITO: "badge-warn",
  ENTREGUE: "badge-green",
  CONVERTIDA: "badge-purple",
  CANCELADA: "badge-red",
};
const LABEL: Record<EstadoGuia, string> = {
  RASCUNHO: "Rascunho",
  EMITIDA: "Emitida",
  EM_TRANSITO: "Em Trânsito",
  ENTREGUE: "Entregue",
  CONVERTIDA: "Convertida",
  CANCELADA: "Cancelada",
};
const TIPO_LABEL: Record<TipoMercadoria, string> = {
  PESCADO: "🐟 Pescado",
  AGROPECUARIO: "🌾 Agropecuário",
  OUTRO: "📦 Outro",
};

// ── NIF Field Component ────────────────────────────────────────────────────────
function NifField({
  label,
  party,
  onChange,
  extra,
}: {
  label: string;
  party: NifParty & { matricula?: string; motorista?: string };
  onChange: (updated: typeof party) => void;
  extra?: React.ReactNode;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookup = useCallback(async (nif: string) => {
    if (nif.length < 9) return;
    onChange({ ...party, status: "verificando" });
    try {
      const res = await agtLookupNif(nif);
      if (res.ok && res.contribuinte) {
        onChange({
          ...party,
          nif,
          nome: res.contribuinte.nome,
          endereco: `${res.contribuinte.endereco}, ${res.contribuinte.municipio}` || "",
          status: "ok",
        });
      } else {
        onChange({ ...party, nif, status: "invalido" });
      }
    } catch {
      onChange({ ...party, nif, status: "invalido" });
    }
  }, [party, onChange]);

  function handleNifChange(v: string) {
    onChange({ ...party, nif: v, status: "pendente" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => lookup(v), 700);
  }

  const statusColor = {
    pendente: "text-gray-400",
    verificando: "text-yellow-500",
    ok: "text-green-600",
    invalido: "text-red-600",
  }[party.status];
  const statusMsg = {
    pendente: "",
    verificando: "A verificar AGT…",
    ok: "NIF verificado ✓",
    invalido: "NIF inválido ou não encontrado",
  }[party.status];

  return (
    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-gray-500">NIF *</label>
          <input
            className="form-input mt-0.5 font-mono"
            value={party.nif}
            onChange={e => handleNifChange(e.target.value)}
            placeholder="9 ou 10 dígitos"
            maxLength={10}
          />
          {statusMsg && <p className={`text-[11px] mt-0.5 ${statusColor}`}>{statusMsg}</p>}
        </div>
        <div>
          <label className="text-[11px] text-gray-500">Nome / Designação *</label>
          <input
            className="form-input mt-0.5"
            value={party.nome}
            onChange={e => onChange({ ...party, nome: e.target.value })}
            placeholder="Nome do contribuinte"
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-gray-500">Endereço</label>
        <input
          className="form-input mt-0.5"
          value={party.endereco}
          onChange={e => onChange({ ...party, endereco: e.target.value })}
          placeholder="Endereço"
        />
      </div>
      {extra}
    </div>
  );
}

// ── Form Content ───────────────────────────────────────────────────────────────
function GuiaFormContent({
  initial,
  exercicio,
  allGuias,
  onSave,
  onClose,
}: {
  initial?: GuiaRemessa;
  exercicio: string;
  allGuias: GuiaRemessa[];
  onSave: (g: GuiaRemessa) => void;
  onClose: () => void;
}) {
  const emptyParty = (): NifParty => ({ nif: "", nome: "", endereco: "", status: "pendente" });
  const emptyTransp = () => ({ ...emptyParty(), matricula: "", motorista: "" });

  const [form, setForm] = useState<GuiaRemessa>(() =>
    initial ?? {
      id: crypto.randomUUID(),
      tipoGuia: "GR",
      numero: nextSeq(allGuias, "GR", exercicio),
      data: nowDate(),
      dataTransporte: nowDate(),
      dataEntrega: undefined,
      assinadoPor: undefined,
      tipoMercadoria: "PESCADO",
      descricaoMercadoria: "",
      quantidade: 0,
      unidade: "kg",
      valorMercadoria: 0,
      remetente: emptyParty(),
      destinatario: emptyParty(),
      transportadora: emptyTransp(),
      localOrigem: "",
      localDestino: "",
      facturaRef: "",
      estado: "RASCUNHO",
      observacoes: "",
      exercicio,
    }
  );

  // When tipoGuia changes, regenerate the sequence number
  function handleTipoGuia(tipo: TipoGuia) {
    const numero = nextSeq(allGuias.filter(g => g.id !== form.id), tipo, exercicio);
    setForm(f => ({ ...f, tipoGuia: tipo, numero }));
  }

  function save() {
    const tipoGuia = form.tipoGuia ?? "GR";
    if (!form.remetente.nif || !form.destinatario.nif) {
      alert("Preencha os NIFs do remetente e destinatário.");
      return;
    }
    // transportadora required for GR and GT
    if ((tipoGuia === "GR" || tipoGuia === "GT") && !form.transportadora.nif) {
      alert("Preencha o NIF da transportadora.");
      return;
    }
    if (!form.descricaoMercadoria) {
      alert("Preencha a descrição da mercadoria.");
      return;
    }
    onSave(form);
    onClose();
  }

  const tipoGuia = form.tipoGuia ?? "GR";
  const showTipoMercadoria = tipoGuia === "GR";
  const showTransportadora = tipoGuia === "GR" || tipoGuia === "GT";
  const showDataEntrega = tipoGuia === "GE";
  const labelFacturaRef = tipoGuia === "GT" ? "Referência de Factura" : "Factura de Referência";

  return (
    <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: "75vh" }}>

      {/* Tipo de Guia — at the top */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Tipo de Guia</p>
        <div className="flex gap-3">
          {(["GR", "GT", "GE"] as TipoGuia[]).map(tipo => (
            <label key={tipo} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tipoGuia"
                value={tipo}
                checked={tipoGuia === tipo}
                onChange={() => handleTipoGuia(tipo)}
                className="accent-brand-600"
              />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_GUIA_COLOR[tipo]}`}>
                {tipo}
              </span>
              <span className="text-sm text-gray-700">{TIPO_GUIA_LABELS[tipo]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="form-label">Número</label>
          <input className="form-input font-mono bg-gray-50" value={form.numero} readOnly />
        </div>
        <div>
          <label className="form-label">Data de Emissão *</label>
          <input type="date" className="form-input" value={form.data}
            onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
        </div>
        {showDataEntrega ? (
          <div>
            <label className="form-label">Data de Entrega</label>
            <input type="date" className="form-input" value={form.dataEntrega ?? ""}
              onChange={e => setForm(f => ({ ...f, dataEntrega: e.target.value }))} />
          </div>
        ) : (
          <div>
            <label className="form-label">Data de Transporte *</label>
            <input type="date" className="form-input" value={form.dataTransporte}
              onChange={e => setForm(f => ({ ...f, dataTransporte: e.target.value }))} />
          </div>
        )}
      </div>

      {/* Mercadoria */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
        <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Mercadoria</p>
        <div className="grid grid-cols-2 gap-3">
          {showTipoMercadoria && (
            <div>
              <label className="form-label">Tipo *</label>
              <select className="form-input" value={form.tipoMercadoria}
                onChange={e => setForm(f => ({ ...f, tipoMercadoria: e.target.value as TipoMercadoria }))}>
                <option value="PESCADO">🐟 Pescado</option>
                <option value="AGROPECUARIO">🌾 Produtos Agropecuários</option>
                <option value="OUTRO">📦 Outro</option>
              </select>
            </div>
          )}
          <div className={showTipoMercadoria ? "" : "col-span-2"}>
            <label className="form-label">{labelFacturaRef}</label>
            <input className="form-input" value={form.facturaRef}
              onChange={e => setForm(f => ({ ...f, facturaRef: e.target.value }))}
              placeholder="Ex: FT 2026/123" />
          </div>
        </div>
        <div>
          <label className="form-label">Descrição da Mercadoria *</label>
          <input className="form-input" value={form.descricaoMercadoria}
            onChange={e => setForm(f => ({ ...f, descricaoMercadoria: e.target.value }))}
            placeholder="Ex: Peixe fresco – Corvina, Robalo" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="form-label">Quantidade *</label>
            <input type="number" className="form-input" value={form.quantidade || ""}
              onChange={e => setForm(f => ({ ...f, quantidade: Number(e.target.value) }))}
              placeholder="0" min={0} />
          </div>
          <div>
            <label className="form-label">Unidade</label>
            <select className="form-input" value={form.unidade}
              onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}>
              <option value="kg">kg</option>
              <option value="t">Toneladas</option>
              <option value="un">Unidades</option>
              <option value="cx">Caixas</option>
              <option value="lt">Litros</option>
            </select>
          </div>
          <div>
            <label className="form-label">Valor (Kz)</label>
            <input type="number" className="form-input" value={form.valorMercadoria || ""}
              onChange={e => setForm(f => ({ ...f, valorMercadoria: Number(e.target.value) }))}
              placeholder="0" min={0} />
          </div>
        </div>
      </div>

      {/* Locais */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Local de Origem *</label>
          <input className="form-input" value={form.localOrigem}
            onChange={e => setForm(f => ({ ...f, localOrigem: e.target.value }))}
            placeholder="Ex: Moçâmedes — Cais Pesqueiro" />
        </div>
        <div>
          <label className="form-label">Local de Destino *</label>
          <input className="form-input" value={form.localDestino}
            onChange={e => setForm(f => ({ ...f, localDestino: e.target.value }))}
            placeholder="Ex: Luanda — Mercado do Kinaxixi" />
        </div>
      </div>

      {/* NIFs */}
      <NifField
        label="Remetente (Proprietário / Vendedor)"
        party={form.remetente}
        onChange={p => setForm(f => ({ ...f, remetente: p as NifParty }))}
      />
      <NifField
        label="Destinatário (Adquirente / Comprador)"
        party={form.destinatario}
        onChange={p => setForm(f => ({ ...f, destinatario: p as NifParty }))}
      />

      {/* GE — assinadoPor */}
      {tipoGuia === "GE" && (
        <div>
          <label className="form-label">Assinado por (Nome / NIF do receptor)</label>
          <input className="form-input" value={form.assinadoPor ?? ""}
            onChange={e => setForm(f => ({ ...f, assinadoPor: e.target.value }))}
            placeholder="Nome ou NIF do receptor da mercadoria" />
        </div>
      )}

      {/* Transportadora — GR and GT only */}
      {showTransportadora && (
        <NifField
          label={tipoGuia === "GT" ? "Entidade Transportadora *" : "Entidade Transportadora"}
          party={form.transportadora}
          onChange={p => setForm(f => ({ ...f, transportadora: { ...f.transportadora, ...p } }))}
          extra={
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <label className="text-[11px] text-gray-500">Matrícula</label>
                <input className="form-input mt-0.5 font-mono uppercase"
                  value={form.transportadora.matricula}
                  onChange={e => setForm(f => ({ ...f, transportadora: { ...f.transportadora, matricula: e.target.value } }))}
                  placeholder="LD-00-00-AA" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500">Nome do Motorista</label>
                <input className="form-input mt-0.5"
                  value={form.transportadora.motorista}
                  onChange={e => setForm(f => ({ ...f, transportadora: { ...f.transportadora, motorista: e.target.value } }))}
                  placeholder="Nome completo" />
              </div>
            </div>
          }
        />
      )}

      {/* Observações */}
      <div>
        <label className="form-label">Observações</label>
        <textarea className="form-input" rows={2} value={form.observacoes}
          onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
          placeholder="Condições de transporte, temperatura, etc." />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={save}>
          {initial ? "Guardar Alterações" : `Criar ${TIPO_GUIA_LABELS[tipoGuia]}`}
        </button>
      </div>
    </div>
  );
}

// ── View Content ───────────────────────────────────────────────────────────────
function GuiaViewContent({ guia, onClose, onPrint }: { guia: GuiaRemessa; onClose: () => void; onPrint: () => void }) {
  const tipoGuia = guia.tipoGuia ?? "GR";

  function Row({ label, value }: { label: string; value: string }) {
    return (
      <div className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
        <span className="text-[11px] text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
        <span className="text-sm text-gray-800 font-medium flex-1">{value || "—"}</span>
      </div>
    );
  }
  function NifRow({ label, p }: { label: string; p: NifParty }) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg space-y-1">
        <p className="text-[11px] font-bold text-gray-600 uppercase">{label}</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">{p.nif}</span>
          {p.status === "ok" && <span className="badge badge-green text-[10px]">NIF OK</span>}
          {p.status === "invalido" && <span className="badge badge-red text-[10px]">NIF Inválido</span>}
        </div>
        <p className="text-sm">{p.nome}</p>
        {p.endereco && <p className="text-xs text-gray-500">{p.endereco}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: "75vh" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">{TIPO_GUIA_LABELS[tipoGuia]}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIPO_GUIA_COLOR[tipoGuia]}`}>{tipoGuia}</span>
          </div>
          <p className="text-xl font-bold font-mono text-brand-700">{guia.numero}</p>
        </div>
        <span className={`badge ${BADGE[guia.estado]} text-sm px-3 py-1`}>{LABEL[guia.estado]}</span>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <Row label="Data de Emissão" value={guia.data} />
        {tipoGuia === "GE" ? (
          <Row label="Data de Entrega" value={guia.dataEntrega ?? "—"} />
        ) : (
          <Row label="Data de Transporte" value={guia.dataTransporte} />
        )}
        {tipoGuia === "GR" && (
          <Row label="Tipo de Mercadoria" value={TIPO_LABEL[guia.tipoMercadoria]} />
        )}
        <Row label="Factura Referência" value={guia.facturaRef} />
        <Row label="Descrição" value={guia.descricaoMercadoria} />
        <Row label="Quantidade" value={`${guia.quantidade} ${guia.unidade}`} />
        <Row label="Valor" value={guia.valorMercadoria > 0 ? fmtAOA(guia.valorMercadoria) : "—"} />
        <Row label="Origem" value={guia.localOrigem} />
        <Row label="Destino" value={guia.localDestino} />
        {tipoGuia === "GE" && guia.assinadoPor && (
          <Row label="Assinado por" value={guia.assinadoPor} />
        )}
      </div>

      <div className="space-y-2">
        <NifRow label="Remetente" p={guia.remetente} />
        <NifRow label="Destinatário" p={guia.destinatario} />
        {(tipoGuia === "GR" || tipoGuia === "GT") && (
          <div className="p-3 bg-gray-50 rounded-lg space-y-1">
            <p className="text-[11px] font-bold text-gray-600 uppercase">Transportadora</p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold">{guia.transportadora.nif}</span>
              {guia.transportadora.status === "ok" && <span className="badge badge-green text-[10px]">NIF OK</span>}
            </div>
            <p className="text-sm">{guia.transportadora.nome}</p>
            {guia.transportadora.matricula && <p className="text-xs text-gray-600">Matrícula: <strong>{guia.transportadora.matricula}</strong></p>}
            {guia.transportadora.motorista && <p className="text-xs text-gray-600">Motorista: {guia.transportadora.motorista}</p>}
          </div>
        )}
      </div>

      {guia.observacoes && (
        <div className="p-3 bg-yellow-50 rounded border border-yellow-200 text-sm text-yellow-800">
          <strong>Obs:</strong> {guia.observacoes}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <button className="btn-secondary" onClick={onClose}>Fechar</button>
        <button className="btn-primary flex items-center gap-1.5" onClick={onPrint}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / PDF
        </button>
      </div>
    </div>
  );
}

// ── Print Modal ────────────────────────────────────────────────────────────────
function PrintContent({ guia, onClose }: { guia: GuiaRemessa; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const tipoGuia = guia.tipoGuia ?? "GR";

  function doPrint() {
    const content = ref.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>${TIPO_GUIA_LABELS[tipoGuia]} ${guia.numero}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 30px; }
        h1 { font-size: 16px; text-align: center; text-transform: uppercase; }
        .logo { text-align: center; margin-bottom: 10px; font-weight: bold; font-size: 14px; }
        .row { display: flex; border-bottom: 1px solid #ccc; padding: 4px 0; }
        .row .lbl { width: 160px; font-weight: bold; color: #555; font-size: 11px; }
        .row .val { flex: 1; }
        .section { margin-top: 12px; margin-bottom: 4px; font-weight: bold; font-size: 11px;
                   text-transform: uppercase; background: #eee; padding: 3px 6px; }
        .nif-box { border: 1px solid #ccc; padding: 8px; margin: 4px 0; border-radius: 4px; }
        .nif-box .nif { font-family: monospace; font-weight: bold; font-size: 13px; }
        .footer { margin-top: 40px; display: flex; justify-content: space-around; text-align: center; }
        .footer .sig { border-top: 1px solid #000; padding-top: 4px; min-width: 140px; font-size: 11px; }
        .badge { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 10px;
                 font-weight: bold; background: #e8f5e9; color: #2e7d32; }
        .warn { color: #b71c1c; font-size: 10px; font-style: italic; }
        @media print { body { padding: 10mm; } }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  }

  const nifOk = (p: NifParty) => p.status === "ok" ? "✓ Verificado AGT" : "⚠ Não verificado";

  return (
    <div className="p-4 space-y-3">
      <div ref={ref}>
        <div className="logo">
          <div style={{ fontSize: 18, fontWeight: "bold" }}>{TIPO_GUIA_LABELS[tipoGuia].toUpperCase()} ({tipoGuia})</div>
          <div style={{ fontSize: 11, color: "#555" }}>Nos termos do Comunicado AGT — Quinta Região Tributária (DP N.º 71/25)</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div><strong>Nº:</strong> {guia.numero}</div>
          <div><strong>Data Emissão:</strong> {guia.data}</div>
          {tipoGuia === "GE" ? (
            <div><strong>Data Entrega:</strong> {guia.dataEntrega ?? "—"}</div>
          ) : (
            <div><strong>Data Transporte:</strong> {guia.dataTransporte}</div>
          )}
          <div className={`badge`} style={{
            background: guia.estado === "ENTREGUE" ? "#e8f5e9" : guia.estado === "CANCELADA" ? "#ffebee" : "#e3f2fd",
            color: guia.estado === "ENTREGUE" ? "#2e7d32" : guia.estado === "CANCELADA" ? "#c62828" : "#1565c0"
          }}>{LABEL[guia.estado]}</div>
        </div>

        <div className="section">Mercadoria</div>
        {tipoGuia === "GR" && (
          <div className="row"><span className="lbl">Tipo</span><span className="val">{TIPO_LABEL[guia.tipoMercadoria]}</span></div>
        )}
        <div className="row"><span className="lbl">Descrição</span><span className="val">{guia.descricaoMercadoria}</span></div>
        <div className="row"><span className="lbl">Quantidade</span><span className="val">{guia.quantidade} {guia.unidade}</span></div>
        {guia.valorMercadoria > 0 && <div className="row"><span className="lbl">Valor</span><span className="val">{fmtAOA(guia.valorMercadoria)}</span></div>}
        {guia.facturaRef && <div className="row"><span className="lbl">Factura Ref.</span><span className="val">{guia.facturaRef}</span></div>}
        <div className="row"><span className="lbl">Origem</span><span className="val">{guia.localOrigem}</span></div>
        <div className="row"><span className="lbl">Destino</span><span className="val">{guia.localDestino}</span></div>

        <div className="section">Remetente (Proprietário / Vendedor)</div>
        <div className="nif-box">
          <div className="nif">{guia.remetente.nif}</div>
          <div>{guia.remetente.nome}</div>
          {guia.remetente.endereco && <div style={{ color: "#555" }}>{guia.remetente.endereco}</div>}
          <div className="badge" style={{ marginTop: 2 }}>{nifOk(guia.remetente)}</div>
        </div>

        <div className="section">Destinatário (Adquirente / Comprador)</div>
        <div className="nif-box">
          <div className="nif">{guia.destinatario.nif}</div>
          <div>{guia.destinatario.nome}</div>
          {guia.destinatario.endereco && <div style={{ color: "#555" }}>{guia.destinatario.endereco}</div>}
          <div className="badge" style={{ marginTop: 2 }}>{nifOk(guia.destinatario)}</div>
        </div>

        {(tipoGuia === "GR" || tipoGuia === "GT") && (
          <>
            <div className="section">Entidade Transportadora</div>
            <div className="nif-box">
              <div className="nif">{guia.transportadora.nif}</div>
              <div>{guia.transportadora.nome}</div>
              {guia.transportadora.matricula && <div>Matrícula: <strong>{guia.transportadora.matricula}</strong></div>}
              {guia.transportadora.motorista && <div>Motorista: {guia.transportadora.motorista}</div>}
              <div className="badge" style={{ marginTop: 2 }}>{nifOk(guia.transportadora)}</div>
            </div>
          </>
        )}

        {tipoGuia === "GE" && guia.assinadoPor && (
          <div className="row" style={{ marginTop: 8 }}><span className="lbl">Assinado por</span><span className="val">{guia.assinadoPor}</span></div>
        )}

        {guia.observacoes && <div style={{ marginTop: 8, padding: "6px 8px", background: "#fffde7", border: "1px solid #f9a825", fontSize: 11 }}>
          <strong>Observações:</strong> {guia.observacoes}
        </div>}

        <div className="warn" style={{ marginTop: 10 }}>
          A não apresentação dos documentos fiscalmente exigíveis sujeitará o infrator às cominações previstas nos Artigos 198.º e 202.º do Código Geral Tributário.
        </div>

        <div className="footer">
          <div className="sig">Remetente<br />{guia.remetente.nome}</div>
          {(tipoGuia === "GR" || tipoGuia === "GT") && (
            <div className="sig">Transportadora<br />{guia.transportadora.nome}</div>
          )}
          <div className="sig">Destinatário<br />{guia.destinatario.nome}</div>
          <div className="sig">AGT — Fiscalização</div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <button className="btn-secondary" onClick={onClose}>Fechar</button>
        <button className="btn-primary" onClick={doPrint}>
          Imprimir / Guardar PDF
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function GuiasRemessaPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [exercicio, setExercicio] = useState(() => ANOS_DISPONIVEIS[0] ?? "2026");
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState<EstadoGuia | "TODOS">("TODOS");
  const [filterTipoGuia, setFilterTipoGuia] = useState<TipoGuia | "TODOS">("TODOS");

  const { items: guias, setItems: persist } = useCollection<GuiaRemessa>(
    `educontas-guias-remessa-${exercicio}`,
  );
  const { items: facturas, setItems: persistFacturas } = useCollection<Factura>(
    `educontas-vendas-${exercicio}`,
  );

  function save(g: GuiaRemessa) {
    const exists = guias.find(x => x.id === g.id);
    persist(exists ? guias.map(x => x.id === g.id ? g : x) : [...guias, g]);
  }

  function changeEstado(id: string, estado: EstadoGuia) {
    persist(guias.map(g => g.id === id ? { ...g, estado } : g));
  }

  function convertToFactura(g: GuiaRemessa) {
    if (!confirm(`Converter ${g.numero} em Factura de Venda (FT)?\n\nSera criado um documento FT no módulo Vendas.`)) return;
    const ftNums = facturas
      .filter(f => f.tipo === "FT")
      .map(f => parseInt(f.numero.split("/")[2] ?? "0", 10))
      .filter(n => !isNaN(n));
    const nextNum = (ftNums.length > 0 ? Math.max(...ftNums) : 0) + 1;
    const numero = `FT/${exercicio}/${String(nextNum).padStart(6, "0")}`;
    const subtotal = g.valorMercadoria;
    const ivaTotal = Math.round(subtotal * 0.14);
    const total = subtotal + ivaTotal;
    const ft: Factura = {
      id: crypto.randomUUID(),
      numero,
      tipo: "FT",
      data: new Date().toISOString().slice(0, 10),
      cliente: g.destinatario.nome || g.destinatario.nif,
      nif: g.destinatario.nif,
      linhas: [{ descricao: g.descricaoMercadoria, qtd: g.quantidade, preco: g.valorMercadoria / Math.max(g.quantidade, 1), iva: 14 }],
      subtotal,
      ivaTotal,
      total,
      pago: 0,
      estado: "LANÇADO",
      criadoEm: new Date().toISOString(),
      guiaRef: g.numero,
    };
    persistFacturas(prev => [ft, ...prev]);
    persist(guias.map(x => x.id === g.id ? { ...x, estado: "CONVERTIDA" as EstadoGuia, facturaConvertida: numero } : x));
    alert(`Factura ${numero} criada em Vendas com sucesso.`);
  }

  function deleteGuia(id: string) {
    if (!confirm("Eliminar esta guia?")) return;
    persist(guias.filter(g => g.id !== id));
  }

  function openNova() {
    const winId = "nova-guia-" + Date.now();
    openWindow({
      id: winId,
      title: "Nova Guia",
      icon: "📋",
      content: <GuiaFormContent exercicio={exercicio} allGuias={guias}
        onSave={save} onClose={() => closeWindow(winId)} />,
      x: 80, y: 60, width: 760, height: 700,
      minimized: false, maximized: false,
    });
  }

  function openEditar(g: GuiaRemessa) {
    const winId = "editar-guia-" + g.id;
    openWindow({
      id: winId,
      title: `Editar — ${g.numero}`,
      icon: "✏️",
      content: <GuiaFormContent initial={g} exercicio={exercicio} allGuias={guias}
        onSave={save} onClose={() => closeWindow(winId)} />,
      x: 100, y: 80, width: 760, height: 700,
      minimized: false, maximized: false,
    });
  }

  function openVer(g: GuiaRemessa) {
    const winId = "ver-guia-" + g.id;
    openWindow({
      id: winId,
      title: `${g.tipoGuia ?? "GR"} — ${g.numero}`,
      icon: "📄",
      content: <GuiaViewContent guia={g} onClose={() => closeWindow(winId)}
        onPrint={() => openPrint(g)} />,
      x: 120, y: 100, width: 600, height: 580,
      minimized: false, maximized: false,
    });
  }

  function openPrint(g: GuiaRemessa) {
    const winId = "print-guia-" + g.id;
    openWindow({
      id: winId,
      title: `Imprimir — ${g.numero}`,
      icon: "🖨️",
      content: <PrintContent guia={g} onClose={() => closeWindow(winId)} />,
      x: 140, y: 120, width: 680, height: 620,
      minimized: false, maximized: false,
    });
  }

  const filtered = guias.filter(g => {
    if (filterEstado !== "TODOS" && g.estado !== filterEstado) return false;
    if (filterTipoGuia !== "TODOS" && (g.tipoGuia ?? "GR") !== filterTipoGuia) return false;
    const q = search.toLowerCase();
    return !q || g.numero.toLowerCase().includes(q) ||
      g.remetente.nome.toLowerCase().includes(q) ||
      g.destinatario.nome.toLowerCase().includes(q) ||
      g.transportadora.nome.toLowerCase().includes(q) ||
      g.descricaoMercadoria.toLowerCase().includes(q);
  });

  // KPIs: total across all types
  const stats = {
    total: guias.length,
    emitidas: guias.filter(g => g.estado === "EMITIDA").length,
    // Em Trânsito: GT + GR
    emTransito: guias.filter(g => g.estado === "EM_TRANSITO" && (g.tipoGuia ?? "GR") !== "GE").length,
    // Entregues: mainly GE, but any estado ENTREGUE
    entregues: guias.filter(g => g.estado === "ENTREGUE").length,
  };

  const hoje = new Date();
  const vigencia = new Date("2026-07-01");
  const diasRestantes = Math.ceil((vigencia.getTime() - hoje.getTime()) / 86400000);

  return (
    <div>
      <Topbar
        title="Guias de Remessa"
        subtitle="Guias de Remessa · Guias de Transporte · Guias de Entrega · DP N.º 71/25"
        actions={
          <>
            {ANOS_DISPONIVEIS.map(y => (
              <button key={y} onClick={() => setExercicio(y)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  exercicio === y ? "bg-brand-600 text-white border-brand-600"
                    : "text-gray-600 border-gray-300 hover:bg-gray-50"}`}>
                {y}
              </button>
            ))}
            <button onClick={openNova} className="btn-primary text-xs flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Guia
            </button>
          </>
        }
      />

      <div className="p-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-gray-700", bg: "bg-gray-50" },
            { label: "Emitidas", value: stats.emitidas, color: "text-blue-700", bg: "bg-blue-50" },
            { label: "Em Trânsito", value: stats.emTransito, color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Entregues", value: stats.entregues, color: "text-green-700", bg: "bg-green-50" },
          ].map(s => (
            <div key={s.label} className={`card p-4 ${s.bg}`}>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="card">
          <div className="card-body flex flex-wrap gap-3">
            <input className="form-input flex-1 min-w-48"
              placeholder="Pesquisar por número, remetente, destinatário…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-input w-44" value={filterEstado}
              onChange={e => setFilterEstado(e.target.value as EstadoGuia | "TODOS")}>
              <option value="TODOS">Todos os estados</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="EMITIDA">Emitida</option>
              <option value="EM_TRANSITO">Em Trânsito</option>
              <option value="ENTREGUE">Entregue</option>
              <option value="CANCELADA">Cancelada</option>
              <option value="CONVERTIDA">Convertida em FT</option>
            </select>
            <select className="form-input w-52" value={filterTipoGuia}
              onChange={e => setFilterTipoGuia(e.target.value as TipoGuia | "TODOS")}>
              <option value="TODOS">Todos os tipos de guia</option>
              <option value="GR">GR — Guia de Remessa</option>
              <option value="GT">GT — Guia de Transporte</option>
              <option value="GE">GE — Guia de Entrega</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>Guias — {exercicio}</h3>
            <span className="text-xs text-gray-500">{filtered.length} registo(s)</span>
          </div>
          {filtered.length === 0 ? (
            <div className="card-body py-12 text-center text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium">Nenhuma guia registada</p>
              <p className="text-sm mt-1">Clique em &ldquo;Nova Guia&rdquo; para criar a primeira</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-auto w-full">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Tipo</th>
                    <th>Data</th>
                    <th>Mercadoria</th>
                    <th>Remetente</th>
                    <th>Destinatário</th>
                    <th>Transportadora</th>
                    <th>NIFs</th>
                    <th>Estado</th>
                    <th>Acções</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(g => {
                    const tipoGuia = g.tipoGuia ?? "GR";
                    const allNifOk = g.remetente.status === "ok" && g.destinatario.status === "ok" &&
                      ((tipoGuia === "GR" || tipoGuia === "GT") ? g.transportadora.status === "ok" : true);
                    return (
                      <tr key={g.id} className="cursor-pointer" onClick={() => openVer(g)}>
                        <td className="font-mono text-xs text-brand-700 font-bold">{g.numero}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIPO_GUIA_COLOR[tipoGuia]}`}>
                            {tipoGuia}
                          </span>
                        </td>
                        <td className="text-xs text-gray-500">
                          {tipoGuia === "GE" ? (g.dataEntrega ?? g.data) : g.dataTransporte}
                        </td>
                        <td className="max-w-[120px] truncate text-sm">{g.descricaoMercadoria}</td>
                        <td>
                          <p className="text-xs font-medium truncate max-w-[100px]">{g.remetente.nome || g.remetente.nif}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{g.remetente.nif}</p>
                        </td>
                        <td>
                          <p className="text-xs font-medium truncate max-w-[100px]">{g.destinatario.nome || g.destinatario.nif}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{g.destinatario.nif}</p>
                        </td>
                        <td>
                          {(tipoGuia === "GR" || tipoGuia === "GT") ? (
                            <>
                              <p className="text-xs font-medium truncate max-w-[100px]">{g.transportadora.nome || g.transportadora.nif}</p>
                              {g.transportadora.matricula && <p className="text-[10px] text-gray-400 font-mono uppercase">{g.transportadora.matricula}</p>}
                            </>
                          ) : (
                            <span className="text-[10px] text-gray-400">—</span>
                          )}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {allNifOk
                            ? <span className="badge badge-green text-[10px]">OK</span>
                            : <span className="badge badge-warn text-[10px]">Incompleto</span>}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <span className={`badge ${BADGE[g.estado]} text-[10px]`}>{LABEL[g.estado]}</span>
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 flex-wrap">
                            {g.estado === "RASCUNHO" && (
                              <>
                                <button title="Editar" onClick={() => openEditar(g)}
                                  className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">✏️</button>
                                <button title="Emitir" onClick={() => changeEstado(g.id, "EMITIDA")}
                                  className="text-xs px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700">Emitir</button>
                              </>
                            )}
                            {g.estado === "EMITIDA" && (
                              <button title="Em Trânsito" onClick={() => changeEstado(g.id, "EM_TRANSITO")}
                                className="text-xs px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-700">Trânsito</button>
                            )}
                            {g.estado === "EM_TRANSITO" && (
                              <button title="Entregue" onClick={() => changeEstado(g.id, "ENTREGUE")}
                                className="text-xs px-1.5 py-0.5 rounded bg-green-100 hover:bg-green-200 text-green-700">Entregue</button>
                            )}
                            {g.estado === "ENTREGUE" && !g.facturaConvertida && (
                              <button title="Converter em Factura de Venda" onClick={() => convertToFactura(g)}
                                className="text-xs px-1.5 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold">→ FT</button>
                            )}
                            {g.facturaConvertida && (
                              <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                {g.facturaConvertida}
                              </span>
                            )}
                            <button title="Imprimir" onClick={() => openPrint(g)}
                              className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">🖨️</button>
                            {g.estado !== "CANCELADA" && g.estado !== "ENTREGUE" && g.estado !== "CONVERTIDA" && (
                              <button title="Cancelar" onClick={() => changeEstado(g.id, "CANCELADA")}
                                className="text-xs px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-600">✕</button>
                            )}
                            {g.estado === "CANCELADA" && (
                              <button title="Eliminar" onClick={() => deleteGuia(g.id)}
                                className="text-xs px-1.5 py-0.5 rounded bg-red-100 hover:bg-red-200 text-red-700">🗑️</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
