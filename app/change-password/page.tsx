"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";

// Separate component to use useSearchParams within Suspense boundary
function ChangePasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = searchParams.get("userId");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("As senhas não coincidem");
            return;
        }

        if (password.length < 4) {
            setError("A senha deve ter pelo menos 4 caracteres");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, newPassword: password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert("Senha alterada com sucesso! Faça login novamente.");
                router.push("/login");
            } else {
                setError(data.error || "Erro ao alterar senha");
            }
        } catch (err) {
            console.error("Change password error", err);
            setError("Erro ao processar solicitação");
        } finally {
            setLoading(false);
        }
    };

    if (!userId) {
        return (
            <div className="text-center text-red-500">
                Erro: ID do usuário não encontrado.
                <br />
                <Button variant="link" onClick={() => router.push("/login")}>
                    Voltar para Login
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="text-sm font-medium text-red-500 bg-red-50 p-2 rounded">
                    {error}
                </div>
            )}
            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nova Senha
                </label>
                <input
                    type="password"
                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nova senha"
                    required
                />
            </div>
            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Confirmar Nova Senha
                </label>
                <input
                    type="password"
                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar senha"
                    required
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Alterando..." : "Alterar Senha"}
            </Button>
        </form>
    );
}

export default function ChangePasswordPage() {
    return (
        <main className="min-h-screen bg-background">
            <Navbar />
            <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
                <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-lg">
                    <h1 className="mb-6 text-center text-2xl font-bold text-primary">
                        Alterar Senha
                    </h1>
                    <p className="mb-6 text-center text-sm text-gray-600">
                        É necessário alterar sua senha no primeiro acesso.
                    </p>
                    <Suspense fallback={<div>Carregando...</div>}>
                        <ChangePasswordForm />
                    </Suspense>
                </div>
            </div>
        </main>
    );
}
