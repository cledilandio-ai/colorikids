const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
    const owner = await prisma.user.upsert({
        where: { email: 'admin@colorikids.com' },
        update: {
            shouldChangePassword: true // Force update for development/testing
        },
        create: {
            name: 'Proprietária',
            email: 'admin@colorikids.com',
            password: await bcrypt.hash('admin', 10),
            role: 'OWNER',
            shouldChangePassword: true,
        },
    });
    console.log({ owner });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
