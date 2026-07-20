import { NextResponse } from 'next/server';
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = 'force-dynamic';

export async function GET() {
    const envVarName = 'DATABASE_URL_POOLER';
    const url = process.env[envVarName];

    // Mascarar a senha para exibir com segurança
    const maskedUrl = url
        ? url.replace(/:([^@]+)@/, ':****@')
        : 'UNDEFINED';

    try {
        logger.info({ envVarName, maskedUrl }, "[Diagnostic] Attempting connection");

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
        logger.error({ err: error, route: "debug-connection" }, "[Diagnostic] Connection failed");
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
        // Não desconecta o Prisma singleton — isso derrubaria a conexão para todas as outras requisições.
        // O cliente singleton gerencia a conexão automaticamente.
    }
}
