"use client";

import { useState, useMemo, useCallback } from "react";
import { useCollection } from "@/lib/useCollection";
import Topbar from "@/components/Topbar";
import { useJournal } from "@/lib/journal";
import { ANOS_DISPONIVEIS } from "@/lib/accounting/sampleData";
import { useWindowManager } from "@/lib/windowManager";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — Lei n.º 7/15 (LGT), Lei n.º 14/25 (IRT), Lei n.º 7/04 (INSS)
// ═══════════════════════════════════════════════════════════════════════════════

type EstadoFunc   = "ACTIVO" | "INACTIVO" | "SUSPENSO" | "CESSADO";
type TipoContrato = "INDETERMINADO" | "DETERMINADO" | "PRESTACAO_SERVICOS" | "ESTAGIO";
type Sexo         = "M" | "F";
type EstadoCivil  = "SOLTEIRO" | "CASADO" | "DIVORCIADO" | "VIUVO" | "UNIAO_FACTO";
type Habilitacoes = "BASICO" | "MEDIO" | "TECNICO" | "LICENCIATURA" | "MESTRADO" | "DOUTORAMENTO" | "OUTRO";
type MetodoPagamento = "TRANSFERENCIA" | "CHEQUE" | "NUMERARIO";

interface Funcionario {
  id: string;
  numero: string;           // EMP-001

  // ── Dados Pessoais ───────────────────────────────────────────────────────
  nome: string;
  dataNascimento: string;   // ISO date
  sexo: Sexo;
  estadoCivil: EstadoCivil;
  numeroDependentes: number;
  naturalidade: string;
  nacionalidade: string;

  // ── Documentação ──────────────────────────────────────────────────────────
  nrBI: string;
  validadeBI: string;
  nif: string;
  nrINSS: string;           // Nº beneficiário INSS
  passaporte?: string;

  // ── Contacto ──────────────────────────────────────────────────────────────
  morada: string;
  municipio: string;
  provincia: string;
  telefone: string;
  telefoneAlternativo?: string;
  emailPessoal?: string;
  emailCorporativo?: string;
  contactoEmergNome?: string;
  contactoEmergTel?: string;
  contactoEmergParentesco?: string;

  // ── Dados Profissionais ───────────────────────────────────────────────────
  cargo: string;
  categoriaProfissional: string;
  departamento: string;
  centroCusto?: string;
  localTrabalho?: string;
  horasSemanais: number;    // padrão 44h (art. 96.º LGT)
  tipoContrato: TipoContrato;
  dataAdmissao: string;
  dataInicioCargo?: string;
  dataFimContrato?: string;

  // ── Habilitações ──────────────────────────────────────────────────────────
  habilitacoes?: Habilitacoes;
  cursoAreaFormacao?: string;
  instituicaoEnsino?: string;
  anoConlusao?: string;

  // ── Remuneração ───────────────────────────────────────────────────────────
  salarioBase: number;
  subsidioAlimentacao: number;  // Isento IRT até limite legal
  subsidioTransporte: number;   // Isento IRT (art. 2.º DL n.º 35/13)
  subsidioHabitacao: number;
  subsidioFuncao: number;
  outrosSubsidios: number;
  metodoPagamento: MetodoPagamento;
  iban?: string;
  banco?: string;
  agencia?: string;

  // ── Estado ────────────────────────────────────────────────────────────────
  estado: EstadoFunc;
  dataCessacao?: string;
  motivoCessacao?: string;
  observacoes?: string;
}

// Salary component for enhanced payroll
interface ComponenteAdicional {
  descricao: string;
  valor: number;
  tipo: "hora_extra_50" | "hora_extra_75" | "hora_extra_100" | "premio" | "subsidio_ferias" | "13_mes" | "adiantamento" | "emprestimo" | "outro_desconto";
}

interface LinhaFolha {
  funcId: string;
  nome: string;
  cargo: string;
  departamento: string;
  // Base salarial
  salarioBase: number;
  subsidioAlimentacao: number;
  subsidioTransporte: number;
  outrosSubsidios: number;
  // Adicionais
  horasExtra: number;
  premios: number;
  outros: number;
  // Total sujeito a desconto
  brutoTotal: number;       // tudo incluído
  baseIRT: number;          // bruto − subsídios isentos
  baseINSS: number;
  // Descontos
  inss3: number;            // 3% trabalhador
  irt: number;
  adiantamentos: number;
  outrosDescontos: number;
  // Liquido
  liquido: number;
  // Custo empregador
  inss8: number;            // 8% patronal
  fct: number;              // 1% FCT (Lei n.º 15/16)
  custoTotal: number;
}

interface FolhaSalarial {
  id: string;
  numero: string;           // FS/2026/001
  mes: string;              // "2026-06"
  descricao: string;
  linhas: LinhaFolha[];
  // Totais
  totalBruto: number;
  totalIRT: number;
  totalINSS3: number;
  totalINSS8: number;
  totalFCT: number;
  totalLiquido: number;
  totalCusto: number;
  // Estado
  estado: "RASCUNHO" | "PROCESSADA" | "PAGA" | "ANULADA";
  criadoEm: string;
  processadaEm?: string;
  pagaEm?: string;
  diarioRef?: string;
}

interface Ausencia {
  id: string;
  funcId: string;
  tipo: "FERIAS" | "DOENCA" | "MAT" | "PAT" | "FALTA_JUST" | "FALTA_INJ" | "FORMACAO" | "OUTRO";
  dataInicio: string;
  dataFim: string;
  diasUteis: number;
  estado: "PENDENTE" | "APROVADO" | "REJEITADO";
  aprovadoPor?: string;
  observacoes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IRT 2026 — Lei n.º 14/25 de 29 de Setembro (OGE 2026) — Categoria A
// ═══════════════════════════════════════════════════════════════════════════════
// IRT = Base × Taxa − Parcela_a_Abater

interface EscalaoIRT { min: number; max: number; taxa: number; parcela: number; }

const TABELA_IRT_2026: EscalaoIRT[] = [
  { min:           0, max:      70_000, taxa: 0.00, parcela:         0 },
  { min:      70_001, max:     100_000, taxa: 0.10, parcela:     7_000 },
  { min:     100_001, max:     150_000, taxa: 0.13, parcela:    10_000 },
  { min:     150_001, max:     200_000, taxa: 0.16, parcela:    14_500 },
  { min:     200_001, max:     300_000, taxa: 0.18, parcela:    18_500 },
  { min:     300_001, max:     500_000, taxa: 0.19, parcela:    21_500 },
  { min:     500_001, max:   1_000_000, taxa: 0.20, parcela:    26_500 },
  { min:   1_000_001, max: Infinity,    taxa: 0.25, parcela:    76_500 },
];

function calcIRT(baseIRT: number): number {
  if (baseIRT <= 0) return 0;
  const e = TABELA_IRT_2026.find(r => baseIRT >= r.min && baseIRT <= r.max)
         ?? TABELA_IRT_2026[TABELA_IRT_2026.length - 1];
  return Math.max(0, Math.round(baseIRT * e.taxa - e.parcela));
}

// Subsídio de alimentação isento de IRT (Decreto Executivo, 2026)
const LIMITE_ISENTO_ALIMENT = 30_000;
// Subsídio de transporte isento na totalidade (art. 2.º DL 35/13)
const INSS_TRABALHADOR = 0.03;
const INSS_PATRONAL    = 0.08;
const FCT_TAXA         = 0.01;  // Lei n.º 15/16
const HORAS_SEMANA     = 44;    // art. 96.º Lei n.º 7/15

function calcLinhaFolha(
  f: Funcionario,
  adicionais: ComponenteAdicional[] = [],
): LinhaFolha {
  const horasExtra = adicionais.filter(a => a.tipo.startsWith("hora_extra")).reduce((s, a) => s + a.valor, 0);
  const premios    = adicionais.filter(a => a.tipo === "premio").reduce((s, a) => s + a.valor, 0);
  const outros     = adicionais.filter(a => !["adiantamento","emprestimo","outro_desconto"].includes(a.tipo) && !a.tipo.startsWith("hora_extra") && a.tipo !== "premio").reduce((s, a) => s + a.valor, 0);
  const adiantamentos   = adicionais.filter(a => a.tipo === "adiantamento").reduce((s, a) => s + a.valor, 0);
  const outrosDescontos = adicionais.filter(a => ["emprestimo","outro_desconto"].includes(a.tipo)).reduce((s, a) => s + a.valor, 0);

  const isentosIRT = Math.min(f.subsidioAlimentacao, LIMITE_ISENTO_ALIMENT)
                   + f.subsidioTransporte;
  const brutoTotal = f.salarioBase + f.subsidioAlimentacao + f.subsidioTransporte
                   + f.subsidioHabitacao + f.subsidioFuncao + f.outrosSubsidios
                   + horasExtra + premios + outros;
  const baseIRT  = Math.max(0, brutoTotal - isentosIRT);
  const baseINSS = f.salarioBase + f.subsidioHabitacao + f.subsidioFuncao + f.outrosSubsidios + horasExtra + premios + outros;

  const inss3 = Math.round(baseINSS * INSS_TRABALHADOR);
  const irt   = calcIRT(baseIRT);
  const liquido = brutoTotal - inss3 - irt - adiantamentos - outrosDescontos;
  const inss8   = Math.round(baseINSS * INSS_PATRONAL);
  const fct     = Math.round(f.salarioBase * FCT_TAXA);
  const custoTotal = brutoTotal + inss8 + fct;

  return {
    funcId: f.id, nome: f.nome, cargo: f.cargo, departamento: f.departamento,
    salarioBase: f.salarioBase,
    subsidioAlimentacao: f.subsidioAlimentacao,
    subsidioTransporte: f.subsidioTransporte,
    outrosSubsidios: f.subsidioHabitacao + f.subsidioFuncao + f.outrosSubsidios,
    horasExtra, premios, outros,
    brutoTotal, baseIRT, baseINSS,
    inss3, irt, adiantamentos, outrosDescontos,
    liquido, inss8, fct, custoTotal,
  };
}

function calcHoraExtra(salarioBase: number, horas: number, tipo: "50"|"75"|"100"): number {
  const valorHora = salarioBase / (HORAS_SEMANA * 52 / 12);
  const mult = tipo === "50" ? 1.5 : tipo === "75" ? 1.75 : 2.0;
  return Math.round(valorHora * horas * mult);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════════════════════

const SEED_FUNC: Funcionario[] = [
  {
    id:"e1", numero:"EMP-001", nome:"João António Ferreira", dataNascimento:"1978-03-15",
    sexo:"M", estadoCivil:"CASADO", numeroDependentes:3, naturalidade:"Luanda", nacionalidade:"Angolana",
    nrBI:"003456789LA041", validadeBI:"2028-01-01", nif:"5000111222", nrINSS:"0012345678",
    morada:"Av. Lenine, 58 — R/C", municipio:"Luanda", provincia:"Luanda",
    telefone:"+244 923 100 200", emailCorporativo:"jferreira@empresa.ao",
    contactoEmergNome:"Maria Ferreira", contactoEmergTel:"+244 912 300 400", contactoEmergParentesco:"Cônjuge",
    cargo:"Director Financeiro", categoriaProfissional:"Quadro Superior", departamento:"Financeiro",
    centroCusto:"fin", horasSemanais:44, tipoContrato:"INDETERMINADO", dataAdmissao:"2019-02-01",
    habilitacoes:"LICENCIATURA", cursoAreaFormacao:"Gestão Financeira", instituicaoEnsino:"UAN",
    salarioBase:350_000, subsidioAlimentacao:30_000, subsidioTransporte:15_000,
    subsidioHabitacao:50_000, subsidioFuncao:20_000, outrosSubsidios:0,
    metodoPagamento:"TRANSFERENCIA", iban:"AO06 0006 0000 1234 5678 1015 7", banco:"BPC",
    estado:"ACTIVO",
  },
  {
    id:"e2", numero:"EMP-002", nome:"Maria Silva Costa", dataNascimento:"1985-07-22",
    sexo:"F", estadoCivil:"SOLTEIRO", numeroDependentes:1, naturalidade:"Benguela", nacionalidade:"Angolana",
    nrBI:"007654321BE031", validadeBI:"2027-06-01", nif:"5001222333", nrINSS:"0023456789",
    morada:"Rua da Missão, 12", municipio:"Luanda", provincia:"Luanda",
    telefone:"+244 912 200 300", emailCorporativo:"mscosta@empresa.ao",
    cargo:"Contabilista Sénior", categoriaProfissional:"Técnico Superior", departamento:"Contabilidade",
    centroCusto:"fin", horasSemanais:44, tipoContrato:"INDETERMINADO", dataAdmissao:"2021-05-15",
    habilitacoes:"LICENCIATURA", cursoAreaFormacao:"Contabilidade e Auditoria",
    salarioBase:220_000, subsidioAlimentacao:25_000, subsidioTransporte:12_000,
    subsidioHabitacao:0, subsidioFuncao:15_000, outrosSubsidios:0,
    metodoPagamento:"TRANSFERENCIA", banco:"BAI",
    estado:"ACTIVO",
  },
  {
    id:"e3", numero:"EMP-003", nome:"Paulo Luís Mendes", dataNascimento:"1982-11-05",
    sexo:"M", estadoCivil:"CASADO", numeroDependentes:4, naturalidade:"Huambo", nacionalidade:"Angolana",
    nrBI:"005678901HU021", validadeBI:"2026-12-01", nif:"5002333444", nrINSS:"0034567890",
    morada:"Bairro Miramar, Av. 21 de Janeiro", municipio:"Luanda", provincia:"Luanda",
    telefone:"+244 923 300 400", emailCorporativo:"plmendes@empresa.ao",
    cargo:"Gestor Comercial", categoriaProfissional:"Quadro Médio", departamento:"Comercial",
    centroCusto:"com", horasSemanais:44, tipoContrato:"INDETERMINADO", dataAdmissao:"2020-03-01",
    habilitacoes:"LICENCIATURA", cursoAreaFormacao:"Marketing",
    salarioBase:250_000, subsidioAlimentacao:25_000, subsidioTransporte:20_000,
    subsidioHabitacao:0, subsidioFuncao:10_000, outrosSubsidios:0,
    metodoPagamento:"TRANSFERENCIA", banco:"BFA",
    estado:"ACTIVO",
  },
  {
    id:"e4", numero:"EMP-004", nome:"Ana Beatriz Rodrigues", dataNascimento:"1990-04-18",
    sexo:"F", estadoCivil:"CASADO", numeroDependentes:2, naturalidade:"Luanda", nacionalidade:"Angolana",
    nrBI:"008901234LA031", validadeBI:"2027-09-01", nif:"5003444555", nrINSS:"0045678901",
    morada:"Talatona, Rua das Acácias", municipio:"Luanda Sul", provincia:"Luanda",
    telefone:"+244 912 400 500", emailCorporativo:"abrodrigues@empresa.ao",
    cargo:"Técnica de Recursos Humanos", categoriaProfissional:"Técnico Médio", departamento:"RH",
    centroCusto:"rh", horasSemanais:44, tipoContrato:"INDETERMINADO", dataAdmissao:"2022-01-10",
    habilitacoes:"LICENCIATURA", cursoAreaFormacao:"Psicologia Organizacional",
    salarioBase:180_000, subsidioAlimentacao:20_000, subsidioTransporte:15_000,
    subsidioHabitacao:0, subsidioFuncao:0, outrosSubsidios:0,
    metodoPagamento:"TRANSFERENCIA", banco:"BIC",
    estado:"ACTIVO",
  },
  {
    id:"e5", numero:"EMP-005", nome:"Carlos Eduardo Lima", dataNascimento:"1992-08-30",
    sexo:"M", estadoCivil:"SOLTEIRO", numeroDependentes:0, naturalidade:"Cabinda", nacionalidade:"Angolana",
    nrBI:"002345678CB011", validadeBI:"2029-03-01", nif:"5004555666", nrINSS:"0056789012",
    morada:"Ingombota, Av. Amílcar Cabral", municipio:"Luanda", provincia:"Luanda",
    telefone:"+244 923 500 600", emailCorporativo:"celima@empresa.ao",
    cargo:"Técnico de Informática", categoriaProfissional:"Técnico Médio", departamento:"TI",
    centroCusto:"ti", horasSemanais:44, tipoContrato:"INDETERMINADO", dataAdmissao:"2021-09-01",
    habilitacoes:"LICENCIATURA", cursoAreaFormacao:"Engenharia Informática",
    salarioBase:210_000, subsidioAlimentacao:20_000, subsidioTransporte:12_000,
    subsidioHabitacao:0, subsidioFuncao:0, outrosSubsidios:0,
    metodoPagamento:"TRANSFERENCIA", banco:"BFA",
    estado:"ACTIVO",
  },
  {
    id:"e6", numero:"EMP-006", nome:"Fernanda Gomes Santos", dataNascimento:"1988-01-12",
    sexo:"F", estadoCivil:"DIVORCIADO", numeroDependentes:2, naturalidade:"Malanje", nacionalidade:"Angolana",
    nrBI:"009012345MA041", validadeBI:"2026-06-01", nif:"5005666777", nrINSS:"0067890123",
    morada:"Maianga, Rua da Samba", municipio:"Luanda", provincia:"Luanda",
    telefone:"+244 912 600 700", emailCorporativo:"fgsantos@empresa.ao",
    cargo:"Secretária Executiva", categoriaProfissional:"Administrativo", departamento:"Administração",
    centroCusto:"adm", horasSemanais:44, tipoContrato:"INDETERMINADO", dataAdmissao:"2018-06-01",
    habilitacoes:"MEDIO", cursoAreaFormacao:"Secretariado e Gestão de Escritório",
    salarioBase:140_000, subsidioAlimentacao:20_000, subsidioTransporte:10_000,
    subsidioHabitacao:0, subsidioFuncao:0, outrosSubsidios:0,
    metodoPagamento:"TRANSFERENCIA", banco:"BPC",
    estado:"ACTIVO",
  },
  {
    id:"e7", numero:"EMP-007", nome:"Roberto Castro Nunes", dataNascimento:"1975-05-20",
    sexo:"M", estadoCivil:"CASADO", numeroDependentes:5, naturalidade:"Uíge", nacionalidade:"Angolana",
    nrBI:"001234567UI031", validadeBI:"2025-12-01", nif:"5006777888", nrINSS:"0078901234",
    morada:"Rangel, Bairro 22 de Março", municipio:"Luanda", provincia:"Luanda",
    telefone:"+244 923 700 800",
    cargo:"Motorista", categoriaProfissional:"Auxiliar", departamento:"Logística",
    centroCusto:"ops", horasSemanais:44, tipoContrato:"INDETERMINADO", dataAdmissao:"2017-03-15",
    habilitacoes:"BASICO",
    salarioBase:95_000, subsidioAlimentacao:15_000, subsidioTransporte:15_000,
    subsidioHabitacao:0, subsidioFuncao:0, outrosSubsidios:0,
    metodoPagamento:"NUMERARIO",
    estado:"ACTIVO",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

function useFuncionarios() {
  const { items: lista, setItems: save, loading: loaded } = useCollection<Funcionario>("educontas-rh-funcionarios-v2", SEED_FUNC);

  const add    = useCallback((d: Omit<Funcionario,"id">) => save(prev => [...prev, { ...d, id: crypto.randomUUID() }]), [save]);
  const update = useCallback((id: string, p: Partial<Funcionario>) => save(prev => prev.map(f => f.id === id ? { ...f, ...p } : f)), [save]);
  const remove = useCallback((id: string) => save(prev => prev.filter(f => f.id !== id)), [save]);

  return { lista, loaded, add, update, remove };
}

function useFolhas(exercicio: string) {
  const seed = exercicio === "2024" ? buildSeedFolhas("2024") : [];
  const { items: folhas, setItems: save } = useCollection<FolhaSalarial>(`educontas-rh-folhas-v2-${exercicio}`, seed);

  const addFolha    = useCallback((f: FolhaSalarial) => save(prev => [f, ...prev]),                                      [save]);
  const updateFolha = useCallback((id: string, p: Partial<FolhaSalarial>) => save(prev => prev.map(f => f.id === id ? { ...f, ...p } : f)), [save]);
  const deleteFolha = useCallback((id: string) => save(prev => prev.filter(f => f.id !== id)),                           [save]);

  return { folhas, addFolha, updateFolha, deleteFolha };
}

function buildSeedFolhas(exercicio: string): FolhaSalarial[] {
  const meses = ["11","10","09"];
  return meses.map((m, i) => {
    const linhas = SEED_FUNC.map(f => calcLinhaFolha(f));
    const totals = {
      totalBruto:  linhas.reduce((s,l) => s + l.brutoTotal, 0),
      totalIRT:    linhas.reduce((s,l) => s + l.irt, 0),
      totalINSS3:  linhas.reduce((s,l) => s + l.inss3, 0),
      totalINSS8:  linhas.reduce((s,l) => s + l.inss8, 0),
      totalFCT:    linhas.reduce((s,l) => s + l.fct, 0),
      totalLiquido:linhas.reduce((s,l) => s + l.liquido, 0),
      totalCusto:  linhas.reduce((s,l) => s + l.custoTotal, 0),
    };
    return {
      id: `fs-seed-${i}`, numero: `FS/${exercicio}/${m}`,
      mes: `${exercicio}-${m}`, descricao: `Folha Salarial — ${exercicio}/${m}`,
      linhas, ...totals,
      estado: "PAGA" as const, criadoEm: `${exercicio}-${m}-30T09:00:00Z`,
      pagaEm: `${exercicio}-${m}-30T10:00:00Z`,
    };
  });
}

// ── Ausências hook ─────────────────────────────────────────────────────────────
function useAusencias() {
  const { items: lista, setItems: save } = useCollection<Ausencia>("educontas-rh-ausencias-v2", SEED_AUSENCIAS);

  const add    = useCallback((a: Omit<Ausencia,"id">) => save(prev => [...prev, { ...a, id: crypto.randomUUID() }]), [save]);
  const update = useCallback((id: string, p: Partial<Ausencia>) => save(prev => prev.map(a => a.id === id ? { ...a, ...p } : a)), [save]);

  return { lista, add, update };
}

const SEED_AUSENCIAS: Ausencia[] = [
  { id:"a1", funcId:"e2", tipo:"FERIAS", dataInicio:"2026-07-01", dataFim:"2026-07-22", diasUteis:16, estado:"APROVADO", aprovadoPor:"EMP-001" },
  { id:"a2", funcId:"e5", tipo:"DOENCA", dataInicio:"2026-06-10", dataFim:"2026-06-12", diasUteis:3, estado:"APROVADO", observacoes:"Baixa médica" },
  { id:"a3", funcId:"e4", tipo:"MAT",    dataInicio:"2026-08-01", dataFim:"2026-10-31", diasUteis:66, estado:"PENDENTE", observacoes:"Licença de maternidade — art. 159.º LGT" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS / CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PROVINCIAS_AO = [
  "Luanda","Benguela","Huila","Huambo","Bié","Malanje","Uíge","Cabinda",
  "Kwanza Norte","Kwanza Sul","Lunda Norte","Lunda Sul","Moxico","Cunene",
  "Namibe","Cuando Cubango","Zaire","Bengo",
];

const BANCOS_AO = [
  "BFA","BIC","BPC","BAI","BCI","Atlântico","Keve","SOL","VTB","Yetu",
  "Millennium Atlântico","Caixa Angola","BNI","Banco de Fomento Angola",
];

const TIPO_AUSENCIA_LABEL: Record<Ausencia["tipo"], string> = {
  FERIAS:"Férias Anuais", DOENCA:"Baixa por Doença", MAT:"Lic. Maternidade",
  PAT:"Lic. Paternidade", FALTA_JUST:"Falta Justificada",
  FALTA_INJ:"Falta Injustificada", FORMACAO:"Formação", OUTRO:"Outro",
};

const ESTADO_FOLHA_COLOR: Record<FolhaSalarial["estado"], string> = {
  RASCUNHO:"bg-gray-100 text-gray-700",
  PROCESSADA:"bg-blue-100 text-blue-800",
  PAGA:"bg-green-100 text-green-800",
  ANULADA:"bg-red-100 text-red-800",
};

const MES_LABEL: Record<string, string> = {
  "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril","05":"Maio","06":"Junho",
  "07":"Julho","08":"Agosto","09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro",
};

function fmtKz(n: number) {
  if (n === 0) return "—";
  return n.toLocaleString("pt-PT") + " Kz";
}

function fmtPct(n: number) { return (n * 100).toFixed(1) + "%"; }

function calcIdade(dataNasc: string): number {
  if (!dataNasc) return 0;
  const d = new Date(dataNasc);
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), d.getMonth(), d.getDate())) idade--;
  return idade;
}

function calcAnosServico(dataAdmissao: string): number {
  if (!dataAdmissao) return 0;
  return Math.floor((Date.now() - new Date(dataAdmissao).getTime()) / (365.25 * 24 * 3600 * 1000));
}

// Direito a férias (art. 198.º LGT): 22 dias úteis/ano + 2 dias/5 anos (máx 30)
function calcDireitoFerias(dataAdmissao: string): number {
  const anos = calcAnosServico(dataAdmissao);
  return Math.min(22 + Math.floor(anos / 5) * 2, 30);
}

// Indemnização por cessação (contratos determinados: 1 mês/ano; indeterminados: art. 260.º LGT)
function calcIndemnizacao(f: Funcionario): number {
  const anos = calcAnosServico(f.dataAdmissao);
  return f.salarioBase * anos;
}

// ── Sequence ─────────────────────────────────────────────────────────────────
function nextFuncNumero(lista: Funcionario[]): string {
  const nums = lista.map(f => parseInt(f.numero.split("-")[1] ?? "0", 10)).filter(Boolean);
  const max  = nums.length ? Math.max(...nums) : 0;
  return `EMP-${String(max + 1).padStart(3, "0")}`;
}

function nextFolhaNumero(folhas: FolhaSalarial[], exercicio: string): string {
  const nums = folhas.map(f => parseInt(f.numero.split("/")[2] ?? "0", 10)).filter(Boolean);
  const max  = nums.length ? Math.max(...nums) : 0;
  return `FS/${exercicio}/${String(max + 1).padStart(3, "0")}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLANK EMPLOYEE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════
const BLANK_FUNC: Omit<Funcionario,"id"|"numero"> = {
  nome:"", dataNascimento:"", sexo:"M", estadoCivil:"SOLTEIRO", numeroDependentes:0,
  naturalidade:"Luanda", nacionalidade:"Angolana",
  nrBI:"", validadeBI:"", nif:"", nrINSS:"", passaporte:"",
  morada:"", municipio:"Luanda", provincia:"Luanda",
  telefone:"", telefoneAlternativo:"", emailPessoal:"", emailCorporativo:"",
  contactoEmergNome:"", contactoEmergTel:"", contactoEmergParentesco:"",
  cargo:"", categoriaProfissional:"", departamento:"", centroCusto:"",
  localTrabalho:"Sede", horasSemanais:44,
  tipoContrato:"INDETERMINADO", dataAdmissao:"", dataInicioCargo:"", dataFimContrato:"",
  habilitacoes:"MEDIO", cursoAreaFormacao:"", instituicaoEnsino:"", anoConlusao:"",
  salarioBase:0, subsidioAlimentacao:0, subsidioTransporte:0, subsidioHabitacao:0,
  subsidioFuncao:0, outrosSubsidios:0,
  metodoPagamento:"TRANSFERENCIA", iban:"", banco:"", agencia:"",
  estado:"ACTIVO", dataCessacao:"", motivoCessacao:"", observacoes:"",
};

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD HELPER
// ═══════════════════════════════════════════════════════════════════════════════

const IC = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors";

function Field({ label, children, span2, note }: {
  label: string;
  children: React.ReactNode;
  span2?: boolean;
  note?: string;
}) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
      {note && <p className="text-[10px] text-gray-400 mt-0.5">{note}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FICHA FUNCIONÁRIO — 5-tab form
// ═══════════════════════════════════════════════════════════════════════════════

function FichaFuncContent({
  func: initial,
  isNew,
  onSave,
  onClose,
}: {
  func: Omit<Funcionario, "id" | "numero"> & { id?: string; numero?: string };
  isNew: boolean;
  onSave: (data: Omit<Funcionario, "id" | "numero">) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"pessoal" | "contrato" | "contacto" | "docs" | "irt">("pessoal");
  const [form, setForm] = useState({ ...initial });

  const set = (k: keyof typeof form, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }));

  const sim = useMemo(() => {
    const f = form as Funcionario;
    return calcLinhaFolha(f);
  }, [form]);

  const activeBracket = useMemo(() => {
    return TABELA_IRT_2026.findIndex((e) => sim.baseIRT >= e.min && sim.baseIRT <= e.max);
  }, [sim.baseIRT]);

  const tabs: { id: typeof tab; label: string }[] = [
    { id: "pessoal",   label: "Pessoal" },
    { id: "contrato",  label: "Contrato" },
    { id: "contacto",  label: "Contacto" },
    { id: "docs",      label: "Docs" },
    { id: "irt",       label: "IRT" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex gap-1 px-4 pt-3 border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id
                ? "bg-white border border-b-white border-gray-200 text-blue-700 -mb-px"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">

        {/* ── Tab: Pessoal ── */}
        {tab === "pessoal" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome Completo" span2>
              <input className={IC} value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome completo do trabalhador" />
            </Field>
            <Field label="Data de Nascimento">
              <input type="date" className={IC} value={form.dataNascimento} onChange={(e) => set("dataNascimento", e.target.value)} />
            </Field>
            <Field label="Idade">
              <input className={IC} value={form.dataNascimento ? `${calcIdade(form.dataNascimento)} anos` : "—"} readOnly />
            </Field>
            <Field label="Sexo">
              <select className={IC} value={form.sexo} onChange={(e) => set("sexo", e.target.value as Sexo)}>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </Field>
            <Field label="Estado Civil">
              <select className={IC} value={form.estadoCivil} onChange={(e) => set("estadoCivil", e.target.value as EstadoCivil)}>
                <option value="SOLTEIRO">Solteiro(a)</option>
                <option value="CASADO">Casado(a)</option>
                <option value="DIVORCIADO">Divorciado(a)</option>
                <option value="VIUVO">Viúvo(a)</option>
                <option value="UNIAO_FACTO">União de Facto</option>
              </select>
            </Field>
            <Field label="Nº de Dependentes" note="Para efeitos de subsídio familiar">
              <input type="number" min={0} max={20} className={IC} value={form.numeroDependentes} onChange={(e) => set("numeroDependentes", parseInt(e.target.value) || 0)} />
            </Field>
            <Field label="Naturalidade">
              <input className={IC} value={form.naturalidade} onChange={(e) => set("naturalidade", e.target.value)} />
            </Field>
            <Field label="Nacionalidade">
              <input className={IC} value={form.nacionalidade} onChange={(e) => set("nacionalidade", e.target.value)} />
            </Field>
            <Field label="Habilitações Literárias">
              <select className={IC} value={form.habilitacoes ?? ""} onChange={(e) => set("habilitacoes", e.target.value as Habilitacoes)}>
                <option value="BASICO">Ensino Básico</option>
                <option value="MEDIO">Ensino Médio</option>
                <option value="TECNICO">Técnico Profissional</option>
                <option value="LICENCIATURA">Licenciatura</option>
                <option value="MESTRADO">Mestrado</option>
                <option value="DOUTORAMENTO">Doutoramento</option>
                <option value="OUTRO">Outro</option>
              </select>
            </Field>
            <Field label="Curso / Área de Formação">
              <input className={IC} value={form.cursoAreaFormacao ?? ""} onChange={(e) => set("cursoAreaFormacao", e.target.value)} />
            </Field>
            <Field label="Estado do Vínculo">
              <select className={IC} value={form.estado} onChange={(e) => set("estado", e.target.value as EstadoFunc)}>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
                <option value="SUSPENSO">Suspenso</option>
                <option value="CESSADO">Cessado</option>
              </select>
            </Field>
            {form.estado === "CESSADO" && (
              <>
                <Field label="Data de Cessação">
                  <input type="date" className={IC} value={form.dataCessacao ?? ""} onChange={(e) => set("dataCessacao", e.target.value)} />
                </Field>
                <Field label="Motivo de Cessação">
                  <input className={IC} value={form.motivoCessacao ?? ""} onChange={(e) => set("motivoCessacao", e.target.value)} placeholder="Ex: Rescisão por mútuo acordo" />
                </Field>
                <Field label="Indemnização Estimada (art. 260.º LGT)" span2>
                  <div className="flex items-center gap-3">
                    <input className={IC} value={fmtKz(calcIndemnizacao(form as Funcionario))} readOnly />
                    <span className="text-xs text-gray-500 whitespace-nowrap">({calcAnosServico(form.dataAdmissao)} anos × salário base)</span>
                  </div>
                </Field>
              </>
            )}
            <Field label="Observações" span2>
              <textarea rows={3} className={IC} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} placeholder="Notas internas sobre o trabalhador..." />
            </Field>
          </div>
        )}

        {/* ── Tab: Contrato ── */}
        {tab === "contrato" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Cargo / Função" span2>
              <input className={IC} value={form.cargo} onChange={(e) => set("cargo", e.target.value)} placeholder="Ex: Director Financeiro" />
            </Field>
            <Field label="Categoria Profissional">
              <select className={IC} value={form.categoriaProfissional} onChange={(e) => set("categoriaProfissional", e.target.value)}>
                <option value="">Seleccionar...</option>
                <option value="Quadro Superior">Quadro Superior</option>
                <option value="Quadro Médio">Quadro Médio</option>
                <option value="Técnico Superior">Técnico Superior</option>
                <option value="Técnico Médio">Técnico Médio</option>
                <option value="Administrativo">Administrativo</option>
                <option value="Operário Qualificado">Operário Qualificado</option>
                <option value="Auxiliar">Auxiliar</option>
              </select>
            </Field>
            <Field label="Departamento">
              <input className={IC} value={form.departamento} onChange={(e) => set("departamento", e.target.value)} placeholder="Ex: Financeiro, Comercial..." />
            </Field>
            <Field label="Data de Admissão">
              <input type="date" className={IC} value={form.dataAdmissao} onChange={(e) => set("dataAdmissao", e.target.value)} />
            </Field>
            <Field label="Anos de Serviço">
              <input className={IC} value={form.dataAdmissao ? `${calcAnosServico(form.dataAdmissao)} anos` : "—"} readOnly />
            </Field>
            <Field label="Tipo de Contrato">
              <select className={IC} value={form.tipoContrato} onChange={(e) => set("tipoContrato", e.target.value as TipoContrato)}>
                <option value="INDETERMINADO">Tempo Indeterminado</option>
                <option value="DETERMINADO">Tempo Determinado</option>
                <option value="PRESTACAO_SERVICOS">Prestação de Serviços</option>
                <option value="ESTAGIO">Estágio Profissional</option>
              </select>
            </Field>
            {form.tipoContrato === "DETERMINADO" && (
              <Field label="Data de Fim de Contrato">
                <input type="date" className={IC} value={form.dataFimContrato ?? ""} onChange={(e) => set("dataFimContrato", e.target.value)} />
              </Field>
            )}
            <Field label="Horas Semanais" note="Legal: 44h/semana (art. 96.º LGT)">
              <input type="number" min={1} max={44} className={IC} value={form.horasSemanais} onChange={(e) => set("horasSemanais", parseInt(e.target.value) || 44)} />
            </Field>

            <div className="col-span-2 border-t pt-4 mt-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Remuneração</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Salário Base (Kz)">
                  <input type="number" min={0} className={IC} value={form.salarioBase} onChange={(e) => set("salarioBase", parseFloat(e.target.value) || 0)} />
                </Field>
                <Field label="Subsídio de Alimentação (Kz)" note="Isento IRT até 30.000 Kz">
                  <input type="number" min={0} className={IC} value={form.subsidioAlimentacao} onChange={(e) => set("subsidioAlimentacao", parseFloat(e.target.value) || 0)} />
                </Field>
                <Field label="Subsídio de Transporte (Kz)" note="Isento IRT na totalidade (DL 35/13)">
                  <input type="number" min={0} className={IC} value={form.subsidioTransporte} onChange={(e) => set("subsidioTransporte", parseFloat(e.target.value) || 0)} />
                </Field>
                <Field label="Subsídio de Habitação (Kz)">
                  <input type="number" min={0} className={IC} value={form.subsidioHabitacao} onChange={(e) => set("subsidioHabitacao", parseFloat(e.target.value) || 0)} />
                </Field>
                <Field label="Subsídio de Função (Kz)">
                  <input type="number" min={0} className={IC} value={form.subsidioFuncao} onChange={(e) => set("subsidioFuncao", parseFloat(e.target.value) || 0)} />
                </Field>
              </div>
            </div>

            <div className="col-span-2 border-t pt-4 mt-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Método de Pagamento</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Método">
                  <select className={IC} value={form.metodoPagamento} onChange={(e) => set("metodoPagamento", e.target.value as MetodoPagamento)}>
                    <option value="TRANSFERENCIA">Transferência Bancária</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="NUMERARIO">Numerário</option>
                  </select>
                </Field>
                {form.metodoPagamento !== "NUMERARIO" && (
                  <>
                    <Field label="Banco">
                      <select className={IC} value={form.banco ?? ""} onChange={(e) => set("banco", e.target.value)}>
                        <option value="">Seleccionar banco...</option>
                        {BANCOS_AO.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>
                    <Field label="IBAN" span2>
                      <input className={IC} value={form.iban ?? ""} onChange={(e) => set("iban", e.target.value)} placeholder="AO06 0006 0000 ..." />
                    </Field>
                  </>
                )}
              </div>
            </div>

            {/* Live simulation */}
            <div className="col-span-2 mt-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">Simulação Salarial (mês corrente)</p>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-500 text-xs">Bruto Total</span><div className="font-bold">{fmtKz(sim.brutoTotal)}</div></div>
                <div><span className="text-gray-500 text-xs">Base IRT</span><div className="font-bold">{fmtKz(sim.baseIRT)}</div></div>
                <div><span className="text-gray-500 text-xs">IRT</span><div className="font-bold text-red-600">{fmtKz(sim.irt)}</div></div>
                <div><span className="text-gray-500 text-xs">INSS (3%)</span><div className="font-bold text-red-600">{fmtKz(sim.inss3)}</div></div>
                <div><span className="text-gray-500 text-xs">Líquido a Receber</span><div className="font-bold text-green-700 text-base">{fmtKz(sim.liquido)}</div></div>
                <div><span className="text-gray-500 text-xs">INSS Patronal (8%)</span><div className="font-bold">{fmtKz(sim.inss8)}</div></div>
                <div><span className="text-gray-500 text-xs">FCT (1%)</span><div className="font-bold">{fmtKz(sim.fct)}</div></div>
                <div><span className="text-gray-500 text-xs">Custo Total Empresa</span><div className="font-bold text-purple-700">{fmtKz(sim.custoTotal)}</div></div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Contacto ── */}
        {tab === "contacto" && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Morada" span2>
              <input className={IC} value={form.morada} onChange={(e) => set("morada", e.target.value)} placeholder="Rua, número, andar..." />
            </Field>
            <Field label="Município">
              <input className={IC} value={form.municipio} onChange={(e) => set("municipio", e.target.value)} />
            </Field>
            <Field label="Província">
              <select className={IC} value={form.provincia} onChange={(e) => set("provincia", e.target.value)}>
                {PROVINCIAS_AO.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Telefone Principal">
              <input className={IC} value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="+244 9XX XXX XXX" />
            </Field>
            <Field label="Email Corporativo">
              <input type="email" className={IC} value={form.emailCorporativo ?? ""} onChange={(e) => set("emailCorporativo", e.target.value)} placeholder="nome@empresa.ao" />
            </Field>

            <div className="col-span-2 border-t pt-4 mt-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Contacto de Emergência</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome do Contacto">
                  <input className={IC} value={form.contactoEmergNome ?? ""} onChange={(e) => set("contactoEmergNome", e.target.value)} />
                </Field>
                <Field label="Telefone de Emergência">
                  <input className={IC} value={form.contactoEmergTel ?? ""} onChange={(e) => set("contactoEmergTel", e.target.value)} placeholder="+244 9XX XXX XXX" />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Docs ── */}
        {tab === "docs" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-800">
              <strong>Obrigações legais:</strong> O empregador é obrigado a guardar cópia dos documentos de identificação e do comprovativo de inscrição no INSS, conforme art. 47.º da Lei n.º 7/04 (INSS) e art. 35.º da LGT.
            </div>
            <Field label="Nº do Bilhete de Identidade">
              <input className={IC} value={form.nrBI} onChange={(e) => set("nrBI", e.target.value)} placeholder="Ex: 003456789LA041" />
            </Field>
            <Field label="Validade do BI">
              <input type="date" className={IC} value={form.validadeBI} onChange={(e) => set("validadeBI", e.target.value)} />
            </Field>
            <Field label="NIF (Número de Identificação Fiscal)">
              <input className={IC} value={form.nif} onChange={(e) => set("nif", e.target.value)} placeholder="Ex: 5000111222" />
            </Field>
            <Field label="Nº Beneficiário INSS">
              <input className={IC} value={form.nrINSS} onChange={(e) => set("nrINSS", e.target.value)} placeholder="Ex: 0012345678" />
            </Field>
            <Field label="Passaporte (opcional)">
              <input className={IC} value={form.passaporte ?? ""} onChange={(e) => set("passaporte", e.target.value)} placeholder="Nº do passaporte" />
            </Field>
          </div>
        )}

        {/* ── Tab: IRT ── */}
        {tab === "irt" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    <th className="px-3 py-2 text-left">Escalão</th>
                    <th className="px-3 py-2 text-right">Mínimo (Kz)</th>
                    <th className="px-3 py-2 text-right">Máximo (Kz)</th>
                    <th className="px-3 py-2 text-right">Taxa</th>
                    <th className="px-3 py-2 text-right">Parcela a Abater</th>
                  </tr>
                </thead>
                <tbody>
                  {TABELA_IRT_2026.map((e, i) => (
                    <tr key={i} className={`border-t border-gray-100 ${i === activeBracket ? "bg-blue-50 font-semibold" : "hover:bg-gray-50"}`}>
                      <td className="px-3 py-2">
                        {i === activeBracket && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 align-middle" />}
                        Escalão {i + 1}
                      </td>
                      <td className="px-3 py-2 text-right">{e.min.toLocaleString("pt-PT")}</td>
                      <td className="px-3 py-2 text-right">{e.max === Infinity ? "Ilimitado" : e.max.toLocaleString("pt-PT")}</td>
                      <td className="px-3 py-2 text-right">{fmtPct(e.taxa)}</td>
                      <td className="px-3 py-2 text-right">{e.parcela.toLocaleString("pt-PT")} Kz</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Cálculo Detalhado — {form.nome || "este trabalhador"}</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Salário Base</div>
                  <div className="font-bold">{fmtKz(sim.salarioBase)}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Subsídio Alimentação</div>
                  <div className="font-bold">{fmtKz(sim.subsidioAlimentacao)}</div>
                  <div className="text-xs text-orange-500">Isento: {fmtKz(Math.min(sim.subsidioAlimentacao, LIMITE_ISENTO_ALIMENT))}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Subsídio Transporte</div>
                  <div className="font-bold">{fmtKz(sim.subsidioTransporte)}</div>
                  <div className="text-xs text-orange-500">Totalmente isento</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Bruto Total</div>
                  <div className="font-bold">{fmtKz(sim.brutoTotal)}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-blue-100 bg-blue-50">
                  <div className="text-xs text-blue-600 mb-1">Base IRT (sujeita)</div>
                  <div className="font-bold text-blue-800">{fmtKz(sim.baseIRT)}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-red-100 bg-red-50">
                  <div className="text-xs text-red-600 mb-1">IRT Retido</div>
                  <div className="font-bold text-red-800">{fmtKz(sim.irt)}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">INSS Trabalhador (3%)</div>
                  <div className="font-bold">{fmtKz(sim.inss3)}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">INSS Patronal (8%)</div>
                  <div className="font-bold">{fmtKz(sim.inss8)}</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">FCT (1%)</div>
                  <div className="font-bold">{fmtKz(sim.fct)}</div>
                </div>
                <div className="col-span-2 bg-green-50 rounded-lg p-3 border border-green-100">
                  <div className="text-xs text-green-600 mb-1">Líquido a Receber</div>
                  <div className="font-bold text-green-800 text-lg">{fmtKz(sim.liquido)}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="text-xs text-purple-600 mb-1">Custo Total Empresa</div>
                  <div className="font-bold text-purple-800">{fmtKz(sim.custoTotal)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
        <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          onClick={() => { onSave(form as Omit<Funcionario, "id" | "numero">); }}
        >
          {isNew ? "Criar Funcionário" : "Guardar Alterações"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESSAR FOLHA
// ═══════════════════════════════════════════════════════════════════════════════

function ProcessarFolhaContent({
  funcionarios,
  numero,
  onProcessar,
  onClose,
}: {
  funcionarios: Funcionario[];
  numero: string;
  onProcessar: (mes: string, linhas: LinhaFolha[], gerarLancamento: boolean) => void;
  onClose: () => void;
}) {
  const hoje = new Date();
  const mesDefault = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [mes, setMes] = useState(mesDefault);
  const [gerarLancamento, setGerarLancamento] = useState(false);

  const activos = funcionarios.filter((f) => f.estado === "ACTIVO");
  const linhas = useMemo(() => activos.map((f) => calcLinhaFolha(f)), [activos]);

  const totais = useMemo(() => ({
    bruto:   linhas.reduce((s, l) => s + l.brutoTotal, 0),
    irt:     linhas.reduce((s, l) => s + l.irt, 0),
    inss3:   linhas.reduce((s, l) => s + l.inss3, 0),
    inss8:   linhas.reduce((s, l) => s + l.inss8, 0),
    fct:     linhas.reduce((s, l) => s + l.fct, 0),
    liquido: linhas.reduce((s, l) => s + l.liquido, 0),
    custo:   linhas.reduce((s, l) => s + l.custoTotal, 0),
  }), [linhas]);

  const [mesLabel, mesMesLabel] = mes.split("-");
  const descricao = `Folha Salarial — ${MES_LABEL[mesMesLabel] ?? mesMesLabel} ${mesLabel}`;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4 flex-1 overflow-auto">
        {/* Config */}
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Período</label>
            <input type="month" className={IC + " w-44"} value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <div className="text-sm text-gray-600 pb-2">
            <span className="font-semibold">{numero}</span> — {descricao}
          </div>
          <label className="flex items-center gap-2 pb-2 cursor-pointer select-none">
            <input type="checkbox" checked={gerarLancamento} onChange={(e) => setGerarLancamento(e.target.checked)} className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-gray-700">Gerar lançamento contabilístico automático</span>
          </label>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Bruto",     value: totais.bruto,   color: "blue" },
            { label: "IRT a Entregar",  value: totais.irt,     color: "red" },
            { label: "INSS Trab. (3%)", value: totais.inss3,   color: "orange" },
            { label: "INSS Pat. (8%)",  value: totais.inss8,   color: "orange" },
            { label: "FCT (1%)",        value: totais.fct,     color: "purple" },
            { label: "Total Líquido",   value: totais.liquido, color: "green" },
            { label: "Custo Total",     value: totais.custo,   color: "gray" },
            { label: "Trabalhadores",   value: activos.length, color: "gray", isCount: true },
          ].map((kpi) => (
            <div key={kpi.label} className={`rounded-xl p-3 border ${
              kpi.color === "blue"   ? "bg-blue-50 border-blue-100" :
              kpi.color === "red"    ? "bg-red-50 border-red-100" :
              kpi.color === "orange" ? "bg-orange-50 border-orange-100" :
              kpi.color === "green"  ? "bg-green-50 border-green-100" :
              kpi.color === "purple" ? "bg-purple-50 border-purple-100" :
              "bg-gray-50 border-gray-100"
            }`}>
              <div className="text-xs text-gray-500 mb-1">{kpi.label}</div>
              <div className={`font-bold text-sm ${
                kpi.color === "blue"   ? "text-blue-800" :
                kpi.color === "red"    ? "text-red-800" :
                kpi.color === "orange" ? "text-orange-800" :
                kpi.color === "green"  ? "text-green-800" :
                kpi.color === "purple" ? "text-purple-800" :
                "text-gray-800"
              }`}>
                {(kpi as { isCount?: boolean }).isCount ? kpi.value : fmtKz(kpi.value as number)}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 text-left">Funcionário</th>
                <th className="px-3 py-2 text-right">Sal. Base</th>
                <th className="px-3 py-2 text-right">Bruto</th>
                <th className="px-3 py-2 text-right">Base IRT</th>
                <th className="px-3 py-2 text-right">IRT</th>
                <th className="px-3 py-2 text-right">INSS 3%</th>
                <th className="px-3 py-2 text-right">Líquido</th>
                <th className="px-3 py-2 text-right">Custo</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.funcId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{l.nome}</div>
                    <div className="text-xs text-gray-500">{l.cargo}</div>
                  </td>
                  <td className="px-3 py-2 text-right text-xs">{fmtKz(l.salarioBase)}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmtKz(l.brutoTotal)}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmtKz(l.baseIRT)}</td>
                  <td className="px-3 py-2 text-right text-xs text-red-600">{fmtKz(l.irt)}</td>
                  <td className="px-3 py-2 text-right text-xs text-red-600">{fmtKz(l.inss3)}</td>
                  <td className="px-3 py-2 text-right text-xs font-semibold text-green-700">{fmtKz(l.liquido)}</td>
                  <td className="px-3 py-2 text-right text-xs text-purple-700">{fmtKz(l.custoTotal)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-xs">
                <td className="px-3 py-2">TOTAIS</td>
                <td className="px-3 py-2 text-right">{fmtKz(linhas.reduce((s, l) => s + l.salarioBase, 0))}</td>
                <td className="px-3 py-2 text-right">{fmtKz(totais.bruto)}</td>
                <td className="px-3 py-2 text-right">{fmtKz(linhas.reduce((s, l) => s + l.baseIRT, 0))}</td>
                <td className="px-3 py-2 text-right text-red-600">{fmtKz(totais.irt)}</td>
                <td className="px-3 py-2 text-right text-red-600">{fmtKz(totais.inss3)}</td>
                <td className="px-3 py-2 text-right text-green-700">{fmtKz(totais.liquido)}</td>
                <td className="px-3 py-2 text-right text-purple-700">{fmtKz(totais.custo)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
        <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          onClick={() => onProcessar(mes, linhas, gerarLancamento)}
          disabled={activos.length === 0}
        >
          Processar Folha ({activos.length} trabalhadores)
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDITAR FOLHA
// ═══════════════════════════════════════════════════════════════════════════════

function EditarFolhaModal({
  folha, onClose, onSave,
}: {
  folha: FolhaSalarial;
  onClose: () => void;
  onSave: (patch: Partial<FolhaSalarial>) => void;
}) {
  const [estado, setEstado] = useState<FolhaSalarial["estado"]>(folha.estado);
  const [observacoes, setObservacoes] = useState(folha.descricao);

  const [yr, mn] = folha.mes.split("-");
  const periodoLabel = `${MES_LABEL[mn] ?? mn} ${yr}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Nº Folha</label>
            <input readOnly value={folha.numero} className={IC} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Período</label>
            <input readOnly value={periodoLabel} className={IC} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Total Bruto</label>
            <input readOnly value={fmtKz(folha.totalBruto)} className={IC} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Total Líquido</label>
            <input readOnly value={fmtKz(folha.totalLiquido)} className={IC} />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value as FolhaSalarial["estado"])} className={IC}>
              <option value="RASCUNHO">RASCUNHO</option>
              <option value="PROCESSADA">PROCESSADA</option>
              <option value="PAGA">PAGA</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Observações / Descrição</label>
            <textarea rows={3} className={IC} value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Observações sobre esta folha salarial..." />
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
        <button onClick={onClose}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
          Cancelar
        </button>
        <button onClick={() => onSave({ estado, descricao: observacoes })}
          className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">
          Guardar
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VER FOLHA
// ═══════════════════════════════════════════════════════════════════════════════

function VerFolhaContent({
  folha,
  onMarcarPaga,
  onAnular,
  onClose,
}: {
  folha: FolhaSalarial;
  onMarcarPaga: () => void;
  onAnular: () => void;
  onClose: () => void;
}) {
  const [mesPart, mesNr] = folha.mes.split("-");
  const periodoLabel = `${MES_LABEL[mesNr] ?? mesNr} ${mesPart}`;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4 flex-1 overflow-auto">
        {/* Header info */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-bold">{folha.numero}</div>
            <div className="text-sm text-gray-500">{folha.descricao} — {periodoLabel}</div>
            <div className="text-xs text-gray-400 mt-1">Criado em: {new Date(folha.criadoEm).toLocaleDateString("pt-PT")}</div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${ESTADO_FOLHA_COLOR[folha.estado]}`}>
            {folha.estado}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-2 text-left">Funcionário</th>
                <th className="px-3 py-2 text-left">Departamento</th>
                <th className="px-3 py-2 text-right">Bruto</th>
                <th className="px-3 py-2 text-right">IRT</th>
                <th className="px-3 py-2 text-right">INSS 3%</th>
                <th className="px-3 py-2 text-right">Líquido</th>
                <th className="px-3 py-2 text-right">Custo Empresa</th>
              </tr>
            </thead>
            <tbody>
              {folha.linhas.map((l) => (
                <tr key={l.funcId} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium">{l.nome}</div>
                    <div className="text-xs text-gray-500">{l.cargo}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{l.departamento}</td>
                  <td className="px-3 py-2 text-right text-xs">{fmtKz(l.brutoTotal)}</td>
                  <td className="px-3 py-2 text-right text-xs text-red-600">{fmtKz(l.irt)}</td>
                  <td className="px-3 py-2 text-right text-xs text-red-600">{fmtKz(l.inss3)}</td>
                  <td className="px-3 py-2 text-right text-xs font-semibold text-green-700">{fmtKz(l.liquido)}</td>
                  <td className="px-3 py-2 text-right text-xs text-purple-700">{fmtKz(l.custoTotal)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-xs">
                <td className="px-3 py-2" colSpan={2}>TOTAIS ({folha.linhas.length} trabalhadores)</td>
                <td className="px-3 py-2 text-right">{fmtKz(folha.totalBruto)}</td>
                <td className="px-3 py-2 text-right text-red-600">{fmtKz(folha.totalIRT)}</td>
                <td className="px-3 py-2 text-right text-red-600">{fmtKz(folha.totalINSS3)}</td>
                <td className="px-3 py-2 text-right text-green-700">{fmtKz(folha.totalLiquido)}</td>
                <td className="px-3 py-2 text-right text-purple-700">{fmtKz(folha.totalCusto)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="text-xs text-gray-500 mb-1">Total Bruto</div>
            <div className="font-bold text-blue-800">{fmtKz(folha.totalBruto)}</div>
          </div>
          <div className="bg-red-50 rounded-xl p-3 border border-red-100">
            <div className="text-xs text-gray-500 mb-1">IRT (AGT)</div>
            <div className="font-bold text-red-800">{fmtKz(folha.totalIRT)}</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
            <div className="text-xs text-gray-500 mb-1">INSS Total (11%)</div>
            <div className="font-bold text-orange-800">{fmtKz(folha.totalINSS3 + folha.totalINSS8)}</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 border border-green-100">
            <div className="text-xs text-gray-500 mb-1">Líquido Total</div>
            <div className="font-bold text-green-800">{fmtKz(folha.totalLiquido)}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex gap-2">
          {folha.estado === "PROCESSADA" && (
            <button className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors" onClick={onMarcarPaga}>
              Marcar como Paga
            </button>
          )}
          {(folha.estado === "PROCESSADA" || folha.estado === "RASCUNHO") && (
            <button className="px-4 py-2 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors" onClick={onAnular}>
              Anular Folha
            </button>
          )}
        </div>
        <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RECIBO DE VENCIMENTO
// ═══════════════════════════════════════════════════════════════════════════════

function ReciboContent({
  linha,
  folha,
  funcionario,
  onClose,
}: {
  linha: LinhaFolha;
  folha: FolhaSalarial;
  funcionario?: Funcionario;
  onClose: () => void;
}) {
  const [mesPart, mesNr] = folha.mes.split("-");
  const periodoLabel = `${MES_LABEL[mesNr] ?? mesNr} ${mesPart}`;

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-6">
        <div id="recibo-print" className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
            <div>
              <div className="text-lg font-bold text-gray-800">RECIBO DE VENCIMENTO</div>
              <div className="text-sm text-gray-500">Período: {periodoLabel}</div>
              <div className="text-sm text-gray-500">Folha: {folha.numero}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Estado</div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${ESTADO_FOLHA_COLOR[folha.estado]}`}>
                {folha.estado}
              </span>
            </div>
          </div>

          {/* Employee info */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <div className="text-xs text-gray-500 uppercase font-bold mb-1">Trabalhador</div>
              <div className="font-semibold">{linha.nome}</div>
              <div className="text-gray-600">{linha.cargo}</div>
              <div className="text-gray-600">{linha.departamento}</div>
              {funcionario && (
                <>
                  <div className="text-gray-500 text-xs mt-1">NIF: {funcionario.nif || "—"}</div>
                  <div className="text-gray-500 text-xs">INSS: {funcionario.nrINSS || "—"}</div>
                </>
              )}
            </div>
            <div>
              {funcionario && (
                <>
                  <div className="text-xs text-gray-500 uppercase font-bold mb-1">Dados Contratuais</div>
                  <div className="text-xs text-gray-600">Admissão: {funcionario.dataAdmissao ? new Date(funcionario.dataAdmissao).toLocaleDateString("pt-PT") : "—"}</div>
                  <div className="text-xs text-gray-600">Contrato: {funcionario.tipoContrato}</div>
                  <div className="text-xs text-gray-600">Categoria: {funcionario.categoriaProfissional}</div>
                  <div className="text-xs text-gray-600">Pagamento: {funcionario.metodoPagamento}</div>
                  {funcionario.banco && <div className="text-xs text-gray-600">Banco: {funcionario.banco}</div>}
                </>
              )}
            </div>
          </div>

          {/* Remunerações */}
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">Remunerações</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500 uppercase">Valor (Kz)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2">Salário Base</td>
                <td className="px-3 py-2 text-right">{linha.salarioBase.toLocaleString("pt-PT")}</td>
              </tr>
              {linha.subsidioAlimentacao > 0 && (
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">Subsídio de Alimentação</td>
                  <td className="px-3 py-2 text-right">{linha.subsidioAlimentacao.toLocaleString("pt-PT")}</td>
                </tr>
              )}
              {linha.subsidioTransporte > 0 && (
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">Subsídio de Transporte</td>
                  <td className="px-3 py-2 text-right">{linha.subsidioTransporte.toLocaleString("pt-PT")}</td>
                </tr>
              )}
              {linha.outrosSubsidios > 0 && (
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">Outros Subsídios</td>
                  <td className="px-3 py-2 text-right">{linha.outrosSubsidios.toLocaleString("pt-PT")}</td>
                </tr>
              )}
              {linha.horasExtra > 0 && (
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">Horas Extraordinárias</td>
                  <td className="px-3 py-2 text-right">{linha.horasExtra.toLocaleString("pt-PT")}</td>
                </tr>
              )}
              {linha.premios > 0 && (
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">Prémios</td>
                  <td className="px-3 py-2 text-right">{linha.premios.toLocaleString("pt-PT")}</td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                <td className="px-3 py-2">TOTAL BRUTO</td>
                <td className="px-3 py-2 text-right">{linha.brutoTotal.toLocaleString("pt-PT")}</td>
              </tr>
            </tbody>
          </table>

          {/* Descontos */}
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="bg-red-50">
                <th className="px-3 py-2 text-left text-xs font-bold text-red-500 uppercase">Descontos</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-red-500 uppercase">Valor (Kz)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2">IRT — Lei n.º 14/25 (base: {linha.baseIRT.toLocaleString("pt-PT")} Kz)</td>
                <td className="px-3 py-2 text-right text-red-600">{linha.irt.toLocaleString("pt-PT")}</td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="px-3 py-2">INSS Trabalhador — 3% (Lei n.º 7/04)</td>
                <td className="px-3 py-2 text-right text-red-600">{linha.inss3.toLocaleString("pt-PT")}</td>
              </tr>
              {linha.adiantamentos > 0 && (
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">Adiantamentos</td>
                  <td className="px-3 py-2 text-right text-red-600">{linha.adiantamentos.toLocaleString("pt-PT")}</td>
                </tr>
              )}
              {linha.outrosDescontos > 0 && (
                <tr className="border-t border-gray-100">
                  <td className="px-3 py-2">Outros Descontos</td>
                  <td className="px-3 py-2 text-right text-red-600">{linha.outrosDescontos.toLocaleString("pt-PT")}</td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-300 font-bold bg-red-50">
                <td className="px-3 py-2">TOTAL DESCONTOS</td>
                <td className="px-3 py-2 text-right text-red-700">{(linha.irt + linha.inss3 + linha.adiantamentos + linha.outrosDescontos).toLocaleString("pt-PT")}</td>
              </tr>
            </tbody>
          </table>

          {/* Net */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-center">
            <div>
              <div className="text-sm text-green-600 font-bold uppercase">Valor Líquido a Receber</div>
              <div className="text-xs text-green-500">Custo total para a empresa: {fmtKz(linha.custoTotal)} (incl. INSS 8% + FCT 1%)</div>
            </div>
            <div className="text-2xl font-bold text-green-800">{fmtKz(linha.liquido)}</div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
            Documento gerado automaticamente — EduContas ERP · {new Date().toLocaleDateString("pt-PT")}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
        <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors" onClick={handlePrint}>
          Imprimir
        </button>
        <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function RHPage() {
  const exercicio = ANOS_DISPONIVEIS[0] ?? "2026";
  const { openWindow, closeWindow } = useWindowManager();
  const { lista: funcionarios, add: addFunc, update: updateFunc } = useFuncionarios();
  const { folhas, addFolha, updateFolha, deleteFolha } = useFolhas(exercicio);
  const { lista: ausencias, add: addAusencia, update: updateAusencia } = useAusencias();

  const [mainTab, setMainTab] = useState<"funcionarios" | "folhas" | "ausencias" | "relatorios" | "irt">("funcionarios");

  // ── Filters ──────────────────────────────────────────────────────────────
  const [search, setSearch]   = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("TODOS");
  const [filterDept, setFilterDept]     = useState<string>("TODOS");

  const departamentos = useMemo(() => {
    const s = new Set(funcionarios.map((f) => f.departamento).filter(Boolean));
    return Array.from(s).sort();
  }, [funcionarios]);

  const funcFiltrados = useMemo(() => {
    return funcionarios.filter((f) => {
      if (filterEstado !== "TODOS" && f.estado !== filterEstado) return false;
      if (filterDept !== "TODOS" && f.departamento !== filterDept) return false;
      if (search) {
        const q = search.toLowerCase();
        return f.nome.toLowerCase().includes(q) || f.cargo.toLowerCase().includes(q) || f.numero.toLowerCase().includes(q);
      }
      return true;
    });
  }, [funcionarios, filterEstado, filterDept, search]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpiFunc = useMemo(() => {
    const activos = funcionarios.filter((f) => f.estado === "ACTIVO");
    const custoMensal = activos.reduce((s, f) => s + calcLinhaFolha(f).custoTotal, 0);
    const inssInscritos = activos.filter((f) => f.nrINSS).length;
    return { total: funcionarios.length, activos: activos.length, custoMensal, inssInscritos };
  }, [funcionarios]);

  // ── IRT calculator ───────────────────────────────────────────────────────
  const [irtBruto, setIrtBruto] = useState(300_000);
  const irtSim = useMemo(() => {
    const isentos = Math.min(LIMITE_ISENTO_ALIMENT, 0);
    const base    = Math.max(0, irtBruto - isentos);
    const imposto = calcIRT(base);
    const e = TABELA_IRT_2026.find((r) => base >= r.min && base <= r.max) ?? TABELA_IRT_2026[TABELA_IRT_2026.length - 1];
    return { base, imposto, taxa: e.taxa, parcela: e.parcela, liquido: irtBruto - imposto, taxaEfetiva: irtBruto > 0 ? imposto / irtBruto : 0 };
  }, [irtBruto]);

  // ── Relatórios state ─────────────────────────────────────────────────────
  const [relMes, setRelMes] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  });

  // ── Ausência form ─────────────────────────────────────────────────────────
  const [showAusForm, setShowAusForm] = useState(false);
  const blankAus = (): Omit<Ausencia, "id"> => ({
    funcId: funcionarios[0]?.id ?? "",
    tipo: "FERIAS",
    dataInicio: "",
    dataFim: "",
    diasUteis: 0,
    estado: "PENDENTE",
    observacoes: "",
  });
  const [ausForm, setAusForm] = useState<Omit<Ausencia, "id">>(blankAus());
  const setAusField = (k: keyof typeof ausForm, v: unknown) => setAusForm((p) => ({ ...p, [k]: v }));

  // ── Open employee form ────────────────────────────────────────────────────
  const openFichaWindow = (func?: Funcionario) => {
    const isNew = !func;
    const data = func ?? { ...BLANK_FUNC, numero: nextFuncNumero(funcionarios), id: "" };
    const winId = `ficha-${func?.id ?? "new"}`;
    openWindow({
      id: winId,
      title: isNew ? "Novo Funcionário" : `Ficha — ${func!.nome}`,
      x: 60, y: 30, width: 750, height: 620,
      minimized: false, maximized: false,
      content: (
        <FichaFuncContent
          func={data}
          isNew={isNew}
          onSave={(d) => {
            if (isNew) {
              addFunc({ ...d, numero: nextFuncNumero(funcionarios) });
            } else {
              updateFunc(func!.id, d);
            }
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
    });
  };

  // ── Open folha window ─────────────────────────────────────────────────────
  const openProcessarFolha = () => {
    const winId = "processar-folha";
    const numero = nextFolhaNumero(folhas, exercicio);
    openWindow({
      id: winId,
      title: `Processar Folha Salarial — ${numero}`,
      x: 40, y: 20, width: 900, height: 600,
      minimized: false, maximized: false,
      content: (
        <ProcessarFolhaContent
          funcionarios={funcionarios}
          numero={numero}
          onProcessar={(mes, linhas, gerarLancamento) => {
            const [yr, mn] = mes.split("-");
            const totals = {
              totalBruto:   linhas.reduce((s, l) => s + l.brutoTotal, 0),
              totalIRT:     linhas.reduce((s, l) => s + l.irt, 0),
              totalINSS3:   linhas.reduce((s, l) => s + l.inss3, 0),
              totalINSS8:   linhas.reduce((s, l) => s + l.inss8, 0),
              totalFCT:     linhas.reduce((s, l) => s + l.fct, 0),
              totalLiquido: linhas.reduce((s, l) => s + l.liquido, 0),
              totalCusto:   linhas.reduce((s, l) => s + l.custoTotal, 0),
            };
            const novaFolha: FolhaSalarial = {
              id: crypto.randomUUID(), numero,
              mes, descricao: `Folha Salarial — ${MES_LABEL[mn] ?? mn} ${yr}`,
              linhas, ...totals,
              estado: "PROCESSADA",
              criadoEm: new Date().toISOString(),
              processadaEm: new Date().toISOString(),
              diarioRef: gerarLancamento ? `RH/${mes}` : undefined,
            };
            addFolha(novaFolha);
            closeWindow(winId);
          }}
          onClose={() => closeWindow(winId)}
        />
      ),
    });
  };

  const openVerFolha = (folha: FolhaSalarial) => {
    const winId = `folha-${folha.id}`;
    openWindow({
      id: winId,
      title: `Folha Salarial — ${folha.numero}`,
      x: 50, y: 25, width: 860, height: 580,
      minimized: false, maximized: false,
      content: (
        <VerFolhaContent
          folha={folha}
          onMarcarPaga={() => { updateFolha(folha.id, { estado: "PAGA", pagaEm: new Date().toISOString() }); closeWindow(winId); }}
          onAnular={() => { updateFolha(folha.id, { estado: "ANULADA" }); closeWindow(winId); }}
          onClose={() => closeWindow(winId)}
        />
      ),
    });
  };

  const handleOpenEditarFolha = (folha: FolhaSalarial) => {
    const winId = `folha-editar-${folha.id}`;
    openWindow({
      id: winId,
      title: `Editar Folha — ${folha.numero}`,
      x: 60, y: 40, width: 560, height: 420,
      minimized: false, maximized: false,
      content: (
        <EditarFolhaModal
          folha={folha}
          onClose={() => closeWindow(winId)}
          onSave={(patch) => { updateFolha(folha.id, patch); closeWindow(winId); }}
        />
      ),
    });
  };

  const handleOpenDeleteFolha = (folha: FolhaSalarial) => {
    const winId = `folha-del-${folha.id}`;
    const [yr, mn] = folha.mes.split("-");
    openWindow({
      id: winId,
      title: "Eliminar Folha Salarial",
      x: 80, y: 60, width: 480, height: 240,
      minimized: false, maximized: false,
      content: (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Eliminar Folha Salarial?</h3>
                <p className="text-xs text-gray-500 mt-0.5">{folha.numero}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Tem a certeza que pretende eliminar a folha de {MES_LABEL[mn] ?? mn}/{yr}? Esta acção é irreversível.
            </p>
          </div>
          <div className="shrink-0 border-t border-gray-100 px-4 py-3 bg-gray-50 flex items-center justify-end gap-3">
            <button
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
              onClick={() => closeWindow(winId)}>
              Cancelar
            </button>
            <button
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              onClick={() => { deleteFolha(folha.id); closeWindow(winId); }}>
              Confirmar
            </button>
          </div>
        </div>
      ),
    });
  };

  const openRecibo = (linha: LinhaFolha, folha: FolhaSalarial) => {
    const winId = `recibo-${folha.id}-${linha.funcId}`;
    const func = funcionarios.find((f) => f.id === linha.funcId);
    openWindow({
      id: winId,
      title: `Recibo — ${linha.nome} — ${folha.numero}`,
      x: 80, y: 40, width: 720, height: 640,
      minimized: false, maximized: false,
      content: (
        <ReciboContent
          linha={linha}
          folha={folha}
          funcionario={func}
          onClose={() => closeWindow(winId)}
        />
      ),
    });
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportMapaPessoal = () => {
    const activos = funcionarios.filter((f) => f.estado === "ACTIVO");
    const header = "Nº;Nome;Cargo;Departamento;Data Admissão;Contrato;Sal. Base;NIF;INSS;Banco";
    const rows = activos.map((f) =>
      [f.numero, f.nome, f.cargo, f.departamento, f.dataAdmissao, f.tipoContrato,
       f.salarioBase, f.nif, f.nrINSS, f.banco ?? ""].join(";")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapa-pessoal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Relatórios computed ────────────────────────────────────────────────────
  const [relMesLabel, relMesNr] = relMes.split("-");
  const folhaMes = useMemo(() => folhas.find((f) => f.mes === relMes && f.estado !== "ANULADA"), [folhas, relMes]);

  // Quadro de pessoal stats
  const qpStats = useMemo(() => {
    const activos = funcionarios.filter((f) => f.estado === "ACTIVO");
    const porcCateg: Record<string, number> = {};
    const porDept: Record<string, number> = {};
    let masc = 0; let fem = 0;
    activos.forEach((f) => {
      porcCateg[f.categoriaProfissional] = (porcCateg[f.categoriaProfissional] ?? 0) + 1;
      porDept[f.departamento] = (porDept[f.departamento] ?? 0) + 1;
      if (f.sexo === "M") masc++; else fem++;
    });
    return { activos: activos.length, porcCateg, porDept, masc, fem };
  }, [funcionarios]);

  const kpiAusencias = useMemo(() => {
    const pendentes = ausencias.filter((a) => a.estado === "PENDENTE").length;
    const aprovadas = ausencias.filter((a) => a.estado === "APROVADO").length;
    const emFerias  = ausencias.filter((a) => a.tipo === "FERIAS" && a.estado === "APROVADO").length;
    return { pendentes, aprovadas, emFerias };
  }, [ausencias]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const mainTabs = [
    { id: "funcionarios" as const, label: "Funcionários" },
    { id: "folhas"       as const, label: "Folhas Salariais" },
    { id: "ausencias"    as const, label: "Férias & Ausências" },
    { id: "relatorios"   as const, label: "Relatórios Legais" },
    { id: "irt"          as const, label: "Tabela IRT" },
  ];

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Recursos Humanos"
        subtitle="Lei n.º 7/15 (LGT) · Lei n.º 14/25 (IRT) · Lei n.º 7/04 (INSS)"
        actions={
          <div className="flex gap-2">
            {mainTab === "funcionarios" && (
              <button
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                onClick={() => openFichaWindow()}
              >
                + Novo Funcionário
              </button>
            )}
            {mainTab === "folhas" && (
              <button
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                onClick={openProcessarFolha}
              >
                + Processar Folha
              </button>
            )}
          </div>
        }
      />

      {/* Main tab bar */}
      <div className="flex gap-0 px-6 border-b border-gray-200 bg-white">
        {mainTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              mainTab === t.id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">

        {/* ═══ TAB: FUNCIONÁRIOS ═══ */}
        {mainTab === "funcionarios" && (
          <div className="p-6 space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Funcionários", value: kpiFunc.total, sub: "todos os estados", color: "gray" },
                { label: "Activos", value: kpiFunc.activos, sub: "vínculo activo", color: "green" },
                { label: "Custo Mensal Est.", value: fmtKz(kpiFunc.custoMensal), sub: "incl. encargos", color: "purple" },
                { label: "INSS Inscritos", value: kpiFunc.inssInscritos, sub: `de ${kpiFunc.activos} activos`, color: "blue" },
              ].map((kpi) => (
                <div key={kpi.label} className={`rounded-xl p-4 border ${
                  kpi.color === "green"  ? "bg-green-50 border-green-100" :
                  kpi.color === "purple" ? "bg-purple-50 border-purple-100" :
                  kpi.color === "blue"   ? "bg-blue-50 border-blue-100" :
                  "bg-gray-50 border-gray-100"
                }`}>
                  <div className="text-xs text-gray-500 mb-1">{kpi.label}</div>
                  <div className={`text-2xl font-bold ${
                    kpi.color === "green"  ? "text-green-800" :
                    kpi.color === "purple" ? "text-purple-800" :
                    kpi.color === "blue"   ? "text-blue-800" :
                    "text-gray-800"
                  }`}>{kpi.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <input
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white w-64 focus:outline-none focus:border-blue-400"
                placeholder="Pesquisar por nome, cargo ou Nº..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400"
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
              >
                <option value="TODOS">Todos os estados</option>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
                <option value="SUSPENSO">Suspenso</option>
                <option value="CESSADO">Cessado</option>
              </select>
              <select
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
              >
                <option value="TODOS">Todos os departamentos</option>
                {departamentos.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <div className="text-xs text-gray-400 flex items-center">{funcFiltrados.length} resultados</div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Nº</th>
                    <th className="px-4 py-3 text-left">Nome</th>
                    <th className="px-4 py-3 text-left">Cargo</th>
                    <th className="px-4 py-3 text-left">Departamento</th>
                    <th className="px-4 py-3 text-left">Admissão</th>
                    <th className="px-4 py-3 text-left">Contrato</th>
                    <th className="px-4 py-3 text-right">Sal. Base</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acções</th>
                  </tr>
                </thead>
                <tbody>
                  {funcFiltrados.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum funcionário encontrado.</td></tr>
                  )}
                  {funcFiltrados.map((f) => (
                    <tr key={f.id} className="border-t border-gray-100 hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{f.numero}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{f.nome}</div>
                        <div className="text-xs text-gray-500">{f.categoriaProfissional}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{f.cargo}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{f.departamento}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {f.dataAdmissao ? new Date(f.dataAdmissao).toLocaleDateString("pt-PT") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          f.tipoContrato === "INDETERMINADO" ? "bg-blue-100 text-blue-700" :
                          f.tipoContrato === "DETERMINADO"   ? "bg-orange-100 text-orange-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {f.tipoContrato === "INDETERMINADO" ? "Indet." : f.tipoContrato === "DETERMINADO" ? "Det." : f.tipoContrato === "PRESTACAO_SERVICOS" ? "Prest. Serv." : "Estágio"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono">{fmtKz(f.salarioBase)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          f.estado === "ACTIVO"   ? "bg-green-100 text-green-700" :
                          f.estado === "CESSADO"  ? "bg-red-100 text-red-700" :
                          f.estado === "SUSPENSO" ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {f.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            className="px-2 py-1 text-xs rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                            onClick={() => openFichaWindow(f)}
                          >
                            Ver Ficha
                          </button>
                          <button
                            className="px-2 py-1 text-xs rounded border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                            onClick={() => openFichaWindow(f)}
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400">Lei n.º 7/15 (LGT) — Os registos de pessoal devem ser mantidos por mínimo de 5 anos após cessação do vínculo.</p>
          </div>
        )}

        {/* ═══ TAB: FOLHAS SALARIAIS ═══ */}
        {mainTab === "folhas" && (
          <div className="p-6 space-y-4">
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Nº</th>
                    <th className="px-4 py-3 text-left">Período</th>
                    <th className="px-4 py-3 text-right">Trabalhadores</th>
                    <th className="px-4 py-3 text-right">Bruto</th>
                    <th className="px-4 py-3 text-right">IRT</th>
                    <th className="px-4 py-3 text-right">Líquido</th>
                    <th className="px-4 py-3 text-right">Custo</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acções</th>
                  </tr>
                </thead>
                <tbody>
                  {folhas.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">Nenhuma folha salarial registada. Clique em "Processar Folha" para começar.</td></tr>
                  )}
                  {folhas.map((folha) => {
                    const [yr, mn] = folha.mes.split("-");
                    return (
                      <tr key={folha.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">{folha.numero}</td>
                        <td className="px-4 py-3 text-sm">{MES_LABEL[mn] ?? mn} {yr}</td>
                        <td className="px-4 py-3 text-right text-xs">{folha.linhas.length}</td>
                        <td className="px-4 py-3 text-right text-xs font-mono">{fmtKz(folha.totalBruto)}</td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-red-600">{fmtKz(folha.totalIRT)}</td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-green-700">{fmtKz(folha.totalLiquido)}</td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-purple-700">{fmtKz(folha.totalCusto)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ESTADO_FOLHA_COLOR[folha.estado]}`}>
                            {folha.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              className="px-3 py-1 text-xs rounded border border-gray-200 hover:bg-gray-100 transition-colors"
                              onClick={() => openVerFolha(folha)}
                            >
                              Ver
                            </button>
                            <button
                              className="px-2 py-1 text-xs rounded border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                              onClick={() => handleOpenEditarFolha(folha)}
                              title="Editar"
                            >✏️</button>
                            <button
                              className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                              onClick={() => handleOpenDeleteFolha(folha)}
                              title="Eliminar"
                            >🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {folhas.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-xs">
                      <td className="px-4 py-3" colSpan={3}>TOTAIS ({folhas.filter((f) => f.estado !== "ANULADA").length} folhas)</td>
                      <td className="px-4 py-3 text-right">{fmtKz(folhas.filter((f) => f.estado !== "ANULADA").reduce((s, f) => s + f.totalBruto, 0))}</td>
                      <td className="px-4 py-3 text-right text-red-600">{fmtKz(folhas.filter((f) => f.estado !== "ANULADA").reduce((s, f) => s + f.totalIRT, 0))}</td>
                      <td className="px-4 py-3 text-right text-green-700">{fmtKz(folhas.filter((f) => f.estado !== "ANULADA").reduce((s, f) => s + f.totalLiquido, 0))}</td>
                      <td className="px-4 py-3 text-right text-purple-700">{fmtKz(folhas.filter((f) => f.estado !== "ANULADA").reduce((s, f) => s + f.totalCusto, 0))}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* ═══ TAB: FÉRIAS & AUSÊNCIAS ═══ */}
        {mainTab === "ausencias" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Lei n.º 7/15, art. 198.º — Direito a férias: 22 dias úteis/ano + 2 dias por cada 5 anos (máx. 30)</p>
              <button
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                onClick={() => { setAusForm(blankAus()); setShowAusForm(true); }}
              >
                + Nova Ausência
              </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Pendentes de Aprovação", value: kpiAusencias.pendentes, color: "yellow" },
                { label: "Aprovadas",              value: kpiAusencias.aprovadas, color: "green" },
                { label: "Em Férias Agora",        value: kpiAusencias.emFerias,  color: "blue" },
              ].map((kpi) => (
                <div key={kpi.label} className={`rounded-xl p-4 border ${
                  kpi.color === "yellow" ? "bg-yellow-50 border-yellow-100" :
                  kpi.color === "green"  ? "bg-green-50 border-green-100" :
                  "bg-blue-50 border-blue-100"
                }`}>
                  <div className="text-xs text-gray-500 mb-1">{kpi.label}</div>
                  <div className={`text-2xl font-bold ${
                    kpi.color === "yellow" ? "text-yellow-800" :
                    kpi.color === "green"  ? "text-green-800" :
                    "text-blue-800"
                  }`}>{kpi.value}</div>
                </div>
              ))}
            </div>

            {/* New absence form */}
            {showAusForm && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-bold text-blue-800 mb-3">Nova Ausência / Férias</p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Funcionário">
                    <select className={IC} value={ausForm.funcId} onChange={(e) => setAusField("funcId", e.target.value)}>
                      {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </Field>
                  <Field label="Tipo">
                    <select className={IC} value={ausForm.tipo} onChange={(e) => setAusField("tipo", e.target.value as Ausencia["tipo"])}>
                      {Object.entries(TIPO_AUSENCIA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Dias Úteis">
                    <input type="number" min={1} className={IC} value={ausForm.diasUteis} onChange={(e) => setAusField("diasUteis", parseInt(e.target.value) || 0)} />
                  </Field>
                  <Field label="Data Início">
                    <input type="date" className={IC} value={ausForm.dataInicio} onChange={(e) => setAusField("dataInicio", e.target.value)} />
                  </Field>
                  <Field label="Data Fim">
                    <input type="date" className={IC} value={ausForm.dataFim} onChange={(e) => setAusField("dataFim", e.target.value)} />
                  </Field>
                  <Field label="Observações">
                    <input className={IC} value={ausForm.observacoes ?? ""} onChange={(e) => setAusField("observacoes", e.target.value)} placeholder="Opcional..." />
                  </Field>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                    onClick={() => { addAusencia(ausForm); setShowAusForm(false); }}
                    disabled={!ausForm.funcId || !ausForm.dataInicio || !ausForm.dataFim}
                  >
                    Registar Ausência
                  </button>
                  <button className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors" onClick={() => setShowAusForm(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Ausências table */}
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Funcionário</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">De</th>
                    <th className="px-4 py-3 text-left">Até</th>
                    <th className="px-4 py-3 text-right">Dias Úteis</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acções</th>
                  </tr>
                </thead>
                <tbody>
                  {ausencias.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Nenhuma ausência registada.</td></tr>
                  )}
                  {ausencias.map((a) => {
                    const func = funcionarios.find((f) => f.id === a.funcId);
                    return (
                      <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{func?.nome ?? a.funcId}</div>
                          <div className="text-xs text-gray-500">{func?.cargo}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">{TIPO_AUSENCIA_LABEL[a.tipo]}</td>
                        <td className="px-4 py-3 text-xs">{a.dataInicio ? new Date(a.dataInicio).toLocaleDateString("pt-PT") : "—"}</td>
                        <td className="px-4 py-3 text-xs">{a.dataFim ? new Date(a.dataFim).toLocaleDateString("pt-PT") : "—"}</td>
                        <td className="px-4 py-3 text-right text-xs font-mono">{a.diasUteis}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            a.estado === "APROVADO"  ? "bg-green-100 text-green-700" :
                            a.estado === "REJEITADO" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                          }`}>
                            {a.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a.estado === "PENDENTE" && (
                            <div className="flex justify-center gap-1">
                              <button
                                className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                onClick={() => updateAusencia(a.id, { estado: "APROVADO" })}
                              >
                                Aprovar
                              </button>
                              <button
                                className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                onClick={() => updateAusencia(a.id, { estado: "REJEITADO" })}
                              >
                                Rejeitar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TAB: RELATÓRIOS LEGAIS ═══ */}
        {mainTab === "relatorios" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600 font-medium">Período de referência:</label>
              <input type="month" className="px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400" value={relMes} onChange={(e) => setRelMes(e.target.value)} />
              <span className="text-sm text-gray-500">{MES_LABEL[relMesNr] ?? relMesNr} {relMesLabel}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 1. Mapa de Pessoal */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-800 text-sm">Mapa de Pessoal</div>
                    <div className="text-xs text-gray-500 mt-0.5">MAPTSS — Ministério da Administração Pública</div>
                  </div>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">Anual</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">Relação de todos os trabalhadores activos com dados contratuais, salariais e de habilitações, para submissão ao MAPTSS.</p>
                <div className="text-xs text-gray-400 mb-3">{funcionarios.filter((f) => f.estado === "ACTIVO").length} trabalhadores activos</div>
                <button className="w-full px-3 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors" onClick={exportMapaPessoal}>
                  Exportar CSV
                </button>
              </div>

              {/* 2. Modelo 1 IRT */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-800 text-sm">Modelo 1 IRT</div>
                    <div className="text-xs text-gray-500 mt-0.5">AGT — Declaração mensal de retenções</div>
                  </div>
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">Mensal</span>
                </div>
                {folhaMes ? (
                  <>
                    <div className="rounded-lg overflow-hidden border border-gray-100 mb-3">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-gray-50"><th className="px-2 py-1.5 text-left">Trabalhador</th><th className="px-2 py-1.5 text-right">Base IRT</th><th className="px-2 py-1.5 text-right">IRT</th></tr></thead>
                        <tbody>
                          {folhaMes.linhas.map((l) => (
                            <tr key={l.funcId} className="border-t border-gray-100">
                              <td className="px-2 py-1.5">{l.nome}</td>
                              <td className="px-2 py-1.5 text-right">{fmtKz(l.baseIRT)}</td>
                              <td className="px-2 py-1.5 text-right text-red-600">{fmtKz(l.irt)}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 border-gray-300 font-bold bg-gray-50">
                            <td className="px-2 py-1.5">TOTAL A PAGAR AGT</td>
                            <td className="px-2 py-1.5 text-right">{fmtKz(folhaMes.linhas.reduce((s, l) => s + l.baseIRT, 0))}</td>
                            <td className="px-2 py-1.5 text-right text-red-700">{fmtKz(folhaMes.totalIRT)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 italic mb-3">Sem folha processada para {MES_LABEL[relMesNr] ?? relMesNr} {relMesLabel}.</p>
                )}
              </div>

              {/* 3. Declaração INSS */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-800 text-sm">Declaração INSS</div>
                    <div className="text-xs text-gray-500 mt-0.5">Lei n.º 7/04 — 3% trabalhador + 8% patronal</div>
                  </div>
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">Mensal</span>
                </div>
                {folhaMes ? (
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">INSS Trabalhadores (3%)</span>
                      <span className="font-bold">{fmtKz(folhaMes.totalINSS3)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">INSS Patronal (8%)</span>
                      <span className="font-bold">{fmtKz(folhaMes.totalINSS8)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2 font-bold">
                      <span>Total INSS a Pagar</span>
                      <span className="text-orange-700">{fmtKz(folhaMes.totalINSS3 + folhaMes.totalINSS8)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic mb-3">Sem folha processada para este período.</p>
                )}
              </div>

              {/* 4. FCT */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-800 text-sm">Fundo de Compensação do Trabalho (FCT)</div>
                    <div className="text-xs text-gray-500 mt-0.5">Lei n.º 15/16 — 1% salário base</div>
                  </div>
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">Mensal</span>
                </div>
                {folhaMes ? (
                  <div className="space-y-2 mb-3">
                    {folhaMes.linhas.map((l) => (
                      <div key={l.funcId} className="flex justify-between text-xs text-gray-600">
                        <span>{l.nome}</span>
                        <span>{fmtKz(l.fct)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm border-t pt-2 font-bold">
                      <span>Total FCT</span>
                      <span className="text-purple-700">{fmtKz(folhaMes.totalFCT)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic mb-3">Sem folha processada para este período.</p>
                )}
              </div>

              {/* 5. Quadro de Pessoal */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-800 text-sm">Quadro de Pessoal</div>
                    <div className="text-xs text-gray-500 mt-0.5">Estatísticas por categoria, departamento e género</div>
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">Anual</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="font-bold text-gray-500 uppercase mb-1">Por Categoria</div>
                    {Object.entries(qpStats.porcCateg).map(([cat, n]) => (
                      <div key={cat} className="flex justify-between text-gray-600 py-0.5">
                        <span>{cat}</span><span className="font-bold">{n}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="font-bold text-gray-500 uppercase mb-1">Por Departamento</div>
                    {Object.entries(qpStats.porDept).map(([dept, n]) => (
                      <div key={dept} className="flex justify-between text-gray-600 py-0.5">
                        <span>{dept}</span><span className="font-bold">{n}</span>
                      </div>
                    ))}
                    <div className="mt-2 pt-2 border-t">
                      <div className="font-bold text-gray-500 uppercase mb-1">Por Género</div>
                      <div className="flex justify-between text-gray-600 py-0.5"><span>Masculino</span><span className="font-bold">{qpStats.masc}</span></div>
                      <div className="flex justify-between text-gray-600 py-0.5"><span>Feminino</span><span className="font-bold">{qpStats.fem}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Recibos de Vencimento */}
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-800 text-sm">Recibos de Vencimento</div>
                    <div className="text-xs text-gray-500 mt-0.5">Seleccione o trabalhador para abrir o recibo</div>
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">Mensal</span>
                </div>
                {folhaMes ? (
                  <div className="space-y-1 max-h-48 overflow-auto">
                    {folhaMes.linhas.map((l) => (
                      <button
                        key={l.funcId}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-200 text-left transition-colors"
                        onClick={() => openRecibo(l, folhaMes)}
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-700">{l.nome}</div>
                          <div className="text-xs text-gray-500">{l.cargo}</div>
                        </div>
                        <div className="text-sm font-bold text-green-700">{fmtKz(l.liquido)}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Sem folha processada para {MES_LABEL[relMesNr] ?? relMesNr} {relMesLabel}. Processe a folha salarial primeiro.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: TABELA IRT ═══ */}
        {mainTab === "irt" && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Tabela */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">Tabela IRT 2026 — Categoria A (Trabalho Dependente)</p>
                <p className="text-xs text-gray-500 mb-3">Lei n.º 14/25 de 29 de Setembro (OGE 2026). Fórmula: IRT = Base × Taxa − Parcela a Abater</p>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
                        <th className="px-3 py-2 text-left">Escalão</th>
                        <th className="px-3 py-2 text-right">Mínimo (Kz)</th>
                        <th className="px-3 py-2 text-right">Máximo (Kz)</th>
                        <th className="px-3 py-2 text-right">Taxa</th>
                        <th className="px-3 py-2 text-right">Parcela</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TABELA_IRT_2026.map((e, i) => {
                        const active = irtSim.base >= e.min && irtSim.base <= e.max;
                        return (
                          <tr key={i} className={`border-t border-gray-100 ${active ? "bg-blue-50 font-semibold" : "hover:bg-gray-50"}`}>
                            <td className="px-3 py-2">
                              {active && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 align-middle" />}
                              {i + 1}
                            </td>
                            <td className="px-3 py-2 text-right">{e.min.toLocaleString("pt-PT")}</td>
                            <td className="px-3 py-2 text-right">{e.max === Infinity ? "∞" : e.max.toLocaleString("pt-PT")}</td>
                            <td className="px-3 py-2 text-right">{fmtPct(e.taxa)}</td>
                            <td className="px-3 py-2 text-right">{e.parcela.toLocaleString("pt-PT")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculator */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">Calculadora Interactiva IRT</p>
                <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                  <Field label="Rendimento Bruto Sujeito (Kz)" note="Rendimento após deducao dos subsídios isentos">
                    <input
                      type="number"
                      className={IC}
                      value={irtBruto}
                      onChange={(e) => setIrtBruto(parseFloat(e.target.value) || 0)}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Base IRT</div>
                      <div className="font-bold">{fmtKz(irtSim.base)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Taxa Aplicável</div>
                      <div className="font-bold">{fmtPct(irtSim.taxa)}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Parcela a Abater</div>
                      <div className="font-bold">{fmtKz(irtSim.parcela)}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <div className="text-xs text-red-500 mb-1">IRT a Reter</div>
                      <div className="font-bold text-red-800">{fmtKz(irtSim.imposto)}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <div className="text-xs text-green-500 mb-1">Líquido após IRT</div>
                      <div className="font-bold text-green-800">{fmtKz(irtSim.liquido)}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="text-xs text-blue-500 mb-1">Taxa Efectiva</div>
                      <div className="font-bold text-blue-800">{fmtPct(irtSim.taxaEfetiva)}</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="text-xs text-gray-500 mb-2 font-medium">Isenções (não incluídas na simulação)</div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Subsídio de alimentação (até)</span>
                        <span className="font-medium text-orange-600">{fmtKz(LIMITE_ISENTO_ALIMENT)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Subsídio de transporte</span>
                        <span className="font-medium text-orange-600">100% isento</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
