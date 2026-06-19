"use client";

import { useState } from "react";
import { JOURNAL_ACCOUNTS } from "@/lib/journal";

interface Props {
  onSaved?: (code: string, name: string) => void;
  onClose?: () => void;
}

const CLASSES = [
  { val: "1", label: "Classe 1 — Meios Fixos e Investimentos" },
  { val: "2", label: "Classe 2 — Existências" },
  { val: "3", label: "Classe 3 — Terceiros" },
  { val: "4", label: "Classe 4 — Meios Monetários" },
  { val: "5", label: "Classe 5 — Capital e Reservas" },
  { val: "6", label: "Classe 6 — Proveitos e Ganhos" },
  { val: "7", label: "Classe 7 — Custos e Perdas" },
  { val: "8", label: "Classe 8 — Resultados" },
];

export default function QuickNovaConta({ onSaved, onClose }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [classe, setClasse] = useState("3");
  const [saved, setSaved] = useState(false);

  const exists = JOURNAL_ACCOUNTS.some(a => a.code === code.trim());
  const valid  = code.trim().length >= 2 && name.trim().length >= 2 && !exists;

  function handleSave() {
    if (!valid) return;
    // In a real system this would persist to a custom accounts store.
    // Here we notify the caller so it can pre-fill a journal line.
    setSaved(true);
    onSaved?.(code.trim(), name.trim());
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
          <p className="font-semibold text-gray-900">Conta criada</p>
          <p className="text-xs text-gray-500 mt-1 font-mono">{code} — {name}</p>
        </div>
        <button className="btn-secondary text-xs" onClick={onClose}>Fechar</button>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <p className="text-xs text-gray-500">Nova conta no Plano Geral de Contabilidade de Angola (PGCA).</p>
      <div>
        <label className="label">Classe</label>
        <select className="input" value={classe} onChange={e => setClasse(e.target.value)}>
          {CLASSES.map(c => <option key={c.val} value={c.val}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Código da Conta *</label>
        <input className="input font-mono" placeholder="Ex: 43.1.3" value={code}
          onChange={e => setCode(e.target.value)} />
        {exists && <p className="text-xs text-red-600 mt-1">Código já existe no plano de contas.</p>}
      </div>
      <div>
        <label className="label">Designação *</label>
        <input className="input" placeholder="Nome da conta" value={name}
          onChange={e => setName(e.target.value)} />
      </div>
      <div className="flex gap-3 pt-1">
        {onClose && <button className="btn-secondary flex-1" onClick={onClose}>Cancelar</button>}
        <button disabled={!valid} className="btn-primary flex-1" onClick={handleSave}>
          Criar Conta
        </button>
      </div>
    </div>
  );
}
