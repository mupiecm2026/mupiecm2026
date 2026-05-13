// src/lib/utils/card-validator.ts
export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'diners' | 'discover' | 'jcb' | 'unknown';

const BIN_RANGES: Record<CardBrand, number[][]> = {
  visa: [[4, 4]],
  mastercard: [[51, 55], [2221, 2720]],
  amex: [[34, 34], [37, 37]],
  elo: [[4011, 4011], [4312, 4312], [4389, 4389], [4514, 4514], [4576, 4576], [5041, 7500]],
  hipercard: [[3841, 3841], [6062, 6062]],
  diners: [[300, 305], [36, 36], [38, 38]],
  discover: [[6011, 6011], [6221, 6229], [644, 649], [65, 65]],
  jcb: [[3528, 3589]],
  unknown: []
};

export function getCardBrand(cardNumber: string): CardBrand {
  const bin = parseInt(cardNumber.replace(/\D/g, '').substring(0, 6), 10);

  for (const [brand, ranges] of Object.entries(BIN_RANGES) as [CardBrand, number[][]][]) {
    for (const [min, max] of ranges) {
      if (bin >= min && bin <= max) {
        return brand;
      }
    }
  }

  return 'unknown';
}

export function validateCardNumber(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function formatCardNumber(cardNumber: string): string {
  return cardNumber.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length <= 4) return cleaned;
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
}