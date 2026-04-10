import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signToken, COOKIE_NAME } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Busca o usuário com a loja associada
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { store: { select: { id: true, name: true, slug: true, status: true } } },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Credenciais inválidas." }, { status: 401 });
    }

    // 2. Valida senha
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ success: false, error: "Credenciais inválidas." }, { status: 401 });
    }

    // 3. Verifica status da loja (exceto SUPER_ADMIN que não tem loja)
    if (user.role !== "SUPER_ADMIN" && user.store?.status === "SUSPENDED") {
      return NextResponse.json(
        { success: false, error: "Loja suspensa. Entre em contato com o suporte." },
        { status: 403 }
      );
    }

    // 4. Gera JWT com storeId embutido
    const token = await signToken({
      sub: user.id,
      storeId: user.storeId ?? null,
      role: user.role as "SUPER_ADMIN" | "OWNER" | "SELLER",
      name: user.name,
    });

    // 5. Monta response com cookie seguro
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
        storeName: user.store?.name ?? null,
        storeSlug: user.store?.slug ?? null,
        maxDiscount: user.maxDiscount,
        permissions: user.permissions,
        shouldChangePassword: user.shouldChangePassword,
      },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: "/",
    });

    // 6. Remove cookies legados do sistema antigo
    response.cookies.delete("user_role");

    return response;

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}