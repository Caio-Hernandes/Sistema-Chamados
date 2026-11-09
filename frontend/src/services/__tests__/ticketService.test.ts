import { describe, expect, it, vi } from "vitest";

import { createTicketService } from "../ticketService";

describe("ticketService", () => {
function setup() {
  const requestMock = vi.fn().mockResolvedValue({});

  const request = <T,>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> => {
    if (options === undefined) {
      return requestMock(endpoint) as Promise<T>;
    }

    return requestMock(endpoint, options) as Promise<T>;
  };

  const service = createTicketService(request);

  return { requestMock, service };
}

  it("deve listar chamados com filtros e paginação", async () => {
    const { requestMock, service } = setup();

    await service.list({
      status: "OPEN",
      sort_by: "created_at",
      order: "desc",
      limit: 10,
      offset: 0,
    });

    expect(requestMock).toHaveBeenCalledWith(
      "/tickets?status=OPEN&sort_by=created_at&order=desc&limit=10&offset=0"
    );
  });

  it("deve criar um chamado com POST", async () => {
    const { requestMock, service } = setup();

    const payload = {
      title: "Computador não liga",
      description: "O equipamento não inicia.",
      category: "HARDWARE" as const,
    };

    await service.create(payload);

    expect(requestMock).toHaveBeenCalledWith("/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  });

  it("deve impedir atualização sem campos", () => {
    const { requestMock, service } = setup();

    expect(() => service.update(1, {})).toThrow(
      "Informe campos válidos para atualizar."
    );

    expect(requestMock).not.toHaveBeenCalled();
  });

  it("deve consultar o histórico do chamado", async () => {
    const { requestMock, service } = setup();

    await service.history(15);

    expect(requestMock).toHaveBeenCalledWith(
      "/tickets/15/history"
    );
  });

  it("deve enviar a ação de assumir chamado", async () => {
    const { requestMock, service } = setup();

    await service.assign(15);

    expect(requestMock).toHaveBeenCalledWith(
      "/tickets/15/assign",
      { method: "POST" }
    );
  });

  it("deve excluir chamado usando DELETE", async () => {
    const { requestMock, service } = setup();

    await service.remove(15);

    expect(requestMock).toHaveBeenCalledWith(
      "/tickets/15",
      { method: "DELETE" }
    );
  });
});