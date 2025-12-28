
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
})

async function main() {
    try {
        console.log("Attempting to connect...")
        const userCount = await prisma.user.count()
        console.log(`Connection successful! Found ${userCount} users.`)
    } catch (e) {
        console.error("Connection failed:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
