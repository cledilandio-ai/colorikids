import { prisma } from "@/lib/db";
import { StorefrontHome } from "@/components/StorefrontHome";

export default async function Home() {
    const products = await prisma.product.findMany({
        orderBy: { createdAt: "desc" },
    });

    return <StorefrontHome initialProducts={products} />;
}
