import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import Dashboard from "../Dashboard";

const { request, account } = vi.hoisted(() => ({
  request: vi.fn(), account: { name: "Maria Silva", role: "USER" },
}));
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: account, authRequest: request }),
}));
function renderDashboard() {
  return render(<MemoryRouter><Dashboard /></MemoryRouter>);
}
function totals() {
  request.mockImplementation(async (endpoint: string) => ({
    total: { OPEN: 125, IN_PROGRESS: 7, RESOLVED: 3, CLOSED: 0 }[
      new URLSearchParams(endpoint.split("?")[1]).get("status") as "OPEN"
    ],
    items: [],
  }));
}
describe("Dashboard", () => {
  beforeEach(() => {
    request.mockReset();
    account.role = "USER";
    account.name = "Maria Silva";
  });
  it("usa os totais da API por status, incluindo zero e valores além de uma página", async () => {
    totals();
    renderDashboard();
    expect(screen.getByRole("heading", { name: "Olá, Maria!" })).toBeInTheDocument();
    expect(await screen.findByText("125")).toBeInTheDocument();
    for (const total of ["7", "3", "0"]) expect(screen.getByText(total)).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(4);
    expect(screen.getByText("Resumo dos seus chamados.")).toBeInTheDocument();
  });
  it("exibe o nome cadastrado do administrador", async () => {
    account.role = "ADMIN";
    account.name = "Equipe de Suporte";
    totals();
    renderDashboard();
    expect(screen.getByRole("heading", { name: "Olá, Equipe de Suporte!" })).toBeInTheDocument();
    expect(await screen.findByText("Resumo de todos os chamados.")).toBeInTheDocument();
  });
  it("permite tentar novamente após falha sem apresentar zero como resultado", async () => {
    request.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    renderDashboard();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    totals();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("125")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
