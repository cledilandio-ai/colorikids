import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowRight, ShoppingBag, Instagram, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlatformLandingPage() {
    // Carrega configurações globais da plataforma
    let config = await prisma.platformConfig.findUnique({ where: { id: 1 } }).catch(() => null);

    // Cria registro padrão se não existir (primeira vez)
    if (!config) {
        config = await prisma.platformConfig.create({ data: { id: 1 } }).catch(() => null);
    }

    // Carrega lojas ativas para exibir na vitrine (se configurado)
    const activeStores = config?.showActiveStores
        ? await prisma.store.findMany({
              where: { status: "ACTIVE" },
              include: { storeConfig: true },
              orderBy: { createdAt: "asc" },
          }).catch(() => [])
        : [];

    const platformName = config?.platformName ?? "Vast Cosmos";
    const heroTitle = config?.heroTitle ?? "Bem-vindo à nossa plataforma";
    const heroSubtitle = config?.heroSubtitle ?? "Gerencie sua loja com facilidade.";
    const ctaText = config?.ctaText ?? "Acessar meu Painel";
    const ctaLink = config?.ctaLink ?? "/login";
    const primaryColor = config?.primaryColor ?? "#e91e8c";
    const accentColor = config?.accentColor ?? "#9c27b0";
    const footerText = config?.footerText ?? `© ${new Date().getFullYear()} ${platformName}. Todos os direitos reservados.`;
    
    // Format whatsapp phone
    const formatPhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, "");
        if (cleaned.startsWith("55") && (cleaned.length === 12 || cleaned.length === 13)) {
            return cleaned;
        }
        if (cleaned.length === 10 || cleaned.length === 11) {
            return `55${cleaned}`;
        }
        return cleaned;
    };

    const platformWhatsappClean = config?.platformWhatsapp ? formatPhone(config.platformWhatsapp) : null;
    const whatsappMessage = encodeURIComponent("Olá! Vim pela plataforma e gostaria de saber mais.");

    return (
        <main
            className="min-h-screen flex flex-col"
            style={{ fontFamily: "'Inter', sans-serif", background: "#fafafa" }}
        >
            {/* Header com glassmorphism */}
            <header
                className="flex items-center justify-between px-6 py-4 sticky top-0 z-50"
                style={{
                    background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(12px)",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                }}
            >
                <div className="flex items-center gap-2">
                    {config?.logoUrl ? (
                        <img src={config.logoUrl} alt={platformName} className="h-9 object-contain" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                style={{
                                    background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                                }}
                            >
                                {platformName[0]}
                            </div>
                            <span className="font-bold text-gray-800 text-lg">{platformName}</span>
                        </div>
                    )}
                </div>
                <Link
                    href="/login"
                    className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-all hover:opacity-90 hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
                >
                    Entrar
                </Link>
            </header>

            {/* Hero — Padrão Grid SaaS (sem foto externa, 100% CSS) */}
            <section
                className="relative flex flex-col items-center justify-center text-center px-4 py-28 overflow-hidden"
                style={{
                    background: `
                        radial-gradient(ellipse at top, ${primaryColor}14 0%, transparent 60%),
                        radial-gradient(ellipse at bottom right, ${accentColor}0e 0%, transparent 60%),
                        #ffffff
                    `,
                }}
            >
                {/* Grade decorativa — padrão SaaS moderno */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage: `
                            linear-gradient(${primaryColor}18 1px, transparent 1px),
                            linear-gradient(90deg, ${primaryColor}18 1px, transparent 1px)
                        `,
                        backgroundSize: "40px 40px",
                        maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
                        WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
                    }}
                />

                {/* Círculo decorativo de fundo */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
                    style={{
                        background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)`,
                        filter: "blur(60px)",
                    }}
                />

                <div className="relative max-w-3xl mx-auto">
                    <div
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6"
                        style={{
                            background: `${primaryColor}15`,
                            color: primaryColor,
                            border: `1px solid ${primaryColor}30`,
                        }}
                    >
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: primaryColor }} />
                        Plataforma Multi-Loja
                    </div>

                    <h1
                        className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight"
                        style={{
                            background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        {heroTitle}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
                        {heroSubtitle}
                    </p>
                    <Link
                        href={ctaLink}
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all hover:opacity-90 hover:scale-105 hover:shadow-xl"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
                    >
                        {ctaText} <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Lojas Ativas */}
            {activeStores.length > 0 && (
                <section
                    className="py-20 px-4"
                    style={{ background: "#f8fafc" }}
                >
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
                                Nossas Lojas
                            </h2>
                            <p className="text-gray-500 text-sm">Explore as lojas disponíveis na plataforma</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {activeStores.map((store) => (
                                <Link
                                    key={store.id}
                                    href={`/c/${store.slug}`}
                                    className="group bg-white rounded-2xl border border-gray-100 p-7 flex flex-col items-center gap-3 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                                    style={{ borderColor: "rgba(0,0,0,0.06)" }}
                                >
                                    <div
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-sm"
                                        style={{
                                            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                                        }}
                                    >
                                        {(store.storeConfig?.companyName ?? store.name)[0].toUpperCase()}
                                    </div>
                                    <h3 className="font-semibold text-gray-800 text-center text-base mt-1">
                                        {store.storeConfig?.companyName ?? store.name}
                                    </h3>
                                    <span className="text-xs text-gray-400">/{store.slug}</span>
                                    <span
                                        className="flex items-center gap-1 text-sm font-semibold mt-1 group-hover:underline"
                                        style={{ color: primaryColor }}
                                    >
                                        <ShoppingBag className="w-4 h-4" /> Ver vitrine
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="mt-auto bg-white border-t py-7 px-4 text-center text-sm text-gray-400">
                <p>{footerText}</p>
                {config?.contactEmail && (
                    <p className="mt-1">
                        Contato:{" "}
                        <a href={`mailto:${config.contactEmail}`} className="underline hover:text-gray-600">
                            {config.contactEmail}
                        </a>
                    </p>
                )}
            </footer>

            {/* Plataforma: Social Links */}
            <div className="fixed bottom-20 right-4 z-30 flex flex-col gap-3">
                {config?.platformInstagram && (
                    <a
                        href={config.platformInstagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white shadow-lg transition-transform hover:scale-110"
                        aria-label="Instagram da Plataforma"
                    >
                        <Instagram className="h-6 w-6" />
                    </a>
                )}
                {platformWhatsappClean && (
                    <a
                        href={`https://wa.me/${platformWhatsappClean}?text=${whatsappMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110"
                        aria-label="WhatsApp da Plataforma"
                    >
                        <MessageCircle className="h-6 w-6" />
                    </a>
                )}
            </div>
        </main>
    );
}
