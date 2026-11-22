import axios from "axios";
import { toast } from "sonner";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
}
export class ApiError extends Error {
  readonly problem: ProblemDetails;
  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title);
    this.problem = problem;
  }
}
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  timeout: 15000,
});
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    let problem: ProblemDetails = {
      type: "about:blank",
      title: "Error de conexión",
      status: 0,
      detail:
        "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.",
    };
    if (axios.isAxiosError(error) && error.response) {
      const data: unknown = error.response.data;
      problem = {
        type: "about:blank",
        status: error.response.status,
        title: "Error en la solicitud",
        detail: "No se pudo completar la operación.",
      };
      if (
        data &&
        typeof data === "object" &&
        "title" in data &&
        typeof data.title === "string" &&
        "status" in data &&
        typeof data.status === "number"
      ) {
        const source = data as Record<string, unknown>;
        problem = {
          ...problem,
          title: data.title,
          type: typeof source.type === "string" ? source.type : "about:blank",
          detail:
            typeof source.detail === "string" ? source.detail : data.title,
          code: typeof source.code === "string" ? source.code : undefined,
        };
      }
    }
    const normalized = new ApiError(problem);
    toast.error(problem.title, {
      description: normalized.message,
      id: problem.code || problem.title,
    });
    return Promise.reject(normalized);
  },
);

export interface Account {
  code: string;
  name: string;
  nature: "DEBIT" | "CREDIT";
  parentCode: string | null;
  level: "CLASS" | "GROUP" | "ACCOUNT" | "SUBACCOUNT";
  createdAt: string;
  updatedAt: string;
}
export interface CreateAccount {
  code: string;
  name: string;
  nature?: Account["nature"];
}
export const accountsApi = {
  list: async (signal?: AbortSignal) =>
    (await api.get<Account[]>("/accounts", { signal })).data,
  create: async (data: CreateAccount) =>
    (await api.post<Account>("/accounts", data)).data,
  update: async (code: string, name: string) =>
    (await api.patch<Account>(`/accounts/${code}`, { name })).data,
  remove: async (code: string) => {
    await api.delete(`/accounts/${code}`);
  },
};
