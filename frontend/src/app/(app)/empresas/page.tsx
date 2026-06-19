"use client";

import { useState, useEffect, useRef } from "react";
import { useWindowManager } from "@/lib/windowManager";
import { agtLookupNif, validarFormatoNif } from "@/lib/agt-nif";
import type { AgtContribuinte } from "@/lib/agt-nif";

type TipoEmpresa = "limitada" | "sa" | "epu" | "publica" | "filial" | "representacao";
type RegimeFiscal = "geral" | "simplificado" | "isento";

interface Empresa {
  id: string;
  nif: string;
  nome: string;
  nomeCurto: string;
  tipo: TipoEmpresa;
  regime: RegimeFiscal;
  moedaBase: string;
  anoFiscal: number;
  mesInicioFiscal: number;
  activa: boolean;
  sede: string;
  email: string;
  telefone: string;
  logo?: string;
  pgcaActivo: boolean;
  ivaTaxa: number;
  agencia: string; // AGT agência fiscal
  codigoAGT: string;
  utilizadores: number;
  ultimaSync: string;
}

const EMPRESAS_DEMO: Empresa[] = [
  {
    id: "emp-001",
    nif: "5000123456",
    nome: "Empresa Demo Angola Limitada",
    nomeCurto: "Demo Lda.",
    tipo: "limitada",
    regime: "geral",
    moedaBase: "Kz",
    anoFiscal: 2026,
    mesInicioFiscal: 1,
    activa: true,
    sede: "Luanda, Maianga",
    email: "geral@demo.ao",
    telefone: "+244 222 123 456",
    pgcaActivo: true,
    ivaTaxa: 14,
    agencia: "Luanda Urbano",
    codigoAGT: "AGT-LU-001234",
    utilizadores: 8,
    ultimaSync: "2026-06-01T08:30:00",
  },
  {
    id: "emp-002",
    nif: "5000654321",
    nome: "Comercial Sul Angola SA",
    nomeCurto: "ComSul SA",
    tipo: "sa",
    regime: "geral",
    moedaBase: "Kz",
    anoFiscal: 2026,
    mesInicioFiscal: 1,
    activa: true,
    sede: "Lubango, Huíla",
    email: "contabilidade@comsul.ao",
    telefone: "+244 261 987 654",
    pgcaActivo: true,
    ivaTaxa: 14,
    agencia: "Lubango",
    codigoAGT: "AGT-HU-005678",
    utilizadores: 5,
    ultimaSync: "2026-05-31T16:00:00",
  },
  {
    id: "emp-003",
    nif: "5000999000",
    nome: "Tech Solutions Angola EPU",
    nomeCurto: "TechSol EPU",
    tipo: "epu",
    regime: "simplificado",
    moedaBase: "Kz",
    anoFiscal: 2026,
    mesInicioFiscal: 1,
    activa: false,
    sede: "Luanda, Talatona",
    email: "admin@techsol.ao",
    telefone: "+244 923 456 789",
    pgcaActivo: true,
    ivaTaxa: 7,
    agencia: "Luanda Sul",
    codigoAGT: "AGT-LS-009012",
    utilizadores: 2,
    ultimaSync: "2026-04-15T10:00:00",
  },
];

const TIPOS: Record<TipoEmpresa, string> = {
  limitada: "Soc. por Quotas (Lda.)",
  sa: "Soc. Anónima (SA)",
  epu: "Empresário em Nome Individual (EPU)",
  publica: "Empresa Pública (EP)",
  filial: "Filial / Sucursal",
  representacao: "Representação Comercial",
};

const REGIMES: Record<RegimeFiscal, { label: string; color: string }> = {
  geral:       { label: "Regime Geral",       color: "bg-blue-100 text-blue-700" },
  simplificado:{ label: "Regime Simplificado",color: "bg-gold-100 text-gold-700" },
  isento:      { label: "Isento",             color: "bg-green-100 text-green-700" },
};

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const EMPTY_FORM: Partial<Empresa> = {
  nif: "", nome: "", nomeCurto: "", tipo: "limitada", regime: "geral",
  moedaBase: "Kz", anoFiscal: 2026, mesInicioFiscal: 1,
  sede: "", email: "", telefone: "", ivaTaxa: 14,
  agencia: "", codigoAGT: "", pgcaActivo: true,
};

export default function EmpresasPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [empresas, setEmpresas] = useState<Empresa[]>(EMPRESAS_DEMO);
  const [activeId, setActiveId] = useState("emp-001");
  const [search, setSearch] = useState("");

  const filtered = empresas.filter(e =>
    !search || e.nome.toLowerCase().includes(search.toLowerCase()) || e.nif.includes(search)
  );

  const active = empresas.find(e => e.id === activeId)!;

  function switchEmpresa(id: string) {
    setActiveId(id);
    // In production: reload tenant context, update JWT
  }

  function openNew() {
    const winId = `empresa-nova-${crypto.randomUUID()}`;
    const localForm: Partial<Empresa> = { ...EMPTY_FORM };
    openWindow({
      id: winId,
      title: "Nova Empresa",
      icon: "🏢",
      content: <EmpresaForm
        editEmp={null}
        initialForm={localForm}
        onSave={(savedForm) => {
          if (!savedForm.nif || !savedForm.nome) return;
          const newEmp: Empresa = {
            ...EMPTY_FORM,
            ...savedForm,
            id: `emp-${Date.now()}`,
            activa: true,
            utilizadores: 1,
            ultimaSync: new Date().toISOString(),
          } as Empresa;
          setEmpresas(prev => [...prev, newEmp]);
          closeWindow(winId);
        }}
        onClose={() => closeWindow(winId)}
      />,
      x: 40, y: 20, width: 860, height: 600, minimized: false, maximized: false,
    });
  }

  function openEdit(e: Empresa) {
    const winId = `empresa-edit-${e.id}`;
    openWindow({
      id: winId,
      title: "Editar Empresa",
      icon: "🏢",
      content: <EmpresaForm
        editEmp={e}
        initialForm={{ ...e }}
        onSave={(savedForm) => {
          if (!savedForm.nif || !savedForm.nome) return;
          setEmpresas(prev => prev.map(x => x.id === e.id ? { ...x, ...savedForm } as Empresa : x));
          closeWindow(winId);
        }}
        onClose={() => closeWindow(winId)}
      />,
      x: 40, y: 20, width: 860, height: 600, minimized: false, maximized: false,
    });
  }

  function openDelete(e: Empresa) {
    const canDelete = empresas.length > 1;
    const winId = `empresa-delete-${e.id}`;
    openWindow({
      id: winId,
      title: "Confirmar eliminação",
      icon: "🗑️",
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 p-6">
            {canDelete ? (
              <>
                <p className="text-gray-700">Tem a certeza que pretende eliminar <strong>{e.nome}</strong>?</p>
                <p className="text-sm text-gray-500 mt-2">Esta acção não pode ser desfeita. Todos os dados associados serão removidos.</p>
              </>
            ) : (
              <>
                <p className="text-gray-700 font-semibold">Não é possível eliminar esta empresa.</p>
                <p className="text-sm text-gray-500 mt-2">Precisa de pelo menos uma empresa no sistema. Registe outra empresa antes de eliminar esta.</p>
              </>
            )}
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
            <button onClick={() => closeWindow(winId)} className="btn-secondary">Cancelar</button>
            {canDelete && (
              <button onClick={() => {
                setEmpresas(prev => prev.filter(x => x.id !== e.id));
                if (activeId === e.id) {
                  const remaining = empresas.filter(x => x.id !== e.id);
                  if (remaining.length > 0) setActiveId(remaining[0].id);
                }
                closeWindow(winId);
              }} className="btn-primary bg-red-600 hover:bg-red-700">Eliminar</button>
            )}
          </div>
        </div>
      ),
      x: 80, y: 80, width: 480, height: canDelete ? 220 : 200, minimized: false, maximized: false,
    });
  }

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2">
            <span>Gestão Multi-Empresa</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Multi-Tenant</span>
          </h1>
          <p className="text-sm text-ink-500 mt-0.5">
            {empresas.length} empresas registadas · empresa activa: <strong>{active.nomeCurto}</strong>
          </p>
        </div>
        <button onClick={openNew} className="btn-primary text-xs">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Empresa
        </button>
      </div>

      {/* Empresa activa — destaque */}
      <div className="card mb-6 p-5 border-l-4 border-l-brand-500">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {active.nomeCurto.slice(0,2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-ink-900">{active.nome}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">ACTIVA</span>
              </div>
              <p className="text-sm text-ink-500">NIF {active.nif} · {active.sede}</p>
              <p className="text-xs text-ink-400 mt-1">
                {TIPOS[active.tipo]} · {REGIMES[active.regime].label} · IVA {active.ivaTaxa}% · Moeda base: <strong>{active.moedaBase}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-ink-400">
              <p>AGT: <strong className="text-ink-700">{active.codigoAGT}</strong></p>
              <p>Agência: {active.agencia}</p>
              <p>Última sync: {new Date(active.ultimaSync).toLocaleString("pt-PT")}</p>
            </div>
            <button onClick={() => openEdit(active)} className="btn-secondary text-xs">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
          </div>
        </div>
      </div>

      {/* Barra de pesquisa */}
      <div className="card p-4 mb-4">
        <div className="relative max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input className="input pl-9 text-sm" placeholder="Pesquisar por nome ou NIF..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Lista de empresas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(emp => {
          const isActive = emp.id === activeId;
          const reg = REGIMES[emp.regime];
          return (
            <div key={emp.id} className={`card p-5 transition-all hover:shadow-md ${isActive ? "ring-2 ring-brand-500" : ""}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${isActive ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600"}`}>
                    {emp.nomeCurto.slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-ink-800 text-sm leading-tight">{emp.nomeCurto}</p>
                    <p className="text-xs text-ink-400">NIF {emp.nif}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {isActive && <span className="text-[10px] font-bold px-1.5 bg-brand-100 text-brand-700 rounded">ACTIVA</span>}
                  {!emp.activa && <span className="text-[10px] font-bold px-1.5 bg-ink-100 text-ink-500 rounded">INACTIVA</span>}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${reg.color}`}>{reg.label}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs text-ink-500 mb-4">
                <div className="flex justify-between">
                  <span>Tipo</span><span className="text-ink-700 font-medium">{TIPOS[emp.tipo].split("(")[0].trim()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sede</span><span className="text-ink-700">{emp.sede}</span>
                </div>
                <div className="flex justify-between">
                  <span>Moeda base</span><span className="font-bold text-aqua-600">{emp.moedaBase}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA</span><span className="text-ink-700">{emp.ivaTaxa}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Utilizadores</span><span className="text-ink-700">{emp.utilizadores}</span>
                </div>
                <div className="flex justify-between">
                  <span>AGT</span><span className="text-ink-700 font-mono text-[11px]">{emp.codigoAGT}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {!isActive && (
                  <button onClick={() => switchEmpresa(emp.id)} className="btn-primary flex-1 justify-center text-xs py-1.5">
                    Activar
                  </button>
                )}
                {isActive && (
                  <button className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-green-700 bg-green-100 rounded-lg cursor-default">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Empresa Activa
                  </button>
                )}
                <button onClick={() => openEdit(emp)} className="btn-secondary text-xs px-3 py-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => openDelete(emp)}
                  className="btn-ghost text-xs px-2 py-1.5"
                  title={empresas.length <= 1 ? "Precisa de pelo menos uma empresa" : "Eliminar empresa"}
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 rounded-xl border border-blue-200 bg-blue-50 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm">
          <p className="font-semibold text-blue-800">Isolamento total entre empresas</p>
          <p className="text-xs text-blue-600 mt-1">
            Cada empresa tem o seu próprio plano de contas PGCA, diários, razões, períodos fiscais, utilizadores e configurações AGT.
            Os dados nunca são partilhados entre empresas. A troca de empresa recarrega o contexto completo de autenticação.
          </p>
        </div>
      </div>

    </div>
  );
}

// ── Mappers AGT → Empresa ──────────────────────────────────────────────────────
function agtToTipo(c: AgtContribuinte): TipoEmpresa {
  switch (c.tipoContribuinte) {
    case "Entidade Pública":       return "publica";
    case "Pessoa Singular":        return "epu";
    case "Organismo Internacional":return "representacao";
    default:                       return c.nome.endsWith(" SA") ? "sa" : "limitada";
  }
}
function agtToRegime(c: AgtContribuinte): RegimeFiscal {
  switch (c.regimeFiscal) {
    case "Regime Simplificado": return "simplificado";
    case "Isento":
    case "Não Sujeito":         return "isento";
    default:                    return "geral";
  }
}

// ── EmpresaForm ────────────────────────────────────────────────────────────────
function EmpresaForm({
  editEmp,
  initialForm,
  onSave,
  onClose,
}: {
  editEmp: Empresa | null;
  initialForm: Partial<Empresa>;
  onSave: (form: Partial<Empresa>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<Empresa>>(initialForm);
  const [nifStatus, setNifStatus] = useState<"idle" | "loading" | "ok" | "erro" | "invalido">("idle");
  const [nifMsg, setNifMsg] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger lookup when NIF reaches 9–10 digits
  useEffect(() => {
    const nif = (form.nif ?? "").replace(/\s/g, "");
    if (nif.length < 9) { setNifStatus("idle"); setNifMsg(""); return; }
    if (!validarFormatoNif(nif)) { setNifStatus("invalido"); setNifMsg("Formato inválido — 9 ou 10 dígitos"); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setNifStatus("loading");
      setNifMsg("A consultar base AGT…");
      const res = await agtLookupNif(nif);
      if (!res.ok || !res.contribuinte) {
        setNifStatus("erro");
        setNifMsg(res.mensagem ?? "NIF não encontrado na AGT");
        return;
      }
      const c = res.contribuinte;
      const sede = [c.municipio, c.provincia].filter(Boolean).join(", ");
      setForm(prev => ({
        ...prev,
        nome:     prev.nome     || c.nome,
        nomeCurto:prev.nomeCurto|| c.nome.split(" ").slice(0, 3).join(" "),
        sede:     prev.sede     || sede,
        tipo:     agtToTipo(c),
        regime:   agtToRegime(c),
      }));
      const fonte = res.fonte === "agt_live" ? "AGT (live)" : "AGT (simulado)";
      setNifStatus("ok");
      setNifMsg(`${c.nome} · ${fonte} · ${c.estado}`);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.nif]);

  const nifBorder =
    nifStatus === "ok"      ? "ring-2 ring-green-400 border-green-400" :
    nifStatus === "erro"    ? "ring-2 ring-red-400 border-red-400" :
    nifStatus === "invalido"? "ring-2 ring-amber-400 border-amber-400" :
    nifStatus === "loading" ? "ring-2 ring-blue-300 border-blue-300" : "";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Secção: Identificação */}
        <div>
          <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">Identificação Fiscal</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">NIF *</label>
              <div className="relative">
                <input
                  className={`input font-mono pr-8 ${nifBorder}`}
                  value={form.nif || ""}
                  onChange={e => setForm({ ...form, nif: e.target.value })}
                  placeholder="5000000000"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm">
                  {nifStatus === "loading" && <span className="animate-spin inline-block">⏳</span>}
                  {nifStatus === "ok"      && <span className="text-green-500">✓</span>}
                  {nifStatus === "erro"    && <span className="text-red-500">✗</span>}
                  {nifStatus === "invalido"&& <span className="text-amber-500">!</span>}
                </span>
              </div>
              {nifMsg && (
                <p className={`text-[11px] mt-1 ${
                  nifStatus === "ok"       ? "text-green-600" :
                  nifStatus === "loading"  ? "text-blue-500" :
                  nifStatus === "invalido" ? "text-amber-600" : "text-red-500"
                }`}>
                  {nifMsg}
                </p>
              )}
            </div>
            <div>
              <label className="label">Tipo de Empresa *</label>
              <select className="input" value={form.tipo || "limitada"} onChange={e => setForm({ ...form, tipo: e.target.value as TipoEmpresa })}>
                {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Denominação Social *</label>
              <input className="input" value={form.nome || ""} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo conforme certidão comercial" />
            </div>
            <div>
              <label className="label">Nome Curto (exibição)</label>
              <input className="input" value={form.nomeCurto || ""} onChange={e => setForm({ ...form, nomeCurto: e.target.value })} placeholder="Lda. / SA / EPU" />
            </div>
            <div>
              <label className="label">Sede</label>
              <input className="input" value={form.sede || ""} onChange={e => setForm({ ...form, sede: e.target.value })} placeholder="Cidade, Município" />
            </div>
          </div>
        </div>

        {/* Secção: Fiscal */}
        <div>
          <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">Configuração Fiscal</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Regime Fiscal</label>
              <select className="input" value={form.regime || "geral"} onChange={e => setForm({ ...form, regime: e.target.value as RegimeFiscal })}>
                <option value="geral">Regime Geral (II)</option>
                <option value="simplificado">Regime Simplificado</option>
                <option value="isento">Isento</option>
              </select>
            </div>
            <div>
              <label className="label">Taxa IVA Base (%)</label>
              <select className="input" value={form.ivaTaxa || 14} onChange={e => setForm({ ...form, ivaTaxa: +e.target.value })}>
                <option value={14}>14% — Taxa Normal</option>
                <option value={7}>7% — Taxa Reduzida</option>
                <option value={5}>5% — Taxa Mínima</option>
                <option value={0}>0% — Isento / Exportação</option>
              </select>
            </div>
            <div>
              <label className="label">Moeda Base</label>
              <select className="input" value={form.moedaBase || "Kz"} onChange={e => setForm({ ...form, moedaBase: e.target.value })}>
                <option value="Kz">AOA — Kwanza Angolano</option>
                <option value="USD">USD — Dólar Americano</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — Libra Esterlina</option>
              </select>
            </div>
            <div>
              <label className="label">Início Ano Fiscal</label>
              <select className="input" value={form.mesInicioFiscal || 1} onChange={e => setForm({ ...form, mesInicioFiscal: +e.target.value })}>
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Agência AGT</label>
              <input className="input" value={form.agencia || ""} onChange={e => setForm({ ...form, agencia: e.target.value })} placeholder="Luanda Urbano" />
            </div>
            <div>
              <label className="label">Código AGT</label>
              <input className="input font-mono" value={form.codigoAGT || ""} onChange={e => setForm({ ...form, codigoAGT: e.target.value })} placeholder="AGT-LU-000000" />
            </div>
          </div>
        </div>

        {/* Secção: Contactos */}
        <div>
          <p className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">Contactos</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="geral@empresa.ao" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.telefone || ""} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="+244 222 000 000" />
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={!form.nif || !form.nome} className="btn-primary">
          {editEmp ? "Guardar Alterações" : "Registar Empresa"}
        </button>
      </div>
    </div>
  );
}
