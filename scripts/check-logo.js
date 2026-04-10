const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.platformConfig.findUnique({where: {id: 1}}).then(config => console.dir(config, {depth: null})).finally(() => prisma.$disconnect());
