# Freebuff — Gestão Multi-tenant para Lojas

[![CI](https://github.com/cledilandio-ai/colorikids/actions/workflows/ci.yml/badge.svg)](https://github.com/cledilandio-ai/colorikids/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)
![Node](https://img.shields.io/badge/Node-24_LTS-339933)
![Next.js](https://img.shields.io/badge/Next.js-14-000000)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748)
![Tests](https://img.shields.io/badge/Tests-76/76-22c55e)

SaaS de gestão comercial multi-tenant — PDV, estoque, financeiro, pedidos e administração de lojas.

---

## 📋 Sumário

- [Stack](#-stack)
- [Quick Start](#-quick-start)
- [Scripts](#-scripts)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Arquitetura](#-arquitetura)
- [API Endpoints](#-api-endpoints)
- [Segurança](#-segurança)
- [Testes](#-testes)
- [CI/CD](#-cicd)
- [Upgrade Next.js 16](#-upgrade-nextjs-16)

---

## 🏗️ Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui |
| **Backend** | API Routes (Next.js), Server Components |
| **Banco** | PostgreSQL via Prisma ORM |
| **Storage** | Supabase Storage (imagens) |
| **Auth** | JWT (jose) + bcryptjs + cookies httpOnly |
| **Rate Limiter** | Upstash Redis (com fallback in-memory) |
| **Logging** | Pino (estruturado, JSON em prod) |
| **Validação** | Zod (11 schemas, 13 endpoints) |
| **Testes** | Vitest (76 testes: unitários + integração) |
| **CI/CD** | GitHub Actions (push → typecheck + lint + tests) |
| **Lint** | ESLint (0 erros, 0 warnings) |

---

## 🚀 Quick Start

```bash
# 1. Clone o repositório
git clone https://github.com/cledilandio-ai/colorikids.git
cd colorikids

# 2. Instale as dependências (Node 24+ recomendado)
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Preencha os valores obrigatórios (veja seção abaixo)

# 4. Gere o Prisma Client e sincronize o schema
npx prisma generate
npx prisma db push

# 5. Crie o super admin (opcional, primeira vez)
node scripts/create-super-admin.js

# 6. Inicie o servidor de desenvolvimento
npm run dev
```

> **Pré-requisitos:** Node.js 20+ (recomendado 24 LTS), PostgreSQL (local ou remoto), conta Supabase (storage).

---

## 📜 Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (`next dev`) |
| `npm run build` | Build de produção (`prisma generate` + `next build`) |
| `npm start` | Servidor de produção (`next start`) |
| `npm run lint` | ESLint — 0 erros, 0 warnings |
| `npm run type-check` | TypeScript — 0 erros (`tsc --noEmit`) |
| `npm run test` | Testes — 76/76 (`vitest run`) |
| `npm run db:push` | Sincronizar schema Prisma com o banco |
| `npx prisma studio` | Interface gráfica do banco de dados |

**Pre-commit hook** (automático via Husky):
```bash
npx tsc --noEmit --pretty  # Typecheck
npx next lint               # Lint
npx vitest run              # Testes
```
> O hook é bloqueante — commit falha se qualquer etapa não passar.

---

## 🔐 Variáveis de Ambiente

Arquivo: `.env.local` (base: `.env.example`)

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `POSTGRES_URL` | ✅ | Conexão Prisma (com pooler) |
| `DIRECT_URL` | ✅ | Conexão direta ao PostgreSQL |
| `JWT_SECRET` | ✅ | Chave para assinar JWTs (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Chave anônima Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ⬜ | Admin Supabase (upload de imagens) |
| `UPSTASH_REDIS_REST_URL` | ⬜ | Redis REST URL (rate limiter) |
| `UPSTASH_REDIS_REST_TOKEN` | ⬜ | Redis token (rate limiter) |
| `NODE_ENV` | ⬜ | Definido automaticamente pelo Next.js |

> Sem as vars do Upstash Redis, o rate limiter opera em modo in-memory (apenas para dev local).

---

## 🏛️ Arquitetura

### Stack de Segurança (Request Flow)

```
Request → Middleware (JWT verify) → Route Handler
                                       ├── getAuthContext() → tenant isolation
                                       ├── checkRateLimit()  → 429 se excedido
                                       ├── Zod schema.safeParse() → 400 se inválido
                                       ├── logger.* / securityLog() → audit trail
                                       └── Prisma (singleton) → banco
```

### Estrutura de Diretórios

```
.
├── app/                    # Next.js App Router
│   ├── (admin)/            # Rotas administrativas (layout protegido)
│   │   ├── admin/          #   Admin (estoque, dashboard)
│   │   ├── orders/         #   Pedidos
│   │   ├── pos/            #   PDV (Ponto de Venda)
│   │   ├── products/       #   Produtos (CRUD)
│   │   ├── clientes/       #   Clientes
│   │   ├── finance/        #   Financeiro
│   │   └── settings/       #   Configurações da loja
│   ├── api/                # API Routes
│   │   ├── auth/           #   Login, registro, senha
│   │   ├── orders/         #   Pedidos CRUD
│   │   ├── products/       #   Produtos CRUD
│   │   ├── finance/        #   Tesouraria, recebíveis
│   │   ├── stock/          #   Reposição de estoque
│   │   ├── customers/      #   Clientes
│   │   └── ...             #   + 20 rotas
│   ├── login/              # Página de login
│   └── super-admin/        # Painel super admin
├── components/             # Componentes React
│   ├── ui/                 #   shadcn/ui (button, card, dialog, etc.)
│   └── admin/              #   Componentes administrativos
├── lib/                    # Biblioteca compartilhada
│   ├── auth.ts             #   JWT + getAuthContext
│   ├── db.ts               #   Prisma singleton
│   ├── validation.ts       #   11 schemas Zod
│   ├── rateLimiter.ts      #   Rate limiter (Redis + fallback)
│   ├── logger.ts           #   Pino logger + securityLog
│   ├── cors.ts             #   CORS middleware
│   └── utils.ts            #   Utilitários gerais
├── prisma/                 # Schema + migrações
├── middleware.ts           # Middleware global (JWT, CORS)
└── manutencao/             # Documentação técnica
    ├── Historico de Alteracoes Freebuff.md
    ├── PLANO_UPGRADE_NEXT_16.md
    ├── openapi.yaml        # Documentação OpenAPI
    └── ...
```

---

## 🌐 API Endpoints

Documentação OpenAPI completa em [`manutencao/openapi.yaml`](manutencao/openapi.yaml) (47 rotas documentadas).

### Autenticação

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login (retorna cookie JWT) |
| POST | `/api/auth/register` | Solicitar cadastro de nova loja |
| POST | `/api/auth/change-password` | Alterar senha do usuário |
| POST | `/api/auth/verify-owner` | Verificar senha do proprietário |
| POST | `/api/auth/logout` | Logout (limpa cookie) |

### Produtos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/products` | Listar produtos (com busca) |
| POST | `/api/products` | Criar produto |
| GET | `/api/products/[id]` | Obter produto |
| PUT | `/api/products/[id]` | Atualizar produto |
| DELETE | `/api/products/[id]` | Remover produto |

### Pedidos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/orders` | Listar pedidos |
| POST | `/api/orders` | Criar pedido |
| GET | `/api/orders/[id]` | Obter pedido |
| PUT | `/api/orders/[id]` | Atualizar pedido |
| DELETE | `/api/orders/[id]` | Cancelar pedido |
| POST | `/api/orders/[id]/return` | Registrar devolução |

### Financeiro

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/finance/treasury` | Listar transações |
| POST | `/api/finance/treasury` | Criar transação |
| GET | `/api/finance/receivables` | Listar recebíveis |

### Estoque & Clientes

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/stock/restock` | Registrar reposição |
| GET | `/api/customers` | Listar clientes |
| POST | `/api/customers` | Criar cliente |
| PUT | `/api/customers/[id]` | Atualizar cliente |

### Caixa

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/cash-register` | Status do caixa |
| POST | `/api/cash-register` | Abrir/fechar caixa |
| GET | `/api/cash-register/history` | Histórico do caixa |

### Monitoramento

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Health check (DB, JWT, Supabase, Redis) |
| GET | `/api/debug-connection` | Diagnóstico de banco |

---

## 🔒 Segurança

Camadas de proteção implementadas nesta versão:

| Camada | Descrição |
|--------|-----------|
| **Tenant Isolation** | IDOR corrigido em 5 endpoints — `findFirst({ storeId })` em vez de `findUnique({ id })` |
| **Rate Limiting** | 7 endpoints protegidos (5–30 requisições/minuto) |
| **Validação Zod** | 11 schemas em 13 endpoints POST/PUT — erros por campo no response |
| **Logging** | Pino estruturado + `securityLog()` para eventos auditáveis |
| **CORS** | Origens configuráveis via env var |
| **JWT** | Sem fallback hardcoded — runtime check obrigatório |
| **Prisma Singleton** | Conexão única — evita `$disconnect()` acidental |
| **Upload** | Autenticação obrigatória — 401 se anônimo |
| **Pre-commit** | Bloqueante: typecheck + lint + testes antes de cada commit |
| **CI/CD** | Typecheck + lint + testes em todo push no main |

**Eventos auditados (securityLog):**
- `RATE_LIMIT_EXCEEDED` — warn
- `LOGIN_FAILED` (user_not_found / wrong_password) — info
- `LOGIN_SUCCESS` — info
- `REGISTER_SUCCESS` — info
- `PASSWORD_CHANGED` — info

---

## 🧪 Testes

```bash
# Rodar todos os testes
npx vitest run

# Rodar em modo watch (desenvolvimento)
npx vitest
```

| Suite | Arquivo | Testes | Cobertura |
|-------|---------|:------:|-----------|
| Zod Validation | `lib/validation.test.ts` | 50 | Schemas de validação |
| Rate Limiter | `lib/rateLimiter.test.ts` | 15 | Redis + fallback in-memory |
| Integração | `app/api/__tests__/integration.test.ts` | 11 | Auth + Rate Limit + Zod + Logging |
| **Total** | | **76** | **100% passando** |

---

## ⚙️ CI/CD

O workflow (`ci.yml`) executa em todo push no `main`:

```
push → main
  ├── Setup Node.js 24
  ├── npm install --frozen-lockfile
  ├── npx prisma generate
  ├── npx tsc --noEmit --pretty        # Typecheck
  ├── npm run lint                      # ESLint (0 erros, 0 warnings)
  └── npx vitest run --reporter=verbose # 76/76 testes
```

> **Badge de status:** [![CI](https://github.com/cledilandio-ai/colorikids/actions/workflows/ci.yml/badge.svg)](https://github.com/cledilandio-ai/colorikids/actions/workflows/ci.yml)

---

## 📈 Upgrade Next.js 16

Plano detalhado em [`manutencao/PLANO_UPGRADE_NEXT_16.md`](manutencao/PLANO_UPGRADE_NEXT_16.md)

**Resumo:** Migração de Next 14 → 16 em 4 fases (~4-6 horas):
1. ESLint 8 → 9 (flat config)
2. Preparação (branch + backup)
3. Next 15 intermediário (codemod async APIs + React 19)
4. Next 16 (Turbopack, proxy.ts, caching)

---

## 📄 Licença

Privado — uso interno.
