import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

/**
 * POST /api/super-admin/users/reset-password
 * Redefine a senha de um usuário lojista a partir do painel de controle do Super Admin.
 */
export async function POST(request: NextRequest) {
    // 1. Garante que quem está chamando é o Super Admin logado
    const ctx = await getAuthContext(request);
    if (!ctx || ctx.role !== "SUPER_ADMIN") {
        return NextResponse.json(
            { error: "Acesso não autorizado. Apenas administradores globais podem resetar senhas." },
            { status: 403 }
        );
    }

    try {
        const body = await request.json();
        const { userId, newPassword } = body;

        // Validação básica dos dados recebidos
        if (!userId || !newPassword) {
            return NextResponse.json(
                { error: "Os campos userId e newPassword são obrigatórios." },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: "A nova senha temporária deve conter no mínimo 8 caracteres." },
                { status: 400 }
            );
        }

        // 2. Busca o usuário correspondente no banco de dados
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Usuário não encontrado no sistema." },
                { status: 404 }
            );
        }

        // Segurança extra: impede que o Super Admin resete a senha de outro Super Admin por essa rota (a menos que seja ele mesmo ou haja controle específico)
        if (user.role === "SUPER_ADMIN" && user.id !== ctx.userId) {
            return NextResponse.json(
                { error: "Não é permitido alterar a senha de outros Super Admins." },
                { status: 403 }
            );
        }

        // 3. Criptografa a nova senha com bcryptjs (salt de 12 rounds)
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // 4. Atualiza a senha no banco de dados e marca 'shouldChangePassword: false'
        //    para permitir que o usuário acesse a conta diretamente com a nova senha
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                shouldChangePassword: false,
            },
        });

        return NextResponse.json({
            success: true,
            message: `A senha de ${user.name} (${user.email}) foi alterada com sucesso! O lojista deverá criar uma senha pessoal no primeiro acesso.`,
        });
    } catch (error: any) {
        console.error("ERRO AO RESETAR SENHA:", error);
        return NextResponse.json(
            { error: `Falha ao resetar senha do usuário: ${error.message}` },
            { status: 500 }
        );
    }
}
