import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import AppLayout from "../AppLayout";

const { logout, toggleTheme } = vi.hoisted(() => ({
  logout: vi.fn(), toggleTheme: vi.fn(),
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Caio", email: "caio@example.com" }, logout }),
}));
vi.mock("../../contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", toggleTheme }),
}));

function setup() {
  render(<MemoryRouter initialEntries={["/tickets"]}>
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/tickets" element={<p>Lista de chamados</p>} />
        <Route path="/dashboard" element={<h1>Home</h1>} />
      </Route>
      <Route path="/login" element={<h1>Login</h1>} />
    </Routes>
  </MemoryRouter>);
  return userEvent.setup();
}

describe("AppLayout", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("mantém tema, conta e recolher no rodapé, com seleção explícita do tema", async () => {
    const user = setup();
    const footer = screen.getByRole("button", { name: "Recolher menu" }).closest("footer");
    expect(footer).not.toBeNull();
    const controls = within(footer!);
    expect(controls.getByText("Caio")).toBeVisible();
    expect(controls.getByRole("button", { name: "Sair da conta" })).toBeVisible();
    const light = controls.getByRole("button", { name: "Ativar modo claro" });
    expect(light).toHaveAttribute("aria-pressed", "true");
    await user.click(light);
    expect(toggleTheme).not.toHaveBeenCalled();
    await user.click(controls.getByRole("button", { name: "Ativar modo escuro" }));
    expect(toggleTheme).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Meus chamados" })).toHaveAttribute("aria-current", "page");
  });

  it("recolhe e expande o menu mantendo as ações acessíveis", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Recolher menu" }));
    expect(screen.getByRole("button", { name: "Expandir menu" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Meus chamados" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Ativar modo escuro" }));
    expect(toggleTheme).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Expandir menu" }));
    expect(screen.getByRole("button", { name: "Recolher menu" })).toHaveAttribute("aria-expanded", "true");
  });

  it("volta para a home pelo cabeçalho", async () => {
    const user = setup();
    expect(screen.getByRole("link", { name: /voltar para home/i })).toHaveTextContent("CHAMADOS.");
    await user.click(screen.getByRole("button", { name: "Recolher menu" }));
    const home = screen.getByRole("link", { name: /voltar para home/i });
    expect(home).toHaveTextContent("C.");
    await user.click(home);
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });

  it("mantém a sessão e exibe erro se o logout falhar", async () => {
    logout.mockRejectedValueOnce(new Error("offline"));
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Sair da conta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Tente novamente/);
    expect(screen.getByText("Lista de chamados")).toBeInTheDocument();
  });

  it("redireciona para o login após sair", async () => {
    logout.mockResolvedValueOnce(undefined);
    const user = setup();
    await user.click(screen.getByRole("button", { name: "Sair da conta" }));
    expect(await screen.findByRole("heading", { name: "Login" })).toBeInTheDocument();
  });
});
