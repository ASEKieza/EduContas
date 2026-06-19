export type AccountNature = "DEVEDOR" | "CREDOR";
export type AccountType = "MOVIMENTO" | "ACUMULACAO" | "TITULO";
export type JournalEntryStatus = "RASCUNHO" | "LANÇADO" | "ANULADO";
export type DocumentStatus = "LANÇADO" | "PAGO" | "PARCIAL" | "LIQUIDADO" | "ANULADO";
export type CostingMethod = "CMP" | "FIFO";
export type NormaContabilistica = "PGCA" | "IFRS" | "IFRS_PME" | "SNCRF";

export interface ChartOfAccount {
  id: string;
  tenant_id: string;
  codigo: string;
  descricao: string;
  natureza: AccountNature;
  tipo_conta: AccountType;
  aceita_lancamentos: boolean;
  hierarquia: string;
  saldo_devedor: number;
  saldo_credor: number;
}

export interface JournalLine {
  id: string;
  conta_id: string;
  conta_codigo: string;
  conta_descricao: string;
  tipo: "DEBITO" | "CREDITO";
  valor: number;
  descricao?: string;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  numero_diario: string;
  data_lancamento: string;
  descricao: string;
  estado: JournalEntryStatus;
  modulo_origem: string;
  total_debito: number;
  total_credito: number;
  linhas: JournalLine[];
  estorno_de_id?: string;
  estornado_por_id?: string;
  created_at: string;
  created_by: string;
}

export interface PostingRequest {
  tenant_id: string;
  periodo_id: string;
  data_lancamento: string;
  descricao: string;
  modulo_origem: string;
  documento_referencia?: string;
  linhas: {
    conta_codigo: string;
    tipo: "DEBITO" | "CREDITO";
    valor: number;
    descricao?: string;
  }[];
}

export interface Customer {
  id: string;
  tenant_id: string;
  nome: string;
  nif: string;
  email?: string;
  telefone?: string;
  limite_credito: number;
  saldo_devedor: number;
}

export interface SalesInvoice {
  id: string;
  numero: string;
  data_emissao: string;
  cliente_id: string;
  cliente_nome: string;
  total_sem_iva: number;
  total_iva: number;
  total_com_iva: number;
  total_pago: number;
  saldo: number;
  estado: DocumentStatus;
  diario_id?: string;
}

export interface KpiData {
  liquidez_geral: number;
  liquidez_reduzida: number;
  autonomia_financeira: number;
  roa: number;
  roe: number;
  margem_ebitda: number;
  prazo_medio_recebimento: number;
  prazo_medio_pagamento: number;
  rotacao_inventario: number;
  fundo_maneio: number;
}

export interface BalanceteRow {
  conta_codigo: string;
  conta_descricao: string;
  mov_debito: number;
  mov_credito: number;
  saldo_devedor: number;
  saldo_credor: number;
}

export interface BalanceteReport {
  tenant_id: string;
  periodo: string;
  data_referencia: string;
  linhas: BalanceteRow[];
  total_debito: number;
  total_credito: number;
  total_sd: number;
  total_sc: number;
  equilibrado: boolean;
}

export interface IrtBracket {
  escalao: number;
  limite_inferior: number;
  limite_superior: number | null;
  taxa: number;
  parcela_abater: number;
}

export interface IrtCalculation {
  remuneracao_bruta: number;
  irt_calculado: number;
  taxa_efectiva: number;
  escalao_aplicado: number;
}

export interface Tenant {
  id: string;
  nome: string;
  nif: string;
  tipo_entidade: string;
  norma_contabilistica: NormaContabilistica;
  moeda_base: string;
  plano_saas: string;
  activo: boolean;
}

export interface User {
  id: string;
  tenant_id: string;
  nome_completo: string;
  email: string;
  papel: "ADMIN" | "GESTOR_FINANCEIRO" | "CONTABILISTA" | "AUDITOR" | "COMERCIAL" | "RH" | "OPERADOR" | "READONLY";
  activo: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}
