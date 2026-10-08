# 💬 Corp Chat

Chat corporativo composto por um backend NestJS e um frontend Angular, com workspaces, canais e mensagens em tempo real via Socket.io.

---

## 🚀 Tech Stack

### **Backend**
* **Framework:** NestJS 12
* **Linguagem:** TypeScript
* **Banco de Dados:** PostgreSQL 15
* **ORM:** Prisma 7.9.1 com adapter `@prisma/adapter-pg`
* **Autenticação:** JWT com Passport
* **Hash de senhas:** `scrypt` (`node:crypto`), salt aleatório e comparação segura
* **Validação:** `class-validator`, `class-transformer`, `ValidationPipe` global
* **Tempo real:** Socket.io com autenticação JWT no handshake

### **Frontend**
* **Framework:** Angular 22 com componentes standalone e Signals
* **Build:** `@angular/build:application`
* **Estilização:** Tailwind CSS 4
* **HTTP:** `HttpClient` com interceptor JWT
* **Tempo real:** `socket.io-client`

### **Infraestrutura**
* Docker Compose
* PostgreSQL, Redis e LocalStack configurados no Compose
* Redis e LocalStack estão disponíveis como serviços, mas ainda não são utilizados pelo código da aplicação.

---

## 📁 Módulos e funcionalidades

* **`UsersModule`**: cadastro e consulta de usuários; senhas armazenadas com hash `scrypt`.
* **`AuthModule`**: login e emissão de JWT; proteção de rotas REST com Passport.
* **`WorkspacesModule`**: criação e listagem dos workspaces do usuário, associação de membros e papéis `ADMIN`/`MEMBER`.
* **`ChannelsModule`**: canais públicos e privados dentro de workspaces; exclusão por ADMIN ou criador do canal.
* **`MessagesModule`**: criação e consulta de mensagens com paginação por cursor. O acesso ao workspace e a canais privados é verificado.
* **`EventsModule` / `ChatGateway`**: conexão Socket.io autenticada por JWT, entrada e saída de salas de canal e transmissão de novas mensagens.

---

## 🔌 Rotas principais

Rotas protegidas exigem `Authorization: Bearer <token>`.

| Método | Rota | Acesso |
|---|---|---|
| `POST` | `/users` | Público; cadastro |
| `GET` | `/users` | Atualmente público |
| `GET` | `/users/:id` | Atualmente público |
| `POST` | `/auth/login` | Público |
| `POST` | `/workspaces` | Autenticado |
| `GET` | `/workspaces` | Autenticado; retorna workspaces e papel do usuário |
| `GET` | `/workspaces/:id` | Autenticado |
| `POST` | `/workspaces/:id/members` | ADMIN do workspace |
| `DELETE` | `/workspaces/:workspaceId` | ADMIN do workspace |
| `POST` | `/workspaces/:workspaceId/channels` | Membro do workspace |
| `GET` | `/workspaces/:workspaceId/channels` | Membro do workspace |
| `GET` | `/workspaces/:workspaceId/channels/:channelId` | Membro do workspace |
| `DELETE` | `/workspaces/:workspaceId/channels/:channelId` | ADMIN ou criador do canal |
| `POST` | `/workspaces/:workspaceId/channels/:channelId/messages` | Autenticado com acesso ao canal |
| `GET` | `/workspaces/:workspaceId/channels/:channelId/messages` | Autenticado com acesso ao canal |

A listagem de mensagens aceita `limit` (padrão 50, máximo 100) e `cursor` UUID.

### Eventos Socket.io

* Cliente envia: `join_channel`, `leave_channel`, `send_message`
* Servidor envia: `joined_channel`, `left_channel`, `newMessage`

A conexão envia o JWT em `auth.token` no handshake.

---

## ⚙️ Como executar com Docker

### Pré-requisitos
* Docker e Docker Compose

### 1. Configurar ambiente

Na raiz do repositório, copie `.env.example` para `.env` e configure as credenciais do PostgreSQL e do JWT.

Para o Docker Compose, `DATABASE_URL` deve usar o nome do serviço do banco:

```env
DATABASE_URL="postgresql://corp_chat:senha@postgres:5432/corp_chat?schema=public"
```

O `.env.example` também precisa conter `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB`, usados pelo serviço PostgreSQL.

### 2. Iniciar os serviços e aplicar migrations

```bash
docker compose up --build -d
docker compose exec api npx prisma migrate deploy
```

### 3. Acessar

* **Frontend:** http://localhost:4200
* **API:** http://localhost:3000
* **PostgreSQL:** localhost:5432
* **Redis:** localhost:6379
* **LocalStack:** localhost:4566

O backend usa a porta `PORT` quando executado diretamente e assume `3000` por padrão. No Compose, a porta publicada da API é `3000`.

---

## 🧭 Ambientes do frontend

* Desenvolvimento: `http://localhost:3000`
* Produção: `https://corp-chat-roan.vercel.app/`

As origens CORS da API e do Gateway são configuradas separadamente no backend. Atualmente, há origens definidas no código; mantenha-as alinhadas ao domínio real do frontend.

---

## 📝 Observações

* O arquivo `backend/prisma/seed.ts` contém dados de teste, mas o seed ainda não está configurado como comando do Prisma.
* As rotas de consulta de usuários estão públicas no estado atual do código; revise essa política antes de disponibilizar o serviço publicamente.