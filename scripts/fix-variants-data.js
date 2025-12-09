
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando padronização de Tamanhos e Cores...');

    const variants = await prisma.productVariant.findMany();
    console.log(`Encontradas ${variants.length} variantes.`);

    let updatedCount = 0;

    for (const variant of variants) {
        let newSize = variant.size;
        let newColor = variant.color;
        let needsUpdate = false;

        // Padronizar Tamanho: se for apenas números, adicionar " Anos"
        if (/^\d+$/.test(variant.size)) {
            newSize = `${variant.size} Anos`;
            needsUpdate = true;
        }

        // Padronizar Cor: tudo para maiúsculo
        if (variant.color && variant.color !== variant.color.toUpperCase()) {
            newColor = variant.color.toUpperCase();
            needsUpdate = true;
        }

        if (needsUpdate) {
            console.log(`Atualizando Variant ID ${variant.id}: Size "${variant.size}" -> "${newSize}", Color "${variant.color}" -> "${newColor}"`);
            await prisma.productVariant.update({
                where: { id: variant.id },
                data: {
                    size: newSize,
                    color: newColor
                }
            });
            updatedCount++;
        }
    }

    console.log(`Concluído! ${updatedCount} variantes foram atualizadas.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
