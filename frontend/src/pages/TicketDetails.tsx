import StatusBadge from "../components/StatusBadge";

import { useEffect, useMemo, useState } from "react";
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
  OTHER: "Outro",
};

const ACTION_LABELS: Record<string, string> = {
  ASSIGN: "Atribuído",
  RESOLVE: "Resolvido",
  CLOSE: "Fechado",
  REOPEN: "Reaberto",
};

type TicketAction = "assign" | "resolve" | "close" | "reopen";

type TicketData = {
  id: number;
  ticket: Ticket;
  history: TicketEvent[];
};

function formatDate(date: string): string {
  return new Date(date).toLocaleString("pt-BR");
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Não foi possível completar a operação.";
}

export default function TicketDetails() {
  const { id } = useParams<{ id: string }>();

  const ticketId = Number(id);

  const invalidTicketId =
    !Number.isSafeInteger(ticketId) || ticketId <= 0;

  const { user, authRequest } = useAuth();

  const ticketService = useMemo(
    () => createTicketService(authRequest),
    [authRequest]
  );

  const [data, setData] = useState<TicketData | null>(null);

  const [loadError, setLoadError] = useState<{
    id: number;
    message: string;
  } | null>(null);

  const [actionError, setActionError] = useState("");
  const [processing, setProcessing] = useState<TicketAction | null>(
    null
  );

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (invalidTicketId) {
      return;
    }

    let cancelled = false;

    async function loadTicket() {
      try {
        const [ticket, history] = await Promise.all([
          ticketService.get(ticketId),
          ticketService.history(ticketId),
        ]);

        if (cancelled) return;

        setData({
          id: ticketId,
          ticket,
          history,
        });

        setLoadError(null);
      } catch (error) {
        if (cancelled) return;

        setData(null);

        setLoadError({
          id: ticketId,
          message: getErrorMessage(error),
        });
      }
    }

    void loadTicket();

    return () => {
      cancelled = true;
    };
  }, [
    ticketService,
    ticketId,
    invalidTicketId,
    reloadKey,
  ]);

  async function handleAction(action: TicketAction) {
    if (invalidTicketId || processing) {
      return;
    }

    setProcessing(action);
    setActionError("");

    try {
      switch (action) {
        case "assign":
          await ticketService.assign(ticketId);
          break;

        case "resolve":
          await ticketService.resolve(ticketId);
          break;

        case "close":
          await ticketService.close(ticketId);
          break;

        case "reopen":
          await ticketService.reopen(ticketId);
          break;
      }

      const [ticket, history] = await Promise.all([
        ticketService.get(ticketId),
        ticketService.history(ticketId),
      ]);

      setData({
        id: ticketId,
        ticket,
        history,
      });

      setLoadError(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setProcessing(null);
    }
  }

  if (invalidTicketId) {
    return (
      <Container>
        <BackLink to="/tickets">
          ← Voltar aos chamados
        </BackLink>

        <Feedback role="alert">
          Identificador do chamado inválido.
        </Feedback>
      </Container>
    );
  }

  const currentData =
    data?.id === ticketId ? data : null;

  const currentError =
    loadError?.id === ticketId
      ? loadError.message
      : null;

  if (!currentData && !currentError) {
    return (
      <Container>
        <Feedback role="status">
          Carregando chamado...
        </Feedback>
      </Container>
    );
  }

  if (currentError || !currentData) {
    return (
      <Container>
        <BackLink to="/tickets">
          ← Voltar aos chamados
        </BackLink>

        <Feedback role="alert">
          {currentError ?? "Chamado não encontrado."}
        </Feedback>

        <ActionButton
          type="button"
          onClick={() => {
            setLoadError(null);
            setReloadKey((value) => value + 1);
          }}
        >
          Tentar novamente
        </ActionButton>
      </Container>
    );
  }

  const { ticket, history } = currentData;

  const isAdmin = user?.role === "ADMIN";
  const isCreator = user?.id === ticket.created_by_id;

  const isAssignedAdmin =
    isAdmin && user?.id === ticket.assigned_to_id;

  const canAssign =
    isAdmin && ticket.status === "OPEN";

  const canResolve =
    isAssignedAdmin && ticket.status === "IN_PROGRESS";

  const canClose =
    (isCreator || isAdmin) &&
    ticket.status === "RESOLVED";

  const canReopen =
    isCreator && ticket.status === "RESOLVED";

  return (
    <Container>
      <BackLink to="/tickets">
        ← Voltar aos chamados
      </BackLink>

      <Header>
        <div>
          <SmallText>Chamado #{ticket.id}</SmallText>
          <h1>{ticket.title}</h1>
        </div>

        <StatusBadge $status={ticket.status}>
          {STATUS_LABELS[ticket.status]}
        </StatusBadge>
      </Header>

      <Card>
        <SectionTitle>
          Informações do chamado
        </SectionTitle>

        <DetailsGrid>
          <Info>
            <strong>Categoria</strong>
            <span>
              {CATEGORY_LABELS[ticket.category]}
            </span>
          </Info>

          <Info>
            <strong>Status</strong>
            <span>
              {STATUS_LABELS[ticket.status]}
            </span>
          </Info>

          <Info>
            <strong>Criado por</strong>
            <span>
              {ticket.created_by_name || "Nome indisponível"}
            </span>
          </Info>

          <Info>
            <strong>Responsável</strong>
            <span>
              {ticket.assigned_to_id
                ? ticket.assigned_to_name || "Nome indisponível"
                : "Não atribuído"}
            </span>
          </Info>

          <Info>
            <strong>Criado em</strong>
            <span>
              {formatDate(ticket.created_at)}
            </span>
          </Info>

          <Info>
            <strong>Atualizado em</strong>
            <span>
              {formatDate(ticket.updated_at)}
            </span>
          </Info>
        </DetailsGrid>

        <SectionTitle>Descrição</SectionTitle>

        <Description>
          {ticket.description}
        </Description>
      </Card>

      {(canAssign ||
        canResolve ||
        canClose ||
        canReopen) && (
        <Card>
          <SectionTitle>
            Ações disponíveis
          </SectionTitle>

          <Actions>
            {canAssign && (
              <ActionButton
                type="button"
                disabled={processing !== null}
                onClick={() =>
                  void handleAction("assign")
                }
              >
                {processing === "assign"
                  ? "Atribuindo..."
                  : "Assumir chamado"}
              </ActionButton>
            )}

            {canResolve && (
              <ActionButton
                type="button"
                disabled={processing !== null}
                onClick={() =>
                  void handleAction("resolve")
                }
              >
                {processing === "resolve"
                  ? "Resolvendo..."
                  : "Resolver chamado"}
              </ActionButton>
            )}

            {canClose && (
              <ActionButton
                type="button"
                disabled={processing !== null}
                onClick={() =>
                  void handleAction("close")
                }
              >
                {processing === "close"
                  ? "Fechando..."
                  : "Fechar chamado"}
              </ActionButton>
            )}

            {canReopen && (
              <ActionButton
                type="button"
                disabled={processing !== null}
                onClick={() =>
                  void handleAction("reopen")
                }
              >
                {processing === "reopen"
                  ? "Reabrindo..."
                  : "Reabrir chamado"}
              </ActionButton>
            )}
          </Actions>

          {actionError && (
            <Feedback role="alert">
              {actionError}
            </Feedback>
          )}
        </Card>
      )}

      <Card>
        <SectionTitle>
          Histórico do chamado
        </SectionTitle>

        {history.length === 0 ? (
          <SmallText>
            Nenhuma movimentação registrada.
          </SmallText>
        ) : (
          <HistoryList>
            {history.map((event) => (
              <HistoryItem key={event.id}>
                <strong>
                  {ACTION_LABELS[event.action] ??
                    event.action}
                </strong>

                <span>
                  {event.from_status
                    ? STATUS_LABELS[event.from_status]
                    : "Sem status anterior"}
                  {" → "}
                  {STATUS_LABELS[event.to_status]}
                </span>

                <SmallText>
                  {event.actor_name || "Nome indisponível"} •{" "}
                  {formatDate(event.created_at)}
                </SmallText>
              </HistoryItem>
            ))}
          </HistoryList>
        )}
      </Card>
    </Container>
  );
}

const Container = styled.div`
  max-width: var(--content-width);
  margin: 0 auto;
  padding: 0;
  color: var(--text);
`;

const BackLink = styled(Link)`
  display: inline-block;
  margin-bottom: 24px;
  color: var(--text);
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 28px;

  h1 {
    margin: 8px 0 0;
    font-size: clamp(24px, 4vw, 32px);
  }
`;

const Card = styled.section`
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
`;

const SectionTitle = styled.h2`
  margin: 0 0 20px;
  font-size: 20px;
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(180px, 1fr)
  );
  gap: 20px;
  margin-bottom: 28px;
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  strong {
    font-size: 13px;
    color: var(--muted);
  }
`;

const Description = styled.p`
  margin: 0;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const ActionButton = styled.button`
  min-height: 48px;
  padding: 12px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--input-bg);
  color: var(--text);
  box-shadow: var(--card-shadow);
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: translate(3px, 3px);
    box-shadow: none;
  }
`;

const HistoryList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const HistoryItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border);

  &:last-child {
    border-bottom: none;
  }
`;

const SmallText = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--muted);
`;

const Feedback = styled.p`
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--card-bg);
`;
