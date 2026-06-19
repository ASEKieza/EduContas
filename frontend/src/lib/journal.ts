"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface JournalLine {
  conta: string;     // display: "31.1 — Clientes Nacionais"
  contaCod: string;  // code only: "31.1"
  descricao: string;
  debito: number;
  credito: number;
  fluxoCaixa?: string;  // ID from RUBRICAS_FLUXO_CAIXA — obrigatório para contas Classe 4
  centroCusto?: string; // ID from CENTROS_CUSTO_REF — obrigatório para contas Classe 7
}

export interface JournalEntry {
  id: string;
  numero: string;       // "DI/2025/000001"
  data: string;         // ISO "2025-01-15"
  descricao: string;
  tipo: string;
  modulo: string;
  linhas: JournalLine[];
  totalDebito: number;
  totalCredito: number;
  estado: "LANÇADO" | "ANULADO" | "RASCUNHO";
  estornadoDe?: string; // original entry numero if this is a reversal
  criadoEm: string;
}

// ── Cash Flow Rubricas (IAS 7 / PGCA Angola) ─────────────────────────────────
export interface RubricaFluxoCaixa {
  id: string;
  label: string;
  grupo: "operacional" | "investimento" | "financiamento";
}

export const RUBRICAS_FLUXO_CAIXA: RubricaFluxoCaixa[] = [
  // Actividades Operacionais
  { id: "AO-REC-CLI",     label: "Recebimentos de clientes",                  grupo: "operacional"   },
  { id: "AO-PAG-FORN",    label: "Pagamentos a fornecedores",                 grupo: "operacional"   },
  { id: "AO-PAG-PESSOAL", label: "Pagamentos ao pessoal (salários/encargos)", grupo: "operacional"   },
  { id: "AO-PAG-IMP",     label: "Pagamentos de impostos e taxas",            grupo: "operacional"   },
  { id: "AO-PAG-JUR",     label: "Pagamentos de juros",                       grupo: "operacional"   },
  { id: "AO-REC-OUTROS",  label: "Outros recebimentos operacionais",          grupo: "operacional"   },
  { id: "AO-PAG-OUTROS",  label: "Outros pagamentos operacionais",            grupo: "operacional"   },
  // Actividades de Investimento
  { id: "AI-ACQ-IMOB",    label: "Aquisição de imobilizado corpóreo",         grupo: "investimento"  },
  { id: "AI-ACQ-INCORP",  label: "Aquisição de imobilizado incorpóreo",       grupo: "investimento"  },
  { id: "AI-ALIEN-IMOB",  label: "Alienação / venda de imobilizado",          grupo: "investimento"  },
  { id: "AI-ACQ-INV",     label: "Aquisição de investimentos financeiros",    grupo: "investimento"  },
  { id: "AI-ALIEN-INV",   label: "Alienação de investimentos financeiros",    grupo: "investimento"  },
  { id: "AI-OUTROS",      label: "Outros fluxos de investimento",             grupo: "investimento"  },
  // Actividades de Financiamento
  { id: "AF-EMP-OBT",     label: "Empréstimos obtidos",                       grupo: "financiamento" },
  { id: "AF-REIMB-EMP",   label: "Reembolso de empréstimos",                  grupo: "financiamento" },
  { id: "AF-AUM-CAP",     label: "Aumento / realização de capital",           grupo: "financiamento" },
  { id: "AF-DIV-PAG",     label: "Dividendos pagos",                          grupo: "financiamento" },
  { id: "AF-OUTROS",      label: "Outros fluxos de financiamento",            grupo: "financiamento" },
];

export const GRUPO_FLUXO_LABEL: Record<string, string> = {
  operacional:   "Actividades Operacionais",
  investimento:  "Actividades de Investimento",
  financiamento: "Actividades de Financiamento",
};

// ── Cost Center Reference (shared with centros-custo page) ────────────────────
export interface CentroCustoRef { id: string; code: string; name: string; }

export const CENTROS_CUSTO_REF: CentroCustoRef[] = [
  { id: "adm",       code: "ADM",   name: "Administração Geral" },
  { id: "com",       code: "COM",   name: "Comercial & Vendas" },
  { id: "com-north", code: "COM-N", name: "Vendas Norte" },
  { id: "com-south", code: "COM-S", name: "Vendas Sul/Luanda" },
  { id: "fin",       code: "FIN",   name: "Financeiro & Contabilidade" },
  { id: "rh",        code: "RH",    name: "Recursos Humanos" },
  { id: "ops",       code: "OPS",   name: "Operações & Logística" },
  { id: "ti",        code: "TI",    name: "Tecnologias de Informação" },
  { id: "proj-a",    code: "PRJ-A", name: "Projecto Alpha (Expansão)" },
  { id: "proj-b",    code: "PRJ-B", name: "Projecto Beta (TI Cloud)" },
];

// ── Common PGCA Angola accounts for the selector ──────────────────────────────
export interface PGCAAccount {
  code: string;
  name: string;
  nature: "devedora" | "credora";
  classe: number;
}

export const JOURNAL_ACCOUNTS: PGCAAccount[] = [
  // Classe 1 — Meios Fixos
  { code: "11.1.1",   name: "Terrenos em bruto",                      nature: "devedora", classe: 1 },
  { code: "11.2.1.2", name: "Edifícios administrativos e comerciais", nature: "devedora", classe: 1 },
  { code: "11.3.1",   name: "Material industrial",                    nature: "devedora", classe: 1 },
  { code: "11.4.1",   name: "Equipamento de transporte",              nature: "devedora", classe: 1 },
  { code: "11.5.1",   name: "Equipamento administrativo",             nature: "devedora", classe: 1 },
  { code: "12.3.1",   name: "Propriedade industrial e direitos",      nature: "devedora", classe: 1 },
  { code: "13.3.1",   name: "Partes de capital — outras empresas",    nature: "devedora", classe: 1 },
  { code: "14.1",     name: "Imobilizações em curso",                 nature: "devedora", classe: 1 },
  { code: "18.1.2",   name: "Amort. Acum. — Edifícios e construções", nature: "credora",  classe: 1 },
  { code: "18.1.3",   name: "Amort. Acum. — Equipamento básico",      nature: "credora",  classe: 1 },
  { code: "18.1.4",   name: "Amort. Acum. — Equip. transporte",       nature: "credora",  classe: 1 },
  { code: "18.1.5",   name: "Amort. Acum. — Equip. administrativo",   nature: "credora",  classe: 1 },
  { code: "19.3.1",   name: "Prov. Inv. Financeiros — outras emp.",   nature: "credora",  classe: 1 },

  // Classe 2 — Existências
  { code: "21.2.1",   name: "Compras — Mercadorias",                  nature: "devedora", classe: 2 },
  { code: "21.1.1",   name: "Compras — Matérias-primas",              nature: "devedora", classe: 2 },
  { code: "22.1.1",   name: "Matérias-primas",                        nature: "devedora", classe: 2 },
  { code: "24.1.1",   name: "Produtos acabados",                      nature: "devedora", classe: 2 },
  { code: "26.1",     name: "Mercadorias",                            nature: "devedora", classe: 2 },
  { code: "28.2.1",   name: "Adiantamentos s/ compras — Mercadorias", nature: "devedora", classe: 2 },
  { code: "29.6.1",   name: "Provisão p/ deprec. Mercadorias",        nature: "credora",  classe: 2 },

  // Classe 3 — Terceiros
  { code: "31.1.2.1", name: "Clientes Nacionais — correntes",         nature: "devedora", classe: 3 },
  { code: "31.1.2.2", name: "Clientes Estrangeiros — correntes",      nature: "devedora", classe: 3 },
  { code: "31.8.1",   name: "Clientes — cobrança duvidosa",           nature: "devedora", classe: 3 },
  { code: "31.9.1",   name: "Adiantamentos de clientes",              nature: "credora",  classe: 3 },
  { code: "32.1.2.1", name: "Fornecedores Nacionais — correntes",     nature: "credora",  classe: 3 },
  { code: "32.1.2.2", name: "Fornecedores Estrangeiros — correntes",  nature: "credora",  classe: 3 },
  { code: "32.9.1",   name: "Adiantamentos a fornecedores",           nature: "devedora", classe: 3 },
  { code: "33.1.1.1", name: "Empréstimos bancários — moeda nacional", nature: "credora",  classe: 3 },
  { code: "33.1.2.1", name: "Empréstimos bancários — moeda estrang.", nature: "credora",  classe: 3 },
  { code: "34.1.1",   name: "Imposto Industrial (II)",                nature: "credora",  classe: 3 },
  { code: "34.3.1",   name: "Imposto de Rendimento do Trabalho (IRT)",nature: "credora",  classe: 3 },
  { code: "34.5.1.1", name: "IVA Suportado — Existências",            nature: "devedora", classe: 3 },
  { code: "34.5.1.2", name: "IVA Suportado — Meios fixos",            nature: "devedora", classe: 3 },
  { code: "34.5.1.3", name: "IVA Suportado — Outros bens/serviços",   nature: "devedora", classe: 3 },
  { code: "34.5.3.1", name: "IVA Liquidado — Operações gerais",       nature: "credora",  classe: 3 },
  { code: "34.5.5.1", name: "IVA Apuramento",                        nature: "credora",  classe: 3 },
  { code: "34.5.6.1", name: "IVA a Pagar",                           nature: "credora",  classe: 3 },
  { code: "34.5.7.1", name: "IVA a Recuperar",                       nature: "devedora", classe: 3 },
  { code: "36.1.2.1", name: "Remunerações a pagar — Empregados",      nature: "credora",  classe: 3 },
  { code: "36.3.1",   name: "Adiantamentos ao pessoal",               nature: "devedora", classe: 3 },
  { code: "37.1.1",   name: "Compras de imobilizado — corpóreo",      nature: "credora",  classe: 3 },
  { code: "38.1",     name: "Acréscimos de custos",                   nature: "credora",  classe: 3 },
  { code: "38.2",     name: "Proveitos diferidos",                    nature: "credora",  classe: 3 },

  // Classe 4 — Meios Monetários
  { code: "41.1",     name: "Depósitos à ordem — AOA",                nature: "devedora", classe: 4 },
  { code: "41.2",     name: "Depósitos à ordem — USD",                nature: "devedora", classe: 4 },
  { code: "43.1",     name: "Banco BFA — C/C",                        nature: "devedora", classe: 4 },
  { code: "43.2",     name: "Banco BIC — C/C",                        nature: "devedora", classe: 4 },
  { code: "43.3",     name: "Banco BAI — C/C",                        nature: "devedora", classe: 4 },
  { code: "43.4",     name: "Banco Millennium — C/C",                 nature: "devedora", classe: 4 },
  { code: "43.9",     name: "Outros depósitos bancários",             nature: "devedora", classe: 4 },
  { code: "45.1",     name: "Caixa Principal — AOA",                  nature: "devedora", classe: 4 },
  { code: "45.2",     name: "Caixa em divisas (USD)",                 nature: "devedora", classe: 4 },

  // Classe 5 — Capital Próprio
  { code: "51.1",     name: "Capital Subscrito e Realizado",          nature: "credora",  classe: 5 },
  { code: "52.1",     name: "Reservas legais",                        nature: "credora",  classe: 5 },
  { code: "55",       name: "Reservas de reavaliação",                nature: "credora",  classe: 5 },
  { code: "56",       name: "Reservas livres",                        nature: "credora",  classe: 5 },
  { code: "57.1",     name: "Resultados transitados",                 nature: "credora",  classe: 5 },
  { code: "59",       name: "Dividendos antecipados",                 nature: "devedora", classe: 5 },

  // Classe 6 — Proveitos
  { code: "61.1",     name: "Vendas — Mercado Nacional",              nature: "credora",  classe: 6 },
  { code: "61.2",     name: "Vendas — Exportação",                    nature: "credora",  classe: 6 },
  { code: "61.7",     name: "Devoluções de vendas",                   nature: "devedora", classe: 6 },
  { code: "62.1",     name: "Prestações de Serviços",                 nature: "credora",  classe: 6 },
  { code: "65.1",     name: "Proveitos Suplementares",                nature: "credora",  classe: 6 },
  { code: "66.1.1.1", name: "Juros de depósitos bancários",           nature: "credora",  classe: 6 },
  { code: "67.1",     name: "Ganhos em imobilizações",                nature: "credora",  classe: 6 },
  { code: "68.1",     name: "Resultados de filiais",                  nature: "credora",  classe: 6 },

  // Classe 7 — Custos
  { code: "71.1",     name: "CMVMC — Mercadorias",                    nature: "devedora", classe: 7 },
  { code: "71.2",     name: "CMVMC — Matérias-primas",                nature: "devedora", classe: 7 },
  { code: "72.1",     name: "Remunerações do pessoal",                nature: "devedora", classe: 7 },
  { code: "72.2",     name: "Encargos sociais — INSS",                nature: "devedora", classe: 7 },
  { code: "72.5",     name: "Outros encargos s/ remunerações",        nature: "devedora", classe: 7 },
  { code: "73.1",     name: "Amortizações — Imob. Corpóreas",         nature: "devedora", classe: 7 },
  { code: "73.2",     name: "Amortizações — Imob. Incorpóreas",       nature: "devedora", classe: 7 },
  { code: "75.1",     name: "Subcontratos",                           nature: "devedora", classe: 7 },
  { code: "75.2.11",  name: "FST — Electricidade e combustíveis",     nature: "devedora", classe: 7 },
  { code: "75.2.13",  name: "FST — Comunicações e telecomunicações",  nature: "devedora", classe: 7 },
  { code: "75.2.14",  name: "FST — Transportes e deslocações",        nature: "devedora", classe: 7 },
  { code: "75.2.16",  name: "FST — Rendas e alugueres",               nature: "devedora", classe: 7 },
  { code: "75.2.18",  name: "FST — Seguros",                         nature: "devedora", classe: 7 },
  { code: "75.2.24",  name: "FST — Honorários e comissões",           nature: "devedora", classe: 7 },
  { code: "75.2.25",  name: "FST — Publicidade e propaganda",         nature: "devedora", classe: 7 },
  { code: "75.2.27",  name: "FST — Conservação e reparações",         nature: "devedora", classe: 7 },
  { code: "75.2.31",  name: "FST — Deslocações e estadias",           nature: "devedora", classe: 7 },
  { code: "75.3.1.1", name: "Imposto de Selo",                        nature: "devedora", classe: 7 },
  { code: "75.3.1.2", name: "Imposto de Superfície",                  nature: "devedora", classe: 7 },
  { code: "75.3.1.3", name: "Contribuição Industrial",                nature: "devedora", classe: 7 },
  { code: "76.1.1.1", name: "Juros de empréstimos bancários",         nature: "devedora", classe: 7 },
  { code: "76.5.1.1", name: "Perdas cambiais",                        nature: "devedora", classe: 7 },
  { code: "78.2.1",   name: "Amortizações do exercício — corpóreas",  nature: "devedora", classe: 7 },
  { code: "78.2.2",   name: "Amortizações do exercício — incorpóreas",nature: "devedora", classe: 7 },
  { code: "78.1.1.1", name: "Provisão p/ créditos de cobrança duvid.",nature: "devedora", classe: 7 },
  { code: "79.1",     name: "Perdas em imobilizações",                nature: "devedora", classe: 7 },

  // Classe 8 — Resultados
  { code: "87",       name: "Imposto sobre os Lucros (II)",           nature: "devedora", classe: 8 },
  { code: "88",       name: "Resultado Líquido do Exercício",         nature: "credora",  classe: 8 },
];

export function accountLabel(a: PGCAAccount): string {
  return `${a.code} — ${a.name}`;
}

// ── Seed data (initial entries matching the old hardcoded rows) ────────────────
const SEED_ENTRIES_2024: JournalEntry[] = [
  {
    id: "seed-342", numero: "DI/2024/000342", data: "2024-11-30",
    descricao: "Venda a crédito — FT/2024/001201", tipo: "VENDA", modulo: "VENDAS",
    linhas: [
      { conta: "31.1.2.1 — Clientes Nacionais — correntes", contaCod: "31.1.2.1", descricao: "FT/2024/001201", debito: 11400000, credito: 0 },
      { conta: "61.1 — Vendas — Mercado Nacional",          contaCod: "61.1",      descricao: "FT/2024/001201", debito: 0, credito: 10000000 },
      { conta: "34.5.3.1 — IVA Liquidado — Operações gerais", contaCod: "34.5.3.1", descricao: "IVA 14%",       debito: 0, credito: 1400000 },
    ],
    totalDebito: 11400000, totalCredito: 11400000, estado: "LANÇADO", criadoEm: "2024-11-30T10:00:00Z",
  },
  {
    id: "seed-341", numero: "DI/2024/000341", data: "2024-11-30",
    descricao: "Processamento salarial — Nov 2024", tipo: "SALÁRIO", modulo: "RH",
    linhas: [
      { conta: "72.1 — Remunerações do pessoal",             contaCod: "72.1",      descricao: "Salários Nov/2024", debito: 38200000, credito: 0 },
      { conta: "72.2 — Encargos sociais — INSS",             contaCod: "72.2",      descricao: "INSS 8% entidade", debito: 10000000, credito: 0 },
      { conta: "36.1.2.1 — Remunerações a pagar — Empregados", contaCod: "36.1.2.1", descricao: "Vencimentos a pagar", debito: 0, credito: 35000000 },
      { conta: "34.3.1 — Imposto de Rendimento do Trabalho (IRT)", contaCod: "34.3.1", descricao: "IRT retido na fonte", debito: 0, credito: 3200000 },
      { conta: "34.1.1 — Imposto Industrial (II)",           contaCod: "34.1.1",    descricao: "INSS trabalhador 3%", debito: 0, credito: 10000000 },
    ],
    totalDebito: 48200000, totalCredito: 48200000, estado: "LANÇADO", criadoEm: "2024-11-30T09:00:00Z",
  },
  {
    id: "seed-340", numero: "DI/2024/000340", data: "2024-11-29",
    descricao: "Pagamento fornecedor — ABC Lda.", tipo: "PAGAMENTO", modulo: "TESOURARIA",
    linhas: [
      { conta: "32.1.2.1 — Fornecedores Nacionais — correntes", contaCod: "32.1.2.1", descricao: "Liquidação forn. ABC Lda.", debito: 5700000, credito: 0 },
      { conta: "43.1 — Banco BFA — C/C",                       contaCod: "43.1",      descricao: "Transferência bancária",    debito: 0, credito: 5700000 },
    ],
    totalDebito: 5700000, totalCredito: 5700000, estado: "LANÇADO", criadoEm: "2024-11-29T15:00:00Z",
  },
  {
    id: "seed-339", numero: "DI/2024/000339", data: "2024-11-29",
    descricao: "Compra mercadorias — Ref.C-0891", tipo: "COMPRA", modulo: "COMPRAS",
    linhas: [
      { conta: "26.1 — Mercadorias",                            contaCod: "26.1",      descricao: "Compra ref. C-0891",    debito: 7500000, credito: 0 },
      { conta: "34.5.1.1 — IVA Suportado — Existências",       contaCod: "34.5.1.1",  descricao: "IVA suportado 14%",     debito: 1050000, credito: 0 },
      { conta: "32.1.2.1 — Fornecedores Nacionais — correntes",contaCod: "32.1.2.1",  descricao: "Factura fornecedor C-0891", debito: 0, credito: 8550000 },
    ],
    totalDebito: 8550000, totalCredito: 8550000, estado: "LANÇADO", criadoEm: "2024-11-29T11:00:00Z",
  },
  {
    id: "seed-338", numero: "DI/2024/000338", data: "2024-11-28",
    descricao: "Depreciação activos — Nov 2024", tipo: "DEPRECIAÇÃO", modulo: "ACTIVOS",
    linhas: [
      { conta: "78.2.1 — Amortizações do exercício — corpóreas", contaCod: "78.2.1", descricao: "Dotação mensal Nov/2024", debito: 1250000, credito: 0 },
      { conta: "18.1.3 — Amort. Acum. — Equipamento básico",    contaCod: "18.1.3",  descricao: "Amortização acumulada",  debito: 0, credito: 1250000 },
    ],
    totalDebito: 1250000, totalCredito: 1250000, estado: "LANÇADO", criadoEm: "2024-11-28T16:00:00Z",
  },
  {
    id: "seed-337", numero: "DI/2024/000337", data: "2024-11-28",
    descricao: "IVA Apuramento — Outubro 2024", tipo: "IVA", modulo: "FISCAL",
    linhas: [
      { conta: "34.5.3.1 — IVA Liquidado — Operações gerais",  contaCod: "34.5.3.1", descricao: "IVA Out/2024 liquidado",   debito: 12600000, credito: 0 },
      { conta: "34.5.1.1 — IVA Suportado — Existências",       contaCod: "34.5.1.1", descricao: "IVA Out/2024 suportado",   debito: 0, credito: 12600000 },
    ],
    totalDebito: 12600000, totalCredito: 12600000, estado: "LANÇADO", criadoEm: "2024-11-28T08:00:00Z",
  },
  {
    id: "seed-336", numero: "DI/2024/000336", data: "2024-11-27",
    descricao: "Venda a prédio — FT/2024/001200", tipo: "VENDA", modulo: "VENDAS",
    linhas: [
      { conta: "31.1.2.1 — Clientes Nacionais — correntes", contaCod: "31.1.2.1", descricao: "FT/2024/001200", debito: 28500000, credito: 0 },
      { conta: "61.1 — Vendas — Mercado Nacional",          contaCod: "61.1",      descricao: "FT/2024/001200", debito: 0, credito: 25000000 },
      { conta: "34.5.3.1 — IVA Liquidado — Operações gerais", contaCod: "34.5.3.1", descricao: "IVA 14%",       debito: 0, credito: 3500000 },
    ],
    totalDebito: 28500000, totalCredito: 28500000, estado: "LANÇADO", criadoEm: "2024-11-27T14:00:00Z",
  },
  {
    id: "seed-335", numero: "DI/2024/000335", data: "2024-11-27",
    descricao: "Empréstimo BAI — Ref.EMP-0044", tipo: "EMPRÉSTIMO", modulo: "TESOURARIA",
    linhas: [
      { conta: "43.3 — Banco BAI — C/C",                        contaCod: "43.3",      descricao: "Crédito BAI EMP-0044", debito: 50000000, credito: 0 },
      { conta: "33.1.1.1 — Empréstimos bancários — moeda nacional", contaCod: "33.1.1.1", descricao: "Empréstimo BAI EMP-0044", debito: 0, credito: 50000000 },
    ],
    totalDebito: 50000000, totalCredito: 50000000, estado: "LANÇADO", criadoEm: "2024-11-27T10:00:00Z",
  },
  {
    id: "seed-099", numero: "DI/2024/000099", data: "2024-03-05",
    descricao: "ESTORNO DI/2024/000098", tipo: "ESTORNO", modulo: "CONTABILIDADE",
    linhas: [
      { conta: "61.1 — Vendas — Mercado Nacional",              contaCod: "61.1",      descricao: "Estorno FT anterior", debito: 2000000, credito: 0 },
      { conta: "34.5.3.1 — IVA Liquidado — Operações gerais",  contaCod: "34.5.3.1",  descricao: "Estorno IVA",         debito: 280000, credito: 0 },
      { conta: "31.1.2.1 — Clientes Nacionais — correntes",    contaCod: "31.1.2.1",  descricao: "Estorno cliente",     debito: 0, credito: 2280000 },
    ],
    totalDebito: 2280000, totalCredito: 2280000, estado: "ANULADO", estornadoDe: "DI/2024/000098",
    criadoEm: "2024-03-05T09:00:00Z",
  },
];

// ── Saldos de Abertura 2025 — WAL MIDEA (Balancete 14/2024) ───────────────────
const SEED_ENTRIES_2025: JournalEntry[] = [
  {
    id: "wm-abertura-2025",
    numero: "DI/2025/000001",
    data: "2025-01-01",
    descricao: "Saldos de Abertura 2025 — WAL MIDEA · Balancete 14/2024",
    tipo: "OUTRO",
    modulo: "CONTABILIDADE",
    linhas: [
      { conta: "2611 — Mp-Existências (Mercadorias)",                       contaCod: "2611",     descricao: "Saldo de abertura 2611",     debito: 5021359.33, credito: 0 },
      { conta: "78061 — Multas e Penalidades Fiscais",                      contaCod: "78061",    descricao: "Saldo de abertura 78061",    debito: 13390.00,   credito: 0 },
      { conta: "1815 — Amort. Acumuladas — Equipamento Administrativo",     contaCod: "1815",     descricao: "Saldo de abertura 1815",     debito: 0, credito: 293592.05 },
      { conta: "3413 — IL-Retenção na Fonte",                               contaCod: "3413",     descricao: "Saldo de abertura 3413",     debito: 0, credito: 70200.00 },
      { conta: "3431 — IRT",                                                contaCod: "3431",     descricao: "Saldo de abertura 3431",     debito: 0, credito: 464.10 },
      { conta: "3492 — Segurança Social",                                   contaCod: "3492",     descricao: "Saldo de abertura 3492",     debito: 0, credito: 37033.05 },
      { conta: "35144001 — Walquiria Lurdes C. António — Empréstimo",       contaCod: "35144001", descricao: "Saldo de abertura 35144001", debito: 0, credito: 150000.00 },
      { conta: "431011 — Banco BFA (Conta Corrente — Descoberto)",          contaCod: "431011",   descricao: "Saldo de abertura 431011",   debito: 0, credito: 3866243.25 },
      { conta: "881 — Resultados Líquidos do Exercício 2024",               contaCod: "881",      descricao: "Resultado do exercício 2024", debito: 0, credito: 617216.88 },
    ],
    totalDebito: 5034749.33,
    totalCredito: 5034749.33,
    estado: "LANÇADO",
    criadoEm: "2025-01-01T00:00:00Z",
  },
];

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useJournal(exercicio: string) {
  const key = `educontas-diario-${exercicio}`;
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        setEntries(JSON.parse(raw));
      } else if (exercicio === "2024") {
        localStorage.setItem(key, JSON.stringify(SEED_ENTRIES_2024));
        setEntries(SEED_ENTRIES_2024);
      } else if (exercicio === "2025") {
        localStorage.setItem(key, JSON.stringify(SEED_ENTRIES_2025));
        setEntries(SEED_ENTRIES_2025);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, [key, exercicio]);

  const persist = useCallback((data: JournalEntry[]) => {
    setEntries(data);
    localStorage.setItem(key, JSON.stringify(data));
  }, [key]);

  /** Generate next sequence number */
  const nextSeq = useCallback((prev: JournalEntry[]): string => {
    const nums = prev
      .map(e => parseInt(e.numero.split("/")[2] ?? "0", 10))
      .filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `DI/${exercicio}/${(max + 1).toString().padStart(6, "0")}`;
  }, [exercicio]);

  const addEntry = useCallback((
    draft: Omit<JournalEntry, "id" | "numero" | "criadoEm">
  ) => {
    setEntries(prev => {
      const numero = nextSeq(prev);
      const entry: JournalEntry = {
        ...draft,
        id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36),
        numero,
        criadoEm: new Date().toISOString(),
      };
      const next = [entry, ...prev];
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key, nextSeq]);

  const estornar = useCallback((entryId: string) => {
    setEntries(prev => {
      const orig = prev.find(e => e.id === entryId);
      if (!orig || orig.estado === "ANULADO") return prev;

      const numero = nextSeq(prev);
      const reversal: JournalEntry = {
        id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36),
        numero,
        data: new Date().toISOString().split("T")[0],
        descricao: `ESTORNO ${orig.numero} — ${orig.descricao}`,
        tipo: "ESTORNO",
        modulo: orig.modulo,
        linhas: orig.linhas.map(l => ({ ...l, debito: l.credito, credito: l.debito })),
        totalDebito: orig.totalCredito,
        totalCredito: orig.totalDebito,
        estado: "LANÇADO",
        estornadoDe: orig.numero,
        criadoEm: new Date().toISOString(),
      };

      const updated = prev.map(e =>
        e.id === entryId ? { ...e, estado: "ANULADO" as const } : e
      );
      const next = [reversal, ...updated];
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key, nextSeq]);

  /** Erase ALL entries for this exercício (used to reset demo data) */
  const clearEntries = useCallback(() => {
    // Write empty array instead of removing the key — removing would re-trigger
    // the 2024 seed on next render because the useEffect checks for key absence.
    localStorage.setItem(key, JSON.stringify([]));
    setEntries([]);
  }, [key]);

  /** Delete a RASCUNHO entry (immutability enforced: cannot delete LANÇADO/ANULADO) */
  const deleteEntry = useCallback((entryId: string) => {
    setEntries(prev => {
      const entry = prev.find(e => e.id === entryId);
      if (!entry || entry.estado !== "RASCUNHO") return prev;
      const next = prev.filter(e => e.id !== entryId);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  /** Update a RASCUNHO entry fields (description, lines, date) */
  const updateRascunho = useCallback((
    entryId: string,
    patch: Partial<Pick<JournalEntry, "data" | "descricao" | "tipo" | "modulo" | "linhas" | "totalDebito" | "totalCredito">>
  ) => {
    setEntries(prev => {
      const entry = prev.find(e => e.id === entryId);
      if (!entry || entry.estado !== "RASCUNHO") return prev;
      const next = prev.map(e => e.id === entryId ? { ...e, ...patch } : e);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  return { entries, addEntry, estornar, deleteEntry, updateRascunho, clearEntries, loaded };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function fmtAOA(n: number): string {
  if (n === 0) return "—";
  return n.toLocaleString("pt-PT");
}

export function exportEntriesCSV(entries: JournalEntry[], filename = "diario.csv") {
  const header = ["Nº Diário", "Data", "Descrição", "Tipo", "Módulo", "Total Débito", "Total Crédito", "Estado"];
  const rows = entries.map(e => [
    e.numero, e.data, e.descricao, e.tipo, e.modulo,
    e.totalDebito.toString(), e.totalCredito.toString(), e.estado,
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportEntriesDetailCSV(entries: JournalEntry[], filename = "diario_detalhe.csv") {
  const header = ["Nº Diário", "Data", "Descrição Cabeçalho", "Tipo", "Conta", "Código", "Descrição Linha", "Débito", "Crédito", "Estado"];
  const rows: string[][] = [];
  entries.forEach(e => {
    e.linhas.forEach(l => {
      rows.push([
        e.numero, e.data, e.descricao, e.tipo,
        l.conta, l.contaCod, l.descricao,
        l.debito.toString(), l.credito.toString(), e.estado,
      ]);
    });
  });
  const csv = [header, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
