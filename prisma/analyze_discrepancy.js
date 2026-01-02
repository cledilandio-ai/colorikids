const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`Analyzing for date: ${today.toISOString()}`);

    // 1. Get Orders (Receita Bruta)
    const orders = await prisma.order.findMany({
        where: {
            createdAt: { gte: today, lt: tomorrow },
            status: 'COMPLETED',
            active: true
        },
        include: { payments: true }
    });

    const totalOrders = orders.reduce((acc, o) => acc + o.total, 0);
    console.log(`Total Orders (Receita Bruta): R$ ${totalOrders.toFixed(2)}`);

    // Breakdown by payment method
    const ordersByMethod = {};
    orders.forEach(o => {
        o.payments.forEach(p => {
            const m = p.method;
            ordersByMethod[m] = (ordersByMethod[m] || 0) + p.amount;
        });
    });
    console.log("Orders by Method:", ordersByMethod);


    // 2. Get Treasury Transactions (Entradas)
    const transactions = await prisma.treasuryTransaction.findMany({
        where: {
            date: { gte: today, lt: tomorrow },
            type: 'IN',
            category: { not: 'INTERNAL_TRANSFER' }
        }
    });

    console.log("--- Treasury Transactions ---");
    transactions.forEach(t => console.log(`${t.description}: R$ ${t.amount} (${t.category})`));

    const totalTreasury = transactions.reduce((acc, t) => acc + t.amount, 0);
    console.log(`Total Treasury (Entradas): R$ ${totalTreasury.toFixed(2)}`);

    console.log(`Difference: R$ ${(totalOrders - totalTreasury).toFixed(2)}`);

    // 3. Analyze what is in Orders but likely not in Treasury
    // Typically: DINHEIRO (if not recollected) and CREDIARIO.
    const notInTreasuryExpectation = (ordersByMethod['DINHEIRO'] || 0) + (ordersByMethod['CREDIARIO'] || 0);
    console.log(`Expected Difference (Money + Crediario): R$ ${notInTreasuryExpectation.toFixed(2)}`);

    // Check if Cash has been recollected (INTERNAL_TRANSFER)
    const transfers = await prisma.treasuryTransaction.findMany({
        where: {
            date: { gte: today, lt: tomorrow },
            type: 'IN',
            category: 'INTERNAL_TRANSFER'
        }
    });
    const totalTransfers = transfers.reduce((acc, t) => acc + t.amount, 0);
    console.log(`Internal Transfers (Cash Recollection): R$ ${totalTransfers.toFixed(2)}`);

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
