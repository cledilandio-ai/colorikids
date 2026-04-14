/**
 * SCRIPT: Corrigir o Nome da Empresa da Colorikids
 * O companyName foi alterado para "claudete_boutique" causando confusão.
 * 
 * Execute: node scripts/fix-colorikids-name.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const COLORIKIDS_STORE_ID = "00000000-0000-0000-0000-colorikids01";

    const before = await prisma.storeConfig.findUnique({
        where: { storeId: COLORIKIDS_STORE_ID },
        select: { companyName: true }
    });
    console.log("Nome atual da Colorikids:", before?.companyName);

    await prisma.storeConfig.update({
        where: { storeId: COLORIKIDS_STORE_ID },
        data: { companyName: "Colorikids" }
    });

    console.log("✅ Nome corrigido para 'Colorikids'");
}

main().catch(console.error).finally(() => prisma.$disconnect());
