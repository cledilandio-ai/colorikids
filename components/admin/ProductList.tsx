"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Tag, FileText, Printer, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductActions } from "@/components/admin/ProductActions";
import { LabelPrinterModal, type LabelItem } from "@/components/admin/labels/LabelPrinterModal";

interface Variant {
    id: string;
    size: string;
    color?: string | null;
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
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // State do modal de etiquetas
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printItems, setPrintItems] = useState<LabelItem[]>([]);

    const filteredProducts = initialProducts.filter(p => matchesSearch(p, searchTerm));

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProducts.map(p => p.id));
        }
    };

    const toggleSelectProduct = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Imprimir 1 produto (suas variantes)
    const handlePrintSingleProduct = (product: Product) => {
        const itemsToPrint: LabelItem[] = product.variants.map((v, idx) => ({
            id: v.id,
            sku: v.sku || `${product.name.substring(0, 3)}-${v.size}-${idx}`,
            productName: product.name,
            size: v.size,
            color: v.color || null,
            price: product.basePrice,
            quantity: Math.max(1, v.stockQuantity)
        }));
        setPrintItems(itemsToPrint);
        setPrintModalOpen(true);
    };

    // Imprimir lote selecionado
    const handlePrintBatch = () => {
        const selectedProducts = initialProducts.filter(p => selectedIds.includes(p.id));
        const itemsToPrint: LabelItem[] = [];

        selectedProducts.forEach(product => {
            product.variants.forEach((v, idx) => {
                itemsToPrint.push({
                    id: v.id,
                    sku: v.sku || `${product.name.substring(0, 3)}-${v.size}-${idx}`,
                    productName: product.name,
                    size: v.size,
                    color: v.color || null,
                    price: product.basePrice,
                    quantity: Math.max(1, v.stockQuantity)
                });
            });
        });

        setPrintItems(itemsToPrint);
        setPrintModalOpen(true);
    };

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
                    <Link href="/admin/estoque/nfe">
                        <Button variant="outline" className="gap-2 border-green-300 text-green-700 hover:bg-green-50 whitespace-nowrap">
                            <FileText className="h-4 w-4" />
                            Importar NF-e
                        </Button>
                    </Link>
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
                    <span className="font-semibold text-pink-600">&quot;{searchTerm}&quot;</span>
                </p>
            )}

            {/* Barra Flutuante de Ação em Lote */}
            {selectedIds.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-pink-200 bg-pink-50 px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-600 text-xs font-bold text-white">
                            {selectedIds.length}
                        </span>
                        <span className="text-sm font-semibold text-pink-900">
                            produto(s) selecionado(s)
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedIds([])}
                            className="text-xs font-medium text-pink-700 hover:text-pink-900"
                        >
                            Desmarcar tudo
                        </button>
                        <Button
                            onClick={handlePrintBatch}
                            className="gap-2 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-sm"
                        >
                            <Printer className="h-4 w-4" />
                            Imprimir Etiquetas em Lote
                        </Button>
                    </div>
                </div>
            )}

            {/* Desktop Table */}
            <div className="hidden md:block rounded-xl border bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="w-12 px-4 py-4 text-center">
                                    <input
                                        type="checkbox"
                                        checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                                    />
                                </th>
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
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        {searchTerm
                                            ? <span>Nenhum produto encontrado para <strong>&quot;{searchTerm}&quot;</strong>.<br /><span className="text-xs">Tente buscar por nome, SKU, categoria ou fornecedor.</span></span>
                                            : "Nenhum produto cadastrado."
                                        }
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product) => {
                                    const sku = getDisplaySku(product.variants, searchTerm);
                                    const isSelected = selectedIds.includes(product.id);

                                    return (
                                        <tr key={product.id} className={`transition-colors ${isSelected ? "bg-pink-50/40" : "hover:bg-gray-50"}`}>
                                            <td className="w-12 px-4 py-4 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectProduct(product.id)}
                                                    className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                                                />
                                            </td>
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
                                                <ProductActions
                                                    productId={product.id}
                                                    onPrint={() => handlePrintSingleProduct(product)}
                                                />
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
                        {searchTerm ? `Nenhum produto encontrado para &quot;${searchTerm}&quot;.` : "Nenhum produto cadastrado."}
                    </div>
                ) : (
                    filteredProducts.map((product) => {
                        const sku = getDisplaySku(product.variants, searchTerm);
                        const isSelected = selectedIds.includes(product.id);

                        return (
                            <div key={product.id} className={`bg-white rounded-xl shadow-sm border p-4 transition-all ${isSelected ? "border-pink-300 ring-1 ring-pink-300 bg-pink-50/20" : ""}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectProduct(product.id)}
                                            className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                                        />
                                        <h3 className="font-bold text-gray-900 text-base leading-tight">{product.name}</h3>
                                    </div>
                                    <ProductActions
                                        productId={product.id}
                                        onPrint={() => handlePrintSingleProduct(product)}
                                    />
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

            {/* Modal de Impressão de Etiquetas */}
            <LabelPrinterModal
                isOpen={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                items={printItems}
            />
        </div>
    );
}
