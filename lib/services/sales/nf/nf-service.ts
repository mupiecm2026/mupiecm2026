

import jsPDF from "jspdf";
import "jspdf-autotable";

import QRCode from "qrcode";

import { generateNFPNG } from "./nf-renderer";
import { KVStore } from "../../kv/kv-store.interface";
import { createKVStore } from "../../kv/kv-store.factory";
import { OrderData, PaymentInput } from "../../../../types/types";

export interface NFData {
  id: string;
  orderId: string;

  date: string;
  time: string;

  issuer: {
    name: string;
    cnpj: string;
    address: string;
  };

  customer: {
    name: string;
    cpf: string;
    email: string;
  };

  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  total: number;

  barcode: string;

  payment: {
    gateway: string;
    cardBrand?: string;
    cardLast4?: string;
  };
}

export class NFService {
  private kvInstance: KVStore | null = null;

  constructor(private env: any) {}

  private async getKV(): Promise<KVStore> {
    if (!this.kvInstance) {
      this.kvInstance = await createKVStore(this.env);
    }

    return this.kvInstance;
  }

  async generateNF(
    order: OrderData,
    payment: PaymentInput,
    gateway: string
  ): Promise<NFData> {
    const now = new Date();

    const nfId =
      `NF-${order.orderId}-${Date.now()}`;

    const nf: NFData = {
      id: nfId,

      orderId: order.orderId,

      date: now.toISOString().split("T")[0],

      time: now
        .toTimeString()
        .split(" ")[0],

      issuer: {
        name: "Mupi Ecm",
        cnpj: "12.345.678/0001-90",
        address:
          "Rua Exemplo, 123 - São Paulo/SP",
      },

      customer: {
        name:
          payment.payer.name ||
          "Cliente",

        cpf:
          payment.payer.cpf ||
          "000.000.000-00",

        email:
          payment.payer.email ||
          "cliente@email.com",
      },

      items: order.items.map((item) => ({
        id: String(item.id),

        title: item.title,

        quantity: item.quantity,

        unitPrice: item.price,

        total:
          item.price * item.quantity,
      })),

      total: order.total,

      barcode: this.generateBarcode(),

      payment: {
        gateway,

        cardBrand:
          payment.cardData?.brand,

        cardLast4:
          payment.cardData?.number?.slice(
            -4
          ),
      },
    };

    const kv = await this.getKV();

    await kv.put(
      `nf:${nfId}`,
      JSON.stringify(nf)
    );

    return nf;
  }

  async getNF(
    nfId: string
  ): Promise<NFData | null> {
    const kv = await this.getKV();

    const data = await kv.get(
      `nf:${nfId}`
    );

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  }

  async listNFs(
    limit = 50
  ): Promise<NFData[]> {
    const kv = await this.getKV();

    const keys = await kv.list({
      prefix: "nf:",
      limit,
    });

    const nfs: NFData[] = [];

    for (const key of keys.keys) {
      const data = await kv.get(
        key.name
      );

      if (!data) {
        continue;
      }

      nfs.push(JSON.parse(data));
    }

    return nfs.sort((a, b) => {
      const dateA = new Date(
        `${a.date} ${a.time}`
      ).getTime();

      const dateB = new Date(
        `${b.date} ${b.time}`
      ).getTime();

      return dateB - dateA;
    });
  }

  private generateBarcode(): string {
    let result = "";

    for (let i = 0; i < 13; i++) {
      result += Math.floor(
        Math.random() * 10
      ).toString();
    }

    return result;
  }

  async generateNFPDF(
    nf: NFData
  ): Promise<Uint8Array> {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");

    doc.setFontSize(20);

    doc.text(
      "NOTA FISCAL ELETRÔNICA",
      pageWidth / 2,
      20,
      {
        align: "center",
      }
    );

    doc.setFont("helvetica", "normal");

    doc.setFontSize(11);

    doc.text(`NF: ${nf.id}`, 14, 35);

    doc.text(
      `Pedido: ${nf.orderId}`,
      14,
      42
    );

    doc.text(
      `${nf.date} ${nf.time}`,
      14,
      49
    );

    doc.line(14, 55, 196, 55);

    let y = 65;

    doc.setFont("helvetica", "bold");

    doc.setFontSize(13);

    doc.text("EMISSOR", 14, y);

    y += 8;

    doc.setFont("helvetica", "normal");

    doc.setFontSize(11);

    doc.text(nf.issuer.name, 14, y);

    y += 6;

    doc.text(
      `CNPJ: ${nf.issuer.cnpj}`,
      14,
      y
    );

    y += 6;

    doc.text(
      nf.issuer.address,
      14,
      y
    );

    y += 18;

    doc.setFont("helvetica", "bold");

    doc.setFontSize(13);

    doc.text("CLIENTE", 14, y);

    y += 8;

    doc.setFont("helvetica", "normal");

    doc.setFontSize(11);

    doc.text(
      nf.customer.name,
      14,
      y
    );

    y += 6;

    doc.text(
      `CPF: ${nf.customer.cpf}`,
      14,
      y
    );

    y += 6;

    doc.text(
      nf.customer.email,
      14,
      y
    );

    y += 18;

    doc.setFont("helvetica", "bold");

    doc.setFontSize(13);

    doc.text("PAGAMENTO", 14, y);

    y += 8;

    doc.setFont("helvetica", "normal");

    doc.setFontSize(11);

    doc.text(
      `Gateway: ${nf.payment.gateway}`,
      14,
      y
    );

    if (nf.payment.cardBrand) {
      y += 6;

      doc.text(
        `Cartão: ${nf.payment.cardBrand} **** ${nf.payment.cardLast4}`,
        14,
        y
      );
    }

    y += 15;

    const tableBody = nf.items.map(
      (item) => [
        item.id,
        item.title,
        item.quantity.toString(),
        `R$ ${item.unitPrice
          .toFixed(2)
          .replace(".", ",")}`,
        `R$ ${item.total
          .toFixed(2)
          .replace(".", ",")}`,
      ]
    );

    (doc as any).autoTable({
      startY: y,

      head: [
        [
          "ID",
          "Produto",
          "Qtd",
          "Valor Unit.",
          "Total",
        ],
      ],

      body: tableBody,

      styles: {
        font: "helvetica",
        fontSize: 10,
        textColor: 20,
        lineColor: 180,
        lineWidth: 0.2,
      },

      headStyles: {
        fillColor: [240, 240, 240],
        textColor: 0,
        fontStyle: "bold",
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

    const finalY =
      (doc as any).lastAutoTable.finalY +
      15;

    doc.setFont("helvetica", "bold");

    doc.setFontSize(16);

    doc.text(
      `TOTAL: R$ ${nf.total
        .toFixed(2)
        .replace(".", ",")}`,
      14,
      finalY
    );

    try {
      const qrCode =
        await QRCode.toDataURL(nf.id, {
          width: 140,
          margin: 1,
        });

      doc.addImage(
        qrCode,
        "PNG",
        150,
        finalY - 20,
        35,
        35
      );
    } catch {}

    return new Uint8Array(
      doc.output("arraybuffer") as ArrayBuffer
    );
  }

  async generateNFPNGFile(
    nf: NFData
  ): Promise<Uint8Array> {
    return generateNFPNG(nf);
  }

  generateNFTXT(nf: NFData): string {
    return `
NOTA FISCAL ELETRÔNICA

NF: ${nf.id}
Pedido: ${nf.orderId}
Data: ${nf.date} ${nf.time}

EMISSOR
${nf.issuer.name}
CNPJ: ${nf.issuer.cnpj}
${nf.issuer.address}

CLIENTE
${nf.customer.name}
CPF: ${nf.customer.cpf}
Email: ${nf.customer.email}

PAGAMENTO
Gateway: ${nf.payment.gateway}
${
  nf.payment.cardBrand
    ? `Cartão: ${nf.payment.cardBrand} **** ${nf.payment.cardLast4}`
    : ""
}

ITENS

${nf.items
  .map(
    (item) => `
${item.title}

Qtd: ${item.quantity}
Unitário: R$ ${item.unitPrice
      .toFixed(2)
      .replace(".", ",")}
Total: R$ ${item.total
      .toFixed(2)
      .replace(".", ",")}
`
  )
  .join("\n")}

TOTAL: R$ ${nf.total
      .toFixed(2)
      .replace(".", ",")}

Código: ${nf.barcode}
`.trim();
  }
}

export default NFService;