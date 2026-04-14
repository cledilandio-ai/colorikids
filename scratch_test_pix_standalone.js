
function formatField(id, value) {
    const len = value.length.toString().padStart(2, "0");
    return `${id}${len}${value}`;
}

function calculateCRC16(payload) {
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

function generatePixPayload({ key, name, city, transactionId, amount, description }) {
    const removeAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleanName = removeAccents(name).substring(0, 25);
    const cleanCity = removeAccents(city).substring(0, 15);
    const cleanKey = key.trim();

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
        payload += formatField("54", Number(amount).toFixed(2));
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

try {
    const payload = generatePixPayload({
        key: '88992559909',
        name: 'Assinatura SaaS',
        city: 'BRASIL',
        amount: 69.90,
        transactionId: 'ASSINATURA'
    });
    console.log('PAYLOAD:', payload);
} catch (e) {
    console.error('ERROR:', e);
}
