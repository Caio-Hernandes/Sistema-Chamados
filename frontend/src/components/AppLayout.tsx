
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import styled from "styled-components";

import Icon from "./Icon";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 768);
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
    <Container $collapsed={collapsed}>
      <Sidebar $collapsed={collapsed} data-collapsed={collapsed}>
        <Brand to="/dashboard" aria-label="Voltar para home" title="Home">
          <BrandMark aria-hidden="true">C.</BrandMark>
          {!collapsed && <BrandText><strong>CHAMADOS.</strong><span>Central de atendimento</span></BrandText>}
        </Brand>

        <Navigation id="main-navigation" aria-label="Menu principal">
          {!collapsed && <GroupTitle>Atendimento</GroupTitle>}
          <MenuLink to="/dashboard" aria-label="Dashboard" title="Dashboard">
            <Icon name="home" /><Label $collapsed={collapsed}>Dashboard</Label>
          </MenuLink>

          <MenuLink to="/tickets" end aria-label="Meus chamados" title="Meus chamados">
            <Icon name="tickets" /><Label $collapsed={collapsed}>Meus chamados</Label>
          </MenuLink>

          <MenuLink to="/tickets/new" aria-label="+ Novo chamado" title="+ Novo chamado">
            <Icon name="plus" /><Label $collapsed={collapsed}>+ Novo chamado</Label>
          </MenuLink>
        </Navigation>

        <SidebarFooter>
          <ThemeSelector $collapsed={collapsed} role="group" aria-label="Tema">
            {collapsed ? <ThemeButton type="button" onClick={toggleTheme}
              aria-label={`Ativar modo ${theme === "light" ? "escuro" : "claro"}`}
              title={theme === "light" ? "Modo escuro" : "Modo claro"}>
              <Icon name={theme === "light" ? "moon" : "sun"} />
            </ThemeButton> : <>
              <ThemeButton type="button" aria-label="Ativar modo claro" aria-pressed={theme === "light"}
                onClick={() => { if (theme !== "light") toggleTheme(); }}>
                <Icon name="sun" />Claro
              </ThemeButton>
              <ThemeButton type="button" aria-label="Ativar modo escuro" aria-pressed={theme === "dark"}
                onClick={() => { if (theme !== "dark") toggleTheme(); }}>
                <Icon name="moon" />Escuro
              </ThemeButton>
            </>}
          </ThemeSelector>

          <Account $collapsed={collapsed}>
            {!collapsed && <>
              <UserAvatar aria-hidden="true">{user?.name?.charAt(0).toUpperCase() ?? "U"}</UserAvatar>
              <UserDetails>
                <strong title={user?.name}>{user?.name}</strong>
                <span>{user?.role === "ADMIN" ? "Administrador" : "Usuário"}</span>
              </UserDetails>
            </>}
            <LogoutButton type="button" onClick={handleLogout} disabled={loggingOut}
              aria-label="Sair da conta" title={loggingOut ? "Saindo..." : "Sair da conta"}>
              <Icon name="logout" />
            </LogoutButton>
          </Account>

          <CollapseButton type="button" onClick={() => setCollapsed(value => !value)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed} aria-controls="main-navigation">
            <Icon name="sidebar" />
            <Label $collapsed={collapsed}>Recolher menu</Label>
          </CollapseButton>

          {error && <ErrorMessage role="alert">{error}</ErrorMessage>}
        </SidebarFooter>
      </Sidebar>

      <Main>
        <Content>
          <Outlet />
        </Content>
      </Main>
    </Container>
  );
}

const Container = styled.div<{ $collapsed: boolean }>`
  --sidebar-width: ${({ $collapsed }) => $collapsed ? "80px" : "264px"};
  min-height: 100dvh;
  padding-left: var(--sidebar-width);
  background: var(--page-bg);
  color: var(--text);
  transition: padding-left 180ms ease;
  @media (max-width: 768px) { --sidebar-width: 72px; }
`;
const Sidebar = styled.aside<{ $collapsed: boolean }>`
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 20;
  width: var(--sidebar-width);
  height: 100dvh;
  padding: 20px 12px 12px;
  background: var(--card-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 24px;
  transition: width 180ms ease;
  &[data-collapsed="true"] nav a, &[data-collapsed="true"] > a,
  &[data-collapsed="true"] footer > button { justify-content: center; padding-inline: 0; }
  @media (max-width: 768px) {
    width: ${({ $collapsed }) => $collapsed ? "72px" : "min(264px, 85vw)"};
    padding-inline: 8px;
    box-shadow: ${({ $collapsed }) => $collapsed ? "none" : "12px 0 32px #0003"};
  }
`;
const Label = styled.span<{ $collapsed: boolean }>`
  display: ${({ $collapsed }) => $collapsed ? "none" : "inline"};
  white-space: nowrap;
`;
const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 0 8px;
  text-decoration: none;
  color: var(--text);
  border-radius: var(--radius-card);
  &:hover { color: var(--focus); }
`;
const BrandMark = styled.span`
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 12px;
  background: var(--accent-bg);
  color: var(--focus);
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -1px;
`;
const BrandText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  strong { font-size: 14px; letter-spacing: -0.4px; }
  span { font-size: 12px; color: var(--muted); white-space: nowrap; }
`;
const GroupTitle = styled.div`
  padding: 0 12px 4px;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
`;
const Navigation = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
  margin: -4px;
`;
const MenuLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  flex-shrink: 0;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  font-size: 14px;
  transition: background 150ms, color 150ms;
  &:hover { background: var(--hover-bg); color: var(--text); }
  &.active { background: var(--accent-bg); color: var(--focus); font-weight: 650; }
`;
const SidebarFooter = styled.footer`
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;
const ThemeSelector = styled.div<{ $collapsed: boolean }>`
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: var(--input-bg);
  flex-direction: ${({ $collapsed }) => $collapsed ? "column" : "row"};
`;
const ThemeButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  min-height: 32px;
  padding: 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  &[aria-pressed="true"] { background: var(--accent-bg); color: var(--focus); font-weight: 650; }
  &:hover { color: var(--text); background: var(--hover-bg); }
  svg { width: 16px; height: 16px; }
`;
const Account = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  padding: ${({ $collapsed }) => $collapsed ? "4px" : "10px"};
  border-radius: 12px;
  background: var(--input-bg);
`;
const UserAvatar = styled.div`
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent-bg);
  color: var(--focus);
  font-size: 13px;
  font-weight: 650;
`;
const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  strong { font-size: 13px; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  span { font-size: 11px; color: var(--muted); }
`;
const LogoutButton = styled.button`
  display: grid;
  place-items: center;
  width: 32px;
  height: 36px;
  margin-inline: auto;
  flex-shrink: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  &:hover:not(:disabled) { background: var(--hover-bg); color: var(--text); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;
const CollapseButton = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
  cursor: pointer;
  &:hover { background: var(--hover-bg); color: var(--text); }
  svg { width: 20px; height: 20px; }
`;
const ErrorMessage = styled.p`
  position: absolute;
  bottom: calc(100% + 8px);
  background: var(--card-bg);
  padding: 12px;
  width: 230px;
  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  margin: 0;
  font-size: 13px;
  color: var(--text);
`;
const Main = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
`;
const Content = styled.main`
  flex: 1;
  width: 100%;
  padding: clamp(24px, 4vw, 48px);
  > * { width: 100%; max-width: var(--content-width); margin-inline: auto; }
  @media (max-width: 480px) { padding: 24px 16px; }
`;
