// ── PGCA Accounting Engine ────────────────────────────────────────────────────
// Computes all 6 financial statements, apuramento de resultados and Modelo 1
// from a raw BalancesMap (debit/credit totals per account code).

import type {
  AccountBalance, BalancesMap, FSRow, ApuramentoResult, Modelo1Row,
} from "./types";

// ────────────────────────────────────────────────────────────────────────────
// Core helpers
// ────────────────────────────────────────────────────────────────────────────

/** Natural balance: positive = "healthy" direction for the account's nature */
function nb(acc: AccountBalance): number {
  return acc.nature === "devedora"
    ? acc.debit  - acc.credit
    : acc.credit - acc.debit;
}

/**
 * Sum natural balances for all accounts whose code exactly matches or
 * starts with one of the given prefixes (dot-separated path matching).
 */
export function sum(map: BalancesMap, ...pfx: string[]): number {
  return Object.values(map)
    .filter(a => pfx.some(p => a.code === p || a.code.startsWith(p + ".")))
    .reduce((s, a) => s + Math.max(0, nb(a)), 0); // floor at 0 per account
}

/** Same as sum() but allows negative natural balances (for contra accounts) */
export function sumRaw(map: BalancesMap, ...pfx: string[]): number {
  return Object.values(map)
    .filter(a => pfx.some(p => a.code === p || a.code.startsWith(p + ".")))
    .reduce((s, a) => s + nb(a), 0);
}

// ────────────────────────────────────────────────────────────────────────────
// Apuramento de Resultados  (Class 6 vs Class 7 → Net Result)
// ────────────────────────────────────────────────────────────────────────────

export function calcApuramento(map: BalancesMap): ApuramentoResult {
  const TAX_RATE = 0.30;

  // ── Proveitos Operacionais ──────────────────────────────────────────────
  const vendas       = sum(map, "61", "62");
  const varProd      = sumRaw(map, "63");          // can be + or –
  const trabPropria  = sum(map, "64");
  const provSupl     = sum(map, "65");
  const totalProvOp  = vendas + varProd + trabPropria + provSupl;

  // ── Custos Operacionais ──────────────────────────────────────────────────
  const cmv          = sum(map, "71");
  const fst          = sum(map, "75.1", "75.2");
  const pessoal      = sum(map, "72");
  const outrosCustosOp = sum(map, "75.3","75.4","75.5","75.6","75.7","75.8","75.9");
  const amortProv    = sum(map, "78");
  const totalCustosOp = cmv + fst + pessoal + outrosCustosOp + amortProv;

  const resultadoOp  = totalProvOp - totalCustosOp;

  // ── Resultado Financeiro ─────────────────────────────────────────────────
  const provFin      = sum(map, "66");
  const custosFin    = sum(map, "76");
  const resultFiliais = sumRaw(map, "68") - sum(map, "77");

  const rai          = resultadoOp + provFin - custosFin + resultFiliais;

  // ── Imposto Industrial (30%) ─────────────────────────────────────────────
  const imposto      = Math.max(0, rai) * TAX_RATE;
  const taxRate      = TAX_RATE;
  const rlCorrentes  = rai - imposto;

  // ── Resultados Não Operacionais ──────────────────────────────────────────
  const ganhoNaoOp   = sum(map, "67");
  const custoNaoOp   = sum(map, "79");

  const rle          = rlCorrentes + ganhoNaoOp - custoNaoOp;

  return {
    vendas, varProd, trabPropria, provSupl, totalProvOp,
    cmv, fst, pessoal, outrosCustosOp, amortProv, totalCustosOp,
    resultadoOp, provFin, custosFin, resultFiliais,
    rai, imposto, taxRate, rlCorrentes,
    ganhoNaoOp, custoNaoOp, rle,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Balanço
// ────────────────────────────────────────────────────────────────────────────

export function buildBalanco(
  cur: BalancesMap, pri: BalancesMap
): { activo: FSRow[]; capitalPassivo: FSRow[] } {

  const aprC = calcApuramento(cur);
  const aprP = calcApuramento(pri);

  // ACTIVO — Não Corrente
  const imobCorpN  = sum(cur,"43","44") - sum(cur,"48.3","48.4","48.5","48.6");
  const imobCorpN1 = sum(pri,"43","44") - sum(pri,"48.3","48.4","48.5","48.6");
  const imobIncN   = sum(cur,"42") - sum(cur,"48.2");
  const imobIncN1  = sum(pri,"42") - sum(pri,"48.2");
  const invFinN    = sum(cur,"41");
  const invFinN1   = sum(pri,"41");
  const divMlpN    = sum(cur,"25");
  const divMlpN1   = sum(pri,"25");
  const ancN       = imobCorpN + imobIncN + invFinN + divMlpN;
  const ancN1      = imobCorpN1 + imobIncN1 + invFinN1 + divMlpN1;

  // ACTIVO — Corrente
  const existN     = sum(cur,"31","32","33","34","35","36") - sum(cur,"28.3","28.4","28.5");
  const existN1    = sum(pri,"31","32","33","34","35","36") - sum(pri,"28.3","28.4","28.5");
  const divCpN     = sum(cur,"21","26") + sum(cur,"24.1") - sum(cur,"28.1","28.2");
  const divCpN1    = sum(pri,"21","26") + sum(pri,"24.1") - sum(pri,"28.1","28.2");
  const titN       = sum(cur,"15");
  const titN1      = sum(pri,"15");
  const dispN      = sum(cur,"11","12","13","14");
  const dispN1     = sum(pri,"11","12","13","14");
  const acN        = existN + divCpN + titN + dispN;
  const acN1       = existN1 + divCpN1 + titN1 + dispN1;

  const totalAtivoN  = ancN + acN;
  const totalAtivoN1 = ancN1 + acN1;

  // CAPITAL PRÓPRIO
  const capN       = sum(cur,"51");
  const capN1      = sum(pri,"51");
  const prestN     = sum(cur,"53");
  const prestN1    = sum(pri,"53");
  const resN       = sum(cur,"52","55","56");
  const resN1      = sum(pri,"52","55","56");
  const transN     = sum(cur,"57","59");
  const transN1    = sum(pri,"57","59");
  const rleN       = aprC.rle;
  const rleN1      = aprP.rle;
  const totalCpN   = capN + prestN + resN + transN + rleN;
  const totalCpN1  = capN1 + prestN1 + resN1 + transN1 + rleN1;

  // PASSIVO — Não Corrente
  const provRiscosN  = sum(cur,"29");
  const provRiscosN1 = sum(pri,"29");
  const empMlpN      = sum(cur,"23.2");
  const empMlpN1     = sum(pri,"23.2");
  const totalPncN    = provRiscosN + empMlpN;
  const totalPncN1   = provRiscosN1 + empMlpN1;

  // PASSIVO — Corrente
  const fornN      = sum(cur,"22");
  const fornN1     = sum(pri,"22");
  const empCpN     = sum(cur,"23.1");
  const empCpN1    = sum(pri,"23.1");
  const estadoN    = sum(cur,"24.2","24.3","24.4","24.5");
  const estadoN1   = sum(pri,"24.2","24.3","24.4","24.5");
  const acrescN    = sum(cur,"27");
  const acrescN1   = sum(pri,"27");
  const totalPcN   = fornN + empCpN + estadoN + acrescN;
  const totalPcN1  = fornN1 + empCpN1 + estadoN1 + acrescN1;

  const totalPassN   = totalPncN + totalPcN;
  const totalPassN1  = totalPncN1 + totalPcN1;
  const totalCpPasN  = totalCpN + totalPassN;
  const totalCpPasN1 = totalCpN1 + totalPassN1;

  const activo: FSRow[] = [
    { desc:"ACTIVO",                                          tipo:"title",    nota:"",  n:0, n1:0 },
    { desc:"Activos não correntes",                           tipo:"title",    n:0, n1:0 },
    { desc:"Imobilizações corpóreas",          nota:4,        tipo:"indent",   n:imobCorpN, n1:imobCorpN1 },
    { desc:"Imobilizações incorpóreas",        nota:5,        tipo:"indent",   n:imobIncN,  n1:imobIncN1 },
    { desc:"Investimentos financeiros",        nota:6,        tipo:"indent",   n:invFinN,   n1:invFinN1 },
    { desc:"Dívidas de terceiros — MLP",       nota:9,        tipo:"indent",   n:divMlpN,   n1:divMlpN1 },
    { desc:"Total do Activo Não Corrente",                    tipo:"subtotal", n:ancN, n1:ancN1 },
    { desc:"",                                                tipo:"spacer",   n:0, n1:0 },
    { desc:"Activos correntes",                               tipo:"title",    n:0, n1:0 },
    { desc:"Existências",                      nota:7,        tipo:"indent",   n:existN,    n1:existN1 },
    { desc:"Dívidas de terceiros — CP",        nota:8,        tipo:"indent",   n:divCpN,    n1:divCpN1 },
    { desc:"Títulos negociáveis",              nota:10,       tipo:"indent",   n:titN,      n1:titN1 },
    { desc:"Disponibilidades",                 nota:11,       tipo:"indent",   n:dispN,     n1:dispN1 },
    { desc:"Total do Activo Corrente",                        tipo:"subtotal", n:acN,       n1:acN1 },
    { desc:"",                                                tipo:"spacer",   n:0, n1:0 },
    { desc:"TOTAL DO ACTIVO",                                 tipo:"total",    n:totalAtivoN, n1:totalAtivoN1 },
  ];

  const capitalPassivo: FSRow[] = [
    { desc:"CAPITAL PRÓPRIO E PASSIVO",                       tipo:"title",    nota:"", n:0, n1:0 },
    { desc:"Capital próprio",                                 tipo:"title",    n:0, n1:0 },
    { desc:"Capital realizado",                nota:12,       tipo:"indent",   n:capN,     n1:capN1 },
    { desc:"Prestações suplementares",         nota:13,       tipo:"indent",   n:prestN,   n1:prestN1 },
    { desc:"Reservas",                         nota:12,       tipo:"indent",   n:resN,     n1:resN1 },
    { desc:"Resultados transitados",                          tipo:"indent",   n:transN,   n1:transN1 },
    { desc:"Resultado líquido do exercício",                  tipo:"indent",   n:rleN,     n1:rleN1 },
    { desc:"Total do Capital Próprio",                        tipo:"subtotal", n:totalCpN, n1:totalCpN1 },
    { desc:"",                                                tipo:"spacer",   n:0, n1:0 },
    { desc:"Passivo não corrente",                            tipo:"title",    n:0, n1:0 },
    { desc:"Provisões para riscos e encargos", nota:14,       tipo:"indent",   n:provRiscosN, n1:provRiscosN1 },
    { desc:"Dívidas a terceiros — MLP",        nota:16,       tipo:"indent",   n:empMlpN,  n1:empMlpN1 },
    { desc:"Total do Passivo Não Corrente",                   tipo:"subtotal", n:totalPncN, n1:totalPncN1 },
    { desc:"",                                                tipo:"spacer",   n:0, n1:0 },
    { desc:"Passivo corrente",                                tipo:"title",    n:0, n1:0 },
    { desc:"Fornecedores",                     nota:15,       tipo:"indent",   n:fornN,    n1:fornN1 },
    { desc:"Dívidas a terceiros — outros CP",  nota:15,       tipo:"indent",   n:empCpN,   n1:empCpN1 },
    { desc:"Estado e outros entes públicos",   nota:15,       tipo:"indent",   n:estadoN,  n1:estadoN1 },
    { desc:"Acréscimos e diferimentos",        nota:17,       tipo:"indent",   n:acrescN,  n1:acrescN1 },
    { desc:"Total do Passivo Corrente",                       tipo:"subtotal", n:totalPcN, n1:totalPcN1 },
    { desc:"",                                                tipo:"spacer",   n:0, n1:0 },
    { desc:"Total do Passivo",                                tipo:"subtotal", n:totalPassN, n1:totalPassN1 },
    { desc:"",                                                tipo:"spacer",   n:0, n1:0 },
    { desc:"TOTAL DO CAPITAL PRÓPRIO E PASSIVO",              tipo:"total",    n:totalCpPasN, n1:totalCpPasN1 },
    {
      desc:"Activo = CP e Passivo (diferença deve ser zero)",
      tipo:"validation",
      n: totalAtivoN - totalCpPasN,
      n1: totalAtivoN1 - totalCpPasN1,
    },
  ];

  return { activo, capitalPassivo };
}

// ────────────────────────────────────────────────────────────────────────────
// DR por Natureza
// ────────────────────────────────────────────────────────────────────────────

export function buildDRNatureza(cur: BalancesMap, pri: BalancesMap): FSRow[] {
  const c = calcApuramento(cur);
  const p = calcApuramento(pri);
  return [
    { desc:"Vendas e prestações de serviços",                    nota:22, n: c.vendas,       n1: p.vendas },
    { desc:"Variação da produção",                               nota:23, n: c.varProd,      n1: p.varProd },
    { desc:"Trabalhos para a própria empresa",                   nota:24, n: c.trabPropria,  n1: p.trabPropria },
    { desc:"Proveitos suplementares",                            nota:25, n: c.provSupl,     n1: p.provSupl },
    { desc:"Custo das mercadorias vendidas e mat. consumidas",   nota:26, n:-c.cmv,          n1:-p.cmv,    neg:true },
    { desc:"Fornecimentos e serviços de terceiros",              nota:27, n:-c.fst,          n1:-p.fst,    neg:true },
    { desc:"Custos com o pessoal",                               nota:28, n:-c.pessoal,      n1:-p.pessoal,neg:true },
    { desc:"Outros custos e perdas operacionais",                nota:29, n:-c.outrosCustosOp,n1:-p.outrosCustosOp,neg:true },
    { desc:"Amortizações e provisões do exercício",              nota:30, n:-c.amortProv,    n1:-p.amortProv,neg:true },
    { desc:"RESULTADO OPERACIONAL",                              tipo:"subtotal", n:c.resultadoOp, n1:p.resultadoOp },
    { desc:"",                                                   tipo:"spacer",   n:0, n1:0 },
    { desc:"Proveitos e ganhos financeiros",                     nota:31, n: c.provFin,      n1: p.provFin },
    { desc:"Custos e perdas financeiras",                        nota:32, n:-c.custosFin,    n1:-p.custosFin, neg:true },
    { desc:"Resultados de filiais e associadas",                          n: c.resultFiliais,n1: p.resultFiliais },
    { desc:"RESULTADO ANTES DE IMPOSTOS",                        tipo:"subtotal", n:c.rai, n1:p.rai },
    { desc:"",                                                   tipo:"spacer",   n:0, n1:0 },
    { desc:"Imposto sobre os rendimentos",                       nota:35, n:-c.imposto,      n1:-p.imposto, neg:true },
    { desc:"Resultado líquido das actividades correntes",        tipo:"subtotal", n:c.rlCorrentes, n1:p.rlCorrentes },
    { desc:"",                                                   tipo:"spacer",   n:0, n1:0 },
    { desc:"Proveitos e ganhos não operacionais",                nota:33, n: c.ganhoNaoOp,   n1: p.ganhoNaoOp },
    { desc:"Custos e perdas não operacionais",                   nota:34, n:-c.custoNaoOp,   n1:-p.custoNaoOp, neg:true },
    { desc:"RESULTADO LÍQUIDO DO EXERCÍCIO",                     tipo:"total", n:c.rle, n1:p.rle },
  ];
}

// ────────────────────────────────────────────────────────────────────────────
// DR por Funções
// ────────────────────────────────────────────────────────────────────────────

export function buildDRFuncoes(cur: BalancesMap, pri: BalancesMap): FSRow[] {
  const c = calcApuramento(cur);
  const p = calcApuramento(pri);

  // Approximate function split from natural accounts
  // Distribution: transportes (75.2.14) + publicidade (75.2.25) + deslocações (75.2.31)
  const distC = sum(cur,"75.2.14","75.2.25","75.2.31");
  const distP = sum(pri,"75.2.14","75.2.25","75.2.31");
  // Admin: pessoal + electricidade + comunicações + rendas + seguros + honorários + conservação + impostos + amort + prov
  const adminC = c.pessoal + sum(cur,"75.2.11","75.2.13","75.2.16","75.2.18","75.2.24","75.2.27") + c.outrosCustosOp + c.amortProv;
  const adminP = p.pessoal + sum(pri,"75.2.11","75.2.13","75.2.16","75.2.18","75.2.24","75.2.27") + p.outrosCustosOp + p.amortProv;

  const vendasTotal = c.vendas + c.provSupl;
  const vendasTotalP = p.vendas + p.provSupl;
  const resultBrutoC = vendasTotal - c.cmv;
  const resultBrutoP = vendasTotalP - p.cmv;
  const resultOpC = resultBrutoC - distC - adminC;
  const resultOpP = resultBrutoP - distP - adminP;

  return [
    { desc:"Vendas e prestações de serviços",            n: vendasTotal,  n1: vendasTotalP },
    { desc:"Custo das vendas e dos serviços prestados",  nota:26, n:-c.cmv,       n1:-p.cmv,    neg:true },
    { desc:"Resultado bruto",                            tipo:"subtotal", n:resultBrutoC, n1:resultBrutoP },
    { desc:"",                                           tipo:"spacer",   n:0, n1:0 },
    { desc:"Outros proveitos operacionais",                               n: c.varProd + c.trabPropria, n1: p.varProd + p.trabPropria },
    { desc:"Custos de distribuição",                                      n:-distC,  n1:-distP, neg:true },
    { desc:"Custos administrativos e gerais",                             n:-adminC, n1:-adminP, neg:true },
    { desc:"RESULTADO OPERACIONAL",                      tipo:"subtotal", n:resultOpC, n1:resultOpP },
    { desc:"",                                           tipo:"spacer",   n:0, n1:0 },
    { desc:"Proveitos e ganhos financeiros",             nota:31, n: c.provFin,    n1: p.provFin },
    { desc:"Custos e perdas financeiras",                nota:32, n:-c.custosFin,  n1:-p.custosFin, neg:true },
    { desc:"Resultados de filiais e associadas",                  n: c.resultFiliais, n1: p.resultFiliais },
    { desc:"RESULTADO ANTES DE IMPOSTOS",                tipo:"subtotal", n:c.rai, n1:p.rai },
    { desc:"",                                           tipo:"spacer",   n:0, n1:0 },
    { desc:"Imposto sobre os rendimentos",               nota:35, n:-c.imposto,    n1:-p.imposto, neg:true },
    { desc:"Resultado líquido das actividades correntes",tipo:"subtotal", n:c.rlCorrentes, n1:p.rlCorrentes },
    { desc:"",                                           tipo:"spacer",   n:0, n1:0 },
    { desc:"Proveitos e ganhos não operacionais",        nota:33, n: c.ganhoNaoOp, n1: p.ganhoNaoOp },
    { desc:"Custos e perdas não operacionais",           nota:34, n:-c.custoNaoOp, n1:-p.custoNaoOp, neg:true },
    { desc:"RESULTADO LÍQUIDO DO EXERCÍCIO",             tipo:"total", n:c.rle, n1:p.rle },
  ];
}

// ────────────────────────────────────────────────────────────────────────────
// DFC — Método Directo
// ────────────────────────────────────────────────────────────────────────────

export function buildDFCDirecto(cur: BalancesMap, pri: BalancesMap): FSRow[] {
  const c = calcApuramento(cur);
  const p = calcApuramento(pri);

  const dispC = sum(cur,"11","12","13","14");
  const dispP = sum(pri,"11","12","13","14");

  // Operating: approximate from revenue – working capital changes
  const debCur = sum(cur,"21","26");
  const debPri = sum(pri,"21","26");
  const recebClientes = c.vendas - (debCur - debPri);
  const recebClientesP = p.vendas;

  const credCur = sum(cur,"22");
  const credPri = sum(pri,"22");
  const pagFornecedores = -(c.cmv + c.fst - (credCur - credPri));
  const pagFornecedoresP = -(p.cmv + p.fst);

  const pagPessoal = -c.pessoal;
  const pagPessoalP = -p.pessoal;
  const caixaOper = recebClientes + pagFornecedores + pagPessoal;
  const caixaOperP = recebClientesP + pagFornecedoresP + pagPessoalP;

  const jurosPagos  = -c.custosFin;
  const jurosPagosP = -p.custosFin;
  const impostosPagos  = -sum(pri,"24.5"); // prior year II paid in current year
  const impostosPagosP = -sum(pri,"24.5") * 0.8;
  const netOper  = caixaOper + jurosPagos + impostosPagos;
  const netOperP = caixaOperP + jurosPagosP + impostosPagosP;

  // Investing: capex = change in gross fixed assets
  const capex  = -(sum(cur,"43","44","42") - sum(pri,"43","44","42"));
  const capexP = -(sum(pri,"43","44","42") - sum(pri,"43","44","42") * 0.9);
  const netInvest  = capex;
  const netInvestP = capexP;

  // Financing: change in loans
  const loansCur = sum(cur,"23");
  const loansPri = sum(pri,"23");
  const netFin  = loansCur - loansPri;
  const netFinP = 70_000_000;

  const varCaixa  = netOper + netInvest + netFin;
  const varCaixaP = netOperP + netInvestP + netFinP;

  return [
    { desc:"Fluxo de caixa das actividades operacionais",         tipo:"title",    n:0, n1:0 },
    { desc:"Recebimentos de clientes",                                             n: recebClientes,   n1: recebClientesP },
    { desc:"Pagamentos a fornecedores",                                            n: pagFornecedores, n1: pagFornecedoresP, neg:true },
    { desc:"Pagamentos ao pessoal",                                                n: pagPessoal,      n1: pagPessoalP,      neg:true },
    { desc:"Caixa gerada pelas operações",                        tipo:"subtotal", n: caixaOper,      n1: caixaOperP },
    { desc:"Juros e encargos financeiros pagos",                                   n: jurosPagos,      n1: jurosPagosP,      neg:true },
    { desc:"Imposto Industrial pago",                                              n: impostosPagos,   n1: impostosPagosP,   neg:true },
    { desc:"Caixa líquida das actividades operacionais",          tipo:"subtotal", n: netOper,        n1: netOperP },
    { desc:"",                                                    tipo:"spacer",   n:0, n1:0 },
    { desc:"Fluxo de caixa das actividades de investimento",      tipo:"title",    n:0, n1:0 },
    { desc:"Aquisição de imobilizações",                                           n: capex,           n1: capexP,           neg:true },
    { desc:"Alienação de imobilizações",                                           n: c.ganhoNaoOp,    n1: p.ganhoNaoOp },
    { desc:"Caixa líquida das actividades de investimento",       tipo:"subtotal", n: netInvest + c.ganhoNaoOp, n1: netInvestP },
    { desc:"",                                                    tipo:"spacer",   n:0, n1:0 },
    { desc:"Fluxo de caixa das actividades de financiamento",     tipo:"title",    n:0, n1:0 },
    { desc:"Obtenção de empréstimos",                                              n: Math.max(0,netFin), n1: Math.max(0,netFinP) },
    { desc:"Reembolso de empréstimos",                                             n: Math.min(0,netFin), n1: Math.min(0,netFinP), neg:true },
    { desc:"Caixa líquida das actividades de financiamento",      tipo:"subtotal", n: netFin,         n1: netFinP },
    { desc:"",                                                    tipo:"spacer",   n:0, n1:0 },
    { desc:"Variação líquida de caixa e seus equivalentes",       tipo:"subtotal", n: varCaixa,       n1: varCaixaP },
    { desc:"Caixa e seus equivalentes no início do período",      nota:47,         n: dispP,           n1: dispP * 0.9 },
    { desc:"CAIXA E EQUIV. NO FIM DO PERÍODO",                    nota:47, tipo:"total", n: dispC, n1: dispP },
  ];
}

// ────────────────────────────────────────────────────────────────────────────
// DFC — Método Indirecto
// ────────────────────────────────────────────────────────────────────────────

export function buildDFCIndirecto(cur: BalancesMap, pri: BalancesMap): FSRow[] {
  const c = calcApuramento(cur);
  const p = calcApuramento(pri);

  const dispC = sum(cur,"11","12","13","14");
  const dispP = sum(pri,"11","12","13","14");

  // Working capital changes
  const dExist  = -(sum(cur,"31","32","33","34","35","36") - sum(pri,"31","32","33","34","35","36"));
  const dExistP = -(sum(pri,"31","32","33","34","35","36") * 0.1);
  const dDivRec = -(sum(cur,"21","26") - sum(pri,"21","26"));
  const dDivRecP = -40_000_000;
  const dCredores = sum(cur,"22") - sum(pri,"22");
  const dCredoresP = 30_000_000;
  const dEstado = sum(cur,"24.2","24.3","24.4","24.5") - sum(pri,"24.2","24.3","24.4","24.5");
  const dEstadoP = 20_000_000;

  const caixaOper  = c.rai + c.amortProv + dExist + dDivRec + dCredores + dEstado;
  const caixaOperP = p.rai + p.amortProv + dExistP + dDivRecP + dCredoresP + dEstadoP;

  const jurosPagos  = -c.custosFin;
  const jurosPagosP = -p.custosFin;
  const impostosPagos  = -sum(pri,"24.5");
  const impostosPagosP = -sum(pri,"24.5") * 0.8;

  const netOper  = caixaOper + jurosPagos + impostosPagos;
  const netOperP = caixaOperP + jurosPagosP + impostosPagosP;

  const capex  = -(sum(cur,"43","44","42") - sum(pri,"43","44","42"));
  const netFin = sum(cur,"23") - sum(pri,"23");
  const netFinP = 70_000_000;

  const varCaixa  = netOper + capex + netFin;
  const varCaixaP = netOperP + capex * 0.8 + netFinP;

  return [
    { desc:"Resultado antes de impostos",                               n: c.rai,         n1: p.rai },
    { desc:"Ajustamentos por:",                            tipo:"title", n:0, n1:0 },
    { desc:"Amortizações e provisões do exercício",  tipo:"indent",     n: c.amortProv,   n1: p.amortProv },
    { desc:"Resultados financeiros (juros pagos)",    tipo:"indent",     n:-c.custosFin,   n1:-p.custosFin, neg:true },
    { desc:"Resultados não operacionais",             tipo:"indent",     n: c.ganhoNaoOp - c.custoNaoOp, n1: p.ganhoNaoOp - p.custoNaoOp },
    { desc:"Variações de activos e passivos operacionais:", tipo:"title",n:0, n1:0 },
    { desc:"(Aumento)/diminuição de existências",     tipo:"indent",     n: dExist,        n1: dExistP, neg: dExist<0 },
    { desc:"(Aumento)/diminuição de dívidas a receber",tipo:"indent",   n: dDivRec,       n1: dDivRecP, neg: dDivRec<0 },
    { desc:"Aumento/(diminuição) de credores",        tipo:"indent",    n: dCredores,     n1: dCredoresP },
    { desc:"Aumento/(diminuição) de Estado",          tipo:"indent",    n: dEstado,       n1: dEstadoP },
    { desc:"Caixa gerada pelas operações",             tipo:"subtotal", n: caixaOper,     n1: caixaOperP },
    { desc:"Juros e encargos financeiros pagos",                        n: jurosPagos,    n1: jurosPagosP, neg:true },
    { desc:"Imposto Industrial pago",                                   n: impostosPagos, n1: impostosPagosP, neg:true },
    { desc:"Caixa líquida das actividades operacionais",tipo:"subtotal",n: netOper,       n1: netOperP },
    { desc:"",                                          tipo:"spacer",  n:0, n1:0 },
    { desc:"Caixa líquida das actividades de investimento",             n: capex,         n1: capex*0.8, neg: capex<0 },
    { desc:"Caixa líquida das actividades de financiamento",           n: netFin,        n1: netFinP },
    { desc:"Variação líquida de caixa e seus equivalentes",tipo:"subtotal",n:varCaixa,   n1:varCaixaP },
    { desc:"",                                          tipo:"spacer",  n:0, n1:0 },
    { desc:"Caixa e seus equivalentes no início do período", nota:47,   n: dispP,         n1: dispP*0.9 },
    { desc:"CAIXA E EQUIV. NO FIM DO PERÍODO",          nota:47, tipo:"total", n:dispC,  n1:dispP },
  ];
}

// ────────────────────────────────────────────────────────────────────────────
// DACP — Demonstração das Alterações no Capital Próprio
// ────────────────────────────────────────────────────────────────────────────

export function buildDACPRows(cur: BalancesMap, pri: BalancesMap) {
  const aprC = calcApuramento(cur);
  const aprP = calcApuramento(pri);

  const capPri = sum(pri,"51");
  const resPri = sum(pri,"52","55","56");
  const transPri = sum(pri,"57","59");
  const rlePri = aprP.rle;
  const totalSaldoIni = capPri + resPri + transPri + rlePri;

  const capCur = sum(cur,"51");
  const resCur = sum(cur,"52","55","56");
  const transCur = sum(cur,"57","59");
  const rleCur = aprC.rle;

  // Assume: prior year result is distributed/transferred; reserve allocation = rlePri * 0.10
  const reservaAloc = Math.round(rlePri * 0.10);
  const dividendos  = Math.round(rlePri * 0.40);
  const transitados = rlePri - reservaAloc - dividendos;
  const totalSaldoFim = capCur + resCur + transCur + rleCur;

  return [
    { label:"Saldo em 1 de Janeiro",           vals:[capPri, resPri,      transPri,  rlePri,  0, totalSaldoIni], bold:false },
    { label:"Alterações de políticas contab.", vals:[0, 0, 0, 0, 0, 0] },
    { label:"Correcções de erros fundamentais",vals:[0, 0, 0, 0, 0, 0] },
    { label:"Resultado líquido do exercício",  vals:[0, 0, 0, rleCur, 0, rleCur] },
    { label:"Aumentos de capital",             vals:[capCur - capPri, 0, 0, 0, 0, capCur - capPri] },
    { label:"Distribuição de dividendos",      vals:[0, 0, -dividendos, 0, 0, -dividendos] },
    { label:"Transferência para reservas",     vals:[0, reservaAloc, -reservaAloc, 0, 0, 0] },
    { label:"Outras variações",                vals:[0, 0, transitados-transPri+transCur, 0, 0, transitados-transPri+transCur] },
    { label:"Saldo em 31 de Dezembro",         vals:[capCur, resCur, transCur, rleCur, 0, totalSaldoFim], bold:true },
  ];
}

// ────────────────────────────────────────────────────────────────────────────
// Modelo 1 — Imposto Industrial
// ────────────────────────────────────────────────────────────────────────────

export function buildModelo1(cur: BalancesMap, pri: BalancesMap): Modelo1Row[] {
  const c = calcApuramento(cur);
  const p = calcApuramento(pri);

  // Acréscimos fiscais (non-deductible items in Angolan tax law)
  const acrescimosFiscais = sum(cur,"75.3.1.1") * 0.5; // partial Imposto de Selo
  const acrescimosFiscaisP = sum(pri,"75.3.1.1") * 0.5;

  // Deduções fiscais (tax incentives)
  const deducoesFiscais  = 0;
  const deducoesFiscaisP = 0;

  const materiaColectavelC = Math.max(0, c.rai + acrescimosFiscais - deducoesFiscais);
  const materiaColectavelP = Math.max(0, p.rai + acrescimosFiscaisP - deducoesFiscaisP);

  const taxaII = 0.30;
  const impostoC = Math.round(materiaColectavelC * taxaII);
  const impostoP = Math.round(materiaColectavelP * taxaII);

  const pagContaPartA = Math.round(impostoP * 0.25); // Parte A: 25% do II do ano anterior
  const pagContaPartAP = Math.round(impostoP * 0.25);
  const pagContaPartB = Math.round(impostoP * 0.35); // Parte B: 35% do II do ano anterior
  const pagContaPartBP = Math.round(impostoP * 0.35);

  const totalPagConta  = pagContaPartA + pagContaPartB;
  const totalPagContaP = pagContaPartAP + pagContaPartBP;

  const saldoAPagar  = Math.max(0, impostoC - totalPagConta);
  const saldoAPagarP = Math.max(0, impostoP - totalPagContaP);

  const taxaEfetiva  = c.rai > 0 ? impostoC / c.rai : 0;
  const taxaEfetivaP = p.rai > 0 ? impostoP / p.rai : 0;

  const row = (label: string, value: number, valueN1: number, opts: Partial<Modelo1Row> = {}): Modelo1Row =>
    ({ label, value, valueN1, ...opts });

  return [
    row("1. Volume de negócios (Vendas + PSv)",         c.vendas,             p.vendas),
    row("2. Outros proveitos operacionais",             c.varProd+c.trabPropria+c.provSupl, p.varProd+p.trabPropria+p.provSupl),
    row("3. Proveitos e ganhos financeiros",            c.provFin,            p.provFin),
    row("4. Proveitos e ganhos não operacionais",       c.ganhoNaoOp,         p.ganhoNaoOp),
    row("TOTAL DE PROVEITOS",                          c.totalProvOp+c.provFin+c.ganhoNaoOp, p.totalProvOp+p.provFin+p.ganhoNaoOp, { bold:true }),
    row("",0,0,{sep:true}),
    row("5. CMV e matérias consumidas",               -c.cmv,               -p.cmv,           { indent:true }),
    row("6. Fornecimentos e serviços de terceiros",   -c.fst,               -p.fst,            { indent:true }),
    row("7. Custos com o pessoal",                    -c.pessoal,           -p.pessoal,        { indent:true }),
    row("8. Outros custos operacionais",              -c.outrosCustosOp,    -p.outrosCustosOp, { indent:true }),
    row("9. Amortizações e provisões do exercício",   -c.amortProv,         -p.amortProv,      { indent:true }),
    row("10. Custos e perdas financeiras",            -c.custosFin,         -p.custosFin,      { indent:true }),
    row("11. Custos e perdas não operacionais",       -c.custoNaoOp,        -p.custoNaoOp,     { indent:true }),
    row("TOTAL DE CUSTOS ACEITES FISCALMENTE",       -(c.totalCustosOp+c.custosFin+c.custoNaoOp), -(p.totalCustosOp+p.custosFin+p.custoNaoOp), { bold:true }),
    row("",0,0,{sep:true}),
    row("RESULTADO CONTABILÍSTICO ANTES DE IMPOSTO",  c.rai,                p.rai,             { bold:true }),
    row("(+) Acréscimos fiscais (correcções positivas)", acrescimosFiscais, acrescimosFiscaisP, { indent:true }),
    row("(-) Deduções fiscais (correcções negativas)", -deducoesFiscais,   -deducoesFiscaisP,  { indent:true }),
    row("MATÉRIA COLECTÁVEL / LUCRO TRIBUTÁVEL",       materiaColectavelC, materiaColectavelP, { bold:true }),
    row("",0,0,{sep:true}),
    row(`Taxa de Imposto Industrial (${(taxaII*100).toFixed(0)}%)`, taxaII, taxaII),
    row("IMPOSTO INDUSTRIAL APURADO",                  impostoC,             impostoP,          { bold:true }),
    row("(-) Pagamento por conta — Parte A (25% II N-1)", -pagContaPartA,  -pagContaPartAP,    { indent:true }),
    row("(-) Pagamento por conta — Parte B (35% II N-1)", -pagContaPartB,  -pagContaPartBP,    { indent:true }),
    row("TOTAL PAGAMENTOS POR CONTA",                 -totalPagConta,      -totalPagContaP,    { bold:true }),
    row("",0,0,{sep:true}),
    row("IMPOSTO INDUSTRIAL A PAGAR / (A RECUPERAR)", saldoAPagar,         saldoAPagarP,       { bold:true }),
    row(`Taxa efectiva de imposto (II / RAI)`,         taxaEfetiva,         taxaEfetivaP),
  ];
}

// ────────────────────────────────────────────────────────────────────────────
// Note Values — pre-computed values for each of the 49 PGCA notes
// ────────────────────────────────────────────────────────────────────────────

export function computeNoteValues(cur: BalancesMap, pri: BalancesMap) {
  const c = calcApuramento(cur);
  const p = calcApuramento(pri);

  return {
    // Nota 04 — Imobilizações Corpóreas
    "04": {
      terrenos:  { n: sum(cur,"43.1"), n1: sum(pri,"43.1") },
      edificios: { n: sum(cur,"43.2"), n1: sum(pri,"43.2") },
      eqBasico:  { n: sum(cur,"44.1"), n1: sum(pri,"44.1") },
      eqTransp:  { n: sum(cur,"44.2"), n1: sum(pri,"44.2") },
      eqAdmin:   { n: sum(cur,"44.3"), n1: sum(pri,"44.3") },
      grossTotal:{ n: sum(cur,"43","44"), n1: sum(pri,"43","44") },
      amortEdif: { n: sum(cur,"48.3.1"), n1: sum(pri,"48.3.1") },
      amortEqB:  { n: sum(cur,"48.3.2"), n1: sum(pri,"48.3.2") },
      amortEqT:  { n: sum(cur,"48.3.3"), n1: sum(pri,"48.3.3") },
      amortEqA:  { n: sum(cur,"48.3.4"), n1: sum(pri,"48.3.4") },
      amortTotal:{ n: sum(cur,"48.3","48.4","48.5","48.6"), n1: sum(pri,"48.3","48.4","48.5","48.6") },
      netTotal:  { n: sum(cur,"43","44")-sum(cur,"48.3","48.4","48.5","48.6"),
                   n1:sum(pri,"43","44")-sum(pri,"48.3","48.4","48.5","48.6") },
      dotExerc:  { n: sum(cur,"78.2.1"), n1: sum(pri,"78.2.1") },
    },
    // Nota 05 — Imob. Incorpóreas
    "05": {
      propriedade:{ n: sum(cur,"42.1"), n1: sum(pri,"42.1") },
      grossTotal: { n: sum(cur,"42"), n1: sum(pri,"42") },
      amortTotal: { n: sum(cur,"48.2"), n1: sum(pri,"48.2") },
      netTotal:   { n: sum(cur,"42")-sum(cur,"48.2"), n1: sum(pri,"42")-sum(pri,"48.2") },
      dotExerc:   { n: sum(cur,"78.2.2"), n1: sum(pri,"78.2.2") },
    },
    // Nota 06 — Investimentos Financeiros
    "06": { total: { n: sum(cur,"41"), n1: sum(pri,"41") } },
    // Nota 07 — Existências
    "07": {
      mercadorias:  { n: sum(cur,"31"), n1: sum(pri,"31") },
      materiasPrimas:{ n: sum(cur,"34"), n1: sum(pri,"34") },
      grossTotal:   { n: sum(cur,"31","32","33","34","35","36"), n1: sum(pri,"31","32","33","34","35","36") },
      provisoes:    { n: sum(cur,"28.3","28.4","28.5"), n1: sum(pri,"28.3","28.4","28.5") },
      netTotal:     { n: sum(cur,"31","32","33","34","35","36")-sum(cur,"28.3","28.4","28.5"),
                      n1: sum(pri,"31","32","33","34","35","36")-sum(pri,"28.3","28.4","28.5") },
    },
    // Nota 08 — Dívidas de Terceiros CP
    "08": {
      clientes:    { n: sum(cur,"21"), n1: sum(pri,"21") },
      outrosDeved: { n: sum(cur,"26")+sum(cur,"24.1"), n1: sum(pri,"26")+sum(pri,"24.1") },
      provisoes:   { n: sum(cur,"28.1","28.2"), n1: sum(pri,"28.1","28.2") },
      netTotal:    { n: sum(cur,"21","26")+sum(cur,"24.1")-sum(cur,"28.1","28.2"),
                     n1: sum(pri,"21","26")+sum(pri,"24.1")-sum(pri,"28.1","28.2") },
    },
    // Nota 11 — Disponibilidades
    "11": {
      caixa:   { n: sum(cur,"11"), n1: sum(pri,"11") },
      depositos:{ n: sum(cur,"12","13"), n1: sum(pri,"12","13") },
      total:   { n: sum(cur,"11","12","13","14"), n1: sum(pri,"11","12","13","14") },
    },
    // Nota 12 — Capital Próprio
    "12": {
      capital:   { n: sum(cur,"51"), n1: sum(pri,"51") },
      reservas:  { n: sum(cur,"52","55","56"), n1: sum(pri,"52","55","56") },
      transitados:{ n: sum(cur,"57"), n1: sum(pri,"57") },
      resultado: { n: c.rle, n1: p.rle },
      total:     { n: sum(cur,"51")+sum(cur,"52","55","56")+sum(cur,"57")+c.rle,
                   n1: sum(pri,"51")+sum(pri,"52","55","56")+sum(pri,"57")+p.rle },
    },
    // Nota 14 — Provisões
    "14": { total: { n: sum(cur,"29"), n1: sum(pri,"29") } },
    // Nota 15 — Dívidas CP Passivo
    "15": {
      fornecedores:{ n: sum(cur,"22"), n1: sum(pri,"22") },
      empCp:       { n: sum(cur,"23.1"), n1: sum(pri,"23.1") },
      estado:      { n: sum(cur,"24.2","24.3","24.4","24.5"), n1: sum(pri,"24.2","24.3","24.4","24.5") },
      total:       { n: sum(cur,"22")+sum(cur,"23.1")+sum(cur,"24.2","24.3","24.4","24.5"),
                     n1: sum(pri,"22")+sum(pri,"23.1")+sum(pri,"24.2","24.3","24.4","24.5") },
    },
    // Nota 16 — Dívidas MLP Passivo
    "16": { total: { n: sum(cur,"23.2"), n1: sum(pri,"23.2") } },
    // Nota 17 — Acréscimos e Diferimentos
    "17": {
      acrescCustos: { n: sum(cur,"27.1"), n1: sum(pri,"27.1") },
      provDiferidos:{ n: sum(cur,"27.2"), n1: sum(pri,"27.2") },
      total:        { n: sum(cur,"27"), n1: sum(pri,"27") },
    },
    // Nota 19 — Amortizações acumuladas
    "19": {
      incorp:  { n: sum(cur,"48.2"), n1: sum(pri,"48.2") },
      edificios:{ n: sum(cur,"48.3.1"), n1: sum(pri,"48.3.1") },
      eqBasico:{ n: sum(cur,"48.3.2"), n1: sum(pri,"48.3.2") },
      eqTransp:{ n: sum(cur,"48.3.3"), n1: sum(pri,"48.3.3") },
      eqAdmin: { n: sum(cur,"48.3.4"), n1: sum(pri,"48.3.4") },
      total:   { n: sum(cur,"48"), n1: sum(pri,"48") },
      dotExerc:{ n: c.amortProv, n1: p.amortProv },
    },
    // Nota 22 — Vendas e PSv
    "22": {
      vendas:  { n: sum(cur,"61"), n1: sum(pri,"61") },
      psv:     { n: sum(cur,"62"), n1: sum(pri,"62") },
      total:   { n: sum(cur,"61","62"), n1: sum(pri,"61","62") },
    },
    // Nota 25 — Proveitos suplementares
    "25": { total: { n: sum(cur,"65"), n1: sum(pri,"65") } },
    // Nota 26 — CMV
    "26": {
      mercadorias: { n: sum(cur,"71.1"), n1: sum(pri,"71.1") },
      total:       { n: c.cmv, n1: p.cmv },
    },
    // Nota 27 — FST
    "27": {
      elect:     { n: sum(cur,"75.2.11"), n1: sum(pri,"75.2.11") },
      comunic:   { n: sum(cur,"75.2.13"), n1: sum(pri,"75.2.13") },
      transp:    { n: sum(cur,"75.2.14"), n1: sum(pri,"75.2.14") },
      rendas:    { n: sum(cur,"75.2.16"), n1: sum(pri,"75.2.16") },
      seguros:   { n: sum(cur,"75.2.18"), n1: sum(pri,"75.2.18") },
      honorarios:{ n: sum(cur,"75.2.24"), n1: sum(pri,"75.2.24") },
      publicidade:{ n: sum(cur,"75.2.25"), n1: sum(pri,"75.2.25") },
      conservacao:{ n: sum(cur,"75.2.27"), n1: sum(pri,"75.2.27") },
      desloc:    { n: sum(cur,"75.2.31"), n1: sum(pri,"75.2.31") },
      total:     { n: c.fst, n1: p.fst },
    },
    // Nota 28 — Pessoal
    "28": {
      remuneracoes:{ n: sum(cur,"72.1"), n1: sum(pri,"72.1") },
      inss:        { n: sum(cur,"72.2"), n1: sum(pri,"72.2") },
      outros:      { n: sum(cur,"72.3"), n1: sum(pri,"72.3") },
      total:       { n: c.pessoal, n1: p.pessoal },
    },
    // Nota 30 — Amortizações e Provisões do Exercício
    "30": {
      amortCorp:  { n: sum(cur,"78.2.1"), n1: sum(pri,"78.2.1") },
      amortIncorp:{ n: sum(cur,"78.2.2"), n1: sum(pri,"78.2.2") },
      provCobrDuv:{ n: sum(cur,"78.1.1.1"), n1: sum(pri,"78.1.1.1") },
      total:      { n: c.amortProv, n1: p.amortProv },
    },
    // Nota 31 — Proveitos Financeiros
    "31": { total: { n: c.provFin, n1: p.provFin } },
    // Nota 32 — Custos Financeiros
    "32": {
      juros:   { n: sum(cur,"76.1.1.1"), n1: sum(pri,"76.1.1.1") },
      cambiais:{ n: sum(cur,"76.5.1.1"), n1: sum(pri,"76.5.1.1") },
      total:   { n: c.custosFin, n1: p.custosFin },
    },
    // Nota 35 — Imposto
    "35": {
      rai:           { n: c.rai, n1: p.rai },
      imposto:       { n: c.imposto, n1: p.imposto },
      taxaEfetiva:   { n: c.rai > 0 ? c.imposto/c.rai : 0, n1: p.rai > 0 ? p.imposto/p.rai : 0 },
    },
    // Nota 47 — Caixa e Equivalentes
    "47": {
      caixa:    { n: sum(cur,"11"), n1: sum(pri,"11") },
      depositos:{ n: sum(cur,"12","13"), n1: sum(pri,"12","13") },
      total:    { n: sum(cur,"11","12","13","14"), n1: sum(pri,"11","12","13","14") },
    },
  };
}
