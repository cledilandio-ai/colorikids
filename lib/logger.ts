/**
 * Logger Estruturado — Pino
 * -----------------------------------------
 * Saída JSON em produção, colorizada em dev.
 * Níveis: fatal, error, warn, info, debug, trace + security (custom).
 *
 * Uso:
 *   logger.info({ route: "orders/create", userId }, "Pedido criado");
 *   logger.error({ err: error, route: "orders/create" }, "Falha ao criar pedido");
 *   securityLog("LOGIN_FAILED", { email }, "warn");
 */

import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),

  // Em dev: saída colorida com timestamp legível
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss.l",
        ignore: "pid,hostname",
      },
    },
  }),

  // Em prod: JSON puro para agregadores de log (Vercel, Datadog, etc.)
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
  },

  // Campos sensíveis — não aparecem no log
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "newPassword",
      "ownerPassword",
      "token",
      "authorization",
    ],
    censor: "[REDACTED]",
  },
});

/**
 * Log de evento de segurança com nível explícito.
 *
 * @param action    Nome da ação (ex: "LOGIN_FAILED", "RATE_LIMIT_EXCEEDED")
 * @param details   Dados contextuais (ip, userId, route, etc.)
 * @param level     Severidade: "info" (evento normal), "warn" (tentativa suspeita), "error" (violação)
 */
export function securityLog(
  action: string,
  details: Record<string, unknown>,
  level: "info" | "warn" | "error" = "warn",
): void {
  logger[level]({ ...details, security: true, action }, `[SECURITY] ${action}`);
}

