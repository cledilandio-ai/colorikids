import { prisma } from "@/lib/db";
import { StorefrontHome } from "@/components/StorefrontHome";

export const dynamic = "force-dynamic";

export default async function Home() {
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
