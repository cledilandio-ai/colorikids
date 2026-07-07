import { prisma } from "@/lib/db";
import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixQrCode } from "./PixQrCode";
import { getServerAuthContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterSuccessPage({ searchParams }: { searchParams: { requestId?: string } }) {
    let config = await prisma.platformConfig.findUnique({ where: { id: 1 } });
    if (!config) {
        config = await prisma.platformConfig.create({ data: { id: 1 } });
    }

    const pixKey = config.platformPixKey?.trim() || null; // null = chave não configurada
    const pixName = config.platformPixName?.trim() || config.platformName?.trim() || "COLORIKIDS"; // Agora lendo o nome do titular real
    const pixCity = config.platformPixCity?.trim() || "SAO PAULO"; // Agora lendo a cidade real
    const whatsapp = config.platformWhatsapp || "";

    // Buscar detalhes da solicitação se houver
    let requestedName = "Sua Nova Loja";
    let planValue = config.platformPlanValue || 49.90;

    if (searchParams.requestId) {
        const req = await prisma.registrationRequest.findUnique({ where: { id: searchParams.requestId } });
        if (req) {
            requestedName = req.storeName;
        }
    } else {
        // Tenta ler o contexto de autenticação do usuário logado se não for uma solicitação nova
        const ctx = await getServerAuthContext();
        if (ctx && ctx.storeId) {
            const store = await prisma.store.findUnique({
                where: { id: ctx.storeId },
                include: { subscription: true }
            });
            if (store) {
                requestedName = store.name;
                if (store.subscription) {
                    planValue = store.subscription.amount;
                }
            }
        }
    }

    // Formatar WhatsApp para link
    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    const whatsappLink = cleanWhatsapp ? `https://wa.me/${cleanWhatsapp.startsWith("55") ? cleanWhatsapp : "55" + cleanWhatsapp}?text=Ol%C3%A1%21+Acabei+de+criar+minha+loja+e+realizar+o+pagamento+da+assinatura.` : "#";

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900">
                    Sua conta foi pré-aprovada!
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600 px-4">
                    Estamos quase lá. Para liberar seu acesso ao painel multiplataforma e colocar sua loja no ar, realize o pagamento da primeira mensalidade.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-100 text-center">

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                        <PixQrCode pixKey={pixKey ?? undefined} amount={planValue} name={pixName} city={pixCity} />
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">
                            Valor da Assinatura
                        </h3>
                        <div className="text-4xl font-black text-slate-900 mb-6">
                            R$ {planValue.toFixed(2).replace(".", ",")}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Chave PIX da Plataforma:</p>
                                {pixKey ? (
                                    <div className="bg-white border border-slate-300 rounded px-3 py-2 font-mono text-sm font-semibold text-slate-800 break-all select-all">
                                        {pixKey}
                                    </div>
                                ) : (
                                    <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-600">
                                        ⚠️ Chave Pix não configurada. Acesse o painel Super Admin para configurar.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-6 px-2 text-left">
                        <strong>Próximo Passo:</strong> Após realizar o pagamento, clique no botão abaixo para enviar o comprovante para a nossa equipe e ter seu acesso liberado imediatamente.
                    </p>

                    <div className="space-y-3">
                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block w-full">
                            <Button className="w-full flex justify-center py-6 text-base font-bold bg-[#25D366] hover:bg-[#1DA851] text-white">
                                Enviar Comprovante via WhatsApp
                                <ExternalLink className="ml-2 h-5 w-5" />
                            </Button>
                        </a>

                        <Link href="/login" className="block w-full">
                            <Button variant="outline" className="w-full text-slate-600 font-semibold border-slate-300">
                                Já sou aprovado? Ir para o Login
                            </Button>
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
}
