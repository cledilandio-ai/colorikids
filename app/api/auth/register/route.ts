import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { storeName, storeSlug, ownerName, ownerEmail, ownerPassword, phone } = body;

        // Validação Mínima
        if (!storeName || !storeSlug || !ownerName || !ownerEmail || !ownerPassword) {
            return NextResponse.json({ success: false, error: "Preencha todos os campos obrigatórios." }, { status: 400 });
        }

        const normalizedEmail = ownerEmail.toLowerCase().trim();
        const normalizedSlug = storeSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, ""); // Slug-safe

        // Checar se o Slug já existe (em Lojas ou em Solicitações pendentes)
        const existingStore = await prisma.store.findUnique({ where: { slug: normalizedSlug } });
        const existingRequest = await prisma.registrationRequest.findUnique({ where: { storeSlug: normalizedSlug } });

        if (existingStore || existingRequest) {
            return NextResponse.json({ success: false, error: "Este link já está em uso ou em análise." }, { status: 400 });
        }

        // Checar se o Email já existe (em Lojas ou em Solicitações pendentes)
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        const pendingWithEmail = await prisma.registrationRequest.findFirst({ where: { ownerEmail: normalizedEmail } });

        if (existingUser || pendingWithEmail) {
            return NextResponse.json({ success: false, error: "Este email já está cadastrado ou em análise." }, { status: 400 });
        }

        // Hash da Senha
        const hashedPassword = await bcrypt.hash(ownerPassword, 10);

        // Salva uma solicitação de cadastro (OPÇÃO B - Não cria loja ainda)
        const newRequest = await prisma.registrationRequest.create({
            data: {
                storeName,
                storeSlug: normalizedSlug,
                ownerName,
                ownerEmail: normalizedEmail,
                ownerPassword: hashedPassword,
                phone: phone || ""
            }
        });

        return NextResponse.json({ success: true, requestId: newRequest.id });

    } catch (error: any) {
        console.error("ERRO NO REGISTRO SAAS:", error);
        return NextResponse.json({ 
            success: false, 
            error: `Ocorreu um erro ao criar sua loja: ${error.message || 'Erro desconhecido'}`,
            details: error.stack
        }, { status: 500 });
    }
}
