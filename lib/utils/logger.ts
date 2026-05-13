/**
 * FILE: lib/utils/logger.ts
 * UPDATED: 2026-04-19
 * FIX:
 * - Replaced pino with universal logger (Cloudflare + Node safe)
 * - Structured logs
 * - Zero dependency
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL = (typeof process !== 'undefined' && process.env ? process.env.LOG_LEVEL || 'info' : 'info') as LogLevel;

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel) {
  return levels[level] >= levels[LOG_LEVEL];
}

function format(level: LogLevel, message: string, meta?: any) {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta && { meta }),
  };
}

export const logger = {
  debug(message: string, meta?: any) {
    if (!shouldLog('debug')) return;
    console.debug(JSON.stringify(format('debug', message, meta)));
  },

  info(message: string, meta?: any) {
    if (!shouldLog('info')) return;
    console.log(JSON.stringify(format('info', message, meta)));
  },

  warn(message: string, meta?: any) {
    if (!shouldLog('warn')) return;
    console.warn(JSON.stringify(format('warn', message, meta)));
  },

  error(message: string, meta?: any) {
    if (!shouldLog('error')) return;
    console.error(JSON.stringify(format('error', message, meta)));
  },
};