"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductActions } from "@/components/admin/ProductActions";

interface Variant {
    id: string;
    size: string;
    sku: string | null;
    stockQuantity: number;
}

interface Product {
    id: string;
    name: string;
    basePrice: number;
    costPrice: number | null;
    category: string | null;
    supplier: string | null;
    createdAt: Date;
    variants: Variant[];
}

interface ProductListProps {
    initialProducts: Product[];
}

/** Retorna o SKU correspondente à busca, ou o primeiro disponível */
function getDisplaySku(variants: Variant[], searchTerm: string): string | null {
    if (!variants.length) return null;
    
    if (searchTerm) {
        const t = searchTerm.toLowerCase().trim();
        const matchedVariant = variants.find(v => v.sku?.toLowerCase().includes(t));
        if (matchedVariant && matchedVariant.sku) {
            return matchedVariant.sku;
        }
    }
    
    return variants.find(v => v.sku)?.sku ?? null;
}

/** Busca inteligente: verifica nome, categoria, fornecedor e SKU de qualquer variante */
function matchesSearch(product: Product, term: string): boolean {
    if (!term) return true;
    const t = term.toLowerCase().trim();
    if (product.name.toLowerCase().includes(t)) return true;
    if (product.category?.toLowerCase().includes(t)) return true;
    if (product.supplier?.toLowerCase().includes(t)) return true;
    if (product.variants.some(v => v.sku?.toLowerCase().includes(t))) return true;
    return false;
}

export function ProductList({ initialProducts }: ProductListProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredProducts = initialProducts.filter(p => matchesSearch(p, searchTerm));

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <h1 className="text-3xl font-bold text-gray-800">Produtos</h1>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, SKU, categoria..."
                            className="w-full rounded-md border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs font-bold"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <Link href="/products/new">
                        <Button className="gap-2 bg-pink-600 hover:bg-pink-700 whitespace-nowrap">
                            <Plus className="h-4 w-4" />
                            Novo Produto
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Feedback de busca ativa */}
            {searchTerm && (
                <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-700">{filteredProducts.length}</span> resultado{filteredProducts.length !== 1 ? "s" : ""} para{" "}
                    <span className="font-semibold text-pink-600">"{searchTerm}"</span>
                </p>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl border bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Nome</th>
                                <th className="px-4 py-4 font-medium">SKU</th>
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
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        {searchTerm
                                            ? <span>Nenhum produto encontrado para <strong>"{searchTerm}"</strong>.<br /><span className="text-xs">Tente buscar por nome, SKU, categoria ou fornecedor.</span></span>
                                            : "Nenhum produto cadastrado."
                                        }
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => {
                                    const sku = getDisplaySku(product.variants, searchTerm);
                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {product.name}
                                                {product.category && (
                                                    <span className="ml-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{product.category}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {sku ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-mono font-bold border border-gray-200">
                                                        <Tag className="w-2.5 h-2.5" />{sku}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">—</span>
                                                )}
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
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {filteredProducts.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        {searchTerm ? `Nenhum produto encontrado para "${searchTerm}".` : "Nenhum produto cadastrado."}
                    </div>
                ) : (
                    filteredProducts.map((product) => {
                        const sku = getDisplaySku(product.variants, searchTerm);
                        return (
                            <div key={product.id} className="bg-white rounded-xl shadow-sm border p-4">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-gray-900 text-base leading-tight">{product.name}</h3>
                                    <ProductActions productId={product.id} />
                                </div>
                                {sku && (
                                    <span className="inline-flex items-center gap-1 mb-2 px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-xs font-mono border border-gray-200">
                                        <Tag className="w-2.5 h-2.5" />{sku}
                                    </span>
                                )}
                                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                    <div>
                                        <span className="text-gray-500 block text-xs">Preço</span>
                                        <span className="font-bold text-gray-900">R$ {product.basePrice.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block text-xs">Custo</span>
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
                        );
                    })
                )}
            </div>
        </div>
    );
}
