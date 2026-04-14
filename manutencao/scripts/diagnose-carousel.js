process.env.DATABASE_URL_POOLER = "postgresql://postgres.fmkcqciijcphyibzxkmr:3QDzXfUYJ1JmFz1N@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- DIAGNOSTICO PRODUTO 'Polo piquet' ---");
    const product = await prisma.product.findFirst({
        where: { name: { contains: "Polo", mode: 'insensitive' } },
        include: { variants: true }
    });

    if (!product) {
        console.log("Produto não encontrado.");
        return;
    }

    console.log(`Produto: ${product.name} (ID: ${product.id})`);
    console.log(`Imagem Principal: ${product.imageUrl}`);
    console.log("--- VARIANTES ---");
    product.variants.forEach(v => {
        console.log(`Cor: ${v.color} | Tam: ${v.size} | Img: ${v.imageUrl ? 'SIM' : 'NÃO'} (${v.imageUrl})`);
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
