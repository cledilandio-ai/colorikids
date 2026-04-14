const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({
        include: {
            users: {
                select: { id: true, email: true, role: true }
            },
            storeConfig: true
        }
    });

    console.log("=== STORES IN DB ===");
    for (const s of stores) {
        console.log(`- Store ID: ${s.id} | Slug: ${s.slug}`);
        console.log(`  Config Name: ${s.storeConfig?.companyName || "N/A"}`);
        console.log(`  Users: ${s.users.map(u => u.email).join(', ')}`);
        
        // Let's count some data
        const orders = await prisma.order.count({ where: { storeId: s.id } });
        const products = await prisma.product.count({ where: { storeId: s.id } });
        console.log(`  Data: ${orders} Orders, ${products} Products`);
        console.log('---------------------');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
