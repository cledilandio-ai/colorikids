process.env.DATABASE_URL_POOLER = "postgresql://postgres.fmkcqciijcphyibzxkmr:3QDzXfUYJ1JmFz1N@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- PRODUTOS RECENTES ---");
    const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { variants: true }
    });
    products.forEach(p => {
        const totalStock = p.variants.reduce((acc, v) => acc + v.stockQuantity, 0);
        console.log(`ID: ${p.id} | Nome: ${p.name} | Preço Custo: ${p.costPrice} | Estoque Total: ${totalStock}`);
    });

    console.log("\n--- TRANSAÇÕES RECENTES (Últimas 10) ---");
    const transactions = await prisma.treasuryTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    transactions.forEach(t => {
        console.log(`ID: ${t.id} | Desc: ${t.description} | Valor: ${t.amount} | Tipo: ${t.type} | Cat: ${t.category}`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
