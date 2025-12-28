const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Inserting adjustment transaction for R$ 8.99...");

    // Criar transação de Recolhimento Complementar
    const transaction = await prisma.treasuryTransaction.create({
        data: {
            amount: 8.99,
            type: 'IN',
            category: 'INTERNAL_TRANSFER',
            description: 'Ajuste - Saldo em Caixa (Não Recolhido)',
            date: new Date() // Data de hoje
        }
    });

    console.log(`Transaction created with ID: ${transaction.id}`);
    console.log("Adjustment applied successfully.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
