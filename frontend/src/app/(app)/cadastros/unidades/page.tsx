"use client";

import { useState } from "react";
import { useWindowManager } from "@/lib/windowManager";

type GrupoUnidade = "quantidade" | "comprimento" | "area" | "volume" | "massa" | "tempo" | "temperatura" | "digital" | "outro";

interface UnidadeMedida {
  id: string;
  codigo: string;
  descricao: string;
  simbolo: string;
  grupo: GrupoUnidade;
  unidadeBase?: string;
  fatorConversao?: number;
  activa: boolean;
}

const UNIDADES_DEMO: UnidadeMedida[] = [
  // Quantidade
  { id: "1",  codigo: "UN",  descricao: "Unidade",              simbolo: "un",   grupo: "quantidade",   activa: true },
  { id: "2",  codigo: "CX",  descricao: "Caixa",                simbolo: "cx",   grupo: "quantidade",   activa: true },
  { id: "3",  codigo: "PAL", descricao: "Palete",               simbolo: "pal",  grupo: "quantidade",   activa: true },
  { id: "4",  codigo: "DZ",  descricao: "Dúzia",                simbolo: "dz",   grupo: "quantidade",   fatorConversao: 12, unidadeBase: "UN", activa: true },
  { id: "5",  codigo: "PAR", descricao: "Par",                  simbolo: "par",  grupo: "quantidade",   fatorConversao: 2,  unidadeBase: "UN", activa: true },
  // Comprimento
  { id: "6",  codigo: "M",   descricao: "Metro",                simbolo: "m",    grupo: "comprimento",  activa: true },
  { id: "7",  codigo: "CM",  descricao: "Centímetro",           simbolo: "cm",   grupo: "comprimento",  fatorConversao: 0.01, unidadeBase: "M", activa: true },
  { id: "8",  codigo: "MM",  descricao: "Milímetro",            simbolo: "mm",   grupo: "comprimento",  fatorConversao: 0.001, unidadeBase: "M", activa: true },
  { id: "9",  codigo: "KM",  descricao: "Quilómetro",           simbolo: "km",   grupo: "comprimento",  fatorConversao: 1000, unidadeBase: "M", activa: true },
  { id: "10", codigo: "FT",  descricao: "Pé (foot)",            simbolo: "ft",   grupo: "comprimento",  fatorConversao: 0.3048, unidadeBase: "M", activa: false },
  // Área
  { id: "11", codigo: "M2",  descricao: "Metro Quadrado",       simbolo: "m²",   grupo: "area",         activa: true },
  { id: "12", codigo: "CM2", descricao: "Centímetro Quadrado",  simbolo: "cm²",  grupo: "area",         activa: false },
  // Volume
  { id: "13", codigo: "M3",  descricao: "Metro Cúbico",         simbolo: "m³",   grupo: "volume",       activa: true },
  { id: "14", codigo: "LT",  descricao: "Litro",                simbolo: "L",    grupo: "volume",       fatorConversao: 0.001, unidadeBase: "M3", activa: true },
  { id: "15", codigo: "ML",  descricao: "Mililitro",            simbolo: "mL",   grupo: "volume",       fatorConversao: 0.000001, unidadeBase: "M3", activa: false },
  // Massa
  { id: "16", codigo: "KG",  descricao: "Quilograma",           simbolo: "kg",   grupo: "massa",        activa: true },
  { id: "17", codigo: "G",   descricao: "Grama",                simbolo: "g",    grupo: "massa",        fatorConversao: 0.001, unidadeBase: "KG", activa: false },
  { id: "18", codigo: "TON", descricao: "Tonelada",             simbolo: "t",    grupo: "massa",        fatorConversao: 1000, unidadeBase: "KG", activa: true },
  { id: "19", codigo: "LB",  descricao: "Libra (pound)",        simbolo: "lb",   grupo: "massa",        fatorConversao: 0.4536, unidadeBase: "KG", activa: false },
  // Tempo
  { id: "20", codigo: "HR",  descricao: "Hora",                 simbolo: "h",    grupo: "tempo",        activa: true },
  { id: "21", codigo: "MIN", descricao: "Minuto",               simbolo: "min",  grupo: "tempo",        fatorConversao: 1/60, unidadeBase: "HR", activa: false },
  { id: "22", codigo: "DIA", descricao: "Dia",                  simbolo: "dia",  grupo: "tempo",        fatorConversao: 24, unidadeBase: "HR", activa: true },
  { id: "23", codigo: "MES", descricao: "Mês",                  simbolo: "mês",  grupo: "tempo",        activa: true },
  { id: "24", codigo: "ANO", descricao: "Ano",                  simbolo: "ano",  grupo: "tempo",        activa: true },
  // Serviços
  { id: "25", codigo: "SV",  descricao: "Serviço",              simbolo: "sv",   grupo: "outro",        activa: true },
  { id: "26", codigo: "VG",  descricao: "Verba Global",         simbolo: "vg",   grupo: "outro",        activa: true },
  { id: "27", codigo: "KWH", descricao: "Quilowatt-hora",       simbolo: "kWh",  grupo: "digital",      activa: true },
  { id: "28", codigo: "MB",  descricao: "Megabyte",             simbolo: "MB",   grupo: "digital",      activa: false },
  { id: "29", codigo: "GB",  descricao: "Gigabyte",             simbolo: "GB",   grupo: "digital",      activa: true },
];

const GRUPO_LABEL: Record<GrupoUnidade, string> = {
  quantidade: "Quantidade", comprimento: "Comprimento", area: "Área", volume: "Volume",
  massa: "Massa / Peso", tempo: "Tempo", temperatura: "Temperatura", digital: "Digital/Energia", outro: "Outro / Serviços",
};
const GRUPO_COLOR: Record<GrupoUnidade, string> = {
  quantidade: "#3b82f6", comprimento: "#10b981", area: "#06b6d4", volume: "#0ea5e9",
  massa: "#8b5cf6", tempo: "#f59e0b", temperatura: "#ef4444", digital: "#6b7280", outro: "#64748b",
};

const BLANK: Partial<UnidadeMedida> = { grupo: "quantidade", activa: true };

function UnidadeFormWindow({
  initialForm, isEdit, lista, onSave, onClose,
}: {
  initialForm: Partial<UnidadeMedida>; isEdit: boolean; lista: UnidadeMedida[];
  onSave: (data: Partial<UnidadeMedida>) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<UnidadeMedida>>(initialForm);
  const grupos = Object.keys(GRUPO_LABEL) as GrupoUnidade[];
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Código *" value={form.codigo || ""} onChange={v => setForm(f => ({ ...f, codigo: v.toUpperCase() }))} />
          <Field label="Símbolo" value={form.simbolo || ""} onChange={v => setForm(f => ({ ...f, simbolo: v }))} />
          <div className="col-span-2"><Field label="Descrição *" value={form.descricao || ""} onChange={v => setForm(f => ({ ...f, descricao: v }))} /></div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-ink-600 mb-1">Grupo</label>
            <select value={form.grupo || "quantidade"} onChange={e => setForm(f => ({ ...f, grupo: e.target.value as GrupoUnidade }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
              {grupos.map(g => <option key={g} value={g}>{GRUPO_LABEL[g]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">Unidade Base</label>
            <select value={form.unidadeBase || ""} onChange={e => setForm(f => ({ ...f, unidadeBase: e.target.value || undefined }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none focus:border-brand-400">
              <option value="">— Nenhuma (é base) —</option>
              {lista.filter(u => u.activa && u.codigo !== form.codigo).map(u =>
                <option key={u.id} value={u.codigo}>{u.codigo} — {u.descricao}</option>)}
            </select>
          </div>
          <Field label="Factor de Conversão" value={String(form.fatorConversao ?? "")} onChange={v => setForm(f => ({ ...f, fatorConversao: Number(v) || undefined }))} type="number" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.activa ?? true} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))} className="rounded text-brand-600" />
          <span className="text-sm text-ink-700">Unidade activa</span>
        </label>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50">Cancelar</button>
        <button onClick={() => onSave(form)} className="px-5 py-2.5 text-sm font-semibold rounded-lg text-white" style={{ background: "#CC0000" }}>
          {isEdit ? "Guardar" : "Criar Unidade"}
        </button>
      </div>
    </div>
  );
}

export default function UnidadesPage() {
  const { openWindow, closeWindow } = useWindowManager();
  const [lista, setLista] = useState<UnidadeMedida[]>(UNIDADES_DEMO);
  const [filterGrupo, setFilterGrupo] = useState<string>("todos");
  const [filterActiva, setFilterActiva] = useState<string>("activas");

  const filtered = lista.filter(u => {
    if (filterGrupo !== "todos" && u.grupo !== filterGrupo) return false;
    if (filterActiva === "activas" && !u.activa) return false;
    if (filterActiva === "inactivas" && u.activa) return false;
    return true;
  });

  function openCriar() {
    const winId = `criar-${crypto.randomUUID()}`;
    openWindow({
      id: winId, title: "Nova Unidade", icon: "📐",
      content: (
        <UnidadeFormWindow
          initialForm={{ ...BLANK }}
          isEdit={false}
          lista={lista}
          onSave={(data) => {
            if (!data.codigo || !data.descricao) return;
            setLista(l => [...l, {
              id: String(l.length + 1), codigo: data.codigo!, descricao: data.descricao!,
              simbolo: data.simbolo || data.codigo!.toLowerCase(),
              grupo: data.grupo as GrupoUnidade || "quantidade",
              unidadeBase: data.unidadeBase, fatorConversao: data.fatorConversao,
              activa: data.activa ?? true,
            }]);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 40, y: 20, width: 560, height: 360, minimized: false, maximized: false,
    });
  }
  function openEditar(u: UnidadeMedida) {
    const winId = `editar-${u.id}`;
    openWindow({
      id: winId, title: `Editar Unidade — ${u.descricao}`, icon: "📐",
      content: (
        <UnidadeFormWindow
          initialForm={{ ...u }}
          isEdit={true}
          lista={lista}
          onSave={(data) => {
            if (!data.codigo || !data.descricao) return;
            setLista(l => l.map(x => x.id === u.id ? { ...x, ...data } as UnidadeMedida : x));
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
      x: 60, y: 40, width: 560, height: 360, minimized: false, maximized: false,
    });
  }

  // Group active units by grupo
  const grupos = Object.keys(GRUPO_LABEL) as GrupoUnidade[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Unidades de Medida</h1>
          <p className="text-sm text-ink-500 mt-0.5">Tabela de unidades de medida para artigos e serviços</p>
        </div>
        <button onClick={openCriar}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#CC0000" }}>
          <span className="text-lg leading-none">+</span> Nova Unidade
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
          <p className="text-xs text-ink-500">Unidades Activas</p>
          <p className="text-2xl font-bold text-ink-900 mt-1">{lista.filter(u => u.activa).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
          <p className="text-xs text-ink-500">Total de Unidades</p>
          <p className="text-2xl font-bold text-ink-900 mt-1">{lista.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-ink-100 shadow-sm p-4">
          <p className="text-xs text-ink-500">Grupos</p>
          <p className="text-2xl font-bold text-ink-900 mt-1">{grupos.filter(g => lista.some(u => u.grupo === g && u.activa)).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterGrupo} onChange={e => setFilterGrupo(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none">
          <option value="todos">Todos os grupos</option>
          {grupos.map(g => <option key={g} value={g}>{GRUPO_LABEL[g]}</option>)}
        </select>
        <select value={filterActiva} onChange={e => setFilterActiva(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-ink-200 bg-white focus:outline-none">
          <option value="todas">Todas</option>
          <option value="activas">Activas</option>
          <option value="inactivas">Inactivas</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-ink-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50">
              {["Código","Descrição","Símbolo","Grupo","Unidade Base","Factor Conversão","Estado",""].map(h =>
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase tracking-wide">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className={`border-b border-ink-50 hover:bg-ink-50 ${!u.activa ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-mono font-bold text-ink-700 text-xs">{u.codigo}</td>
                <td className="px-4 py-3 font-medium text-ink-900">{u.descricao}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-600">{u.simbolo}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                    style={{ background: GRUPO_COLOR[u.grupo] }}>
                    {GRUPO_LABEL[u.grupo]}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-600 text-xs">{u.unidadeBase || "—"}</td>
                <td className="px-4 py-3 text-ink-600 text-xs">
                  {u.fatorConversao !== undefined ? u.fatorConversao.toString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${u.activa ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-500"}`}>
                    {u.activa ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => openEditar(u)} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Editar</button>
                  <button onClick={() => setLista(l => l.map(x => x.id === u.id ? { ...x, activa: !x.activa } : x))}
                    className="text-xs text-ink-400 hover:text-ink-600 font-medium">
                    {u.activa ? "Inactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-400">Nenhuma unidade encontrada.</td></tr>
            )}
          </tbody>
        </table>
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
