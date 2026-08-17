import { PrismaClient } from "@prisma/client";

const dbUrl = "postgresql://postgres.fmkcqciijcphyibzxkmr:mOAG1961%23cLE882142%23@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true";

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl,
        },
    },
});

async function main() {
  console.log("Checking stores...");
  const stores = await prisma.store.findMany();
  console.log("Stores found:", stores.length);

  const nfeCount = await prisma.nfeImport.count().catch((e) => e.message);
  console.log("NfeImport count or error:", nfeCount);
}

main().finally(() => prisma.$disconnect());
