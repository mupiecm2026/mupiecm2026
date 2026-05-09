// lib/services/risk-service.ts
import { PaymentInput } from "../../types/types";
import { logger } from "../utils/logger";

export interface RiskFactor {
  name: string;
  weight: number; // Peso do fator no score total
  triggered: boolean;
  description: string;
}

export interface RiskAssessment {
  score: number; // Score total (0-100)
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  blocked: boolean;
  reason?: string;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export class RiskService {
  private readonly BLOCK_THRESHOLD = 60; // Score acima deste valor bloqueia a transação (mais agressivo)

  /**
   * Avalia o risco de uma transação baseada em heurísticas
   */
  assessRisk(payment: PaymentInput): RiskAssessment {
    const factors: RiskFactor[] = [];

    // Fator 1: Ausência de deviceId
    const deviceIdFactor = this.assessDeviceIdRisk(payment);
    factors.push(deviceIdFactor);

    // Fator 2: Nome do comprador ausente ou genérico
    const nameFactor = this.assessNameRisk(payment);
    factors.push(nameFactor);

    // Fator 3: CPF ausente ou inválido
    const cpfFactor = this.assessCpfRisk(payment);
    factors.push(cpfFactor);

    // Fator 4: Email suspeito
    const emailFactor = this.assessEmailRisk(payment);
    factors.push(emailFactor);

    // Fator 4: Número alto de parcelas
    const installmentsFactor = this.assessInstallmentsRisk(payment);
    factors.push(installmentsFactor);

    // Fator 5: Valor muito alto (adicional)
    const amountFactor = this.assessAmountRisk(payment);
    factors.push(amountFactor);

    // Fator 6: IP suspeito
    const ipFactor = this.assessIpRisk(payment);
    factors.push(ipFactor);

    // Fator 7: BIN do cartão (prepaid)
    const binFactor = this.assessBinRisk(payment);
    factors.push(binFactor);

    // Fator 8: Discrepância entre nome do comprador e titular do cartão
    const nameMismatchFactor = this.assessNameMismatchRisk(payment);
    factors.push(nameMismatchFactor);

    // Calcula score total
    const score = factors.reduce((total, factor) =>
      total + (factor.triggered ? factor.weight : 0), 0
    );

    // Determina nível de risco
    const riskLevel = this.calculateRiskLevel(score);

    // Determina se deve bloquear
    const blocked = score >= this.BLOCK_THRESHOLD;

    const assessment: RiskAssessment = {
      score,
      riskLevel,
      factors,
      blocked,
      reason: blocked ? this.getBlockReason(factors) : undefined
    };

    logger.info("[RiskService] Risk assessment completed", {
      score,
      riskLevel,
      blocked,
      triggeredFactors: factors.filter(f => f.triggered).map(f => f.name)
    });

    return assessment;
  }

  /**
   * Avalia risco baseado na ausência de deviceId
   */
  private assessDeviceIdRisk(payment: PaymentInput): RiskFactor {
    const hasDeviceId = !!payment.deviceId;
    const hasFingerprintData = !!payment.deviceFingerprints && Object.keys(payment.deviceFingerprints).length > 0;
    const triggered = !hasDeviceId && !hasFingerprintData;

    return {
      name: "device_id_missing",
      weight: 30,
      triggered,
      description: triggered
        ? "Device fingerprint ausente (deviceId ou fingerprint data não fornecido)"
        : "Device fingerprint fornecido"
    };
  }

  /**
   * Avalia risco baseado no nome do comprador
   */
  private assessNameRisk(payment: PaymentInput): RiskFactor {
    const name = payment.payer?.name?.trim();
    const triggered = !name || this.isGenericName(name);

    return {
      name: "generic_name_risk",
      weight: 20,
      triggered,
      description: triggered
        ? "Nome do comprador ausente ou genérico"
        : "Nome do comprador identificado"
    };
  }

  /**
   * Avalia risco baseado no CPF
   */
  private assessCpfRisk(payment: PaymentInput): RiskFactor {
    const cpf = payment.payer?.cpf;
    let triggered = false;
    let description = "CPF válido";

    if (!cpf) {
      triggered = true;
      description = "CPF ausente";
    } else {
      // Verifica se é uma sequência suspeita (mesmo dígito repetido)
      const cleaned = cpf.replace(/\D/g, '');
      if (/^(\d)\1+$/.test(cleaned)) {
        triggered = true;
        description = "CPF com sequência suspeita";
      }
    }

    return {
      name: "cpf_risk",
      weight: 20,
      triggered,
      description
    };
  }

  /**
   * Avalia risco baseado no email
   */
  private assessEmailRisk(payment: PaymentInput): RiskFactor {
    const email = payment.payer?.email;
    let triggered = false;
    let description = "Email válido";

    if (!email) {
      triggered = true;
      description = "Email ausente";
    } else {
      // Verifica domínios temporários/suspeitos
      const suspiciousDomains = [
        '10minutemail.com',
        'guerrillamail.com',
        'mailinator.com',
        'temp-mail.org',
        'throwaway.email'
      ];

      const domain = email.split('@')[1]?.toLowerCase();
      if (domain && suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
        triggered = true;
        description = "Email de domínio temporário";
      }

      // Verifica local-part genérico
      const localPart = email.split('@')[0]?.toLowerCase();
      const genericEmailUsers = [
        'teste',
        'test',
        'cliente',
        'usuario',
        'user',
        'comprador',
        'anonymous',
        'guest',
        'admin'
      ];

      if (localPart && genericEmailUsers.some((generic) => localPart === generic || localPart.startsWith(`${generic}`))) {
        triggered = true;
        description = "Email genérico ou suspeito";
      }

      // Verifica emails muito longos ou com caracteres suspeitos
      if (email.length > 50) {
        triggered = true;
        description = "Email excessivamente longo";
      }
    }

    return {
      name: "email_risk",
      weight: 15,
      triggered,
      description
    };
  }

  /**
   * Avalia risco baseado no número de parcelas
   */
  private assessInstallmentsRisk(payment: PaymentInput): RiskFactor {
    const installments = payment.installments || 1;
    const triggered = installments > 6; // Mais de 6 parcelas é considerado arriscado

    return {
      name: "high_installments",
      weight: 10,
      triggered,
      description: triggered ? `Parcelamento alto: ${installments}x` : "Parcelamento normal"
    };
  }

  /**
   * Avalia risco baseado no valor da transação
   */
  private assessAmountRisk(payment: PaymentInput): RiskFactor {
    const amount = payment.amount || 0;
    const triggered = amount > 5000; // Valores acima de R$ 5000 são considerados de alto risco

    return {
      name: "high_amount",
      weight: 15,
      triggered,
      description: triggered ? `Valor alto: R$ ${amount}` : "Valor normal"
    };
  }

  /**
   * Avalia risco baseado no IP do usuário
   */
  private assessIpRisk(payment: PaymentInput): RiskFactor {
    const ip = payment.remoteIp;
    let triggered = false;
    let description = "IP válido";

    if (!ip) {
      triggered = true;
      description = "IP não fornecido";
    } else {
      // Verifica se é IP brasileiro (simplificado - apenas verifica se começa com 177, 179, 189, etc.)
      // IPs brasileiros comuns: 177.x.x.x, 179.x.x.x, 189.x.x.x, 191.x.x.x, etc.
      const isBrazilian = /^177\.|^179\.|^189\.|^191\.|^200\.|^201\.|^186\.|^187\.|^188\.|^189\.|^190\.|^191\.|^192\.|^193\.|^194\.|^195\.|^196\.|^197\.|^198\.|^199\.|^200\.|^201\./.test(ip);

      if (!isBrazilian) {
        triggered = true;
        description = "IP não identificado como brasileiro";
      }

      // Verifica IPs suspeitos (ex: localhost, VPNs comuns, etc.)
      const suspiciousIps = [
        '127.0.0.1',
        '0.0.0.0',
        '10.0.0.0/8', // Privado
        '172.16.0.0/12', // Privado
        '192.168.0.0/16', // Privado
      ];

      if (suspiciousIps.some(susp => ip.startsWith(susp.split('/')[0]))) {
        triggered = true;
        description = "IP suspeito (localhost ou rede privada)";
      }
    }

    return {
      name: "ip_risk",
      weight: 10,
      triggered,
      description
    };
  }

  /**
   * Avalia risco baseado no BIN do cartão (prepaid cards)
   */
  private assessBinRisk(payment: PaymentInput): RiskFactor {
    const cardNumber = payment.cardData?.number;
    let triggered = false;
    let description = "Cartão válido";

    if (!cardNumber) {
      triggered = true;
      description = "Número do cartão não fornecido";
    } else {
      const bin = cardNumber.replace(/\s/g, '').substring(0, 6);

      // BINs conhecidos de cartões pré-pagos (exemplos - seria melhor ter uma lista completa)
      const prepaidBins = [
        '400000', // Exemplo genérico
        '410000', // Exemplo genérico
        '420000', // Exemplo genérico
        // Adicionar BINs reais de cartões pré-pagos brasileiros como Sodexo, VR, etc.
        '606282', // Sodexo
        '603136', // VR
        '606287', // Ticket
      ];

      if (prepaidBins.includes(bin)) {
        triggered = true;
        description = "Cartão pré-pago detectado";
      }

      // Verifica se BIN é válido (não começa com 0 ou é muito baixo)
      if (bin.startsWith('0') || parseInt(bin) < 400000) {
        triggered = true;
        description = "BIN do cartão suspeito";
      }
    }

    return {
      name: "bin_risk",
      weight: 15,
      triggered,
      description
    };
  }

  /**
   * Avalia risco baseado na discrepância entre nome do comprador e titular do cartão
   */
  private assessNameMismatchRisk(payment: PaymentInput): RiskFactor {
    const payerName = payment.payer?.name?.trim().toLowerCase();
    const cardholderName = payment.cardholderName?.trim().toLowerCase() || payment.cardData?.holder?.trim().toLowerCase();

    let triggered = false;
    let description = "Nomes consistentes";

    if (!payerName || !cardholderName) {
      triggered = true;
      description = "Nome do comprador ou titular do cartão ausente";
    } else {
      // Verifica se os nomes são muito diferentes (simples comparação)
      const payerWords = payerName.split(/\s+/);
      const cardholderWords = cardholderName.split(/\s+/);

      // Se não há pelo menos um nome/sobrenome em comum, considera suspeito
      const commonWords = payerWords.filter(word => cardholderWords.includes(word));
      if (commonWords.length === 0) {
        triggered = true;
        description = "Discrepância entre nome do comprador e titular do cartão";
      }
    }

    return {
      name: "name_mismatch",
      weight: 10,
      triggered,
      description
    };
  }

  /**
   * Calcula o nível de risco baseado no score
   */
  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 80) return "CRITICAL";
    if (score >= 60) return "HIGH";
    if (score >= 40) return "MEDIUM";
    return "LOW";
  }

  /**
   * Gera razão para bloqueio baseada nos fatores acionados
   */
  private getBlockReason(factors: RiskFactor[]): string {
    const triggeredFactors = factors.filter(f => f.triggered);
    const reasons = triggeredFactors.map(f => f.description);

    if (reasons.length === 1) {
      return reasons[0];
    }

    return `Múltiplos fatores de risco: ${reasons.join(', ')}`;
  }

  private isGenericName(name: string): boolean {
    const normalized = name.trim().toLowerCase();
    const genericPatterns = [
      /^cliente(s)?$/,
      /^comprador(es)?$/,
      /^test(e|ing)?$/,
      /^user(s)?$/,
      /^usuario(s)?$/,
      /^guest$/,
      /^anon(imo)?$/,
      /^anonymous$/,
      /^buyer$/,
      /^admin$/
    ];
    return genericPatterns.some((pattern) => pattern.test(normalized));
  }

  /**
   * Método para futura integração com serviços antifraude externos
   * Este método pode ser expandido para chamar APIs como ClearSale, Konduto, etc.
   */
  async assessExternalRisk(payment: PaymentInput): Promise<RiskAssessment> {
    // TODO: Implementar integração com serviços antifraude externos
    // Por enquanto, retorna a avaliação baseada em heurísticas
    return this.assessRisk(payment);
  }
}