import { CashbackService } from "./cashback-service";

export class PaymentOrchestrator {
  constructor(private cashback: CashbackService) {}

  async handlePaymentUpdate(input: {
    transactionId: string;
    status: string;
    amount: number;
    gateway: string;
  }) {
    if (!input.transactionId || !input.amount) {
      return { status: "ignored" };
    }

    const status = this.normalizeStatus(input);

    if (status === "paid") {
      await this.handlePaid(input);
    }

    return { status };
  }

  private normalizeStatus(input: any) {
    const { status, gateway } = input;

    switch (gateway) {
      case "mercadopago":
        return status === "approved" ? "paid" : "processing";

      case "stripe":
        return status === "succeeded" ? "paid" : "processing";

      case "cielo":
        return status === "captured" ? "paid" : "processing";

      case "pagarme":
        return status === "paid" ? "paid" : "processing";

      default:
        return "processing";
    }
  }

  private async handlePaid(input: any) {
    // ✅ delega pro service (não toca no KV)
    await this.cashback.generateCashbackCode(
      input.transactionId,
      input.amount
    );
  }
}