# Plano: Entrada de Estoque via XML da NF-e

**Data:** 21/07/2026
**Sistema:** Freebuff — Gestão Multi-tenant

---

## 🎯 Objetivo

Permitir que o usuário faça upload do XML de uma **Nota Fiscal Eletrônica (NF-e)** e o sistema **automaticamente dê entrada no estoque** dos produtos comprados, criando os registros financeiros correspondentes.

---

## 📋 Fluxo do Usuário

```
1. Usuário acessa "Estoque > Entrada por XML"
2. Faz upload do arquivo XML da NF-e (fornecedor)
3. Sistema faz parse do XML e exibe prévia:
   ├── Dados da NF-e (número, chave de acesso, fornecedor)
   ├── Itens detectados (código, descrição, qtd, valor)
   └── Matching automático com produtos existentes (por SKU ou nome)
4. Usuário confere e ajusta匹配 (match) manual se necessário
5. Usuário confirma — sistema cria movimentação de estoque + financeiro
```

---

## 🏗️ Estrutura do XML da NF-e (leiaute 4.0)

```xml
<nfeProc>
  <NFe>
    <infNFe Id="NFe352006...">
      <!-- Dados do Fornecedor -->
      <emit>
        <CNPJ>00.000.000/0001-00</CNPJ>
        <xNome>FORNECEDOR LTDA</xNome>
      </emit>

      <!-- Número e Chave de Acesso -->
      <ide>
        <nNF>123456</nNF>           <!-- Número da NF-e -->
        <serie>1</serie>
        <dhEmi>2026-07-21T10:00:00-03:00</dhEmi>
      </ide>

      <!-- Itens (produtos comprados) -->
      <det n="1">
        <prod>
          <cProd>SKU-001</cProd>         <!-- Código do produto (SKU) -->
          <xProd>CAMISETA BRANCA</xProd> <!-- Descrição -->
          <NCM>6109.10.00</NCM>          <!-- Classificação fiscal -->
          <CFOP>6101</CFOP>              <!-- CFOP -->
          <uCom>UN</uCom>                <!-- Unidade comercial -->
          <qCom>10.0000</qCom>           <!-- Quantidade -->
          <vUnCom>25.0000</vUnCom>       <!-- Valor unitário -->
          <vProd>250.00</vProd>          <!-- Valor total do item -->
        </prod>
      </det>
      <!-- ... mais itens ... -->
    </infNFe>
  </NFe>
</nfeProc>
```

### Campos Essenciais a Extrair

| Tag XPath | Campo | Observação |
|-----------|-------|------------|
| `//ide/nNF` | Número NF-e | Para controle e evitar duplicidade |
| `//ide/serie` | Série | |
| `//emit/CNPJ` | CNPJ Fornecedor | Para identificar fornecedor |
| `//emit/xNome` | Nome Fornecedor | |
| `//det` | Itens (array) | Iterar por cada `<det>` |
| `//det/prod/cProd` | Código/SKU do produto | Usado para matching |
| `//det/prod/xProd` | Descrição do produto | |
| `//det/prod/NCM` | NCM | Opcional |
| `//det/prod/CFOP` | CFOP | Opcional |
| `//det/prod/uCom` | Unidade | |
| `//det/prod/qCom` | Quantidade | |
| `//det/prod/vUnCom` | Valor unitário | |
| `//det/prod/vProd` | Valor total item | |

---

## 📦 Biblioteca de Parsing XML

### Recomendação: `fast-xml-parser`

```bash
npm install fast-xml-parser
```

**Por quê:**
- Maturidade e popularidade no ecossistema Node.js
- Suporte a namespaces XML (necessário para NF-e, que usa `xmlns`)
- Converte XML → JSON de forma previsível
- Tipos TypeScript disponíveis (`@types/fast-xml-parser`)

**Alternativas:**
- `xml2js` — callback-based, mais verboso
- `xmldom` + `xpath` — browser-like, mais pesado

### Configuração do Parser

```typescript
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
    ignoreAttributes: false,    // Preservar atributos (ex: Id="NFe...")
    attributeNamePrefix: "@_",  // Prefixo para atributos
    textNodeName: "#text",      // Nome do nó de texto
    isArray: (name) => name === "det", // Forçar 'det' como array mesmo com 1 item
});
```

---

## 🗄️ Modelo de Dados — Schema Prisma

### Modelos Existentes (já disponíveis)

| Modelo | Uso |
|--------|-----|
| `Product` | Produto principal (matching por nome/supplier) |
| `ProductVariant` | Variação (matching por SKU) |
| `StockMovement` | Movimentação de entrada (já existe: `type: "IN"`) |
| `TreasuryTransaction` | Transação financeira (já existe: `type: "OUT"`) |
| `InventoryLog` | Log de alteração de estoque |
| `StoreConfig` | Config da loja (CNPJ para validação) |

### Novos Modelos a Criar

```prisma
model NfeImport {
  id          String   @id @default(uuid())
  storeId     String
  store       Store    @relation(fields: [storeId], references: [id])
  
  accessKey   String   @unique // Chave de 44 dígitos (evita import duplicado)
  nfeNumber   Int              // Número da NF-e
  serie       Int
  supplierCnpj String
  supplierName String
  totalValue  Float
  xmlRaw      String?  // XML original (opcional, para debug/reprocessamento)
  status      String   @default("PENDING") // PENDING, CONFIRMED, REJECTED
  
  items       NfeImportItem[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model NfeImportItem {
  id              String   @id @default(uuid())
  nfeImportId     String
  nfeImport       NfeImport @relation(fields: [nfeImportId], references: [id])
  
  // Dados do XML
  nfeCode         String   // cProd (código do produto na nota)
  description     String   // xProd
  ncm             String?
  cfop            String?
  unit            String   // uCom
  quantity        Float
  unitValue       Float
  totalValue      Float
  
  // Matching com sistema
  productId       String?  // Produto existente matchado
  variantId       String?  // Variante existente matchada
  matchedBy       String?  // "SKU", "NAME", "MANUAL"
  
  stockMovementId String?  // StockMovement criado ao confirmar
  inventoryLogId  String?  // InventoryLog criado ao confirmar
  
  createdAt DateTime @default(now())
}
```

---

## 🔄 Algoritmo de Matching (NF-e × Produtos)

```
Para cada item da NF-e:
  1. Buscar ProductVariant por SKU = nfeCode
     ├── Achou? → Match automático (matchedBy: "SKU")
     └── Não achou? → Próximo passo

  2. Buscar ProductVariant por SKU similar (case-insensitive, sem espaços)
     ├── Achou? → Match automático
     └── Não achou? → Próximo passo

  3. Buscar Product por nome similar (fuzzy match via Levenshtein)
     ├── Achou? → Match sugestivo (matchedBy: "NAME") — requer confirmação
     └── Não achou? → Sem match — usuário cria novo produto ou associa manual

  4. Se não achou nenhum match:
     ├── Usuário pode associar manualmente
     ├── Usuário pode criar novo produto + variante
     └── Ou ignorar o item (não dar entrada)
```

### Fuzzy Match (Levenshtein)

```bash
npm install fast-levenshtein
```

```typescript
import { get } from "fast-levenshtein";

function fuzzyMatch(desc1: string, desc2: string): number {
    const distance = get(desc1.toLowerCase().trim(), desc2.toLowerCase().trim());
    const maxLen = Math.max(desc1.length, desc2.length);
    return 1 - distance / maxLen; // 0..1 (1 = identical)
}
```

---

## 🖥️ Interface do Usuário

### Tela: Estoque > Entrada por XML

**Layout:**

```
┌────────────────────────────────────────────────────────────┐
│  📄 Entrada por XML NF-e                                   │
│                                                            │
│  [📁 Selecionar Arquivo XML]  (apenas .xml)                │
│                                                            │
│  ────────────────────────────────────────────────────────── │
│  📋 Prévia da NF-e                                         │
│                                                            │
│  NFe: 123456  |  Série: 1  |  Fornecedor: FORNECEDOR LTDA │
│  CNPJ: 00.000.000/0001-00  |  Chave: 3520...1234          │
│  Total NF: R$ 1.250,00                                     │
│                                                            │
│  ──────────── Itens ────────────                           │
│  ┌──────────────────────────────────────────────────┐      │
│  │ Item │ Código │ Descrição      │ Qtd │ R$ Unit   │      │
│  ├──────────────────────────────────────────────────┤      │
│  │ 1    │ SKU001 │ CAMISETA BRANCA │ 10  │ R$ 25,00 │      │
│  │      │ 🔗 Match: Camiseta Branca (SKU001) ✓     │      │
│  ├──────────────────────────────────────────────────┤      │
│  │ 2    │ SKU002 │ CALCA JEANS      │ 5   │ R$ 80,00│      │
│  │      │ ⚠️ Match não encontrado                   │      │
│  │      │ [Selecionar produto] [Criar novo] [Ignorar]│      │
│  └──────────────────────────────────────────────────┘      │
│                                                            │
│  [✅ Confirmar Entrada no Estoque]                          │
│                                                            │
│  Resumo: 10 itens na NF, 8 match automático,               │
│          1 match manual pendente, 1 ignorado                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Componentes Necessários

| Componente | Descrição |
|------------|-----------|
| `NfeImportPage.tsx` | Página principal (upload + preview) |
| `NfeUploadZone.tsx` | Dropzone para upload do XML |
| `NfePreview.tsx` | Prévia dos dados extraídos |
| `NfeItemRow.tsx` | Linha de item com status de match |
| `NfeMatchModal.tsx` | Modal para associar/match manual |
| `NfeConfirmButton.tsx` | Botão de confirmação + resumo |

---

## 🌐 API Routes

### 1. POST /api/stock/nfe/parse

**Finalidade:** Upload e parse do XML, retorna prévia sem persistir

```typescript
// Request: multipart/form-data com arquivo .xml
// Response: {
//   nfeNumber, serie, supplierCnpj, supplierName,
//   items: [{ nfeCode, description, quantity, unitValue, ... }],
//   matches: [{ status: "auto" | "suggested" | "none", productId?, variantId? }]
// }
```

### 2. POST /api/stock/nfe/confirm

**Finalidade:** Confirmar importação, criar movimentações

```typescript
// Request: {
//   items: [{ nfeCode, productId?, variantId?, createProduct?: {...} }]
// }
// Cria: NfeImport, NfeImportItem[], StockMovement[], TreasuryTransaction, InventoryLog[]
// Response: { success, movementsCreated, totalCost }
```

### 3. GET /api/stock/nfe/history

**Finalidade:** Listar importações anteriores (para consulta e evitar duplicatas)

---

## 📝 Validações e Regras de Negócio

### Validação do XML
- [ ] Arquivo deve ser `.xml` válido
- [ ] Schema XML da NF-e 4.0 (validação básica dos campos)
- [ ] CNPJ do emitente preenchido
- [ ] Pelo menos 1 item no `<det>`
- [ ] Chave de acesso com 44 dígitos

### Prevenção de Duplicidade
- [ ] Verificar se chave de acesso já foi importada (campo `accessKey` unique)
- [ ] Se já existe, retornar erro + dados da importação anterior

### Regras de Estoque
- [ ] Ao confirmar, criar `StockMovement { type: "IN", reason: "NF-e: 123456" }`
- [ ] Incrementar `stockQuantity` na `ProductVariant`
- [ ] Atualizar `lastRestockAt` na variante
- [ ] Calcular custo médio ponderado (igual ao restock existente)
- [ ] Criar `TreasuryTransaction { type: "OUT", category: "RESTOCK" }`
- [ ] Criar `InventoryLog` para auditoria

---

## 🔒 Segurança

- [ ] Autenticação: `getAuthContext()` — OWNER pode importar
- [ ] Rate limit: 10 imports/hora (evitar abuso)
- [ ] Validação Zod: schema para o payload de confirmação
- [ ] Tamanho máximo do XML: 5MB
- [ ] Logging: `securityLog("NFE_IMPORT", { nfeNumber, supplierCnpj })` para auditoria

---

## 📋 Roteiro de Implementação

### Fase 1: Backend (Parsing + API)

| Tarefa | Esforço | Dependências |
|--------|:-------:|--------------|
| Instalar `fast-xml-parser` e `fast-levenshtein` | 5min | — |
| Criar modelo `NfeImport` e `NfeImportItem` (Prisma) | 30min | — |
| Criar `lib/nfeParser.ts` (parse XML → objeto tipado) | 1h | fast-xml-parser |
| Criar `lib/nfeMatcher.ts` (algoritmo de matching) | 1h | fast-levenshtein |
| Criar `POST /api/stock/nfe/parse` | 1h | parser + matcher |
| Criar `POST /api/stock/nfe/confirm` | 1.5h | transaction + stock + finance |
| Criar `GET /api/stock/nfe/history` | 30min | — |
| Testes unitários (parse, match, confirm) | 1h | — |

**Total Fase 1:** ~6h

### Fase 2: Frontend (Interface)

| Tarefa | Esforço | Dependências |
|--------|:-------:|--------------|
| Criar página `/(admin)/estoque/nfe/page.tsx` | 30min | Layout admin |
| Criar `NfeUploadZone.tsx` (drag & drop) | 30min | — |
| Criar `NfePreview.tsx` (tabela de itens) | 1h | — |
| Criar `NfeItemRow.tsx` (status do match) | 1h | — |
| Criar `NfeMatchModal.tsx` (match manual) | 1.5h | — |
| Criar `NfeConfirmButton.tsx` (confirmação) | 30min | — |
| Adicionar link na sidebar (AdminSidebar.tsx) | 5min | — |
| Testes E2E (upload → parse → confirm) | 1h | — |

**Total Fase 2:** ~6h

### Fase 3: Refinamentos

| Tarefa | Esforço |
|--------|:-------:|
| Histórico de importações (tabela) | 30min |
| Reimportação (corrigir matching) | 1h |
| Relatório de custos por NF-e | 30min |
| Notificação em caso de erro de parse | 30min |

**Total Fase 3:** ~2.5h

---

## 📊 Estimativa Total

| Fase | Horas |
|:----:|:-----:|
| Backend (API + parse) | 6h |
| Frontend (UI) | 6h |
| Refinamentos | 2.5h |
| **Total** | **~14.5h** |

---

## 🚨 Riscos e Desafios

| Risco | Probabilidade | Mitigação |
|-------|:-------------:|-----------|
| XML da NF-e com variações não padrão | Média | Tratar erros de parse gracefulmente + fallback manual |
| Matching falso-positivo (produtos com nomes similares) | Média | Sempre exigir confirmação do usuário para matches sugeridos |
| NF-e muito grande (+100 itens) | Baixa | Testar com XML de até 5MB / 500 itens |
| Duplicidade de chave de acesso | Baixa | Unique constraint no banco + mensagem clara |
| Custo médio ponderado incorreto | Baixa | Usar mesma lógica do restock existente |

---

## 🔗 Integrações com o Sistema Existente

### Reuso de Código

| Arquivo Existente | Como Reutilizar |
|-------------------|-----------------|
| `app/api/stock/restock/route.ts` | Mesma lógica de transaction (stock + finance + costPrice) |
| `lib/validation.ts` (restockSchema) | Base para o schema de confirmação NF-e |
| `components/admin/RestockButton.tsx` | Inspiração para UI de entrada |
| `components/admin/AdminSidebar.tsx` | Adicionar link "Entrada NF-e" |
| `middleware.ts` | Proteção de rotas (já está configurado) |

### Novos Arquivos

| Arquivo | Finalidade |
|---------|-----------|
| `lib/nfeParser.ts` | Parse XML → objeto `NfeParseResult` |
| `lib/nfeMatcher.ts` | Algoritmo de matching (SKU → variante) |
| `app/api/stock/nfe/parse/route.ts` | Upload + parse |
| `app/api/stock/nfe/confirm/route.ts` | Confirmar import |
| `app/api/stock/nfe/history/route.ts` | Histórico |
| `app/(admin)/estoque/nfe/page.tsx` | Página principal |
| `components/admin/nfe/NfeUploadZone.tsx` | Upload drag & drop |
| `components/admin/nfe/NfePreview.tsx` | Preview tabela |
| `components/admin/nfe/NfeItemRow.tsx` | Item row |
| `components/admin/nfe/NfeMatchModal.tsx` | Match modal |
| `components/admin/nfe/NfeConfirmButton.tsx` | Confirm button |
| `lib/__tests__/nfeParser.test.ts` | Testes parse |
| `lib/__tests__/nfeMatcher.test.ts` | Testes matching |

---

## 📝 Checklist Final

- [ ] Instalar dependências: `fast-xml-parser`, `fast-levenshtein`
- [ ] Rodar `npx prisma db push` (novos modelos)
- [ ] Parse de XML funcional (testar com NF-e real)
- [ ] Matching automático por SKU funcional
- [ ] Matching fuzzy por nome funcional
- [ ] Confirmação cria StockMovement + TreasuryTransaction + InventoryLog
- [ ] Rate limiting implementado (10/hora)
- [ ] Validação Zod para os inputs
- [ ] Unique constraint de chave de acesso
- [ ] UI com upload, preview, match manual, confirmação
- [ ] Histórico de importações (GET /api/stock/nfe/history)
- [ ] Tests: 3 suites (parse, matcher, integration)
- [ ] Typecheck: 0 erros
- [ ] Lint: 0 erros, 0 warnings
- [ ] CI verde

---

*Documento gerado em 21/07/2026*
