import axios from "axios";
import type {
  JournalEntry,
  PostingRequest,
  SalesInvoice,
  BalanceteReport,
  KpiData,
  PaginatedResponse,
  ApiResponse,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        window.location.href = "/";
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; token_type: string }>("/auth/token", { email, password }),

  logout: () => api.post("/auth/logout"),
};

// Contabilidade
export const contabilidadeApi = {
  lancar: (req: PostingRequest) =>
    api.post<ApiResponse<JournalEntry>>("/lancamentos", req),

  estornar: (id: string, motivo: string) =>
    api.post<ApiResponse<JournalEntry>>(`/lancamentos/${id}/estornar`, { motivo }),

  listar: (tenantId: string, params?: { page?: number; page_size?: number; data_inicio?: string; data_fim?: string }) =>
    api.get<PaginatedResponse<JournalEntry>>(`/lancamentos/${tenantId}`, { params }),

  buscarLinhas: (id: string) =>
    api.get<ApiResponse<JournalEntry>>(`/lancamentos/${id}/linhas`),
};

// Relatórios
export const relatoriosApi = {
  balancete: (tenantId: string, dataReferencia: string) =>
    api.get<ApiResponse<BalanceteReport>>(`/relatorios/${tenantId}/balancete`, {
      params: { data_referencia: dataReferencia },
    }),

  balanco: (tenantId: string, dataReferencia: string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`/relatorios/${tenantId}/balanco`, {
      params: { data_referencia: dataReferencia },
    }),

  demonstracaoResultados: (tenantId: string, periodoId: string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`/relatorios/${tenantId}/demonstracao-resultados`, {
      params: { periodo_id: periodoId },
    }),

  fluxoCaixa: (tenantId: string, periodoId: string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`/relatorios/${tenantId}/fluxo-caixa`, {
      params: { periodo_id: periodoId },
    }),

  indicadores: (tenantId: string, dataReferencia: string) =>
    api.get<ApiResponse<KpiData>>(`/relatorios/${tenantId}/indicadores`, {
      params: { data_referencia: dataReferencia },
    }),

  auditoria: (tenantId: string, params?: { data_inicio?: string; data_fim?: string; page?: number }) =>
    api.get<PaginatedResponse<Record<string, unknown>>>(`/relatorios/${tenantId}/auditoria`, { params }),
};

// Vendas
export const vendasApi = {
  criarFactura: (data: Record<string, unknown>) =>
    api.post<ApiResponse<SalesInvoice>>("/facturas", data),

  listarFacturas: (tenantId: string, params?: Record<string, unknown>) =>
    api.get<PaginatedResponse<SalesInvoice>>("/facturas", { params: { tenant_id: tenantId, ...params } }),

  registarRecibo: (facturaId: string, valor: number, contaBancaria: string) =>
    api.post<ApiResponse<Record<string, unknown>>>("/recibos", { factura_id: facturaId, valor, conta_bancaria: contaBancaria }),

  listarClientes: (tenantId: string) =>
    api.get<PaginatedResponse<Record<string, unknown>>>("/clientes", { params: { tenant_id: tenantId } }),
};

export default api;
