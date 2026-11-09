
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import styled from "styled-components";

import StatusBadge from "../components/StatusBadge";
import FilterSelect from "../components/FilterSelect";
import { useAuth } from "../contexts/AuthContext";
import { createTicketService } from "../services/ticketService";

import type {
  Ticket,
  TicketPage,
  TicketSortField,
  TicketStatus,
} from "../types/ticket";

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
};

type StatusFilter = TicketStatus | "ALL";

export default function Tickets() {
  const { authRequest } = useAuth();

  const ticketService = useMemo(
    () => createTicketService(authRequest),
    [authRequest]
  );

  const [data, setData] = useState<TicketPage | null>(null);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] =
    useState<TicketSortField>("created_at");
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadTickets() {
      setLoading(true);
      setError("");

      try {
        const result = await ticketService.list({
          status: status === "ALL" ? undefined : status,
          sort_by: sortBy,
          order: "desc",
          limit: PAGE_SIZE,
          offset,
        });

        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) {
          setData(null);
          setError("Não foi possível carregar os chamados.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTickets();

    return () => {
      cancelled = true;
    };
  }, [ticketService, status, sortBy, offset, reloadKey]);

  const total = data?.total ?? 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleStatusChange(value: StatusFilter) {
    setStatus(value);
    setOffset(0);
  }

  function handleSortChange(value: TicketSortField) {
    setSortBy(value);
    setOffset(0);
  }

  return (
    <Container>
      <PageHeader>
        <div>
          <h1>Chamados</h1>
          <p>Gerencie e acompanhe suas solicitações.</p>
        </div>

        <CreateButton to="/tickets/new">
          + Novo chamado
        </CreateButton>
      </PageHeader>

      <Filters>
        <FilterField>
          <label id="status-label" htmlFor="status">Status</label>
          <FilterSelect<StatusFilter> id="status" value={status} onChange={handleStatusChange}
            options={[
              { value: "ALL", label: "Todos" },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value: value as TicketStatus, label })),
            ]} />
        </FilterField>

        <FilterField>
          <label id="sort-label" htmlFor="sort">Ordenar por</label>
          <FilterSelect<TicketSortField> id="sort" value={sortBy} onChange={handleSortChange}
            options={[
              { value: "created_at", label: "Data de cria\u00e7\u00e3o" },
              { value: "updated_at", label: "\u00daltima atualiza\u00e7\u00e3o" },
              { value: "title", label: "T\u00edtulo" },
            ]} />
        </FilterField>

        <RefreshButton
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={loading}
        >
          Atualizar
        </RefreshButton>
      </Filters>

      {error && <Feedback role="alert">{error}</Feedback>}

      {loading ? (
        <Feedback role="status">Carregando chamados...</Feedback>
      ) : data && data.items.length === 0 ? (
        <EmptyState>
          <h2>Nenhum chamado encontrado.</h2>
          <p>
            Tente alterar os filtros ou abra um novo chamado.
          </p>
        </EmptyState>
      ) : data ? (
        <>
          <TicketList>
            {data.items.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </TicketList>

          <Pagination>
            <span>
              {total} chamado{total !== 1 ? "s" : ""} encontrado
              {total !== 1 ? "s" : ""}
            </span>

            <PageControls>
              <PageButton
                type="button"
                disabled={offset === 0}
                onClick={() =>
                  setOffset((value) => Math.max(0, value - PAGE_SIZE))
                }
              >
                Anterior
              </PageButton>

              <span>
                {currentPage} de {totalPages}
              </span>

              <PageButton
                type="button"
                disabled={offset + PAGE_SIZE >= total}
                onClick={() =>
                  setOffset((value) => value + PAGE_SIZE)
                }
              >
                Próxima
              </PageButton>
            </PageControls>
          </Pagination>
        </>
      ) : null}
    </Container>
  );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <TicketItem>
      <TicketTop>
        <TicketId>#{ticket.id}</TicketId>
        <StatusBadge $status={ticket.status}>
          {STATUS_LABELS[ticket.status]}
        </StatusBadge>
      </TicketTop>

      <h2>{ticket.title}</h2>

      <Description>{ticket.description}</Description>

      <TicketBottom>
        <Meta>
          <span>Dono: {ticket.created_by_name || "Nome indisponível"}</span>
          <span>Categoria: {ticket.category}</span>
          <span>
            Criado em:{" "}
            {new Date(ticket.created_at).toLocaleDateString("pt-BR")}
          </span>
        </Meta>

        <DetailsLink to={`/tickets/${ticket.id}`}>
          Ver detalhes →
        </DetailsLink>
      </TicketBottom>
    </TicketItem>
  );
}

const Container = styled.section`
  max-width: var(--content-width);
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 32px;

  h1 {
    margin: 0 0 8px;
    font-size: clamp(26px, 3vw, 32px);
    font-weight: 750;
  }

  p {
    margin: 0;
    color: var(--muted);
  }
`;

const CreateButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 12px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--accent-bg);
  color: var(--focus);
  box-shadow: var(--card-shadow);
  text-decoration: none;
  font-weight: 650;
`;

const Filters = styled.div`
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 24px;
  padding: 20px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
`;

const FilterField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1 1 180px;

  label {
    font-size: 14px;
    font-weight: 700;
  }
`;

const RefreshButton = styled.button`
  min-height: 48px;
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--card-bg);
  color: var(--text);
  box-shadow: var(--card-shadow);
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TicketList = styled.div`
  display: grid;
  gap: 20px;
`;

const TicketItem = styled.article`
  transition: border-color 150ms;
  &:hover { border-color: var(--accent-border); }
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);

  h2 {
    margin: 14px 0 8px;
    font-size: 19px;
    overflow-wrap: anywhere;
  }
`;

const TicketTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const TicketId = styled.span`
  font-size: 13px;
  font-weight: 650;
  color: var(--muted);
`;

const Description = styled.p`
  margin: 0;
  color: var(--muted);
  line-height: 1.5;
  overflow-wrap: anywhere;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TicketBottom = styled.div`
  margin-top: 24px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const Meta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
`;

const DetailsLink = styled(Link)`
  color: var(--text);
  font-weight: 650;
  text-decoration: none;
  color: var(--focus);
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: 28px;
  font-size: 14px;
  color: var(--muted);
`;

const PageControls = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const PageButton = styled.button`
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--input-bg);
  color: var(--text);
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const Feedback = styled.p`
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--card-bg);
`;

const EmptyState = styled.div`
  padding: 40px 24px;
  border: 2px dashed var(--border);
  border-radius: var(--radius-card);
  text-align: center;

  h2 {
    margin-top: 0;
  }

  p {
    color: var(--muted);
  }
`;
