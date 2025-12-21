import { prisma } from "@/lib/db";
import { StorefrontHome } from "@/components/StorefrontHome";

export const dynamic = "force-dynamic";

// Página Inicial (Home) - Renderizada no Servidor
export default async function Home() {
    // Busca produtos ativos e com estoque maior que zero
    // Ordena pelos mais recentes
    const products = await prisma.product.findMany({
        where: {
            active: true,
            variants: {
                some: {
                    stockQuantity: {
                        gt: 0
                    }
                }
            }
        },
        orderBy: { createdAt: "desc" },
        include: { variants: true },
    });

    return <StorefrontHome initialProducts={products} />;
}
