/**
 * Card Tokenizer Utility
 * 
 * Abstração para tokenização de cartões por gateway.
 * Cada gateway pode ter sua própria lógica de tokenização no frontend.
 */

import { GatewayNames } from "../../types/types";
import { detectCardBrand, getMercadoPagoPaymentMethodId } from "./card-brand-detector";

export interface CardData {
  name: string;
  number: string;
  exp: string;
  cvv: string;
  cpf?: string;
  email?: string;
}

export interface TokenizeResult {
  token: string;
  paymentMethodId?: string;
  brand?: string;
}

export interface TokenizerConfig {
  public_key?: string;
  [key: string]: any;
}

/**
 * Tokeniza cartão para MercadoPago
 */
async function tokenizeMercadoPago(
  card: CardData,
  config: TokenizerConfig
): Promise<TokenizeResult> {
  if (!config?.public_key) {
    throw new Error("Gateway MercadoPago não configurado corretamente (public_key ausente)");
  }

  const mp = new (window as any).MercadoPago(config.public_key);
  const cleanNumber = card.number.replace(/\s/g, "");

  // Extrai mês e ano
  const cleanExp = card.exp.replace(/\D/g, "");
  const expirationMonth = cleanExp.slice(0, 2);
  const expirationYear = `20${cleanExp.slice(2, 4)}`;

  // Cria token do cartão
  const tokenRes = await mp.createCardToken({
    cardNumber: cleanNumber,
    cardholderName: card.name,
    cardExpirationMonth: expirationMonth,
    cardExpirationYear: expirationYear,
    securityCode: card.cvv,
    identificationType: "CPF",
    identificationNumber: card.cpf?.replace(/\D/g, "") || "00000000000",
  });

  if (!tokenRes?.id) {
    throw new Error(tokenRes?.cause?.[0]?.description || "Falha ao gerar token de segurança.");
  }

  let paymentMethodId = "";
  try {
    const bin = cleanNumber.substring(0, 6);
    console.log("🔍 Detectando brand para BIN:", bin);

    const result = await mp.getPaymentMethods({ bin });
    console.log("🔍 API MP getPaymentMethods result:", result);

    // A API retorna { results: [...] }
    const firstResult = result?.results?.[0];
    if (firstResult?.id) {
      paymentMethodId = firstResult.id;
    }

    console.log("🔍 paymentMethodId detectado:", paymentMethodId);
  } catch (e) {
    console.warn("Não foi possível detectar a bandeira via API MP, tentando detector local", e);
    // Fallback para detector local se API falhar
    const detectedBrand = detectCardBrand(cleanNumber);
    paymentMethodId = getMercadoPagoPaymentMethodId(detectedBrand);
    console.log("🔍 paymentMethodId fallback:", paymentMethodId);
  }

  return {
    token: tokenRes.id,
    paymentMethodId,
    brand: paymentMethodId,
  };
}

/**
 * Tokeniza cartão para Stripe (se necessário)
 */
async function tokenizeStripe(
  card: CardData,
  config: TokenizerConfig
): Promise<TokenizeResult> {
  const cleanNumber = card.number.replace(/\s/g, "");
  
  // Usa detector local para Stripe
  const detectedBrand = detectCardBrand(cleanNumber);
  const paymentMethodId = getMercadoPagoPaymentMethodId(detectedBrand);
  
  return {
    token: cleanNumber,
    paymentMethodId,
    brand: detectedBrand,
  };
}

/**
 * Tokeniza cartão para Pagar.me (se necessário)
 */
async function tokenizePagarme(
  card: CardData,
  config: TokenizerConfig
): Promise<TokenizeResult> {
  const cleanNumber = card.number.replace(/\s/g, "");
  
  // Usa detector local para Pagarme
  const detectedBrand = detectCardBrand(cleanNumber);
  const paymentMethodId = getMercadoPagoPaymentMethodId(detectedBrand);
  
  return {
    token: cleanNumber,
    paymentMethodId,
    brand: detectedBrand,
  };
}

/**
 * Gateway que não requer tokenização no frontend (Cielo, Adyen, Getnet, Sumup)
 * Usa detector local de bandeiras
 */
async function tokenizeNone(
  card: CardData,
  _config: TokenizerConfig
): Promise<TokenizeResult> {
  const cleanNumber = card.number.replace(/\s/g, "");
  
  // Usa detector local para gateways que não precisam de tokenização
  const detectedBrand = detectCardBrand(cleanNumber);
  const paymentMethodId = getMercadoPagoPaymentMethodId(detectedBrand);

  return {
    token: cleanNumber,
    paymentMethodId,
    brand: detectedBrand,
  };
}

// Mapa de estratégias por gateway
const tokenizers: Record<GatewayNames, (card: CardData, config: TokenizerConfig) => Promise<TokenizeResult>> = {
  mercadopago: tokenizeMercadoPago,
  stripe: tokenizeStripe,
  pagarme: tokenizePagarme,
  cielo: tokenizeNone,    // Cielo não requer tokenização no frontend
  adyen: tokenizeNone,
  getnet: tokenizeNone,
  sumup: tokenizeNone,
};

/**
 * Tokeniza cartão conforme o gateway configurado
 * 
 * @param gateway - Nome do gateway de pagamento
 * @param card - Dados do cartão
 * @param config - Configurações do gateway (creds)
 * @returns Token e informações adicionais
 */
export async function tokenizeCard(
  gateway: GatewayNames,
  card: CardData,
  config: TokenizerConfig
): Promise<TokenizeResult> {
  const tokenizer = tokenizers[gateway];
  
  if (!tokenizer) {
    throw new Error(`Gateway não suportado: ${gateway}`);
  }

  return tokenizer(card, config);
}

/**
 * Verifica se um gateway requer tokenização no frontend
 */
export function requiresFrontendTokenization(gateway: GatewayNames): boolean {
  return gateway === "mercadopago";
}