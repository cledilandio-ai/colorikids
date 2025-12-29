const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching recent orders...");

    const orders = await prisma.order.findMany({
        take: 10,
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            payments: true
        }
    });

    console.log(`Found ${orders.length} recent orders:`);
    orders.forEach(o => {
        console.log(`[${o.status}] ID: ${o.id.slice(0, 8)} | Time: ${o.createdAt.toLocaleString()} | Total: ${o.total} | Items: ${o.items.slice(0, 100)}...`);
        if (o.payments && o.payments.length > 0) {
            console.log(`   Payments: ${o.payments.map(p => `${p.method}: ${p.amount}`).join(', ')}`);
        }
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
