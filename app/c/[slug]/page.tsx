import { prisma } from "@/lib/db";
import { StorefrontHome } from "@/components/StorefrontHome";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TenantStorefront({ params }: { params: { slug: string } }) {
    // 1. Encontra a loja baseada no slug da URL
    const store = await prisma.store.findUnique({
        where: { slug: params.slug },
        include: {
            storeConfig: true
        }
    });

    if (!store || store.status !== "ACTIVE") {
        return notFound();
    }

    // 2. Busca apenas os produtos dessa loja
    const products = await prisma.product.findMany({
        where: {
            storeId: store.id,
            active: true,
            variants: {
                some: { stockQuantity: { gt: 0 } }
            }
        },
        orderBy: { createdAt: "desc" },
        include: { variants: true },
    });

    return <StorefrontHome initialProducts={products} storeSlug={params.slug} />;
}
