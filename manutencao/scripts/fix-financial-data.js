process.env.DATABASE_URL_POOLER = "postgresql://postgres.fmkcqciijcphyibzxkmr:3QDzXfUYJ1JmFz1N@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- INICIANDO CORREÇÃO ---");

    // 1. Remover transação do produto teste
    const deleteResult = await prisma.treasuryTransaction.deleteMany({
        where: {
            description: { contains: "teste", mode: 'insensitive' }
            // Using description filter as an extra safety measure alongside ID if I had it hardcoded, 
            // but here I'll rely on the description as seen in logs "Estoque Inicial - teste"
        }
    });
    console.log(`Transações 'teste' removidas: ${deleteResult.count}`);

    // 2. Corrigir Custo do Produto "Polo piquet" e Inserir Transação
    // ID identificado: bcc50663-6494-45d9-99f9-59ce7a30ceab
    const productId = "bcc50663-6494-45d9-99f9-59ce7a30ceab";
    const productName = "Polo piquet";
    const correctCost = 35.00;
    const totalStock = 8;
    const totalAmount = totalStock * correctCost; // 280.00

    // Update product cost
    await prisma.product.update({
        where: { id: productId },
        data: { costPrice: correctCost }
    });
    console.log(`Produto '${productName}' atualizado com custo R$ ${correctCost}`);

    // Insert Transaction
    await prisma.treasuryTransaction.create({
        data: {
            description: `Estoque Inicial - ${productName}`,
            amount: totalAmount,
            type: "OUT",
            category: "COMPRA_PRODUTO",
            date: new Date()
        }
    });
    console.log(`Transação criada: ${productName} | Valor: R$ ${totalAmount}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
