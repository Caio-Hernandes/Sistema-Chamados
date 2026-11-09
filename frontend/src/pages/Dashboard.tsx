
import { useEffect, useState } from "react";
import { Link } from "react-router";
import styled from "styled-components";

import Icon from "../components/Icon";
import { useAuth } from "../contexts/AuthContext";
import { createTicketService } from "../services/ticketService";
import type { TicketStatus } from "../types/ticket";

const STATUSES: { status: TicketStatus; label: string }[] = [
  { status: "OPEN", label: "Abertos" },
  { status: "IN_PROGRESS", label: "Em andamento" },
  { status: "RESOLVED", label: "Resolvidos" },
  { status: "CLOSED", label: "Fechados" },
];

export default function Dashboard() {
  const { user, authRequest } = useAuth();
  const [counts, setCounts] = useState<number[] | null>(null);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const service = createTicketService(authRequest);
    async function load() {
      setCounts(null);
      setError(false);
      try {
        const results = await Promise.all(STATUSES.map(({ status }) =>
          service.list({ status, limit: 1 })
        ));
        if (!cancelled) setCounts(results.map(result => result.total));
      } catch {
        if (!cancelled) setError(true);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [authRequest, reloadKey]);

  return (
    <Container>
      <Heading>
        <h1>Olá, {user?.role === "ADMIN" ? "Administrador" : user?.name?.split(" ")[0]}!</h1>
        <p>Bem-vindo ao seu painel de chamados.</p>
      </Heading>

      <SectionTitle>Acesso rápido</SectionTitle>

      <Cards>
        <ActionCard to="/tickets">
          <CardIcon><Icon name="tickets" /></CardIcon>
          <h2>Meus chamados</h2>
          <p>
            Consulte seus chamados e acompanhe o andamento
            de cada solicitação.
          </p>
          <CardAction>Ver chamados →</CardAction>
        </ActionCard>

        <ActionCard to="/tickets/new">
          <CardIcon><Icon name="plus" /></CardIcon>
          <h2>Abrir chamado</h2>
          <p>
            Registre uma nova solicitação para a equipe
            de suporte.
          </p>
          <CardAction>Criar chamado →</CardAction>
        </ActionCard>
      </Cards>

      <SectionTitle>Resumo dos chamados</SectionTitle>

      <StatsGrid aria-busy={!counts && !error}>
        {STATUSES.map(({ status, label }, index) => <StatCard key={status}>
          <span>{label}</span>
          <strong>{counts ? counts[index].toLocaleString("pt-BR") : "—"}</strong>
        </StatCard>)}
      </StatsGrid>

      {error ? <Note role="alert">
        Não foi possível carregar o resumo. <RetryButton type="button"
          onClick={() => setReloadKey(value => value + 1)}>Tentar novamente</RetryButton>
      </Note> : !counts ? <Note role="status">Carregando resumo...</Note> :
        <Note>{user?.role === "ADMIN" ? "Resumo de todos os chamados." : "Resumo dos seus chamados."}</Note>}
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  max-width: var(--content-width);
  margin: 0 auto;
`;

const Heading = styled.div`
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

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 650;
  margin: 32px 0 20px;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const ActionCard = styled(Link)`
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-card);

  background: var(--card-bg);
  color: var(--text);
  box-shadow: var(--card-shadow);

  text-decoration: none;

  display: flex;
  flex-direction: column;
  align-items: flex-start;

  &:hover {
    border-color: var(--focus);
    background: var(--hover-bg);
  }

  h2 {
    margin: 14px 0 8px;
    font-size: 20px;
  }

  p {
    margin: 0 0 24px;
    color: var(--muted);
    line-height: 1.5;
  }
`;

const CardIcon = styled.div`
  width: 40px;
  height: 40px;

  display: grid;
  place-items: center;

  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--accent-bg);
  color: var(--focus);

  font-size: 26px;
  font-weight: 750;
`;

const CardAction = styled.span`
  margin-top: auto;
  font-weight: 650;
  color: var(--focus);
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  padding: 24px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--card-shadow);

  display: flex;
  flex-direction: column;
  gap: 12px;

  span {
    font-size: 14px;
    font-weight: 700;
  }

  strong {
    font-size: clamp(26px, 3vw, 32px);
    font-weight: 750;
  }
`;

const Note = styled.p`
  margin-top: 20px;
  font-size: 13px;
  color: var(--muted);
`;

const RetryButton = styled.button`
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--focus);
  font-weight: 650;
  text-decoration: underline;
  cursor: pointer;
`;
