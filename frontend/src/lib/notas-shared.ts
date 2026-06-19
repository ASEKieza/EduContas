"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
export type NotaCat = "politicas" | "ativo" | "cp" | "dr" | "dfc" | "outras";
export type NoteType = "movement" | "staff" | "tax" | "breakdown" | "aged" | "cash" | "narrative" | "table";

export interface NotaDef {
  num: string;
  titulo: string;
  cat: NotaCat;
  contas?: string;
  desc: string;
  tipo?: NoteType;
  rows?: { label: string; sub?: boolean; total?: boolean; sep?: boolean }[];
}

// ── 49 Notas PGCA Angola ──────────────────────────────────────────────────────
export const NOTAS: NotaDef[] = [
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
      { label:"Caixa em Kz" }, { label:"Caixa em moeda estrangeira" },
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
      { label:"Passivos financeiros ao justo valor" }, { label:"Passivos financeiros ao custo amortizado" },
    ]},
  { num:"41", titulo:"Capital Social e Accionistas", cat:"outras", contas:"51.x",
    desc:"Estrutura accionista; direitos de voto; acções próprias; dividendos propostos e distribuídos.", tipo:"narrative" },
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

// ── Category metadata ──────────────────────────────────────────────────────────
export const CAT_LABELS: Record<NotaCat, string> = {
  politicas: "Políticas Contabilísticas",
  ativo:     "Balanço — Activo",
  cp:        "Balanço — CP e Passivo",
  dr:        "Demonstração de Resultados",
  dfc:       "Fluxos de Caixa",
  outras:    "Outras Divulgações",
};

export const CAT_COLORS: Record<NotaCat, { bg: string; text: string; border: string }> = {
  politicas: { bg:"bg-blue-50",   text:"text-blue-700",   border:"border-blue-200" },
  ativo:     { bg:"bg-emerald-50",text:"text-emerald-700", border:"border-emerald-200" },
  cp:        { bg:"bg-purple-50", text:"text-purple-700",  border:"border-purple-200" },
  dr:        { bg:"bg-amber-50",  text:"text-amber-700",   border:"border-amber-200" },
  dfc:       { bg:"bg-cyan-50",   text:"text-cyan-700",    border:"border-cyan-200" },
  outras:    { bg:"bg-gray-50",   text:"text-gray-600",    border:"border-gray-200" },
};

// ── localStorage key ───────────────────────────────────────────────────────────
export const notasKey = (ano: string) => `educontas-notas-${ano}`;

// ── Shared hook — read/write notas text from localStorage ─────────────────────
export function useNotasTextos(ano: string) {
  const key = notasKey(ano);
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
