
import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import styled from "styled-components";

import { useAuth } from "../contexts/AuthContext";
import { createTicketService } from "../services/ticketService";
import { ApiError } from "../services/api";

import type { TicketCategory } from "../types/ticket";

const categories: { value: TicketCategory; label: string }[] = [
  { value: "HARDWARE", label: "Hardware" },
  { value: "SOFTWARE", label: "Software" },
  { value: "NETWORK", label: "Rede" },
  { value: "ACCESS", label: "Acesso" },
  { value: "OTHER", label: "Outros" },
];

export default function CreateTicket() {
  const navigate = useNavigate();
  const { authRequest } = useAuth();

  const ticketService = useMemo(
    () => createTicketService(authRequest),
    [authRequest]
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<TicketCategory>("SOFTWARE");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle || !cleanDescription) {
      setError("Preencha todos os campos.");
      return;
    }

    setLoading(true);

    try {
      const ticket = await ticketService.create({
        title: cleanTitle,
        description: cleanDescription,
        category,
      });

      navigate(`/tickets/${ticket.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Não foi possível criar o chamado.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container>
      <Header>
        <div>
          <h1>Abrir chamado</h1>
          <p>Descreva seu problema para solicitar atendimento.</p>
        </div>

        <Link to="/tickets">← Voltar</Link>
      </Header>

      <Form onSubmit={handleSubmit}>
        <Field>
          <label htmlFor="title">Título</label>
          <Input
            id="title"
            type="text"
            placeholder="Ex.: Computador não liga"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            required
            disabled={loading}
          />
        </Field>

        <Field>
          <label htmlFor="category">Categoria</label>
          <Select
            id="category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as TicketCategory)
            }
            disabled={loading}
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <label htmlFor="description">Descrição</label>
          <Textarea
            id="description"
            placeholder="Explique o problema com detalhes..."
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            maxLength={5000}
            rows={7}
            required
            disabled={loading}
          />
          <small>{description.length}/5000 caracteres</small>
        </Field>

        {error && <ErrorMessage role="alert">{error}</ErrorMessage>}

        <SubmitButton type="submit" disabled={loading}>
          {loading ? "Criando..." : "Criar chamado →"}
        </SubmitButton>
      </Form>
    </Container>
  );
}

const Container = styled.section`
  max-width: var(--content-width);
  margin: 0 auto;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
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

  a {
    color: var(--text);
    font-weight: 700;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px;

  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--card-shadow);

  @media (max-width: 600px) {
    padding: 20px;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  label {
    font-size: 14px;
    font-weight: 650;
  }

  small {
    text-align: right;
    color: var(--muted);
  }
`;

const Input = styled.input`
  width: 100%;
  min-height: 48px;
  padding: 12px;

  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--input-bg);
  color: var(--text);
  box-shadow: none;

  font: inherit;

  &:focus {
    outline: 2px solid var(--focus);
  }
`;

const Select = styled.select`
  width: 100%;
  min-height: 48px;
  padding: 12px;

  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--input-bg);
  color: var(--text);
  box-shadow: none;

  font: inherit;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px;
  resize: vertical;

  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--input-bg);
  color: var(--text);
  box-shadow: none;

  font: inherit;

  &:focus {
    outline: 2px solid var(--focus);
  }
`;

const SubmitButton = styled.button`
  align-self: flex-start;
  min-height: 48px;
  padding: 12px 20px;

  border: 1px solid var(--border);
  border-radius: var(--radius-control);
  background: var(--accent-bg);
  color: var(--focus);
  box-shadow: var(--card-shadow);

  font-size: 14px;
  font-weight: 650;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
`;
