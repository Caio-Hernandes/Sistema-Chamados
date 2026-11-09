
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import styled from "styled-components";

import { useAuth } from "../contexts/AuthContext";
import { createTicketService } from "../services/ticketService";
import { ApiError } from "../services/api";

import type {
  Ticket,
  TicketEvent,
  TicketStatus,
  TicketCategory,
} from "../types/ticket";

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  RESOLVED: "Resolvido",
  CLOSED: "Fechado",
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  HARDWARE: "Hardware",
  SOFTWARE: "Software",
  NETWORK: "Rede",
  ACCESS: "Acesso",
  OTHER: "Outros",
};

export default function TicketDetails() {
  const { id } = useParams();
  const ticketId = Number(id);

  const { user, authRequest } = useAuth();

  const service = useMemo(
    () => createTicketService(authRequest),
    [authRequest]
  );

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [history, setHistory] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadTicket = useCallback(async () => {
    const [ticketData, historyData] = await Promise.all([
      service.get(ticketId),
      service.history(ticketId),
    ]);

    setTicket(ticketData);
    setHistory(historyData);
  }, [service, ticketId]);

  useEffect(() => {
    let cancelled = false;

    if (!Number.isSafeInteger(ticketId) || ticketId <= 0) {
      setError("Identificador do chamado inválido.");
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [ticketData, historyData] = await Promise.all([
          service.get(ticketId),
          service.history(ticketId),
        ]);

        if (!cancelled) {
          setTicket(ticketData);
          setHistory(historyData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [service, ticketId]);

  async function performAction(
    action: "assign" | "resolve" | "close" | "reopen"
  ) {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await service[action](ticketId);
      await loadTicket();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <Feedback>Carregando chamado...</Feedback>;
  }

  if (!ticket) {
    return (
      <Container>
        <Feedback role="alert">
          {error || "Chamado não encontrado."}
        </Feedback>
        <BackLink to="/tickets">← Voltar aos chamados</BackLink>
      </Container>
    );
  }

  const isAdmin = user?.role === "ADMIN";
  const isCreator = user?.id === ticket.created_by_id;
  const isAssignedAdmin =
    isAdmin && user?.id === ticket.assigned_to_id;

  return (
    <Container>
      <Header>
        <div>
          <BackLink to="/tickets">← Voltar aos chamados</BackLink>
          <h1>Chamado #{ticket.id}</h1>
          <p>Acompanhe os detalhes da solicitação.</p>
        </div>

        <StatusBadge>{STATUS_LABELS[ticket.status]}</StatusBadge>
      </Header>

      {error && <Feedback role="alert">{error}</Feedback>}

      <Card>
        <h2>{ticket.title}</h2>

        <Metadata>
          <span>
            <strong>Categoria:</strong>{" "}
            {CATEGORY_LABELS[ticket.category]}
          </span>

          <span>
            <strong>Criado por:</strong> Usuário #{ticket.created_by_id}
          </span>

          <span>
            <strong>Responsável:</strong>{" "}
            {ticket.assigned_to_id
              ? `Usuário #${ticket.assigned_to_id}`
              : "Não atribuído"}
          </span>

          <span>
            <strong>Criado em:</strong>{" "}
            {formatDate(ticket.created_at)}
          </span>

          <span>
            <strong>Atualizado em:</strong>{" "}
            {formatDate(ticket.updated_at)}
          </span>
        </Metadata>

        <Divider />

        <h3>Descrição</h3>
        <Description>{ticket.description}</Description>
      </Card>

      <Card>
        <h2>Ações</h2>

        <Actions>
          {isAdmin && ticket.status === "OPEN" && (
            <ActionButton
              disabled={busy}
              onClick={() => performAction("assign")}
            >
              Assumir chamado
            </ActionButton>
          )}

          {isAssignedAdmin && ticket.status === "IN_PROGRESS" && (
            <ActionButton
              disabled={busy}
              onClick={() => performAction("resolve")}
            >
              Resolver chamado
            </ActionButton>
          )}

          {(isCreator || isAdmin) && ticket.status === "RESOLVED" && (
            <ActionButton
              disabled={busy}
              onClick={() => performAction("close")}
            >
              Encerrar chamado
            </ActionButton>
          )}

          {isCreator && ticket.status === "RESOLVED" && (
            <ActionButton
              disabled={busy}
              onClick={() => performAction("reopen")}
            >
              Reabrir chamado
            </ActionButton>
          )}

          {isCreator && ticket.status === "OPEN" && (
            <Hint>
              Você pode editar este chamado enquanto estiver aberto.
            </Hint>
          )}

          {ticket.status === "CLOSED" && (
            <Hint>Este chamado está encerrado.</Hint>
          )}
        </Actions>
      </Card>

      <Card>
        <h2>Histórico</h2>

        {history.length === 0 ? (
          <Hint>Nenhuma alteração de status registrada.</Hint>
        ) : (
          <HistoryList>
            {history.map((event) => (
              <HistoryItem key={event.id}>
                <strong>{event.action}</strong>
                <span>
                  {STATUS_LABELS[event.from_status]} →{" "}
                  {STATUS_LABELS[event.to_status]}
                </span>
                <small>
                  Usuário #{event.actor_id} —{" "}
                  {formatDate(event.created_at)}
                </small>
              </HistoryItem>
            ))}
          </HistoryList>
        )}
      </Card>
    </Container>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "Você não tem permissão para realizar esta ação.";
    }

    if (error.status === 404) {
      return "Chamado não encontrado.";
    }

    if (error.status === 409) {
      return "Esta ação não é permitida no status atual.";
    }

    return error.message;
  }

  return "Não foi possível completar a operação.";
}

const Container = styled.section`
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;

  h1 {
    margin: 16px 0 8px;
    font-size: clamp(26px, 4vw, 36px);
    font-weight: 900;
  }

  p {
    margin: 0;
    color: var(--muted);
  }
`;

const BackLink = styled(Link)`
  color: var(--text);
  font-weight: 700;
`;

const Card = styled.section`
  padding: 28px;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  box-shadow: 5px 5px 0 var(--border);

  h2 {
    margin: 0 0 24px;
    font-size: 22px;
  }

  h3 {
    font-size: 16px;
  }
`;

const StatusBadge = styled.span`
  padding: 10px 16px;
  border: 2px solid var(--border);
  border-radius: 6px;
  background: var(--input-bg);
  box-shadow: 3px 3px 0 var(--border);
  font-weight: 800;
`;

const Metadata = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px 24px;
  font-size: 14px;
  color: var(--text);
`;

const Divider = styled.hr`
  border: none;
  border-top: 2px solid var(--border);
  margin: 28px 0;
`;

const Description = styled.p`
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 12px 18px;
  border: 2px solid var(--border);
  border-radius: 5px;
  background: var(--input-bg);
  color: var(--text);
  box-shadow: 3px 3px 0 var(--border);
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const HistoryItem = styled.div`
  padding: 14px;
  border: 2px solid var(--border);
  border-radius: 5px;
  background: var(--input-bg);

  display: flex;
  flex-direction: column;
  gap: 6px;

  small {
    color: var(--muted);
  }
`;

const Hint = styled.p`
  margin: 0;
  color: var(--muted);
  font-size: 14px;
`;

const Feedback = styled.p`
  padding: 18px;
  border: 2px solid var(--border);
  border-radius: 6px;
  background: var(--card-bg);
`;
