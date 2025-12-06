"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface OrderActionsProps {
    orderId: string;
    status: string;
}

export function OrderActions({ orderId, status }: OrderActionsProps) {
    const router = useRouter();

    const handleStatusChange = async (newStatus: string) => {
        if (!confirm(`Deseja alterar o status para ${newStatus === "COMPLETED" ? "Concluído" : "Cancelado"}?`)) return;

        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                router.refresh();
            } else {
                alert("Erro ao atualizar pedido.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao conectar com o servidor.");
        }
    };

    if (status !== "PENDING") return null;

    return (
        <div className="flex gap-2">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:bg-green-50"
                title="Concluir Pedido"
                onClick={() => handleStatusChange("COMPLETED")}
            >
                <CheckCircle className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:bg-red-50"
                title="Cancelar Pedido"
                onClick={() => handleStatusChange("CANCELLED")}
            >
                <XCircle className="h-4 w-4" />
            </Button>
        </div>
    );
}
