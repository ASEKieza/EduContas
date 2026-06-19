// ── Sample Ledger Balances — PGCA Angola ──────────────────────────────────────
// Empresa Demo Lda · NIF 5000123456 · Exercícios 2025 (N) e 2024 (N-1)
// Valores em AOA (Kwanzas)

import type { BalancesMap } from "./types";

const b = (
  code: string, debit: number, credit: number,
  nature: "devedora" | "credora"
): [string, BalancesMap[string]] => [code, { code, debit, credit, nature }];

// ── Exercício 2025 ────────────────────────────────────────────────────────────
export const BALANCES_2025: BalancesMap = Object.fromEntries([
  // CLASS 1 — Disponibilidades e Títulos Negociáveis
  b("11.1",  18_500_000,           0, "devedora"),  // Caixa AOA
  b("12.1", 350_000_000, 225_000_000, "devedora"),  // Dep. ordem BAI (saldo 125M)
  b("12.2", 125_000_000,  80_000_000, "devedora"),  // Dep. ordem BFA (saldo 45M)
  b("12.3", 219_800_000,           0, "devedora"),  // Dep. ordem Millennium
  b("13.1", 200_000_000, 120_000_000, "devedora"),  // Dep. a prazo (saldo 80M)
  b("15.1",  25_000_000,           0, "devedora"),  // Títulos negociáveis

  // CLASS 2 — Dívidas de Terceiros e Equiparados
  b("21.1", 820_000_000, 300_000_000, "devedora"),  // Clientes c/c (saldo 520M)
  b("21.2",  45_000_000,           0, "devedora"),  // Clientes títulos a receber
  b("22.1", 120_000_000, 430_000_000, "credora"),   // Fornecedores (saldo 310M)
  b("23.1",           0, 180_000_000, "credora"),   // Empréstimos bancários CP
  b("23.2",           0, 420_000_000, "credora"),   // Empréstimos bancários MLP
  b("24.1",  28_000_000,           0, "devedora"),  // Estado — IVA a receber
  b("24.2",           0,  42_000_000, "credora"),   // Estado — IVA a pagar
  b("24.3",           0,   8_500_000, "credora"),   // Estado — IRT a pagar
  b("24.4",           0,   6_800_000, "credora"),   // Estado — INSS a pagar
  b("24.5",           0, 198_300_000, "credora"),   // Estado — Imposto Industrial a pagar (30% × RAI)
  b("26.1",  25_000_000,  10_000_000, "devedora"),  // Outros devedores (saldo 15M)
  b("27.1",           0,  38_000_000, "credora"),   // Acréscimos de custos
  b("27.2",           0,  12_000_000, "credora"),   // Proveitos diferidos
  b("28.1",           0,  35_000_000, "credora"),   // Prov. cobranças duvidosas
  b("28.3",           0,   8_000_000, "credora"),   // Prov. depreciação existências
  b("29.1",           0,  22_000_000, "credora"),   // Provisões p/ riscos e encargos

  // CLASS 3 — Existências
  b("31.1", 850_000_000, 565_000_000, "devedora"),  // Mercadorias (saldo 285M)
  b("34.1", 120_000_000,  85_000_000, "devedora"),  // Matérias-primas (saldo 35M)

  // CLASS 4 — Imobilizações
  b("41.1",  50_000_000,           0, "devedora"),  // Partes de capital (filiais)
  b("42.1",  12_000_000,           0, "devedora"),  // Propriedade industrial
  b("43.1", 350_000_000,           0, "devedora"),  // Terrenos e recursos naturais
  b("43.2", 680_000_000,           0, "devedora"),  // Edifícios e outras construções
  b("44.1", 320_000_000,           0, "devedora"),  // Equipamento básico
  b("44.2", 185_000_000,           0, "devedora"),  // Equipamento de transporte
  b("44.3",  95_000_000,           0, "devedora"),  // Equipamento administrativo
  b("48.2",           0,   8_500_000, "credora"),   // Amort. acum. — incorpóreas
  b("48.3.1",         0, 185_000_000, "credora"),   // Amort. acum. — edifícios
  b("48.3.2",         0, 148_000_000, "credora"),   // Amort. acum. — eq. básico
  b("48.3.3",         0,  96_000_000, "credora"),   // Amort. acum. — eq. transporte
  b("48.3.4",         0,  52_500_000, "credora"),   // Amort. acum. — eq. administrativo

  // CLASS 5 — Capital Próprio e Provisões
  b("51.1",           0, 500_000_000, "credora"),   // Capital social
  b("52.1",           0, 120_000_000, "credora"),   // Reserva legal
  b("55.1",           0,  85_000_000, "credora"),   // Outras reservas
  b("57.1",           0, 195_000_000, "credora"),   // Resultados transitados

  // CLASS 6 — Proveitos e Ganhos (movimentos do exercício)
  b("61.1",           0, 2_850_000_000, "credora"), // Vendas de mercadorias
  b("62.1",           0,   380_000_000, "credora"), // Prestações de serviços
  b("65.1",           0,    45_000_000, "credora"), // Proveitos suplementares
  b("66.1",           0,    12_500_000, "credora"), // Juros e proveitos financeiros
  b("67.1",           0,     8_000_000, "credora"), // Mais-valias / ganhos não operacionais

  // CLASS 7 — Custos e Perdas (movimentos do exercício)
  b("71.1", 1_950_000_000,           0, "devedora"), // CMV — mercadorias
  b("72.1",   215_000_000,           0, "devedora"), // Remunerações do pessoal
  b("72.2",    28_500_000,           0, "devedora"), // Encargos sociais (INSS patronal)
  b("72.3",    18_000_000,           0, "devedora"), // Outros custos com o pessoal
  b("75.2.11", 22_000_000,           0, "devedora"), // Electricidade e água
  b("75.2.13",  8_500_000,           0, "devedora"), // Comunicações
  b("75.2.14", 15_000_000,           0, "devedora"), // Transportes de mercadorias
  b("75.2.16", 65_000_000,           0, "devedora"), // Rendas e alugueres
  b("75.2.18", 12_000_000,           0, "devedora"), // Seguros
  b("75.2.24", 38_000_000,           0, "devedora"), // Honorários e consultoria
  b("75.2.25", 18_000_000,           0, "devedora"), // Publicidade e propaganda
  b("75.2.27", 12_500_000,           0, "devedora"), // Conservação e reparação
  b("75.2.31", 25_000_000,           0, "devedora"), // Deslocações e representação
  b("75.3.1.1", 3_500_000,           0, "devedora"), // Imposto de Selo
  b("75.3.1.2", 8_000_000,           0, "devedora"), // IVA não recuperável
  b("75.4",    15_000_000,           0, "devedora"), // Outros custos operacionais
  b("76.1.1.1",48_000_000,           0, "devedora"), // Juros de empréstimos bancários
  b("76.5.1.1",22_000_000,           0, "devedora"), // Perdas cambiais realizadas
  b("78.1.1.1",18_000_000,           0, "devedora"), // Prov. cobranças duvidosas
  b("78.2.1",  85_000_000,           0, "devedora"), // Amortizações — imob. corpóreas
  b("78.2.2",   2_500_000,           0, "devedora"), // Amortizações — imob. incorpóreas
  b("79.1",     5_000_000,           0, "devedora"), // Perdas e custos não operacionais
]);

// ── Exercício 2024 ────────────────────────────────────────────────────────────
export const BALANCES_2024: BalancesMap = Object.fromEntries([
  // CLASS 1
  b("11.1",  15_000_000,           0, "devedora"),
  b("12.1", 290_000_000, 200_000_000, "devedora"),  // saldo 90M
  b("12.2", 100_000_000,  65_000_000, "devedora"),  // saldo 35M
  b("12.3",  89_800_000,           0, "devedora"),  // saldo 89.8M
  b("13.1", 160_000_000, 100_000_000, "devedora"),  // saldo 60M
  b("15.1",  20_000_000,           0, "devedora"),

  // CLASS 2
  b("21.1", 650_000_000, 240_000_000, "devedora"),  // saldo 410M
  b("21.2",  35_000_000,           0, "devedora"),
  b("22.1",  95_000_000, 340_000_000, "credora"),   // saldo 245M
  b("23.1",           0, 150_000_000, "credora"),
  b("23.2",           0, 380_000_000, "credora"),
  b("24.1",  22_000_000,           0, "devedora"),
  b("24.2",           0,  38_000_000, "credora"),
  b("24.3",           0,   7_200_000, "credora"),
  b("24.4",           0,   5_800_000, "credora"),
  b("24.5",           0, 156_450_000, "credora"),   // 30% × RAI 2024
  b("26.1",  20_000_000,   8_000_000, "devedora"),  // saldo 12M
  b("27.1",           0,  32_000_000, "credora"),
  b("27.2",           0,  10_000_000, "credora"),
  b("28.1",           0,  22_000_000, "credora"),
  b("28.3",           0,   6_000_000, "credora"),
  b("29.1",           0,  18_000_000, "credora"),

  // CLASS 3
  b("31.1", 700_000_000, 490_000_000, "devedora"),  // saldo 210M
  b("34.1",  95_000_000,  70_000_000, "devedora"),  // saldo 25M

  // CLASS 4
  b("41.1",  50_000_000,           0, "devedora"),
  b("42.1",  12_000_000,           0, "devedora"),
  b("43.1", 350_000_000,           0, "devedora"),
  b("43.2", 630_000_000,           0, "devedora"),
  b("44.1", 290_000_000,           0, "devedora"),
  b("44.2", 165_000_000,           0, "devedora"),
  b("44.3",  85_000_000,           0, "devedora"),
  b("48.2",           0,   6_000_000, "credora"),
  b("48.3.1",         0, 155_000_000, "credora"),
  b("48.3.2",         0, 120_000_000, "credora"),
  b("48.3.3",         0,  78_000_000, "credora"),
  b("48.3.4",         0,  43_000_000, "credora"),

  // CLASS 5
  b("51.1",           0, 500_000_000, "credora"),
  b("52.1",           0,  95_000_000, "credora"),
  b("55.1",           0,  68_000_000, "credora"),
  b("57.1",           0, 101_000_000, "credora"),

  // CLASS 6 — Proveitos 2024
  b("61.1",           0, 2_280_000_000, "credora"),
  b("62.1",           0,   304_000_000, "credora"),
  b("65.1",           0,    36_000_000, "credora"),
  b("66.1",           0,     9_000_000, "credora"),
  b("67.1",           0,             0, "credora"),

  // CLASS 7 — Custos 2024
  b("71.1", 1_540_000_000,           0, "devedora"),
  b("72.1",   172_000_000,           0, "devedora"),
  b("72.2",    22_800_000,           0, "devedora"),
  b("72.3",    14_400_000,           0, "devedora"),
  b("75.2.11", 17_600_000,           0, "devedora"),
  b("75.2.13",  6_800_000,           0, "devedora"),
  b("75.2.14", 12_000_000,           0, "devedora"),
  b("75.2.16", 52_000_000,           0, "devedora"),
  b("75.2.18",  9_600_000,           0, "devedora"),
  b("75.2.24", 30_400_000,           0, "devedora"),
  b("75.2.25", 14_400_000,           0, "devedora"),
  b("75.2.27", 10_000_000,           0, "devedora"),
  b("75.2.31", 20_000_000,           0, "devedora"),
  b("75.3.1.1", 2_800_000,           0, "devedora"),
  b("75.3.1.2", 6_400_000,           0, "devedora"),
  b("75.4",    12_000_000,           0, "devedora"),
  b("76.1.1.1",42_000_000,           0, "devedora"),
  b("76.5.1.1",18_000_000,           0, "devedora"),
  b("78.1.1.1",14_000_000,           0, "devedora"),
  b("78.2.1",  80_000_000,           0, "devedora"),
  b("78.2.2",   2_000_000,           0, "devedora"),
  b("79.1",     4_000_000,           0, "devedora"),
]);

// ── Exercício 2026 (projecção +15% sobre 2025) ────────────────────────────────
export const BALANCES_2026: BalancesMap = Object.fromEntries(
  Object.entries(BALANCES_2025).map(([code, acc]) => {
    // Balance-sheet accounts grow more conservatively (+8%); P&L accounts grow +15%
    const isMovement = code.startsWith("6") || code.startsWith("7");
    const factor = isMovement ? 1.15 : 1.08;
    return [code, { ...acc, debit: Math.round(acc.debit * factor), credit: Math.round(acc.credit * factor) }];
  })
);

// ── Dataset registry ──────────────────────────────────────────────────────────
export const DATASETS: Record<string, { cur: BalancesMap; pri: BalancesMap }> = {
  "2026": { cur: BALANCES_2026, pri: BALANCES_2025 },
  "2025": { cur: BALANCES_2025, pri: BALANCES_2024 },
  "2024": { cur: BALANCES_2024, pri: BALANCES_2024 },
};

export const ANOS_DISPONIVEIS = ["2026", "2025", "2024"];
