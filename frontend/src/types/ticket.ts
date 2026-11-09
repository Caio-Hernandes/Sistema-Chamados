export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export type TicketCategory =
  | "HARDWARE"
  | "SOFTWARE"
  | "NETWORK"
  | "ACCESS"
  | "OTHER";

export type TicketAction =
  | "ASSIGN"
  | "RESOLVE"
  | "CLOSE"
  | "REOPEN";

export type TicketSortField =
  | "created_at"
  | "updated_at"
  | "title";

export type SortOrder = "asc" | "desc";

export interface Ticket {
  id: number;
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  created_by_id: number;
  created_by_name: string;
  assigned_to_id: number | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketCreate {
  title: string;
  description: string;
  category: TicketCategory;
}

export interface TicketUpdate {
  title?: string;
  description?: string;
  category?: TicketCategory;
}

export interface TicketFilters {
  status?: TicketStatus;
  category?: TicketCategory;
  assigned_to_id?: number;
  created_by_id?: number;
  sort_by?: TicketSortField;
  order?: SortOrder;
  limit?: number;
  offset?: number;
}

export interface TicketPage {
  items: Ticket[];
  total: number;
  limit: number;
  offset: number;
}

export interface TicketEvent {
  id: number;
  action: TicketAction;
  from_status: TicketStatus;
  to_status: TicketStatus;
  actor_id: number;
  actor_name: string;
  created_at: string;
}
