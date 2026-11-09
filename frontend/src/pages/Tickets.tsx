
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import styled from "styled-components";

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
          <label htmlFor="status">Status</label>
          <Select
            id="status"
            value={status}
            onChange={(event) =>
              handleStatusChange(
                event.target.value as StatusFilter
              )
            }
          >
            <option value="ALL">Todos</option>
            <option value="OPEN">Aberto</option>
            <option value="IN_PROGRESS">Em andamento</option>
            <option value="RESOLVED">Resolvido</option>
            <option value="CLOSED">Fechado</option>
          </Select>
        </FilterField>

        <FilterField>
          <label htmlFor="sort">Ordenar por</label>
          <Select
            id="sort"
            value={sortBy}
            onChange={(event) =>
              handleSortChange(
                event.target.value as TicketSortField
              )
            }
          >
            <option value="created_at">Data de criação</option>
            <option value="updated_at">Última atualização</option>
            <option value="title">Título</option>
          </Select>
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
  max-width: 1200px;
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
    font-size: clamp(26px, 4vw, 36px);
    font-weight: 900;
  }

  p {
    margin: 0;
    color: var(--muted);
  }
`;

const CreateButton = styled(Link)`
  padding: 12px 18px;
  border: 2px solid var(--border);
  border-radius: 5px;
  background: var(--input-bg);
  color: var(--text);
  box-shadow: 4px 4px 0 var(--border);
  text-decoration: none;
  font-weight: 800;
`;

const Filters = styled.div`
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 28px;
`;

const FilterField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 180px;

  label {
    font-size: 14px;
    font-weight: 700;
  }
`;

const Select = styled.select`
  min-height: 44px;
  padding: 10px;
  border: 2px solid var(--border);
  border-radius: 5px;
  background: var(--input-bg);
  color: var(--text);
  box-shadow: 3px 3px 0 var(--border);
  font-size: 14px;
`;

const RefreshButton = styled.button`
  min-height: 44px;
  padding: 10px 16px;
  border: 2px solid var(--border);
  border-radius: 5px;
  background: var(--card-bg);
  color: var(--text);
  box-shadow: 3px 3px 0 var(--border);
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TicketList = styled.div`
  display: grid;
  gap: 18px;
`;

const TicketItem = styled.article`
  padding: 24px;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: 4px 4px 0 var(--border);

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
  font-weight: 800;
  color: var(--muted);
`;

const StatusBadge = styled.span<{ $status: TicketStatus }>`
  padding: 6px 10px;
  border: 2px solid var(--border);
  border-radius: 5px;
  font-size: 12px;
  font-weight: 800;
  background: ${({ $status }) => {
    switch ($status) {
      case "OPEN":
        return "#FDE68A";
      case "IN_PROGRESS":
        return "#BFDBFE";
      case "RESOLVED":
        return "#BBF7D0";
      case "CLOSED":
        return "#D1D5DB";
    }
  }};
  color: #171717;
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
  font-weight: 800;
  text-decoration: underline;
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
  border: 2px solid var(--border);
  border-radius: 5px;
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
  border: 2px solid var(--border);
  border-radius: 6px;
  background: var(--card-bg);
`;

const EmptyState = styled.div`
  padding: 40px 24px;
  border: 2px dashed var(--border);
  border-radius: 8px;
  text-align: center;

  h2 {
    margin-top: 0;
  }

  p {
    color: var(--muted);
  }
`;
