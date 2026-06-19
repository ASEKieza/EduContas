"use client";
import { useState, useMemo } from "react";
import { useWindowManager } from "@/lib/windowManager";
import {
  agtLookupNif,
  agtTipoParaCliente,
  agtRegimeParaIva,
  formatarDataConsulta,
  type AgtContribuinte,
} from "@/lib/agt-nif";

type TipoCliente = "empresa" | "particular" | "publica" | "estrangeira";
type EstadoCliente = "activo" | "inactivo" | "suspenso";

interface Cliente {
  id: string;
  codigo: string;
  nif: string;
  nome: string;
  tipo: TipoCliente;
  estado: EstadoCliente;
  // Localização
  endereco: string;
  cidade: string;
  pais: string;
  // Contacto
  email: string;
  telefone: string;
  contacto: string; // pessoa de contacto
  // Comercial
  condicaoPagamento: string;
  prazoVencimento: number; // dias
  limiteCredito: number;
  saldoDevedor: number;
  totalFacturado: number;
  // Fiscal
  ivaRegime: "normal" | "simplificado" | "isento";
  moeda: string;
  contaReceberPGCA: string;
  // Datas
  criadoEm: string;
  ultimaTransaccao: string;
}

const CLIENTES: Cliente[] = [
  { id:"c1", codigo:"CLI-0001", nif:"5412378901", nome:"Petro Distribuição SA", tipo:"empresa", estado:"activo", endereco:"Av. 4 de Fevereiro, 123", cidade:"Luanda", pais:"Angola", email:"financeiro@petrodist.ao", telefone:"+244 222 300 100", contacto:"Carlos Mendes", condicaoPagamento:"30 dias", prazoVencimento:30, limiteCredito:50000000, saldoDevedor:12500000, totalFacturado:185000000, ivaRegime:"normal", moeda:"Kz", contaReceberPGCA:"31.1", criadoEm:"2024-01-10", ultimaTransaccao:"2026-05-31" },
  { id:"c2", codigo:"CLI-0002", nif:"5399012345", nome:"Construções Unidas Lda.", tipo:"empresa", estado:"activo", endereco:"Rua Rainha Ginga, 45", cidade:"Luanda", pais:"Angola", email:"geral@cunidas.ao", telefone:"+244 923 456 789", contacto:"Ana Lima", condicaoPagamento:"15 dias", prazoVencimento:15, limiteCredito:20000000, saldoDevedor:3200000, totalFacturado:67000000, ivaRegime:"normal", moeda:"Kz", contaReceberPGCA:"31.1", criadoEm:"2024-03-15", ultimaTransaccao:"2026-05-30" },
  { id:"c3", codigo:"CLI-0003", nif:"5278934001", nome:"Telecom Angola SA", tipo:"publica", estado:"activo", endereco:"Av. Comandante Valódia, 206", cidade:"Luanda", pais:"Angola", email:"compras@telecom.ao", telefone:"+244 222 100 200", contacto:"Beatriz Costa", condicaoPagamento:"60 dias", prazoVencimento:60, limiteCredito:200000000, saldoDevedor:45000000, totalFacturado:420000000, ivaRegime:"normal", moeda:"Kz", contaReceberPGCA:"31.1", criadoEm:"2023-06-01", ultimaTransaccao:"2026-05-29" },
  { id:"c4", codigo:"CLI-0004", nif:"0000000000", nome:"Consumidor Final", tipo:"particular", estado:"activo", endereco:"—", cidade:"Luanda", pais:"Angola", email:"", telefone:"", contacto:"", condicaoPagamento:"Pronto Pagamento", prazoVencimento:0, limiteCredito:0, saldoDevedor:0, totalFacturado:8500000, ivaRegime:"normal", moeda:"Kz", contaReceberPGCA:"31.1", criadoEm:"2024-01-01", ultimaTransaccao:"2026-05-27" },
  { id:"c5", codigo:"CLI-0005", nif:"5567123890", nome:"Sonangol EP", tipo:"publica", estado:"activo", endereco:"Rua Rainha Ginga, 29–35", cidade:"Luanda", pais:"Angola", email:"procurement@sonangol.ao", telefone:"+244 222 697 000", contacto:"Pedro Neto", condicaoPagamento:"45 dias", prazoVencimento:45, limiteCredito:500000000, saldoDevedor:0, totalFacturado:95000000, ivaRegime:"normal", moeda:"Kz", contaReceberPGCA:"31.1", criadoEm:"2023-01-15", ultimaTransaccao:"2026-04-30" },
  { id:"c6", codigo:"CLI-0006", nif:"GB123456789", nome:"Angola LNG UK Ltd.", tipo:"estrangeira", estado:"activo", endereco:"22 Bishopsgate, London", cidade:"Londres", pais:"Reino Unido", email:"angola@angolalng.com", telefone:"+44 20 7xxx xxxx", contacto:"James Wilson", condicaoPagamento:"30 dias", prazoVencimento:30, limiteCredito:1000000, saldoDevedor:250000, totalFacturado:3200000, ivaRegime:"isento", moeda:"USD", contaReceberPGCA:"31.1.4", criadoEm:"2024-08-01", ultimaTransaccao:"2026-03-15" },
];

const TIPO_CONFIG: Record<TipoCliente, { label: string; color: string }> = {
  empresa:    { label: "Empresa",      color: "bg-blue-100 text-blue-700" },
  particular: { label: "Particular",  color: "bg-ink-100 text-ink-600" },
  publica:    { label: "Ent. Pública", color: "bg-gold-100 text-gold-700" },
  estrangeira:{ label: "Estrangeira",  color: "bg-purple-100 text-purple-700" },
};
const ESTADO_CONFIG: Record<EstadoCliente, { label: string; color: string }> = {
  activo:   { label: "Activo",   color: "bg-green-100 text-green-700" },
  inactivo: { label: "Inactivo", color: "bg-ink-100 text-ink-500" },
  suspenso: { label: "Suspenso", color: "bg-brand-100 text-brand-700" },
};
function fmtAOA(n: number) { return new Intl.NumberFormat("pt-AO",{maximumFractionDigits:0}).format(n)+" AOA"; }

const EMPTY: Partial<Cliente> = {
  codigo:"", nif:"", nome:"", tipo:"empresa", estado:"activo",
  endereco:"", cidade:"Luanda", pais:"Angola", email:"", telefone:"", contacto:"",
  condicaoPagamento:"30 dias", prazoVencimento:30, limiteCredito:0,
  ivaRegime:"normal", moeda:"Kz", contaReceberPGCA:"31.1",
};

// ── Form component (self-contained state) ─────────────────────────────────────
type NifStatus = "idle" | "loading" | "found" | "not_found" | "invalid" | "error";

function ClienteFormWindow({
  initialForm,
  isEdit,
  onSave,
  onClose,
}: {
  initialForm: Partial<Cliente>;
  isEdit: boolean;
  onSave: (data: Partial<Cliente>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Cliente>>(initialForm);
  const [nifStatus, setNifStatus] = useState<NifStatus>("idle");
  const [nifDados, setNifDados] = useState<AgtContribuinte | null>(null);
  const [nifConsultadoEm, setNifConsultadoEm] = useState<string>("");

  function resetNifStatus() {
    setNifStatus("idle");
    setNifDados(null);
    setNifConsultadoEm("");
  }

  async function consultarNif() {
    const nif = (form.nif || "").trim();
    if (!nif) return;
    setNifStatus("loading");
    setNifDados(null);
    try {
      const res = await agtLookupNif(nif);
      setNifConsultadoEm(res.consultadoEm);
      if (res.ok && res.contribuinte) {
        const c = res.contribuinte;
        setNifDados(c);
        setNifStatus("found");
        setForm(prev => ({
          ...prev,
          nome: c.nome,
          tipo: agtTipoParaCliente(c.tipoContribuinte),
          endereco: c.endereco,
          cidade: c.municipio,
          pais: "Angola",
          ivaRegime: agtRegimeParaIva(c.regimeFiscal) as "normal" | "simplificado" | "isento",
          contaReceberPGCA: agtTipoParaCliente(c.tipoContribuinte) === "estrangeira" ? "31.1.4" : "31.1",
        }));
      } else if (res.error === "nif_invalido") {
        setNifStatus("invalid");
      } else if (res.error === "nao_encontrado") {
        setNifStatus("not_found");
      } else {
        setNifStatus("error");
      }
    } catch {
      setNifStatus("error");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Identificação */}
        <div>
          <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">Identificação</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Código</label><input className="input font-mono" value={form.codigo||""} onChange={e=>setForm(p=>({...p,codigo:e.target.value}))} /></div>

            {/* NIF com botão Consultar AGT */}
            <div className="col-span-2">
              <label className="label">
                NIF *
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:"#d4a017",color:"#0d0e18"}}>AGT</span>
              </label>
              <div className="flex gap-2">
                <input
                  className="input font-mono flex-1"
                  value={form.nif||""}
                  onChange={e=>{ setForm(p=>({...p,nif:e.target.value})); resetNifStatus(); }}
                  placeholder="5000000000"
                  maxLength={14}
                />
                <button
                  type="button"
                  onClick={consultarNif}
                  disabled={nifStatus==="loading" || !(form.nif||"").trim()}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: nifStatus==="found" ? "#dcfce7" : "#fff",
                    borderColor: nifStatus==="found" ? "#86efac" : nifStatus==="not_found"||nifStatus==="invalid" ? "#fca5a5" : "#d1d5db",
                    color: nifStatus==="found" ? "#16a34a" : nifStatus==="not_found"||nifStatus==="invalid" ? "#dc2626" : "#374151",
                  }}
                >
                  {nifStatus==="loading" ? (
                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                    </svg>
                  ) : nifStatus==="found" ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                  )}
                  {nifStatus==="loading" ? "A consultar…" : "Consultar AGT"}
                </button>
              </div>

              {/* Banners de feedback */}
              {nifStatus==="found" && nifDados && (
                <div className="mt-2 p-3 rounded-lg border border-green-200 bg-green-50 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="font-bold text-green-800 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                        Dados obtidos da AGT — preenchido automaticamente
                      </p>
                      <p className="text-green-700"><strong>Nome:</strong> {nifDados.nome}</p>
                      <p className="text-green-700">
                        <strong>Tipo:</strong> {nifDados.tipoContribuinte} &nbsp;·&nbsp;
                        <strong>Estado:</strong>{" "}
                        <span className={nifDados.estado==="ACTIVO" ? "text-green-800 font-semibold" : "text-red-600 font-semibold"}>
                          {nifDados.estado}
                        </span>
                      </p>
                      <p className="text-green-700">
                        <strong>Regime:</strong> {nifDados.regimeFiscal} &nbsp;·&nbsp;
                        <strong>Actividade:</strong> {nifDados.actividadePrincipal} (CAE {nifDados.caeCode})
                      </p>
                      <p className="text-green-700">
                        <strong>Morada:</strong> {nifDados.endereco}, {nifDados.municipio}, {nifDados.provincia}
                      </p>
                      <p className="text-green-600 mt-1">Consultado em {formatarDataConsulta(nifConsultadoEm)}</p>
                    </div>
                    <button onClick={resetNifStatus} className="text-green-500 hover:text-green-700 shrink-0 text-base leading-none">×</button>
                  </div>
                  {nifDados.estado !== "ACTIVO" && (
                    <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-700 font-medium">
                      ⚠ Contribuinte com estado <strong>{nifDados.estado}</strong> na AGT. Confirme antes de registar.
                    </div>
                  )}
                </div>
              )}
              {nifStatus==="not_found" && (
                <div className="mt-2 p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 flex items-center justify-between">
                  <span><strong>NIF não encontrado</strong> na base de dados da AGT. Preencha os dados manualmente.</span>
                  <button onClick={resetNifStatus} className="ml-2 text-red-400 hover:text-red-600 shrink-0">×</button>
                </div>
              )}
              {nifStatus==="invalid" && (
                <div className="mt-2 p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 flex items-center justify-between">
                  <span><strong>Formato inválido.</strong> O NIF deve ter 9 ou 10 dígitos numéricos.</span>
                  <button onClick={resetNifStatus} className="ml-2 text-red-400 hover:text-red-600 shrink-0">×</button>
                </div>
              )}
              {nifStatus==="error" && (
                <div className="mt-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-700 flex items-center justify-between">
                  <span>⚠ Não foi possível contactar a AGT. Preencha os dados manualmente.</span>
                  <button onClick={resetNifStatus} className="ml-2 text-amber-400 hover:text-amber-600 shrink-0">×</button>
                </div>
              )}
            </div>

            <div><label className="label">Tipo</label>
              <select className="input" value={form.tipo||"empresa"} onChange={e=>setForm(p=>({...p,tipo:e.target.value as TipoCliente}))}>
                {Object.entries(TIPO_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className="label">Nome / Denominação Social *</label>
              <input className="input" value={form.nome||""} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} placeholder="Preenchido automaticamente ao consultar o NIF"/>
            </div>
          </div>
        </div>
        {/* Localização */}
        <div>
          <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">Localização</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3"><label className="label">Endereço</label><input className="input" value={form.endereco||""} onChange={e=>setForm(p=>({...p,endereco:e.target.value}))}/></div>
            <div><label className="label">Cidade</label><input className="input" value={form.cidade||""} onChange={e=>setForm(p=>({...p,cidade:e.target.value}))}/></div>
            <div><label className="label">País</label><input className="input" value={form.pais||""} onChange={e=>setForm(p=>({...p,pais:e.target.value}))}/></div>
            <div><label className="label">Moeda</label>
              <select className="input" value={form.moeda||"Kz"} onChange={e=>setForm(p=>({...p,moeda:e.target.value}))}>
                {["Kz","USD","EUR","GBP","ZAR"].map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
        {/* Contacto */}
        <div>
          <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">Contacto</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Pessoa de Contacto</label><input className="input" value={form.contacto||""} onChange={e=>setForm(p=>({...p,contacto:e.target.value}))}/></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email||""} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></div>
            <div><label className="label">Telefone</label><input className="input" value={form.telefone||""} onChange={e=>setForm(p=>({...p,telefone:e.target.value}))}/></div>
          </div>
        </div>
        {/* Condições Comerciais */}
        <div>
          <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">Condições Comerciais</p>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Cond. Pagamento</label>
              <select className="input" value={form.condicaoPagamento||"30 dias"} onChange={e=>setForm(p=>({...p,condicaoPagamento:e.target.value}))}>
                {["Pronto Pagamento","8 dias","15 dias","30 dias","45 dias","60 dias","90 dias"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Limite de Crédito (Kz)</label><input className="input" type="number" value={form.limiteCredito||0} onChange={e=>setForm(p=>({...p,limiteCredito:+e.target.value}))}/></div>
            <div><label className="label">Regime IVA</label>
              <select className="input" value={form.ivaRegime||"normal"} onChange={e=>setForm(p=>({...p,ivaRegime:e.target.value as "normal"|"simplificado"|"isento"}))}>
                <option value="normal">Normal (14%)</option>
                <option value="simplificado">Simplificado</option>
                <option value="isento">Isento</option>
              </select>
            </div>
            <div><label className="label">Conta PGCA (receber)</label>
              <select className="input" value={form.contaReceberPGCA||"31.1"} onChange={e=>setForm(p=>({...p,contaReceberPGCA:e.target.value}))}>
                <option value="31.1">31.1 — Clientes Correntes</option>
                <option value="31.1.3">31.1.3 — Clientes Nacionais</option>
                <option value="31.1.4">31.1.4 — Clientes Estrangeiros</option>
                <option value="31.8">31.8 — Clientes Cobrança Duvidosa</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={!form.nome||!form.nif} className="btn-primary">{isEdit?"Guardar":"Registar Cliente"}</button>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [clientes, setClientes] = useState<Cliente[]>(CLIENTES);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterEstado, setFilterEstado] = useState("activo");
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [tab, setTab] = useState<"ficha"|"saldo"|"historico">("ficha");

  const filtered = useMemo(() => clientes.filter(c => {
    if (filterEstado && c.estado !== filterEstado) return false;
    if (filterTipo && c.tipo !== filterTipo) return false;
    if (search && !c.nome.toLowerCase().includes(search.toLowerCase()) && !c.nif.includes(search) && !c.codigo.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [clientes, search, filterTipo, filterEstado]);

  const totals = useMemo(() => ({
    activos: clientes.filter(c=>c.estado==="activo").length,
    saldoTotal: clientes.reduce((s,c)=>s+c.saldoDevedor,0),
    facturado: clientes.reduce((s,c)=>s+c.totalFacturado,0),
  }), [clientes]);

  function handleOpenCriar() {
    const winId = `criar-${crypto.randomUUID()}`;
    const initialForm = {...EMPTY, codigo:`CLI-${String(clientes.length+1).padStart(4,"0")}`};
    openWindow({
      id: winId, title: "Novo Cliente", icon: "👤",
      content: (
        <ClienteFormWindow
          initialForm={initialForm}
          isEdit={false}
          onSave={(data) => {
            if (!data.nome || !data.nif) return;
            const nc: Cliente = {...EMPTY, ...data, id:`c${Date.now()}`, saldoDevedor:0, totalFacturado:0, criadoEm:new Date().toISOString().slice(0,10), ultimaTransaccao:"—"} as Cliente;
            setClientes(p=>[...p,nc]);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 40, y: 20, width: 780, height: 580, minimized: false, maximized: false,
    });
  }

  function handleOpenEditar(c: Cliente) {
    const winId = `editar-${c.id}`;
    openWindow({
      id: winId, title: `Editar Cliente — ${c.nome}`, icon: "👤",
      content: (
        <ClienteFormWindow
          initialForm={{...c}}
          isEdit={true}
          onSave={(data) => {
            if (!data.nome || !data.nif) return;
            setClientes(p=>p.map(x=>x.id===c.id?{...x,...data} as Cliente:x));
            setSelected(s=>s?.id===c.id?{...s,...data} as Cliente:s);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 60, y: 40, width: 780, height: 580, minimized: false, maximized: false,
    });
  }

  function toggleEstado(c: Cliente) {
    const novo = c.estado==="activo"?"inactivo":"activo";
    setClientes(p=>p.map(x=>x.id===c.id?{...x,estado:novo}:x));
    setSelected(s=>s?.id===c.id?{...s,estado:novo}:s);
  }

  return (
    <div className="p-6 max-w-full">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2">Cadastro de Clientes
            <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">PGCA 31.1</span>
          </h1>
          <p className="text-sm text-ink-500 mt-0.5">{totals.activos} activos · Saldo em dívida: <strong className="text-brand-600">{fmtAOA(totals.saldoTotal)}</strong> · Total facturado: <strong>{fmtAOA(totals.facturado)}</strong></p>
        </div>
        <button onClick={handleOpenCriar} className="btn-primary text-xs">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Novo Cliente
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          {label:"Clientes Activos",    v:totals.activos,              color:"text-ink-800"},
          {label:"Total Clientes",      v:clientes.length,             color:"text-ink-800"},
          {label:"Saldo em Dívida",     v:fmtAOA(totals.saldoTotal),   color:"text-brand-600"},
          {label:"Total Facturado",     v:fmtAOA(totals.facturado),    color:"text-green-600"},
        ].map(k=>(
          <div key={k.label} className="card p-4">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">{k.label}</p>
            <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Lista */}
        <div className="lg:col-span-3 space-y-3">
          {/* Filtros */}
          <div className="card p-3 flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input className="input pl-9 text-sm" placeholder="Nome, NIF ou código..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select className="input w-auto text-sm" value={filterTipo} onChange={e=>setFilterTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="input w-auto text-sm" value={filterEstado} onChange={e=>setFilterEstado(e.target.value)}>
              <option value="">Todos os estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
              <option value="suspenso">Suspensos</option>
            </select>
          </div>

          <div className="card overflow-hidden">
            <table className="table-auto w-full">
              <thead><tr>
                <th>Código</th><th>Nome / NIF</th><th className="text-center">Tipo</th>
                <th className="text-right">Saldo</th><th className="text-center">Estado</th>
              </tr></thead>
              <tbody>
                {filtered.map(c=>{
                  const tc=TIPO_CONFIG[c.tipo], ec=ESTADO_CONFIG[c.estado];
                  const isSel=selected?.id===c.id;
                  return(
                  <tr key={c.id} onClick={()=>setSelected(isSel?null:c)} className={`cursor-pointer transition-colors ${isSel?"bg-brand-50":"hover:bg-ink-50/50"}`}>
                    <td className="px-3 py-2.5 border-t border-ink-100"><span className="font-mono text-xs font-bold text-ink-600">{c.codigo}</span></td>
                    <td className="px-3 py-2.5 border-t border-ink-100">
                      <p className="font-semibold text-ink-800 text-sm">{c.nome}</p>
                      <p className="text-xs text-ink-400">{c.pais!=="Angola"?`${c.pais} · `:""}{c.nif}</p>
                    </td>
                    <td className="px-3 py-2.5 border-t border-ink-100 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tc.color}`}>{tc.label}</span>
                    </td>
                    <td className="px-3 py-2.5 border-t border-ink-100 text-right">
                      <span className={`text-sm font-bold ${c.saldoDevedor>0?"text-brand-600":"text-ink-400"}`}>
                        {c.saldoDevedor>0?fmtAOA(c.saldoDevedor):"—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 border-t border-ink-100 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${ec.color}`}>{ec.label}</span>
                    </td>
                  </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={5} className="px-4 py-10 text-center text-ink-400 text-sm">Nenhum cliente encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Painel detalhe */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="card overflow-hidden sticky top-4">
              <div className={`h-1.5 ${selected.estado==="activo"?"bg-green-500":selected.estado==="suspenso"?"bg-brand-500":"bg-ink-300"}`} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold text-ink-900">{selected.nome}</p>
                    <p className="text-xs text-ink-400">{selected.codigo} · NIF {selected.nif}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={()=>handleOpenEditar(selected)} className="btn-ghost text-xs px-2 py-1">Editar</button>
                    <button onClick={()=>toggleEstado(selected)} className="btn-ghost text-xs px-2 py-1 text-brand-600">
                      {selected.estado==="activo"?"Suspender":"Activar"}
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-4 border-b border-ink-100">
                  {(["ficha","saldo","historico"] as const).map(t=>(
                    <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${tab===t?"border-brand-600 text-brand-600":"border-transparent text-ink-400 hover:text-ink-600"}`}>
                      {t==="ficha"?"Ficha":t==="saldo"?"Saldo":"Histórico"}
                    </button>
                  ))}
                </div>

                {tab==="ficha"&&(
                  <div className="space-y-2 text-xs">
                    {[
                      ["Tipo",TIPO_CONFIG[selected.tipo].label],
                      ["País",selected.pais],
                      ["Cidade",selected.cidade],
                      ["Endereço",selected.endereco||"—"],
                      ["Contacto",selected.contacto||"—"],
                      ["Email",selected.email||"—"],
                      ["Telefone",selected.telefone||"—"],
                      ["Cond. Pagamento",selected.condicaoPagamento],
                      ["Prazo (dias)",selected.prazoVencimento+"d"],
                      ["Limite de Crédito",selected.limiteCredito>0?fmtAOA(selected.limiteCredito):"Sem limite"],
                      ["Regime IVA",selected.ivaRegime==="normal"?"Normal 14%":selected.ivaRegime==="simplificado"?"Simplificado":"Isento"],
                      ["Moeda",selected.moeda],
                      ["Conta PGCA",selected.contaReceberPGCA],
                      ["Criado em",selected.criadoEm],
                    ].map(([k,v])=>(
                      <div key={k} className="flex justify-between py-1 border-b border-ink-50">
                        <span className="text-ink-500">{k}</span>
                        <span className="font-medium text-ink-800 text-right max-w-[55%]">{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {tab==="saldo"&&(
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 text-center">
                      <p className="text-xs text-brand-600 mb-1">Saldo em Dívida</p>
                      <p className="text-2xl font-bold text-brand-700">{fmtAOA(selected.saldoDevedor)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                      <p className="text-xs text-green-600 mb-1">Total Facturado (acumulado)</p>
                      <p className="text-2xl font-bold text-green-700">{fmtAOA(selected.totalFacturado)}</p>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-ink-500">Limite de Crédito</span>
                        <span className="font-bold">{selected.limiteCredito>0?fmtAOA(selected.limiteCredito):"Ilimitado"}</span>
                      </div>
                      {selected.limiteCredito>0&&(
                        <>
                          <div className="stat-bar"><div className="stat-bar-fill bg-brand-500" style={{width:`${Math.min((selected.saldoDevedor/selected.limiteCredito)*100,100)}%`}}/></div>
                          <p className="text-ink-400 text-right">{Math.round((selected.saldoDevedor/selected.limiteCredito)*100)}% do limite utilizado</p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {tab==="historico"&&(
                  <div className="space-y-2">
                    <p className="text-xs text-ink-500">Últimas transacções</p>
                    {[
                      {data:"2026-05-31",doc:"FT 2026/A/00047",valor:1425000},
                      {data:"2026-05-15",doc:"FT 2026/A/00041",valor:2100000},
                      {data:"2026-05-03",doc:"RC 2026/A/00022",valor:-1500000},
                    ].map((t,i)=>(
                      <div key={i} className="flex items-center justify-between py-2 border-b border-ink-100">
                        <div><p className="text-xs font-mono font-medium text-ink-700">{t.doc}</p><p className="text-[11px] text-ink-400">{t.data}</p></div>
                        <span className={`text-sm font-bold ${t.valor<0?"text-green-600":"text-ink-800"}`}>{t.valor<0?"-":""}{fmtAOA(Math.abs(t.valor))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center border-dashed">
              <svg className="w-10 h-10 text-ink-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <p className="text-sm text-ink-400">Seleccione um cliente para ver a ficha completa</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
