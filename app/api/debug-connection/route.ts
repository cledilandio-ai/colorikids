import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
    const envVarName = 'DATABASE_URL_POOLER';
    const url = process.env[envVarName];

    // Mascarar a senha para exibir com segurança
    const maskedUrl = url
        ? url.replace(/:([^@]+)@/, ':****@')
        : 'UNDEFINED';

    // Tenta conectar criando um cliente isolado para garantir que use a var certa se possível,
    // mas o Prisma Client gerado já tem a var embutida no schema. 
    // Instanciamos sem args para usar o padrão do schema.
    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });

    try {
        console.log(`[Diagnostic] Attempting connection. Env ${envVarName} is: ${maskedUrl}`);

        // Força conexão
        await prisma.$connect();

        // Teste simples
        const userCount = await prisma.user.count();

        return NextResponse.json({
            status: 'SUCCESS',
            message: 'Conexão com Banco de Dados estabelecida com sucesso!',
            userCount,
            env_check: {
                variable: envVarName,
                defined: !!url,
                value_masked: maskedUrl
            }
        });

    } catch (error: any) {
        console.error('[Diagnostic] Connection failed:', error);
        return NextResponse.json({
            status: 'ERROR',
            message: 'Falha ao conectar no Banco de Dados',
            error_details: error.message,
            error_code: error.code,
            env_check: {
                variable: envVarName,
                defined: !!url,
                value_masked: maskedUrl
            },
            stack: error.stack
        }, { status: 500 });

    } finally {
        await prisma.$disconnect();
    }
}
