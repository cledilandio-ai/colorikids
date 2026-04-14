"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Store as StoreIcon, AtSign, Phone, Lock, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    const [form, setForm] = useState({
        storeName: "",
        storeSlug: "",
        ownerName: "",
        ownerEmail: "",
        phone: "",
        ownerPassword: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => {
            const newForm = { ...prev, [name]: value };
            if (name === "storeName" && !prev.storeSlug) {
                // Auto-generate slug suggestion
                newForm.storeSlug = value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, '-');
            }
            return newForm;
        });
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({
            ...prev,
            storeSlug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, '-')
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Erro ao criar loja.");
            }

            // Redireciona para a tela de Sucesso/Pagamento pendente com o ID da solicitação
            router.push(`/assinatura?requestId=${data.requestId}`);
            
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
                    <StoreIcon className="text-primary h-8 w-8" />
                    Crie Sua Loja
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    Comece a vender online em menos de 2 minutos.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center font-medium border border-red-100">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Nome da Loja</label>
                            <div className="mt-1">
                                <Input
                                    required
                                    name="storeName"
                                    value={form.storeName}
                                    onChange={handleChange}
                                    placeholder="Ex: Minha Boutique"
                                    className="block w-full"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Link da sua Loja</label>
                            <div className="mt-1 flex rounded-md shadow-sm">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                                    /c/
                                </span>
                                <Input
                                    required
                                    name="storeSlug"
                                    value={form.storeSlug}
                                    onChange={handleSlugChange}
                                    placeholder="minha-boutique"
                                    className="flex-1 block w-full rounded-none rounded-r-md"
                                />
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                url: seudominio.com.br/c/<span className="font-bold text-slate-700">{form.storeSlug || "sua-loja"}</span>
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Seu Nome</label>
                            <div className="mt-1">
                                <Input
                                    required
                                    name="ownerName"
                                    value={form.ownerName}
                                    onChange={handleChange}
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">E-mail Profissional</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <AtSign className="h-4 w-4 text-slate-400" />
                                </div>
                                <Input
                                    type="email"
                                    required
                                    name="ownerEmail"
                                    value={form.ownerEmail}
                                    onChange={handleChange}
                                    placeholder="joao@exemplo.com"
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Telefone / WhatsApp</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                </div>
                                <Input
                                    type="tel"
                                    required
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    placeholder="(11) 99999-9999"
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Senha Pessoal</label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                </div>
                                <Input
                                    type="password"
                                    required
                                    name="ownerPassword"
                                    value={form.ownerPassword}
                                    onChange={handleChange}
                                    placeholder="Sua senha secreta do painel"
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <Button 
                                type="submit" 
                                className="w-full flex justify-center py-6 text-base font-bold bg-primary hover:bg-primary/90 text-white"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Criando Loja...
                                    </>
                                ) : (
                                    <>
                                        Criar Minha Loja Agora
                                        <ChevronRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
