const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    console.log("----- STORES -----");
    const stores = await prisma.store.findMany({
        include: { storeConfig: true }
    });
    console.dir(stores, { depth: null });
    
    console.log("----- PLATFORM CONFIG -----");
    const platformConfig = await prisma.platformConfig.findUnique({ where: { id: 1 } });
    console.dir(platformConfig, { depth: null });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
