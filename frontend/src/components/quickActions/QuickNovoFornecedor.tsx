"use client";

import { useState } from "react";

interface Fornecedor {
  id: string; nome: string; nif: string; email: string; telefone: string;
  morada: string; pais: string; condicoes: string;
}

interface Props {
  onSaved?: (f: Fornecedor) => void;
  onClose?: () => void;
}

export default function QuickNovoFornecedor({ onSaved, onClose }: Props) {
  const [nome, setNome] = useState("");
  const [nif, setNif] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [morada, setMorada] = useState("");
  const [pais, setPais] = useState("Angola");
  const [condicoes, setCondicoes] = useState("30 dias");
  const [saved, setSaved] = useState<Fornecedor | null>(null);

  const valid = nome.trim().length >= 2;

  function handleSave() {
    if (!valid) return;
    const f: Fornecedor = {
      id: crypto.randomUUID(), nome: nome.trim(), nif: nif.trim(),
      email: email.trim(), telefone: telefone.trim(), morada: morada.trim(),
      pais, condicoes,
    };
    // Persist to shared key
    try {
      const raw = localStorage.getItem("educontas-fornecedores") ?? "[]";
      const arr: Fornecedor[] = JSON.parse(raw);
      arr.unshift(f);
      localStorage.setItem("educontas-fornecedores", JSON.stringify(arr));
    } catch { /* ignore */ }
    setSaved(f);
    onSaved?.(f);
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
          <p className="font-semibold text-gray-900">Fornecedor criado</p>
          <p className="text-xs text-gray-500 mt-1">{saved.nome}</p>
          {saved.nif && <p className="text-xs text-gray-400 font-mono">NIF: {saved.nif}</p>}
        </div>
        <button className="btn-secondary text-xs" onClick={onClose}>Fechar</button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <p className="text-xs text-gray-500">Criar um novo fornecedor directamente a partir desta janela.</p>
      <div>
        <label className="label">Nome / Empresa *</label>
        <input className="input" placeholder="Nome do fornecedor" value={nome} onChange={e => setNome(e.target.value)} />
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
          <input type="email" className="input" placeholder="email@empresa.ao" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Telefone</label>
          <input className="input" placeholder="+244 9XX XXX XXX" value={telefone} onChange={e => setTelefone(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Morada</label>
        <input className="input" placeholder="Endereço" value={morada} onChange={e => setMorada(e.target.value)} />
      </div>
      <div>
        <label className="label">Condições de Pagamento</label>
        <select className="input" value={condicoes} onChange={e => setCondicoes(e.target.value)}>
          {["Pronto pagamento","7 dias","15 dias","30 dias","45 dias","60 dias","90 dias"].map(c =>
            <option key={c}>{c}</option>
          )}
        </select>
      </div>
      <div className="flex gap-3 pt-1">
        {onClose && <button className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>}
        <button disabled={!valid} className="btn-primary flex-1" onClick={handleSave}>
          Criar Fornecedor
        </button>
      </div>
    </div>
  );
}
