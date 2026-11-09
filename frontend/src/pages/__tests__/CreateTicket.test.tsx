
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import CreateTicket from "../CreateTicket";

const { requestMock, navigateMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    authRequest: requestMock,
  }),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("react-router")
  >();

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

describe("CreateTicket", () => {
  beforeEach(() => {
    requestMock.mockReset();
    navigateMock.mockReset();
  });

  it("deve renderizar o formulário", () => {
    render(
      <MemoryRouter>
        <CreateTicket />
      </MemoryRouter>
    );

    expect(
      screen.getByRole("heading", { name: /abrir chamado/i })
    ).toBeInTheDocument();

    expect(screen.getByLabelText("Título")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoria")).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição")).toBeInTheDocument();
  });

  it("deve enviar os dados para a API", async () => {
    requestMock.mockResolvedValue({
      id: 12,
      title: "Erro no computador",
    });

    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CreateTicket />
      </MemoryRouter>
    );

    await user.type(
      screen.getByLabelText("Título"),
      "Erro no computador"
    );

    await user.selectOptions(
      screen.getByLabelText("Categoria"),
      "HARDWARE"
    );

    await user.type(
      screen.getByLabelText("Descrição"),
      "O computador não liga."
    );

    await user.click(
      screen.getByRole("button", { name: /criar chamado/i })
    );

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        "/tickets",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "Erro no computador",
            description: "O computador não liga.",
            category: "HARDWARE",
          }),
        })
      );
    });
  });
});
