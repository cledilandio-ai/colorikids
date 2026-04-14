const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
    await prisma.user.deleteMany({ where: { email: 'admin@seudominio.com' } });
    console.log('Usuário antigo deletado com sucesso!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
