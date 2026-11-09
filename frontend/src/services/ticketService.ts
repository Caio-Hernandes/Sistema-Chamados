
import type {
  Ticket,
  TicketCreate,
  TicketUpdate,
  TicketFilters,
  TicketPage,
  TicketEvent,
} from "../types/ticket";

type AuthRequest = <T>(
  endpoint: string,
  options?: RequestInit
) => Promise<T>;

export function createTicketService(request: AuthRequest) {
  return {
    list(filters: TicketFilters = {}): Promise<TicketPage> {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.set(key, String(value));
        }
      });

      const query = params.toString();

      return request<TicketPage>(
        `/tickets${query ? `?${query}` : ""}`
      );
    },

    get(id: number): Promise<Ticket> {
      return request<Ticket>(`/tickets/${id}`);
    },

    create(data: TicketCreate): Promise<Ticket> {
      return request<Ticket>("/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },

    update(id: number, data: TicketUpdate): Promise<Ticket> {
      if (
        Object.keys(data).length === 0 ||
        Object.values(data).some((value) => value == null)
      ) {
        throw new Error("Informe campos válidos para atualizar.");
      }

      return request<Ticket>(`/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },

    remove(id: number): Promise<void> {
      return request<void>(`/tickets/${id}`, {
        method: "DELETE",
      });
    },

    assign(id: number): Promise<Ticket> {
      return request<Ticket>(`/tickets/${id}/assign`, {
        method: "POST",
      });
    },

    resolve(id: number): Promise<Ticket> {
      return request<Ticket>(`/tickets/${id}/resolve`, {
        method: "POST",
      });
    },

    close(id: number): Promise<Ticket> {
      return request<Ticket>(`/tickets/${id}/close`, {
        method: "POST",
      });
    },

    reopen(id: number): Promise<Ticket> {
      return request<Ticket>(`/tickets/${id}/reopen`, {
        method: "POST",
      });
    },

    history(id: number): Promise<TicketEvent[]> {
      return request<TicketEvent[]>(`/tickets/${id}/history`);
    },
  };
}
