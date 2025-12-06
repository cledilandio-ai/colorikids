import Link from "next/link";
import { Plus, Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { ProductActions } from "@/components/admin/ProductActions";
import { RestockButton } from "@/components/admin/RestockButton";

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Produtos</h1>
                <div className="flex gap-2">
                    <RestockButton products={products} />
                    <Link href="/products/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Produto
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="rounded-xl border bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Nome</th>
                                <th className="px-6 py-4 font-medium">Preço Base</th>
                                <th className="px-6 py-4 font-medium">Custo</th>
                                <th className="px-6 py-4 font-medium">Estoque Total</th>
                                <th className="px-6 py-4 font-medium">Variantes (Grade)</th>
                                <th className="px-6 py-4 font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Nenhum produto cadastrado.
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {product.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            R$ {product.basePrice.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            R$ {(product.costPrice || 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {product.variants.reduce((acc, v) => acc + v.stockQuantity, 0)} un
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {product.variants.length} tamanhos
                                        </td>
                                        <td className="px-6 py-4">
                                            <ProductActions productId={product.id} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
