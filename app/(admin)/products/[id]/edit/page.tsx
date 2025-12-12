"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { RestockButton } from "@/components/admin/RestockButton";
import { CategoryInput } from "@/components/admin/CategoryInput";

export default function EditProductPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [priceError, setPriceError] = useState("");
    const [showFinancialDialog, setShowFinancialDialog] = useState(false);
    const [financialAmount, setFinancialAmount] = useState("");
    const [stockDifference, setStockDifference] = useState<{ quantity: number, cost: number }>({ quantity: 0, cost: 0 });

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        basePrice: "",
        costPrice: "",
        category: "",
        gender: "",
        supplier: "",
    });

    const [variants, setVariants] = useState<{ id?: string; size: string; color: string; stockQuantity: string; minStock: string; imageUrl?: string; sku?: string; stockMovements?: any[]; inventoryLogs?: any[] }[]>([]);

    // New state for stock financial confirmation
    const [initialVariants, setInitialVariants] = useState<any[]>([]);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await fetch(`/api/products/${params.id}`, { cache: "no-store" });
                if (res.ok) {
                    const product = await res.json();
                    setFormData({
                        name: product.name,
                        description: product.description || "",
                        basePrice: product.basePrice.toString(),
                        costPrice: product.costPrice ? product.costPrice.toString() : "",
                        category: product.category || "",
                        gender: product.gender || "",
                        supplier: product.supplier || "",
                    });
                    setVariants(product.variants.map((v: any) => ({
                        id: v.id,
                        size: /^\d+$/.test(v.size) ? `${v.size} Anos` : v.size, // Normalize "14" to "14 Anos"
                        color: v.color || "",
                        stockQuantity: v.stockQuantity.toString(),
                        minStock: (v.minStock || 1).toString(),
                        imageUrl: v.imageUrl || "",
                        sku: v.sku || "",
                        stockMovements: v.stockMovements,
                        inventoryLogs: v.inventoryLogs,
                    })).sort((a: any, b: any) => {
                        const colorCompare = a.color.localeCompare(b.color);
                        if (colorCompare !== 0) return colorCompare;
                        const sizeA = parseInt(a.size.replace(/\D/g, '')) || 0;
                        const sizeB = parseInt(b.size.replace(/\D/g, '')) || 0;
                        return sizeA - sizeB;
                    }));

                    // Store initial state for stock comparison
                    setInitialVariants(product.variants.map((v: any) => ({
                        id: v.id,
                        size: v.size,
                        color: v.color || "",
                        stockQuantity: v.stockQuantity.toString(),
                        imageUrl: v.imageUrl || "",
                        sku: v.sku || "",
                    })));
                } else {
                    alert("Erro ao carregar produto.");
                }
            } catch (error) {
                console.error(error);
            } finally {
                setFetching(false);
            }
        };

        fetchProduct();
    }, [params.id]);

    const addVariant = () => {
        setVariants([{ size: "", color: "", stockQuantity: "0", minStock: "1", imageUrl: "" }, ...variants]);
    };

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const sortVariants = () => {
        let newVariants = [...variants];

        // 1. Sync images: For each color, find a representative image if available
        const colorImages: Record<string, string> = {};
        newVariants.forEach(v => {
            if (v.color && v.imageUrl && !colorImages[v.color]) {
                colorImages[v.color] = v.imageUrl;
            }
        });

        // Apply images to those missing them within the same color group
        newVariants = newVariants.map(v => {
            if (v.color && colorImages[v.color] && !v.imageUrl) {
                return { ...v, imageUrl: colorImages[v.color] };
            }
            return v;
        });

        // 2. Sort safely
        const sorted = newVariants.sort((a, b) => {
            const colorA = a.color || "";
            const colorB = b.color || "";

            const colorCompare = colorA.localeCompare(colorB);
            if (colorCompare !== 0) return colorCompare;

            const sizeA = parseInt((a.size || "").replace(/\D/g, '')) || 0;
            const sizeB = parseInt((b.size || "").replace(/\D/g, '')) || 0;
            return sizeA - sizeB;
        });

        setVariants(sorted);
        alert("Grade organizada e fotos sincronizadas por cor!");
    };

    const updateVariant = (index: number, field: "size" | "color" | "stockQuantity" | "minStock" | "imageUrl" | "sku", value: string) => {
        const newVariants = [...variants];
        newVariants[index] = { ...newVariants[index], [field]: value };

        // Auto-fill image if color matches another variant
        if (field === "color") {
            // 1. Try to PULL image from existing group
            const existingVariantWithColor = variants.find((v, i) => i !== index && v.color === value && v.imageUrl);
            if (existingVariantWithColor) {
                newVariants[index].imageUrl = existingVariantWithColor.imageUrl;
            } else {
                // 2. If no image found in group, but WE have an image, PUSH our image to empty members of the new group?
                // Actually, if we are renaming 'Vermelho' (with photo) -> 'Vermelha' (no photo),
                // we want 'Vermelha' group to adopt our photo.
                const currentImage = newVariants[index].imageUrl;
                if (currentImage) {
                    // Check if other items in 'Vermelha' group are empty
                    newVariants.forEach((v, i) => {
                        if (i !== index && v.color === value && !v.imageUrl) {
                            v.imageUrl = currentImage;
                        }
                    });
                }
            }
        }

        // Sync image to all variants of same color if image is updated
        if (field === "imageUrl") {
            newVariants.forEach((v, i) => {
                if (v.color === newVariants[index].color && i !== index) {
                    v.imageUrl = value;
                }
            });
        }

        setVariants(newVariants);
    };

    const validatePrices = () => {
        const safeParse = (val: string) => {
            if (!val) return 0;
            return parseFloat(val.toString().replace(",", ".")) || 0;
        };

        const sellPrice = safeParse(formData.basePrice);
        const costPrice = safeParse(formData.costPrice);

        // Reset error if fields are empty or zero (during typing)
        if (sellPrice === 0 || costPrice === 0) {
            setPriceError("");
            return true;
        }

        if (sellPrice < costPrice) {
            setPriceError(`O preço de venda (R$ ${sellPrice}) não pode ser menor que o preço de custo (R$ ${costPrice}).`);
            return false;
        }

        setPriceError("");
        return true;
    };

    const calculateStockDifference = () => {
        const initialTotal = initialVariants.reduce((acc, v) => acc + parseInt(v.stockQuantity || "0"), 0);
        const currentTotal = variants.reduce((acc, v) => acc + parseInt(v.stockQuantity || "0"), 0);
        return currentTotal - initialTotal;
    };

    const handlePreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validatePrices()) {
            // Error is already set by validatePrices, just alert for emphasis if needed or just return
            // alert("Corrija os erros de preço antes de salvar."); // Optional, maybe just letting the UI show it is enough
            return;
        }

        // Debugging values

        // Debugging values
        console.log("Validating Prices (Edit):", {
            base: formData.basePrice,
            cost: formData.costPrice
        });

        const safeParse = (val: string) => {
            if (!val) return 0;
            return parseFloat(val.toString().replace(",", ".")) || 0;
        };
        // Validation moved to validatePrices called above


        const difference = calculateStockDifference();

        if (difference > 0) {
            // Stock increased - Ask about financial record
            const estimatedCost = difference * (parseFloat(formData.costPrice) || 0);
            setStockDifference({ quantity: difference, cost: estimatedCost });
            setFinancialAmount(estimatedCost.toFixed(2));
            setShowFinancialDialog(true);
        } else {
            // No stock increase (or decrease) - Save directly
            await saveProduct(null);
        }
    };

    const saveProduct = async (financialRecord: { amount: number, description: string } | null) => {
        setLoading(true);

        const productData = {
            ...formData,
            variants,
            financialRecord
        };

        try {
            const res = await fetch(`/api/products/${params.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productData),
            });

            if (res.ok) {
                alert("Produto atualizado com sucesso!");
                // router.push("/products"); // Removed redirect to keep user on page
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Erro ao atualizar produto.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao conectar com o servidor.");
        } finally {
            setLoading(false);
            setShowFinancialDialog(false);
        }
    };

    if (fetching) return <div className="p-8 text-center">Carregando...</div>;

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/products">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold text-gray-800">Editar Produto</h1>
                <div className="ml-auto flex items-center gap-2">
                    <RestockButton
                        preSelectedProduct={{
                            id: params.id,
                            name: formData.name,
                            costPrice: parseFloat(formData.costPrice || "0"),
                            variants: variants.map(v => ({
                                id: v.id || "new", // Handle partial new variants carefully, but Restock logic likely needs real IDs for updates. 
                                // Actually, if we are in Edit page, variants might be new/unsaved. Restock usually works on saved variants.
                                // If the user adds a new variant in 'Edit', it won't have an ID yet.
                                // But RestockButton is for 'replenishing' essentially.
                                // If I pass 'id' here, it must be the real database ID for the Restock API to work.
                                // If variant.id is undefined (newly added in UI but not saved), Restock API will fail if we try to update it.
                                // However, RestockButton is mostly for adding stock to EXISTING variants.
                                // So we should map strictly.
                                size: v.size,
                                color: v.color,
                                stockQuantity: parseInt(v.stockQuantity),
                                sku: v.sku
                            })) as any // Force cast to avoid strict type issues if mismatch slightly, but generally should match
                        }}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                            if (!confirm("🛑 ATENÇÃO: Ao excluir este produto, ele será ARQUIVADO (oculto do site e listas), mas o histórico de vendas e estoque será preservado.\n\nDeseja realmente arquivar?")) return;

                            try {
                                const res = await fetch(`/api/products/${params.id}`, { method: "DELETE" });
                                if (res.ok) {
                                    alert("Produto arquivado com sucesso!");
                                    router.push("/products");
                                    router.refresh();
                                } else {
                                    alert("Erro ao arquivar produto.");
                                }
                            } catch (e) {
                                console.error(e);
                                alert("Erro de conexão.");
                            }
                        }}
                        className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                        <Trash className="h-4 w-4" /> Excluir Produto
                    </Button>
                </div>
            </div>

            <form onSubmit={handlePreSubmit} className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Nome do Produto</label>
                    <input
                        required
                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Ex: Vestido Floral"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <textarea
                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={3}
                        placeholder="Detalhes do produto..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Categoria</label>
                        <CategoryInput
                            value={formData.category}
                            onChange={(val) => setFormData({ ...formData, category: val })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Gênero</label>
                        <select
                            className="w-full rounded-md border border-gray-300 p-2 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        >
                            <option value="">Selecione...</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Unissex">Unissex</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Preço de Custo (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 ${priceError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-primary focus:ring-primary"}`}
                            placeholder="0.00"
                            value={formData.costPrice}
                            onChange={(e) => {
                                setFormData({ ...formData, costPrice: e.target.value });
                                setPriceError("");
                            }}
                            onBlur={validatePrices}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Preço de Venda (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className={`w-full rounded-md border p-2 focus:outline-none focus:ring-1 ${priceError ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-primary focus:ring-primary"}`}
                            placeholder="0.00"
                            value={formData.basePrice}
                            onChange={(e) => {
                                setFormData({ ...formData, basePrice: e.target.value });
                                setPriceError("");
                            }}
                            onBlur={validatePrices}
                        />
                    </div>
                </div>
                {priceError && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
                        ⚠️ {priceError}
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Grade (Tamanhos e Estoque)</label>
                        <Button type="button" variant="outline" size="sm" onClick={addVariant} className="gap-1">
                            <Plus className="h-3 w-3" /> Adicionar Tamanho
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={sortVariants} className="gap-1 ml-2">
                            Organizar & Sync Fotos
                        </Button>
                    </div>

                    <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                        {variants.map((variant, index) => (
                            <div key={index} className="flex flex-col gap-3 rounded-md border bg-white p-3 sm:flex-row sm:items-end sm:flex-wrap">
                                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-1 sm:gap-3">
                                    <div className="space-y-1 sm:w-28 sm:flex-none">
                                        <label className="text-xs font-medium text-gray-700">Tamanho</label>
                                        <div className="relative flex items-center">
                                            <input
                                                type="text" // Change to text to allow "Anos" suffix visibility or handling
                                                required
                                                className="w-full rounded-md border border-gray-300 p-2 pr-12 text-sm focus:border-primary focus:outline-none bg-white h-[38px]"
                                                placeholder="0"
                                                value={variant.size.replace(/\D/g, "")}
                                                onChange={(e) => updateVariant(index, "size", `${e.target.value} Anos`)}
                                            />
                                            <span className="absolute right-3 text-sm text-gray-500 pointer-events-none">Anos</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1 sm:w-32 sm:flex-none">
                                        <label className="text-xs font-medium text-gray-700">Cor</label>
                                        <div className="relative">
                                            <input
                                                className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none h-[38px]"
                                                value={variant.color}
                                                onChange={(e) => updateVariant(index, "color", e.target.value.toUpperCase())}
                                                placeholder="Ex: Azul"
                                                list={`colors-${index}`}
                                            />
                                            <datalist id={`colors-${index}`}>
                                                {/* Suggest existing colors */}
                                                {Array.from(new Set(variants.map(v => v.color).filter(c => c && c !== variant.color))).map(c => (
                                                    <option key={c} value={c} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-1 gap-3">
                                    <div className="space-y-1 w-20 flex-none">
                                        <label className="text-xs font-medium text-gray-700">Qtd.</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none h-[38px]"
                                            placeholder="0"
                                            value={variant.stockQuantity}
                                            onChange={(e) => updateVariant(index, "stockQuantity", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1 w-20 flex-none">
                                        <label className="text-xs font-medium text-gray-700">Mínimo</label>
                                        <input
                                            type="number"
                                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none h-[38px]"
                                            placeholder="1"
                                            value={variant.minStock}
                                            onChange={(e) => updateVariant(index, "minStock", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1 flex-1 min-w-[100px]">
                                        <label className="text-xs font-medium text-gray-700">SKU</label>
                                        <input
                                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none h-[38px]"
                                            placeholder="Auto"
                                            value={variant.sku || ""}
                                            onChange={(e) => updateVariant(index, "sku", e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end justify-between gap-3 sm:w-auto sm:justify-start">
                                    <div className="flex-1 space-y-1 sm:w-auto sm:flex-none">
                                        <label className="text-xs text-gray-500">Foto</label>
                                        <div className="flex items-center gap-2">
                                            {variant.imageUrl ? (
                                                <div className="relative h-9 w-9 overflow-hidden rounded-md border">
                                                    <img src={variant.imageUrl} alt="Var" className="h-full w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => updateVariant(index, "imageUrl", "")}
                                                        className="absolute inset-0 bg-black/50 text-white opacity-0 hover:opacity-100 flex items-center justify-center text-xs"
                                                    >
                                                        X
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer flex h-9 w-full items-center justify-center rounded-md border border-dashed text-xs text-gray-500 hover:bg-gray-50 sm:w-9">
                                                    <span className="sm:hidden">Upload</span>
                                                    <span className="hidden sm:inline">+</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                try {
                                                                    // Validar se o arquivo é uma imagem
                                                                    if (!file.type.startsWith("image/")) {
                                                                        alert("Por favor, selecione apenas imagens.");
                                                                        return;
                                                                    }

                                                                    const sanitizedFileName = file.name
                                                                        .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove acentos
                                                                        .replace(/\s+/g, '-') // Espaços para hífens
                                                                        .replace(/[^a-zA-Z0-9.-]/g, "") // Remove tudo que não for letra, número, ponto ou hífen
                                                                        .toLowerCase(); // Tudo minúsculo

                                                                    const filename = "public/" + Date.now() + "_" + sanitizedFileName;

                                                                    const { data, error } = await supabase.storage
                                                                        .from("uploads")
                                                                        .upload(filename, file, { upsert: false });

                                                                    if (error) {
                                                                        console.error("Erro no upload:", error);
                                                                        alert("Erro ao fazer upload da imagem.");
                                                                        return;
                                                                    }

                                                                    const { data: publicUrlData } = supabase.storage
                                                                        .from("uploads")
                                                                        .getPublicUrl(filename);

                                                                    updateVariant(index, "imageUrl", publicUrlData.publicUrl);

                                                                } catch (err) {
                                                                    console.error(err);
                                                                    alert("Erro inesperado no upload.");
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    {variant.stockMovements?.some(m => true) || variant.inventoryLogs?.some(l => true) ? (
                                        // Se tem histórico, evitar excluir ou avisar
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-gray-400 hover:text-gray-600 h-[38px] w-[38px] flex-none"
                                            title="Esta variante tem histórico e não pode ser removida (apenas zerada)"
                                            disabled
                                        >
                                            <Trash className="h-3 w-3" />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-400 hover:bg-red-50 hover:text-red-700 h-[38px] w-[38px] flex-none"
                                            onClick={() => removeVariant(index)}
                                            title="Remover variante"
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Link href="/products">
                        <Button type="button" variant="outline">Voltar / Sair</Button>
                    </Link>
                    <Button type="submit" disabled={loading || !!priceError}>
                        {loading ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                </div>
            </form >

            <Dialog open={showFinancialDialog} onOpenChange={setShowFinancialDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Atualização de Estoque Detectada</DialogTitle>
                        <DialogDescription>
                            Você adicionou <strong>{stockDifference.quantity}</strong> itens ao estoque.
                            Deseja registrar o custo dessa entrada no financeiro?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <label className="block text-sm font-medium text-gray-700">Valor Total de Custo (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                            value={financialAmount}
                            onChange={(e) => setFinancialAmount(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Calculado base: {stockDifference.quantity} un * R$ {parseFloat(formData.costPrice || "0").toFixed(2)}
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => saveProduct(null)}>
                            Salvar SEM Financeiro
                        </Button>
                        <Button onClick={() => saveProduct({
                            amount: parseFloat(financialAmount) || 0,
                            description: `Reposição de Estoque - ${formData.name}`,
                        })}>
                            Salvar COM Financeiro
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >

    );
}
