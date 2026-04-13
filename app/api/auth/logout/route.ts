import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
    const response = NextResponse.json({ success: true });

    // Apaga o cookie JWT principal
    response.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    });

    // Apaga também cookies legados do sistema antigo, por via das dúvidas
    response.cookies.set("user_role", "", { maxAge: 0, path: "/" });
    response.cookies.set("user_id", "", { maxAge: 0, path: "/" });

    return response;
}
