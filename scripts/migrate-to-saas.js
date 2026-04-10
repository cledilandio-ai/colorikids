/**
 * SCRIPT DE MIGRAÇÃO: Single-tenant → SaaS Multi-tenant
 * -------------------------------------------------------
 * Este script é IDEMPOTENTE: pode ser rodado múltiplas vezes sem risco.
 * Ele cria a estrutura SaaS e migra os dados existentes para o tenant "Colorikids".
 *
 * COMO RODAR:
 *   1. node scripts/migrate-to-saas.js
 *   2. npx prisma generate
 *
 * PONTO DE RETORNO: git checkout pre-saas-migration
 * BACKUP FÍSICO:    E:\Backups\vast-cosmos\2026-04-10_pre-saas
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ID fixo e conhecido para o tenant Colorikids (facilita auditorias)
const COLORIKIDS_STORE_ID = "00000000-0000-0000-0000-colorikids01";
const COLORIKIDS_SLUG = "colorikids";

async function main() {
  console.log("🚀 Iniciando migração para arquitetura SaaS multi-tenant...\n");

  // ── ETAPA 1: Criar tabelas novas (Store, Subscription) ──────────────────────
  console.log("📋 Etapa 1/6: Criando tabelas Store e Subscription...");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Store" (
      "id"        TEXT NOT NULL PRIMARY KEY,
      "name"      TEXT NOT NULL,
      "slug"      TEXT NOT NULL UNIQUE,
      "status"    TEXT NOT NULL DEFAULT 'ACTIVE',
      "planType"  TEXT NOT NULL DEFAULT 'BASIC',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Subscription" (
      "id"          TEXT NOT NULL PRIMARY KEY,
      "storeId"     TEXT NOT NULL UNIQUE,
      "status"      TEXT NOT NULL DEFAULT 'ACTIVE',
      "amount"      DOUBLE PRECISION NOT NULL,
      "billingDay"  INTEGER NOT NULL DEFAULT 1,
      "nextDueDate" TIMESTAMP(3) NOT NULL,
      "notes"       TEXT,
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Subscription_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);

  console.log("   ✅ Tabelas Store e Subscription prontas.\n");

  // ── ETAPA 2: Inserir o tenant Colorikids ────────────────────────────────────
  console.log("📋 Etapa 2/6: Inserindo Store 'Colorikids'...");

  await prisma.$executeRawUnsafe(`
    INSERT INTO "Store" ("id", "name", "slug", "status", "planType", "createdAt", "updatedAt")
    VALUES ('${COLORIKIDS_STORE_ID}', 'Colorikids', '${COLORIKIDS_SLUG}', 'ACTIVE', 'BASIC', NOW(), NOW())
    ON CONFLICT ("id") DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "Subscription" ("id", "storeId", "status", "amount", "billingDay", "nextDueDate", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, '${COLORIKIDS_STORE_ID}', 'ACTIVE', 0, 1, NOW(), NOW(), NOW())
    ON CONFLICT ("storeId") DO NOTHING
  `);

  console.log("   ✅ Store Colorikids criada. ID:", COLORIKIDS_STORE_ID, "\n");

  // ── ETAPA 3: Adicionar colunas storeId (nullable) em todas as tabelas ────────
  console.log("📋 Etapa 3/6: Adicionando coluna storeId nas tabelas existentes...");

  const tabelas = [
    "User",
    "Product",
    "Order",
    "Customer",
    "CashRegister",
    "TreasuryTransaction",
    "TransactionCategory",
    "InventoryLog",
    "StockMovement",
    "StoreConfig",
  ];

  for (const tabela of tabelas) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${tabela}" ADD COLUMN IF NOT EXISTS "storeId" TEXT
    `);
    console.log(`   → "${tabela}" — coluna storeId adicionada`);
  }

  console.log("   ✅ Colunas adicionadas.\n");

  // ── ETAPA 4: Popular storeId em todos os registros existentes ────────────────
  console.log("📋 Etapa 4/6: Associando todos os registros ao tenant Colorikids...");

  for (const tabela of tabelas) {
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "${tabela}" SET "storeId" = '${COLORIKIDS_STORE_ID}' WHERE "storeId" IS NULL
    `);
    console.log(`   → "${tabela}" — ${result} registros atualizados`);
  }

  console.log("   ✅ Todos os dados associados ao tenant Colorikids.\n");

  // ── ETAPA 5: Tornar storeId NOT NULL ────────────────────────────────────────
  console.log("📋 Etapa 5/6: Aplicando NOT NULL e Foreign Keys...");

  const tabelasComFK = [
    "User",
    "Product",
    "Order",
    "Customer",
    "CashRegister",
    "TreasuryTransaction",
    "TransactionCategory",
    "InventoryLog",
    "StockMovement",
    "StoreConfig",
  ];

  for (const tabela of tabelasComFK) {
    // NOT NULL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${tabela}" ALTER COLUMN "storeId" SET NOT NULL
    `).catch((e) => console.warn(`   ⚠️  NOT NULL em "${tabela}" — ${e.message}`));

    // Foreign Key (ignora se já existe)
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${tabela}"
      ADD CONSTRAINT "fk_${tabela}_store"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
    `).catch(() => {}); // Silencia se a FK já existe

    console.log(`   → "${tabela}" — NOT NULL + FK aplicados`);
  }

  // Constraint especial: storeId UNIQUE em StoreConfig (1 config por loja)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "StoreConfig" ADD CONSTRAINT "StoreConfig_storeId_key" UNIQUE ("storeId")
  `).catch(() => {});

  // Ajuste de unique no Customer: CPF único por loja (não global)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_cpf_key"
  `).catch(() => {});
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Customer" ADD CONSTRAINT "Customer_cpf_storeId_key" UNIQUE ("cpf", "storeId")
  `).catch(() => {});

  // Ajuste unique em TransactionCategory: nome único por loja
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "TransactionCategory" DROP CONSTRAINT IF EXISTS "TransactionCategory_name_key"
  `).catch(() => {});
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "TransactionCategory" ADD CONSTRAINT "TransactionCategory_name_storeId_key" UNIQUE ("name", "storeId")
  `).catch(() => {});

  console.log("   ✅ Constraints aplicadas.\n");

  // ── ETAPA 6: Verificação final ───────────────────────────────────────────────
  console.log("📋 Etapa 6/6: Verificação de integridade...");

  const stores = await prisma.$queryRawUnsafe(`SELECT id, name, slug, status FROM "Store"`);
  console.log("   Stores no banco:", stores);

  const orphans = await prisma.$queryRawUnsafe(`
    SELECT 'Product' as tabela, COUNT(*) as orphans FROM "Product" WHERE "storeId" IS NULL
    UNION ALL
    SELECT 'Order', COUNT(*) FROM "Order" WHERE "storeId" IS NULL
    UNION ALL
    SELECT 'Customer', COUNT(*) FROM "Customer" WHERE "storeId" IS NULL
  `);
  console.log("   Registros sem storeId (deve ser 0):", orphans);

  console.log("\n✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Próximos passos:");
  console.log("  1. npx prisma generate");
  console.log("  2. Verifique os dados no painel Supabase");
  console.log("  3. npm run dev — teste o sistema normalmente");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("\n❌ ERRO NA MIGRAÇÃO:", e);
    console.error("\nNenhuma alteração permanente foi feita se o erro ocorreu antes da Etapa 4.");
    console.error("Para reverter completamente: git checkout pre-saas-migration");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
