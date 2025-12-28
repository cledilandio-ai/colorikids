const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const start = new Date('2025-12-01T00:00:00.000Z');
    const end = new Date('2025-12-31T23:59:59.999Z');

    // Buscar todas as Orders completas com seus Payments
    const orders = await prisma.order.findMany({
        where: {
            createdAt: { gte: start, lte: end },
            status: 'COMPLETED'
        },
        include: { payments: true }
    });

    const totalsByMethod = {};
    let totalSales = 0;

    orders.forEach(o => {
        totalSales += o.total;

        // Se tiver pagamentos registrados na relação
        if (o.payments && o.payments.length > 0) {
            o.payments.forEach(p => {
                const method = p.method || 'UNKNOWN';
                totalsByMethod[method] = (totalsByMethod[method] || 0) + p.amount;
            });
        } else {
            // Fallback para campo legado ou assumir algo se necessário
            // Mas vamos listar como 'NO_PAYMENT_RECORD'
            const method = 'NO_PAYMENT_RECORD';
            totalsByMethod[method] = (totalsByMethod[method] || 0) + o.total;
        }
    });

    console.log("--- VENDAS POR MÉTODO DE PAGAMENTO ---");
    for (const [method, amount] of Object.entries(totalsByMethod)) {
        console.log(`${method}: R$ ${amount.toFixed(2)}`);
    }
    console.log(`TOTAL SALES: R$ ${totalSales.toFixed(2)}`);

    // Calcular Recolhimentos (Internal Transfers)
    const transfers = await prisma.treasuryTransaction.findMany({
        where: {
            date: { gte: start, lte: end },
            type: 'IN',
            category: 'INTERNAL_TRANSFER'
        }
    });

    const totalTransfers = transfers.reduce((acc, t) => acc + t.amount, 0);
    console.log(`\nTOTAL RECOLHIMENTOS (INTERNAL_TRANSFER): R$ ${totalTransfers.toFixed(2)}`);

    // Calcular Vendas "Digitais" (que geram entrada automática)
    // Assumindo que PIX, CREDIT, DEBIT geram entrada automática no Treasury
    // E CASH não gera.
    let digitalSales = 0;
    let cashSales = 0;

    for (const [method, amount] of Object.entries(totalsByMethod)) {
        if (['CASH', 'DINHEIRO'].includes(method.toUpperCase())) {
            cashSales += amount;
        } else {
            digitalSales += amount;
        }
    }

    console.log(`\nVendas DINHEIRO: R$ ${cashSales.toFixed(2)}`);
    console.log(`Vendas DIGITAIS: R$ ${digitalSales.toFixed(2)}`);

    const expectedIn = digitalSales + totalTransfers;
    console.log(`\nEntradas Esperadas (Digitais + Recolhimentos): R$ ${expectedIn.toFixed(2)}`);

    // Diferença explicada
    console.log(`Diferença (Recolhimentos - Vendas Dinheiro): R$ ${(totalTransfers - cashSales).toFixed(2)}`);

}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
