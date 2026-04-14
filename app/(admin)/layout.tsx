import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getServerAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Lê o contexto diretamente do JWT — sem dependência de cookies legados
    const ctx = await getServerAuthContext();

    // Se não tem sessão válida, redireciona para login
    if (!ctx) {
        redirect("/login");
    }

    // SUPER_ADMIN não tem storeId — redireciona para o painel correto
    if (!ctx.storeId) {
        redirect("/super-admin");
    }

    let permissions: string[] = [];
    try {
        const user = await prisma.user.findUnique({
            where: { id: ctx.userId },
            include: { 
                store: {
                    include: { subscription: true }
                } 
            },
        });
        if (user) {
            permissions = user.permissions;

            // Muralha de Pagamento: Verifica Status da Loja
            const store = user.store;
            if (store && ctx.role === "OWNER") {
                if (store.status === "PENDING" || store.status === "SUSPENDED") {
                    redirect("/assinatura");
                }
                
                // Muralha de Pagamento: Verifica Vencimento (30 dias)
                if (store.subscription && store.subscription.nextDueDate) {
                    const today = new Date();
                    const due = new Date(store.subscription.nextDueDate);
                    
                    // Se venceu ontem para trás, bloqueia
                    if (today > due && store.subscription.status !== "ACTIVE") {
                       redirect("/assinatura");
                    } else if (today > due && store.subscription.status === "ACTIVE") {
                       // Opcional: Atualiza o status para OVERDUE automatico
                       await prisma.subscription.update({
                           where: { id: store.subscription.id },
                           data: { status: "OVERDUE" }
                       });
                       redirect("/assinatura");
                    }
                }
            }
        }
    } catch (e: any) {
        if (e.message === "NEXT_REDIRECT") throw e; // Necessário para não engolir o redirect do Next.js
        console.error("Error fetching permissions/store", e);
    }

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <AdminSidebar role={ctx.role} permissions={permissions} />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full pt-16 md:pt-0">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
