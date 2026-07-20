# Freebuff — Gestão Multi-tenant para Lojas

[![CI](https://github.com/cledilandio-ai/colorikids/actions/workflows/ci.yml/badge.svg)](https://github.com/cledilandio-ai/colorikids/actions/workflows/ci.yml)

SaaS de gestão comercial construído com **Next.js 14**, **Prisma** e **Supabase**.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui |
| Backend | API Routes (Next.js), Server Components |
| Banco | PostgreSQL (Prisma ORM) |
| Storage | Supabase Storage (imagens) |
| Auth | JWT (jose), bcryptjs, cookies httpOnly |
| Rate Limiter | Upstash Redis + fallback in-memory |
| Logging | Pino (estruturado) |
| Testes | Vitest (76 testes) |
| CI/CD | GitHub Actions |

## Quick Start

```bash
# 1. Clone e instale
npm install

# 2. Configure variáveis de ambiente
cp .env.example .env.local
# Preencha POSTGRES_URL, JWT_SECRET, SUPABASE_URL, etc.

# 3. Gere o Prisma Client e sincronize o schema
npx prisma generate
npx prisma db push

# 4. Rode em desenvolvimento
npm run dev
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (`prisma generate` + `next build`) |
| `npm start` | Servidor de produção |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npx vitest run` | Testes unitários + integração |

## Endpoints da API

Documentação completa em [`manutencao/openapi.yaml`](manutencao/openapi.yaml).

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login (cookie JWT) |
| POST | `/api/auth/register` | Solicitar cadastro |
| POST | `/api/auth/change-password` | Alterar senha |
| POST | `/api/auth/verify-owner` | Verificar senha do proprietário |

### Monitoramento
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/health` | Health check (DB, JWT, Supabase, Redis) |
| GET | `/api/debug-connection` | Diagnóstico de banco |

## Segurança

Esta sessão implementou as seguintes camadas de proteção:

1. **Tenant Isolation** — IDOR corrigido em 5 endpoints
2. **Rate Limiting** — 7 endpoints protegidos (5-30 req/min)
3. **Validação Zod** — 11 schemas, 13 endpoints POST/PUT
4. **Logging Estruturado** — Pino com `securityLog` para auditoria
5. **CORS** — Origens configuráveis via env var
6. **JWT** — Sem fallback hardcoded
7. **Prisma Singleton** — Conexões padronizadas

## Licença

Privado — uso interno.
