# Sistema de Chamados

Aplicação web para gerenciamento de chamados de suporte técnico, com **frontend em React e TypeScript**, **API REST em FastAPI** e **PostgreSQL**.

Usuários podem abrir e acompanhar seus chamados; administradores podem assumir atendimentos e registrar sua resolução. A aplicação mantém o histórico das transições de status e aplica permissões conforme o perfil e a relação do usuário com cada chamado.

![Dashboard no tema escuro, com atalhos e resumo dos chamados por status](images/dashboad.png)

## Funcionalidades

- Cadastro, login, logout e restauração de sessão.
- Dashboard com totais de chamados por status.
- Listagem com filtro por status, ordenação e paginação.
- Criação de chamados e consulta de detalhes e histórico.
- Ações de assumir, resolver, encerrar e reabrir, conforme as permissões.
- Exclusão de chamados conforme o perfil e o estado atual.
- Temas claro e escuro, com preferência salva no navegador.

## Tecnologias

| Área | Tecnologias |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router e styled-components |
| Comunicação com a API | Fetch API, JWT Bearer e cookies de refresh |
| Backend | Python 3.12+, FastAPI e Pydantic v2 |
| Persistência | SQLAlchemy assíncrono, asyncpg e PostgreSQL |
| Migrações | Alembic |
| Infraestrutura | Docker Compose e Nginx |
| Qualidade do frontend | ESLint, Vitest e Testing Library |
| Qualidade do backend | Ruff, Pytest e HTTPX |
| Integração contínua | GitHub Actions |

## Executar com Docker

Pré-requisito: Docker com Docker Compose disponível.

1. Na raiz do repositório, copie `.env.example` para `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

   No Linux ou macOS, use `cp .env.example .env`.

2. Edite o `.env`: defina `POSTGRES_PASSWORD`, uma `JWT_SECRET_KEY` própria com pelo menos 32 caracteres e as credenciais `FIRST_ADMIN_EMAIL` e `FIRST_ADMIN_PASSWORD`. `FIRST_ADMIN_NAME` define o nome do administrador inicial.

3. Construa e inicie os serviços:

   ```sh
   docker compose up --build -d
   ```

| Serviço | Endereço |
| --- | --- |
| Aplicação web | http://localhost:8080 |
| API REST | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |
| PostgreSQL no host | `localhost:5433` |

A porta externa da API pode ser alterada por `API_PORT`. O Compose inicia o banco, executa as migrações e aguarda a API ficar saudável antes de iniciar o frontend. Os dados do PostgreSQL ficam no volume `pgdata`.

O administrador inicial é criado na inicialização da API quando as credenciais estão configuradas e o e-mail ainda não existe. O cadastro público cria usuários com perfil `USER`.

Para acompanhar os logs ou parar os serviços:

```sh
docker compose logs -f
docker compose down
```

## Desenvolvimento local

Use Python 3.12+, `uv`, Node.js 24 com npm e PostgreSQL. Os comandos abaixo partem da raiz do repositório, em terminais separados.

### Backend

Prepare o `.env` conforme a seção anterior. Para usar apenas o banco do Compose:

```sh
docker compose up -d db
```

Nesse caso, ajuste as URLs no `.env` para a porta **5433** exposta no host:

```dotenv
DATABASE_URL=postgresql+asyncpg://chamados:SUA_SENHA@localhost:5433/chamados
TEST_DATABASE_URL=postgresql+asyncpg://chamados:SUA_SENHA@localhost:5433/chamados_test
```

Use o usuário, a senha e o banco definidos no seu `.env`. Para um PostgreSQL instalado localmente, informe a porta dessa instalação. O mapeamento `5433:5432` está definido diretamente no `compose.yaml`; alterar `POSTGRES_PORT` no `.env` não muda esse mapeamento.

Instale as dependências, aplique as migrações e inicie a API:

```sh
cd backend
uv sync --locked --group dev
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

As configurações são carregadas de `../.env` e `.env`, relativamente ao diretório de execução. A API fica disponível em http://localhost:8000.

### Frontend

Crie ou ajuste `frontend/.env` com a URL da API, sem barra ao final:

```dotenv
VITE_API_URL=http://localhost:8000
```

Em outro terminal:

```sh
cd frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

Acesse http://localhost:5173. O backend permite CORS com credenciais para `http://localhost:5173` e `http://127.0.0.1:5173`. Use o mesmo hostname no frontend e na URL da API para o fluxo de cookies de sessão.

Para desenvolvimento via HTTP, mantenha `REFRESH_COOKIE_SECURE=false`. Em uma implantação com HTTPS, configure essa opção como `true`.

## Frontend

O frontend é uma SPA. O React Router organiza a navegação e o componente `ProtectedRoute` protege as telas que exigem autenticação.

| Rota | Tela |
| --- | --- |
| `/login` | Login |
| `/register` | Cadastro de usuário |
| `/dashboard` | Resumo dos chamados por status |
| `/tickets` | Listagem, filtros, ordenação e paginação |
| `/tickets/new` | Abertura de chamado |
| `/tickets/:id` | Detalhes, histórico e ações disponíveis |

### Listagem de chamados

A tela de chamados permite filtrar por status, escolher a ordenação e acessar os detalhes de cada solicitação.

![Listagem de chamados no tema escuro, com filtros e acesso aos detalhes](images/chamados.png)

### Abertura de chamado

O formulário de abertura reúne título, categoria e descrição do problema para solicitar atendimento.

![Formulário de abertura de chamado no tema claro](images/Abrir_chamado.png)

### Integração com a API

O `AuthContext` centraliza a sessão e mantém o access token em memória. Na abertura da aplicação, tenta restaurar a sessão por refresh; ao receber `401` em uma requisição autenticada, tenta renovar o token e repetir a requisição. O refresh token é enviado pelo navegador em um cookie `HttpOnly`.

Os serviços encapsulam as chamadas HTTP de autenticação, usuários e chamados. O cliente compartilhado usa `credentials: "include"` e converte respostas de erro da API em mensagens para a interface. O `ThemeContext` gerencia o tema e persiste a preferência em `localStorage`.

No Docker, o Vite gera os arquivos estáticos e o Nginx os serve. A URL da API é `/api`: o Nginx encaminha essas chamadas para `api:8000`, ajusta o caminho do cookie de refresh e permite acesso direto às rotas da SPA. `VITE_API_URL` é incorporada durante o build; alterações exigem gerar o frontend novamente.

## Backend

A API segue uma arquitetura de monólito modular, organizada por funcionalidades: `auth`, `users`, `tickets` e `health`.

```text
Frontend React → Router FastAPI → Service → Repository → PostgreSQL
```

| Camada | Responsabilidade |
| --- | --- |
| Router | Endpoints HTTP, validação e respostas |
| Service | Regras de negócio, permissões e transações |
| Repository | Consultas e operações de persistência |
| Models | Mapeamento ORM das entidades |
| Schemas | Contratos de entrada e saída com Pydantic |
| Dependencies | Construção e injeção de serviços com `Depends` |

Os serviços recebem contratos de persistência definidos com `Protocol`, facilitando a substituição de repositories e os testes unitários. As consultas utilizam filtros, paginação e uma lista explícita de campos permitidos para ordenação. O Alembic versiona o schema do banco.

### Autenticação e permissões

A autenticação utiliza JWT Bearer, com validação de assinatura, expiração e claims obrigatórias. As senhas são protegidas com Argon2. O refresh token usa cookie `HttpOnly`, `SameSite=Strict` e caminho `/auth`; as operações de refresh e logout exigem o cabeçalho `X-CSRF-Protection: 1`.

- **USER:** consulta seus próprios chamados, edita e exclui os que ainda estão abertos, encerra os resolvidos e pode reabri-los.
- **ADMIN:** consulta todos os chamados, assume atendimentos, resolve aqueles sob sua responsabilidade, encerra chamados resolvidos e pode excluir chamados.

A edição é restrita ao criador enquanto o chamado está aberto. A reabertura também é restrita ao criador. As permissões são verificadas no backend, além dos controles exibidos na interface.

### Ciclo de vida dos chamados

```text
OPEN → IN_PROGRESS → RESOLVED → CLOSED
          ↑              |
          └── reabrir ────┘
```

Um administrador assume um chamado aberto e o responsável registra a resolução. O criador ou um administrador pode encerrar um chamado resolvido; o criador pode reabri-lo para retomar o atendimento.

As transições geram eventos de histórico e usam atualizações condicionais atômicas para detectar conflitos de estado, como duas tentativas simultâneas de assumir o mesmo chamado. Isso não deduplica a criação: repetir `POST /tickets` pode criar chamados distintos.

### Principais endpoints

| Método | Caminho | Operação |
| --- | --- | --- |
| `POST` | `/users` | Cadastrar usuário |
| `GET` | `/users/me` | Consultar usuário autenticado |
| `POST` | `/auth/login` | Autenticar com formulário (`username` recebe o e-mail) |
| `POST` | `/auth/refresh` | Renovar a sessão |
| `POST` | `/auth/logout` | Encerrar a sessão |
| `GET` / `POST` | `/tickets` | Listar ou criar chamados |
| `GET` / `PATCH` / `DELETE` | `/tickets/{id}` | Consultar, editar ou excluir chamado |
| `POST` | `/tickets/{id}/assign` | Assumir chamado |
| `POST` | `/tickets/{id}/resolve` | Resolver chamado |
| `POST` | `/tickets/{id}/close` | Encerrar chamado |
| `POST` | `/tickets/{id}/reopen` | Reabrir chamado |
| `GET` | `/tickets/{id}/history` | Consultar histórico |

Os contratos, parâmetros e respostas estão disponíveis no Swagger UI em `/docs`.

![API no Insomnia](images/insomnia.png)

## Estrutura do repositório

```text
.
├── backend/
│   ├── app/
│   │   ├── core/           # Configuração, segurança e erros
│   │   ├── db/             # Sessões e base ORM
│   │   ├── modules/        # Auth, users, tickets e health
│   │   ├── dependencies.py
│   │   └── main.py
│   ├── alembic/            # Migrações do banco
│   ├── tests/              # Testes unitários e de integração
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout, formulários e componentes reutilizáveis
│   │   ├── contexts/       # Autenticação e tema
│   │   ├── pages/          # Telas e seus testes
│   │   ├── services/       # Cliente HTTP e serviços da API
│   │   ├── styles/         # Estilos globais
│   │   ├── test/           # Configuração dos testes
│   │   ├── types/          # Tipos de usuários, autenticação e chamados
│   │   └── App.tsx         # Rotas da aplicação
│   ├── Dockerfile
│   └── nginx.conf
├── .github/workflows/ci.yml
├── .env.example
└── compose.yaml
```

## Qualidade e testes

No diretório `backend/`:

```sh
uv run ruff check .
uv run ruff format --check .
uv run pytest -q
```

A suíte de backend exige `DATABASE_URL`, `TEST_DATABASE_URL` e `JWT_SECRET_KEY` configuradas. Ela cria o banco de testes e aplica as migrações automaticamente; o usuário do PostgreSQL precisa de permissão para criar esse banco. Use um banco exclusivo para testes: suas tabelas são limpas entre os testes.

No diretório `frontend/`:

```sh
npm run lint
npm test
npm run build
```

Os testes do frontend usam Vitest, jsdom e Testing Library para verificar componentes, páginas e serviços. O comando de build verifica os tipos com TypeScript e gera os arquivos em `frontend/dist`. Para visualizar esse build localmente, use `npm run preview`.

O workflow [ci.yml](.github/workflows/ci.yml) executa lint, formatação e testes do backend com PostgreSQL, além do build da imagem da API. Para o frontend, executa ESLint, testes e build de produção.
