"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, PackagePlus, X, Trash } from "lucide-react";
import { useRouter } from "next/navigation";

interface Variant {
    id: string;
    size: string;
    color: string | null;
    stockQuantity: number;
    sku?: string | null;
}

interface Product {
    id: string;
    name: string;
    costPrice: number;
    variants: Variant[];
}

interface RestockButtonProps {
    products?: Product[];
    preSelectedProduct?: Product;
}

export function RestockButton({ products = [], preSelectedProduct }: RestockButtonProps) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // State for bulk inputs: string map keyed by variantId
    const [bulkQuantities, setBulkQuantities] = useState<Record<string, string>>({});
    const [bulkCosts, setBulkCosts] = useState<Record<string, string>>({});

    const [selectedProductId, setSelectedProductId] = useState("");

    // State for multiple new variants
    const [newVariants, setNewVariants] = useState<Array<{
        id: string; // temp id for UI
        size: string;
        color: string;
        qty: string;
        cost: string;
        image: string;
    }>>([]);

    // If preSelectedProduct is provided, we use it. 
    // Otherwise we look up in the products array by ID.
    const selectedProduct = preSelectedProduct || products.find(p => p.id === selectedProductId);

    useEffect(() => {
        if (showModal && preSelectedProduct) {
            handleSelectProduct(preSelectedProduct);
        }
    }, [showModal, preSelectedProduct]);

    const addNewVariantRow = () => {
        setNewVariants([...newVariants, {
            id: Date.now().toString(),
            size: "",
            color: "",
            qty: "",
            cost: "",
            image: ""
        }]);
    };

    const removeNewVariantRow = (id: string) => {
        setNewVariants(newVariants.filter(v => v.id !== id));
    };

    const updateNewVariantRow = (id: string, field: keyof typeof newVariants[0], value: string) => {
        setNewVariants(newVariants.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    // Low-level sort logic
    const sortedVariants = selectedProduct?.variants ? [...selectedProduct.variants].sort((a, b) => {
        const colorA = a.color || "";
        const colorB = b.color || "";
        const colorCompare = colorA.localeCompare(colorB);
        if (colorCompare !== 0) return colorCompare;
        const sizeA = parseInt(a.size.replace(/\D/g, '')) || 0;
        const sizeB = parseInt(b.size.replace(/\D/g, '')) || 0;
        return sizeA - sizeB;
    }) : [];

    const [searchTerm, setSearchTerm] = useState("");
    const [showResults, setShowResults] = useState(false);

    // Filter products
    const filteredProducts = products.filter(p => {
        if (!searchTerm) return false;
        const term = searchTerm.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(term);
        const skuMatch = p.variants.some(v => v.sku?.toLowerCase().includes(term));
        return nameMatch || skuMatch;
    });

    const handleSelectProduct = (product: Product) => {
        setSelectedProductId(product.id);
        // Pre-fill costs with current product cost for convenience
        const initialCosts: Record<string, string> = {};
        product.variants.forEach(v => {
            initialCosts[v.id] = product.costPrice ? product.costPrice.toString() : "";
        });
        setBulkCosts(initialCosts);
        setBulkQuantities({});
        setNewVariants([]); // Reset new variants

        setSearchTerm("");
        setShowResults(false);
    };

    const clearSelection = () => {
        setSelectedProductId("");
        setBulkQuantities({});
        setBulkCosts({});
        setSearchTerm("");
        setNewVariants([]);
    };

    const handleBulkChange = (variantId: string, field: 'qty' | 'cost', value: string) => {
        if (field === 'qty') {
            setBulkQuantities(prev => ({ ...prev, [variantId]: value }));
        } else {
            setBulkCosts(prev => ({ ...prev, [variantId]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!selectedProduct) return;

        try {
            // 1. Process Bulk Updates (Existing Variants)
            const updates = Object.entries(bulkQuantities)
                .filter(([_, qty]) => parseInt(qty) > 0)
                .map(([variantId, qty]) => ({
                    variantId,
                    productId: selectedProduct.id,
                    quantity: qty,
                    unitCost: bulkCosts[variantId] || "0"
                }));

            // 2. Validate New Variants
            const validNewVariants = newVariants.filter(v => v.size && parseInt(v.qty) > 0 && parseFloat(v.cost) >= 0);

            if (updates.length === 0 && validNewVariants.length === 0) {
                alert("Nenhuma quantidade informada.");
                setLoading(false);
                return;
            }

            // We will execute sequentially to ensure stability
            let successCount = 0;
            const errors = [];

            // A. Execute Bulk Updates
            for (const update of updates) {
                if (!update.unitCost) {
                    errors.push(`Custo não informado para variante ID ${update.variantId}`);
                    continue;
                }
                const res = await fetch("/api/stock/restock", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(update),
                });
                if (res.ok) successCount++;
                else {
                    const d = await res.json();
                    errors.push(d.error || "Erro desconhecido");
                }
            }

            // B. Execute New Variants
            for (const nv of validNewVariants) {
                const res = await fetch("/api/stock/restock", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        variantId: "NEW",
                        productId: selectedProduct.id,
                        quantity: nv.qty,
                        unitCost: nv.cost,
                        size: nv.size,
                        color: nv.color,
                        imageUrl: nv.image
                    }),
                });
                if (res.ok) successCount++;
                else {
                    const d = await res.json();
                    errors.push(`Erro ao criar nova variante (${nv.size}): ${d.error}`);
                }
            }

            if (successCount > 0) {
                alert(`${successCount} item(s) atualizado(s) com sucesso!`);
                if (errors.length > 0) {
                    alert(`Alguns erros ocorreram:\n${errors.join('\n')}`);
                }
                // Reset inputs but KEEP MODAL OPEN
                setBulkQuantities({});
                setBulkCosts({}); // Or keep costs? Usually better to keep costs for next entry if same product.
                // Re-initialize costs based on selected product
                if (selectedProduct && selectedProduct.costPrice) {
                    const initialCosts: Record<string, string> = {};
                    selectedProduct.variants.forEach(v => {
                        initialCosts[v.id] = selectedProduct.costPrice.toString();
                    });
                    setBulkCosts(initialCosts);
                }

                setNewVariants([]);

                // Trigger router refresh to update data in background without full reload
                router.refresh();

                // If preSelectedProduct (Edit Page context), we might want to manually fetch latest data or
                // just inform user. Since Edit Page likely won't auto-update variants list without reload,
                // we tell user to refresh IF they want to see updated stock numbers on screen immediately,
                // BUT for "Replenishing" they usually just want to input more.
                // We won't reload the page anymore.
                /*
                if (preSelectedProduct) {
                    window.location.reload();
                }
                */
            } else if (errors.length > 0) {
                alert(`Falha ao atualizar:\n${errors.join('\n')}`);
            }

        } catch (error) {
            console.error(error);
            alert("Erro de conexão.");
        } finally {
            setLoading(false);
        }
    };

    // Calculate total for preview
    const totalBulkValue = Object.entries(bulkQuantities).reduce((acc, [vid, qty]) => {
        const q = parseInt(qty) || 0;
        const c = parseFloat(bulkCosts[vid]) || 0;
        return acc + (q * c);
    }, 0);

    // Total for new variants
    const totalNewValue = newVariants.reduce((acc, v) => {
        const q = parseInt(v.qty) || 0;
        const c = parseFloat(v.cost) || 0;
        return acc + (q * c);
    }, 0);

    const grandTotal = totalBulkValue + totalNewValue;

    return (
        <>
            <Button onClick={() => setShowModal(true)} className="gap-2 bg-green-600 hover:bg-green-700">
                <PackagePlus className="h-4 w-4" />
                Repor Estoque
            </Button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="w-full max-w-5xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b p-4">
                            <h2 className="text-xl font-bold text-gray-900">Entrada de Mercadoria em Massa</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* 1. Product Selection - Only show if NO preSelectedProduct */}
                                {!preSelectedProduct && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Selecione o Produto</label>
                                        {selectedProduct ? (
                                            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-green-900">{selectedProduct.name}</h3>
                                                    <p className="text-sm text-green-700">Custo Atual Base: R$ {selectedProduct.costPrice?.toFixed(2)}</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={clearSelection}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                >
                                                    Trocar Produto
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    className="w-full rounded-lg border border-gray-300 p-3 shadow-sm focus:border-green-500 focus:ring-green-500"
                                                    placeholder="Digite o nome do produto ou SKU..."
                                                    value={searchTerm}
                                                    onChange={(e) => {
                                                        setSearchTerm(e.target.value);
                                                        setShowResults(true);
                                                    }}
                                                    autoFocus
                                                />
                                                {showResults && searchTerm && (
                                                    <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-white shadow-2xl">
                                                        {filteredProducts.length === 0 ? (
                                                            <div className="p-4 text-center text-gray-500">Nenhum produto encontrado.</div>
                                                        ) : (
                                                            filteredProducts.map(p => (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0"
                                                                    onClick={() => handleSelectProduct(p)}
                                                                >
                                                                    <div className="font-bold text-gray-800">{p.name}</div>
                                                                    <div className="text-xs text-gray-500 mt-1">
                                                                        {p.variants.length} variantes encontradas
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* If preSelectedProduct is present, just show info header nicely */}
                                {preSelectedProduct && selectedProduct && (
                                    <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-green-900">{selectedProduct.name}</h3>
                                            <p className="text-sm text-green-700">Custo Atual Base: R$ {selectedProduct.costPrice?.toFixed(2)}</p>
                                        </div>
                                    </div>
                                )}

                                {/* 2. Grid of Variants */}
                                {selectedProduct && (
                                    <div className="space-y-4">
                                        <div className="rounded-lg border border-gray-200 overflow-hidden">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variante</th>
                                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estoque Atual</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Qtd. Entrada</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Custo Unit. (R$)</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {sortedVariants.map((variant) => (
                                                        <tr key={variant.id} className={parseInt(bulkQuantities[variant.id] || "0") > 0 ? "bg-green-50" : ""}>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {variant.size}
                                                                    </div>
                                                                    {variant.color && (
                                                                        <div className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border">
                                                                            {variant.color}
                                                                        </div>
                                                                    )}
                                                                    <div className="ml-2 text-xs text-gray-400">
                                                                        {variant.sku}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-500">
                                                                {variant.stockQuantity}
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    placeholder="0"
                                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border"
                                                                    value={bulkQuantities[variant.id] || ""}
                                                                    onChange={(e) => handleBulkChange(variant.id, 'qty', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="0.00"
                                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border"
                                                                    value={bulkCosts[variant.id] || ""}
                                                                    onChange={(e) => handleBulkChange(variant.id, 'cost', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                                                                R$ {((parseInt(bulkQuantities[variant.id] || "0") * parseFloat(bulkCosts[variant.id] || "0")) || 0).toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* New Variants Section */}
                                        <div className="rounded-lg border border-dashed border-gray-300 p-4 bg-gray-50">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Plus className="h-4 w-4 text-gray-500" />
                                                    <h4 className="text-sm font-medium text-gray-700">Adicionar Novas Variantes (Que não existem na lista acima)</h4>
                                                </div>
                                                <Button type="button" variant="outline" size="sm" onClick={addNewVariantRow}>
                                                    + Adicionar Linha
                                                </Button>
                                            </div>

                                            {newVariants.length === 0 && (
                                                <p className="text-xs text-gray-400 text-center py-2">Nenhuma nova variante sendo criada.</p>
                                            )}

                                            <div className="space-y-3">
                                                {newVariants.map((nv, idx) => (
                                                    <div key={nv.id} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end bg-gray-100 p-2 rounded relative group">
                                                        <div className="sm:col-span-1">
                                                            <label className="text-xs text-gray-500">Tamanho*</label>
                                                            <input
                                                                className="w-full rounded border-gray-300 p-1.5 text-sm"
                                                                placeholder="Ex: GG"
                                                                value={nv.size}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    // If user types a number, we can assume they might mean years, but let's be careful.
                                                                    // A better UX in Restock might be just text, but if we want to enforce standard:
                                                                    // Let's just pass it as is, but maybe adding a helper or onBlur?
                                                                    // The user asked "Why some have suffix and others don't".
                                                                    // Let's force "Anos" if it looks like a simple number input is done?
                                                                    // Simple approach: Allow text.
                                                                    updateNewVariantRow(nv.id, 'size', val);
                                                                }}
                                                                onBlur={e => {
                                                                    const val = e.target.value;
                                                                    if (/^\d+$/.test(val)) {
                                                                        updateNewVariantRow(nv.id, 'size', `${val} Anos`);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <label className="text-xs text-gray-500">Cor</label>
                                                            <input
                                                                className="w-full rounded border-gray-300 p-1.5 text-sm"
                                                                placeholder="Ex: VERMELHO"
                                                                value={nv.color}
                                                                onChange={e => updateNewVariantRow(nv.id, 'color', e.target.value.toUpperCase())}
                                                                list={`restock-colors-${nv.id}`}
                                                            />
                                                            <datalist id={`restock-colors-${nv.id}`}>
                                                                {selectedProduct?.variants && Array.from(new Set(selectedProduct.variants.map(v => v.color).filter(Boolean))).map(color => (
                                                                    <option key={color} value={color!} />
                                                                ))}
                                                            </datalist>
                                                        </div>
                                                        <div className="sm:col-span-1">
                                                            <label className="text-xs text-gray-500">Qtd*</label>
                                                            <input
                                                                type="number"
                                                                className="w-full rounded border-gray-300 p-1.5 text-sm"
                                                                placeholder="0"
                                                                value={nv.qty}
                                                                onChange={e => updateNewVariantRow(nv.id, 'qty', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-1">
                                                            <label className="text-xs text-gray-500">Custo*</label>
                                                            <input
                                                                type="number" step="0.01"
                                                                className="w-full rounded border-gray-300 p-1.5 text-sm"
                                                                placeholder="0.00"
                                                                value={nv.cost}
                                                                onChange={e => updateNewVariantRow(nv.id, 'cost', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="sm:col-span-1 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeNewVariantRow(nv.id)}
                                                                className="text-red-500 hover:bg-red-100 p-1 rounded"
                                                            >
                                                                <Trash className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Footer / Totals */}
                        <div className="border-t bg-gray-50 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-gray-500">Resumo da Entrada</p>
                                    <p className="text-2xl font-bold text-gray-900">R$ {grandTotal.toFixed(2)}</p>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setShowModal(false)}>Voltar / Sair</Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={loading || grandTotal === 0}
                                        className="bg-green-600 hover:bg-green-700 min-w-[150px]"
                                    >
                                        {loading ? "Processando..." : "Confirmar Tudo"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
