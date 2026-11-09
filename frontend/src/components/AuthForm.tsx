
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import styled from "styled-components";

import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { userService } from "../services/userService";
import { ApiError } from "../services/api";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import styled from "styled-components";
import { useTheme } from "../contexts/ThemeContext";

type AuthFormProps = {
  mode: "login" | "register";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const isRegister = mode === "register";

  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setMessage("");

    if (isRegister && !name.trim()) {
      setMessage("Informe seu nome.");
      return;
    }

    if (isRegister && password.length < 8) {
      setMessage("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (isRegister && password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (isRegister) {
        await userService.register({
          name: name.trim(),
          email: normalizedEmail,
          password,
        });

        navigate("/login", { replace: true });
      } else {
        await login({
          email: normalizedEmail,
          password,
        });

        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        switch (error.status) {
          case 401:
            setMessage("Email ou senha incorretos.");
            break;

          case 409:
            setMessage("Este email já está cadastrado.");
            break;

          case 422:
            setMessage(error.message);
            break;

          default:
            setMessage(error.message);
        }
      } else {
        setMessage(
          "Não foi possível conectar ao servidor. Tente novamente."
        );
      }
    } finally {
      setLoading(false);
    }
    // Próxima etapa: integrar com os endpoints do FastAPI.
    setMessage("Formulário validado. Integração com a API pendente.");
  }

  return (
    <Page>
      <ThemeButton
        type="button"
        onClick={toggleTheme}
        aria-label={`Ativar modo ${theme === "light" ? "escuro" : "claro"}`}
      >
        {theme === "light" ? "☾" : "☀"}
      </ThemeButton>

      <FormCard onSubmit={handleSubmit}>
        <Title>
          {isRegister ? "Criar conta." : "Bem-vindo!"}
          <span>
            {isRegister
              ? "Cadastre-se para começar"
              : "Entre na sua conta para continuar"}
          </span>
        </Title>

        {isRegister && (
          <Field>
            <label htmlFor="name">Nome</label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Seu nome completo"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={1}
              maxLength={120}
              required
              disabled={loading}
            />
          </Field>
        )}

        <Field>
          <label htmlFor="email">Email</label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={loading}
          />
        </Field>

        <Field>
          <label htmlFor="password">Senha</label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Digite sua senha"
            autoComplete={
              isRegister ? "new-password" : "current-password"
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={isRegister ? 8 : undefined}
            maxLength={isRegister ? 128 : undefined}
            required
            disabled={loading}
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>

        {isRegister && (
          <Field>
            <label htmlFor="confirmPassword">Confirmar senha</label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repita sua senha"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
              disabled={loading}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </Field>
        )}

        {message && (
          <Message role="alert">
            {message}
          </Message>
        )}

        <SubmitButton type="submit" disabled={loading}>
          {loading
            ? "Aguarde..."
            : isRegister
              ? "Cadastrar →"
              : "Entrar →"}
        {message && <Message role="status">{message}</Message>}

        <SubmitButton type="submit">
          {isRegister ? "Cadastrar →" : "Entrar →"}
        </SubmitButton>

        <Footer>
          {isRegister ? (
            <>
              Já possui uma conta?{" "}
              <Link to="/login">Entrar</Link>
            </>
          ) : (
            <>
              Ainda não possui conta?{" "}
              <Link to="/register">Cadastre-se</Link>
              Já possui uma conta? <Link to="/login">Entrar</Link>
            </>
          ) : (
            <>
              Ainda não possui conta? <Link to="/register">Cadastre-se</Link>
            </>
          )}
        </Footer>
      </FormCard>
    </Page>
  );
}


const Page = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  position: relative;
`;

const ThemeButton = styled.button`
  position: absolute;
  top: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border: 2px solid var(--border);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text);
  box-shadow: 4px 4px 0 var(--border);
  font-size: 24px;
  cursor: pointer;

  &:active {
    transform: translate(4px, 4px);
    box-shadow: none;
  }
`;

const FormCard = styled.form`
  width: 100%;
  max-width: 400px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 22px;

  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 8px;
  box-shadow: 6px 6px 0 var(--border);

  @media (max-width: 480px) {
    padding: 24px 20px;
    gap: 18px;
  }
`;

const Title = styled.h1`
  margin: 0 0 12px;
  font-size: clamp(24px, 5vw, 30px);
  font-weight: 900;
  color: var(--text);

  span {
    display: block;
    margin-top: 8px;
    font-size: 15px;
    font-weight: 500;
    color: var(--muted);
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 14px;
    font-weight: 700;
  }
`;

const Input = styled.input`
  width: 100%;
  min-height: 48px;
  padding: 12px;

  border: 2px solid var(--border);
  border-radius: 5px;
  background: var(--input-bg);
  box-shadow: 4px 4px 0 var(--border);

  color: var(--text);
  font-size: 15px;
  outline: none;

  &::placeholder {
    color: var(--muted);
  }

  &:focus {
    border-color: var(--focus);
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  min-height: 46px;
  margin-top: 12px;

  border: 2px solid var(--border);
  border-radius: 5px;
  background: var(--input-bg);
  box-shadow: 4px 4px 0 var(--border);

  color: var(--text);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    filter: brightness(0.96);
  }

  &:active {
    transform: translate(4px, 4px);
    box-shadow: none;
  &:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  filter: none;
  transform: none;
}
  }
`;

const Footer = styled.p`
  margin: 0;
  text-align: center;
  font-size: 14px;
  color: var(--muted);

  a {
    color: var(--text);
    font-weight: 700;
    text-decoration: underline;
  }
`;

const Message = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--text);
`;