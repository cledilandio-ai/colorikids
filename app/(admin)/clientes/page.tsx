"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Plus, User, Phone, MapPin, Edit, Trash, X, Mail } from "lucide-react";

interface Customer {
    id: string;
    name: string;
    cpf?: string;
    phone?: string;
    email?: string;
    address?: string;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        cpf: "",
        phone: "",
        email: "",
        address: ""
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        fetchCustomers();
    }, [search]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            const res = await fetch(`/api/customers?${params.toString()}`);
            const data = await res.json();
            setCustomers(data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const method = editingId ? "PUT" : "POST";
            const body = editingId ? { ...formData, id: editingId } : formData;

            const res = await fetch("/api/customers", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setShowModal(false);
                setFormData({ name: "", cpf: "", phone: "", email: "", address: "" });
                setEditingId(null);
                fetchCustomers();
                alert(editingId ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
            } else {
                alert("Erro ao salvar cliente.");
            }
        } catch (error) {
            console.error(error);
            alert("Erro de conexão.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (customer: Customer) => {
        setFormData({
            name: customer.name,
            cpf: customer.cpf || "",
            phone: customer.phone || "",
            email: customer.email || "",
            address: customer.address || ""
        });
        setEditingId(customer.id);
        setShowModal(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o cliente "${name}"?`)) return;

        try {
            // Check if customer has orders or debts first? 
            // Ideally backend handles this constraint, but for now we just try delete (if implemented) or just warn.
            // Since we didn't implement DELETE in route yet, let's just alert strictly or implement it now.
            // Wait, I missed implementing DELETE in the plan/backend.
            // User didn't ask for delete, but "Edit" usually implies full management.
            // I'll stick to Edit for now as requested by user -> "não tem como editar".
            // Adding Delete button for completeness but disabling it or simple alert for now if method missing?
            // Actually, I should probably implement DELETE in backend too if I add the button.
            // For now, let's just add the Edit button as requested.
            alert("Exclusão não implementada nesta versão.");
        } catch (error) {
            console.error(error);
        }
    };

    const openNewCustomerModal = () => {
        setFormData({ name: "", cpf: "", phone: "", email: "", address: "" });
        setEditingId(null);
        setShowModal(true);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Clientes</h1>
                <Button onClick={openNewCustomerModal} className="gap-2">
                    <Plus className="h-4 w-4" /> Novo Cliente
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                    className="w-full rounded-xl border border-gray-300 p-3 pl-10 text-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Buscar por nome, CPF ou telefone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : customers.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                    <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Nenhum cliente encontrado.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {customers.map((customer) => (
                        <div key={customer.id} className="bg-white rounded-xl shadow-sm border p-5 transition-all hover:shadow-md hover:border-blue-200">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{customer.name}</h3>
                                    {customer.cpf && <p className="text-sm text-gray-500 font-mono">CPF: {customer.cpf}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                        <User className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                {customer.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span>{customer.phone}</span>
                                    </div>
                                )}
                                {customer.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="line-clamp-1">{customer.email}</span>
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        <span className="line-clamp-1">{customer.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900">{editingId ? "Editar Cliente" : "Novo Cliente"}</h2>
                            <button onClick={() => setShowModal(false)}><X className="h-6 w-6 text-gray-500 hover:text-gray-700" /></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                                <input
                                    required
                                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: João da Silva"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                                    <input
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        value={formData.cpf}
                                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                        placeholder="000.000.000-00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                                    <input
                                        className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@exemplo.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                                <input
                                    className="w-full rounded-md border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Rua, Número, Bairro"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1" disabled={isSaving}>
                                    {isSaving ? "Salvando..." : (editingId ? "Atualizar Cliente" : "Salvar Cliente")}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
