// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { accountsApi, type Account } from "./api";

vi.mock("./api", () => ({
  accountsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
const accounts: Account[] = [
  {
    code: "1",
    name: "Activo",
    nature: "DEBIT",
    parentCode: null,
    level: "CLASS",
    createdAt: "",
    updatedAt: "",
  },
  {
    code: "11",
    name: "Disponible",
    nature: "DEBIT",
    parentCode: "1",
    level: "GROUP",
    createdAt: "",
    updatedAt: "",
  },
];
beforeEach(() => {
  vi.mocked(accountsApi.list).mockResolvedValue(accounts);
  vi.mocked(accountsApi.create).mockRejectedValue(
    new Error("Backend validation"),
  );
  vi.mocked(accountsApi.update).mockRejectedValue(
    new Error("Backend validation"),
  );
  vi.mocked(accountsApi.remove).mockRejectedValue(
    new Error("Backend validation"),
  );
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("Backend is the validation authority", () => {
  it("submits invalid code and empty name instead of validating locally", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Nueva clase" }),
    );
    await user.type(screen.getByLabelText("Código"), "abc1234567");
    await user.click(screen.getByRole("button", { name: "Guardar cuenta" }));
    await waitFor(() =>
      expect(accountsApi.create).toHaveBeenCalledWith({
        code: "abc1234567",
        name: "",
        nature: "DEBIT",
      }),
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
  it("sends duplicate codes to the backend", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(
      await screen.findByRole("button", { name: "Nueva clase" }),
    );
    await user.type(screen.getByLabelText("Código"), "1");
    await user.type(screen.getByLabelText("Nombre"), "Duplicada");
    await user.click(screen.getByRole("button", { name: "Guardar cuenta" }));
    await waitFor(() =>
      expect(accountsApi.create).toHaveBeenCalledWith({
        code: "1",
        name: "Duplicada",
        nature: "DEBIT",
      }),
    );
  });
  it("submits empty edits and deletion of parents with children", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByText("Activo"));
    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.clear(screen.getByLabelText("Nombre"));
    await user.click(screen.getByRole("button", { name: "Guardar cuenta" }));
    await waitFor(() =>
      expect(accountsApi.update).toHaveBeenCalledWith("1", ""),
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Eliminar cuenta" }));
    await waitFor(() => expect(accountsApi.remove).toHaveBeenCalledWith("1"));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
