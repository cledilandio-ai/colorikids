import { cookies } from "next/headers";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = cookies();
    const role = cookieStore.get("user_role")?.value;
    const userId = cookieStore.get("user_id")?.value;

    let permissions: string[] = [];
    if (userId) {
        try {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { permissions: true } });
            if (user && user.permissions) {
                permissions = user.permissions;
            }
        } catch (e) {
            console.error("Error fetching permissions", e);
        }
    }

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <AdminSidebar role={role} permissions={permissions} />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto w-full pt-16 md:pt-0">
                {/* Added pt-16 for mobile header space, removed p-8 to allow individual pages to control padding or keep it if desired. keeping generic structure. */}
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
