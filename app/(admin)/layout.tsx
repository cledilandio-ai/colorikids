import { cookies } from "next/headers";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = cookies();
    const role = cookieStore.get("user_role")?.value;

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            <AdminSidebar role={role} />

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
