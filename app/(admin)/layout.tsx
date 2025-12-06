import Link from "next/link";
import { LayoutDashboard, Package, ShoppingCart, LogOut, ShoppingBag, Settings, User } from "lucide-react";
import { cookies } from "next/headers";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = cookies();
    const role = cookieStore.get("user_role")?.value;

    return (
        <div className="flex min-h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md">
                <div className="flex h-16 items-center justify-center border-b">
                    <h1 className="text-xl font-bold text-primary">Colorikids Admin</h1>
                </div>
                <nav className="p-4 space-y-2">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        <span>Visão Geral</span>
                    </Link>
                    <Link
                        href="/products"
                        className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                    >
                        <Package className="h-5 w-5" />
                        <span>Produtos</span>
                    </Link>
                    <Link
                        href="/orders"
                        className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                    >
                        <ShoppingBag className="h-5 w-5" />
                        <span>Pedidos</span>
                    </Link>
                    <Link
                        href="/pos"
                        className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                    >
                        <ShoppingCart className="h-5 w-5" />
                        <span>PDV (Caixa)</span>
                    </Link>
                    <Link
                        href="/clientes"
                        className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                    >
                        <User className="h-5 w-5" />
                        <span>Clientes</span>
                    </Link>
                    {role === "OWNER" && (
                        <>
                            <Link
                                href="/financeiro"
                                className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                            >
                                <div className="h-5 w-5 flex items-center justify-center font-bold text-lg">$</div>
                                <span>Financeiro</span>
                            </Link>
                            <Link
                                href="/settings"
                                className="flex items-center gap-3 rounded-lg px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-primary"
                            >
                                <Settings className="h-5 w-5" />
                                <span>Configurações</span>
                            </Link>
                        </>
                    )}
                    <div className="pt-4 mt-4 border-t space-y-2">
                        <Link
                            href="/"
                            target="_blank"
                            className="flex items-center gap-3 rounded-lg px-4 py-2 text-blue-600 hover:bg-blue-50"
                        >
                            <ShoppingBag className="h-5 w-5" />
                            <span>Ver Loja</span>
                        </Link>
                        <Link
                            href="/login"
                            className="flex items-center gap-3 rounded-lg px-4 py-2 text-red-600 hover:bg-red-50"
                        >
                            <LogOut className="h-5 w-5" />
                            <span>Sair</span>
                        </Link>
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
