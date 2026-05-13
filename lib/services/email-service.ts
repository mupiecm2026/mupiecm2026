import { OrderData, PaymentInput, PaymentResult } from "../../types/types";
import { logger } from "../utils/logger";
import { Resend } from "resend";

interface EmailSendResult {
  sent: boolean;
  provider?: string;
  reason?: string;
}

function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function buildOrderItemsHtml(items: OrderData["items"]) {
  const rows = items
    .map(
      (item) =>
        `<tr><td style="padding: 8px 0;">${item.title}</td><td style="padding: 8px 0; text-align:right;">${item.quantity}x</td><td style="padding: 8px 0; text-align:right;">${formatCurrencyBRL(item.price)}</td></tr>`
    )
    .join("");

  return `
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-top: 16px;">
      ${rows}
    </table>
  `;
}

function buildEmailBody(
  payment: PaymentInput,
  order: OrderData,
  result: PaymentResult
) {
  const statusLabel =
    result.status === "approved"
      ? "aprovado"
      : result.status === "pending"
      ? "em processamento"
      : result.status;

  const paymentTitle =
    result.status === "approved"
      ? "Pagamento aprovado"
      : result.status === "pending"
      ? "Pagamento em processamento"
      : "Detalhes do pagamento";

  const transactionInfo = result.transactionId
    ? `<p><strong>Transação:</strong> ${result.transactionId}</p>`
    : "";

  return {
    subject: `Mupi Ecm - ${paymentTitle}`,
    text: `Olá,

Seu pedido ${order.orderId} foi ${statusLabel}.

Valor: ${formatCurrencyBRL(payment.amount)}
${transactionInfo ? `Transação: ${result.transactionId}
` : ""}${(result as any).nfId ? `Nota Fiscal: ${(result as any).nfId}
` : ""}
Gateway: ${result.gateway || "N/A"}

Itens:
${order.items
      .map((item) => `- ${item.title} x${item.quantity} = ${formatCurrencyBRL(item.price)}`)
      .join("\n")}

Obrigado por comprar na Mupi Ecm!`,
    html: `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${paymentTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background-color: #2D9CDB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; }
          .status { font-size: 18px; font-weight: bold; color: ${result.status === "approved" ? "#27AE60" : result.status === "pending" ? "#F39C12" : "#E74C3C"}; }
          .order-details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .item { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
          .total { font-size: 18px; font-weight: bold; color: #2D9CDB; text-align: right; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Mupi Ecm</div>
            <h1>${paymentTitle}</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            <p>Seu pedido <strong>${order.orderId}</strong> foi <span class="status">${statusLabel}</span>.</p>
            <div class="order-details">
              <p><strong>Valor Total:</strong> ${formatCurrencyBRL(payment.amount)}</p>
              ${transactionInfo}
              ${(result as any).nfId ? `<p><strong>Nota Fiscal:</strong> ${(result as any).nfId}</p>` : ""}
              <p><strong>Gateway:</strong> ${result.gateway || "N/A"}</p>
              <h3>Itens do Pedido:</h3>
              ${buildOrderItemsHtml(order.items)}
              <div class="total">
                Total: ${formatCurrencyBRL(order.total)}
              </div>
            </div>
            <p>Obrigado por escolher a Mupi Ecm!</p>
            <p>Atenciosamente,<br>Equipe Mupi Ecm</p>
          </div>
          <div class="footer">
            <p>Este é um e-mail automático. Por favor, não responda.</p>
            <p>&copy; ${new Date().getFullYear()} Mupi Ecm. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

async function sendViaResend(
  env: any,
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<EmailSendResult> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.DOMAIN_URL || "noreply@mupi.com";

  if (!apiKey || !from) {
    return {
      sent: false,
      provider: "resend",
      reason: "Resend environment variables are not configured.",
    };
  }

  try {
    const resend = new Resend(apiKey);

    const response = await resend.emails.send({
      from,
      to: [to],
      subject,
      text,
      html,
    });

    if (response.error) {
      return {
        sent: false,
        provider: "resend",
        reason: `Resend error: ${response.error.message}`,
      };
    }

    return { sent: true, provider: "resend" };
  } catch (error: any) {
    return {
      sent: false,
      provider: "resend",
      reason: error?.message || "Falha ao enviar email via Resend.",
    };
  }
}

export async function sendPaymentNotificationEmail(
  env: any,
  payment: PaymentInput,
  order: OrderData,
  result: PaymentResult
): Promise<EmailSendResult> {
  const customerEmail = payment?.payer?.email;
  if (!customerEmail) {
    return {
      sent: false,
      reason: "Customer email not provided.",
    };
  }

  const shouldNotify = result.status === "approved" || result.status === "pending";
  if (!shouldNotify) {
    return {
      sent: false,
      reason: `Notification skipped for status ${result.status}`,
    };
  }

  const emailContent = buildEmailBody(payment, order, result);

  logger.info("[email] Sending payment notification", {
    to: customerEmail,
    orderId: order.orderId,
    status: result.status,
  });

  const sendResult = await sendViaResend(
    env,
    customerEmail,
    emailContent.subject,
    emailContent.text,
    emailContent.html
  );

  if (!sendResult.sent) {
    logger.warn("[email] Payment notification not sent", sendResult);
  } else {
    logger.info("[email] Payment notification sent", sendResult);
  }

  return sendResult;
}
