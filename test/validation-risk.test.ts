// test/validation-risk.test.ts
import { ValidationService } from "../lib/services/validation-service";
import { RiskService } from "../lib/services/risk-service";
import { PaymentInput } from "../types/types";

const validationService = new ValidationService();
const riskService = new RiskService();

const validPayment: PaymentInput = {
  amount: 100.0,
  token: "test_token_123",
  payer: {
    email: "joao.silva@exemplo.com",
    cpf: "12345678909",
    name: "João Silva"
  },
  deviceId: "device_123",
  installments: 1
};

console.log("=== TESTE 1: Dados válidos ===");
const validation1 = validationService.validatePaymentInput(validPayment);
console.log("✅ Validação passou:", validation1.isValid);
console.log("✅ Risco:", riskService.assessRisk(validPayment).riskLevel);

console.log("\n=== TESTE 2: Nome genérico do comprador ===");
const genericBuyerName: PaymentInput = {
  ...validPayment,
  payer: {
    ...validPayment.payer,
    name: "Cliente"
  }
};
const validation2 = validationService.validatePaymentInput(genericBuyerName);
console.log("❌ Validação falhou:", !validation2.isValid, "| Erros:", validation2.errors.map(e => `${e.field}:${e.code}`));
console.log("⚠️ Risco:", riskService.assessRisk(genericBuyerName).riskLevel);

console.log("\n=== TESTE 3: Nome de portador genérico ===");
const genericCardHolder: PaymentInput = {
  ...validPayment,
  cardData: {
    number: "5031433215470631",
    holder: "CLIENTE",
    expMonth: "11",
    expYear: "2030",
    cvv: "123"
  }
};
const validation3 = validationService.validatePaymentInput(genericCardHolder);
console.log("❌ Validação falhou:", !validation3.isValid, "| Erros:", validation3.errors.map(e => `${e.field}:${e.code}`));

console.log("\n=== TESTE 4: CPF placeholder 00000000000 ===");
const placeholderCpf: PaymentInput = {
  ...validPayment,
  payer: {
    ...validPayment.payer,
    cpf: "00000000000"
  }
};
const validation4 = validationService.validatePaymentInput(placeholderCpf);
console.log("❌ Validação falhou:", !validation4.isValid, "| Erros:", validation4.errors.map(e => e.code));

console.log("\n=== TESTE 5: Email genérico e sem fingerprint ===");
const highRiskPayment: PaymentInput = {
  ...validPayment,
  deviceId: undefined,
  payer: {
    ...validPayment.payer,
    email: "teste@10minutemail.com",
    name: "Cliente"
  },
  installments: 10
};
const risk5 = riskService.assessRisk(highRiskPayment);
console.log("⚠️ Risco:", risk5.riskLevel, "Score:", risk5.score, "Bloqueado:", risk5.blocked);
console.log("Fatores:", risk5.factors.filter(f => f.triggered).map(f => `${f.name}(${f.weight})`));

console.log("\n=== TESTE 6: Dados de cartão Mercado Pago válidos ===");
const mercadoPagoTestPayment: PaymentInput = {
  amount: 50.0,
  paymentMethodId: "mastercard",
  payer: {
    email: "teste@exemplo.com",
    cpf: "12345678909",
    name: "Test User"
  },
  deviceId: "device_test",
  installments: 1,
  cardData: {
    number: "5031433215470631",
    holder: "TEST USER",
    expMonth: "11",
    expYear: "2030",
    cvv: "123"
  }
};
const validation6 = validationService.validatePaymentInput(mercadoPagoTestPayment);
console.log("✅ Validação passou:", validation6.isValid);
console.log("✅ Risco:", riskService.assessRisk(mercadoPagoTestPayment).riskLevel);

console.log("\n=== TESTE 7: Score alto e bloqueado ===");
const maxRiskPayment: PaymentInput = {
  amount: 10000.0,
  token: "test_token_123",
  payer: {
    email: "teste@10minutemail.com",
    cpf: "11111111111",
    name: "Cliente"
  },
  installments: 10
};
const risk7 = riskService.assessRisk(maxRiskPayment);
console.log("🚫 Risco:", risk7.riskLevel, "Score:", risk7.score, "Bloqueado:", risk7.blocked);
console.log("Fatores:", risk7.factors.filter(f => f.triggered).map(f => `${f.name}(${f.weight})`));

console.log("\n=== TESTE 8: IP suspeito ===");
const suspiciousIpPayment: PaymentInput = {
  ...validPayment,
  remoteIp: "192.168.1.1" // IP privado
};
const risk8 = riskService.assessRisk(suspiciousIpPayment);
console.log("⚠️ Risco:", risk8.riskLevel, "Score:", risk8.score, "Bloqueado:", risk8.blocked);
console.log("Fatores:", risk8.factors.filter(f => f.triggered).map(f => `${f.name}(${f.weight})`));

console.log("\n=== TESTE 9: Cartão pré-pago ===");
const prepaidCardPayment: PaymentInput = {
  ...validPayment,
  cardData: {
    number: "6062821234567890", // BIN Sodexo
    holder: "JOÃO SILVA",
    expMonth: "11",
    expYear: "2030",
    cvv: "123"
  }
};
const risk9 = riskService.assessRisk(prepaidCardPayment);
console.log("⚠️ Risco:", risk9.riskLevel, "Score:", risk9.score, "Bloqueado:", risk9.blocked);
console.log("Fatores:", risk9.factors.filter(f => f.triggered).map(f => `${f.name}(${f.weight})`));

console.log("\n=== TESTE 10: Nome mismatch ===");
const nameMismatchPayment: PaymentInput = {
  ...validPayment,
  cardholderName: "MARIA SOUSA" // Diferente de João Silva
};
const risk10 = riskService.assessRisk(nameMismatchPayment);
console.log("⚠️ Risco:", risk10.riskLevel, "Score:", risk10.score, "Bloqueado:", risk10.blocked);
console.log("Fatores:", risk10.factors.filter(f => f.triggered).map(f => `${f.name}(${f.weight})`));
