"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        basePrice: "",
        costPrice: "",
        category: "",
        gender: "",
    });

    const [variants, setVariants] = useState<{ size: string; color: string; stockQuantity: string; minStock: string; imageUrl?: string; sku?: string }[]>([
        { size: "2 Anos", color: "Branco", stockQuantity: "10", minStock: "1", imageUrl: "" },
    ]);

    const addVariant = () => {
        setVariants([{ size: "", color: "", stockQuantity: "0", minStock: "1", imageUrl: "" }, ...variants]);
    };

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const updateVariant = (index: number, field: "size" | "color" | "stockQuantity" | "minStock" | "imageUrl" | "sku", value: string) => {
        const newVariants = [...variants];
        newVariants[index] = { ...newVariants[index], [field]: value };

        // Auto-fill image if color matches another variant
        if (field === "color") {
            const existingVariantWithColor = variants.find((v, i) => i !== index && v.color === value && v.imageUrl);
            if (existingVariantWithColor) {
                newVariants[index].imageUrl = existingVariantWithColor.imageUrl;
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

    const sortVariants = () => {
        const sorted = [...variants].sort((a, b) => {
            const colorCompare = a.color.localeCompare(b.color);
            if (colorCompare !== 0) return colorCompare;
            const sizeA = parseInt(a.size.replace(/\D/g, '')) || 0;
            const sizeB = parseInt(b.size.replace(/\D/g, '')) || 0;
            return sizeA - sizeB;
        });
        setVariants(sorted);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    variants,
                }),
            });

            if (res.ok) {
                alert("Produto cadastrado com sucesso!");
                router.push("/products");
                router.refresh();
            } else {
                alert("Erro ao cadastrar produto.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao conectar com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/products">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold text-gray-800">Novo Produto</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
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
                    <label className="text-sm font-medium text-gray-700">Descrição</label>
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
                        <select
                            className="w-full rounded-md border border-gray-300 p-2 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="">Selecione...</option>
                            <option value="Vestido">Vestido</option>
                            <option value="Conjunto">Conjunto</option>
                            <option value="Blusa">Blusa</option>
                            <option value="Calça">Calça</option>
                            <option value="Shorts">Shorts</option>
                            <option value="Saia">Saia</option>
                            <option value="Macacão">Macacão</option>
                            <option value="Jardineira">Jardineira</option>
                            <option value="Body">Body</option>
                            <option value="Pijama">Pijama</option>
                            <option value="Acessórios">Acessórios</option>
                            <option value="Calçados">Calçados</option>
                        </select>
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
                        <label className="text-sm font-medium text-gray-700">Preço de Venda (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="0.00"
                            value={formData.basePrice}
                            onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Preço de Custo (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="0.00"
                            value={formData.costPrice}
                            onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        />
                    </div>
                </div>


                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Grade (Tamanhos e Estoque)</label>
                        <Button type="button" variant="outline" size="sm" onClick={addVariant} className="gap-1">
                            <Plus className="h-3 w-3" /> Adicionar Tamanho
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={sortVariants} className="gap-1 ml-2">
                            Agrupar Cores
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
                                                type="number"
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
                                        <input
                                            className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none h-[38px]"
                                            value={variant.color}
                                            onChange={(e) => updateVariant(index, "color", e.target.value)}
                                            placeholder="Ex: Azul"
                                        />
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
                                                                        .upload(filename, file, {
                                                                            upsert: false
                                                                        });

                                                                    if (error) {
                                                                        console.error("Erro no upload:", error);
                                                                        alert("Erro ao fazer upload da imagem. Verifique o console.");
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
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-400 hover:bg-red-50 hover:text-red-700 h-[38px] w-[38px] flex-none"
                                        onClick={() => removeVariant(index)}
                                        disabled={variants.length === 1}
                                        title="Remover variante"
                                    >
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Link href="/products">
                        <Button type="button" variant="ghost">Cancelar</Button>
                    </Link>
                    <Button type="submit" disabled={loading}>
                        {loading ? "Salvando..." : "Salvar Produto"}
                    </Button>
                </div>
            </form >
        </div >
    );
}
