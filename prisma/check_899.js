const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const start = new Date('2025-12-01T00:00:00.000Z');
    const end = new Date('2025-12-31T23:59:59.999Z');

    // 1. Total Recolhido (Apenas o real, já limpamos os testes)
    const transfers = await prisma.treasuryTransaction.findMany({
        where: {
            date: { gte: start, lte: end },
            type: 'IN',
            category: 'INTERNAL_TRANSFER'
        }
    });
    const totalRecolhido = transfers.reduce((acc, t) => acc + t.amount, 0);
    console.log(`Total Recolhido: R$ ${totalRecolhido.toFixed(2)}`);

    // 2. Total Vendido em Dinheiro
    const orders = await prisma.order.findMany({
        where: {
            createdAt: { gte: start, lte: end },
            status: 'COMPLETED'
        },
        include: { payments: true }
    });

    let vendasDinheiro = 0;
    orders.forEach(o => {
        if (o.payments && o.payments.length > 0) {
            o.payments.forEach(p => {
                if (['CASH', 'DINHEIRO'].includes(p.method.toUpperCase())) {
                    vendasDinheiro += p.amount;
                }
            });
        }
    });
    console.log(`Total Vendas em Dinheiro: R$ ${vendasDinheiro.toFixed(2)}`);

    // 3. Diferença
    const diff = vendasDinheiro - totalRecolhido;
    console.log(`Diferença (Ficou no caixa?): R$ ${diff.toFixed(2)}`);

    if (Math.abs(diff - 8.99) < 0.01) {
        console.log("CONFIRMADO: A diferença é dinheiro vendido não recolhido.");
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
