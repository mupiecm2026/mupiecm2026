/**
 * Gateway URL Manager
 * 
 * Gerencia URLs de API baseadas no ambiente (APP_ENV).
 * - development/sandbox → URLs de sandbox
 * - production → URLs de produção
 */

type AppEnvironment = "development" | "production";

interface GatewayUrls {
  [key: string]: {
    sandbox: string;
    production: string;
  };
}

const GATEWAY_URLS: GatewayUrls = {
  cielo: {
    sandbox: "https://apisandbox.cieloecommerce.cielo.com.br",
    production: "https://api.cieloecommerce.cielo.com.br",
  },
  mercadopago: {
    sandbox: "https://api.mercadopago.com", //(sim eo mesmo)
    production: "https://api.mercadopago.com",
  },
  stripe: {
    sandbox: "https://api-test.stripe.com/v1",
    production: "https://api.stripe.com/v1",
  },
  pagarme: {
    sandbox: "https://api.sandbox.pagar.me/core/v5",
    production: "https://api.pagar.me/core/v5",
  },
  getnet: {
    sandbox: "https://api-sandbox.getnet.com.br",
    production: "https://api.getnet.com.br",
  },
  adyen: {
    sandbox: "https://checkout-test.adyen.com/v71",
    production: "https://checkout-live.adyen.com/v71",
  },
  sumup: {
    sandbox: "https://api.sumup.com", // Sumup não tem sandbox público
    production: "https://api.sumup.com",
  },
};

/**
 * Get current environment from APP_ENV
 */
export function getAppEnvironment(): AppEnvironment {
  const env = 
    (globalThis as any).__ENV__?.APP_ENV ||
    (globalThis as any).env?.APP_ENV ||
    (globalThis as any).process?.env?.APP_ENV ||
    "development";
  
  return env === "production" ? "production" : "development";
}

/**
 * Get base URL for a specific gateway based on current environment
 */
export function getGatewayUrl(gateway: string): string {
  const env = getAppEnvironment();
  const urls = GATEWAY_URLS[gateway];
  
  if (!urls) {
    throw new Error(`Gateway não encontrado: ${gateway}`);
  }
  
  return env === "production" ? urls.production : urls.sandbox;
}

/**
 * Check if running in production environment
 */
export function isProduction(): boolean {
  return getAppEnvironment() === "production";
}

/**
 * Check if running in sandbox/development environment
 */
export function isSandbox(): boolean {
  return !isProduction();
}