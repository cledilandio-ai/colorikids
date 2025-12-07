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

    const [variants, setVariants] = useState<{ size: string; color: string; stockQuantity: string; imageUrl?: string; sku?: string }[]>([
        { size: "2 Anos", color: "Branco", stockQuantity: "10", imageUrl: "" },
    ]);

    const addVariant = () => {
        setVariants([...variants, { size: "", color: "", stockQuantity: "0", imageUrl: "" }]);
    };

    const removeVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index));
    };

    const updateVariant = (index: number, field: "size" | "color" | "stockQuantity" | "imageUrl" | "sku", value: string) => {
        const newVariants = [...variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        setVariants(newVariants);
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

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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
                    </div>

                    <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                        {variants.map((variant, index) => (
                            <div key={index} className="flex items-end gap-3 p-3 border rounded-md bg-white">
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs text-gray-500">Tamanho (Idade)</label>
                                    <input
                                        required
                                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none bg-white"
                                        placeholder="Ex: 2 Anos"
                                        value={variant.size}
                                        onChange={(e) => updateVariant(index, "size", e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs text-gray-500">Cor</label>
                                    <select
                                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none bg-white"
                                        value={variant.color}
                                        onChange={(e) => updateVariant(index, "color", e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Branco">Branco</option>
                                        <option value="Preto">Preto</option>
                                        <option value="Azul">Azul</option>
                                        <option value="Rosa">Rosa</option>
                                        <option value="Verde">Verde</option>
                                        <option value="Amarelo">Amarelo</option>
                                        <option value="Vermelho">Vermelho</option>
                                        <option value="Cinza">Cinza</option>
                                        <option value="Bege">Bege</option>
                                        <option value="Laranja">Laranja</option>
                                        <option value="Roxo">Roxo</option>
                                        <option value="Marrom">Marrom</option>
                                        <option value="Jeans">Jeans</option>
                                        <option value="Estampado">Estampado</option>
                                    </select>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs text-gray-500">Qtd. Estoque</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none"
                                        placeholder="0"
                                        value={variant.stockQuantity}
                                        onChange={(e) => updateVariant(index, "stockQuantity", e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs text-gray-500">SKU (Opcional)</label>
                                    <input
                                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-primary focus:outline-none"
                                        placeholder="Auto"
                                        value={variant.sku || ""}
                                        onChange={(e) => updateVariant(index, "sku", e.target.value)}
                                    />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs text-gray-500">Foto (Opcional)</label>
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
                                            <label className="cursor-pointer flex h-9 w-full items-center justify-center rounded-md border border-dashed text-xs text-gray-500 hover:bg-gray-50">
                                                Upload
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

                                                                const filename = "public/" + Date.now() + "_" + file.name.replaceAll(" ", "_");

                                                                // Upload direto via Frontend usando a chave ANON (pública)
                                                                // Isso respeita o RLS porque o usuário está autenticado na sessão do browser (se estiver usando Supabase Auth)
                                                                // Se não estiver usando Supabase Auth, a política deve ser 'public' ou 'anon', mas vamos testar.
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
                                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => removeVariant(index)}
                                    disabled={variants.length === 1}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
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
