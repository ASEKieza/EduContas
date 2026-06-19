// ── EduContas Utility Functions ───────────────────────────────────────────────

/**
 * Format a number as Angolan Kwanza.
 * - Full:        Kz 1.234.567
 * - Abbreviated: Kz 1,2 M (milhões), Kz 1,5 Mil M (mil milhões),
 *                Kz 2,3 B (bilhões), Kz 1,1 T (trilhões)
 */
export function fmtKz(value: number, abbreviated = false): string {
  if (abbreviated) {
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (abs >= 1_000_000_000_000_000_000) {
      return `${sign}Kz ${(abs / 1_000_000_000_000_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} T`;
    }
    if (abs >= 1_000_000_000_000) {
      return `${sign}Kz ${(abs / 1_000_000_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} B`;
    }
    if (abs >= 1_000_000_000) {
      return `${sign}Kz ${(abs / 1_000_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} Mil M`;
    }
    if (abs >= 1_000_000) {
      return `${sign}Kz ${(abs / 1_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })} M`;
    }
    return `${sign}Kz ${abs.toLocaleString("pt-PT")}`;
  }
  return `Kz ${value.toLocaleString("pt-PT")}`;
}

/**
 * Format a number as Kz with full denomination label for KPI cards.
 * Returns { value: "1.234.567", suffix: "" } or { value: "1,2", suffix: "M" } etc.
 */
export function fmtKzParts(value: number): { value: string; suffix: string } {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000_000_000_000) {
    return { value: `${sign}${(abs / 1_000_000_000_000_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}`, suffix: "T" };
  }
  if (abs >= 1_000_000_000_000) {
    return { value: `${sign}${(abs / 1_000_000_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}`, suffix: "B" };
  }
  if (abs >= 1_000_000_000) {
    return { value: `${sign}${(abs / 1_000_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}`, suffix: "Mil M" };
  }
  if (abs >= 1_000_000) {
    return { value: `${sign}${(abs / 1_000_000).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}`, suffix: "M" };
  }
  return { value: `${sign}${abs.toLocaleString("pt-PT")}`, suffix: "" };
}

/**
 * Format a date string (ISO) as short Portuguese label.
 */
export function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

/**
 * Format a month string "YYYY-MM" as "Jan 2024" etc.
 */
export function fmtMes(mes: string): string {
  const [y, m] = mes.split("-");
  const labels = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${labels[(parseInt(m, 10) - 1) % 12]} ${y}`;
}
