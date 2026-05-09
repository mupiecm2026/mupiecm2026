/**
 * Utilitário de coleta de fingerprints
 * Captura IDs de dispositivo para múltiplos gateways
 * Retorna fallback quando SDKs ou variáveis não estão disponíveis
 */

import { logger } from "./logger";

export interface DeviceFingerprints {
  mercadopago?: { deviceId: string; timestamp: number };
  stripe?: {
    fingerprintToken?: string;
    timestamp: number;
    userAgent?: string;
    language?: string;
    screen?: string;
  };
  cielo?: { dfpSessionId: string; timestamp: number };
  pagarme?: { deviceId: string; timestamp: number };
  adiq?: { fingerprintId: string; timestamp: number };
}

export interface FingerprintCollectorOptions {
  mercadopagoPublicKey?: string;
  stripePublicKey?: string;
  pagarmePublicKey?: string;
  adiqPublicKey?: string;
  threatmetrixOrgId?: string;
}

const loadScript = (src: string, attributes: Record<string, string> = {}): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    Object.entries(attributes).forEach(([key, value]) => {
      script.setAttribute(key, value);
    });

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar o script: ${src}`));

    document.head.appendChild(script);
  });
};

const generateFallbackId = (prefix: string) => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

const collectMercadoPagoFingerprint = async (
  options: FingerprintCollectorOptions = {}
): Promise<DeviceFingerprints["mercadopago"]> => {
  try {
    const publicKey =
      options.mercadopagoPublicKey || process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

    if (!(window as any).MercadoPago && publicKey) {
      await loadScript("https://sdk.mercadopago.com/js/v2");
    }

    const MP = (window as any).MercadoPago;
    let deviceId: string | undefined;

    if (MP && publicKey) {
      try {
        const mpInstance = new MP(publicKey);

        if (typeof mpInstance.getDeviceId === "function") {
          deviceId = mpInstance.getDeviceId();
        } else if (typeof MP.getDeviceId === "function") {
          deviceId = MP.getDeviceId();
        } else if (typeof MP.devices?.getFingerprintId === "function") {
          deviceId = MP.devices.getFingerprintId();
        }
      } catch (innerError) {
        logger.warn(
          "Não foi possível instanciar Mercado Pago para fingerprint, tentando fallback",
          innerError
        );
      }
    }

    if (!deviceId) {
      deviceId =
        (window as any).__mp_device_id ||
        generateFallbackId("mp");
    }

    return { deviceId: deviceId!, timestamp: Date.now() };
  } catch (error) {
    logger.error("Erro ao coletar fingerprint Mercado Pago:", error);
    return { deviceId: generateFallbackId("mp"), timestamp: Date.now() };
  }
};

const collectStripeFingerprint = async (
  options: FingerprintCollectorOptions = {}
): Promise<DeviceFingerprints["stripe"]> => {
  try {
    const publicKey = options.stripePublicKey || process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;

    if (!(window as any).Stripe) {
      await loadScript("https://js.stripe.com/v3/");
    }

    const Stripe = (window as any).Stripe;
    let fingerprintToken = generateFallbackId("stripe");

    const fingerprintContext = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      screen: `${window.screen.width}x${window.screen.height}`,
    };

    if (Stripe) {
      if (publicKey) {
        try {
          const stripe = Stripe(publicKey);
          if (stripe && typeof stripe === "object") {
            fingerprintToken = `stripe_loaded_${Date.now()}`;
          }
        } catch {
          fingerprintToken = `stripe_loaded_${Date.now()}`;
        }
      } else {
        fingerprintToken = `stripe_loaded_${Date.now()}`;
      }
    }

    return { fingerprintToken, timestamp: Date.now(), ...fingerprintContext };
  } catch (error) {
    logger.error("Erro ao coletar fingerprint Stripe:", error);
    return { fingerprintToken: generateFallbackId("stripe"), timestamp: Date.now() };
  }
};

const collectCieloFingerprint = async (
  options: FingerprintCollectorOptions = {}
): Promise<DeviceFingerprints["cielo"]> => {
  try {
    const orgId = options.threatmetrixOrgId || process.env.NEXT_PUBLIC_THREATMETRIX_ORG_ID;
    if (!orgId) {
      logger.warn("Threatmetrix Org ID não configurado, usando fallback de dfp_session_id");
      return { dfpSessionId: generateFallbackId("cielo"), timestamp: Date.now() };
    }

    const scriptUrl = `https://h.online-metrix.net/fp/tags.js?org_id=${orgId}`;
    await loadScript(scriptUrl);

    const TMXID = (window as any).TMXID;
    const dfpSessionId = TMXID?.SessionID || generateFallbackId("cielo");

    return { dfpSessionId, timestamp: Date.now() };
  } catch (error) {
    logger.error("Erro ao coletar fingerprint Cielo/Threatmetrix:", error);
    return { dfpSessionId: generateFallbackId("cielo"), timestamp: Date.now() };
  }
};

const collectPagarmeFingerprint = async (
  options: FingerprintCollectorOptions = {}
): Promise<DeviceFingerprints["pagarme"]> => {
  try {
    const pagarmePublicKey = options.pagarmePublicKey;
    const Core = (window as any).PagarmeCore || (window as any).pagarme?.Core;

    if (!Core && pagarmePublicKey) {
      await loadScript(
        "https://unpkg.com/@pagarme/pagarme-js@4.3.2/dist/pagarme.min.js"
      );
    }

    const deviceId =
      (window as any).PagarmeCore?.getDeviceId?.() ||
      (window as any).pagarme?.Core?.getDeviceId?.() ||
      generateFallbackId("pagarme");

    return { deviceId, timestamp: Date.now() };
  } catch (error) {
    logger.error("Erro ao coletar fingerprint Pagar.me:", error);
    return { deviceId: generateFallbackId("pagarme"), timestamp: Date.now() };
  }
};

const collectAdiqFingerprint = async (
  options: FingerprintCollectorOptions = {}
): Promise<DeviceFingerprints["adiq"]> => {
  try {
    const key = options.adiqPublicKey || process.env.NEXT_PUBLIC_ADIQ_PUBLIC_KEY;
    let Adiq = (window as any).Adiq;

    if (!Adiq && key) {
      await loadScript("https://cdn.adiq.com.br/fingerprint.js");
      Adiq = (window as any).Adiq;
    }

    if (key && Adiq?.Fingerprint?.generate) {
      const fingerprintId = await Adiq.Fingerprint.generate();
      return { fingerprintId, timestamp: Date.now() };
    }

    logger.warn(
      "Adiq SDK não disponível ou chave não configurada, usando fallback de fingerprint_id"
    );
    return { fingerprintId: generateFallbackId("adiq"), timestamp: Date.now() };
  } catch (error) {
    logger.error("Erro ao coletar fingerprint Adiq:", error);
    return { fingerprintId: generateFallbackId("adiq"), timestamp: Date.now() };
  }
};

export async function collectAllFingerprints(
  options: FingerprintCollectorOptions = {}
): Promise<DeviceFingerprints> {
  try {
    logger.info("Coletando fingerprints de todos os gateways...");
    const results = await Promise.allSettled([
      collectMercadoPagoFingerprint(options),
      collectStripeFingerprint(options),
      collectCieloFingerprint(options),
      collectPagarmeFingerprint(options),
      collectAdiqFingerprint(options),
    ]);

    const fingerprints: DeviceFingerprints = {
      mercadopago:
        results[0].status === "fulfilled"
          ? results[0].value
          : { deviceId: generateFallbackId("mp"), timestamp: Date.now() },
      stripe:
        results[1].status === "fulfilled"
          ? results[1].value
          : { fingerprintToken: generateFallbackId("stripe"), timestamp: Date.now() },
      cielo:
        results[2].status === "fulfilled"
          ? results[2].value
          : { dfpSessionId: generateFallbackId("cielo"), timestamp: Date.now() },
      pagarme:
        results[3].status === "fulfilled"
          ? results[3].value
          : { deviceId: generateFallbackId("pagarme"), timestamp: Date.now() },
      adiq:
        results[4].status === "fulfilled"
          ? results[4].value
          : { fingerprintId: generateFallbackId("adiq"), timestamp: Date.now() },
    };

    logger.info("Fingerprints coletados com sucesso", fingerprints);
    return fingerprints;
  } catch (error) {
    logger.error("Erro em collectAllFingerprints:", error);
    return {
      mercadopago: { deviceId: generateFallbackId("mp"), timestamp: Date.now() },
      stripe: { fingerprintToken: generateFallbackId("stripe"), timestamp: Date.now() },
      cielo: { dfpSessionId: generateFallbackId("cielo"), timestamp: Date.now() },
      pagarme: { deviceId: generateFallbackId("pagarme"), timestamp: Date.now() },
      adiq: { fingerprintId: generateFallbackId("adiq"), timestamp: Date.now() },
    };
  }
}

export async function collectGatewayFingerprint(
  gateway: keyof DeviceFingerprints,
  options: FingerprintCollectorOptions = {}
): Promise<any> {
  const collectors: Record<
    string,
    (opts: FingerprintCollectorOptions) => Promise<any>
  > = {
    mercadopago: collectMercadoPagoFingerprint,
    stripe: collectStripeFingerprint,
    cielo: collectCieloFingerprint,
    pagarme: collectPagarmeFingerprint,
    adiq: collectAdiqFingerprint,
  };
  const collector = collectors[gateway];
  if (!collector) {
    logger.warn(`Gateway desconhecido: ${gateway}`);
    return null;
  }
  try {
    return await collector(options);
  } catch (error) {
    logger.error(`Falha ao coletar fingerprint para ${gateway}:`, error);
    return null;
  }
}
