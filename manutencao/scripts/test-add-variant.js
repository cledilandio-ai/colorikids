const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Teste de Adição de Variante ---');

    // 1. Pegar um produto existente
    const product = await prisma.product.findFirst();
    if (!product) {
        console.error("Nenhum produto encontrado para testar.");
        return;
    }
    console.log(`Produto encontrado: ${product.name} (${product.id})`);

    // 2. Criar payload com uma nova variante (sem ID)
    // Simulando o envio do frontend: variantes existentes (com ID) + nova (sem ID)
    const existingVariants = await prisma.productVariant.findMany({
        where: { productId: product.id }
    });

    console.log(`Variantes atuais: ${existingVariants.length}`);

    const variantsPayload = existingVariants.map(v => ({
        id: v.id,
        size: v.size,
        color: v.color,
        stockQuantity: v.stockQuantity.toString(), // Frontend sends string
        imageUrl: v.imageUrl,
        sku: v.sku
    }));

    // Adicionar Nova Variante de Teste
    const uniqueColor = "CorTeste_" + Date.now();
    variantsPayload.push({
        size: "10 Anos",
        color: uniqueColor,
        stockQuantity: "5",
        imageUrl: "",
        // sku: undefined/null (deixa backend gerar)
    });

    // 3. Chamar a API (simulada via função direta do Prisma para bypassar HTTP stack local, 
    // mas o ideal seria testar a lógica da rota. Como não posso chamar 'route.ts' diretamente do node fácil sem mock,
    // vou replicar a EXATA lógica do endpoint aqui para ver se o Prisma Transaction funciona).

    // Replicação da lógica do PUT /api/products/[id]
    console.log("Executando transação de update...");

    try {
        const id = product.id;
        const variants = variantsPayload;
        const variantsToUpdate = variants.filter(v => v.id);
        const variantsToCreate = variants.filter(v => !v.id);

        const currentDbIds = existingVariants.map(v => v.id);
        const incomingIds = variantsToUpdate.map(v => v.id);
        const idsToDelete = currentDbIds.filter(dbId => !incomingIds.includes(dbId));

        await prisma.$transaction(async (tx) => {
            // Update Product
            await tx.product.update({
                where: { id },
                data: {
                    updatedAt: new Date() // Just touching
                }
            });

            // Delete
            if (idsToDelete.length > 0) {
                await tx.productVariant.deleteMany({ where: { id: { in: idsToDelete } } });
            }

            // Update Sequential
            if (variantsToUpdate.length > 0) {
                for (const v of variantsToUpdate) {
                    await tx.productVariant.update({
                        where: { id: v.id },
                        data: { stockQuantity: parseInt(v.stockQuantity) || 0 }
                    });
                }
            }

            // Create
            if (variantsToCreate.length > 0) {
                const dataToCreate = variantsToCreate.map(v => ({
                    productId: id,
                    size: v.size,
                    color: v.color,
                    stockQuantity: parseInt(v.stockQuantity) || 0,
                    imageUrl: v.imageUrl,
                    sku: `${product.name.substring(0, 3)}-TEST-${Date.now()}`
                }));
                await tx.productVariant.createMany({ data: dataToCreate });
            }
        }, { maxWait: 5000, timeout: 10000 });

        console.log("Transação concluída com sucesso.");

        // 4. Verificar se persistiu
        const updatedVariants = await prisma.productVariant.findMany({
            where: { productId: product.id, color: uniqueColor }
        });

        if (updatedVariants.length > 0) {
            console.log("SUCESSO: Nova variante encontrada no banco!");
            console.log(updatedVariants);
        } else {
            console.error("FALHA: Nova variante NÃO encontrada no banco.");
        }

    } catch (e) {
        console.error("ERRO NA TRANSAÇÃO:", e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
