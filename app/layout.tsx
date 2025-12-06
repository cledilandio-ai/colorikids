import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Colorikids",
    description: "Moda Infantil e Juvenil",
};

import { Providers } from "@/components/Providers";
import { FloatingSocials } from "@/components/FloatingSocials";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
            <body className={inter.className}>
                <Providers>
                    {children}
                    <FloatingSocials />
                </Providers>
            </body>
        </html>
    );
}
