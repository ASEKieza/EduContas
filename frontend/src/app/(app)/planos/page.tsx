"use client";

import Topbar from "@/components/Topbar";

interface Plano {
  id: string;
  nome: string;
  subtitulo: string;
  preco: number;
  periodoLabel: string;
  destaque: boolean;
  cor: string;
  corBg: string;
  corBadge: string;
  icon: string;
  utilizadores: string;
  empresas: string;
  armazenamento: string;
  modulos: string[];
  suporte: string;
  extras: string[];
}

const PLANOS: Plano[] = [
  {
    id: "basico",
    nome: "Básico",
    subtitulo: "Para microempresas e startups",
    preco: 15000,
    periodoLabel: "mês",
    destaque: false,
    cor: "text-blue-700",
    corBg: "bg-blue-50 border-blue-200",
    corBadge: "bg-blue-100 text-blue-700",
    icon: "🚀",
    utilizadores: "Até 2 utilizadores",
    empresas: "1 empresa",
    armazenamento: "500 MB",
    modulos: [
      "Vendas & Facturação",
      "Compras",
      "Tesouraria básica",
      "Inventário",
      "Relatórios essenciais",
      "Exportação AGT (e-Factura)",
    ],
    suporte: "Suporte por e-mail (48h)",
    extras: [],
  },
  {
    id: "profissional",
    nome: "Profissional",
    subtitulo: "Para PMEs em crescimento",
    preco: 45000,
    periodoLabel: "mês",
    destaque: true,
    cor: "text-brand-700",
    corBg: "bg-brand-50 border-brand-400",
    corBadge: "bg-brand-100 text-brand-700",
    icon: "⭐",
    utilizadores: "Até 5 utilizadores",
    empresas: "Até 3 empresas",
    armazenamento: "5 GB",
    modulos: [
      "Todos os módulos do Básico",
      "Contabilidade PGCA completa",
      "Recursos Humanos & Folha",
      "Activos Fixos",
      "Fiscalidade angolana (IVA, IRT, IRPC)",
      "Reconciliação bancária",
      "Centros de Custo",
      "Guias de Remessa AGT",
      "Orçamentação",
    ],
    suporte: "Suporte prioritário (24h)",
    extras: ["Formação inicial incluída (4h)", "Migração de dados assistida"],
  },
  {
    id: "empresarial",
    nome: "Empresarial",
    subtitulo: "Para grandes empresas e grupos",
    preco: 120000,
    periodoLabel: "mês",
    destaque: false,
    cor: "text-ink-900",
    corBg: "bg-ink-950 border-ink-800",
    corBadge: "bg-gold-400 text-ink-950",
    icon: "🏢",
    utilizadores: "Utilizadores ilimitados",
    empresas: "Empresas ilimitadas",
    armazenamento: "Ilimitado",
    modulos: [
      "Todos os módulos Profissional",
      "Multi-empresa consolidado",
      "BI & Dashboard executivo",
      "API de integração",
      "Auditoria avançada",
      "Conformidade AGT total",
      "Relatórios personalizados",
      "Gestão de aprovações",
    ],
    suporte: "Suporte dedicado 24/7 + gestor de conta",
    extras: [
      "Formação completa para equipa",
      "Implementação assistida on-site",
      "SLA garantido 99,9%",
    ],
  },
];

function fmtKz(v: number) {
  return `Kz ${v.toLocaleString("pt-PT")}`;
}

export default function PlanosPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Planos & Preços"
        subtitle="Escolha o plano ideal para a sua empresa"
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Hero */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-ink-900">
            EduContas ERP — Solução Angolana de Gestão Empresarial
          </h2>
          <p className="text-ink-500 mt-2 max-w-2xl mx-auto">
            Conformidade total com a AGT, PGCA e legislação fiscal angolana.
            Todos os planos incluem actualizações automáticas e backup na nuvem.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANOS.map(p => (
            <div
              key={p.id}
              className={`relative rounded-2xl border-2 p-6 flex flex-col gap-5 transition-shadow hover:shadow-lg ${p.corBg} ${p.destaque ? "shadow-xl scale-[1.02]" : ""}`}
            >
              {p.destaque && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                    MAIS POPULAR
                  </span>
                </div>
              )}

              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{p.icon}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.corBadge}`}>{p.nome}</span>
                </div>
                <p className={`text-xs mt-1 ${p.id === "empresarial" ? "text-ink-400" : "text-ink-500"}`}>{p.subtitulo}</p>
              </div>

              {/* Preço */}
              <div>
                <div className={`text-3xl font-black ${p.id === "empresarial" ? "text-white" : p.cor}`}>
                  {fmtKz(p.preco)}
                </div>
                <div className={`text-xs mt-0.5 ${p.id === "empresarial" ? "text-ink-400" : "text-ink-500"}`}>
                  por {p.periodoLabel} + IVA
                </div>
                <div className={`text-xs mt-2 font-medium ${p.id === "empresarial" ? "text-ink-300" : "text-ink-600"}`}>
                  {p.utilizadores} · {p.empresas}
                </div>
              </div>

              {/* Módulos */}
              <div className="flex-1">
                <p className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${p.id === "empresarial" ? "text-ink-400" : "text-ink-500"}`}>
                  Inclui
                </p>
                <ul className="space-y-1.5">
                  {p.modulos.map(m => (
                    <li key={m} className={`flex items-start gap-1.5 text-xs ${p.id === "empresarial" ? "text-ink-200" : "text-ink-700"}`}>
                      <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                      {m}
                    </li>
                  ))}
                  {p.extras.map(e => (
                    <li key={e} className={`flex items-start gap-1.5 text-xs font-medium ${p.id === "empresarial" ? "text-gold-400" : "text-brand-700"}`}>
                      <span className="shrink-0 mt-0.5">★</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suporte */}
              <p className={`text-[11px] ${p.id === "empresarial" ? "text-ink-400" : "text-ink-500"}`}>
                📞 {p.suporte}
              </p>

              {/* CTA */}
              <button
                className={`w-full py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 ${
                  p.destaque
                    ? "bg-brand-600 text-white"
                    : p.id === "empresarial"
                    ? "bg-gold-400 text-ink-950"
                    : "bg-white text-ink-900 border border-ink-200"
                }`}
                onClick={() => alert(`Para contratar o plano ${p.nome}, contacte:\nvendas@educontas.ao\n+244 923 000 000`)}
              >
                {p.id === "empresarial" ? "Contactar comercial" : "Começar agora"}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center text-xs text-ink-400 max-w-2xl mx-auto space-y-1">
          <p>Preços em Kwanza Angolano (AOA). IVA à taxa legal aplicável (14%).</p>
          <p>Pagamento mensal ou anual (desconto 15% no anual). Cancele a qualquer momento.</p>
          <p className="font-medium text-ink-600">
            Precisa de um plano personalizado?{" "}
            <span className="text-brand-600 cursor-pointer underline"
              onClick={() => alert("Contacte: vendas@educontas.ao | +244 923 000 000")}>
              Fale connosco
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
