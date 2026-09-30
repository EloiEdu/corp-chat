# 💬 Corp Chat Backend

Backend de um chat corporativo moderno (estilo Slack/Discord simplificado), construído com uma arquitetura limpa, alta segurança e foco em modularidade.

---

## 🚀 Tech Stack

* **Framework:** [NestJS 12](https://nestjs.com/)
* **Linguagem:** TypeScript
* **Runtime:** Node.js
* **Banco de Dados:** PostgreSQL 15
* **ORM:** Prisma 7.9.1
* **Containerização:** Docker & Docker Compose

---

## 📁 Arquitetura e Módulos

O projeto segue uma estrutura estritamente modular do NestJS:
* **`UsersModule`**: Gerenciamento de usuários, hash de senha seguro (`node:crypto` / `scrypt`), DTOs com `class-validator` e tratamento robusto de erros do Prisma (P2002 / Conflict).
* **`WorkspacesModule`**: Espaços de trabalho colaborativos, validação estrita de slugs por expressão regular e parâmetros protegidos por `ParseUUIDPipe`.

---

## ⚙️ Como Executar o Projeto

### Pré-requisitos
* Node.js instalado
* Docker e Docker Compose rodando

### 1. Subir a Infraestrutura (Banco de Dados)
Na raiz do projeto, suba o container do PostgreSQL:
```bash