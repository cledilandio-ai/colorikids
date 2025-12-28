const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Searching for test Internal Transfers (R$ 100 and R$ 5)...");

    const transactions = await prisma.treasuryTransaction.findMany({
        where: {
            type: 'IN',
            category: 'INTERNAL_TRANSFER',
            amount: { in: [100, 5] }
        }
    });

    if (transactions.length === 0) {
        console.log("No transactions found.");
        return;
    }

    console.log(`Found ${transactions.length} transactions to delete:`);
    transactions.forEach(t => {
        console.log(`- [${t.date.toISOString().split('T')[0]}] ${t.description} (R$ ${t.amount}) - ID: ${t.id}`);
    });

    // Delete
    const { count } = await prisma.treasuryTransaction.deleteMany({
        where: {
            id: { in: transactions.map(t => t.id) }
        }
    });

    console.log(`\nDeleted ${count} transactions.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
