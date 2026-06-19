// ── PGCA Accounting Engine — Type Definitions ──────────────────────────────────

export interface AccountBalance {
  code: string;
  debit: number;    // accumulated debit movements
  credit: number;   // accumulated credit movements
  nature: "devedora" | "credora";
}

export type BalancesMap = Record<string, AccountBalance>;

/** Financial Statement Row (used by all 6 statements + DFRow renderer) */
export interface FSRow {
  desc: string;
  nota?: string | number;
  n: number;
  n1: number;
  tipo?: "title" | "subtotal" | "total" | "validation" | "indent" | "spacer";
  neg?: boolean;
}

/** Apuramento de Resultados (profit computation) */
export interface ApuramentoResult {
  // Operating
  vendas: number; varProd: number; trabPropria: number; provSupl: number;
  totalProvOp: number;
  cmv: number; fst: number; pessoal: number; outrosCustosOp: number; amortProv: number;
  totalCustosOp: number;
  resultadoOp: number;
  // Financial
  provFin: number; custosFin: number; resultFiliais: number;
  rai: number;
  // Tax
  imposto: number; taxRate: number;
  rlCorrentes: number;
  // Non-operational
  ganhoNaoOp: number; custoNaoOp: number;
  rle: number;  // Resultado Líquido do Exercício
}

/** Modelo 1 — Imposto Industrial row */
export interface Modelo1Row {
  label: string;
  value: number;
  valueN1: number;
  bold?: boolean;
  sep?: boolean;
  indent?: boolean;
}

/** Pre-computed note values for the 49 PGCA notes */
export type NoteValues = Record<string, Record<string, number>>;
