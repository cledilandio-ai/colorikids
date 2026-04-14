const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Adicionando colunas no banco de dados...");
        // Alteração 1: PlatformConfig
        await prisma.$executeRawUnsafe(`ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "platformPixKey" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "platformPlanValue" DOUBLE PRECISION NOT NULL DEFAULT 49.90;`);
        
        console.log("Banco de dados atualizado com sucesso!");
    } catch (e) {
        console.error("Erro:", e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
