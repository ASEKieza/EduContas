"use client";

import { useState } from "react";

interface Cliente {
  id: string; nome: string; nif: string; email: string; telefone: string;
  morada: string; pais: string; limiteCredito: number; condicoes: string;
}

interface Props {
  onSaved?: (c: Cliente) => void;
  onClose?: () => void;
}

export default function QuickNovoCliente({ onSaved, onClose }: Props) {
  const [nome, setNome] = useState("");
  const [nif, setNif] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [morada, setMorada] = useState("");
  const [pais, setPais] = useState("Angola");
  const [limiteCredito, setLimiteCredito] = useState("");
  const [condicoes, setCondicoes] = useState("30 dias");
  const [saved, setSaved] = useState<Cliente | null>(null);

  const valid = nome.trim().length >= 2;

  function handleSave() {
    if (!valid) return;
    const c: Cliente = {
      id: crypto.randomUUID(), nome: nome.trim(), nif: nif.trim(),
      email: email.trim(), telefone: telefone.trim(), morada: morada.trim(),
      pais, limiteCredito: parseFloat(limiteCredito) || 0, condicoes,
    };
    try {
      const raw = localStorage.getItem("educontas-clientes") ?? "[]";
      const arr: Cliente[] = JSON.parse(raw);
      arr.unshift(c);
      localStorage.setItem("educontas-clientes", JSON.stringify(arr));
    } catch { /* ignore */ }
    setSaved(c);
    onSaved?.(c);
  }

  if (saved) {
    return (
      <div className="p-6 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900">Cliente criado</p>
          <p className="text-xs text-gray-500 mt-1">{saved.nome}</p>
        </div>
        <button className="btn-secondary text-xs" onClick={onClose}>Fechar</button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <p className="text-xs text-gray-500">Criar um novo cliente sem sair do módulo actual.</p>
      <div>
        <label className="label">Nome / Empresa *</label>
        <input className="input" placeholder="Nome do cliente" value={nome} onChange={e => setNome(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">NIF</label>
          <input className="input font-mono" placeholder="000000000" value={nif} onChange={e => setNif(e.target.value)} />
        </div>
        <div>
          <label className="label">País</label>
          <input className="input" value={pais} onChange={e => setPais(e.target.value)} />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input type="email" className="input" placeholder="email@cliente.ao" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" placeholder="+244 9XX XXX XXX" value={telefone} onChange={e => setTelefone(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Morada</label>
        <input className="input" value={morada} onChange={e => setMorada(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Limite de Crédito (Kz)</label>
          <input type="number" min={0} className="input" placeholder="0" value={limiteCredito} onChange={e => setLimiteCredito(e.target.value)} />
        </div>
        <div>
          <label className="label">Condições de Pagamento</label>
          <select className="input" value={condicoes} onChange={e => setCondicoes(e.target.value)}>
            {["Pronto pagamento","7 dias","15 dias","30 dias","45 dias","60 dias","90 dias"].map(c =>
              <option key={c}>{c}</option>
            )}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        {onClose && <button className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>}
        <button disabled={!valid} className="btn-primary flex-1" onClick={handleSave}>
          Criar Cliente
        </button>
      </div>
    </div>
  );
}
