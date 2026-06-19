"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const AUTH_ERRORS: Record<string, string> = {
  "auth/user-not-found":      "Email não encontrado.",
  "auth/wrong-password":      "Senha incorrecta.",
  "auth/invalid-credential":  "Email ou senha incorrectos.",
  "auth/email-already-in-use":"Email já está em uso.",
  "auth/weak-password":       "Senha fraca. Mínimo 6 caracteres.",
  "auth/invalid-email":       "Email inválido.",
  "auth/too-many-requests":   "Demasiadas tentativas. Tente mais tarde.",
};

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [mode,     setMode]     = useState<"login" | "register">("login");
  const [error,    setError]    = useState("");
  const [busy,     setBusy]     = useState(false);

  const { signIn, signUp } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await signIn(email, password);
      else                  await signUp(email, password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(AUTH_ERRORS[code] ?? "Erro ao entrar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01
                     M4 7h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">EduContas ERP</h1>
            <p className="text-sm text-gray-400 mt-1">Sistema Contabilístico · Angola</p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  mode === m
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="utilizador@empresa.ao"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold
                         hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50
                         disabled:cursor-not-allowed transition-colors"
            >
              {busy
                ? "A processar…"
                : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          EduContas ERP · PGCA Angola · IFRS · DP N.º 71/25
        </p>
      </div>
    </div>
  );
}
