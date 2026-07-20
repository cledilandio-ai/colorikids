"use client";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

function calculateCRC16(payload: string): string {
    const polynomial = 0x1021;
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
        let c = payload.charCodeAt(i);
        crc ^= c << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ polynomial;
            } else {
                crc = crc << 1;
            }
        }
    }
    return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

function formatField(id: string, value: string): string {
    const len = value.length.toString().padStart(2, "0");
    return `${id}${len}${value}`;
}

export function generatePixPayload({
    key,
    name,
    city,
    transactionId = "***",
    amount,
    description
}: {
    key: string;
    name: string;
    city: string;
    transactionId?: string;
    amount?: number;
    description?: string;
}) {
    const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleanName = removeAccents(name.trim()).substring(0, 25);
    const cleanCity = removeAccents(city.trim()).substring(0, 15);
    let cleanKey = key.trim().replace(/\s/g, "");

    // Identificar e formatar chaves Telefone vs CPF/CNPJ
    const onlyNumbers = cleanKey.replace(/\D/g, "");
    if ((onlyNumbers.length === 10 || onlyNumbers.length === 11) && !cleanKey.includes("@")) {
        // Verificar se é CPF válido
        let isCpf = false;
        if (onlyNumbers.length === 11) {
            let sum = 0, rev = 0;
            for (let i = 0; i < 9; i++) sum += parseInt(onlyNumbers.charAt(i)) * (10 - i);
            rev = 11 - (sum % 11);
            if (rev === 10 || rev === 11) rev = 0;
            if (rev === parseInt(onlyNumbers.charAt(9))) {
                sum = 0;
                for (let i = 0; i < 10; i++) sum += parseInt(onlyNumbers.charAt(i)) * (11 - i);
                rev = 11 - (sum % 11);
                if (rev === 10 || rev === 11) rev = 0;
                if (rev === parseInt(onlyNumbers.charAt(10))) isCpf = true;
            }
        }
        
        if (!isCpf && !cleanKey.startsWith("+")) {
            cleanKey = "+55" + onlyNumbers; // É telefone sem +55
        } else if (isCpf) {
            cleanKey = onlyNumbers; // É CPF limpo
        }
    } else if (onlyNumbers.length === 14 && !cleanKey.includes("@")) {
        cleanKey = onlyNumbers; // É CNPJ limpo
    }

    let payload = formatField("00", "01");
    let merchantAccount = formatField("00", "BR.GOV.BCB.PIX");
    merchantAccount += formatField("01", cleanKey);
    if (description) {
        merchantAccount += formatField("02", removeAccents(description).substring(0, 40));
    }
    payload += formatField("26", merchantAccount);
    payload += formatField("52", "0000");
    payload += formatField("53", "986");
    if (amount) {
        payload += formatField("54", amount.toFixed(2));
    }
    payload += formatField("58", "BR");
    payload += formatField("59", cleanName);
    payload += formatField("60", cleanCity);
    let additionalData = formatField("05", transactionId || "***");
    payload += formatField("62", additionalData);
    payload += "6304";
    const crc = calculateCRC16(payload);
    return payload + crc;
}

export function PixQrCode({ 
    pixKey, 
    amount, 
    name = "Assinatura SaaS",
    city = "SAO PAULO"
}: { 
    pixKey?: string; 
    amount?: number;
    name?: string;
    city?: string;
}) {
    const [payload, setPayload] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (pixKey) {
            try {
                const p = generatePixPayload({
                    key: pixKey,
                    name: name,
                    city: city,
                    amount: amount,
                    transactionId: "ASSINATURA"
                });
                setPayload(p);
            } catch (err) {
                console.error("Pix Generation Client Error:", err);
            }
        }
        setLoading(false);
    }, [pixKey, amount, name, city]);

    if (loading) return <Loader2 className="h-12 w-12 mx-auto animate-spin text-slate-300" />;

    if (!payload) {
        return <QrCode className="h-12 w-12 mx-auto text-slate-400" />;
    }

    return (
        <div className="flex flex-col items-center">
            <div className="bg-white p-3 rounded-xl shadow-lg border-2 border-slate-100 mb-2">
                <QRCodeSVG value={payload} size={180} />
            </div>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Escaneie para Pagar</p>
        </div>
    );
}
