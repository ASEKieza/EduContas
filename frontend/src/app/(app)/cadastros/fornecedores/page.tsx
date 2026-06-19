"use client";

import { useState, useMemo } from "react";
import { useWindowManager } from "@/lib/windowManager";
import {
  agtLookupNif,
  agtTipoParaFornecedor,
  agtRegimeParaIva,
  formatarDataConsulta,
  type AgtContribuinte,
} from "@/lib/agt-nif";

// ── Types ──────────────────────────────────────────────────────────────────────
type TipoFornecedor = "empresa" | "particular" | "estrangeiro" | "publica";
type EstadoFornecedor = "activo" | "inactivo" | "suspenso";
type RegimeIVA = "normal" | "simplificado" | "isento" | "nao_sujeito";

interface Fornecedor {
  id: string;
  codigo: string;
  nif: string;
  tipo: TipoFornecedor;
  nome: string;
  nomeComercial?: string;
  endereco: string;
  cidade: string;
  pais: string;
  moeda: string;
  iban?: string;
  bic?: string;
  banco?: string;
  agenciaBanco?: string;
  pessoaContacto?: string;
  email?: string;
  telefone?: string;
  prazo: number;
  limiteCredito: number;
  saldoDevedor: number;
  totalComprado: number;
  regimeIVA: RegimeIVA;
  ivaTaxa: number;
  contaPGCA: string;
  estado: EstadoFornecedor;
  dataCadastro: string;
  observacoes?: string;
}

const FORNECEDORES_DEMO: Fornecedor[] = [
  {
    id: "F001", codigo: "F-001", nif: "5000987654", tipo: "empresa",
    nome: "Total Energias Angola SA", nomeComercial: "Total",
    endereco: "Av. Lenine, 58", cidade: "Luanda", pais: "Angola", moeda: "Kz",
    iban: "AO06 0040 0000 1234 5678 1015 4", bic: "BIAOANLA", banco: "BIA", agenciaBanco: "Luanda Central",
    pessoaContacto: "Carlos Neto", email: "fornecedor@total.ao", telefone: "+244 923 111 222",
    prazo: 30, limiteCredito: 50000000, saldoDevedor: 12500000, totalComprado: 185000000,
    regimeIVA: "normal", ivaTaxa: 14, contaPGCA: "32.1", estado: "activo", dataCadastro: "2023-01-15",
  },
  {
    id: "F002", codigo: "F-002", nif: "5001122334", tipo: "empresa",
    nome: "Multiplex Distribuição Lda.", nomeComercial: "Multiplex",
    endereco: "R. Rainha Ginga, 120", cidade: "Luanda", pais: "Angola", moeda: "Kz",
    iban: "AO06 0006 0000 9876 5432 1015 7", bic: "BPCAANLA", banco: "BPC", agenciaBanco: "Maianga",
    pessoaContacto: "Ana Ferreira", email: "compras@multiplex.ao", telefone: "+244 912 333 444",
    prazo: 15, limiteCredito: 20000000, saldoDevedor: 3200000, totalComprado: 48000000,
    regimeIVA: "normal", ivaTaxa: 14, contaPGCA: "32.1", estado: "activo", dataCadastro: "2023-03-20",
  },
  {
    id: "F003", codigo: "F-003", nif: "5002233445", tipo: "empresa",
    nome: "Oficinas Mecânicas do Sul Lda.", nomeComercial: "OMS",
    endereco: "Zona Industrial, Lote 45", cidade: "Lubango", pais: "Angola", moeda: "Kz",
    banco: "BAI", pessoaContacto: "Manuel Dias",
    email: "oms@lubango.ao", telefone: "+244 951 555 666",
    prazo: 30, limiteCredito: 8000000, saldoDevedor: 850000, totalComprado: 22000000,
    regimeIVA: "simplificado", ivaTaxa: 7, contaPGCA: "32.1", estado: "activo", dataCadastro: "2023-06-10",
  },
  {
    id: "F004", codigo: "F-004", nif: "FR12345678900", tipo: "estrangeiro",
    nome: "Schneider Electric France SAS", nomeComercial: "Schneider Electric",
    endereco: "35 Rue Joseph Monier", cidade: "Rueil-Malmaison", pais: "França", moeda: "EUR",
    iban: "FR76 3000 4028 3798 7654 3210 943", bic: "BNPAFRPP", banco: "BNP Paribas",
    pessoaContacto: "Marie Dupont", email: "export@schneider.fr", telefone: "+33 1 4129 7000",
    prazo: 60, limiteCredito: 100000, saldoDevedor: 45000, totalComprado: 320000,
    regimeIVA: "nao_sujeito", ivaTaxa: 0, contaPGCA: "32.1.4", estado: "activo", dataCadastro: "2022-11-05",
  },
  {
    id: "F005", codigo: "F-005", nif: "5003344556", tipo: "publica",
    nome: "EDEL — Empresa de Distribuição de Electricidade EP", nomeComercial: "EDEL",
    endereco: "Av. 4 de Fevereiro, 30", cidade: "Luanda", pais: "Angola", moeda: "Kz",
    email: "clientes@edel.ao", telefone: "+244 222 330 000",
    prazo: 0, limiteCredito: 0, saldoDevedor: 0, totalComprado: 4500000,
    regimeIVA: "isento", ivaTaxa: 0, contaPGCA: "32.1", estado: "activo", dataCadastro: "2023-01-01",
  },
  {
    id: "F006", codigo: "F-006", nif: "5004455667", tipo: "empresa",
    nome: "PaperWork Papelaria Lda.", nomeComercial: "PaperWork",
    endereco: "Mercado do Kinaxixe, Lote 12", cidade: "Luanda", pais: "Angola", moeda: "Kz",
    prazo: 8, limiteCredito: 2000000, saldoDevedor: 0, totalComprado: 3800000,
    regimeIVA: "simplificado", ivaTaxa: 7, contaPGCA: "32.1", estado: "inactivo", dataCadastro: "2022-05-18",
  },
];

const TIPO_LABEL: Record<TipoFornecedor, string> = {
  empresa: "Empresa", particular: "Particular", estrangeiro: "Estrangeiro", publica: "Entidade Pública",
};
const ESTADO_COLOR: Record<EstadoFornecedor, string> = {
  activo: "#10b981", inactivo: "#6b7280", suspenso: "#ef4444",
};
const REGIME_LABEL: Record<RegimeIVA, string> = {
  normal: "Regime Normal", simplificado: "Regime Simplificado",
  isento: "Isento", nao_sujeito: "Não Sujeito",
};
const CONTA_PGCA: Record<string, string> = {
  "32.1":   "32.1 — Fornecedores Correntes",
  "32.1.3": "32.1.3 — Fornecedores Nacionais",
  "32.1.4": "32.1.4 — Fornecedores Estrangeiros",
  "32.2":   "32.2 — Fornecedores Títulos a Pagar",
  "32.9.1": "32.9.1 — Adiantamentos a Fornecedores",
};

function fmtAOA(v: number) {
  return `Kz ${v.toLocaleString("pt-PT", { maximumFractionDigits: 0 })}`;
}

const BLANK: Partial<Fornecedor> = {
  tipo: "empresa", pais: "Angola", moeda: "Kz",
  prazo: 30, limiteCredito: 0, regimeIVA: "normal", ivaTaxa: 14, contaPGCA: "32.1", estado: "activo",
};

// ── Form component ─────────────────────────────────────────────────────────────
type NifStatus = "idle" | "loading" | "found" | "not_found" | "invalid" | "error";

function FornecedorFormWindow({
  initialForm, isEdit, onSave, onClose,
}: {
  initialForm: Partial<Fornecedor>; isEdit: boolean;
  onSave: (data: Partial<Fornecedor>) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Fornecedor>>(initialForm);
  const [nifStatus, setNifStatus] = useState<NifStatus>("idle");
  const [nifDados, setNifDados] = useState<AgtContribuinte | null>(null);
  const [nifConsultadoEm, setNifConsultadoEm] = useState<string>("");

  function resetNifStatus() { setNifStatus("idle"); setNifDados(null); setNifConsultadoEm(""); }

  async function consultarNif() {
    const nif = (form.nif || "").trim();
    if (!nif) return;
    setNifStatus("loading"); setNifDados(null);
    try {
      const res = await agtLookupNif(nif);
      setNifConsultadoEm(res.consultadoEm);
      if (res.ok && res.contribuinte) {
        const c = res.contribuinte;
        setNifDados(c); setNifStatus("found");
        setForm(prev => ({
          ...prev, nome: c.nome, tipo: agtTipoParaFornecedor(c.tipoContribuinte),
          endereco: c.endereco, cidade: c.municipio, pais: "Angola", moeda: "Kz",
          regimeIVA: agtRegimeParaIva(c.regimeFiscal) as RegimeIVA,
          contaPGCA: agtTipoParaFornecedor(c.tipoContribuinte) === "estrangeiro" ? "32.1.4" : "32.1",
        }));
      } else if (res.error === "nif_invalido") { setNifStatus("invalid"); }
      else if (res.error === "nao_encontrado") { setNifStatus("not_found"); }
      else { setNifStatus("error"); }
    } catch { setNifStatus("error"); }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Identificação */}
        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            Identificação
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:"#d4a017",color:"#0d0e18"}}>AGT</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Código" value={form.codigo || ""} onChange={v => setForm(f => ({ ...f, codigo: v }))} />

            {/* NIF com Consulta AGT */}
            <div className="col-span-1">
              <label className="block text-xs font-medium text-ink-600 mb-1">NIF *</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 focus:outline-none focus:border-brand-400 font-mono"
                  value={form.nif || ""}
                  onChange={e => { setForm(f => ({ ...f, nif: e.target.value })); resetNifStatus(); }}
                  placeholder="5000000000" maxLength={14}
                />
                <button
                  type="button" onClick={consultarNif}
                  disabled={nifStatus === "loading" || !(form.nif || "").trim()}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: nifStatus === "found" ? "#dcfce7" : "#fff",
                    borderColor: nifStatus === "found" ? "#86efac" : nifStatus === "not_found" || nifStatus === "invalid" ? "#fca5a5" : "#d1d5db",
                    color: nifStatus === "found" ? "#16a34a" : nifStatus === "not_found" || nifStatus === "invalid" ? "#dc2626" : "#374151",
                  }}
                >
                  {nifStatus === "loading" ? (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                    </svg>
                  ) : nifStatus === "found" ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                  )}
                  {nifStatus === "loading" ? "A consultar…" : "Consultar AGT"}
                </button>
              </div>

              {/* Banners de feedback */}
              {nifStatus === "found" && nifDados && (
                <div className="mt-2 p-3 rounded-lg border border-green-200 bg-green-50 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-bold text-green-800 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                        Dados obtidos da AGT — preenchido automaticamente
                      </p>
                      <p className="text-green-700 font-medium truncate">{nifDados.nome}</p>
                      <p className="text-green-700">
                        {nifDados.tipoContribuinte} &nbsp;·&nbsp;
                        <span className={nifDados.estado === "ACTIVO" ? "font-semibold text-green-800" : "font-semibold text-red-600"}>{nifDados.estado}</span>
                        &nbsp;·&nbsp; {nifDados.regimeFiscal}
                      </p>
                      <p className="text-green-700">{nifDados.municipio}, {nifDados.provincia}</p>
                      <p className="text-green-600">Consultado em {formatarDataConsulta(nifConsultadoEm)}</p>
                    </div>
                    <button onClick={resetNifStatus} className="text-green-500 hover:text-green-700 shrink-0 text-base leading-none">×</button>
                  </div>
                  {nifDados.estado !== "ACTIVO" && (
                    <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-700 font-medium text-xs">
                      ⚠ Contribuinte <strong>{nifDados.estado}</strong> na AGT. Confirme antes de registar.
                    </div>
                  )}
                </div>
              )}
              {nifStatus === "not_found" && (
                <div className="mt-2 p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 flex items-center justify-between">
                  <span><strong>NIF não encontrado</strong> na base AGT. Preencha manualmente.</span>
                  <button onClick={resetNifStatus} className="ml-2 text-red-400 hover:text-red-600 shrink-0">×</button>
                </div>
              )}
              {nifStatus === "invalid" && (
                <div className="mt-2 p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 flex items-center justify-between">
                  <span><strong>Formato inválido.</strong> O NIF deve ter 9 ou 10 dígitos.</span>
                  <button onClick={resetNifStatus} className="ml-2 text-red-400 hover:text-red-600 shrink-0">×</button>
                </div>
              )}
              {nifStatus === "error" && (
                <div className="mt-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-700 flex items-center justify-between">
                  <span>⚠ Não foi possível contactar a AGT. Preencha manualmente.</span>
                  <button onClick={resetNifStatus} className="ml-2 text-amber-400 hover:text-amber-600 shrink-0">×</button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Tipo *</label>
              <select value={form.tipo || "empresa"} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoFornecedor }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {(["empresa","particular","estrangeiro","publica"] as TipoFornecedor[]).map(t =>
                  <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Estado</label>
              <select value={form.estado || "activo"} onChange={e => setForm(f => ({ ...f, estado: e.target.value as EstadoFornecedor }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="suspenso">Suspenso</option>
              </select>
            </div>
            <div className="col-span-2">
              <Field label="Nome / Razão Social *" value={form.nome || ""} onChange={v => setForm(f => ({ ...f, nome: v }))} />
            </div>
            <Field label="Nome Comercial" value={form.nomeComercial || ""} onChange={v => setForm(f => ({ ...f, nomeComercial: v }))} />
            <Field label="Banco" value={form.banco || ""} onChange={v => setForm(f => ({ ...f, banco: v }))} />
            <Field label="IBAN" value={form.iban || ""} onChange={v => setForm(f => ({ ...f, iban: v }))} />
            <Field label="BIC / SWIFT" value={form.bic || ""} onChange={v => setForm(f => ({ ...f, bic: v }))} />
          </div>
        </section>

        {/* Localização */}
        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Localização</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Endereço" value={form.endereco || ""} onChange={v => setForm(f => ({ ...f, endereco: v }))} />
            </div>
            <Field label="Cidade" value={form.cidade || ""} onChange={v => setForm(f => ({ ...f, cidade: v }))} />
            <Field label="País" value={form.pais || "Angola"} onChange={v => setForm(f => ({ ...f, pais: v }))} />
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Moeda</label>
              <select value={form.moeda || "Kz"} onChange={e => setForm(f => ({ ...f, moeda: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {["Kz","USD","EUR","GBP","ZAR","CNY"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Contacto */}
        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Contacto</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pessoa de Contacto" value={form.pessoaContacto || ""} onChange={v => setForm(f => ({ ...f, pessoaContacto: v }))} />
            <Field label="Email" value={form.email || ""} onChange={v => setForm(f => ({ ...f, email: v }))} type="email" />
            <Field label="Telefone" value={form.telefone || ""} onChange={v => setForm(f => ({ ...f, telefone: v }))} />
          </div>
        </section>

        {/* Condições Comerciais */}
        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Condições Comerciais</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prazo de Pagamento (dias)" value={String(form.prazo ?? 30)} onChange={v => setForm(f => ({ ...f, prazo: Number(v) }))} type="number" />
            <Field label="Limite de Crédito (Kz)" value={String(form.limiteCredito ?? 0)} onChange={v => setForm(f => ({ ...f, limiteCredito: Number(v) }))} type="number" />
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Regime IVA</label>
              <select value={form.regimeIVA || "normal"} onChange={e => setForm(f => ({ ...f, regimeIVA: e.target.value as RegimeIVA }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {(Object.entries(REGIME_LABEL)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <Field label="Taxa IVA (%)" value={String(form.ivaTaxa ?? 14)} onChange={v => setForm(f => ({ ...f, ivaTaxa: Number(v) }))} type="number" />
            <div>
              <label className="block text-xs font-medium text-ink-600 mb-1">Conta PGCA</label>
              <select value={form.contaPGCA || "32.1"} onChange={e => setForm(f => ({ ...f, contaPGCA: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
                {Object.entries(CONTA_PGCA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">Observações</h3>
          <textarea value={form.observacoes || ""} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
            rows={2} className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 focus:outline-none focus:border-brand-400 resize-none" />
        </section>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50">Cancelar</button>
        <button onClick={() => onSave(form)} className="px-5 py-2.5 text-sm font-semibold rounded-lg text-white" style={{ background: "#CC0000" }}>
          {isEdit ? "Guardar Alterações" : "Criar Fornecedor"}
        </button>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function FornecedoresPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [lista, setLista] = useState<Fornecedor[]>(FORNECEDORES_DEMO);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [selected, setSelected] = useState<Fornecedor | null>(null);
  const [tab, setTab] = useState<"ficha" | "saldo" | "historico">("ficha");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return lista.filter(f => {
      if (filterTipo !== "todos" && f.tipo !== filterTipo) return false;
      if (filterEstado !== "todos" && f.estado !== filterEstado) return false;
      if (q && !f.nome.toLowerCase().includes(q) && !f.nif.includes(q) && !f.codigo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lista, search, filterTipo, filterEstado]);

  const kpis = useMemo(() => ({
    activos: lista.filter(f => f.estado === "activo").length,
    saldoTotal: lista.reduce((s, f) => s + f.saldoDevedor, 0),
    totalCompras: lista.reduce((s, f) => s + f.totalComprado, 0),
  }), [lista]);

  function openCriar() {
    const winId = `criar-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Novo Fornecedor", icon: "🏭",
      content: (
        <FornecedorFormWindow
          initialForm={{ ...BLANK }}
          isEdit={false}
          onSave={(data) => {
            if (!data.nome || !data.nif) return;
            const id = `F${String(lista.length + 1).padStart(3, "0")}`;
            const novo: Fornecedor = {
              id, codigo: data.codigo || `F-${String(lista.length + 1).padStart(3, "0")}`,
              nif: data.nif!, tipo: data.tipo as TipoFornecedor || "empresa",
              nome: data.nome!, nomeComercial: data.nomeComercial,
              endereco: data.endereco || "", cidade: data.cidade || "", pais: data.pais || "Angola",
              moeda: data.moeda || "Kz", iban: data.iban, bic: data.bic, banco: data.banco,
              agenciaBanco: data.agenciaBanco, pessoaContacto: data.pessoaContacto,
              email: data.email, telefone: data.telefone,
              prazo: data.prazo || 30, limiteCredito: data.limiteCredito || 0,
              saldoDevedor: 0, totalComprado: 0,
              regimeIVA: data.regimeIVA as RegimeIVA || "normal",
              ivaTaxa: data.ivaTaxa || 14, contaPGCA: data.contaPGCA || "32.1",
              estado: data.estado as EstadoFornecedor || "activo",
              dataCadastro: new Date().toISOString().slice(0, 10),
              observacoes: data.observacoes,
            };
            setLista(l => [...l, novo]);
            setSelected(novo);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 40, y: 20, width: 780, height: 580, minimized: false, maximized: false,
    });
  }
  function openEditar(f: Fornecedor) {
    const winId = `editar-${f.id}`;
    openWindow({
      id: winId, title: `Editar Fornecedor — ${f.nome}`, icon: "🏭",
      content: (
        <FornecedorFormWindow
          initialForm={{ ...f }}
          isEdit={true}
          onSave={(data) => {
            if (!data.nome || !data.nif) return;
            setLista(l => l.map(x => x.id === f.id ? { ...x, ...data } as Fornecedor : x));
            if (selected?.id === f.id) setSelected({ ...selected, ...data } as Fornecedor);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 60, y: 40, width: 780, height: 580, minimized: false, maximized: false,
    });
  }
  function toggleEstado(f: Fornecedor) {
    const next = f.estado === "activo" ? "suspenso" : "activo";
    setLista(l => l.map(x => x.id === f.id ? { ...x, estado: next } : x));
    if (selected?.id === f.id) setSelected({ ...selected, estado: next });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Fornecedores</h1>
          <p className="text-sm text-ink-500 mt-0.5">Cadastro de fornecedores · PGCA 32.1</p>
        </div>
        <button onClick={openCriar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#CC0000" }}>
          <span className="text-lg leading-none">+</span> Novo Fornecedor
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Fornecedores Activos", value: kpis.activos, sub: `de ${lista.length} total` },
          { label: "Saldo em Dívida", value: fmtAOA(kpis.saldoTotal), sub: "saldo credor total" },
          { label: "Total de Compras", value: fmtAOA(kpis.totalCompras), sub: "acumulado histórico" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-ink-100 p-4 shadow-sm">
            <p className="text-xs text-ink-500 font-medium">{k.label}</p>
            <p className="text-2xl font-bold text-ink-900 mt-1">{k.value}</p>
            <p className="text-xs text-ink-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex gap-4">
        {/* List */}
        <div className="flex-1 bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="flex items-center gap-3 p-4 border-b border-ink-100">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, NIF ou código..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 focus:outline-none focus:border-brand-400" />
            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none">
              <option value="todos">Todos os tipos</option>
              {(["empresa","particular","estrangeiro","publica"] as TipoFornecedor[]).map(t =>
                <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
            </select>
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none">
              <option value="todos">Todos os estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="suspenso">Suspenso</option>
            </select>
          </div>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50">
                  {["Código","Nome / NIF","Tipo","Saldo Credor","Total Compras","Estado",""].map(h =>
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id}
                    onClick={() => { setSelected(f); setTab("ficha"); }}
                    className={`border-b border-ink-50 cursor-pointer transition-colors ${selected?.id === f.id ? "bg-brand-50" : "hover:bg-ink-50"}`}>
                    <td className="px-4 py-3 font-mono text-xs text-ink-500">{f.codigo}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink-900">{f.nome}</p>
                      <p className="text-xs text-ink-400">NIF {f.nif}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{TIPO_LABEL[f.tipo]}</td>
                    <td className="px-4 py-3 text-ink-900 font-medium">{fmtAOA(f.saldoDevedor)}</td>
                    <td className="px-4 py-3 text-ink-600">{fmtAOA(f.totalComprado)}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                        style={{ background: ESTADO_COLOR[f.estado] }}>
                        {f.estado.charAt(0).toUpperCase() + f.estado.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); openEditar(f); }}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium">Editar</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-400">Nenhum fornecedor encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail */}
        {selected && (
          <div className="w-80 bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden shrink-0">
            <div className="p-4 border-b border-ink-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-ink-900 text-sm leading-tight">{selected.nome}</h2>
                  <p className="text-xs text-ink-400 mt-0.5">{selected.codigo} · NIF {selected.nif}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shrink-0"
                  style={{ background: ESTADO_COLOR[selected.estado] }}>
                  {selected.estado.charAt(0).toUpperCase() + selected.estado.slice(1)}
                </span>
              </div>
              <div className="flex gap-1 mt-3">
                {(["ficha","saldo","historico"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${tab === t ? "text-white" : "text-ink-500 hover:text-ink-700 hover:bg-ink-100"}`}
                    style={tab === t ? { background: "#CC0000" } : {}}>
                    {t === "historico" ? "Histórico" : t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
              {tab === "ficha" && (
                <dl className="space-y-2 text-sm">
                  {[
                    ["Tipo", TIPO_LABEL[selected.tipo]],
                    ["Nome Comercial", selected.nomeComercial || "—"],
                    ["Endereço", selected.endereco || "—"],
                    ["Cidade", selected.cidade || "—"],
                    ["País", selected.pais],
                    ["Moeda", selected.moeda],
                    ["IBAN", selected.iban || "—"],
                    ["BIC/SWIFT", selected.bic || "—"],
                    ["Banco", selected.banco || "—"],
                    ["Contacto", selected.pessoaContacto || "—"],
                    ["Email", selected.email || "—"],
                    ["Telefone", selected.telefone || "—"],
                    ["Prazo Pagamento", `${selected.prazo} dias`],
                    ["Regime IVA", REGIME_LABEL[selected.regimeIVA]],
                    ["Taxa IVA", `${selected.ivaTaxa}%`],
                    ["Conta PGCA", CONTA_PGCA[selected.contaPGCA] || selected.contaPGCA],
                    ["Data Cadastro", selected.dataCadastro],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between gap-2">
                      <dt className="text-ink-400 text-xs shrink-0">{l}</dt>
                      <dd className="text-ink-800 text-xs font-medium text-right break-all">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {tab === "saldo" && (
                <div className="space-y-4">
                  <div className="bg-ink-50 rounded-lg p-3">
                    <p className="text-xs text-ink-500">Saldo Credor Actual</p>
                    <p className="text-xl font-bold text-ink-900 mt-1">{fmtAOA(selected.saldoDevedor)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-500 mb-1.5">Limite de Crédito</p>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink-700">{fmtAOA(selected.saldoDevedor)}</span>
                      <span className="text-ink-400">{fmtAOA(selected.limiteCredito)}</span>
                    </div>
                    {selected.limiteCredito > 0 && (
                      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min((selected.saldoDevedor / selected.limiteCredito) * 100, 100)}%`,
                            background: selected.saldoDevedor / selected.limiteCredito > 0.9 ? "#ef4444" :
                              selected.saldoDevedor / selected.limiteCredito > 0.7 ? "#f59e0b" : "#10b981"
                          }} />
                      </div>
                    )}
                  </div>
                  <div className="bg-ink-50 rounded-lg p-3">
                    <p className="text-xs text-ink-500">Total de Compras (Histórico)</p>
                    <p className="text-lg font-bold text-ink-900 mt-1">{fmtAOA(selected.totalComprado)}</p>
                  </div>
                </div>
              )}
              {tab === "historico" && (
                <div className="space-y-2">
                  {[
                    { data: "2026-05-28", doc: "FT 2026/0142", valor: 2850000, tipo: "Factura" },
                    { data: "2026-05-15", doc: "PG 2026/0087", valor: -1200000, tipo: "Pagamento" },
                    { data: "2026-04-30", doc: "FT 2026/0118", valor: 1450000, tipo: "Factura" },
                    { data: "2026-04-10", doc: "NC 2026/0012", valor: -150000, tipo: "Nota Crédito" },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-ink-50 text-xs">
                      <div>
                        <p className="font-semibold text-ink-800">{t.doc}</p>
                        <p className="text-ink-400">{t.data} · {t.tipo}</p>
                      </div>
                      <span className={`font-bold ${t.valor > 0 ? "text-red-600" : "text-green-600"}`}>
                        {t.valor > 0 ? "+" : ""}{fmtAOA(t.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-ink-100 flex gap-2">
              <button onClick={() => openEditar(selected)}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50 transition-colors">
                Editar
              </button>
              <button onClick={() => toggleEstado(selected)}
                className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg text-white transition-colors"
                style={{ background: selected.estado === "activo" ? "#ef4444" : "#10b981" }}>
                {selected.estado === "activo" ? "Suspender" : "Activar"}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-ink-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-ink-50 focus:outline-none focus:border-brand-400" />
    </div>
  );
}
