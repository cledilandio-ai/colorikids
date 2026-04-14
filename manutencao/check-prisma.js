const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking Prisma Client...');
    if (prisma.cashRegister) {
        console.log('prisma.cashRegister exists!');
    } else {
        console.log('prisma.cashRegister is UNDEFINED!');
    }
}

main()
    .catch(e => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
