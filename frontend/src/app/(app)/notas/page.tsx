"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { computeNoteValues, buildModelo1, sum } from "@/lib/accounting/engine";
import { DATASETS, ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { journalEntriesToBalancesMap, hasJournalData } from "@/lib/accounting/bridge";
import { useJournal, JOURNAL_ACCOUNTS } from "@/lib/journal";
import type { BalancesMap } from "@/lib/accounting/types";

// ── Types ──────────────────────────────────────────────────────────────────────
type NotaCat = "politicas" | "ativo" | "cp" | "dr" | "dfc" | "outras";
type NoteType = "movement" | "staff" | "tax" | "breakdown" | "aged" | "cash" | "narrative" | "table";
type ValRow = { n: number; n1: number } | null;
type NV = ReturnType<typeof computeNoteValues>;

interface NotaDef {
  num: string;
  titulo: string;
  cat: NotaCat;
  contas?: string;
  desc: string;
  tipo?: NoteType;
  rows?: { label: string; sub?: boolean; total?: boolean; sep?: boolean }[];
}

// ── 49 Notas PGCA ─────────────────────────────────────────────────────────────
const NOTAS: NotaDef[] = [
  // ─── Políticas Contabilísticas ────────────────────────────────────────────
  { num:"01", titulo:"Actividade da Empresa", cat:"politicas",
    desc:"Identificação, objecto social, sede, NIF, CAE, número de trabalhadores, referencial contabilístico aplicado e enquadramento PGCA/IFRS.", tipo:"narrative" },
  { num:"02", titulo:"Bases de Preparação das DF", cat:"politicas",
    desc:"Bases de preparação, moeda funcional (Kz), convenção do custo histórico, pressupostos de continuidade e acréscimo.", tipo:"narrative" },
  { num:"03", titulo:"Alterações de Políticas Contabilísticas", cat:"politicas", contas:"81.x.3, 81.x.4",
    desc:"Natureza, justificação e impacto quantificado das alterações; correcção de erros fundamentais.", tipo:"narrative" },

  // ─── Balanço — Activo ─────────────────────────────────────────────────────
  { num:"04", titulo:"Imobilizações Corpóreas", cat:"ativo", contas:"43.x, 44.x",
    desc:"Movimento do imobilizado corpóreo e respectivas amortizações acumuladas.",
    tipo:"movement",
    rows:[
      { label:"Terrenos e recursos naturais" }, { label:"Edifícios e outras construções" },
      { label:"Equipamento básico" }, { label:"Equipamento de transporte" },
      { label:"Ferramentas e utensílios" }, { label:"Equipamento administrativo" },
      { label:"Taras e vasilhame" }, { label:"Outros imobilizados corpóreos" },
      { label:"Imobilizações em curso" }, { label:"TOTAL", total:true },
    ]},
  { num:"05", titulo:"Imobilizações Incorpóreas", cat:"ativo", contas:"42.x",
    desc:"Movimento das imobilizações incorpóreas: custos de constituição, investigação, desenvolvimento, propriedade industrial e outros.",
    tipo:"movement",
    rows:[
      { label:"Custos de constituição e de aumento de capital" },
      { label:"Custos de investigação e de desenvolvimento" },
      { label:"Propriedade industrial e outros direitos" },
      { label:"Trespasses" }, { label:"Imobilizações em curso" },
      { label:"TOTAL", total:true },
    ]},
  { num:"06", titulo:"Investimentos Financeiros", cat:"ativo", contas:"41.x",
    desc:"Participações de capital em filiais, associadas e outras; empréstimos concedidos; títulos e outros investimentos.",
    tipo:"table",
    rows:[
      { label:"Partes de capital em empresas do grupo" }, { label:"Partes de capital em empresas associadas" },
      { label:"Partes de capital — outras" }, { label:"Empréstimos a empresas do grupo" },
      { label:"Títulos e outros activos financeiros" }, { label:"TOTAL", total:true },
    ]},
  { num:"07", titulo:"Existências", cat:"ativo", contas:"31.x–36.x",
    desc:"Desdobramento das existências por natureza; critério de valorimetria adoptado; provisões para depreciação.",
    tipo:"table",
    rows:[
      { label:"Mercadorias" }, { label:"Matérias-primas, subsidiárias e de consumo" },
      { label:"Produtos acabados e intermédios" }, { label:"Subprodutos, desperdícios e resíduos" },
      { label:"Produtos e trabalhos em curso" }, { label:"Activos biológicos — existências" },
      { label:"Sub-total (valor bruto)", total:true },
      { label:"(-) Provisões para depreciação", sub:true },
      { label:"TOTAL LÍQUIDO", total:true },
    ]},
  { num:"08", titulo:"Dívidas de Terceiros — Curto Prazo", cat:"ativo", contas:"21.x, 22.x, 24.x, 26.x",
    desc:"Clientes, adiantamentos, Estado e outros devedores com vencimento ≤ 1 ano; provisões para cobranças duvidosas.",
    tipo:"aged",
    rows:[
      { label:"Clientes — conta corrente" }, { label:"Clientes — títulos a receber" },
      { label:"Clientes de cobrança duvidosa" }, { label:"Adiantamentos a fornecedores" },
      { label:"Estado e outros entes públicos — activo" }, { label:"Sócios / Accionistas" },
      { label:"Outros devedores" }, { label:"Sub-total", total:true },
      { label:"(-) Provisões para cobranças duvidosas", sub:true },
      { label:"TOTAL LÍQUIDO", total:true },
    ]},
  { num:"09", titulo:"Dívidas de Terceiros — Médio e Longo Prazo", cat:"ativo", contas:"25.x",
    desc:"Dívidas com vencimento > 1 ano; garantias associadas.",
    tipo:"table",
    rows:[
      { label:"Empréstimos a filiais e associadas" }, { label:"Outros devedores — M/L prazo" },
      { label:"TOTAL", total:true },
    ]},
  { num:"10", titulo:"Títulos Negociáveis", cat:"ativo", contas:"15.x",
    desc:"Composição da carteira de títulos; critério de valorização; mais/menos-valias potenciais não realizadas.",
    tipo:"table",
    rows:[
      { label:"Acções e partes de capital" }, { label:"Obrigações e títulos de dívida" },
      { label:"Títulos da dívida pública angolana" }, { label:"Outros títulos" },
      { label:"TOTAL", total:true },
    ]},
  { num:"11", titulo:"Disponibilidades", cat:"ativo", contas:"11.x, 12.x, 13.x",
    desc:"Caixa, depósitos à ordem e a prazo; saldo por instituição financeira; moeda estrangeira detida.",
    tipo:"cash",
    rows:[
      { label:"Caixa eM Kz" }, { label:"Caixa em moeda estrangeira" },
      { label:"Depósitos à ordem" }, { label:"Depósitos a prazo" },
      { label:"Outros meios financeiros líquidos" }, { label:"TOTAL", total:true },
    ]},

  // ─── Balanço — Capital Próprio e Passivo ──────────────────────────────────
  { num:"12", titulo:"Capital Próprio", cat:"cp", contas:"51.x–57.x",
    desc:"Capital social subscrito, acções/quotas próprias, prestações suplementares, reservas e resultados transitados.",
    tipo:"table",
    rows:[
      { label:"Capital social subscrito" }, { label:"Acções/quotas próprias (–)" },
      { label:"Prestações suplementares" }, { label:"Prémios de emissão" },
      { label:"Reserva legal" }, { label:"Reservas estatutárias" },
      { label:"Outras reservas" }, { label:"Reservas de reavaliação" },
      { label:"Resultados transitados" }, { label:"Resultado líquido do exercício" },
      { label:"TOTAL", total:true },
    ]},
  { num:"13", titulo:"Prestações Suplementares", cat:"cp", contas:"53.x",
    desc:"Natureza, remuneração (se aplicável) e condições de restituição das prestações suplementares.", tipo:"narrative" },
  { num:"14", titulo:"Provisões para Riscos e Encargos", cat:"cp", contas:"29.x",
    desc:"Movimento das provisões para riscos e encargos: saldo inicial, dotações, reversões, utilizações, saldo final.",
    tipo:"movement",
    rows:[
      { label:"Provisões para pensões e obrigações similares" },
      { label:"Provisões para imposto sobre os rendimentos" },
      { label:"Outras provisões para riscos e encargos" },
      { label:"TOTAL", total:true },
    ]},
  { num:"15", titulo:"Dívidas a Terceiros — Curto Prazo", cat:"cp", contas:"22.x, 23.x, 24.x",
    desc:"Fornecedores, adiantamentos de clientes, Estado e outros credores com vencimento ≤ 1 ano.",
    tipo:"aged",
    rows:[
      { label:"Fornecedores — conta corrente" }, { label:"Fornecedores — títulos a pagar" },
      { label:"Adiantamentos de clientes" }, { label:"Estado e outros entes públicos — passivo" },
      { label:"Sócios / Accionistas" }, { label:"Outros credores" },
      { label:"TOTAL", total:true },
    ]},
  { num:"16", titulo:"Dívidas a Terceiros — Médio e Longo Prazo", cat:"cp", contas:"23.x, 25.x",
    desc:"Empréstimos e dívidas com vencimento > 1 ano; garantias prestadas; condições de crédito e taxas de juro.",
    tipo:"table",
    rows:[
      { label:"Empréstimos bancários" }, { label:"Empréstimos obrigacionistas" },
      { label:"Empréstimos de filiais e associadas" }, { label:"Outros financiamentos" },
      { label:"TOTAL", total:true },
    ]},
  { num:"17", titulo:"Acréscimos e Diferimentos", cat:"cp", contas:"27.x",
    desc:"Acréscimos de custos, proveitos diferidos e outras rubricas de regularização.",
    tipo:"table",
    rows:[
      { label:"Acréscimos de custos" }, { label:"Proveitos diferidos" },
      { label:"Acréscimos de proveitos" }, { label:"Custos diferidos" },
      { label:"TOTAL", total:true },
    ]},
  { num:"18", titulo:"Garantias Prestadas e Recebidas", cat:"cp",
    desc:"Avales, fianças, hipotecas e outras garantias que não figuram no balanço; natureza, beneficiário e montante.", tipo:"narrative" },
  { num:"19", titulo:"Amortizações Acumuladas", cat:"ativo", contas:"48.x",
    desc:"Mapa de amortizações por classe de activo; taxas fiscais vs. taxas contabilísticas; método de amortização.",
    tipo:"movement",
    rows:[
      { label:"Imobilizações incorpóreas — amortizações" },
      { label:"Imobilizações corpóreas — edifícios e construções" },
      { label:"Imobilizações corpóreas — equipamento básico" },
      { label:"Imobilizações corpóreas — equipamento de transporte" },
      { label:"Imobilizações corpóreas — outros" },
      { label:"TOTAL AMORTIZAÇÕES ACUMULADAS", total:true },
    ]},
  { num:"20", titulo:"Provisões Acumuladas", cat:"cp", contas:"28.x, 29.x",
    desc:"Provisões para depreciação de imobilizações, existências e dívidas a receber; movimento do exercício.",
    tipo:"movement",
    rows:[
      { label:"Provisões para depreciação de imobilizações" },
      { label:"Provisões para depreciação de existências" },
      { label:"Provisões para cobranças duvidosas" },
      { label:"TOTAL", total:true },
    ]},
  { num:"21", titulo:"Subsídios do Estado", cat:"cp", contas:"57.x",
    desc:"Subsídios de investimento e de exploração; condições de reconhecimento; imputação ao resultado do exercício.",
    tipo:"table",
    rows:[
      { label:"Subsídios ao investimento" }, { label:"Subsídios à exploração" },
      { label:"Outros subsídios e apoios governamentais" }, { label:"TOTAL", total:true },
    ]},

  // ─── Demonstração de Resultados ───────────────────────────────────────────
  { num:"22", titulo:"Vendas e Prestações de Serviços", cat:"dr", contas:"61.x, 62.x",
    desc:"Desdobramento por natureza (vendas vs. serviços), mercado (interno / exportação) e segmento de actividade.",
    tipo:"breakdown",
    rows:[
      { label:"Vendas de mercadorias" }, { label:"Vendas de produtos acabados" },
      { label:"Prestações de serviços" }, { label:"Sub-total — Mercado interno", total:true },
      { label:"Vendas de exportação" }, { label:"Serviços ao exterior" },
      { label:"Sub-total — Exportação", total:true },
      { label:"TOTAL VENDAS + PSv", total:true },
    ]},
  { num:"23", titulo:"Variação da Produção", cat:"dr", contas:"63.x",
    desc:"Variação de produtos acabados e em curso de fabrico; critério de valorimetria e movimento do exercício.",
    tipo:"table",
    rows:[
      { label:"Variação de produtos acabados e intermédios" },
      { label:"Variação de produtos e trabalhos em curso" },
      { label:"TOTAL", total:true },
    ]},
  { num:"24", titulo:"Trabalhos para a Própria Empresa", cat:"dr", contas:"64.x",
    desc:"Natureza dos trabalhos; critério de reconhecimento como imobilizado; montantes activados.", tipo:"narrative" },
  { num:"25", titulo:"Proveitos Suplementares", cat:"dr", contas:"65.x",
    desc:"Proveitos de natureza não recorrente ou acessória: rendas, royalties, serviços prestados, subsídios.",
    tipo:"table",
    rows:[
      { label:"Rendas e alugueres" }, { label:"Royalties e licenças" },
      { label:"Prestações de serviços acessórias" }, { label:"Subsídios ao custo dos serviços" },
      { label:"Outros proveitos suplementares" }, { label:"TOTAL", total:true },
    ]},
  { num:"26", titulo:"CMV e Matérias Consumidas", cat:"dr", contas:"71.x",
    desc:"Custo das mercadorias vendidas e das matérias consumidas; método de custeio adoptado (FIFO, CMP).",
    tipo:"table",
    rows:[
      { label:"Custo das mercadorias vendidas" }, { label:"Matérias-primas consumidas" },
      { label:"Matérias subsidiárias e de consumo" }, { label:"TOTAL", total:true },
    ]},
  { num:"27", titulo:"Fornecimentos e Serviços de Terceiros", cat:"dr", contas:"75.2.x",
    desc:"Desdobramento por natureza; contratos plurianuais significativos; prestadores relevantes.",
    tipo:"breakdown",
    rows:[
      { label:"Electricidade, água e combustíveis" }, { label:"Comunicações" },
      { label:"Rendas e alugueres" }, { label:"Seguros" },
      { label:"Honorários e consultoria" }, { label:"Publicidade e propaganda" },
      { label:"Conservação e reparação" }, { label:"Transportes de mercadorias" },
      { label:"Deslocações, estadas e representação" }, { label:"Outros FST" },
      { label:"TOTAL FST", total:true },
    ]},
  { num:"28", titulo:"Custos com o Pessoal", cat:"dr", contas:"72.x",
    desc:"Remunerações brutas, encargos sociais (INSS), outros custos; número médio de trabalhadores por categoria.",
    tipo:"staff",
    rows:[
      { label:"Remunerações dos órgãos sociais" }, { label:"Remunerações do pessoal" },
      { label:"Encargos sobre remunerações — INSS (patronal)" },
      { label:"Seguros de acidentes de trabalho" }, { label:"Subsídios de alimentação" },
      { label:"Outros custos com o pessoal" }, { label:"TOTAL", total:true },
    ]},
  { num:"29", titulo:"Outros Custos e Perdas Operacionais", cat:"dr", contas:"75.3.x, 75.4.x",
    desc:"Impostos e taxas; outros custos e perdas operacionais não enquadrados noutras rubricas.",
    tipo:"table",
    rows:[
      { label:"Impostos indirectos (IVA não dedutível, Imposto de Selo)" },
      { label:"Impostos directos (derramas, taxas municipais)" },
      { label:"Perdas em existências" }, { label:"Outros custos operacionais" },
      { label:"TOTAL", total:true },
    ]},
  { num:"30", titulo:"Amortizações e Provisões do Exercício", cat:"dr", contas:"78.x",
    desc:"Amortizações do imobilizado e provisões constituídas no exercício; métodos, taxas e bases de cálculo.",
    tipo:"table",
    rows:[
      { label:"Amortizações de imobilizações incorpóreas" },
      { label:"Amortizações de imobilizações corpóreas" },
      { label:"Provisões para cobranças duvidosas" },
      { label:"Provisões para depreciação de existências" },
      { label:"Provisões para riscos e encargos" },
      { label:"TOTAL", total:true },
    ]},
  { num:"31", titulo:"Proveitos e Ganhos Financeiros", cat:"dr", contas:"66.x",
    desc:"Juros e proveitos similares; ganhos cambiais realizados e não realizados; dividendos recebidos.",
    tipo:"table",
    rows:[
      { label:"Juros de depósitos e aplicações" }, { label:"Dividendos e lucros recebidos" },
      { label:"Ganhos cambiais" }, { label:"Proveitos de títulos e participações" },
      { label:"Outros proveitos e ganhos financeiros" }, { label:"TOTAL", total:true },
    ]},
  { num:"32", titulo:"Custos e Perdas Financeiras", cat:"dr", contas:"76.x",
    desc:"Juros e custos similares; perdas cambiais; comissões bancárias; outros custos financeiros.",
    tipo:"table",
    rows:[
      { label:"Juros de empréstimos bancários" }, { label:"Juros de outros financiamentos" },
      { label:"Perdas cambiais" }, { label:"Comissões e encargos bancários" },
      { label:"Outros custos e perdas financeiras" }, { label:"TOTAL", total:true },
    ]},
  { num:"33", titulo:"Proveitos e Ganhos Não Operacionais", cat:"dr", contas:"67.x",
    desc:"Mais-valias na alienação de imobilizados; ganhos extraordinários e outros resultados não operacionais.",
    tipo:"table",
    rows:[
      { label:"Mais-valias na alienação de imobilizados" },
      { label:"Ganhos em activos financeiros" }, { label:"Subsídios extraordinários" },
      { label:"Outros proveitos não operacionais" }, { label:"TOTAL", total:true },
    ]},
  { num:"34", titulo:"Custos e Perdas Não Operacionais", cat:"dr", contas:"79.x",
    desc:"Menos-valias na alienação de activos; perdas extraordinárias; outros resultados não operacionais.",
    tipo:"table",
    rows:[
      { label:"Menos-valias na alienação de imobilizados" },
      { label:"Perdas em activos financeiros" }, { label:"Perdas em insolvências" },
      { label:"Outros custos não operacionais" }, { label:"TOTAL", total:true },
    ]},
  { num:"35", titulo:"Imposto sobre os Rendimentos", cat:"dr", contas:"87.x",
    desc:"Apuramento do Imposto Industrial; base tributável; deduções; taxa efectiva; imposto diferido (se aplicável).",
    tipo:"tax" },

  // ─── Outras Divulgações ───────────────────────────────────────────────────
  { num:"36", titulo:"Resultados Extraordinários", cat:"outras", contas:"67.x, 79.x",
    desc:"Natureza, origem e quantificação dos resultados de carácter extraordinário ou não recorrente.", tipo:"narrative" },
  { num:"37", titulo:"Partes Relacionadas", cat:"outras",
    desc:"Identificação de partes relacionadas (accionistas, administradores, filiais, associadas); transacções e saldos de balanço.", tipo:"narrative" },
  { num:"38", titulo:"Acontecimentos Após a Data do Balanço", cat:"outras",
    desc:"Eventos ajustantes e não ajustantes ocorridos entre a data do balanço e a aprovação das DF.", tipo:"narrative" },
  { num:"39", titulo:"Divulgações Ambientais", cat:"outras",
    desc:"Custos ambientais, provisões e passivos; política de gestão ambiental; compromissos de investimento.", tipo:"narrative" },
  { num:"40", titulo:"Instrumentos Financeiros", cat:"outras", contas:"15.x, 25.x",
    desc:"Políticas de gestão de risco (crédito, liquidez, mercado, cambial); justo valor dos instrumentos.",
    tipo:"table",
    rows:[
      { label:"Activos financeiros ao justo valor" }, { label:"Activos financeiros ao custo amortizado" },
      { label:"Passivos financeiros ao custo amortizado" }, { label:"Derivados e outros" },
      { label:"TOTAL", total:true },
    ]},
  { num:"41", titulo:"Concentrações Empresariais", cat:"outras",
    desc:"Aquisições e fusões concluídas; método de contabilização (compra); goodwill ou ganho por compra vantajosa.", tipo:"narrative" },
  { num:"42", titulo:"Contratos de Construção", cat:"outras", contas:"62.x",
    desc:"Grau de acabamento; proveitos, custos e resultados reconhecidos no exercício; adiantamentos e retenções.",
    tipo:"table",
    rows:[
      { label:"Proveitos reconhecidos no exercício" }, { label:"Custos reconhecidos no exercício" },
      { label:"Resultado reconhecido" }, { label:"Adiantamentos recebidos" },
      { label:"Montante bruto — activo" }, { label:"Montante bruto — passivo" },
    ]},

  // ─── DFC ──────────────────────────────────────────────────────────────────
  { num:"43", titulo:"Políticas Contabilísticas para a DFC", cat:"dfc",
    desc:"Método adoptado (directo/indirecto); definição de caixa e equivalentes; transacções excluídas por classificação.", tipo:"narrative" },
  { num:"44", titulo:"Actividades Descontinuadas", cat:"outras",
    desc:"Resultados, activos, passivos e fluxos de caixa associados a actividades descontinuadas ou em descontinuação.", tipo:"narrative" },
  { num:"45", titulo:"Contratos de Locação Financeira", cat:"outras", contas:"43.x",
    desc:"Activos em locação financeira; responsabilidades futuras mínimas; taxa de juro implícita; reconciliação.",
    tipo:"table",
    rows:[
      { label:"Rendas futuras mínimas — Até 1 ano" }, { label:"Rendas futuras mínimas — 1 a 5 anos" },
      { label:"Rendas futuras mínimas — Mais de 5 anos" }, { label:"Total rendas futuras", total:true },
      { label:"(-) Encargos financeiros futuros", sub:true },
      { label:"Valor actual das obrigações de locação", total:true },
    ]},
  { num:"46", titulo:"Contratos de Arrendamento Operacional", cat:"outras",
    desc:"Rendas operacionais futuras mínimas; duração dos contratos; descrição dos arrendamentos significativos.",
    tipo:"table",
    rows:[
      { label:"Até 1 ano" }, { label:"De 1 a 5 anos" }, { label:"Mais de 5 anos" },
      { label:"Total", total:true },
    ]},
  { num:"47", titulo:"Caixa e seus Equivalentes", cat:"dfc", contas:"11.x, 12.x, 13.x",
    desc:"Composição e reconciliação do saldo de caixa e equivalentes de caixa no início e no fim do exercício.",
    tipo:"cash",
    rows:[
      { label:"Caixa" }, { label:"Depósitos bancários à ordem" },
      { label:"Aplicações de tesouraria (< 3 meses)" }, { label:"Cheques e vales postais" },
      { label:"Outros equivalentes de caixa" },
      { label:"(–) Descobertos bancários", sub:true },
      { label:"CAIXA E EQUIV. DE CAIXA — FIM", total:true },
      { sep:true, label:"" },
      { label:"CAIXA E EQUIV. DE CAIXA — INÍCIO", total:true },
      { label:"VARIAÇÃO DO EXERCÍCIO", total:true },
    ]},
  { num:"48", titulo:"Transacções em Moeda Estrangeira", cat:"outras",
    desc:"Política cambial; taxas de câmbio utilizadas (BNA); diferenças de câmbio reconhecidas em resultados ou capital.",
    tipo:"table",
    rows:[
      { label:"Activos em USD" }, { label:"Activos em EUR" }, { label:"Outros activos em ME" },
      { label:"Passivos em USD" }, { label:"Passivos em EUR" }, { label:"Outros passivos em ME" },
      { label:"Posição cambial líquida", total:true },
    ]},
  { num:"49", titulo:"Outras Informações sobre a DFC", cat:"dfc",
    desc:"Transacções não monetárias significativas excluídas da DFC; aquisições de activos por locação financeira; outros.", tipo:"narrative" },
];

// ── Constants ─────────────────────────────────────────────────────────────────
const CAT_LABELS: Record<NotaCat, string> = {
  politicas: "Políticas Contabilísticas",
  ativo:     "Balanço — Activo",
  cp:        "Balanço — CP e Passivo",
  dr:        "Demonstração de Resultados",
  dfc:       "Fluxos de Caixa",
  outras:    "Outras Divulgações",
};
const CAT_COLORS: Record<NotaCat, { bg: string; text: string; border: string }> = {
  politicas: { bg:"bg-blue-50",   text:"text-blue-700",   border:"border-blue-200" },
  ativo:     { bg:"bg-emerald-50",text:"text-emerald-700", border:"border-emerald-200" },
  cp:        { bg:"bg-purple-50", text:"text-purple-700",  border:"border-purple-200" },
  dr:        { bg:"bg-amber-50",  text:"text-amber-700",   border:"border-amber-200" },
  dfc:       { bg:"bg-cyan-50",   text:"text-cyan-700",    border:"border-cyan-200" },
  outras:    { bg:"bg-gray-50",   text:"text-gray-600",    border:"border-gray-200" },
};
const CATS: (NotaCat | "all")[] = ["all","politicas","ativo","cp","dr","dfc","outras"];

// ── localStorage hook ──────────────────────────────────────────────────────────
function useNotasTextos(ano: string) {
  const key = `educontas-notas-${ano}`;
  const [textos, setTextos] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      setTextos(stored ? (JSON.parse(stored) as Record<string, string>) : {});
    } catch { setTextos({}); }
  }, [key]);

  const setTexto = useCallback((num: string, text: string) => {
    setTextos(prev => {
      const next = { ...prev, [num]: text };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* quota exceeded */ }
      return next;
    });
  }, [key]);

  return { textos, setTexto };
}

// ── Nota values mapping ────────────────────────────────────────────────────────
function getNoteVals(num: string, nv: NV, cur: BalancesMap, pri: BalancesMap): ValRow[] | undefined {
  const _ = null as ValRow;
  const v = (n: number, n1: number): ValRow => ({ n, n1 });
  const neg = (r: ValRow): ValRow => r ? { n: -r.n, n1: -r.n1 } : null;

  switch (num) {
    // ── Balanço — Activo ────────────────────────────────────────────────────────

    case "04":
      // Imobilizações Corpóreas — movement table (10 rows)
      // Terrenos | Edifícios | Eq.básico | Eq.transporte | Ferramentas | Eq.admin | Taras | Outros | Em curso | TOTAL
      return [
        nv["04"].terrenos,   nv["04"].edificios, nv["04"].eqBasico,
        nv["04"].eqTransp,   _,                  nv["04"].eqAdmin,
        _, _, _,
        nv["04"].grossTotal,
      ];

    case "05":
      // Imobilizações Incorpóreas — movement table (6 rows)
      // Custos constituição | Investigação | Propriedade industrial | Trespasses | Em curso | TOTAL
      return [_, _, nv["05"].propriedade, _, _, nv["05"].grossTotal];

    case "06":
      return [_, _, _, _, _, nv["06"].total];

    case "07":
      // Existências — table (9 rows)
      return [
        nv["07"].mercadorias, nv["07"].materiasPrimas, _, _, _, _,
        nv["07"].grossTotal,
        neg(nv["07"].provisoes),
        nv["07"].netTotal,
      ];

    case "08":
      // Dívidas de Terceiros CP — aged table (10 rows; vals shown in TOTAL column)
      // Clientes c/c | Clientes títulos | Clientes duvidosa | Adiant.forn | Estado activo | Sócios | Outros | Sub-total | Provisões | TOTAL LÍQ
      return [
        nv["08"].clientes,
        _,
        _,
        _,
        v(sum(cur,"24.1"), sum(pri,"24.1")),
        _,
        nv["08"].outrosDeved,
        v(nv["08"].clientes.n + nv["08"].outrosDeved.n, nv["08"].clientes.n1 + nv["08"].outrosDeved.n1),
        neg(nv["08"].provisoes),
        nv["08"].netTotal,
      ];

    case "10":
      return [_, _, _, _, v(sum(cur,"15"), sum(pri,"15"))];

    case "11": {
      const dOrd = v(sum(cur,"12"), sum(pri,"12"));
      const dPrz = v(sum(cur,"13"), sum(pri,"13"));
      return [nv["11"].caixa, _, dOrd, dPrz, _, nv["11"].total];
    }

    // ── Balanço — Capital Próprio e Passivo ─────────────────────────────────────

    case "12":
      return [
        nv["12"].capital, _, _, _,
        v(sum(cur,"52.1"), sum(pri,"52.1")),
        _,
        v(sum(cur,"55.1"), sum(pri,"55.1")),
        _,
        nv["12"].transitados,
        nv["12"].resultado,
        nv["12"].total,
      ];

    case "14":
      // Provisões p/ Riscos e Encargos — movement table (4 rows)
      return [_, _, _, nv["14"].total];

    case "15":
      // Dívidas a Terceiros CP — aged table (7 rows; vals shown in TOTAL column)
      // Fornecedores c/c | Fornecedores títulos | Adiant.clientes | Estado passivo | Sócios | Outros credores | TOTAL
      return [
        nv["15"].fornecedores,
        _,
        _,
        nv["15"].estado,
        _,
        nv["15"].empCp,
        nv["15"].total,
      ];

    case "16":
      return [nv["16"].total, _, _, _, nv["16"].total];

    case "17":
      return [nv["17"].acrescCustos, nv["17"].provDiferidos, _, _, nv["17"].total];

    case "19":
      // Amortizações Acumuladas — movement table (6 rows)
      // Incorpóreas | Edifícios | Eq.básico | Eq.transporte | Outros | TOTAL
      return [
        nv["19"].incorp,    nv["19"].edificios,
        nv["19"].eqBasico,  nv["19"].eqTransp,
        _,
        nv["19"].total,
      ];

    case "20": {
      // Provisões Acumuladas — movement table (4 rows)
      const provExist  = nv["07"].provisoes  ?? v(0, 0);
      const provCobr   = nv["08"].provisoes  ?? v(0, 0);
      const totalProv  = v(provExist.n + provCobr.n, provExist.n1 + provCobr.n1);
      return [_, provExist, provCobr, totalProv];
    }

    // ── Demonstração de Resultados ───────────────────────────────────────────────

    case "22":
      return [
        nv["22"].vendas, _, nv["22"].psv,
        v(nv["22"].vendas.n + nv["22"].psv.n, nv["22"].vendas.n1 + nv["22"].psv.n1),
        _, _,
        v(0, 0),
        nv["22"].total,
      ];

    case "23": {
      // Variação da Produção (63.x — conta de regularização)
      const varN  = sum(cur,"63");
      const varN1 = sum(pri,"63");
      return [_, _, v(varN, varN1)];
    }

    case "25":
      return [_, _, _, _, _, nv["25"].total];

    case "26":
      return [nv["26"].mercadorias, _, _, nv["26"].total];

    case "27":
      return [
        nv["27"].elect,      nv["27"].comunic,    nv["27"].rendas,
        nv["27"].seguros,    nv["27"].honorarios, nv["27"].publicidade,
        nv["27"].conservacao,nv["27"].transp,      nv["27"].desloc,
        _,
        nv["27"].total,
      ];

    case "28":
      // Custos com o Pessoal — staff table (7 rows)
      return [
        _,
        nv["28"].remuneracoes,
        nv["28"].inss,
        _, _,
        nv["28"].outros,
        nv["28"].total,
      ];

    case "29": {
      const sN  = sum(cur,"75.3.1.1") + sum(cur,"75.3.1.2");
      const sN1 = sum(pri,"75.3.1.1") + sum(pri,"75.3.1.2");
      return [v(sN, sN1), _, _, _, v(sN, sN1)];
    }

    case "30":
      return [
        nv["30"].amortIncorp, nv["30"].amortCorp,
        nv["30"].provCobrDuv, _, _,
        nv["30"].total,
      ];

    case "31":
      return [_, _, _, _, _, nv["31"].total];

    case "32":
      return [nv["32"].juros, _, nv["32"].cambiais, _, _, nv["32"].total];

    case "33":
      return [_, _, _, _, v(sum(cur,"67"), sum(pri,"67"))];

    case "34":
      return [_, _, _, _, v(sum(cur,"79"), sum(pri,"79"))];

    // ── DFC ─────────────────────────────────────────────────────────────────────

    case "47": {
      const caixa    = v(sum(cur,"11"), sum(pri,"11"));
      const dOrd     = v(sum(cur,"12"), sum(pri,"12"));
      const dPrz     = v(sum(cur,"13"), sum(pri,"13"));
      const fim      = nv["47"].total;
      const inicio   = v(fim.n1, 0);
      const variacao = v(fim.n - fim.n1, 0);
      return [caixa, dOrd, dPrz, _, _, _, fim, _, inicio, variacao];
    }

    default:
      return undefined;
  }
}

// ── Format helpers ─────────────────────────────────────────────────────────────
function fmtV(v: number): string {
  if (v === 0) return "—";
  const abs = Math.abs(v);
  const s = abs.toLocaleString("pt-PT");
  return v < 0 ? `(${s})` : s;
}

// ── ExplicativaEditor ─────────────────────────────────────────────────────────
function ExplicativaEditor({
  num, texto, onChange,
}: { num: string; texto: string; onChange: (t: string) => void }) {
  return (
    <div className="mt-4 pt-3 border-t border-dashed border-gray-200 space-y-2">
      <div className="flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
          Notas Explicativas
        </span>
        {texto.trim().length > 0 && (
          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
            ✓ Guardado
          </span>
        )}
      </div>
      <textarea
        value={texto}
        onChange={e => onChange(e.target.value)}
        placeholder={`Inserir notas e explicações adicionais relativas à Nota ${num}…`}
        className="w-full min-h-[88px] px-3 py-2.5 text-xs border border-indigo-100 rounded-lg resize-y
          focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300
          text-gray-700 bg-white leading-relaxed placeholder-gray-300"
      />
      <p className="text-[10px] text-gray-400">
        Campo de texto livre · Guardado automaticamente no browser ·
        PGCA Angola, Decreto n.º 82/01
      </p>
    </div>
  );
}

// ── Movement Table ─────────────────────────────────────────────────────────────
function MovementTable({ rows, finalVals }: {
  rows: NotaDef["rows"];
  finalVals?: ValRow[];
}) {
  const movCols = ["Saldo Inicial", "Adições", "Abates/Alienaç.", "Transferências"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-700 w-44">Rubrica</th>
            {movCols.map(c => (
              <th key={c} className="text-right px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">{c}</th>
            ))}
            <th className="text-right px-3 py-2 font-semibold text-gray-800 bg-gray-200 whitespace-nowrap">Saldo Final N</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">Saldo Final N-1</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r, i) => r.sep ? (
            <tr key={i}><td colSpan={7} className="py-1 border-t-2 border-gray-300" /></tr>
          ) : (
            <tr key={i} className={r.total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}>
              <td className={`px-3 py-1.5 border-b border-gray-100 ${r.sub ? "pl-7 text-gray-500" : ""}`}>{r.label}</td>
              {movCols.map((_, ci) => (
                <td key={ci} className="text-right px-3 py-1.5 border-b border-gray-100 text-gray-400">—</td>
              ))}
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono font-semibold text-gray-800 bg-gray-50">
                {finalVals?.[i] != null ? fmtV(finalVals[i]!.n) : "—"}
              </td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-500">
                {finalVals?.[i] != null ? fmtV(finalVals[i]!.n1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Simple 2-col Table (N / N-1) ───────────────────────────────────────────────
function SimpleTable({ rows, ano, vals }: {
  rows: NotaDef["rows"];
  ano: string;
  vals?: ValRow[];
}) {
  const anoN1 = String(Number(ano) - 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-700">Rubrica</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-800 w-36">Exerc. N ({ano})</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-600 w-36">Exerc. N-1 ({anoN1})</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r, i) => r.sep ? (
            <tr key={i}><td colSpan={3} className="py-1 border-t-2 border-gray-300" /></tr>
          ) : (
            <tr key={i} className={r.total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}>
              <td className={`px-3 py-1.5 border-b border-gray-100 ${r.sub ? "pl-7 text-gray-500 italic" : ""}`}>
                {r.label}
              </td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-800">
                {vals?.[i] != null ? fmtV(vals[i]!.n) : "—"}
              </td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-600">
                {vals?.[i] != null ? fmtV(vals[i]!.n1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Aged Analysis Table ────────────────────────────────────────────────────────
function AgedTable({ rows, ano, vals }: { rows: NotaDef["rows"]; ano: string; vals?: ValRow[] }) {
  const anoN1 = String(Number(ano) - 1);
  const aging = ["Corrente", "30–60 dias", "61–90 dias", "91–180 dias", "> 180 dias"];
  return (
    <div className="overflow-x-auto space-y-0">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-700 min-w-[180px]">Rubrica</th>
            {aging.map(b => (
              <th key={b} className="text-right px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">{b}</th>
            ))}
            <th className="text-right px-3 py-2 font-bold text-gray-800 whitespace-nowrap bg-gray-200">Total N ({ano})</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">Total N-1 ({anoN1})</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r, i) => r.sep ? (
            <tr key={i}><td colSpan={8} className="py-1 border-t-2 border-gray-300" /></tr>
          ) : (
            <tr key={i} className={r.total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}>
              <td className={`px-3 py-1.5 border-b border-gray-100 ${r.sub ? "pl-7 text-gray-500 italic" : ""}`}>{r.label}</td>
              {aging.map((_, bi) => (
                <td key={bi} className="text-right px-3 py-1.5 border-b border-gray-100 text-gray-300 text-[10px]">—</td>
              ))}
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono font-semibold text-gray-800 bg-gray-50">
                {vals?.[i] != null ? fmtV(vals[i]!.n) : "—"}
              </td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-500">
                {vals?.[i] != null ? fmtV(vals[i]!.n1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {vals && (
        <p className="text-[10px] text-amber-700 bg-amber-50 border-t border-amber-100 px-3 py-1.5">
          ⚠ Desagregação por antiguidade disponível quando os documentos incluírem datas de vencimento individuais
        </p>
      )}
    </div>
  );
}

// ── Staff Table ────────────────────────────────────────────────────────────────
function StaffTable({ rows, ano, vals }: {
  rows: NotaDef["rows"];
  ano: string;
  vals?: ValRow[];
}) {
  const anoN1 = String(Number(ano) - 1);
  return (
    <div className="overflow-x-auto space-y-4">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-700">Rubrica</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-800 w-36">N ({ano}) AOA</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-600 w-36">N-1 ({anoN1}) AOA</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r, i) => (
            <tr key={i} className={r.total ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}>
              <td className="px-3 py-1.5 border-b border-gray-100">{r.label}</td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-800">
                {vals?.[i] != null ? fmtV(vals[i]!.n) : "—"}
              </td>
              <td className="text-right px-3 py-1.5 border-b border-gray-100 font-mono text-gray-600">
                {vals?.[i] != null ? fmtV(vals[i]!.n1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Headcount subtable */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">Número Médio de Trabalhadores</div>
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-gray-100">
            <th className="text-left px-3 py-1.5 font-semibold text-gray-700">Categoria</th>
            <th className="text-right px-3 py-1.5 font-semibold text-gray-800">N</th>
            <th className="text-right px-3 py-1.5 font-semibold text-gray-600">N-1</th>
          </tr></thead>
          <tbody>
            {["Órgãos sociais","Quadros superiores","Técnicos","Administrativos","Operacionais","TOTAL"].map(cat => (
              <tr key={cat} className={cat === "TOTAL" ? "bg-gray-100 font-semibold" : "hover:bg-gray-50"}>
                <td className="px-3 py-1.5 border-b border-gray-100">{cat}</td>
                <td className="text-right px-3 py-1.5 border-b border-gray-100 text-gray-400">—</td>
                <td className="text-right px-3 py-1.5 border-b border-gray-100 text-gray-400">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TaxTable — wired to buildModelo1 ──────────────────────────────────────────
function TaxTable({ ano, cur, pri }: { ano: string; cur: BalancesMap; pri: BalancesMap }) {
  const anoN1 = String(Number(ano) - 1);
  const m1 = buildModelo1(cur, pri);

  const pct = (v: number) => v === 0 ? "—" : `${(v * 100).toFixed(1)}%`;
  const isRate = (label: string) => label.startsWith("Taxa");

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-amber-50">
            <th className="text-left px-3 py-2 font-semibold text-amber-800">Descrição — Apuramento Imposto Industrial</th>
            <th className="text-right px-3 py-2 font-semibold text-amber-800 w-40">N ({ano}) AOA</th>
            <th className="text-right px-3 py-2 font-semibold text-amber-700 w-40">N-1 ({anoN1}) AOA</th>
          </tr>
        </thead>
        <tbody>
          {m1.map((r, i) =>
            r.sep ? (
              <tr key={i}><td colSpan={3} className="py-1 border-t-2 border-amber-200" /></tr>
            ) : r.label === "" ? null : (
              <tr key={i} className={r.bold ? "bg-amber-50 font-semibold" : "hover:bg-gray-50"}>
                <td className={`px-3 py-1.5 border-b border-gray-100 ${r.indent ? "pl-7 text-gray-500" : r.bold ? "text-gray-800" : "text-gray-700"}`}>
                  {r.label}
                </td>
                <td className={`text-right px-3 py-1.5 border-b border-gray-100 font-mono ${r.bold ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                  {isRate(r.label) ? pct(r.value) : fmtV(r.value)}
                </td>
                <td className={`text-right px-3 py-1.5 border-b border-gray-100 font-mono ${r.bold ? "font-semibold text-gray-700" : "text-gray-500"}`}>
                  {isRate(r.label) ? pct(r.valueN1) : fmtV(r.valueN1)}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Narrative Box ──────────────────────────────────────────────────────────────
function NarrativeBox({ num }: { num: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-400 italic">
        Esta nota requer texto narrativo por parte do preparador das demonstrações financeiras.
      </p>
      <div className="h-2" />
    </div>
  );
}

// ── Note Content Dispatcher ────────────────────────────────────────────────────
function NoteContent({ nota, ano, nv, cur, pri }: {
  nota: NotaDef;
  ano: string;
  nv: NV;
  cur: BalancesMap;
  pri: BalancesMap;
}) {
  const vals = getNoteVals(nota.num, nv, cur, pri);

  // Movement tables get finalVals (saldo final column from engine)
  if (nota.tipo === "movement") {
    return <MovementTable rows={nota.rows} finalVals={vals} />;
  }
  if (nota.tipo === "staff") {
    return <StaffTable rows={nota.rows} ano={ano} vals={vals} />;
  }
  if (nota.tipo === "tax") {
    return <TaxTable ano={ano} cur={cur} pri={pri} />;
  }
  if (nota.tipo === "aged") {
    return <AgedTable rows={nota.rows} ano={ano} vals={vals} />;
  }
  if (nota.tipo === "narrative") {
    return <NarrativeBox num={nota.num} />;
  }
  // table / breakdown / cash → SimpleTable with computed values
  if (nota.rows) {
    return <SimpleTable rows={nota.rows} ano={ano} vals={vals} />;
  }
  return <NarrativeBox num={nota.num} />;
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function NotasPage() {
  const [ano, setAno] = useState(ANOS_DISPONIVEIS[0]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<NotaCat | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [forceDemo, setForceDemo] = useState(false);
  const { textos, setTexto } = useNotasTextos(ano);

  const { entries, loaded } = useJournal(ano);

  const journalMap = useMemo(
    () => journalEntriesToBalancesMap(entries, JOURNAL_ACCOUNTS),
    [entries]
  );

  const lancados = entries.filter(e => e.estado === "LANÇADO").length;
  const hasReal  = loaded && lancados > 0;

  const ds = DATASETS[ano] ?? DATASETS["2025"];
  const cur: BalancesMap = forceDemo ? ds.cur : journalMap;
  const pri: BalancesMap = forceDemo ? ds.pri : {};

  // Compute note values from real or demo data
  const nv = useMemo(() => computeNoteValues(cur, pri), [cur, pri]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return NOTAS.filter(n =>
      (catFilter === "all" || n.cat === catFilter) &&
      (q === "" || n.titulo.toLowerCase().includes(q) || n.num.includes(q) || (n.contas ?? "").includes(q))
    );
  }, [search, catFilter]);

  const toggle = (num: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(num) ? s.delete(num) : s.add(num); return s; });

  const expandAll  = () => setExpanded(new Set(filtered.map(n => n.num)));
  const collapseAll = () => setExpanded(new Set());

  const catCount = useMemo(() => {
    const m: Record<string, number> = { all: NOTAS.length };
    NOTAS.forEach(n => { m[n.cat] = (m[n.cat] ?? 0) + 1; });
    return m;
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notas às Demonstrações Financeiras</h1>
          <p className="text-sm text-gray-500 mt-1">
            49 notas conforme PGCA Angola — Decreto n.º 82/01, de 16 de Novembro ·
            Valores calculados automaticamente a partir dos movimentos contabilísticos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Exercício:</label>
            <select
              value={ano} onChange={e => { setAno(e.target.value); setExpanded(new Set()); }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {ANOS_DISPONIVEIS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setForceDemo(false)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                !forceDemo ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              📊 Dados Reais
            </button>
            <button
              onClick={() => setForceDemo(true)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                forceDemo ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Demo
            </button>
          </div>
        </div>
      </div>

      {/* ── Data source banner ──────────────────────────────────────────────── */}
      {loaded && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
          hasReal
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            forceDemo ? "bg-amber-400" : hasReal ? "bg-green-500" : "bg-gray-400"
          }`} />
          {forceDemo
            ? <>● Modo Demonstração — a apresentar dados de exemplo</>
            : hasReal
              ? <>✓ {lancados} lançamento{lancados !== 1 ? "s" : ""} no diário para {ano} — {Object.keys(journalMap).length} contas mapeadas</>
              : <>○ Diário vazio para {ano} — notas a zeros. Lance movimentos no Diário Contabilístico.</>
          }
        </div>
      )}

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {(["politicas","ativo","cp","dr","dfc","outras"] as NotaCat[]).map(cat => {
          const c = CAT_COLORS[cat];
          return (
            <button
              key={cat}
              onClick={() => setCatFilter(catFilter === cat ? "all" : cat)}
              className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                catFilter === cat
                  ? `${c.bg} ${c.border} ${c.text}`
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <span className="text-2xl font-bold">{catCount[cat] ?? 0}</span>
              <span className="text-[10px] font-medium leading-tight mt-0.5">{CAT_LABELS[cat]}</span>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 relative min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar nota (número, título, conta)..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={catFilter} onChange={e => setCatFilter(e.target.value as NotaCat | "all")}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {CATS.map(c => (
              <option key={c} value={c}>{c === "all" ? "Todas as categorias" : CAT_LABELS[c as NotaCat]}</option>
            ))}
          </select>
          <button onClick={expandAll} className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Expandir todas
          </button>
          <button onClick={collapseAll} className="px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Colapsar
          </button>
        </div>
        <span className="text-sm text-gray-400">{filtered.length} nota{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Notes Accordion ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {filtered.map(nota => {
          const isOpen = expanded.has(nota.num);
          const c = CAT_COLORS[nota.cat];
          const hasTexto = (textos[nota.num] ?? "").trim().length > 0;
          return (
            <div key={nota.num} className={`border-2 rounded-xl overflow-hidden transition-all ${isOpen ? c.border : "border-gray-200"}`}>
              {/* Accordion header */}
              <button
                onClick={() => toggle(nota.num)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isOpen ? c.bg : "bg-white hover:bg-gray-50"}`}
              >
                {/* Note number badge */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  isOpen ? `${c.text} border-2 ${c.border}` : "bg-gray-100 text-gray-600"
                }`}>
                  {nota.num}
                </div>

                {/* Title area */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${isOpen ? c.text : "text-gray-800"}`}>{nota.titulo}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                      {CAT_LABELS[nota.cat]}
                    </span>
                    {nota.contas && (
                      <span className="text-[10px] text-gray-400 font-mono">contas: {nota.contas}</span>
                    )}
                    {hasTexto && !isOpen && (
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">✎ Com notas</span>
                    )}
                  </div>
                  {!isOpen && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{nota.desc}</p>
                  )}
                </div>

                {/* Chevron */}
                <svg
                  className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? `rotate-180 ${c.text}` : "text-gray-400"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Accordion body */}
              {isOpen && (
                <div className="px-4 pb-4 pt-1 bg-white border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">{nota.desc}</p>

                  {/* Note data table — auto-populated from engine (real or demo) */}
                  <NoteContent nota={nota} ano={ano} nv={nv} cur={cur} pri={pri} />

                  {/* Editable explanatory notes — persisted to localStorage */}
                  <ExplicativaEditor
                    num={nota.num}
                    texto={textos[nota.num] ?? ""}
                    onChange={t => setTexto(nota.num, t)}
                  />

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Imprimir nota
                    </button>
                    <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Exportar Excel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm font-medium">Nenhuma nota encontrada</p>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-200 pt-4 flex items-center justify-between text-xs text-gray-400">
        <span>PGCA Angola — Decreto n.º 82/01, de 16 de Novembro — 49 Notas oficiais</span>
        <span>Exercício {ano} / {String(Number(ano) - 1)}</span>
      </div>
    </div>
  );
}
