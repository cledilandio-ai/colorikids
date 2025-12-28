const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Searching TreasuryTransactions...");
    const transactions = await prisma.treasuryTransaction.findMany({
        where: {
            OR: [
                { description: { contains: 'diferença', mode: 'insensitive' } },
                { description: { contains: 'sobra', mode: 'insensitive' } },
                { description: { contains: 'falta', mode: 'insensitive' } },
                { description: { contains: 'teste', mode: 'insensitive' } }
            ]
        },
        orderBy: { date: 'desc' },
        take: 50
    });

    console.log(`Found ${transactions.length} TreasuryTransactions:`);
    transactions.forEach(t => {
        console.log(`[${t.type}] ${t.date.toISOString().split('T')[0]} - ${t.description} (R$ ${t.amount}) - ID: ${t.id}`);
    });

    console.log("\nSearching CashTransactions...");
    const cashTransactions = await prisma.cashTransaction.findMany({
        where: {
            OR: [
                { description: { contains: 'diferença', mode: 'insensitive' } },
                { description: { contains: 'sobra', mode: 'insensitive' } },
                { description: { contains: 'falta', mode: 'insensitive' } },
                { description: { contains: 'teste', mode: 'insensitive' } }
            ]
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
    console.log(`Found ${cashTransactions.length} CashTransactions:`);
    cashTransactions.forEach(t => {
        console.log(`[${t.type}] ${t.createdAt.toISOString().split('T')[0]} - ${t.description} (R$ ${t.amount}) - ID: ${t.id}`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
