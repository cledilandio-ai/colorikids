"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Save, Trash, Plus } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabaseClient";

export default function SettingsPage() {
    const { whatsapp, whatsappMessage, companyName, cnpj, instagram, pixKey, pixKeyType, featuredImageUrls, refreshSettings } = useSettings();
    const [formData, setFormData] = useState({
        whatsapp: "",
        whatsappMessage: "",
        companyName: "",
        cnpj: "",
        instagram: "",
        pixKey: "",
        pixKeyType: "CPF",
        featuredImageUrls: [] as { url: string; instagramLink?: string }[],
    });
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "SELLER" });

    const fetchUsers = async () => {
        const res = await fetch("/api/users");
        if (res.ok) {
            setUsers(await res.json());
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newUser),
        });

        if (res.ok) {
            setNewUser({ name: "", email: "", password: "", role: "SELLER" });
            fetchUsers();
            alert("Funcionário cadastrado com sucesso!");
        } else {
            const data = await res.json();
            alert(data.error || "Erro ao cadastrar funcionário");
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover este funcionário?")) return;

        const res = await fetch(`/api/users/${id}`, {
            method: "DELETE",
        });

        if (res.ok) {
            fetchUsers();
        } else {
            alert("Erro ao remover funcionário");
        }
    };

    useEffect(() => {
        setFormData({
            whatsapp: whatsapp || "",
            whatsappMessage: whatsappMessage || "",
            companyName: companyName || "",
            cnpj: cnpj || "",
            instagram: instagram || "",
            pixKey: pixKey || "",
            pixKeyType: pixKeyType || "CPF",
            featuredImageUrls: featuredImageUrls || []
        });
    }, [whatsapp, whatsappMessage, companyName, cnpj, instagram, pixKey, pixKeyType, featuredImageUrls]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Check if it is an image
                if (!file.type.startsWith("image/")) {
                    alert("Por favor, selecione apenas imagens.");
                    return;
                }

                const sanitizedFileName = file.name
                    .normalize('NFD') // Decompose combined characters
                    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
                    .replace(/[^a-zA-Z0-9.-]/g, "_"); // Replace invalid chars with underscore

                const filename = "public/" + Date.now() + "_" + sanitizedFileName;

                const { data, error } = await supabase.storage
                    .from("uploads")
                    .upload(filename, file, {
                        upsert: false
                    });

                if (error) {
                    console.error("Erro no upload:", error);
                    alert("Erro ao fazer upload da imagem.");
                    return;
                }

                const { data: publicUrlData } = supabase.storage
                    .from("uploads")
                    .getPublicUrl(filename);

                setFormData(prev => ({
                    ...prev,
                    featuredImageUrls: [...prev.featuredImageUrls, { url: publicUrlData.publicUrl, instagramLink: "" }]
                }));

            } catch (err) {
                console.error(err);
                alert("Erro inesperado no upload.");
            }
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            featuredImageUrls: prev.featuredImageUrls.filter((_, i) => i !== index)
        }));
    };

    const handleHighlightLinkChange = (index: number, link: string) => {
        setFormData(prev => {
            const newHighlights = [...prev.featuredImageUrls];
            newHighlights[index] = { ...newHighlights[index], instagramLink: link };
            return { ...prev, featuredImageUrls: newHighlights };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                alert("Configurações salvas com sucesso!");
                await refreshSettings();
            } else {
                alert("Erro ao salvar configurações.");
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Erro ao conectar com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    const [passwordData, setPasswordData] = useState({
        newPassword: "",
        confirmPassword: ""
    });

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("As senhas não coincidem!");
            return;
        }

        if (passwordData.newPassword.length < 4) {
            alert("A senha deve ter pelo menos 4 caracteres!");
            return;
        }

        // Get user_id from cookie
        const userIdCookie = document.cookie
            .split("; ")
            .find((row) => row.startsWith("user_id="));

        const userId = userIdCookie ? userIdCookie.split("=")[1] : null;

        if (!userId) {
            alert("Erro: ID do usuário não encontrado. Faça login novamente.");
            return;
        }

        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: userId,
                    newPassword: passwordData.newPassword
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                alert("Senha alterada com sucesso! Faça login novamente com a nova senha.");
                setPasswordData({ newPassword: "", confirmPassword: "" });
            } else {
                alert(data.error || "Erro ao alterar senha");
            }
        } catch (error) {
            console.error("Password change error:", error);
            alert("Erro ao conectar com o servidor.");
        }
    };

    return (
        <div className="p-6">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Configurações do Sistema</h1>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="mb-8">
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="employees">Funcionários</TabsTrigger>
                    <TabsTrigger value="security">Segurança</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <div className="max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome da Empresa
                                </label>
                                <input
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Ex: Colorikids"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Nome exibido no topo do site e nos comprovantes.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    WhatsApp para Vendas
                                </label>
                                <input
                                    name="whatsapp"
                                    value={formData.whatsapp}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Ex: 5511999999999"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Número para onde os pedidos serão enviados (formato internacional, apenas números).
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mensagem Padrão do WhatsApp
                                </label>
                                <input
                                    name="whatsappMessage"
                                    value={formData.whatsappMessage}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Ex: Olá! Vim pelo site..."
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Mensagem que aparecerá automaticamente quando o cliente clicar no botão do WhatsApp.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Instagram URL (Perfil da Loja)
                                </label>
                                <input
                                    name="instagram"
                                    value={formData.instagram}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Ex: https://instagram.com/colorikids"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    CNPJ (Opcional)
                                </label>
                                <input
                                    name="cnpj"
                                    value={formData.cnpj}
                                    onChange={handleChange}
                                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Chave PIX
                                    </label>
                                    <input
                                        name="pixKey"
                                        value={formData.pixKey}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Chave PIX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo de Chave
                                    </label>
                                    <select
                                        name="pixKeyType"
                                        value={formData.pixKeyType}
                                        onChange={(e) => setFormData(prev => ({ ...prev, pixKeyType: e.target.value }))}
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="CPF">CPF</option>
                                        <option value="CNPJ">CNPJ</option>
                                        <option value="EMAIL">E-mail</option>
                                        <option value="PHONE">Telefone</option>
                                        <option value="RANDOM">Aleatória</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Destaques (Mobile)
                                </label>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        {formData.featuredImageUrls.map((item, index) => (
                                            <div key={index} className="flex flex-col gap-2 rounded-lg border p-3 bg-gray-50">
                                                <div className="relative h-40 w-full overflow-hidden rounded-md border group">
                                                    <img src={item.url} alt={`Destaque ${index + 1}`} className="h-full w-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-sm font-medium transition-opacity hover:bg-black/60"
                                                    >
                                                        <Trash className="mr-2 h-4 w-4" />
                                                        Remover Imagem
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-600 block mb-1">
                                                        Link do Instagram (Opcional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={item.instagramLink || ""}
                                                        onChange={(e) => handleHighlightLinkChange(index, e.target.value)}
                                                        className="w-full text-sm rounded border border-gray-300 px-2 py-1.5 focus:border-primary focus:outline-none"
                                                        placeholder="Cole o link do Reel/Post"
                                                    />
                                                </div>
                                            </div>
                                        ))}

                                        <label className="cursor-pointer flex h-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white text-sm text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                                                <Plus className="h-6 w-6 text-gray-600" />
                                            </span>
                                            <span className="font-medium">Adicionar Novo Destaque</span>
                                            <input
                                                type="file"
                                                accept="image/jpeg, image/jpg, image/png"
                                                className="hidden"
                                                onChange={handleImageUpload}
                                            />
                                        </label>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Imagens exibidas no topo da página inicial em dispositivos móveis. Você pode adicionar um link do Instagram para cada imagem.
                                </p>
                            </div>

                            <div className="pt-4">
                                <Button type="submit" disabled={loading} className="gap-2">
                                    <Save className="h-4 w-4" />
                                    {loading ? "Salvando..." : "Salvar Configurações"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="employees">
                    <div className="grid gap-8 md:grid-cols-2">
                        {/* List Users */}
                        <div className="rounded-xl border bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-xl font-bold text-gray-800">Funcionários Cadastrados</h2>
                            <div className="space-y-4">
                                {users.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                            <p className="font-medium text-gray-900">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                            <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                                {user.role === "OWNER" ? "Proprietário" : "Vendedor"}
                                            </span>
                                        </div>
                                        {user.role !== "OWNER" && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-400 hover:text-red-600"
                                                onClick={() => handleDeleteUser(user.id)}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                {users.length === 0 && (
                                    <p className="text-center text-gray-500">Nenhum funcionário cadastrado.</p>
                                )}
                            </div>
                        </div>

                        {/* Create User Form */}
                        <div className="rounded-xl border bg-white p-6 shadow-sm h-fit">
                            <h2 className="mb-4 text-xl font-bold text-gray-800">Novo Funcionário</h2>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                                    <input
                                        required
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Nome do funcionário"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (Login)</label>
                                    <input
                                        required
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                    <input
                                        required
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="******"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="SELLER">Vendedor</option>
                                        <option value="OWNER">Proprietário</option>
                                    </select>
                                </div>
                                <Button type="submit" className="w-full">
                                    Cadastrar Funcionário
                                </Button>
                            </form>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="security">
                    <div className="max-w-md rounded-xl border bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-xl font-bold text-gray-800">Alterar Senha</h2>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nova Senha
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirmar Nova Senha
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="••••••••"
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                Alterar Senha
                            </Button>
                        </form>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
