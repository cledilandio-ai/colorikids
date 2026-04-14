const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    const admins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    if (admins.length === 0) {
        console.log('Nenhum SUPER_ADMIN encontrado no banco!');
    } else {
        console.log('Super Admins encontrados:');
        admins.forEach(a => {
            console.log(`  - Email: ${a.email}`);
            console.log(`    Nome:  ${a.name}`);
            console.log(`    ID:    ${a.id}`);
            console.log(`    Criado: ${a.createdAt}`);
        });
    }
}

main()
    .catch(err => console.error('Erro:', err.message))
    .finally(() => prisma.$disconnect());
