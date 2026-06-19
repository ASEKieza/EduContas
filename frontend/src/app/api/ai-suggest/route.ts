import { NextResponse } from "next/server";

// ── Angola 2025 macro context injected into every prompt ──────────────────────
const ANGOLA_CONTEXT = `
CONTEXTO MACROECONÓMICO ANGOLA 2025 (fontes credíveis):
• BNA (Banco Nacional de Angola): Taxa de juro de referência BNA: 19,50%; Câmbio: 1 USD ≈ 920 AOA; Reservas internacionais brutas: ~14,2 mil milhões USD; Política monetária restritiva para controlar inflação.
• INE Angola (Instituto Nacional de Estatística): Crescimento PIB real estimado: +4,3%; Inflação IPC acumulada: ~24,6%; Sector petrolífero: ~32% do PIB; Sector não petrolífero em expansão (+5,1%).
• MINFIN / OGE 2025: Orçamento equilibrado a USD 70/barril; Receitas fiscais não petrolíferas crescem 18%; Programa PRODESI de diversificação económica activo; Investimento em infraestruturas e capital humano.
• AGT (Administração Geral Tributária): Imposto Industrial taxa geral 30% (II); IVA 14%; IRT progressivo de 0% a 25%; INSS 8% patronal + 3% trabalhador; Prazo submissão Modelo 1: 31 de Maio.
• OCPCA (Ordem dos Contabilistas e Peritos Contabilistas de Angola): Normas de ética profissional e de auditoria; PGCA — Decreto n.º 82/01 de 26 de Outubro como base contabilística.
• Legislação societária: Lei n.º 22/11 de 17 de Junho (Lei Geral das Sociedades Comerciais); Obrigação de Relatório de Gestão para sociedades por quotas.
• Sectores em destaque 2025: TIC e transformação digital, agro-negócio, turismo e hotelaria, sector bancário e financeiro, construção e imobiliário.
• Risco cambial: Desvalorização do Kwanza face ao USD (~15% em 2025); Impacto nos custos de importação e nos financiamentos em moeda estrangeira.
• Taxa de inflação sectorial: Construção +28%; Alimentação +32%; Serviços TIC +12% (crescimento real positivo).
`;

// ── Smart fallback generator (sem API key) ────────────────────────────────────
function generateFallback(tipo: string, seccao: string, dados: Record<string, unknown>, empresa: string, ano: string): string {
  const { vendas = 0, rle = 0, totalActivo = 0, totalCP = 0, ebitda = 0,
          margem = 0, roe = 0, roa = 0, liquidezGeral = 0 } = dados as Record<string, number>;

  const fmtBi = (v: number) => v >= 1e9 ? `${(v/1e9).toFixed(1)} Bi AOA` : v >= 1e6 ? `${(v/1e6).toFixed(0)} M AOA` : `${v.toLocaleString("pt-PT")} AOA`;
  const pct = (v: number) => `${(v*100).toFixed(1)}%`;

  if (tipo === "nota") {
    const notaTexts: Record<string, string> = {
      "1": `${empresa} é uma sociedade por quotas, registada na Conservatória do Registo Comercial de Luanda, ao abrigo da Lei n.º 22/11 de 17 de Junho (Lei Geral das Sociedades Comerciais). A empresa exerce a sua actividade no sector de prestação de serviços, com sede em Luanda, Angola. As presentes demonstrações financeiras referem-se ao exercício económico findo em 31 de Dezembro de ${ano} e foram aprovadas pelo Conselho de Administração. A empresa é considerada uma entidade de pequena e média dimensão nos termos do enquadramento contabilístico angolano (PGCA).`,
      "2": `As demonstrações financeiras foram preparadas em conformidade com o Plano Geral de Contabilidade de Angola (PGCA), aprovado pelo Decreto Executivo n.º 82/01 de 26 de Outubro, com base no pressuposto da continuidade das operações e no regime do acréscimo (periodização económica). Os valores estão expressos em Kwanzas Angolanos (AOA), que constitui a moeda funcional e de apresentação da empresa. Os arredondamentos aplicados podem originar diferenças de unidade nos totais apresentados.`,
      "3": `3.1 Imobilizações corpóreas: registadas ao custo histórico de aquisição ou construção, deduzido das amortizações acumuladas calculadas pelo método das quotas constantes, com base nas taxas fiscais admitidas pela AGT (Decreto Executivo n.º 25/11). 3.2 Existências: valorizadas pelo custo médio ponderado ou pelo método FIFO; as perdas por imparidade são registadas quando o valor realizável líquido é inferior ao custo. 3.3 Instrumentos financeiros: registados ao custo amortizado; os créditos de cobrança duvidosa são objecto de provisão estimada com base na antiguidade de saldos. 3.4 Reconhecimento de proveitos: os proveitos de prestação de serviços são reconhecidos na proporção da conclusão do serviço; as vendas de bens quando os riscos e vantagens são transferidos para o comprador. 3.5 Conversão de moeda estrangeira: transacções convertidas à taxa de câmbio BNA na data da operação; activos e passivos monetários em moeda estrangeira reconvertidos à taxa BNA de 31 de Dezembro.`,
      "11": `O Imposto Industrial foi calculado sobre o lucro tributável do exercício à taxa de 30% (taxa geral — Código do Imposto Industrial, artigo 4.º). Os pagamentos por conta são calculados com base no imposto do exercício anterior (70% em Abril e 30% em Agosto). O INSS é calculado sobre as remunerações brutas mensais à taxa patronal de 8% e à taxa do trabalhador de 3% (Lei n.º 7/04 de 15 de Outubro). O IVA é apurado mensalmente à taxa geral de 14% (Lei n.º 7/19 de 24 de Abril). A empresa encontra-se em situação fiscal regularizada perante a AGT, não existindo processos de inspecção em curso com impacto material.`,
    };
    const num = seccao.split(":")[0]?.trim() ?? seccao;
    return notaTexts[num] ?? `Esta nota refere-se a ${seccao}. Os saldos e políticas descritos estão em conformidade com o PGCA Angola (Decreto n.º 82/01) e reflectem as práticas contabilísticas adoptadas pela ${empresa} no exercício findo em 31 de Dezembro de ${ano}. Não existem desvios materialmente relevantes face às políticas contabilísticas do exercício anterior.`;
  }

  // Relatório de Gestão narratives
  const seccaoNorm = seccao.toLowerCase();
  if (seccaoNorm.includes("actividade") || seccaoNorm.includes("negócios")) {
    return `No exercício findo em 31 de Dezembro de ${ano}, a ${empresa} manteve a sua trajectória de crescimento sustentado no sector de prestação de serviços em Angola. O volume de negócios atingiu ${fmtBi(vendas as number)}, reflectindo um desempenho positivo num contexto macroeconómico marcado por uma inflação de 24,6% (INE Angola) e pela desvalorização do Kwanza. A empresa beneficiou da crescente procura por soluções tecnológicas no mercado angolano, alinhada com os objectivos do OGE 2025 de promoção da economia digital e da diversificação produtiva (Programa PRODESI — MINFIN). A carteira de clientes foi consolidada e expandida, com especial incidência nos sectores financeiro, petrolífero e da administração pública.`;
  }
  if (seccaoNorm.includes("desempenho") || seccaoNorm.includes("financeiro")) {
    return `O exercício ${ano} registou um resultado líquido positivo de ${fmtBi(rle as number)}, correspondendo a uma margem líquida de ${pct(margem as number)} sobre o volume de negócios. O EBITDA situou-se em ${fmtBi(ebitda as number)}, evidenciando a capacidade operacional da empresa. A rentabilidade dos capitais próprios (ROE) foi de ${pct(roe as number)} e a rentabilidade do activo (ROA) atingiu ${pct(roa as number)}, ambos superiores à média do sector em Angola estimada pelo BNA. A liquidez geral manteve-se em ${(liquidezGeral as number).toFixed(2)}, acima do limiar de 1,0, indicando capacidade de satisfação das obrigações de curto prazo. O custo do financiamento reflecte a taxa de referência BNA de 19,50%, com tendência de estabilização ao longo do exercício.`;
  }
  if (seccaoNorm.includes("investimento")) {
    return `Durante o exercício ${ano}, a ${empresa} realizou investimentos em imobilizações corpóreas e incorpóreas alinhados com o plano estratégico de expansão e modernização tecnológica. Os principais investimentos incidiram sobre equipamento informático, software ERP e infra-estruturas de rede, visando aumentar a eficiência operacional e a capacidade de prestação de serviços. O financiamento foi assegurado através de capitais próprios gerados internamente e de financiamentos bancários junto do Banco BIC, S.A. e do Banco BFA, S.A., indexados às condições de mercado e à taxa BNA de 19,50%.`;
  }
  if (seccaoNorm.includes("recursos humanos") || seccaoNorm.includes("rh")) {
    return `O quadro de pessoal da ${empresa} no exercício ${ano} foi gerido com enfoque na estabilidade e no desenvolvimento de competências. As remunerações foram actualizadas em função da inflação registada (INE: 24,6% acumulado), assegurando o poder de compra dos colaboradores. Os encargos com pessoal incluem a contribuição patronal para o INSS de 8% e a retenção na fonte de 3% a cargo dos trabalhadores (Lei n.º 7/04). Foram realizadas acções de formação profissional contínua em parceria com instituições de ensino angolanas, em cumprimento da política de valorização do capital humano nacional. A empresa não registou conflitos laborais significativos no período.`;
  }
  if (seccaoNorm.includes("risco")) {
    return `A ${empresa} está exposta aos seguintes principais riscos no exercício ${ano}: (i) Risco cambial — a desvalorização do Kwanza face ao USD (~15% em 2025, BNA) aumenta os custos de importação de equipamento e software; a empresa mitiga este risco através de facturação em USD para contratos internacionais; (ii) Risco de crédito — gerido através de análise de solvabilidade de clientes e provisões para créditos duvidosos; (iii) Risco de liquidez — monitorizado mediante gestão activa de tesouraria e linhas de crédito pré-aprovadas; (iv) Risco fiscal e regulatório — acompanhamento permanente das alterações legislativas da AGT e da OCPCA; (v) Risco macroeconómico — dependência do desempenho do sector petrolífero angolano, que representa ~32% do PIB (INE).`;
  }
  if (seccaoNorm.includes("ambiente") || seccaoNorm.includes("sustentabilidade")) {
    return `A ${empresa} adopta políticas de responsabilidade ambiental e social no quadro do seu compromisso com o desenvolvimento sustentável de Angola. Em ${ano}, foram implementadas medidas de redução do consumo energético nas instalações e de digitalização de processos, em linha com os objectivos de eficiência do OGE 2025. A empresa apoia iniciativas de formação profissional da juventude angolana e contribui para o desenvolvimento das comunidades onde opera. Não foram identificadas contingências ambientais materialmente relevantes no exercício.`;
  }
  if (seccaoNorm.includes("pós") || seccaoNorm.includes("balanço") || seccaoNorm.includes("após")) {
    return `Entre a data do balanço (31 de Dezembro de ${ano}) e a data de aprovação das presentes demonstrações financeiras pelo Conselho de Administração, não ocorreram factos ou acontecimentos significativos que requeiram ajustamento dos valores reportados ou divulgação adicional. A empresa mantém a continuidade das suas operações e não há indicadores de dificuldades financeiras ou operacionais que possam comprometer a sua sustentabilidade. O Conselho de Administração considera que a empresa se encontra em posição sólida para o exercício seguinte.`;
  }
  if (seccaoNorm.includes("perspectiva") || seccaoNorm.includes("próximo")) {
    return `Para o exercício ${String(Number(ano)+1)}, o Conselho de Administração projecta um crescimento do volume de negócios sustentado pela expansão da carteira de clientes e pelo desenvolvimento de novas soluções tecnológicas adaptadas ao mercado angolano. A empresa alinha a sua estratégia com o Plano de Desenvolvimento Nacional 2023-2027 e com o Programa PRODESI do MINFIN, focando-se na digitalização de empresas e entidades públicas. O contexto de política monetária restritiva do BNA (taxa de 19,50%) e a inflação elevada (INE) constituem desafios que serão geridos através de eficiência operacional e diversificação de receitas.`;
  }
  if (seccaoNorm.includes("resultado") || seccaoNorm.includes("aplicação")) {
    return `O Conselho de Administração propõe a seguinte aplicação do resultado líquido do exercício ${ano} de ${fmtBi(rle as number)}: (i) Constituição de reserva legal: 5% do resultado líquido, em conformidade com o artigo 347.º da Lei n.º 22/11 de 17 de Junho; (ii) Reforço de reservas livres: 30% do resultado; (iii) Distribuição de dividendos: 65% do resultado, sujeita a deliberação da Assembleia-Geral, com retenção na fonte de IRT sobre dividendos à taxa prevista no Código do Imposto Industrial.`;
  }
  if (seccaoNorm.includes("governo") || seccaoNorm.includes("governança")) {
    return `A ${empresa} adopta princípios de bom governo societário nos termos da Lei n.º 22/11 de 17 de Junho. O Conselho de Administração reúne trimestralmente e é responsável pela definição da estratégia e pela supervisão da gestão executiva. A Assembleia-Geral aprova anualmente as contas e o Relatório de Gestão. O Fiscal Único, inscrito na OCPCA, é responsável pela fiscalização da contabilidade e pelo cumprimento das normas legais e estatutárias. A remuneração dos órgãos sociais é fixada pela Assembleia-Geral e consta das demonstrações financeiras nos termos legalmente exigidos.`;
  }
  return `A ${empresa} prosseguiu no exercício ${ano} os seus objectivos estratégicos, num ambiente económico angolano marcado pelo crescimento real do PIB de +4,3% (INE Angola) e pela inflação de 24,6%. A actividade foi conduzida em conformidade com o quadro legal angolano, incluindo o PGCA (Decreto n.º 82/01), a Lei n.º 22/11 e as normas da OCPCA.`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      tipo: "gestao" | "nota";
      seccao: string;
      dados: Record<string, unknown>;
      empresa: string;
      ano: string;
    };

    const { tipo, seccao, dados, empresa, ano } = body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      const texto = generateFallback(tipo, seccao, dados, empresa, ano);
      return NextResponse.json({ texto, source: "demo" });
    }

    // ── Real Claude API call ────────────────────────────────────────────────
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const systemPrompt = `És um especialista sénior em contabilidade e gestão empresarial angolana, certificado pela OCPCA, com profundo conhecimento do PGCA Angola (Decreto n.º 82/01), da Lei n.º 22/11, da legislação fiscal da AGT e do contexto macroeconómico angolano.

As tuas respostas devem ser:
- Em Português de Angola (formal e técnico)
- Precisas, profissionais e com referências a entidades credíveis angolanas e internacionais
- Adequadas para inclusão directa num Relatório de Contas Anual oficial
- Entre 120 e 250 palavras por secção
- Sem marcadores ou listas (texto corrido, salvo quando se tratar de notas com múltiplos pontos)

${ANGOLA_CONTEXT}`;

    let userPrompt = "";

    if (tipo === "gestao") {
      userPrompt = `Redija o texto para a secção "${seccao}" do Relatório de Gestão da empresa ${empresa}, referente ao exercício findo em 31 de Dezembro de ${ano}.

Dados financeiros da empresa (${ano}):
${Object.entries(dados).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

O texto deve ser profissional, com referências pertinentes ao contexto económico angolano (BNA, INE Angola, AGT, MINFIN/OGE 2025, OCPCA), e adequado para um relatório de contas oficial.
Responde apenas com o texto da secção, sem título nem introdução.`;
    } else {
      userPrompt = `Redija a Nota às Demonstrações Financeiras — "${seccao}" da empresa ${empresa}, exercício findo em 31 de Dezembro de ${ano}, em conformidade com o PGCA Angola (Decreto n.º 82/01).

Dados relevantes:
${Object.entries(dados).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

A nota deve ser técnica, completa e fazer referência às normas legais angolanas aplicáveis (PGCA, AGT, BNA, Lei n.º 22/11, etc.).
Responde apenas com o texto da nota, sem título nem introdução.`;
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const texto = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ texto, source: "claude" });

  } catch (err) {
    console.error("AI suggest error:", err);
    return NextResponse.json({ error: "Erro ao gerar sugestão" }, { status: 500 });
  }
}
