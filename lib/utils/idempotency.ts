/**
 * Utilitário de idempotência para o fluxo de checkout.
 * Gera cabeçalhos únicos para evitar processamentos duplicados.
 */

export interface IdempotencyContext {
  headers: {
    "X-Idempotency-Key": string;
    "X-Request-ID": string;
  };
  idempotencyKey: string;
  requestId: string;
}

export function createIdempotencyContext(orderId?: string): IdempotencyContext {
  const idempotencyKey = `idemp_${crypto.randomUUID()}`;
  const requestId = `req_${crypto.randomUUID()}`;

  return {
    headers: {
      "X-Idempotency-Key": idempotencyKey,
      "X-Request-ID": requestId,
    },
    idempotencyKey,
    requestId,
  };
}
