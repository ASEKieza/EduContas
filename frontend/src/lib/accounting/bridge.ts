// ── PGCA Bridge: Original (Decreto 82/01) → Revised (Engine) codes ────────────
// Journal entries use original PGCA codes (Cl.4 = Meios Monetários, Cl.3 = Terceiros, etc.)
// The accounting engine expects revised codes (Cl.1 = Disponibilidades, Cl.2 = Dívidas, etc.)
// This module bridges the two systems so real journal data feeds financial statements.

import type { BalancesMap } from "./types";
import type { JournalEntry, PGCAAccount } from "../journal";

// Sorted most-specific first so prefix matching works correctly
const PREFIX_MAP: Array<[string, string]> = [
  // ── Class 4 → Class 1 (Meios Monetários → Disponibilidades) ────────────────
  ["45", "11"],          // Caixa
  ["41", "12"],          // Depósitos à ordem
  ["43", "12"],          // Bancos C/C
  ["46", "13"],          // Depósitos a prazo

  // ── Class 3 → Class 2 (Terceiros → Dívidas de Terceiros) ───────────────────
  ["31.1", "21.1"],      // Clientes correntes
  ["31.8", "21.2"],      // Clientes cobrança duvidosa
  ["31.9", "21.1"],      // Adiantamentos de clientes
  ["32.1", "22.1"],      // Fornecedores
  ["32.9", "26.1"],      // Adiantamentos a fornecedores
  ["33.1.1", "23.1"],    // Empréstimos bancários CP (moeda nacional)
  ["33.1.2", "23.2"],    // Empréstimos bancários MLP (moeda estrangeira)
  ["34.5.7", "24.1"],    // IVA a recuperar (activo)
  ["34.5.1", "24.1"],    // IVA suportado dedutível (activo)
  ["34.5.3", "24.2"],    // IVA liquidado (passivo)
  ["34.5.5", "24.2"],    // IVA apuramento
  ["34.5.6", "24.2"],    // IVA a pagar
  ["34.1",   "24.5"],    // Imposto Industrial (passivo)
  ["34.3",   "24.3"],    // IRT a pagar
  ["34.4",   "24.4"],    // INSS a pagar
  ["36.1",   "24.3"],    // Remunerações a pagar (agrupado com IRT para simplificar)
  ["36.3",   "26.1"],    // Adiantamentos ao pessoal (activo)
  ["37",     "22.1"],    // Credores por imobilizado
  ["38.1",   "27.1"],    // Acréscimos de custos
  ["38.2",   "27.2"],    // Proveitos diferidos

  // ── Class 2 → Class 3 (Existências) ────────────────────────────────────────
  ["26",     "31"],      // Mercadorias
  ["22.1",   "34"],      // Matérias-primas
  ["24.1",   "31"],      // Produtos acabados
  ["21.1",   "34"],      // Compras (conta transitória)
  ["28.2",   "36"],      // Adiantamentos s/ compras
  ["29",     "28.3"],    // Provisões deprec. existências

  // ── Class 1 → Class 4 (Meios Fixos → Imobilizações) ────────────────────────
  ["18.1.2", "48.3.1"],  // Amort. acum. edifícios
  ["18.1.3", "48.3.2"],  // Amort. acum. equip. básico
  ["18.1.4", "48.3.3"],  // Amort. acum. equip. transporte
  ["18.1.5", "48.3.4"],  // Amort. acum. equip. administrativo
  ["18.2",   "48.2"],    // Amort. acum. incorpóreas
  ["18",     "48"],      // Amortizações acumuladas (fallback)
  ["19",     "48"],      // Provisões investimentos financeiros
  ["11.1",   "43.1"],    // Terrenos e recursos naturais
  ["11.2",   "43.2"],    // Edifícios e outras construções
  ["11.3",   "44.1"],    // Equipamento básico/industrial
  ["11.4",   "44.2"],    // Equipamento de transporte
  ["11.5",   "44.3"],    // Equipamento administrativo
  ["12.3",   "42.1"],    // Propriedade industrial
  ["12",     "42"],      // Imobilizações incorpóreas (fallback)
  ["13",     "41"],      // Investimentos financeiros
  ["14",     "49"],      // Imobilizações em curso

  // ── Class 5 remaps ──────────────────────────────────────────────────────────
  ["59",     "57.1"],    // Dividendos antecipados → Resultados transitados

  // ── Class 7: amortizações lançadas em 73 → 78.2 ─────────────────────────────
  ["73",     "78.2"],
];

// Build a lookup sorted by prefix length descending (most specific first)
const SORTED_MAP = [...PREFIX_MAP].sort((a, b) => b[0].length - a[0].length);

function mapToEngineCode(original: string): string {
  for (const [from, to] of SORTED_MAP) {
    if (original === from || original.startsWith(from + ".")) {
      const remainder = original.slice(from.length); // e.g. ".1" or ""
      return to + remainder;
    }
  }
  return original; // Classes 5, 6, 7, 8 use the same codes in both systems
}

/**
 * Converts an array of real journal entries into a BalancesMap
 * compatible with the accounting engine (revised PGCA codes).
 *
 * ANULADO entries are excluded; LANÇADO and RASCUNHO are included.
 */
export function journalEntriesToBalancesMap(
  entries: JournalEntry[],
  accounts: PGCAAccount[]
): BalancesMap {
  const raw: Record<string, { debit: number; credit: number; nature: "devedora" | "credora" }> = {};

  for (const entry of entries) {
    if (entry.estado === "ANULADO") continue;
    for (const line of entry.linhas) {
      const code = line.contaCod;
      if (!code || typeof code !== "string") continue; // skip lines with no account code

      if (!raw[code]) {
        const acc = accounts.find(a => a.code === code);
        raw[code] = { debit: 0, credit: 0, nature: acc?.nature ?? "devedora" };
      }
      raw[code].debit  += line.debito  ?? 0;
      raw[code].credit += line.credito ?? 0;
    }
  }

  const result: BalancesMap = {};
  for (const [origCode, bal] of Object.entries(raw)) {
    if (!origCode) continue; // paranoia guard
    const engCode = mapToEngineCode(origCode);
    if (!result[engCode]) {
      result[engCode] = { code: engCode, debit: 0, credit: 0, nature: bal.nature };
    }
    result[engCode].debit  += bal.debit;
    result[engCode].credit += bal.credit;
  }

  return result;
}

/** True if the journal produced any mapped account data at all */
export function hasJournalData(map: BalancesMap): boolean {
  return Object.keys(map).length > 0;
}
