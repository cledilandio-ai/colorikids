const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Definindo um range amplo para pegar tudo conforme o print (parece ser Dezembro/2025)
    // O print mostra datas 27/12 e 28/12. Vamos pegar desde 01/12/2025
    const start = new Date('2025-12-01T00:00:00.000Z');
    const end = new Date('2025-12-31T23:59:59.999Z');

    console.log("--- TREASURY TRANSACTIONS (ENTRADAS) ---");
    const transactions = await prisma.treasuryTransaction.findMany({
        where: {
            date: { gte: start, lte: end },
            type: 'IN'
        },
        orderBy: { date: 'desc' }
    });

    let totalIn = 0;
    transactions.forEach(t => {
        console.log(`[${t.date.toISOString().split('T')[0]}] ${t.description} | Cat: ${t.category} | R$ ${t.amount}`);
        totalIn += t.amount;
    });
    console.log(`TOTAL IN: R$ ${totalIn.toFixed(2)}`);

    console.log("\n--- SALES DATA (VENDAS / MARGEM) ---");
    // Vendas vem de quais tabelas? O componente FinanceTabs recebe 'salesData'.
    // Precisamos simular a query que gera 'salesData'. Geralmente Order ou ProductSales.
    // Vamos olhar Order
    const orders = await prisma.order.findMany({
        where: {
            createdAt: { gte: start, lte: end },
            status: 'COMPLETED' // Assumindo que só completas contam?
        },
        include: { payments: true }
    });

    let totalSales = 0;
    orders.forEach(o => {
        console.log(`[${o.createdAt.toISOString().split('T')[0]}] Compra ${o.customerName} | R$ ${o.total}`);
        totalSales += o.total;
    });
    console.log(`TOTAL SALES: R$ ${totalSales.toFixed(2)}`);

    const diff = totalIn - totalSales;
    console.log(`\nDIFERENÇA (IN - SALES): R$ ${diff.toFixed(2)}`);

    // Tentar achar transação isolada com esse valor
    const suspect = transactions.find(t => Math.abs(t.amount - Math.abs(diff)) < 0.1);
    if (suspect) {
        console.log("\n!!! Transação Suspeita Encontrada (Valor bate com a diferença):");
        console.log(suspect);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
