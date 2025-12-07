import { prisma } from "@/lib/db";
import { StorefrontHome } from "@/components/StorefrontHome";

export const dynamic = "force-dynamic";

export default async function Home() {
    const products = await prisma.product.findMany({
        orderBy: { createdAt: "desc" },
    });

    return <StorefrontHome initialProducts={products} />;
}
