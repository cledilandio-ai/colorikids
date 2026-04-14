const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../.env.local');

if (fs.existsSync(envPath)) {
    const fileContent = fs.readFileSync(envPath, 'utf8');
    fileContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/"/g, '');
        }
    });
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            basePrice: true,
            costPrice: true
        }
    });

    console.log("Product Prices:");
    products.forEach(p => {
        console.log(`- ${p.name}: Sell=${p.basePrice}, Cost=${p.costPrice}`);
    });
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
