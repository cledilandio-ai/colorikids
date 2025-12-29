const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Checking for negative stock...");

    const negativeVariants = await prisma.productVariant.findMany({
        where: {
            stockQuantity: {
                lt: 0
            }
        },
        include: {
            product: true
        }
    });

    console.log(`Found ${negativeVariants.length} variants with negative stock.`);

    for (const variant of negativeVariants) {
        console.log(`Fixing: ${variant.product.name} - ${variant.size} ${variant.color || ''} (Current: ${variant.stockQuantity})`);

        await prisma.productVariant.update({
            where: { id: variant.id },
            data: { stockQuantity: 0 }
        });

        // Optional: Log this adjustment?
        console.log(`  -> Reset to 0`);
    }

    console.log("Done.");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
