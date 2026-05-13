/**
 * Card Brand Detector
 * 
 * Reconhecimento de bandeira de cartão de crédito baseado no BIN (6 primeiros dígitos).
 * Não depende de serviços externos - usa tabela de BINs conhecida.
 */

export type CardBrand = 
  | "visa" 
  | "mastercard" 
  | "amex" 
  | "elo" 
  | "hipercard" 
  | "diners" 
  | "discover" 
  | "jcb" 
  | "aura"
  | "sodexo"
  | "vr"
  | "alelo"
  | "carnet"
  | "banrisul"
  | "unknown";

// Mapeamento de BINs para bandeiras
// Formato: prefixo -> bandeira
const BIN_RANGES: Array<{ prefix: string; brand: CardBrand; length: number }> = [
  // Visa
  { prefix: "4", brand: "visa", length: 16 },
  
  // Mastercard
  { prefix: "51", brand: "mastercard", length: 16 },
  { prefix: "52", brand: "mastercard", length: 16 },
  { prefix: "53", brand: "mastercard", length: 16 },
  { prefix: "54", brand: "mastercard", length: 16 },
  { prefix: "55", brand: "mastercard", length: 16 },
  { prefix: "2221", brand: "mastercard", length: 16 },
  { prefix: "2720", brand: "mastercard", length: 16 },
  
  // American Express
  { prefix: "34", brand: "amex", length: 15 },
  { prefix: "37", brand: "amex", length: 15 },
  
  // Elo
  { prefix: "4011", brand: "elo", length: 16 },
  { prefix: "4312", brand: "elo", length: 16 },
  { prefix: "4389", brand: "elo", length: 16 },
  { prefix: "4514", brand: "elo", length: 16 },
  { prefix: "4573", brand: "elo", length: 16 },
  { prefix: "4576", brand: "elo", length: 16 },
  { prefix: "5041", brand: "elo", length: 16 },
  { prefix: "5066", brand: "elo", length: 16 },
  { prefix: "5067", brand: "elo", length: 16 },
  { prefix: "5090", brand: "elo", length: 16 },
  { prefix: "5091", brand: "elo", length: 16 },
  { prefix: "5092", brand: "elo", length: 16 },
  { prefix: "5093", brand: "elo", length: 16 },
  { prefix: "5094", brand: "elo", length: 16 },
  { prefix: "5095", brand: "elo", length: 16 },
  { prefix: "5096", brand: "elo", length: 16 },
  { prefix: "5097", brand: "elo", length: 16 },
  { prefix: "5098", brand: "elo", length: 16 },
  { prefix: "5099", brand: "elo", length: 16 },
  { prefix: "6276", brand: "elo", length: 16 },
  { prefix: "6362", brand: "elo", length: 16 },
  { prefix: "6363", brand: "elo", length: 16 },
  { prefix: "6504", brand: "elo", length: 16 },
  { prefix: "6505", brand: "elo", length: 16 },
  { prefix: "6506", brand: "elo", length: 16 },
  { prefix: "6507", brand: "elo", length: 16 },
  { prefix: "6508", brand: "elo", length: 16 },
  { prefix: "6509", brand: "elo", length: 16 },
  { prefix: "6516", brand: "elo", length: 16 },
  { prefix: "6550", brand: "elo", length: 16 },
  { prefix: "6551", brand: "elo", length: 16 },
  
  // Hipercard
  { prefix: "6062", brand: "hipercard", length: 16 },
  { prefix: "6371", brand: "hipercard", length: 16 },
  { prefix: "6375", brand: "hipercard", length: 16 },
  { prefix: "6376", brand: "hipercard", length: 16 },
  
  // Diners Club
  { prefix: "300", brand: "diners", length: 14 },
  { prefix: "301", brand: "diners", length: 14 },
  { prefix: "302", brand: "diners", length: 14 },
  { prefix: "303", brand: "diners", length: 14 },
  { prefix: "304", brand: "diners", length: 14 },
  { prefix: "305", brand: "diners", length: 14 },
  { prefix: "36", brand: "diners", length: 14 },
  { prefix: "38", brand: "diners", length: 14 },
  
  // Discover
  { prefix: "6011", brand: "discover", length: 16 },
  { prefix: "6221", brand: "discover", length: 16 },
  { prefix: "6229", brand: "discover", length: 16 },
  { prefix: "644", brand: "discover", length: 16 },
  { prefix: "645", brand: "discover", length: 16 },
  { prefix: "646", brand: "discover", length: 16 },
  { prefix: "647", brand: "discover", length: 16 },
  { prefix: "648", brand: "discover", length: 16 },
  { prefix: "649", brand: "discover", length: 16 },
  { prefix: "65", brand: "discover", length: 16 },
  
  // JCB
  { prefix: "3528", brand: "jcb", length: 16 },
  { prefix: "3529", brand: "jcb", length: 16 },
  { prefix: "3530", brand: "jcb", length: 16 },
  { prefix: "3531", brand: "jcb", length: 16 },
  { prefix: "3532", brand: "jcb", length: 16 },
  { prefix: "3533", brand: "jcb", length: 16 },
  { prefix: "3534", brand: "jcb", length: 16 },
  { prefix: "3535", brand: "jcb", length: 16 },
  { prefix: "3536", brand: "jcb", length: 16 },
  { prefix: "3537", brand: "jcb", length: 16 },
  { prefix: "3538", brand: "jcb", length: 16 },
  
  // Aura
  { prefix: "5078", brand: "aura", length: 16 },
  
  // Sodexo
  { prefix: "6070", brand: "sodexo", length: 16 },
  { prefix: "6071", brand: "sodexo", length: 16 },
  { prefix: "6072", brand: "sodexo", length: 16 },
  { prefix: "6073", brand: "sodexo", length: 16 },
  { prefix: "6074", brand: "sodexo", length: 16 },
  
  // VR
  { prefix: "6081", brand: "vr", length: 16 },
  { prefix: "6082", brand: "vr", length: 16 },
  
  // Alelo
  { prefix: "5067", brand: "alelo", length: 16 },
  { prefix: "5068", brand: "alelo", length: 16 },
  
  // Carnet
  { prefix: "6001", brand: "carnet", length: 16 },
  { prefix: "6033", brand: "carnet", length: 16 },
  
  // Banrisul
  { prefix: "6270", brand: "banrisul", length: 16 },
  { prefix: "6271", brand: "banrisul", length: 16 },
  { prefix: "6272", brand: "banrisul", length: 16 },
  { prefix: "6273", brand: "banrisul", length: 16 },
  { prefix: "6274", brand: "banrisul", length: 16 },
  { prefix: "6275", brand: "banrisul", length: 16 },
  { prefix: "6277", brand: "banrisul", length: 16 },
  { prefix: "6278", brand: "banrisul", length: 16 },
  { prefix: "6279", brand: "banrisul", length: 16 },
];

/**
 * Detecta a bandeira do cartão baseado no número (BIN)
 * 
 * @param cardNumber - Número do cartão (com ou sem espaços)
 * @returns A bandeira detectada ou "unknown"
 */
export function detectCardBrand(cardNumber: string): CardBrand {
  // Limpa o número do cartão
  const cleanNumber = cardNumber.replace(/\D/g, "");
  
  if (cleanNumber.length < 4) {
    return "unknown";
  }
  
  // Tenta encontrar correspondência exata primeiro (4-6 dígitos)
  const bin4 = cleanNumber.substring(0, 4);
  const bin6 = cleanNumber.length >= 6 ? cleanNumber.substring(0, 6) : bin4;
  
  // Procura em BINs de 6 dígitos primeiro
  for (const entry of BIN_RANGES) {
    if (entry.prefix.length >= 6 && bin6.startsWith(entry.prefix)) {
      return entry.brand;
    }
  }
  
  // Depois procura em BINs de 4 dígitos
  for (const entry of BIN_RANGES) {
    if (entry.prefix.length === 4 && bin4.startsWith(entry.prefix)) {
      return entry.brand;
    }
  }
  
  // Procura em BINs de 2-3 dígitos
  for (const entry of BIN_RANGES) {
    if (entry.prefix.length <= 3 && bin4.startsWith(entry.prefix)) {
      return entry.brand;
    }
  }
  
  return "unknown";
}

/**
 * Retorna o payment_method_id do MercadoPago baseado na bandeira
 * 
 * @param brand - Bandeira detectada
 * @returns ID do método de pagamento do MercadoPago
 */
export function getMercadoPagoPaymentMethodId(brand: CardBrand): string {
  const mapping: Record<CardBrand, string> = {
    visa: "visa",
    mastercard: "master",
    amex: "amex",
    elo: "elo",
    hipercard: "hipercard",
    diners: "diners",
    discover: "discover",
    jcb: "jcb",
    aura: "aura",
    sodexo: "sodexo",
    vr: "vr",
    alelo: "alelo",
    carnet: "carnet",
    banrisul: "banrisul",
    unknown: "",
  };
  
  return mapping[brand] || "";
}

/**
 * Retorna o comprimento esperado do cartão baseado na bandeira
 * 
 * @param brand - Bandeira detectada
 * @returns Comprimento do número do cartão
 */
export function getExpectedCardLength(brand: CardBrand): number {
  const lengthMapping: Partial<Record<CardBrand, number>> = {
    amex: 15,
    diners: 14,
    // Todas as outras usam 16 dígitos
  };
  
  return lengthMapping[brand] || 16;
}

/**
 * Valida se o número do cartão corresponde à bandeira declarada
 * 
 * @param cardNumber - Número do cartão
 * @param brand - Bandeira esperada
 * @returns true se o cartão corresponde à bandeira
 */
export function validateCardBrand(cardNumber: string, brand: CardBrand): boolean {
  const detected = detectCardBrand(cardNumber);
  return detected === brand;
}