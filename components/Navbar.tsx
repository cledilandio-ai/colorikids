"use client";

import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartSheet } from "@/components/CartSheet";

import { useSettings } from "@/context/SettingsContext";

export function Navbar() {
    const { companyName } = useSettings();

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-primary">
                        <Image
                            src="/logo.png"
                            alt="Colorikids Logo"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <span className="text-xl font-bold text-primary">{companyName}</span>
                </Link>

                <div className="flex items-center gap-4">
                    <CartSheet />
                    <Link href="/login">
                        <Button variant="ghost" size="icon">
                            <User className="h-6 w-6 text-primary" />
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
