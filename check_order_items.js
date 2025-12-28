const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Load .env manually
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
} catch (e) {
    console.log('Error loading .env', e);
}

const prisma = new PrismaClient();

async function main() {
    const order = await prisma.order.findFirst({
        where: { items: { not: '[]' } },
        orderBy: { createdAt: 'desc' }
    });

    if (order) {
        console.log('Order Items JSON:', order.items);
    } else {
        console.log('No order found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
