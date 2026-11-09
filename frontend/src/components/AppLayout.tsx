
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import styled from "styled-components";

import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setError("");

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setError("Não foi possível encerrar a sessão. Tente novamente.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Container>
      <Sidebar>
        <Brand>CHAMADOS<span>.</span></Brand>

        <Navigation aria-label="Menu principal">
          <MenuLink to="/dashboard">
            Dashboard
          </MenuLink>

          <MenuLink to="/tickets" end>
            Meus chamados
          </MenuLink>

          <MenuLink to="/tickets/new">
            + Novo chamado
          </MenuLink>
        </Navigation>

        <SidebarFooter>
          <ThemeButton type="button" onClick={toggleTheme}>
            {theme === "light" ? "☾ Modo escuro" : "☀ Modo claro"}
          </ThemeButton>

          <LogoutButton
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Saindo..." : "Sair da conta"}
          </LogoutButton>

          {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
        </SidebarFooter>
      </Sidebar>

      <Main>
        <Header>
          <HeaderTitle>Sistema de Chamados</HeaderTitle>

          <UserInfo>
            <UserAvatar aria-hidden="true">
              {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </UserAvatar>

            <UserDetails>
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </UserDetails>
          </UserInfo>
        </Header>

        <Content>
          <Outlet />
        </Content>
      </Main>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background: var(--page-bg);
  color: var(--text);
  @media (max-width: 768px) {
  flex-direction: column;
}
`;

const Sidebar = styled.aside`
  width: 260px;
  flex-shrink: 0;
  padding: 28px 20px;

  background: var(--card-bg);
  border-right: 2px solid var(--border);

  display: flex;
  flex-direction: column;
  gap: 40px;

  @media (max-width: 768px) {
    width: 100%;
    border-right: none;
    border-bottom: 2px solid var(--border);
    gap: 20px;
  }
`;

const Brand = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -1px;

  span {
    color: var(--focus);
  }
`;

const Navigation = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const MenuLink = styled(NavLink)`
  padding: 12px 14px;
  border: 2px solid var(--border);
  border-radius: 5px;

  color: var(--text);
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;

  transition: transform 0.1s, box-shadow 0.1s;

  &:hover {
    box-shadow: 3px 3px 0 var(--border);
    transform: translate(-2px, -2px);
  }

  &.active {
    background: var(--input-bg);
    box-shadow: 4px 4px 0 var(--border);
  }
`;

const SidebarFooter = styled.div`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const ActionButton = styled.button`
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: 5px;

  background: var(--input-bg);
  color: var(--text);

  font-weight: 700;
  cursor: pointer;
  box-shadow: 3px 3px 0 var(--border);

  &:active {
    transform: translate(3px, 3px);
    box-shadow: none;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ThemeButton = styled(ActionButton)``;

const LogoutButton = styled(ActionButton)``;

const ErrorMessage = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--text);
`;

const Main = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  min-height: 88px;
  padding: 20px 32px;

  border-bottom: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  @media (max-width: 768px) {
    padding: 20px;
    flex-wrap: wrap;
  }
`;

const HeaderTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const UserAvatar = styled.div`
  width: 42px;
  height: 42px;

  display: grid;
  place-items: center;

  border: 2px solid var(--border);
  border-radius: 6px;
  background: var(--card-bg);
  box-shadow: 3px 3px 0 var(--border);

  font-size: 18px;
  font-weight: 900;
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    font-size: 14px;
  }

  span {
    font-size: 12px;
    color: var(--muted);
    overflow-wrap: anywhere;
  }
`;

const Content = styled.main`
  flex: 1;
  padding: 32px;

  @media (max-width: 768px) {
    padding: 20px;
  }
`
