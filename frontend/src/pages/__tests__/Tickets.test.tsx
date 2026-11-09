import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Tickets from "../Tickets";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ authRequest: request }),
}));

describe("Tickets", () => {
  it("exibe o nome do dono retornado pela API dentro do card", async () => {
    request.mockResolvedValueOnce({
      total: 1, limit: 10, offset: 0,
      items: [{ id: 1, title: "Sem acesso", description: "Preciso de acesso",
        category: "ACCESS", status: "OPEN", created_by_id: 9,
        created_by_name: "Maria Silva", assigned_to_id: null,
        created_at: "2026-11-09T12:00:00Z", updated_at: "2026-11-09T12:00:00Z" }],
    });
    render(<MemoryRouter><Tickets /></MemoryRouter>);
    expect(await screen.findByText("Dono: Maria Silva")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver detalhes/ })).toHaveAttribute("href", "/tickets/1");
  });
});
