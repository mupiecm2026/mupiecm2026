import { logger } from "../utils/logger";
import { CashbackService } from "./cashback-service";

export class WebhookService {
  constructor(private cashbackService: CashbackService) {}

  async verifyMercadoPagoSignature(body: string, signature: string) {
    return true;
  }

  async processMercadoPagoEvent(event: any) {
    try {
      const payment = event?.data?.object;

      if (!payment) {
        logger.warn("MP webhook without payment object");
        return;
      }

      const transactionId = payment.id;
      const status = payment.status;
      const statusDetail = payment.status_detail;
      const amount = payment.transaction_amount;

      logger.info("Processing MP payment event", {
        transactionId,
        status,
        statusDetail,
      });

      const isFinalApproved =
        status === "approved" &&
        statusDetail === "accredited";

      if (!isFinalApproved) {
        logger.info("Payment not final yet, skipping cashback", {
          transactionId,
        });
        return;
      }

      const cashbackCode =
        await this.cashbackService.generateCashbackCode(
          transactionId,
          amount
        );

      logger.info("Cashback generated from webhook", {
        transactionId,
        cashbackCode,
        amount,
      });

      return;
    } catch (err: any) {
      logger.error("Error processing MP event", {
        error: err.message,
      });

      throw err;
    }
  }
}