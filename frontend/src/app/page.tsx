"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const DEMO_USERS = [
  { email: "admin@educontas.ao",   password: "Admin2026",  role: "Administrador",     empresa: "EduContas Demo Lda." },
  { email: "contabilista@demo.ao", password: "Contab2026", role: "Contabilista",      empresa: "EduContas Demo Lda." },
  { email: "gestor@demo.ao",       password: "Gestor2026", role: "Gestor Financeiro", empresa: "EduContas Demo Lda." },
];

const FEATURES = [
  "PGCA Angola — Decreto n.º 82/01",
  "AGT e-Factura e Guias de Remessa",
  "IFRS · IFRS para PME · SNCRF",
  "IVA · IRT · IRPC · Segurança Social",
  "Reconciliação bancária e Tesouraria",
  "Recursos Humanos e Folha de Salários",
];

const BADGES = ["PGCA", "IFRS", "AGT", "IVA", "IRT", "ISO 27001"];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showCreds, setShowCreds] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 650));
    if (email && password) {
      router.push("/dashboard");
    } else {
      setError("Preencha o email e a palavra-passe.");
      setLoading(false);
    }
  }

  function fillCred(u: typeof DEMO_USERS[number]) {
    setEmail(u.email);
    setPassword(u.password);
    setShowCreds(false);
    setError("");
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo — Marca ───────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] shrink-0 flex-col px-10 py-12"
        style={{ background: "#1a2744" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-14">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
            <Image src="/logo-ase.png" alt="EduContas" width={40} height={40} className="object-contain" priority />
          </div>
          <div>
            <p className="text-white font-bold text-[15px] leading-tight">EduContas ERP</p>
            <p className="text-[11px]" style={{ color: "#93b4d8" }}>Sistema de Gestão Empresarial</p>
          </div>
        </div>

        {/* Headline */}
        <div className="flex-1">
          <h1 className="text-[28px] font-bold text-white leading-snug mb-4">
            Gestão Empresarial<br />Conforme com Angola
          </h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: "#b8cfe8" }}>
            Plataforma integrada de contabilidade, fiscalidade e gestão financeira,
            desenvolvida para cumprir integralmente a legislação angolana.
          </p>

          <ul className="space-y-4">
            {FEATURES.map(f => (
              <li key={f} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: "rgba(99,155,210,0.18)", color: "#7eb8e8" }}>✓</span>
                <span className="text-sm" style={{ color: "#c8ddf0" }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Conformidade */}
        <div className="pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: "#6a96c0" }}>
            Conformidade
          </p>
          <div className="flex flex-wrap gap-2">
            {BADGES.map(b => (
              <span key={b}
                className="text-[11px] font-semibold px-2.5 py-1 rounded"
                style={{ border: "1px solid rgba(255,255,255,0.14)", color: "#a8c8e8" }}>
                {b}
              </span>
            ))}
          </div>
          <p className="text-[11px] mt-6" style={{ color: "rgba(255,255,255,0.28)" }}>
            © 2026 EduContas ERP · ASE · Angola
          </p>
        </div>
      </div>

      {/* ── Painel direito — Formulário ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">

        {/* Logo mobile */}
        <div className="lg:hidden mb-8 text-center">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg overflow-hidden" style={{ background: "#1a2744" }}>
              <Image src="/logo-ase.png" alt="EduContas" width={36} height={36} className="object-contain w-full h-full" />
            </div>
            <span className="text-lg font-bold text-ink-900">EduContas ERP</span>
          </div>
        </div>

        <div className="w-full max-w-[380px]">

          <div className="mb-8">
            <h2 className="text-[22px] font-bold text-ink-900">Iniciar sessão</h2>
            <p className="text-sm text-ink-500 mt-1">Introduza as suas credenciais de acesso</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">Endereço de Email</label>
              <input
                type="email"
                className="input"
                placeholder="utilizador@empresa.ao"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="label">Palavra-passe</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-lg border border-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  A autenticar…
                </>
              ) : "Entrar"}
            </button>
          </form>

          {/* Credenciais demo */}
          <div className="mt-6 pt-5" style={{ borderTop: "1px solid #ecedef" }}>
            <button
              type="button"
              onClick={() => setShowCreds(p => !p)}
              className="w-full flex items-center justify-between text-xs text-ink-500 hover:text-ink-700 transition-colors font-medium"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Credenciais de demonstração
              </span>
              <svg className={`w-3.5 h-3.5 transition-transform ${showCreds ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCreds && (
              <div className="mt-3 space-y-2">
                {DEMO_USERS.map(u => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => fillCred(u)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-ink-100 hover:border-ink-300 hover:bg-ink-50 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-800 truncate">{u.email}</p>
                        <p className="text-[11px] text-ink-400 mt-0.5">{u.role} · {u.empresa}</p>
                      </div>
                      <span className="text-[11px] font-mono text-ink-400 shrink-0">{u.password}</span>
                    </div>
                  </button>
                ))}
                <p className="text-[11px] text-ink-400 text-center pt-1">Ambiente de demonstração</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
