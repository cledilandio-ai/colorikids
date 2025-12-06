"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Check for forced password change
                if (data.user.shouldChangePassword) {
                    router.push(`/change-password?userId=${data.user.id}`);
                    return;
                }

                // Set cookie based on role
                const role = data.user.role;
                document.cookie = `user_role=${role}; path=/; max-age=86400`; // 1 day
                document.cookie = `user_id=${data.user.id}; path=/; max-age=86400`;

                if (role === "OWNER") {
                    router.push("/dashboard");
                } else {
                    router.push("/pos");
                }
            } else {
                alert("Credenciais inválidas!");
            }
        } catch (error) {
            console.error("Login failed", error);
            alert("Erro ao tentar fazer login. Tente novamente.");
        }
    };

    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
                <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-lg">
                    <h1 className="mb-6 text-center text-2xl font-bold text-primary">
                        Acesso Restrito
                    </h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <input
                                type="email"
                                className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Senha
                            </label>
                            <input
                                type="password"
                                className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full">
                            Entrar
                        </Button>
                    </form>
                </div>
            </div>
        </main>
    );
}
