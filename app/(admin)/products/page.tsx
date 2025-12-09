import { prisma } from "@/lib/db";
import { ProductList } from "@/components/admin/ProductList";

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: { searchParams: { lowStock?: string } }) {
    const where = searchParams.lowStock === "true"
        ? { variants: { some: { stockQuantity: { lte: 5 } } } }
        : {};

    const products = await prisma.product.findMany({
        where,
        include: { variants: true },
        orderBy: { createdAt: "desc" },
    });

    return <ProductList initialProducts={products} />;
}
