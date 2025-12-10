import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("🛠️ Iniciando correção de dados de estoque...");

    // 1. Definir minStock = 1 para todas as variantes onde for nulo ou 0
    // (Na verdade, o schema diz Int @default(1), mas dados antigos podem estar null se for optional ou 0)
    // Se o schema for Int não-nulável com default, o prisma já deve ter preenchido, mas vamos garantir.
    // Se for Int?, então precisamos preencher.
    // O schema diz `minStock Int @default(1)`. Então novos são ok.
    // Mas dados existentes antes da migration podem estar 1 (pelo default applied) ou precisam de update.
    // Vamos garantir.

    const variants = await prisma.productVariant.findMany({});

    console.log(`🔎 Analisando ${variants.length} variantes...`);

    let updatedCount = 0;

    for (const v of variants) {
        let needsUpdate = false;
        let updateData: any = {};

        const variant = v as any;

        // Regra 1: minStock deve ser pelo menos 1
        if (!variant.minStock || variant.minStock < 1) {
            updateData.minStock = 1;
            needsUpdate = true;
        }

        // Regra 2: lastRestockAt deve existir se houver estoque positivo
        if (variant.stockQuantity > 0 && !variant.lastRestockAt) {
            updateData.lastRestockAt = new Date(); // Define como HOJE
            needsUpdate = true;
        }

        if (needsUpdate) {
            await prisma.productVariant.update({
                where: { id: v.id },
                data: updateData
            });
            updatedCount++;
        }
    }

    console.log(`✅ Concluído! ${updatedCount} variantes foram atualizadas.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
