import { prisma } from "@/lib/db";
import { ProductList } from "@/components/admin/ProductList";
import { getServerAuthContext } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: { searchParams: { lowStock?: string } }) {
    const ctx = await getServerAuthContext();
    if (!ctx || !ctx.storeId) {
        redirect("/login");
    }

    const where: any = searchParams.lowStock === "true"
        ? { variants: { some: { stockQuantity: { lte: 5 } } }, active: true, storeId: ctx.storeId }
        : { active: true, storeId: ctx.storeId };

    const products = await prisma.product.findMany({
        where,
        select: {
            id: true,
            name: true,
            basePrice: true,
            costPrice: true,
            category: true,
            supplier: true,
            createdAt: true,
            variants: {
                where: { active: true },
                select: {
                    id: true,
                    size: true,
                    sku: true,
                    stockQuantity: true,
                }
            }
        },
        orderBy: { createdAt: "desc" },
    });

    return <ProductList initialProducts={products} />;
}
