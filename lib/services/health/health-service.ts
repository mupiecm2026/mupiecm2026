import { GatewayNames } from '../../../types/types';
import { logger } from '../../utils/logger';
import { PaymentProcessor } from '../payments/gateways/interface/payment-processor';
import { GatewayConfigService } from '../payments/gateways/configurations/gateway-config-service';
import { CashbackService } from '../sales/cashback/cashback-service';
import NFService from '../sales/nf/nf-service';

export class HealthService {
  private paymentProcessor: PaymentProcessor;

  constructor(private configService: GatewayConfigService) {
    const cashbackService = new CashbackService(
      (configService as any).env
    );
    const nfService = new NFService((configService as any).env);

    this.paymentProcessor = new PaymentProcessor(
      this.configService,
      cashbackService,
      undefined,
      undefined,
      nfService
    );
  }

  async checkGateway(
    gateway: GatewayNames
  ): Promise<{ status: string; latency: number; lastCheck: string }> {
    try {
      const result = await this.paymentProcessor.getGatewayHealth(gateway);

      return {
        status: result.status,
        latency: result.latency,
        lastCheck: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'error',
        latency: 0,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  async checkKV() {
    const start = Date.now();

    try {
      await this.configService.getStore();

      return {
        status: 'healthy',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('KV health check failed', {
        error: (error as Error).message,
      });

      return {
        status: 'unhealthy',
        latency: Date.now() - start,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  async getOverallHealth() {
    const gateways: GatewayNames[] = [
      'mercadopago',
      'stripe',
      'pagarme',
      'cielo',
      'getnet',
      'adyen',
      'sumup',
    ];

    const [gatewayResults, kvHealth] = await Promise.all([
      Promise.all(
        gateways.map(async (g) => ({
          gateway: g,
          health: await this.checkGateway(g),
        }))
      ),
      this.checkKV(),
    ]);

    const gatewayHealthMap = gatewayResults.reduce((acc, { gateway, health }) => {
      acc[gateway] = health;
      return acc;
    }, {} as any);

    return {
      gateways: gatewayHealthMap,
      kv: kvHealth,
      overall: this.determineOverallHealth(gatewayHealthMap, kvHealth),
    };
  }

  private determineOverallHealth(gateways: any, kv: any): string {
    const hasHealthyGateway = Object.values(gateways).some(
      (g: any) => g.status === 'healthy'
    );

    const kvHealthy = kv.status === 'healthy';

    if (hasHealthyGateway && kvHealthy) return 'healthy';
    if (hasHealthyGateway || kvHealthy) return 'degraded';
    return 'unhealthy';
  }
}