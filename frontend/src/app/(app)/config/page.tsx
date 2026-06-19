"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/Topbar";

const DEFAULT_CONFIG = {
  nome: "Empresa Demo Lda.",
  nif: "5417283901",
  morada: "Rua da Missão, 42, Luanda",
  email: "contabilidade@empresademo.ao",
  telefone: "+244 923 456 789",
  tipo: "Sociedade por Quotas",
  norma: "PGCA Angola (Decreto n.º 82/01)",
  moeda: "AOA — Kwanza Angolano",
  ano: "2024",
};

type ConfigState = typeof DEFAULT_CONFIG;

const LS_KEY = "educontas-config";

export default function ConfigPage() {
  const [empresa, setEmpresa] = useState<ConfigState>(DEFAULT_CONFIG);
  const [saved, setSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ConfigState>;
        setEmpresa(prev => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore */ }
  }, []);

  function handleSave() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(empresa));
    } catch { /* ignore */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 3000);
      return;
    }
    setEmpresa(DEFAULT_CONFIG);
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    setResetConfirm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <Topbar
        title="Configurações"
        subtitle="Empresa, normas contabilísticas e preferências do sistema"
        actions={
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-sm text-green-700 font-medium bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                ✓ Configurações guardadas
              </span>
            )}
            <button
              className={`btn-secondary text-sm ${resetConfirm ? "bg-red-100 border-red-300 text-red-700 hover:bg-red-200" : ""}`}
              onClick={handleReset}
            >
              {resetConfirm ? "Confirmar restauro?" : "Restaurar predefinições"}
            </button>
            <button className="btn-primary" onClick={handleSave}>
              {saved ? "✓ Guardado" : "Guardar Configurações"}
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Dados da Empresa */}
        <div className="card">
          <div className="card-header"><h3>Dados da Empresa</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nome da Empresa</label>
                <input className="input" value={empresa.nome} onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })} />
              </div>
              <div>
                <label className="label">NIF (Nº Identificação Fiscal)</label>
                <input className="input font-mono" value={empresa.nif} onChange={(e) => setEmpresa({ ...empresa, nif: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Morada</label>
                <input className="input" value={empresa.morada} onChange={(e) => setEmpresa({ ...empresa, morada: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={empresa.email} onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input" value={empresa.telefone} onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })} />
              </div>
              <div>
                <label className="label">Tipo de Entidade</label>
                <select className="input" value={empresa.tipo} onChange={(e) => setEmpresa({ ...empresa, tipo: e.target.value })}>
                  <option>Sociedade por Quotas</option>
                  <option>Sociedade Anónima</option>
                  <option>Empresa Pública</option>
                  <option>Cooperativa</option>
                  <option>ONG / Associação</option>
                  <option>Instituição de Ensino</option>
                  <option>Unidade Hospitalar</option>
                </select>
              </div>
              <div>
                <label className="label">Exercício Fiscal</label>
                <input className="input" value={empresa.ano} onChange={(e) => setEmpresa({ ...empresa, ano: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        {/* Normas Contabilísticas */}
        <div className="card">
          <div className="card-header"><h3>Normas e Plano de Contas</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Norma Contabilística</label>
                <select className="input" value={empresa.norma} onChange={(e) => setEmpresa({ ...empresa, norma: e.target.value })}>
                  <option>PGCA Angola (Decreto n.º 82/01)</option>
                  <option>IFRS (International Financial Reporting Standards)</option>
                  <option>IFRS para PME</option>
                  <option>SNCRF (em implementação)</option>
                </select>
              </div>
              <div>
                <label className="label">Moeda Base</label>
                <select className="input" value={empresa.moeda} onChange={(e) => setEmpresa({ ...empresa, moeda: e.target.value })}>
                  <option>AOA — Kwanza Angolano</option>
                  <option>USD — Dólar Americano</option>
                  <option>EUR — Euro</option>
                </select>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <span className="font-semibold">Regra LIFO:</span> O método LIFO é proibido por esta norma. Apenas CMP e FIFO estão disponíveis para valorização de inventário.
            </div>
          </div>
        </div>

        {/* Taxas Fiscais */}
        <div className="card">
          <div className="card-header">
            <h3>Parâmetros Fiscais</h3>
            <p className="text-xs text-gray-500 mt-0.5">Taxas configuradas conforme legislação vigente · Angola 2024</p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { label: "IVA Geral",          value: "14%",  desc: "CIVA Art.22" },
                { label: "IVA Reduzido",        value: "7%",   desc: "Bens essenciais" },
                { label: "Imp. Industrial",    value: "25%",  desc: "Regime Geral" },
                { label: "Imp. Industrial PME",value: "15%",  desc: "Regime Simplif." },
                { label: "SS Trabalhador",      value: "3%",   desc: "Sobre salário" },
                { label: "SS Patronal",         value: "8%",   desc: "Encargo empresa" },
              ].map((t) => (
                <div key={t.label} className="border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">{t.label}</p>
                  <p className="text-xl font-bold text-brand-700 mt-1">{t.value}</p>
                  <p className="text-[10px] text-gray-400">{t.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">As taxas são parametrizadas pelo administrador do sistema. Alterações requerem confirmação e ficam registadas na trilha de auditoria.</p>
          </div>
        </div>

        {/* Utilizadores e Permissões */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3>Utilizadores e Perfis de Acesso</h3>
            <button className="btn-secondary text-xs py-1.5">Gerir Utilizadores</button>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { perfil: "ADMIN",             desc: "Acesso total ao sistema", cor: "text-red-700 bg-red-50" },
                { perfil: "GESTOR FINANCEIRO", desc: "Relatórios e aprovações",  cor: "text-brand-700 bg-brand-50" },
                { perfil: "CONTABILISTA",      desc: "Lançamentos e fechos",    cor: "text-blue-700 bg-blue-50" },
                { perfil: "AUDITOR",           desc: "Leitura total + export",  cor: "text-purple-700 bg-purple-50" },
                { perfil: "COMERCIAL",         desc: "Vendas e clientes",       cor: "text-green-700 bg-green-50" },
                { perfil: "RH",                desc: "Pessoal e salários",      cor: "text-orange-700 bg-orange-50" },
                { perfil: "OPERADOR",          desc: "Entrada de dados",        cor: "text-gray-700 bg-gray-50" },
                { perfil: "READONLY",          desc: "Apenas leitura",          cor: "text-gray-500 bg-gray-50" },
              ].map((p) => (
                <div key={p.perfil} className={`rounded-lg p-3 ${p.cor}`}>
                  <p className="text-xs font-bold uppercase tracking-wide">{p.perfil}</p>
                  <p className="text-xs mt-0.5 opacity-80">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save footer */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">As alterações são guardadas localmente no browser.</p>
          <div className="flex items-center gap-2">
            <button
              className={`btn-secondary text-sm ${resetConfirm ? "bg-red-100 border-red-300 text-red-700 hover:bg-red-200" : ""}`}
              onClick={handleReset}
            >
              {resetConfirm ? "Confirmar restauro?" : "Restaurar predefinições"}
            </button>
            <button className="btn-primary" onClick={handleSave}>
              {saved ? "✓ Guardado" : "Guardar Configurações"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
