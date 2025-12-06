
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
    const formatField = (id: string, value: string) => {
        const len = value.length.toString().padStart(2, "0");
        return `${id}${len}${value}`;
    };

    const removeAccents = (str: string) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const cleanName = removeAccents(name).substring(0, 25);
    const cleanCity = removeAccents(city).substring(0, 15);
    const cleanKey = key.trim();

    // Payload Format (EMVCo)
    // 00 - Payload Format Indicator
    let payload = formatField("00", "01");

    // 26 - Merchant Account Information
    // 00 - GUI (BR.GOV.BCB.PIX)
    // 01 - Chave
    // 02 - Description (Optional)
    let merchantAccount = formatField("00", "BR.GOV.BCB.PIX");
    merchantAccount += formatField("01", cleanKey);
    if (description) {
        merchantAccount += formatField("02", removeAccents(description).substring(0, 40));
    }
    payload += formatField("26", merchantAccount);

    // 52 - Merchant Category Code (0000 = General)
    payload += formatField("52", "0000");

    // 53 - Transaction Currency (986 = BRL)
    payload += formatField("53", "986");

    // 54 - Transaction Amount (Optional)
    if (amount) {
        payload += formatField("54", amount.toFixed(2));
    }

    // 58 - Country Code (BR)
    payload += formatField("58", "BR");

    // 59 - Merchant Name
    payload += formatField("59", cleanName);

    // 60 - Merchant City
    payload += formatField("60", cleanCity);

    // 62 - Additional Data Field Template
    // 05 - Reference Label (Transaction ID)
    let additionalData = formatField("05", transactionId || "***");
    payload += formatField("62", additionalData);

    // 63 - CRC16
    payload += "6304";

    // Calculate CRC16
    const crc = calculateCRC16(payload);
    return payload + crc;
}

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
