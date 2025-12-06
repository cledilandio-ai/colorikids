import { prisma } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ProductDetails from "@/components/ProductDetails";

export default async function ProductDetailsPage({ params }: { params: { id: string } }) {
    const product = await prisma.product.findUnique({
        where: { id: params.id },
        include: { variants: true },
    });

    if (!product) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="container mx-auto px-4 py-20 text-center">
                    <h1 className="text-2xl font-bold text-gray-800">Produto não encontrado</h1>
                    <Link href="/">
                        <Button className="mt-4">Voltar para a Loja</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return <ProductDetails product={product} />;
}
