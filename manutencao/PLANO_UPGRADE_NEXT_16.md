# Plano de Upgrade: Next.js 14 → 16

**Data do planejamento:** 21/07/2026
**Versão atual:** Next 14.2.16 / React 18.3.1 / ESLint 8.57.1
**Versão alvo:** Next 16 (última stable) / React 19 / ESLint 9
**Repositório:** `cledilandio-ai/colorikids`

---

## 🎯 Objetivo

Migrar o projeto para Next.js 16 para:
1. Corrigir as 5 vulnerabilidades do `npm audit` (1 critical, 3 high, 1 moderate)
2. Obter melhorias de performance (Turbopack nativo, React Compiler)
3. Manter-se atualizado com o ecossistema (Node 24 + Next 16 + React 19)

---

## 📊 Análise de Impacto — Código Atual

### 1. 🟢 Sem Impacto

| Item | Motivo |
|------|--------|
| **Webpack custom** | `next.config.js` NÃO tem `webpack` block — Turbopack funcionará sem alterações |
| **Parallel Routes** | Nenhuma `@slot` detectada no projeto |
| **Node.js** | Já estamos em Node 24 (requerido: 20.9+) |
| **TypeScript** | Versão 5.9.3 (requerido: 5.0+) |
| **Vitest** | v4.1.10 — compatível com Next 15/16 (sem conflito) |
| **Zod** | v4.4.3 — independente de React/Next |

### 2. 🟡 Requer Atenção

| Item | Arquivos | Mudança Necessária |
|------|----------|-------------------|
| **React 18 → 19** | Todos os componentes | `react`, `react-dom` atualizar de 18.3 → 19.x |
| **`cookies()` assíncrono** | `lib/auth.ts` (linha 92) | Adicionar `await cookies()` |
| **`searchParams` assíncrono** | Páginas Server Components (3) | Fazer `searchParams` assíncrono via `Promise` no parâmetro |
| **`next.config.js` — seções vazias** | `next.config.js` | Remover `typescript: {}` e `eslint: {}` vazios (herdados do `ignoreBuildErrors`) |

### 3. 🔴 Requer Mudanças Significativas

| Item | Arquivos | Mudança Necessária |
|------|----------|-------------------|
| **ESLint 8 → 9 + flat config** | `.eslintrc.json` → `eslint.config.js` | ESLint 9 usa formato de configuração completamente diferente (flat config). **Pode ser o passo mais demorado.** |
| **Middleware → proxy.ts** | `middleware.ts` | Renomear e export `proxy` em vez de `middleware` (Next 16) |
| **GET Route Handlers** | Rotas GET em /api/* | Comportamento de cache muda — não cacheado por default (Next 15+) |
| **`useRouter`/`usePathname`** | 13+ componentes client-side | Verificar se APIs mudaram (provavelmente compatíveis, mas testar) |

---

## 📋 Roteiro de Upgrade (4 fases)

### Fase 0: ESLint 8 → 9 (pré-requisito)

**Por quê:** `eslint-config-next@15` e `@16` PROVAVELMENTE exigem ESLint 9 com flat config.
O projeto atual usa ESLint 8 + `.eslintrc.json` (formato legacy).

**Passo 1 — Instalar ESLint 9:**
```bash
npm install -D eslint@9
```

**Passo 2 — Migrar config para flat config:**
Criar `eslint.config.js` na raiz:
```js
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  js.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "react/no-unescaped-entities": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
];
```

**Passo 3 — Remover `.eslintrc.json`:**
```bash
rm .eslintrc.json
```

**Passo 4 — Verificar:**
```bash
npm run lint  # Deve funcionar com a nova config
```

**Referência:** [ESLint 9 Migration Guide](https://eslint.org/docs/latest/use/migrating-to-9.0.0)

> ⚠️ **Alternativa:** Se `eslint-config-next@15` ainda suportar ESLint 8 (provável), esta fase pode ser adiada para depois do Next 15. Testar: após `npm install -D eslint-config-next@15`, rodar `npx next lint`. Se funcionar, pule esta fase até o Next 16.

---

### Fase 1: Preparação (pré-upgrade)

- [ ] **Backup**: Criar branch `next-upgrade` a partir do `main`
- [ ] **Snapshot de teste**: Rodar `npm run type-check`, `npm run lint`, `npm run test` e salvar resultados como baseline
- [ ] **Prisma**: Verificar compatibilidade — Prisma 5.22.0 é compatível com Next 15/16

---

### Fase 2: Upgrade para Next.js 15 (intermediário)

**Passo 1 — Atualizar dependências:**
```bash
npm install next@15 react@19 react-dom@19 @types/react@19 @types/react-dom@19
npm install -D eslint-config-next@15
```

**Passo 2 — Rodar codemod:**
```bash
npx @next/codemod@canary next-async-request-api .
```

Este codemod transforma automaticamente:
- `cookies()` → `await cookies()`
- `headers()` → `await headers()`
- `params` → `await params` (em páginas)
- `searchParams` → `await searchParams` (em páginas)

**Passo 3 — Arquivos que o codemod NÃO cobre (manual):**

| Arquivo | O que fazer |
|---------|-------------|
| `lib/auth.ts:92` | `const cookieStore = cookies()` → `const cookieStore = await cookies()` |
| `app/assinatura/page.tsx:10` | `searchParams` como prop síncrona → assíncrona |
| `app/(admin)/products/page.tsx:8` | `searchParams` como prop síncrona → assíncrona |
| `app/(admin)/orders/page.tsx:9` | `searchParams` como prop síncrona → assíncrona |

**API Routes (`new URL(request.url).searchParams`):** ❌ NÃO exigem mudança — `URL` constructor é síncrono em Node.js.

**Passo 4 — Ajustes de cache:**
- Revisar rotas GET em `/api/*` que dependiam de cache automático
- Se necessário, adicionar `export const dynamic = 'force-static'` para manter cache

**Passo 5 — Regenerar `next-env.d.ts`:**
```bash
npx next build  # ou next dev pelo menos uma vez
```
O arquivo `next-env.d.ts` é auto-gerado e será atualizado automaticamente.

**Passo 6 — Testar:**
```bash
npm run type-check
npm run lint
npm run test
npm run build
```

---

### Fase 3: Upgrade para Next.js 16

**Passo 1 — Atualizar dependências:**
```bash
npm install next@16
npm install -D eslint-config-next@16
```

**Passo 2 — Verificar se ESLint 9 é necessário agora:**
```bash
npm run lint
```
Se falhar, executar **Fase 0** (ESLint 8 → 9).

**Passo 3 — Renomear middleware → proxy:**
```bash
mv middleware.ts proxy.ts
```
No arquivo: alterar `export async function middleware` para `export async function proxy`

**Passo 4 — Atualizar `next.config.js`:**
Remover seções `typescript: {}` e `eslint: {}` vazias:
```js
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'fmkcqciijcphyibzxkmr.supabase.co',
            },
        ],
    },
};
module.exports = nextConfig;
```

**Passo 5 — Verificar Parallel Routes:**
```bash
# Buscar por @slot no projeto
grep -r "@" app/ --include="*.tsx" | grep "slot\|default"
```
Se existirem @slots, adicionar `default.js` em cada um.

**Passo 6 — Testar final:**
```bash
npm run type-check
npm run lint
npm run test
npm run build
```

---

## 🚨 Riscos Conhecidos

| Risco | Probabilidade | Mitigação |
|-------|:-------------:|-----------|
| **ESLint 9 flat config quebra lint** | Alta | Fase 0 preparatória + testar lint a cada passo |
| **React 19 quebra componentes** | Média | Testar componentes interativos (PDV, modal, carrinho) |
| **Turbopack incompatibilidade** | Baixa | Sem webpack custom — risco mínimo |
| **Caching diferente causa regressão** | Média | Revisar rotas GET que esperam cache |
| **Codemod não cobre edge cases** | Baixa | Revisão manual após codemod |
| **Vulnerabilidades transitórias** | Alta | `npm audit` após cada fase |

---

## 📊 Estimativa de Esforço (atualizada)

| Fase | Arquivos afetados | Esforço estimado | Risco |
|:----:|:-----------------:|:----------------:|:-----:|
| Fase 0 (ESLint 9) | 2 (config + remover .eslintrc.json) | 30-60 min | 🔴 Alto |
| Fase 1 (preparação) | 0 (branch + backup) | 15 min | 🟢 Baixo |
| Fase 2 (Next 15) | ~10 arquivos | 2-3 horas | 🟡 Médio |
| Fase 3 (Next 16) | ~3 arquivos | 30-60 min | 🟡 Médio |
| **Total** | **~15 arquivos** | **4-6 horas** | **🟡 Médio** |

> ⏱️ **Nota:** Se o ESLint 8→9 puder ser adiado (se `eslint-config-next@15` ainda suportar ESLint 8), o esforço total cai para ~3-4 horas.

---

## 📝 Checklist Final

- [ ] Branch `next-upgrade` criada a partir de `main`
- [ ] ESLint 9 migrado (ou verificado que ESLint 8 ainda funciona)
- [ ] `.eslintrc.json` removido (se migrou para flat config)
- [ ] Codemod rodado com sucesso
- [ ] `lib/auth.ts` — `await cookies()` manual
- [ ] Páginas com `searchParams` convertidas para assíncrono
- [ ] `next.config.js` — seções vazias removidas
- [ ] `next-env.d.ts` regenerado
- [ ] React 19 testado (carrinho, PDV, modais, formulários)
- [ ] `middleware.ts` → `proxy.ts` (Next 16)
- [ ] Rotas GET verificadas (cache behavior)
- [ ] `useRouter`/`usePathname` testados em 13+ componentes
- [ ] `npm run type-check` — 0 erros
- [ ] `npm run lint` — 0 erros, 0 warnings
- [ ] `npm run test` — 76/76 passando
- [ ] `npm run build` — sucesso
- [ ] CI verde no GitHub
- [ ] Vulnerabilidades `npm audit` eliminadas
- [ ] Changelog atualizado

---

## 📌 Notas Técnicas

### `cookies()` em `lib/auth.ts`
```typescript
// ANTES (Next 14):
import { cookies } from "next/headers";
const cookieStore = cookies();

// DEPOIS (Next 15+):
import { cookies } from "next/headers";
const cookieStore = await cookies();
```

### `searchParams` em Server Components
```typescript
// ANTES (Next 14):
export default async function Page({ searchParams }: { searchParams: { status?: string } }) {

// DEPOIS (Next 15+):
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
    const params = await searchParams;
```

### Middleware → proxy (Next 16)
```typescript
// ANTES: middleware.ts
export async function middleware(request: NextRequest) { ... }
export const config = { matcher: [...] };

// DEPOIS: proxy.ts
export async function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] };
```

---

*Documento gerado em 21/07/2026 — revisado com feedback do code-review (ESLint 9, @types/react-dom, next-env.d.ts, next.config.js)*
