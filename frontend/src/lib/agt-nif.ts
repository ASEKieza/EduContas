/**
 * AGT — Administração Geral Tributária de Angola
 * Serviço de Consulta de Contribuintes por NIF
 *
 * Endpoint real (produção):
 *   POST https://e-factura.agt.minfin.gov.ao/api/contribuinte/validar
 *   Headers: Authorization: Bearer <token>
 *   Body: { "nif": "5000123456" }
 *
 * Este módulo usa dados simulados enquanto as credenciais
 * da AGT não estiverem configuradas em NEXT_PUBLIC_AGT_API_KEY.
 * Para activar a API real, defina as variáveis de ambiente:
 *   NEXT_PUBLIC_AGT_API_URL=https://e-factura.agt.minfin.gov.ao
 *   NEXT_PUBLIC_AGT_API_KEY=<chave_emitida_pela_agt>
 */

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export type AgtTipoContribuinte =
  | "Pessoa Colectiva"
  | "Pessoa Singular"
  | "Entidade Pública"
  | "Organismo Internacional";

export type AgtEstado = "ACTIVO" | "INACTIVO" | "SUSPENSO" | "EXTINTO";

export type AgtRegimeFiscal =
  | "Regime Geral"
  | "Regime Simplificado"
  | "Isento"
  | "Não Sujeito";

export interface AgtContribuinte {
  nif: string;
  nome: string;                        // Razão social registada na AGT
  tipoContribuinte: AgtTipoContribuinte;
  estado: AgtEstado;
  regimeFiscal: AgtRegimeFiscal;
  actividadePrincipal: string;         // Descrição da actividade
  caeCode: string;                     // Código de Actividade Económica
  endereco: string;
  municipio: string;
  provincia: string;
  dataRegisto: string;                 // YYYY-MM-DD
  dataActualizacao: string;
}

export type AgtLookupError =
  | "nif_invalido"        // formato incorrecto
  | "nao_encontrado"      // NIF não existe na base AGT
  | "servico_indisponivel" // timeout / erro de rede
  | "credenciais_em_falta"; // sem API key configurada

export interface AgtLookupResult {
  ok: boolean;
  contribuinte?: AgtContribuinte;
  error?: AgtLookupError;
  mensagem?: string;
  fonte: "agt_live" | "mock";
  consultadoEm: string;               // ISO datetime
}

// ── Validação de NIF Angola ────────────────────────────────────────────────────
// NIF Pessoa Singular:  9 dígitos, começa em 1–7
// NIF Pessoa Colectiva: 10 dígitos, começa em 5
// NIF Entidade Pública: 10 dígitos, começa em 4
// NIF Importado/AGT:    10 dígitos

export function validarFormatoNif(nif: string): boolean {
  const limpo = nif.replace(/\s/g, "");
  if (!/^\d{9,10}$/.test(limpo)) return false;
  return true;
}

// ── Base de dados mock (NIFs conhecidos para demonstração) ─────────────────────
const MOCK_DB: Record<string, AgtContribuinte> = {
  // ── Petróleo & Energia ──────────────────────────────────────────────────────
  "5567123890": {
    nif: "5567123890",
    nome: "SONANGOL EP",
    tipoContribuinte: "Entidade Pública",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Extracção de petróleo bruto",
    caeCode: "06100",
    endereco: "RUA RAINHA GINGA, Nº 29-35",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "1976-06-14",
    dataActualizacao: "2023-01-15",
  },
  "5000987654": {
    nif: "5000987654",
    nome: "TOTAL ENERGIAS ANGOLA SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Comércio a retalho de combustíveis para veículos a motor",
    caeCode: "47300",
    endereco: "AV. LENINE, Nº 58",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2005-09-01",
    dataActualizacao: "2023-01-15",
  },
  "5412378901": {
    nif: "5412378901",
    nome: "PETRO DISTRIBUIÇÃO SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Comércio por grosso de combustíveis e lubrificantes",
    caeCode: "46711",
    endereco: "AV. 4 DE FEVEREIRO, Nº 123",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2010-03-12",
    dataActualizacao: "2024-01-10",
  },
  "5621034789": {
    nif: "5621034789",
    nome: "CABINDA GUL — COMPANHIA DE PETRÓLEO LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Extracção de petróleo bruto e gás natural",
    caeCode: "06200",
    endereco: "AV. MARGINAL, Nº 5",
    municipio: "Cabinda",
    provincia: "Cabinda",
    dataRegisto: "1998-03-20",
    dataActualizacao: "2024-02-01",
  },
  "5003344556": {
    nif: "5003344556",
    nome: "EDEL — EMPRESA DE DISTRIBUIÇÃO DE ELECTRICIDADE EP",
    tipoContribuinte: "Entidade Pública",
    estado: "ACTIVO",
    regimeFiscal: "Isento",
    actividadePrincipal: "Distribuição de electricidade",
    caeCode: "35120",
    endereco: "AV. 4 DE FEVEREIRO, Nº 30",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "1980-05-01",
    dataActualizacao: "2023-01-01",
  },
  // ── Telecomunicações ────────────────────────────────────────────────────────
  "5278934001": {
    nif: "5278934001",
    nome: "ANGOLA TELECOM SA",
    tipoContribuinte: "Entidade Pública",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Telecomunicações por fio",
    caeCode: "61100",
    endereco: "AV. COMANDANTE VALÓDIA, Nº 206",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2000-01-01",
    dataActualizacao: "2023-06-01",
  },
  "5200345678": {
    nif: "5200345678",
    nome: "UNITEL SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Actividades de telecomunicações móveis",
    caeCode: "61200",
    endereco: "RUA DAS REVERSAS, Nº 2",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2001-06-01",
    dataActualizacao: "2024-02-01",
  },
  "5731092845": {
    nif: "5731092845",
    nome: "MOVICEL TELECOMUNICAÇÕES SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Actividades de telecomunicações móveis",
    caeCode: "61200",
    endereco: "RUA MAJOR KANHANGULO, Nº 212",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2003-10-01",
    dataActualizacao: "2024-01-15",
  },
  // ── Banca & Seguros ─────────────────────────────────────────────────────────
  "5100234567": {
    nif: "5100234567",
    nome: "BANCO DE FOMENTO ANGOLA SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Actividades bancárias de captação de depósitos",
    caeCode: "64190",
    endereco: "RUA RAINHA GINGA, Nº 83",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "1990-01-15",
    dataActualizacao: "2024-01-01",
  },
  "5300456789": {
    nif: "5300456789",
    nome: "ENSA — EMPRESA NACIONAL DE SEGUROS DE ANGOLA SA",
    tipoContribuinte: "Entidade Pública",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Actividades de seguros de vida",
    caeCode: "65110",
    endereco: "AV. 4 DE FEVEREIRO, Nº 93",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "1978-09-01",
    dataActualizacao: "2023-01-01",
  },
  "5482901367": {
    nif: "5482901367",
    nome: "BANCO BAI SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Actividades bancárias de captação de depósitos",
    caeCode: "64190",
    endereco: "AV. COMANDANTE VALÓDIA, Nº 93",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "1997-10-10",
    dataActualizacao: "2024-03-01",
  },
  "5523781490": {
    nif: "5523781490",
    nome: "STANDARD BANK ANGOLA SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Actividades bancárias de captação de depósitos",
    caeCode: "64190",
    endereco: "RUA KWAME NKRUMAH, Nº 45",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2000-05-01",
    dataActualizacao: "2024-01-20",
  },
  "5610293847": {
    nif: "5610293847",
    nome: "AAA ANGOLA SEGUROS SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Actividades de seguros não vida",
    caeCode: "65120",
    endereco: "AV. LENINE, Nº 37-B",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2006-11-01",
    dataActualizacao: "2023-08-01",
  },
  // ── Mineração & Diamantes ───────────────────────────────────────────────────
  "5400567890": {
    nif: "5400567890",
    nome: "ENDIAMA EP",
    tipoContribuinte: "Entidade Pública",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Extracção de diamantes",
    caeCode: "07210",
    endereco: "RUA MAJOR KANHANGULO, Nº 100",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "1981-01-01",
    dataActualizacao: "2023-01-01",
  },
  "5843017629": {
    nif: "5843017629",
    nome: "CATOCA MINING COMPANY LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Extracção de diamantes em mina a céu aberto",
    caeCode: "07210",
    endereco: "ZONA DE CATOCA, SAURIMO",
    municipio: "Saurimo",
    provincia: "Lunda Sul",
    dataRegisto: "1994-07-01",
    dataActualizacao: "2023-11-01",
  },
  "5901273846": {
    nif: "5901273846",
    nome: "SOCIEDADE MINEIRA DO CUANGO LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Extracção de diamantes aluvionares",
    caeCode: "07210",
    endereco: "AV. DOS COMBATENTES, Nº 10",
    municipio: "Lucapa",
    provincia: "Lunda Norte",
    dataRegisto: "2007-03-15",
    dataActualizacao: "2023-06-01",
  },
  // ── Construção Civil & Imobiliário ──────────────────────────────────────────
  "5399012345": {
    nif: "5399012345",
    nome: "CONSTRUÇÕES UNIDAS LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Construção de edifícios residenciais e não residenciais",
    caeCode: "41200",
    endereco: "RUA RAINHA GINGA, Nº 45",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2015-07-20",
    dataActualizacao: "2024-03-15",
  },
  "5700890123": {
    nif: "5700890123",
    nome: "NOVA CIMANGOLA SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Fabricação de cimento, cal e gesso",
    caeCode: "23510",
    endereco: "CABINDA, ZONA INDUSTRIAL",
    municipio: "Cabinda",
    provincia: "Cabinda",
    dataRegisto: "2012-07-01",
    dataActualizacao: "2023-01-01",
  },
  "5600789012": {
    nif: "5600789012",
    nome: "CIMANGOLA SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Fabricação de cimento",
    caeCode: "23510",
    endereco: "BUNGO, LOBITO",
    municipio: "Lobito",
    provincia: "Benguela",
    dataRegisto: "1954-01-01",
    dataActualizacao: "2023-01-01",
  },
  "5362874019": {
    nif: "5362874019",
    nome: "BENGUELA CONSTRUÇÃO E ENGENHARIA LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Simplificado",
    actividadePrincipal: "Construção de estradas e pontes",
    caeCode: "42110",
    endereco: "TRAVESSA DO DOMBE, Nº 7",
    municipio: "Benguela",
    provincia: "Benguela",
    dataRegisto: "2014-09-12",
    dataActualizacao: "2023-07-01",
  },
  "5471890236": {
    nif: "5471890236",
    nome: "HUAMBO HABITAÇÕES E EMPREENDIMENTOS LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Simplificado",
    actividadePrincipal: "Promoção imobiliária — construção de habitações",
    caeCode: "41100",
    endereco: "AV. NORTON DE MATOS, Nº 34",
    municipio: "Huambo",
    provincia: "Huambo",
    dataRegisto: "2016-02-20",
    dataActualizacao: "2023-09-01",
  },
  // ── Comércio & Retalho ──────────────────────────────────────────────────────
  "5800901234": {
    nif: "5800901234",
    nome: "SUPERMERCADOS NOSSO SUPER SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Comércio a retalho em supermercados e hipermercados",
    caeCode: "47111",
    endereco: "AV. HO CHI MINH, Nº 15",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2009-11-20",
    dataActualizacao: "2024-01-01",
  },
  "5001122334": {
    nif: "5001122334",
    nome: "MULTIPLEX DISTRIBUIÇÃO LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Comércio por grosso não especializado",
    caeCode: "46900",
    endereco: "R. RAINHA GINGA, Nº 120",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2018-02-14",
    dataActualizacao: "2023-03-20",
  },
  "5004455667": {
    nif: "5004455667",
    nome: "PAPERWORK PAPELARIA LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "INACTIVO",
    regimeFiscal: "Regime Simplificado",
    actividadePrincipal: "Comércio a retalho de artigos de papelaria",
    caeCode: "47621",
    endereco: "MERCADO DO KINAXIXE, LOTE 12",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2017-04-20",
    dataActualizacao: "2022-05-18",
  },
  "5218304756": {
    nif: "5218304756",
    nome: "KERO ANGOLA SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Comércio a retalho em hipermercados",
    caeCode: "47111",
    endereco: "TALATONA, AV. DO AEROPORTO",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2012-08-10",
    dataActualizacao: "2024-04-01",
  },
  // ── Industria & Agro-indústria ──────────────────────────────────────────────
  "5500678901": {
    nif: "5500678901",
    nome: "REFRIANGO — REFRIGERANTES DE ANGOLA SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Fabricação de refrigerantes e outras bebidas não alcoólicas",
    caeCode: "11070",
    endereco: "VIANA, PARQUE INDUSTRIAL",
    municipio: "Viana",
    provincia: "Luanda",
    dataRegisto: "2003-08-15",
    dataActualizacao: "2023-05-01",
  },
  "5384921067": {
    nif: "5384921067",
    nome: "AGROANGOLA — AGRO-INDÚSTRIA DO KWANZA SUL SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Cultivo de cereais, leguminosas e sementes oleaginosas",
    caeCode: "01110",
    endereco: "FAZENDA GRANDE, KM 40",
    municipio: "Sumbe",
    provincia: "Kwanza Sul",
    dataRegisto: "2008-04-01",
    dataActualizacao: "2023-10-01",
  },
  "5729043185": {
    nif: "5729043185",
    nome: "MALANJE AGROPECUÁRIA LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Simplificado",
    actividadePrincipal: "Criação de bovinos para produção de leite",
    caeCode: "01410",
    endereco: "FAZENDA RIO CUANZA, MALANJE",
    municipio: "Malanje",
    provincia: "Malanje",
    dataRegisto: "2013-06-15",
    dataActualizacao: "2023-08-01",
  },
  "5163048927": {
    nif: "5163048927",
    nome: "HUÍLA CAFÉ — COMERCIALIZAÇÃO E EXPORTAÇÃO LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Cultivo de café",
    caeCode: "01270",
    endereco: "RUA DA INDEPENDÊNCIA, Nº 15",
    municipio: "Lubango",
    provincia: "Huíla",
    dataRegisto: "2010-11-20",
    dataActualizacao: "2024-01-01",
  },
  // ── Transportes & Logística ─────────────────────────────────────────────────
  "5002233445": {
    nif: "5002233445",
    nome: "OFICINAS MECÂNICAS DO SUL LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Simplificado",
    actividadePrincipal: "Manutenção e reparação de veículos automóveis",
    caeCode: "45200",
    endereco: "ZONA INDUSTRIAL, LOTE 45",
    municipio: "Lubango",
    provincia: "Huíla",
    dataRegisto: "2019-11-05",
    dataActualizacao: "2023-06-10",
  },
  "5509182736": {
    nif: "5509182736",
    nome: "TAAG — LINHAS AÉREAS DE ANGOLA EP",
    tipoContribuinte: "Entidade Pública",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Transporte aéreo de passageiros",
    caeCode: "51100",
    endereco: "AEROPORTO INTERNACIONAL DE LUANDA, TERMINAL 1",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "1979-01-01",
    dataActualizacao: "2024-01-01",
  },
  "5672019483": {
    nif: "5672019483",
    nome: "BENGUELA LOGÍSTICA E TRANSPORTES LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Simplificado",
    actividadePrincipal: "Transporte rodoviário de mercadorias",
    caeCode: "49410",
    endereco: "ZONA INDUSTRIAL DO LOBITO, LOTE 22",
    municipio: "Lobito",
    provincia: "Benguela",
    dataRegisto: "2017-03-08",
    dataActualizacao: "2023-09-01",
  },
  // ── Saúde ───────────────────────────────────────────────────────────────────
  "4100234567": {
    nif: "4100234567",
    nome: "HOSPITAL PÚBLICO DO UÍGE",
    tipoContribuinte: "Entidade Pública",
    estado: "ACTIVO",
    regimeFiscal: "Isento",
    actividadePrincipal: "Actividades dos hospitais gerais",
    caeCode: "86100",
    endereco: "AV. DO HOSPITAL, Nº 1",
    municipio: "Uíge",
    provincia: "Uíge",
    dataRegisto: "1975-11-11",
    dataActualizacao: "2023-01-01",
  },
  "5348209176": {
    nif: "5348209176",
    nome: "CLÍNICA GIRASSOL SA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Actividades de clínicas com internamento",
    caeCode: "86100",
    endereco: "AV. DEOLINDA RODRIGUES, Nº 4",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2004-05-20",
    dataActualizacao: "2024-02-01",
  },
  // ── Educação ────────────────────────────────────────────────────────────────
  "4200567891": {
    nif: "4200567891",
    nome: "UNIVERSIDADE AGOSTINHO NETO",
    tipoContribuinte: "Entidade Pública",
    estado: "ACTIVO",
    regimeFiscal: "Isento",
    actividadePrincipal: "Ensino superior universitário",
    caeCode: "85420",
    endereco: "AV. 4 DE FEVEREIRO, Nº 7",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "1976-01-01",
    dataActualizacao: "2023-01-01",
  },
  "5291038467": {
    nif: "5291038467",
    nome: "COLÉGIO INTERNACIONAL DE ANGOLA LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Ensino secundário de formação geral",
    caeCode: "85310",
    endereco: "TALATONA, RUA DOS ESTUDANTES",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2001-02-10",
    dataActualizacao: "2024-01-01",
  },
  "5437812095": {
    nif: "5437812095",
    nome: "INSTITUTO SUPERIOR POLITÉCNICO DO KWANZA NORTE LDA",
    tipoContribuinte: "Pessoa Colectiva",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Ensino superior politécnico",
    caeCode: "85421",
    endereco: "AV. DA REPÚBLICA, Nº 3",
    municipio: "N'dalatando",
    provincia: "Kwanza Norte",
    dataRegisto: "2011-08-30",
    dataActualizacao: "2023-05-01",
  },
  // ── Sector Público / Organismos ─────────────────────────────────────────────
  "4300890124": {
    nif: "4300890124",
    nome: "MINISTÉRIO DAS FINANÇAS DE ANGOLA",
    tipoContribuinte: "Entidade Pública",
    estado: "ACTIVO",
    regimeFiscal: "Não Sujeito",
    actividadePrincipal: "Administração pública em geral",
    caeCode: "84110",
    endereco: "AV. 4 DE FEVEREIRO, Nº 1",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "1975-11-11",
    dataActualizacao: "2024-01-01",
  },
  "4400123789": {
    nif: "4400123789",
    nome: "GOVERNO DA PROVÍNCIA DO BIÉ",
    tipoContribuinte: "Entidade Pública",
    estado: "ACTIVO",
    regimeFiscal: "Não Sujeito",
    actividadePrincipal: "Administração pública regional",
    caeCode: "84110",
    endereco: "AV. DA INDEPENDÊNCIA, Nº 1",
    municipio: "Kuito",
    provincia: "Bié",
    dataRegisto: "1975-11-11",
    dataActualizacao: "2023-01-01",
  },
  // ── Pessoas Singulares ──────────────────────────────────────────────────────
  "123456789": {
    nif: "123456789",
    nome: "JOÃO MANUEL DA SILVA",
    tipoContribuinte: "Pessoa Singular",
    estado: "ACTIVO",
    regimeFiscal: "Regime Simplificado",
    actividadePrincipal: "Actividade por conta própria",
    caeCode: "99000",
    endereco: "RUA DA PAZ, Nº 10",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2015-03-10",
    dataActualizacao: "2023-01-01",
  },
  "234567891": {
    nif: "234567891",
    nome: "MARIA DE FÁTIMA ANTÓNIO",
    tipoContribuinte: "Pessoa Singular",
    estado: "ACTIVO",
    regimeFiscal: "Regime Simplificado",
    actividadePrincipal: "Comércio a retalho ambulante",
    caeCode: "47890",
    endereco: "BAIRRO RANGEL, RUA DA UNIDADE, Nº 22",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2018-07-14",
    dataActualizacao: "2023-03-01",
  },
  "345678912": {
    nif: "345678912",
    nome: "PEDRO AUGUSTO NETO FRANCISCO",
    tipoContribuinte: "Pessoa Singular",
    estado: "ACTIVO",
    regimeFiscal: "Regime Geral",
    actividadePrincipal: "Consultoria em tecnologias de informação",
    caeCode: "62020",
    endereco: "TALATONA, CONDOMÍNIO HORIZONTE, Nº 14",
    municipio: "Luanda",
    provincia: "Luanda",
    dataRegisto: "2020-01-20",
    dataActualizacao: "2024-01-01",
  },
  "456789123": {
    nif: "456789123",
    nome: "ANA PAULA SOUSA MENDES",
    tipoContribuinte: "Pessoa Singular",
    estado: "SUSPENSO",
    regimeFiscal: "Regime Simplificado",
    actividadePrincipal: "Cabeleireiro e outros tratamentos de beleza",
    caeCode: "96020",
    endereco: "MERCADO DO ROCHA PINTO, LOJA 8",
    municipio: "Benguela",
    provincia: "Benguela",
    dataRegisto: "2016-05-05",
    dataActualizacao: "2022-11-01",
  },
};

// ── Função principal de consulta ───────────────────────────────────────────────

export async function agtLookupNif(nif: string): Promise<AgtLookupResult> {
  const agora = new Date().toISOString();
  const nifLimpo = nif.replace(/[\s\-\.]/g, "");

  // 1. Validar formato
  if (!validarFormatoNif(nifLimpo)) {
    return {
      ok: false,
      error: "nif_invalido",
      mensagem: `O NIF "${nif}" tem formato inválido. Deve conter 9 ou 10 dígitos numéricos.`,
      fonte: "mock",
      consultadoEm: agora,
    };
  }

  // 2. Tentar API real se estiver configurada
  const apiUrl = process.env.NEXT_PUBLIC_AGT_API_URL;
  const apiKey = process.env.NEXT_PUBLIC_AGT_API_KEY;

  if (apiUrl && apiKey) {
    try {
      const res = await fetch(`${apiUrl}/api/contribuinte/validar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ nif: nifLimpo }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        // Mapear resposta real da AGT para o nosso tipo
        return {
          ok: true,
          contribuinte: {
            nif: nifLimpo,
            nome: data.denominacao || data.nome,
            tipoContribuinte: mapTipoAgt(data.tipo),
            estado: data.estado?.toUpperCase() as AgtEstado || "ACTIVO",
            regimeFiscal: mapRegimeAgt(data.regime),
            actividadePrincipal: data.actividade || "",
            caeCode: data.cae || "",
            endereco: data.morada || data.endereco || "",
            municipio: data.municipio || "",
            provincia: data.provincia || "",
            dataRegisto: data.dataRegisto || "",
            dataActualizacao: data.dataActualizacao || agora.slice(0, 10),
          },
          fonte: "agt_live",
          consultadoEm: agora,
        };
      }

      if (res.status === 404) {
        return { ok: false, error: "nao_encontrado", mensagem: `NIF ${nifLimpo} não encontrado na base de dados da AGT.`, fonte: "agt_live", consultadoEm: agora };
      }
    } catch {
      // fallthrough para mock em caso de erro de rede
    }
  }

  // 3. Mock: simular latência realista de rede
  await new Promise(r => setTimeout(r, 700 + Math.random() * 600));

  const encontrado = MOCK_DB[nifLimpo];

  if (encontrado) {
    return { ok: true, contribuinte: encontrado, fonte: "mock", consultadoEm: agora };
  }

  // 4. Gerar resposta plausível para NIFs válidos não presentes na base mock
  //    (modo demonstração — a API real da AGT devolveria os dados reais)
  const gerado = gerarMockContribuinte(nifLimpo);
  return { ok: true, contribuinte: gerado, fonte: "mock", consultadoEm: agora };
}

// ── Gerador de dados plausíveis para NIFs desconhecidos ───────────────────────

const PROVINCIAS = [
  "Luanda", "Bengo", "Kwanza Norte", "Kwanza Sul", "Malanje",
  "Benguela", "Huambo", "Bié", "Moxico", "Huíla", "Namibe",
  "Cunene", "Cuando Cubango", "Lunda Norte", "Lunda Sul",
  "Cabinda", "Uíge", "Zaire",
];

const MUNICIPIOS: Record<string, string> = {
  "Luanda":        "Luanda",
  "Benguela":      "Benguela",
  "Huíla":         "Lubango",
  "Huambo":        "Huambo",
  "Cabinda":       "Cabinda",
  "Bengo":         "Caxito",
  "Uíge":          "Uíge",
  "Zaire":         "M'banza Kongo",
  "Kwanza Norte":  "N'dalatando",
  "Kwanza Sul":    "Sumbe",
  "Malanje":       "Malanje",
  "Bié":           "Kuito",
  "Moxico":        "Luena",
  "Namibe":        "Moçâmedes",
  "Cunene":        "Ondjiva",
  "Cuando Cubango":"Menongue",
  "Lunda Norte":   "Dundo",
  "Lunda Sul":     "Saurimo",
};

const ACTIVIDADES_COLECTIVA: [string, string][] = [
  ["Comércio por grosso não especializado",                       "46900"],
  ["Comércio a retalho em estabelecimentos não especializados",   "47190"],
  ["Construção de edifícios residenciais e não residenciais",     "41200"],
  ["Actividades de consultoria para os negócios",                 "70220"],
  ["Transporte rodoviário de mercadorias",                        "49410"],
  ["Actividades dos serviços de tecnologias de informação",       "62090"],
  ["Actividades de contabilidade e auditoria",                    "69200"],
  ["Comércio a retalho de equipamento informático",               "47410"],
  ["Actividades de restauração",                                  "56100"],
  ["Actividades imobiliárias por conta própria",                  "68100"],
  ["Actividades de arquitectura e engenharia",                    "71110"],
  ["Fabricação de produtos alimentares",                          "10890"],
  ["Actividades de agências de trabalho temporário",              "78200"],
];

// Prefixos e sufixos para geração de nomes realistas
const PREFIXOS = [
  "ANGOLA", "LUANDA", "BENGUELA", "NOVA", "CENTRAL", "NACIONAL",
  "GLOBAL", "AFRICANA", "KWANZA", "ATLÂNTICO", "SUL",
];
const SUFIXOS = [
  "COMÉRCIO", "SERVIÇOS", "CONSTRUÇÃO", "LOGÍSTICA", "INVESTIMENTOS",
  "DISTRIBUIÇÃO", "EMPREENDIMENTOS", "ENGENHARIA", "SOLUÇÕES", "INDÚSTRIA",
];
const TIPOS_EMPRESA = ["LDA", "SA", "UNIPESSOAL LDA", "EP"];

// Nomes próprios para Pessoas Singulares
const PRIMEIROS_NOMES = [
  "ANTÓNIO", "MARIA", "PEDRO", "ANA", "CARLOS", "BEATRIZ",
  "MANUEL", "FILOMENA", "JORGE", "ESPERANÇA", "FRANCISCO", "TERESA",
];
const APELIDOS = [
  "SILVA", "SANTOS", "FERREIRA", "COSTA", "NETO", "LOPES",
  "SOUSA", "PEREIRA", "FRANCISCO", "ANDRÉ", "ANTÓNIO", "DOMINGOS",
];

function gerarMockContribuinte(nif: string): AgtContribuinte {
  // Usar o NIF como semente determinística para escolhas consistentes
  const seed = nif.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pick = <T>(arr: T[]): T => arr[seed % arr.length];
  // Segunda função pick com deslocamento para evitar repetição de padrão
  const pick2 = <T>(arr: T[]): T => arr[(seed * 7 + 3) % arr.length];

  const isPrimeiroDigito4 = nif.startsWith("4");
  const isSingular = nif.length === 9;

  let tipo: AgtTipoContribuinte;
  let regime: AgtRegimeFiscal;
  let actividade: string;
  let cae: string;
  let nome: string;
  let morada: string;

  if (isSingular) {
    tipo = "Pessoa Singular";
    regime = seed % 3 === 0 ? "Regime Simplificado" : "Regime Geral";
    actividade = "Actividade por conta própria";
    cae = "99000";
    nome = `${pick(PRIMEIROS_NOMES)} ${pick2(APELIDOS)} DA ${pick(["SILVA", "COSTA", "CUNHA"])}`;
    morada = `RUA ${pick(["DA PAZ", "DA UNIDADE", "DO PROGRESSO", "DE ANGOLA"])}, Nº ${(seed % 200) + 1}`;
  } else if (isPrimeiroDigito4) {
    tipo = "Entidade Pública";
    regime = seed % 2 === 0 ? "Isento" : "Não Sujeito";
    const [act, c] = ACTIVIDADES_COLECTIVA[seed % ACTIVIDADES_COLECTIVA.length];
    actividade = act; cae = c;
    const tiposPublico = ["DIRECÇÃO PROVINCIAL", "GOVERNO MUNICIPAL", "REPARTIÇÃO FISCAL", "DIRECÇÃO NACIONAL"];
    nome = `${pick(tiposPublico)} DE ${pick2(["LUANDA", "BENGUELA", "HUAMBO", "HUÍLA", "CABINDA", "MALANJE"])}`;
    morada = `AV. ${pick(["4 DE FEVEREIRO", "COMANDANTE VALÓDIA", "HO CHI MINH", "DA REPÚBLICA"])}, Nº ${(seed % 150) + 10}`;
  } else {
    tipo = "Pessoa Colectiva";
    regime = seed % 4 === 0 ? "Regime Simplificado" : "Regime Geral";
    const [act, c] = ACTIVIDADES_COLECTIVA[seed % ACTIVIDADES_COLECTIVA.length];
    actividade = act; cae = c;
    const tipoEmpresa = TIPOS_EMPRESA[(seed * 13) % TIPOS_EMPRESA.length];
    nome = `${pick(PREFIXOS)} ${pick2(SUFIXOS)} ${(seed % 9) + 1}${nif.slice(-2)} ${tipoEmpresa}`;
    morada = `${pick(["RUA RAINHA GINGA", "AV. LENINE", "ZONA INDUSTRIAL", "AV. 4 DE FEVEREIRO", "RUA MAJOR KANHANGULO"])}, Nº ${(seed % 300) + 1}`;
  }

  const provincia = pick(PROVINCIAS);
  const municipio = MUNICIPIOS[provincia] ?? provincia;

  const anoReg = 2005 + (seed % 19); // 2005–2023
  const mesReg = String((seed % 12) + 1).padStart(2, "0");
  const diaReg = String((seed % 28) + 1).padStart(2, "0");

  // dataActualizacao: usar aritmética segura com padding correcto
  const anoAct = 2022 + (seed % 3); // 2022–2024
  const mesAct = String(((seed * 3) % 12) + 1).padStart(2, "0");
  const diaAct = String(((seed * 5) % 28) + 1).padStart(2, "0");

  return {
    nif,
    nome,
    tipoContribuinte: tipo,
    estado: seed % 10 === 0 ? "INACTIVO" : "ACTIVO",
    regimeFiscal: regime,
    actividadePrincipal: actividade,
    caeCode: cae,
    endereco: morada,
    municipio,
    provincia,
    dataRegisto: `${anoReg}-${mesReg}-${diaReg}`,
    dataActualizacao: `${anoAct}-${mesAct}-${diaAct}`,
  };
}

// ── Helpers de mapeamento ──────────────────────────────────────────────────────

function mapTipoAgt(tipo: string): AgtTipoContribuinte {
  if (!tipo) return "Pessoa Colectiva";
  const t = tipo.toLowerCase();
  if (t.includes("singular")) return "Pessoa Singular";
  if (t.includes("publica") || t.includes("pública")) return "Entidade Pública";
  if (t.includes("organismo") || t.includes("internacional")) return "Organismo Internacional";
  return "Pessoa Colectiva";
}

function mapRegimeAgt(regime: string): AgtRegimeFiscal {
  if (!regime) return "Regime Geral";
  const r = regime.toLowerCase();
  if (r.includes("simplificado")) return "Regime Simplificado";
  if (r.includes("isento")) return "Isento";
  if (r.includes("sujeito")) return "Não Sujeito";
  return "Regime Geral";
}

// ── Utilitários para UI ────────────────────────────────────────────────────────

/** Converte o tipo AGT para o tipo interno do ERP (cliente ou fornecedor) */
export function agtTipoParaCliente(tipo: AgtTipoContribuinte): "empresa" | "particular" | "publica" | "estrangeira" {
  switch (tipo) {
    case "Pessoa Singular": return "particular";
    case "Entidade Pública": return "publica";
    case "Organismo Internacional": return "estrangeira";
    default: return "empresa";
  }
}

export function agtTipoParaFornecedor(tipo: AgtTipoContribuinte): "empresa" | "particular" | "estrangeiro" | "publica" {
  switch (tipo) {
    case "Pessoa Singular": return "particular";
    case "Entidade Pública": return "publica";
    case "Organismo Internacional": return "estrangeiro";
    default: return "empresa";
  }
}

export function agtRegimeParaIva(regime: AgtRegimeFiscal): "normal" | "simplificado" | "isento" | "nao_sujeito" {
  switch (regime) {
    case "Regime Simplificado": return "simplificado";
    case "Isento": return "isento";
    case "Não Sujeito": return "nao_sujeito";
    default: return "normal";
  }
}

/** Formata a data+hora da consulta para exibição */
export function formatarDataConsulta(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-AO", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
