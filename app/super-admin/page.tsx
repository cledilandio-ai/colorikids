"use client";

import { useEffect, useState, useRef } from "react";
import { Globe, Upload, X, Loader2, LogOut } from "lucide-react";
import { uploadImage } from "@/lib/uploadImage";

interface Store {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
    subscription: { id: string; status: string; amount: number; nextDueDate: string; notes: string | null } | null;
    users: Array<{ id: string; name: string; email: string; role: string }>;
    _count: { users: number; orders: number; products: number };
}

interface PlatformConfig {
    heroTitle: string;
    heroSubtitle: string;
    ctaText: string;
    ctaLink: string;
    logoUrl: string | null;
    backgroundImageUrl: string | null;
    primaryColor: string;
    accentColor: string;
    platformName: string;
    contactEmail: string | null;
    footerText: string | null;
    showActiveStores: boolean;
    platformInstagram: string | null;
    platformWhatsapp: string | null;
    platformPixKey: string | null;
    platformPixName: string | null;
    platformPixCity: string | null;
    platformPlanValue: number;
}

// ─── Componente de Upload de Imagem com Compressão ────────────────────────────
function ImageUploadField({
    label,
    value,
    onChange,
    bucket = "uploads",
    folder = "platform",
    hint,
}: {
    label: string;
    value: string | null;
    onChange: (url: string | null) => void;
    bucket?: string;
    folder?: string;
    hint?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Selecione apenas arquivos de imagem.");
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const url = await uploadImage(file, "banner");
            onChange(url);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro inesperado no upload.");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const inputStyle: React.CSSProperties = {
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 6,
        padding: "0.5rem 0.75rem",
        color: "#f1f5f9",
        fontSize: "0.9rem",
        width: "100%",
        boxSizing: "border-box",
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{label}</span>

            {/* Preview + Remover */}
            {value && (
                <div style={{ position: "relative", display: "inline-flex", marginBottom: 4 }}>
                    <img
                        src={value}
                        alt="preview"
                        style={{
                            height: 72,
                            maxWidth: 200,
                            objectFit: "contain",
                            borderRadius: 8,
                            border: "1px solid #334155",
                            background: "#1e293b",
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        style={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            background: "#ef4444",
                            border: "none",
                            borderRadius: "50%",
                            width: 22,
                            height: 22,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <X size={12} color="white" />
                    </button>
                </div>
            )}

            {/* Botão de upload */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    style={{
                        background: uploading ? "#1e293b" : "#334155",
                        color: "#94a3b8",
                        border: "1px solid #475569",
                        borderRadius: 6,
                        padding: "0.45rem 0.9rem",
                        cursor: uploading ? "default" : "pointer",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        opacity: uploading ? 0.7 : 1,
                    }}
                >
                    {uploading ? (
                        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                        <Upload size={14} />
                    )}
                    {uploading ? "Enviando..." : value ? "Trocar Imagem" : "Escolher Imagem"}
                </button>
                {hint && <span style={{ fontSize: "0.75rem", color: "#475569" }}>{hint}</span>}
            </div>

            {error && (
                <span style={{ fontSize: "0.75rem", color: "#f87171" }}>{error}</span>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleFile}
            />
        </div>
    );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
    const [stores, setStores] = useState<Store[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<"stores" | "requests" | "platform">("stores");

    // Estados para Edição de Assinatura & Reset de Senha
    const [editingStore, setEditingStore] = useState<Store | null>(null);
    const [editForm, setEditForm] = useState({
        amount: "0",
        nextDueDate: "",
        subscriptionStatus: "ACTIVE",
        notes: "",
    });
    const [resetPasswordUser, setResetPasswordUser] = useState<{ id: string; name: string; email: string } | null>(null);
    const [newPasswordVal, setNewPasswordVal] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);
    const [resettingPassword, setResettingPassword] = useState(false);
    const [editModalMessage, setEditModalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    async function handleSaveEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingStore) return;
        setSavingEdit(true);
        setEditModalMessage(null);
        
        try {
            const res = await fetch("/api/super-admin/stores", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    storeId: editingStore.id,
                    amount: editForm.amount,
                    nextDueDate: editForm.nextDueDate,
                    subscriptionStatus: editForm.subscriptionStatus,
                    notes: editForm.notes,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setEditModalMessage({ type: "success", text: "✅ Assinatura atualizada com sucesso!" });
                fetchStores(); // recarrega lista de lojas
                
                // Atualiza o estado da loja que está sendo editada atualmente para refletir as mudanças
                setEditingStore(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        subscription: {
                            id: prev.subscription?.id || "",
                            status: editForm.subscriptionStatus,
                            amount: parseFloat(editForm.amount) || 0,
                            nextDueDate: new Date(editForm.nextDueDate).toISOString(),
                            notes: editForm.notes || null,
                        }
                    };
                });
            } else {
                setEditModalMessage({ type: "error", text: data.error || "Erro ao salvar alterações da assinatura." });
            }
        } catch (err: any) {
            setEditModalMessage({ type: "error", text: err.message || "Erro de conexão." });
        } finally {
            setSavingEdit(false);
        }
    }

    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault();
        if (!resetPasswordUser) return;
        setResettingPassword(true);
        setEditModalMessage(null);

        try {
            const res = await fetch("/api/super-admin/users/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: resetPasswordUser.id,
                    newPassword: newPasswordVal,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setEditModalMessage({ type: "success", text: `✅ Senha de ${resetPasswordUser.name} redefinida com sucesso!` });
                setResetPasswordUser(null);
                setNewPasswordVal("");
            } else {
                setEditModalMessage({ type: "error", text: data.error || "Erro ao redefinir a senha." });
            }
        } catch (err: any) {
            setEditModalMessage({ type: "error", text: err.message || "Erro de conexão." });
        } finally {
            setResettingPassword(false);
        }
    }

    // Platform config state
    const [platformConfig, setPlatformConfig] = useState<PlatformConfig>({
        heroTitle: "",
        heroSubtitle: "",
        ctaText: "",
        ctaLink: "/login",
        logoUrl: null,
        backgroundImageUrl: null,
        primaryColor: "#e91e8c",
        accentColor: "#9c27b0",
        platformName: "",
        contactEmail: null,
        showActiveStores: true,
        platformInstagram: null,
        platformWhatsapp: null,
        platformPixKey: null,
        platformPixName: null,
        platformPixCity: null,
        platformPlanValue: 49.90,
    });
    const [savingPlatform, setSavingPlatform] = useState(false);
    const [platformMessage, setPlatformMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [form, setForm] = useState({
        storeName: "",
        storeSlug: "",
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "",
        subscriptionAmount: "0",
        billingDay: "1",
    });

    useEffect(() => {
        fetchStores();
        fetchRequests();
        fetchPlatformConfig();
    }, []);

    async function fetchRequests() {
        const res = await fetch("/api/super-admin/requests");
        if (res.ok) setRequests(await res.json());
    }

    async function fetchStores() {
        setLoading(true);
        const res = await fetch("/api/super-admin/stores");
        if (res.ok) setStores(await res.json());
        setLoading(false);
    }

    async function fetchPlatformConfig() {
        const res = await fetch("/api/super-admin/platform-config");
        if (res.ok) {
            const data = await res.json();
            setPlatformConfig({
                heroTitle: data.heroTitle ?? "",
                heroSubtitle: data.heroSubtitle ?? "",
                ctaText: data.ctaText ?? "",
                ctaLink: data.ctaLink ?? "/login",
                logoUrl: data.logoUrl ?? null,
                backgroundImageUrl: data.backgroundImageUrl ?? null,
                primaryColor: data.primaryColor ?? "#e91e8c",
                accentColor: data.accentColor ?? "#9c27b0",
                platformName: data.platformName ?? "",
                contactEmail: data.contactEmail ?? null,
                showActiveStores: data.showActiveStores ?? true,
                platformInstagram: data.platformInstagram ?? null,
                platformWhatsapp: data.platformWhatsapp ?? null,
                platformPixKey: data.platformPixKey ?? null,
                platformPixName: data.platformPixName ?? null,
                platformPixCity: data.platformPixCity ?? null,
                platformPlanValue: data.platformPlanValue ?? 49.90,
            });
        }
    }

    async function handleSavePlatform(e: React.FormEvent) {
        e.preventDefault();
        setSavingPlatform(true);
        setPlatformMessage(null);
        const res = await fetch("/api/super-admin/platform-config", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(platformConfig),
        });
        if (res.ok) {
            setPlatformMessage({ type: "success", text: "✅ Configurações da plataforma salvas! Recarregue a página inicial para ver." });
        } else {
            const err = await res.json();
            setPlatformMessage({ type: "error", text: err.error ?? "Erro ao salvar." });
        }
        setSavingPlatform(false);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);
        const res = await fetch("/api/super-admin/stores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage({ type: "success", text: data.message });
            setShowForm(false);
            setForm({ storeName: "", storeSlug: "", ownerName: "", ownerEmail: "", ownerPassword: "", subscriptionAmount: "0", billingDay: "1" });
            fetchStores();
        } else {
            setMessage({ type: "error", text: data.error });
        }
        setSubmitting(false);
    }

    async function deleteStore(storeId: string, storeName: string) {
        if (!confirm(`Tem certeza que deseja excluir DE VEZ a loja ${storeName} e todos os seus dados? Essa ação não pode ser desfeita.`)) return;
        const res = await fetch(`/api/super-admin/stores?id=${storeId}`, { method: "DELETE" });
        if (res.ok) {
            setMessage({ type: "success", text: `Loja ${storeName} excluída com sucesso.` });
            fetchStores();
        } else {
            const err = await res.json();
            setMessage({ type: "error", text: err.error });
        }
    }

    async function approveRequest(requestId: string) {
        if (!confirm("Confirmar pagamento e CRIAR esta loja agora?")) return;
        setLoading(true);
        const res = await fetch("/api/super-admin/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId, action: "APPROVE" })
        });
        if (res.ok) {
            setMessage({ type: "success", text: "✅ Loja criada e ativada com sucesso!" });
            fetchStores();
            fetchRequests();
        } else {
            const err = await res.json();
            setMessage({ type: "error", text: err.error });
        }
        setLoading(false);
    }

    async function rejectRequest(requestId: string) {
        if (!confirm("Tem certeza que deseja RECUSAR e apagar esta solicitação?")) return;
        const res = await fetch(`/api/super-admin/requests?id=${requestId}`, { method: "DELETE" });
        if (res.ok) {
            setMessage({ type: "success", text: "Solicitação recusada (excluída)." });
            fetchRequests();
        } else {
            const err = await res.json();
            setMessage({ type: "error", text: err.error || "Erro ao excluir." });
        }
    }

    async function toggleStoreStatus(storeId: string, currentStatus: string) {
        const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
        await fetch("/api/super-admin/stores", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeId, status: newStatus }),
        });
        fetchStores();
    }

    const statusColor = (s: string) => ({
        ACTIVE: "#22c55e", SUSPENDED: "#f59e0b", CANCELLED: "#ef4444", PENDING: "#3b82f6"
    }[s] || "#6b7280");

    const inputStyle: React.CSSProperties = {
        background: "#0f172a", border: "1px solid #334155", borderRadius: 6,
        padding: "0.5rem 0.75rem", color: "#f1f5f9", fontSize: "0.9rem", width: "100%", boxSizing: "border-box"
    };

    return (
        <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f1f5f9", fontFamily: "Inter, sans-serif", padding: "2rem" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <div>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>⚡ Super Admin</h1>
                        <p style={{ color: "#94a3b8", margin: "0.25rem 0 0" }}>Gestão de Lojas — {stores.length} ativas</p>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                        <a href="/" target="_blank"
                            style={{ background: "#334155", color: "#94a3b8", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", cursor: "pointer", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
                            <Globe size={14} /> Ver Página Inicial
                        </a>
                        <button
                            onClick={async () => {
                                await fetch("/api/auth/logout", { method: "POST" });
                                window.location.href = "/login";
                            }}
                            style={{ background: "#ef4444", color: "white", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}
                        >
                            <LogOut size={14} /> Sair
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #334155" }}>
                    {[
                        { id: "stores", label: "🏪 Lojas Ativas" },
                        { id: "requests", label: `📩 Solicitações ${requests.length > 0 ? `(${requests.length})` : ""}` },
                        { id: "platform", label: "🌐 Landing Page Global" },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                background: activeTab === tab.id ? "#1e293b" : "transparent",
                                color: activeTab === tab.id ? "#f1f5f9" : "#64748b",
                                border: "none", borderBottom: activeTab === tab.id ? "2px solid #6366f1" : "2px solid transparent",
                                padding: "0.6rem 1.2rem", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", marginBottom: -1
                            }}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ═══════════ ABA: LOJAS ═══════════ */}
                {activeTab === "stores" && (
                    <>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                            <button onClick={() => setShowForm(!showForm)}
                                style={{ background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", cursor: "pointer", fontWeight: 600 }}>
                                + Nova Loja
                            </button>
                        </div>

                        {message && (
                            <div style={{ background: message.type === "success" ? "#14532d" : "#7f1d1d", border: `1px solid ${message.type === "success" ? "#22c55e" : "#ef4444"}`, borderRadius: 8, padding: "1rem", marginBottom: "1.5rem" }}>
                                {message.text}
                            </div>
                        )}

                        {showForm && (
                            <form onSubmit={handleCreate} style={{ background: "#1e293b", borderRadius: 12, padding: "1.5rem", marginBottom: "2rem", border: "1px solid #334155" }}>
                                <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem", color: "#e2e8f0" }}>Cadastrar Nova Loja</h2>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                    {[
                                        { label: "Nome da Loja *", key: "storeName", placeholder: "Ex: Boutique da Ana" },
                                        { label: "Slug (URL) *", key: "storeSlug", placeholder: "ex: boutique-ana" },
                                        { label: "Nome do Owner *", key: "ownerName", placeholder: "Nome completo" },
                                        { label: "Email do Owner *", key: "ownerEmail", placeholder: "owner@email.com", type: "email" },
                                        { label: "Senha Temporária *", key: "ownerPassword", placeholder: "Mín. 8 caracteres", type: "password" },
                                        { label: "Mensalidade (R$)", key: "subscriptionAmount", placeholder: "0.00", type: "number" },
                                        { label: "Dia de cobrança", key: "billingDay", placeholder: "1-28", type: "number" },
                                    ].map(({ label, key, placeholder, type }) => (
                                        <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{label}</span>
                                            <input required={label.includes("*")} type={type || "text"} placeholder={placeholder}
                                                value={(form as any)[key]}
                                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                                style={inputStyle} />
                                        </label>
                                    ))}
                                </div>
                                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                                    <button type="submit" disabled={submitting}
                                        style={{ background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: "0.6rem 1.4rem", cursor: "pointer", fontWeight: 600, opacity: submitting ? 0.7 : 1 }}>
                                        {submitting ? "Criando..." : "Criar Loja"}
                                    </button>
                                    <button type="button" onClick={() => setShowForm(false)}
                                        style={{ background: "#334155", color: "#94a3b8", border: "none", borderRadius: 8, padding: "0.6rem 1.2rem", cursor: "pointer" }}>
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        )}

                        {loading ? (
                            <p style={{ color: "#64748b", textAlign: "center" }}>Carregando lojas...</p>
                        ) : (
                            <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", overflow: "hidden" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: "#0f172a" }}>
                                            {["Loja", "Status", "Assinatura", "Métricas", "Próx. Venc.", "Ações"].map(h => (
                                                <th key={h} style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stores.map((store, i) => (
                                            <tr key={store.id} style={{ borderTop: "1px solid #1e293b", background: i % 2 === 0 ? "#1e293b" : "#1a2535" }}>
                                                <td style={{ padding: "1rem" }}>
                                                    <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{store.name}</div>
                                                    <a href={`/c/${store.slug}`} target="_blank" style={{ fontSize: "0.75rem", color: "#6366f1", textDecoration: "none" }}>
                                                        /{store.slug} ↗
                                                    </a>
                                                </td>
                                                <td style={{ padding: "1rem" }}>
                                                    <span style={{ background: `${statusColor(store.status)}22`, color: statusColor(store.status), borderRadius: 20, padding: "0.25rem 0.75rem", fontSize: "0.75rem", fontWeight: 600 }}>
                                                        {store.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "1rem" }}>
                                                    {store.subscription ? (
                                                        <>
                                                            <div style={{ color: "#e2e8f0", fontWeight: 600 }}>R$ {store.subscription.amount.toFixed(2)}/mês</div>
                                                            <div style={{ fontSize: "0.75rem", color: statusColor(store.subscription.status) }}>{store.subscription.status}</div>
                                                        </>
                                                    ) : <span style={{ color: "#475569" }}>—</span>}
                                                </td>
                                                <td style={{ padding: "1rem", fontSize: "0.8rem", color: "#94a3b8" }}>
                                                    👤 {store._count.users} · 🛒 {store._count.orders} · 📦 {store._count.products}
                                                </td>
                                                <td style={{ padding: "1rem", fontSize: "0.8rem", color: "#94a3b8" }}>
                                                    {store.subscription ? new Date(store.subscription.nextDueDate).toLocaleDateString("pt-BR") : "—"}
                                                </td>
                                                <td style={{ padding: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                                    <button onClick={() => {
                                                        setEditingStore(store);
                                                        setEditForm({
                                                            amount: store.subscription?.amount.toString() || "0",
                                                            nextDueDate: store.subscription?.nextDueDate ? store.subscription.nextDueDate.substring(0, 10) : "",
                                                            subscriptionStatus: store.subscription?.status || "ACTIVE",
                                                            notes: store.subscription?.notes || "",
                                                        });
                                                        setEditModalMessage(null);
                                                        setResetPasswordUser(null);
                                                    }}
                                                        style={{ background: "#6366f1", color: "white", border: "none", borderRadius: 6, padding: "0.35rem 0.75rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                                                        ⚙️ Gerenciar
                                                    </button>
                                                    {store.status === "PENDING" ? (
                                                        <button onClick={() => toggleStoreStatus(store.id, store.status)}
                                                            style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: 6, padding: "0.35rem 0.75rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                                                            🟢 Aprovar PIX
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => toggleStoreStatus(store.id, store.status)}
                                                            style={{ background: store.status === "ACTIVE" ? "#7f1d1d" : "#14532d", color: "white", border: "none", borderRadius: 6, padding: "0.35rem 0.75rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                                                            {store.status === "ACTIVE" ? "Suspender" : "Ativar"}
                                                        </button>
                                                    )}
                                                    {store.status === "PENDING" && (
                                                        <button onClick={() => deleteStore(store.id, store.name)} title="Excluir Loja Definitivamente"
                                                            style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 6, padding: "0.35rem 0.6rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                                                            Excluir
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {stores.length === 0 && (
                                            <tr>
                                                <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "#475569" }}>
                                                    Nenhuma loja cadastrada. Clique em "+ Nova Loja" para começar.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Modal de Gerenciamento de Loja */}
                        {editingStore && (
                            <div style={{
                                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                                background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(4px)",
                                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
                                padding: "1.5rem"
                            }}>
                                <div style={{
                                    background: "#1e293b", border: "1px solid #334155", borderRadius: 12,
                                    width: "100%", maxWidth: 650, maxHeight: "90vh", overflowY: "auto",
                                    padding: "2rem", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                                    position: "relative"
                                }}>
                                    {/* Header do modal */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                                        <div>
                                            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "#f1f5f9" }}>
                                                ⚙️ Gerenciar Loja: {editingStore.name}
                                            </h2>
                                            <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
                                                /{editingStore.slug}
                                            </p>
                                        </div>
                                        <button onClick={() => setEditingStore(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}>
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {editModalMessage && (
                                        <div style={{
                                            background: editModalMessage.type === "success" ? "#14532d" : "#7f1d1d",
                                            border: `1px solid ${editModalMessage.type === "success" ? "#22c55e" : "#ef4444"}`,
                                            borderRadius: 8, padding: "0.85rem 1rem", marginBottom: "1.5rem", fontSize: "0.9rem",
                                            color: "#e2e8f0"
                                        }}>
                                            {editModalMessage.text}
                                        </div>
                                    )}

                                    {/* Seção 1: Detalhes de Assinatura */}
                                    <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
                                        <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 0.5rem" }}>
                                            Assinatura & Cobrança
                                        </h3>
                                        
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Mensalidade (R$)</span>
                                                <input type="number" step="0.01" value={editForm.amount}
                                                    onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                                                    style={inputStyle} />
                                            </label>

                                            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Data de Vencimento</span>
                                                <input type="date" value={editForm.nextDueDate}
                                                    onChange={e => setEditForm(f => ({ ...f, nextDueDate: e.target.value }))}
                                                    style={inputStyle} />
                                            </label>
                                        </div>

                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Status da Assinatura</span>
                                                <select value={editForm.subscriptionStatus}
                                                    onChange={e => setEditForm(f => ({ ...f, subscriptionStatus: e.target.value }))}
                                                    style={{ ...inputStyle, cursor: "pointer", height: 38 }}>
                                                    <option value="ACTIVE">ACTIVE (Ativa)</option>
                                                    <option value="OVERDUE">OVERDUE (Atrasada)</option>
                                                    <option value="CANCELLED">CANCELLED (Cancelada)</option>
                                                </select>
                                            </label>

                                            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Notas / Observações</span>
                                                <input type="text" placeholder="Ex: Pago via Pix..." value={editForm.notes}
                                                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                                    style={inputStyle} />
                                            </label>
                                        </div>

                                        <button type="submit" disabled={savingEdit}
                                            style={{
                                                background: "#6366f1", color: "white", border: "none", borderRadius: 8,
                                                padding: "0.6rem 1.2rem", cursor: "pointer", fontWeight: 600,
                                                alignSelf: "flex-end", fontSize: "0.85rem", opacity: savingEdit ? 0.7 : 1
                                            }}>
                                            {savingEdit ? "Salvando..." : "Salvar Dados da Assinatura"}
                                        </button>
                                    </form>

                                    <hr style={{ border: "0", borderTop: "1px solid #334155", margin: "1.5rem 0" }} />

                                    {/* Seção 2: Usuários & Redefinição de Senha */}
                                    <div>
                                        <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 1rem" }}>
                                            Segurança & Usuários da Loja
                                        </h3>

                                        {resetPasswordUser ? (
                                            <form onSubmit={handleResetPassword} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "1rem", marginBottom: "1rem" }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                                                    <span style={{ fontSize: "0.85rem", color: "#cbd5e1", fontWeight: 600 }}>
                                                        Resetar senha de {resetPasswordUser.name}
                                                    </span>
                                                    <button type="button" onClick={() => setResetPasswordUser(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "0.75rem" }}>
                                                        Cancelar
                                                    </button>
                                                </div>
                                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                                    <input required minLength={8} type="password" placeholder="Nova senha (mín. 8 caracteres)" value={newPasswordVal}
                                                        onChange={e => setNewPasswordVal(e.target.value)}
                                                        style={{ ...inputStyle, flex: 1 }} />
                                                    <button type="submit" disabled={resettingPassword}
                                                        style={{ background: "#ef4444", color: "white", border: "none", borderRadius: 6, padding: "0.5rem 1rem", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", opacity: resettingPassword ? 0.7 : 1 }}>
                                                        {resettingPassword ? "Salvando..." : "Confirmar"}
                                                    </button>
                                                </div>
                                            </form>
                                        ) : null}

                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                            {editingStore.users && editingStore.users.length > 0 ? (
                                                editingStore.users.map(u => (
                                                    <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "#0f172a", borderRadius: 8, border: "1px solid #334155" }}>
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "0.9rem" }}>{u.name}</div>
                                                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{u.email} · <strong style={{ color: "#6366f1" }}>{u.role}</strong></div>
                                                        </div>
                                                        <button type="button" onClick={() => {
                                                            setResetPasswordUser(u);
                                                            setNewPasswordVal("");
                                                            setEditModalMessage(null);
                                                        }}
                                                            style={{ background: "#334155", color: "#f87171", border: "none", borderRadius: 6, padding: "0.35rem 0.75rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                                                            🔑 Resetar Senha
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p style={{ color: "#64748b", fontSize: "0.85rem", textAlign: "center", margin: 0 }}>Nenhum usuário cadastrado nesta loja.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ═══════════ ABA: SOLICITAÇÕES ═══════════ */}
                {activeTab === "requests" && (
                    <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#0f172a" }}>
                                    {["Data", "Nome da Loja", "Proprietário", "Contato", "Ações"].map(h => (
                                        <th key={h} style={{ padding: "0.85rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req, i) => (
                                    <tr key={req.id} style={{ borderTop: "1px solid #1e293b", background: i % 2 === 0 ? "#1e293b" : "#1a2535" }}>
                                        <td style={{ padding: "1rem", fontSize: "0.85rem", color: "#64748b" }}>
                                            {new Date(req.createdAt).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td style={{ padding: "1rem" }}>
                                            <div style={{ fontWeight: 600, color: "#e2e8f0" }}>{req.storeName}</div>
                                            <div style={{ fontSize: "0.75rem", color: "#6366f1" }}>/c/{req.storeSlug}</div>
                                        </td>
                                        <td style={{ padding: "1rem" }}>
                                            <div style={{ color: "#e2e8f0" }}>{req.ownerName}</div>
                                            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{req.ownerEmail}</div>
                                        </td>
                                        <td style={{ padding: "1rem", fontSize: "0.85rem", color: "#94a3b8" }}>
                                            {req.phone || "—"}
                                        </td>
                                        <td style={{ padding: "1rem", display: "flex", gap: "0.5rem" }}>
                                            <button onClick={() => approveRequest(req.id)}
                                                style={{ background: "#22c55e", color: "white", border: "none", borderRadius: 6, padding: "0.45rem 0.9rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}>
                                                Aprovar & Criar Loja
                                            </button>
                                            <button onClick={() => rejectRequest(req.id)}
                                                style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 6, padding: "0.45rem 0.75rem", cursor: "pointer", fontSize: "0.75rem" }}>
                                                Recusar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ padding: "3rem", textAlign: "center", color: "#475569" }}>
                                            Nenhuma solicitação de cadastro pendente no momento.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ═══════════ ABA: PLATAFORMA ═══════════ */}
                {activeTab === "platform" && (
                    <form onSubmit={handleSavePlatform} style={{ background: "#1e293b", borderRadius: 12, padding: "2rem", border: "1px solid #334155" }}>
                        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem", color: "#e2e8f0" }}>
                            🌐 Configurações da Página Inicial ({" "}
                            <a href="/" target="_blank" style={{ color: "#6366f1", fontSize: "0.85rem" }}>ver ao vivo ↗</a>)
                        </h2>
                        <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                            Estas configurações controlam a landing page pública da plataforma (/). Não afeta nenhuma loja individual.
                        </p>

                        {platformMessage && (
                            <div style={{ background: platformMessage.type === "success" ? "#14532d" : "#7f1d1d", border: `1px solid ${platformMessage.type === "success" ? "#22c55e" : "#ef4444"}`, borderRadius: 8, padding: "0.85rem 1rem", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
                                {platformMessage.text}
                            </div>
                        )}

                        {/* Seção: Identidade */}
                        <div style={{ marginBottom: "1.75rem" }}>
                            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #334155" }}>
                                Identidade Visual
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                                {[
                                    { label: "Nome da Plataforma", key: "platformName", placeholder: "Vast Cosmos" },
                                    { label: "Email de Contato", key: "contactEmail", placeholder: "contato@plataforma.com", type: "email" },
                                ].map(({ label, key, placeholder, type }) => (
                                    <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{label}</span>
                                        <input type={type || "text"} placeholder={placeholder}
                                            value={(platformConfig as any)[key] ?? ""}
                                            onChange={e => setPlatformConfig(c => ({ ...c, [key]: e.target.value }))}
                                            style={inputStyle} />
                                    </label>
                                ))}

                                {/* Cores */}
                                {[
                                    { label: "Cor Principal", key: "primaryColor" },
                                    { label: "Cor de Destaque", key: "accentColor" },
                                ].map(({ label, key }) => (
                                    <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{label}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                            <input type="color" value={(platformConfig as any)[key] || "#e91e8c"}
                                                onChange={e => setPlatformConfig(c => ({ ...c, [key]: e.target.value }))}
                                                style={{ width: 40, height: 36, padding: 2, border: "1px solid #334155", borderRadius: 6, background: "#0f172a", cursor: "pointer" }} />
                                            <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{(platformConfig as any)[key]}</span>
                                        </div>
                                    </label>
                                ))}

                                {/* Logo Upload */}
                                <ImageUploadField
                                    label="Logo da Plataforma"
                                    value={platformConfig.logoUrl}
                                    onChange={url => setPlatformConfig(c => ({ ...c, logoUrl: url }))}
                                    folder="platform/logo"
                                    hint="Recomendado: PNG/WebP, max 400×120px"
                                />
                            </div>
                        </div>

                        {/* Seção: Texto Hero */}
                        <div style={{ marginBottom: "1.75rem" }}>
                            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid #334155" }}>
                                Seção Hero (Principal)
                            </h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                                {[
                                    { label: "Título Principal (Hero)", key: "heroTitle", placeholder: "Bem-vindo à nossa plataforma" },
                                    { label: "Subtítulo", key: "heroSubtitle", placeholder: "Gerencie sua loja com facilidade." },
                                    { label: "Texto do Botão CTA", key: "ctaText", placeholder: "Acessar meu Painel" },
                                    { label: "Link do Botão CTA", key: "ctaLink", placeholder: "/login" },
                                ].map(({ label, key, placeholder }) => (
                                    <label key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{label}</span>
                                        <input type="text" placeholder={placeholder}
                                            value={(platformConfig as any)[key] ?? ""}
                                            onChange={e => setPlatformConfig(c => ({ ...c, [key]: e.target.value }))}
                                            style={inputStyle} />
                                    </label>
                                ))}

                                <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
                                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Texto do Rodapé</span>
                                    <input type="text" placeholder="© 2025 Vast Cosmos. Todos os direitos reservados."
                                        value={platformConfig.footerText ?? ""}
                                        onChange={e => setPlatformConfig(c => ({ ...c, footerText: e.target.value }))}
                                        style={inputStyle} />
                                </label>
                            </div>
                        </div>

                        {/* Seção: Redes Sociais da Plataforma */}
                        <div style={{ marginBottom: "1.75rem" }}>
                            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem", paddingBottom: "0.5rem", borderBottom: "1px solid #334155" }}>
                                Redes Sociais da Plataforma
                            </h3>
                            <p style={{ fontSize: "0.78rem", color: "#475569", marginBottom: "1rem" }}>
                                Estes contatos são da <strong style={{ color: "#94a3b8" }}>plataforma</strong>, não das lojas individuais. Aparecem apenas em páginas globais.
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Instagram da Plataforma (URL)</span>
                                    <input type="url" placeholder="https://instagram.com/vast_cosmos"
                                        value={platformConfig.platformInstagram ?? ""}
                                        onChange={e => setPlatformConfig(c => ({ ...c, platformInstagram: e.target.value || null }))}
                                        style={inputStyle} />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>WhatsApp da Plataforma (apenas números)</span>
                                    <input type="tel" placeholder="5511999999999"
                                        value={platformConfig.platformWhatsapp ?? ""}
                                        onChange={e => setPlatformConfig(c => ({ ...c, platformWhatsapp: e.target.value || null }))}
                                        style={inputStyle} />
                                </label>
                            </div>
                        </div>

                        {/* Seção: Cobrança SaaS (PIX) */}
                        <div style={{ marginBottom: "1.75rem" }}>
                            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem", paddingBottom: "0.5rem", borderBottom: "1px solid #334155" }}>
                                Configurações de Faturamento (SaaS)
                            </h3>
                            <p style={{ fontSize: "0.78rem", color: "#475569", marginBottom: "1rem" }}>
                                Estes dados serão exibidos aos lojistas que tiverem assinaturas vencidas ou quando registrarem uma nova conta.
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Chave PIX da Plataforma</span>
                                    <input type="text" placeholder="CNPJ, Email, Telefone..."
                                        value={platformConfig.platformPixKey ?? ""}
                                        onChange={e => setPlatformConfig(c => ({ ...c, platformPixKey: e.target.value || null }))}
                                        style={inputStyle} />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Valor da Mensalidade Padrão (R$)</span>
                                    <input type="number" step="0.01" min="0" placeholder="49.90"
                                        value={platformConfig.platformPlanValue ?? 49.90}
                                        onChange={e => setPlatformConfig(c => ({ ...c, platformPlanValue: parseFloat(e.target.value) || 0 }))}
                                        style={inputStyle} />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Titular da Chave PIX (Nome no Banco)</span>
                                    <input type="text" placeholder="Nome exato associado à conta"
                                        value={platformConfig.platformPixName ?? ""}
                                        onChange={e => setPlatformConfig(c => ({ ...c, platformPixName: e.target.value || null }))}
                                        style={inputStyle} />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Cidade do Titular (Máx. 15 caracteres)</span>
                                    <input type="text" placeholder="Ex: SAO PAULO" maxLength={15}
                                        value={platformConfig.platformPixCity ?? ""}
                                        onChange={e => setPlatformConfig(c => ({ ...c, platformPixCity: e.target.value?.toUpperCase() || null }))}
                                        style={inputStyle} />
                                </label>
                            </div>
                        </div>

                        {/* Checkbox showActiveStores */}
                        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem", cursor: "pointer" }}>
                            <input type="checkbox" checked={platformConfig.showActiveStores}
                                onChange={e => setPlatformConfig(c => ({ ...c, showActiveStores: e.target.checked }))}
                                style={{ width: 18, height: 18, cursor: "pointer" }} />
                            <span style={{ color: "#cbd5e1", fontSize: "0.9rem" }}>
                                Exibir cards das lojas ativas na página inicial
                            </span>
                        </label>

                        <button type="submit" disabled={savingPlatform}
                            style={{ background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: "0.75rem 2rem", cursor: "pointer", fontWeight: 700, fontSize: "0.95rem", opacity: savingPlatform ? 0.7 : 1 }}>
                            {savingPlatform ? "Salvando..." : "💾 Salvar Configurações da Plataforma"}
                        </button>
                    </form>
                )}

            </div>
        </div>
    );
}
