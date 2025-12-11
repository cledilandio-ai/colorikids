"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductActions } from "@/components/admin/ProductActions";

interface Variant {
    id: string;
    stockQuantity: number;
}

interface Product {
    id: string;
    name: string;
    basePrice: number;
    costPrice: number | null;
    createdAt: Date;
    variants: Variant[];
}

interface ProductListProps {
    initialProducts: Product[];
}

export function ProductList({ initialProducts }: ProductListProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredProducts = initialProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <h1 className="text-3xl font-bold text-gray-800">Produtos</h1>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Buscar produtos..."
                            className="w-full rounded-md border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-green-500 focus:ring-green-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Link href="/products/new">
                        <Button className="gap-2 bg-pink-600 hover:bg-pink-700 whitespace-nowrap">
                            <Plus className="h-4 w-4" />
                            Novo Produto
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl border bg-white shadow-sm">
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
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        {searchTerm ? "Nenhum produto encontrado na busca." : "Nenhum produto cadastrado."}
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => (
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

            {/* Mobile Cards (Visible only on mobile) */}
            <div className="md:hidden space-y-4">
                {filteredProducts.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        {searchTerm ? "Nenhum produto encontrado na busca." : "Nenhum produto cadastrado."}
                    </div>
                ) : (
                    filteredProducts.map((product) => (
                        <div key={product.id} className="bg-white rounded-xl shadow-sm border p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                                <ProductActions productId={product.id} />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                <div>
                                    <span className="text-gray-500 block">Preço</span>
                                    <span className="font-bold text-gray-900">R$ {product.basePrice.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Custo</span>
                                    <span className="font-medium text-gray-700">R$ {(product.costPrice || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                                <div className="flex flex-col">
                                    <span className="text-gray-500 text-xs">Estoque Total</span>
                                    <span className="font-medium">{product.variants.reduce((acc, v) => acc + v.stockQuantity, 0)} un</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-gray-500 text-xs">Variações</span>
                                    <span className="font-medium">{product.variants.length}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
