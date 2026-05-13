// lib/services/validation-service.ts

import { PaymentInput } from "../../../types/types";
import { logger } from "../../utils/logger";


export interface ValidationError {
  field: string;
  code: ValidationErrorCode;
  message: string;
}

export type ValidationErrorCode =
  | "INVALID_EMAIL"
  | "INVALID_CPF"
  | "INVALID_NAME"
  | "MISSING_TOKEN"
  | "INVALID_CARD_DATA"
  | "MISSING_REQUIRED_FIELD";

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class ValidationService {
  /**
   * Valida dados críticos do pagamento antes do processamento
   */
  validatePaymentInput(payment: PaymentInput): ValidationResult {
    const errors: ValidationError[] = [];

    // Validação de email
    if (!payment.payer?.email || !this.isValidEmail(payment.payer.email)) {
      errors.push({
        field: "payer.email",
        code: "INVALID_EMAIL",
        message: "Email inválido ou ausente"
      });
    }

    // Validação de CPF
    if (!payment.payer?.cpf || !this.isValidCPF(payment.payer.cpf)) {
      errors.push({
        field: "payer.cpf",
        code: "INVALID_CPF",
        message: "CPF inválido ou ausente"
      });
    }

    // Validação do nome do comprador
    if (!payment.payer?.name || !this.isValidPayerName(payment.payer.name)) {
      errors.push({
        field: "payer.name",
        code: "INVALID_NAME",
        message: "Nome do comprador inválido ou genérico"
      });
    }

    // Validação de token de pagamento
    if (!payment.token && !payment.paymentMethodId) {
      errors.push({
        field: "token",
        code: "MISSING_TOKEN",
        message: "Token de pagamento ou método de pagamento ausente"
      });
    }

    // Validação básica de dados do cartão (quando aplicável)
    if (payment.cardData) {
      const cardErrors = this.validateCardData(payment.cardData);
      errors.push(...cardErrors);
    }

    // Validações adicionais obrigatórias
    if (!payment.amount || payment.amount <= 0) {
      errors.push({
        field: "amount",
        code: "MISSING_REQUIRED_FIELD",
        message: "Valor do pagamento deve ser maior que zero"
      });
    }

    logger.info("[ValidationService] Validation completed", {
      isValid: errors.length === 0,
      errorCount: errors.length,
      errors: errors.map(e => e.code)
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Valida CPF usando algoritmo oficial brasileiro
   */
  private isValidCPF(cpf: string): boolean {
    // Remove caracteres não numéricos
    const cleaned = cpf.replace(/\D/g, '');

    // Deve ter exatamente 11 dígitos
    if (cleaned.length !== 11) {
      return false;
    }

    // Verifica se todos os dígitos são iguais (sequências inválidas)
    if (/^(\d)\1+$/.test(cleaned)) {
      return false;
    }

    // Calcula primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;

    if (remainder !== parseInt(cleaned.charAt(9))) {
      return false;
    }

    // Calcula segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;

    if (remainder !== parseInt(cleaned.charAt(10))) {
      return false;
    }

    return true;
  }

  /**
   * Valida dados básicos do cartão
   */
  private validateCardData(cardData: PaymentInput['cardData']): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!cardData) return errors;

    // Validação básica do número do cartão
    if (!cardData.number || cardData.number.replace(/\D/g, '').length < 13) {
      errors.push({
        field: "cardData.number",
        code: "INVALID_CARD_DATA",
        message: "Número do cartão inválido"
      });
    }

    // Validação do nome do portador
    if (!cardData.holder || cardData.holder.trim().length < 2 || this.isGenericName(cardData.holder)) {
      errors.push({
        field: "cardData.holder",
        code: "INVALID_CARD_DATA",
        message: "Nome do portador inválido ou genérico"
      });
    }

    // Validação da data de expiração
    if (!cardData.expMonth || !cardData.expYear) {
      errors.push({
        field: "cardData.expMonth",
        code: "INVALID_CARD_DATA",
        message: "Data de expiração obrigatória"
      });
    }

    // Validação do CVV
    if (!cardData.cvv || cardData.cvv.length < 3) {
      errors.push({
        field: "cardData.cvv",
        code: "INVALID_CARD_DATA",
        message: "CVV obrigatório"
      });
    }

    return errors;
  }

  /**
   * Valida se nome do comprador não é genérico ou placeholder
   */
  private isValidPayerName(name: string): boolean {
    const trimmed = name.trim();
    if (trimmed.length < 3) return false;
    if (this.isGenericName(trimmed)) return false;
    return true;
  }

  private isGenericName(name: string): boolean {
    const normalized = name.trim().toLowerCase();
    const genericPatterns = [
      /^cliente(s)?$/,
      /^comprador(es)?$/,
      /^cliente teste$/,
      /^teste$/,
      /^test(es)?$/,
      /^test user$/,
      /^user(s)?$/,
      /^usuario(s)?$/,
      /^guest$/,
      /^anon(imo)?$/,
      /^anonymous$/,
      /^buyer$/,
      /^nome(s)?$/,
      /^admin$/
    ];

    return genericPatterns.some((pattern) => pattern.test(normalized));
  }
}
