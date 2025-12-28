const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const keywords = ['diferença', 'sobra', 'falta', 'quebra', 'teste'];

    console.log("Searching for transactions to delete with keywords:", keywords);

    const transactions = await prisma.treasuryTransaction.findMany({
        where: {
            OR: keywords.map(k => ({ description: { contains: k, mode: 'insensitive' } }))
        }
    });

    if (transactions.length === 0) {
        console.log("No transactions found matching keywords.");
        return;
    }

    console.log(`Found ${transactions.length} transactions to delete:`);
    transactions.forEach(t => {
        console.log(`- [${t.type}] ${t.date.toISOString().split('T')[0]} : ${t.description} (R$ ${t.amount})`);
    });

    // Execute deletion
    const { count } = await prisma.treasuryTransaction.deleteMany({
        where: {
            id: { in: transactions.map(t => t.id) }
        }
    });

    console.log(`\nSuccessfully deleted ${count} transactions.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
