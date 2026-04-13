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

    // Busca permissões do usuário no banco usando o userId do JWT
    let permissions: string[] = [];
    try {
        const user = await prisma.user.findUnique({
            where: { id: ctx.userId },
            select: { permissions: true },
        });
        if (user?.permissions) {
            permissions = user.permissions;
        }
    } catch (e) {
        console.error("Error fetching permissions", e);
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
