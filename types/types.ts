// types/types.ts

export type UserRole = "user" | "master";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type GatewayNames =
  | "mercadopago"
  | "stripe"
  | "cielo"
  | "pagarme"
  | "getnet"
  | "adyen"
  | "sumup";

/**
 * Status interno unificado
 */
export type PaymentStatus =
  | "approved"
  | "pending"
  | "rejected"
  | "error"
  | "requires_action";

/**
 * Códigos de erro NORMALIZADOS (independente do PSP)
 */
export type PaymentErrorCode =
  | "INSUFFICIENT_FUNDS"
  | "CARD_DECLINED"
  | "INVALID_CARD"
  | "EXPIRED_CARD"
  | "FRAUD_DETECTED"
  | "PROCESSING_ERROR"
  | "REQUIRES_AUTH"
  | "UNKNOWN"
  // Novos códigos para validação e risco
  | "INVALID_EMAIL"
  | "INVALID_CPF"
  | "MISSING_TOKEN"
  | "INVALID_CARD_DATA"
  | "MISSING_REQUIRED_FIELD"
  | "RISK_BLOCKED";

/**
 * Entrada padrão do checkout
 */
export interface PaymentInput {
  token?: string;
  paymentMethodId?: string;
  amount: number;
  installments?: number;

  expirationMonth?: number;
  expirationYear?: number;
  cardholderName?: string;

  payer: {
    email: string;
    cpf: string;
    name?: string; // Add name to payer
    phone?: string;
  };

  deviceId?: string; // Device fingerprint for antifraud
  deviceFingerprints?: Record<string, any>; // Complete fingerprints from all gateways

  metadata?: Record<string, any>;
  remoteIp?: string;

  cardData?: {
    number: string;
    holder: string;
    expMonth: string;
    expYear: string;
    cvv: string;
    brand?: string;
    cpf?: string;
    email?: string;
  };
  idempotencyKey?: string;
}

/**
 * Pedido
 */
export interface OrderItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image?: string | null;
}

export interface OrderData {
  orderId: string;
  items: OrderItem[];
  totalItems: number;
  total: number;
}

/**
 * Payload do checkout
 */
export interface CheckoutPayload {
  gateway: GatewayNames;
  payment: PaymentInput;
  order: OrderData;
}

/**
 * Resposta UNIFICADA dos gateways
 */
export interface PaymentResult {
  success: boolean;

  transactionId?: string;

  status: PaymentStatus;

  /**
   * 🔥 mensagem amigável (frontend)
   */
  message?: string;

  /**
   * 🔥 código padronizado (lógica)
   */
  errorCode?: PaymentErrorCode;

  /**
   * 🔥 nome do gateway
   */
  gateway?: GatewayNames;

  /**
   * 🔥 status original do PSP (debug)
   */
  providerStatus?: string;

  /**
   * 🔥 payload bruto (opcional debug)
   */
  raw?: any;

  /**
   * cashback
   */
  cashbackCode?: string;

  //valor de compra
  amount?: number;

  // NF id
  nfId?: string;
}

export type ConfigType = "gateway" | "psp";
export type ConfigStatus = "ativo" | "inativo" | "bloqueado";
export type ConfigMode = "production" | "test";

export interface ConfigBody {
  type: ConfigType;
  gateway?: string;
  psp?: string;
  creds?: Record<string, string>;
  mode?: ConfigMode;
  id?: string;
  status?: ConfigStatus;
}