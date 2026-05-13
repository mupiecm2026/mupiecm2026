// test/payment-api.test.ts
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

// Teste 1: Pagamento válido com cartão de teste Mercado Pago
const validPayment = {
  gateway: "mercadopago",
  payment: {
    amount: 50.00,
    token: "test_token_mp", // Simulando token do MP
    paymentMethodId: "mastercard",
    installments: 1,
    payer: {
      email: "teste@exemplo.com",
      cpf: "12345678909",
      name: "Test User"
    },
    deviceId: "device_test_123"
  },
  order: {
    orderId: "test_order_001",
    items: [{
      id: "item_1",
      title: "Produto Teste",
      price: 50.00,
      quantity: 1
    }],
    totalItems: 1,
    total: 50.00
  }
};

// Teste 2: Pagamento com dados inválidos (email incorreto)
const invalidEmailPayment = {
  ...validPayment,
  payment: {
    ...validPayment.payment,
    payer: {
      ...validPayment.payment.payer,
      email: "email-invalido"
    }
  }
};

// Teste 3: Pagamento de alto risco (sem deviceId + email suspeito + parcelas altas + valor alto)
const highRiskPayment = {
  ...validPayment,
  payment: {
    ...validPayment.payment,
    amount: 6000.00, // Valor alto para aumentar score
    deviceId: undefined,
    payer: {
      ...validPayment.payment.payer,
      email: "teste@10minutemail.com"
    },
    installments: 10
  },
  order: {
    ...validPayment.order,
    total: 6000.00
  }
};

// Teste 4: Pagamento bloqueado por risco (score >= 75)
const blockedRiskPayment = {
  ...validPayment,
  payment: {
    ...validPayment.payment,
    amount: 10000.00, // Valor muito alto
    deviceId: undefined,
    payer: {
      ...validPayment.payment.payer,
      email: "teste@10minutemail.com",
      cpf: "11111111111" // CPF suspeito (sequência)
    },
    installments: 12 // Parcelas muito altas
  },
  order: {
    ...validPayment.order,
    total: 10000.00
  }
};

// Teste 5: Pagamento REALMENTE bloqueado por risco (score >= 75)
const reallyBlockedPayment = {
  ...validPayment,
  payment: {
    ...validPayment.payment,
    amount: 10000.00, // Valor muito alto (15 pontos)
    deviceId: undefined, // Falta deviceId (25 pontos)
    payer: {
      ...validPayment.payment.payer,
      email: "teste@10minutemail.com", // Email suspeito (15 pontos)
      cpf: "11111111111" // CPF suspeito (sequência) - será pego pela validação primeiro
    },
    installments: 12 // Parcelas muito altas (10 pontos)
  },
  order: {
    ...validPayment.order,
    total: 10000.00
  }
};

// Teste 6: Bloqueio por risco puro (dados válidos mas score alto)
const riskOnlyBlockedPayment = {
  ...validPayment,
  payment: {
    ...validPayment.payment,
    amount: 10000.00, // Valor muito alto (15 pontos)
    deviceId: undefined, // Falta deviceId (25 pontos)
    payer: {
      ...validPayment.payment.payer,
      email: "teste@10minutemail.com", // Email suspeito (15 pontos)
      cpf: "12345678909" // CPF válido
    },
    installments: 12, // Parcelas muito altas (10 pontos)
    cardData: { // Adiciona dados do cartão para aumentar score se necessário
      number: "4111111111111111",
      holder: "TEST USER",
      expMonth: "12",
      expYear: "2030",
      cvv: "123"
    }
  },
  order: {
    ...validPayment.order,
    total: 10000.00
  }
};

async function testPayment(testName: string, payload: any) {
  console.log(`[TEST] ${testName}`);
  try {
    const response = await fetch(`${API_BASE}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result : any = await response.json();

    // Log estruturado para monitoramento
    console.log(JSON.stringify({
      test: testName,
      status: response.status,
      success: result.success,
      gateway: result.gateway,
      errorCode: result.errorCode,
      timestamp: new Date().toISOString()
    }));
  } catch (error: any) {
    console.error(`[TEST ERROR] ${testName}:`, {
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

async function runTests() {
  console.log('[TEST SUITE] Iniciando testes da API de pagamentos com validação e risco...');

  await testPayment('VALID_PAYMENT', validPayment);
  await testPayment('INVALID_EMAIL', invalidEmailPayment);
  await testPayment('HIGH_RISK_MEDIUM', highRiskPayment);
  await testPayment('HIGH_RISK_MEDIUM_2', blockedRiskPayment);
  await testPayment('VALIDATION_BLOCK_CPF', reallyBlockedPayment);
  await testPayment('RISK_BLOCK_HIGH_SCORE', riskOnlyBlockedPayment);

  console.log('[TEST SUITE] ✅ Testes concluídos!');
}

runTests().catch(console.error);