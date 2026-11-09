# Sistema de Chamados — Backend

API REST para gerenciamento de chamados de suporte técnico, desenvolvida com **Python, FastAPI, SQLAlchemy e PostgreSQL**.

O projeto utiliza uma arquitetura modular em camadas, com autenticação JWT, autorização por papéis, gerenciamento de chamados, histórico de eventos e controle de concorrência.

## Tecnologias

- **Backend:** Python, FastAPI e Pydantic v2
- **Persistência:** SQLAlchemy 2.0 assíncrono e PostgreSQL
- **Autenticação:** JWT, refresh tokens e controle de permissões
- **Infraestrutura:** Docker, Docker Compose e Alembic
- **Testes:** Pytest e HTTPX

## 1. Arquitetura

O backend segue uma arquitetura de **monólito modular**, organizado por funcionalidades (`auth`, `users` e `tickets`).

```text
HTTP Request
     |
     v
Router (Controller)
     |
     v
Service (Regras de negócio)
     |
     v
Repository (Persistência)
     |
     v
SQLAlchemy / PostgreSQL
```

Cada camada possui responsabilidades específicas:

| Camada | Responsabilidade |
|---|---|
| Router | Endpoints HTTP, validação e respostas |
| Service | Regras de negócio, permissões e transações |
| Repository | Consultas e operações no banco |
| Models | Mapeamento ORM das entidades |
| Schemas | Contratos de entrada e saída com Pydantic |
| Dependencies | Construção e injeção dos serviços |

Essa separação evita concentrar lógica de negócio e acesso ao banco diretamente nos controllers.

## 2. Injeção de dependências e desacoplamento

O FastAPI utiliza `Depends` e `Annotated` para construir e disponibilizar as dependências necessárias em cada requisição.

Exemplo:

```python
TicketServiceDep = Annotated[
    TicketService,
    Depends(get_ticket_service),
]

def get_ticket_service(session: SessionDep) -> TicketService:
    return TicketService(
        session=session,
        tickets=TicketRepository(session),
    )
```

O `TicketService` recebe o repository por meio do construtor:

```python
class TicketService:
    def __init__(
        self,
        session: AsyncSession,
        tickets: TicketRepositoryProtocol,
    ) -> None:
        self.session = session
        self.tickets = tickets
```

O uso de **`Protocol`** estabelece um contrato para as operações de persistência, permitindo substituir a implementação concreta sem modificar a lógica de negócio.

Isso reduz o acoplamento e facilita testes unitários com repositories simulados.

A sessão SQLAlchemy é gerenciada por uma dependência com `yield`, garantindo seu encerramento após a requisição.

## 3. Persistência e construção de consultas

O SQLAlchemy permite construir instruções SQL antes de executá-las.

```python
query = (
    select(Ticket)
    .where(Ticket.status == TicketStatus.OPEN)
    .order_by(Ticket.created_at.desc())
    .limit(10)
)
```

A consulta é executada posteriormente:

```python
result = await session.scalars(query)
tickets = list(result)
```

Essa separação facilita a composição de consultas com filtros, ordenação e paginação.

O repository também utiliza filtros dinâmicos e uma lista explícita de colunas permitidas para ordenação, impedindo que o cliente escolha identificadores SQL arbitrários.

### Transações

A criação de chamados utiliza o gerenciamento transacional do SQLAlchemy:

```python
ticket = Ticket(
    **data.model_dump(),
    created_by_id=user.id,
)

self.tickets.add(ticket)
await self.session.commit()
await self.session.refresh(ticket)
```

O `add()` registra o objeto na sessão, o `commit()` confirma a transação e o `refresh()` atualiza os atributos com os valores persistidos.

## 4. Concorrência e idempotência

O backend utiliza **atualizações condicionais atômicas** para proteger operações sensíveis ao estado atual dos chamados.

Exemplo:

```python
statement = update(Ticket).where(
    Ticket.id == ticket_id,
    Ticket.status == expected_status,
)

if require_unassigned:
    statement = statement.where(
        Ticket.assigned_to_id.is_(None)
    )
```

Após a execução:

```python
return result.rowcount == 1
```

Isso permite identificar se a atualização realmente aconteceu.

Por exemplo, duas requisições tentando assumir simultaneamente o mesmo chamado não devem conseguir sobrescrever uma à outra: a atualização só ocorre se o chamado continuar disponível no momento da execução.

### Idempotência

O controle de concorrência não significa que todas as operações sejam idempotentes.

- **POST:** requisições repetidas podem criar chamados duplicados.
- **DELETE:** repetir a exclusão mantém o recurso inexistente, embora a resposta HTTP possa mudar.
- **Transições de status:** uma segunda execução pode ser rejeitada porque o status esperado já foi alterado.

Uma possível evolução é implementar `Idempotency-Key` para deduplicar operações de criação.

## 5. Autenticação e autorização

A autenticação utiliza **JWT Bearer**, com validação de assinatura, expiração e claims obrigatórias (`sub`, `exp` e `iat`).

O backend também utiliza refresh tokens para renovação de sessões.

O usuário autenticado é identificado a partir do token e consultado no banco de dados.

As permissões são aplicadas no service, considerando o papel do usuário e sua relação com o chamado:

- `USER`: consulta e gerencia seus próprios chamados, respeitando o status.
- `ADMIN`: consulta todos os chamados, assume atendimentos, resolve chamados sob sua responsabilidade e pode excluí-los.

O criador de um chamado é definido pelo usuário autenticado:

```python
created_by_id=user.id
```

Isso impede que o cliente atribua a criação de um chamado arbitrariamente a outro usuário.

## 6. Ciclo de vida dos chamados

Os chamados seguem transições de estado controladas:

```text
OPEN
  |
  | ADMIN assume
  v
IN_PROGRESS
  |
  | ADMIN responsável resolve
  v
RESOLVED
  |
  | Criador ou ADMIN encerra
  v
CLOSED
```

O criador também pode reabrir um chamado `RESOLVED`, retornando-o para `IN_PROGRESS`.

As transições possuem endpoints específicos, como:

| Endpoint | Operação |
|---|---|
| `POST /tickets` | Criar chamado |
| `GET /tickets` | Listar e filtrar |
| `PATCH /tickets/{id}` | Editar chamado |
| `DELETE /tickets/{id}` | Excluir chamado |
| `POST /tickets/{id}/assign` | Assumir chamado |
| `POST /tickets/{id}/resolve` | Resolver chamado |
| `POST /tickets/{id}/close` | Encerrar chamado |
| `POST /tickets/{id}/reopen` | Reabrir chamado |
| `GET /tickets/{id}/history` | Consultar histórico |

O histórico é armazenado em eventos associados aos chamados, permitindo rastrear mudanças relevantes.

## 7. Integridade e manutenção

O backend utiliza mecanismos complementares para manter a consistência dos dados:

- **Pydantic:** validação de campos, tipos, tamanhos e enums.
- **PostgreSQL:** constraints relacionais, chaves estrangeiras e unicidade.
- **SQLAlchemy:** gerenciamento de sessões e transações.
- **Alembic:** versionamento das alterações do schema.
- **Repositories:** centralização das operações de persistência.
- **Protocols:** contratos que facilitam substituições e testes.
- **Atualizações condicionais:** proteção contra conflitos de concorrência.

A API também utiliza códigos HTTP apropriados, como `401` para falhas de autenticação, `403` para falta de permissão, `404` para recursos inexistentes e `409` para conflitos de estado.

## Considerações finais

O backend foi desenvolvido para demonstrar práticas de engenharia de software além de um CRUD convencional.

As principais decisões incluem **arquitetura em camadas, injeção de dependências, desacoplamento por contratos, consultas dinâmicas, controle transacional, autenticação segura e proteção contra operações concorrentes conflitantes**.

A estrutura permite evoluir a aplicação e integrar um frontend React sem comprometer a organização das regras de negócio.