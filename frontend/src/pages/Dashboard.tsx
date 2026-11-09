
import { Link } from "react-router";
import styled from "styled-components";

import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <Container>
      <Heading>
        <h1>Olá, {user?.name?.split(" ")[0]}!</h1>
        <p>Bem-vindo ao seu painel de chamados.</p>
      </Heading>

      <SectionTitle>Acesso rápido</SectionTitle>

      <Cards>
        <ActionCard to="/tickets">
          <CardIcon>☷</CardIcon>
          <h2>Meus chamados</h2>
          <p>
            Consulte seus chamados e acompanhe o andamento
            de cada solicitação.
          </p>
          <CardAction>Ver chamados →</CardAction>
        </ActionCard>

        <ActionCard to="/tickets/new">
          <CardIcon>+</CardIcon>
          <h2>Abrir chamado</h2>
          <p>
            Registre uma nova solicitação para a equipe
            de suporte.
          </p>
          <CardAction>Criar chamado →</CardAction>
        </ActionCard>
      </Cards>

      <SectionTitle>Resumo dos chamados</SectionTitle>

      <StatsGrid>
        <StatCard>
          <span>Abertos</span>
          <strong>—</strong>
        </StatCard>

        <StatCard>
          <span>Em andamento</span>
          <strong>—</strong>
        </StatCard>

        <StatCard>
          <span>Resolvidos</span>
          <strong>—</strong>
        </StatCard>

        <StatCard>
          <span>Fechados</span>
          <strong>—</strong>
        </StatCard>
      </StatsGrid>

      <Note>
        As estatísticas serão exibidas quando integrarmos
        os endpoints de chamados.
      </Note>
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
`;

const Heading = styled.div`
  margin-bottom: 36px;

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

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 800;
  margin: 32px 0 20px;
`;

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const ActionCard = styled(Link)`
  padding: 26px;
  border: 2px solid var(--border);
  border-radius: 8px;

  background: var(--card-bg);
  color: var(--text);
  box-shadow: 5px 5px 0 var(--border);

  text-decoration: none;

  display: flex;
  flex-direction: column;
  align-items: flex-start;

  &:hover {
    transform: translate(-2px, -2px);
    box-shadow: 7px 7px 0 var(--border);
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
  width: 46px;
  height: 46px;

  display: grid;
  place-items: center;

  border: 2px solid var(--border);
  border-radius: 5px;
  background: var(--input-bg);

  font-size: 26px;
  font-weight: 900;
`;

const CardAction = styled.span`
  margin-top: auto;
  font-weight: 800;
  text-decoration: underline;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  padding: 22px;
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 6px;
  box-shadow: 4px 4px 0 var(--border);

  display: flex;
  flex-direction: column;
  gap: 12px;

  span {
    font-size: 14px;
    font-weight: 700;
  }

  strong {
    font-size: 32px;
    font-weight: 900;
  }
`;

const Note = styled.p`
  margin-top: 20px;
  font-size: 13px;
  color: var(--muted);
`;
export default function Dashboard() {
  return <h1>Dashboard de Chamados</h1>;
}
