import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, CanceledError } from "axios";
import { toast } from "sonner";
import { api, ApiError } from "./api";
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
const originalAdapter = api.defaults.adapter;
afterEach(() => {
  api.defaults.adapter = originalAdapter;
  vi.clearAllMocks();
});
describe("Global Axios error interceptor", () => {
  it("normalizes RFC 9457 and notifies only once", async () => {
    api.defaults.adapter = async (config) => {
      throw new AxiosError("Conflict", "ERR_BAD_REQUEST", config, undefined, {
        status: 409,
        statusText: "Conflict",
        config,
        headers: new AxiosHeaders(),
        data: {
          type: "urn:accounting:problem:account-has-children",
          title: "CONFLICT",
          status: 409,
          detail: "No se puede eliminar una cuenta con hijos.",
          code: "ACCOUNT_HAS_CHILDREN",
        },
      });
    };
    await expect(api.delete("/accounts/1")).rejects.toMatchObject({
      problem: { status: 409, code: "ACCOUNT_HAS_CHILDREN" },
    });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
  it("handles network failures", async () => {
    api.defaults.adapter = async () => {
      throw new AxiosError("Network Error", "ERR_NETWORK");
    };
    await expect(api.get("/accounts")).rejects.toBeInstanceOf(ApiError);
    expect(toast.error).toHaveBeenCalledWith(
      "Error de conexión",
      expect.any(Object),
    );
  });
  it("does not notify aborted requests", async () => {
    api.defaults.adapter = async () => {
      throw new CanceledError();
    };
    await expect(api.get("/accounts")).rejects.toBeInstanceOf(CanceledError);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
