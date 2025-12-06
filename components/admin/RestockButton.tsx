"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, PackagePlus, X } from "lucide-react";
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

export function RestockButton({ products }: { products: Product[] }) {
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const [selectedProductId, setSelectedProductId] = useState("");
    const [selectedVariantId, setSelectedVariantId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [unitCost, setUnitCost] = useState("");

    const [newVariantSize, setNewVariantSize] = useState("");
    const [newVariantColor, setNewVariantColor] = useState("");
    const [newVariantImage, setNewVariantImage] = useState("");

    const selectedProduct = products.find(p => p.id === selectedProductId);
    const selectedVariant = selectedProduct?.variants.find(v => v.id === selectedVariantId);

    const [searchTerm, setSearchTerm] = useState("");
    const [showResults, setShowResults] = useState(false);

    // Filter products based on search term (Name or SKU)
    const filteredProducts = products.filter(p => {
        if (!searchTerm) return false;
        const term = searchTerm.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(term);
        const skuMatch = p.variants.some(v => v.sku?.toLowerCase().includes(term));
        return nameMatch || skuMatch;
    });

    const handleSelectProduct = (product: Product) => {
        setSelectedProductId(product.id);
        setUnitCost(product.costPrice ? product.costPrice.toString() : "");
        setSearchTerm("");
        setShowResults(false);
        setSelectedVariantId("");

        // If the search term matches a specific SKU, try to auto-select that variant
        if (searchTerm) {
            const matchingVariant = product.variants.find(v => v.sku?.toLowerCase().includes(searchTerm.toLowerCase()));
            if (matchingVariant) {
                setSelectedVariantId(matchingVariant.id);
            }
        }
    };

    const clearSelection = () => {
        setSelectedProductId("");
        setSelectedVariantId("");
        setUnitCost("");
        setQuantity("");
        setSearchTerm("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVariantId || !quantity || !unitCost) return;

        setLoading(true);
        try {
            const res = await fetch("/api/stock/restock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    variantId: selectedVariantId,
                    productId: selectedProductId,
                    quantity,
                    unitCost,
                    size: selectedVariantId === "NEW" ? newVariantSize : undefined,
                    color: selectedVariantId === "NEW" ? newVariantColor : undefined,
                    imageUrl: selectedVariantId === "NEW" ? newVariantImage : undefined,
                }),
            });

            if (res.ok) {
                alert("Estoque reposto com sucesso!");
                setShowModal(false);
                clearSelection();
                setNewVariantSize("");
                setNewVariantColor("");
                setNewVariantImage("");
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao repor estoque.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro de conexão.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button onClick={() => setShowModal(true)} className="gap-2 bg-green-600 hover:bg-green-700">
                <PackagePlus className="h-4 w-4" />
                Repor Estoque
            </Button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Entrada de Mercadoria</h2>
                            <button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Product Search or Display Selected */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                                {selectedProduct ? (
                                    <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-2">
                                        <span className="font-medium text-green-800">{selectedProduct.name}</span>
                                        <button
                                            type="button"
                                            onClick={clearSelection}
                                            className="text-xs text-red-600 hover:underline"
                                        >
                                            Trocar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none"
                                            placeholder="Buscar por Nome ou SKU..."
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setShowResults(true);
                                            }}
                                            onFocus={() => setShowResults(true)}
                                        />
                                        {showResults && searchTerm && (
                                            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-white shadow-lg">
                                                {filteredProducts.length === 0 ? (
                                                    <div className="p-2 text-sm text-gray-500">Nenhum produto encontrado.</div>
                                                ) : (
                                                    filteredProducts.map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                                            onClick={() => handleSelectProduct(p)}
                                                        >
                                                            <div className="font-medium">{p.name}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {p.variants.length} variantes
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedProduct && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Variante (Tamanho/Cor)</label>
                                    <select
                                        required
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none"
                                        value={selectedVariantId}
                                        onChange={(e) => setSelectedVariantId(e.target.value)}
                                    >
                                        <option value="">Selecione a Variante...</option>
                                        {selectedProduct.variants.map(v => (
                                            <option key={v.id} value={v.id}>
                                                {v.size} {v.color ? `- ${v.color}` : ""} (Atual: {v.stockQuantity}) {v.sku ? `[${v.sku}]` : ""}
                                            </option>
                                        ))}
                                        <option value="NEW">+ Nova Variante</option>
                                    </select>
                                </div>
                            )}

                            {selectedVariantId === "NEW" && (
                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md border border-dashed border-gray-300">
                                    <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase">Cadastrando Nova Variante</div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tamanho</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ex: G, 42..."
                                            className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none"
                                            value={newVariantSize}
                                            onChange={(e) => setNewVariantSize(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Azul..."
                                            className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none"
                                            value={newVariantColor}
                                            onChange={(e) => setNewVariantColor(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Foto (Opcional)</label>
                                        <div className="flex items-center gap-2">
                                            {newVariantImage ? (
                                                <div className="relative h-16 w-16 overflow-hidden rounded-md border">
                                                    <img src={newVariantImage} alt="Preview" className="h-full w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewVariantImage("")}
                                                        className="absolute inset-0 bg-black/50 text-white opacity-0 hover:opacity-100 flex items-center justify-center text-xs"
                                                    >
                                                        X
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer flex h-16 w-full items-center justify-center rounded-md border border-dashed text-xs text-gray-500 hover:bg-gray-100">
                                                    Clique para Upload
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const uploadData = new FormData();
                                                                uploadData.append("file", file);
                                                                try {
                                                                    const res = await fetch("/api/upload", { method: "POST", body: uploadData });
                                                                    const data = await res.json();
                                                                    if (data.success) setNewVariantImage(data.url);
                                                                } catch (err) { console.error(err); }
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade (Entrada)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Custo Unitário (R$)</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none"
                                        value={unitCost}
                                        onChange={(e) => setUnitCost(e.target.value)}
                                    />
                                </div>
                            </div>

                            {quantity && unitCost && (
                                <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                                    <p>Total da Compra: <strong>R$ {(parseInt(quantity) * parseFloat(unitCost)).toFixed(2)}</strong></p>
                                    <p className="text-xs mt-1 text-blue-500">
                                        *O Preço Médio do produto será recalculado automaticamente.
                                    </p>
                                </div>
                            )}

                            <div className="pt-2">
                                <Button type="submit" disabled={loading || !selectedVariantId} className="w-full bg-green-600 hover:bg-green-700">
                                    {loading ? "Processando..." : "Confirmar Entrada"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
