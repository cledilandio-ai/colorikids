const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting Cleanup...");

    // 1. Delete Ghost Treasury Transaction (from deleted duplicate order)
    // Description contains "7fd40633"
    const ghostTx = await prisma.treasuryTransaction.findFirst({
        where: {
            description: { contains: '7fd40633' },
            type: 'IN'
        }
    });

    if (ghostTx) {
        console.log(`Found Ghost Transaction: ${ghostTx.description} - R$ ${ghostTx.amount}`);
        await prisma.treasuryTransaction.delete({
            where: { id: ghostTx.id }
        });
        console.log("Ghost Transaction Deleted.");
    } else {
        console.log("Ghost Transaction not found (already deleted?).");
    }

    // 2. Delete Test Order (f9765192)
    // I can search by ID or Customer Name "Test Multi Payment"
    const testOrder = await prisma.order.findFirst({
        where: {
            customerName: "Test Multi Payment"
        }
    });

    if (testOrder) {
        console.log(`Found Test Order: ${testOrder.id} - R$ ${testOrder.total}`);

        // Delete related payments first? Prisma might handle cascade, but let's be safe if no cascade.
        await prisma.payment.deleteMany({
            where: { orderId: testOrder.id }
        });
        console.log("Test Order Payments deleted.");

        await prisma.order.delete({
            where: { id: testOrder.id }
        });
        console.log("Test Order Deleted.");
    } else {
        console.log("Test Order not found.");
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
