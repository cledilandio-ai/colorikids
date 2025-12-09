"use client";

import { Edit, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ProductActionsProps {
    productId: string;
}

export function ProductActions({ productId }: ProductActionsProps) {
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("🛑 ATENÇÃO: Ao excluir este produto, ele será ARQUIVADO (oculto do site e listas), mas o histórico de vendas e estoque será preservado.\n\nDeseja realmente arquivar?")) return;

        try {
            const res = await fetch(`/api/products/${productId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert("Erro ao excluir produto.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao conectar com o servidor.");
        }
    };

    return (
        <div className="flex gap-2">
            <Link href={`/products/${productId}/edit`}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4 text-blue-600" />
                </Button>
            </Link>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDelete}
            >
                <Trash className="h-4 w-4 text-red-600" />
            </Button>
        </div>
    );
}
