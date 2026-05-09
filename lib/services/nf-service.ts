import { OrderData, PaymentInput } from "../../types/types";
import { createKVStore } from "./kv/kv-store.factory";
import { KVStore } from "./kv/kv-store.interface";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

export interface NFData {
  id: string;
  orderId: string;
  date: string;
  time: string;
  issuer: {
    name: "Mupi Ecm";
    cnpj: "12.345.678/0001-90"; // Fake CNPJ
    address: "Rua Exemplo, 123 - São Paulo/SP";
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
  barcode: string; // Fake barcode
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

  async generateNF(order: OrderData, payment: PaymentInput, gateway: string): Promise<NFData> {
    const now = new Date();
    const nfId = `NF-${order.orderId}-${Date.now()}`;

    const nf: NFData = {
      id: nfId,
      orderId: order.orderId,
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      issuer: {
        name: "Mupi Ecm",
        cnpj: "12.345.678/0001-90",
        address: "Rua Exemplo, 123 - São Paulo/SP",
      },
      customer: {
        name: payment.payer.name || "Cliente",
        cpf: payment.payer.cpf,
        email: payment.payer.email,
      },
      items: order.items.map(item => ({
        id: item.id.toString(),
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity,
      })),
      total: order.total,
      barcode: this.generateFakeBarcode(),
      payment: {
        gateway: gateway,
        cardBrand: payment.cardData?.brand,
        cardLast4: payment.cardData?.number?.slice(-4),
      },
    };

    // Store in KV
    const kv = await this.getKV();
    await kv.put(`nf:${nfId}`, JSON.stringify(nf));

    return nf;
  }

  async getNF(nfId: string): Promise<NFData | null> {
    const kv = await this.getKV();
    const data = await kv.get(`nf:${nfId}`);
    return data ? JSON.parse(data) : null;
  }

  async listNFs(limit = 50): Promise<NFData[]> {
    const kv = await this.getKV();
    const keys = await kv.list({ prefix: "nf:", limit });
    const nfs: NFData[] = [];

    for (const key of keys.keys) {
      const data = await kv.get(key.name);
      if (data) {
        nfs.push(JSON.parse(data));
      }
    }

    return nfs.sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());
  }

  private generateFakeBarcode(): string {
    // Generate a fake 13-digit barcode
    let barcode = "";
    for (let i = 0; i < 13; i++) {
      barcode += Math.floor(Math.random() * 10).toString();
    }
    return barcode;
  }

  // Export functions for PDF, PNG, TXT
  async generateNFPDF(nf: NFData): Promise<Buffer> {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('NOTA FISCAL ELETRÔNICA', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`ID: ${nf.id}`, 20, 35);
    doc.text(`Data: ${nf.date} ${nf.time} UTC`, 20, 45);
    doc.text(`Pedido: ${nf.orderId}`, 20, 55);

    // Issuer
    doc.setFontSize(14);
    doc.text('EMISSOR:', 20, 75);
    doc.setFontSize(10);
    doc.text(nf.issuer.name, 20, 85);
    doc.text(`CNPJ: ${nf.issuer.cnpj}`, 20, 95);
    doc.text(nf.issuer.address, 20, 105);

    // Customer
    doc.setFontSize(14);
    doc.text('CLIENTE:', 20, 125);
    doc.setFontSize(10);
    doc.text(nf.customer.name, 20, 135);
    doc.text(`CPF: ${nf.customer.cpf}`, 20, 145);
    doc.text(`Email: ${nf.customer.email}`, 20, 155);

    // Payment
    doc.setFontSize(14);
    doc.text('PAGAMENTO:', 20, 175);
    doc.setFontSize(10);
    doc.text(`Gateway: ${nf.payment.gateway}`, 20, 185);
    if (nf.payment.cardBrand) {
      doc.text(`Cartão: ${nf.payment.cardBrand} **** ${nf.payment.cardLast4}`, 20, 195);
    }

    // Items table
    const tableData = nf.items.map(item => [
      item.id,
      item.title,
      item.quantity.toString(),
      `R$ ${item.unitPrice.toFixed(2).replace('.', ',')}`,
      `R$ ${item.total.toFixed(2).replace('.', ',')}`
    ]);

    (doc as any).autoTable({
      head: [['ID', 'Produto', 'Qtd', 'Valor Unit.', 'Total']],
      body: tableData,
      startY: 210,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] },
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`TOTAL: R$ ${nf.total.toFixed(2).replace('.', ',')}`, 20, finalY);

    // Barcode (simulated with text)
    doc.setFontSize(10);
    doc.text(`Código de Barras: ${nf.barcode}`, 20, finalY + 10);

    // Generate QR Code for the NF
    try {
      const qrCodeDataURL = await QRCode.toDataURL(nf.id, { width: 100 });
      // Add QR code image to PDF
      const qrImage = qrCodeDataURL.split(',')[1];
      doc.addImage(qrImage, 'PNG', 150, finalY - 20, 40, 40);
      doc.text('QR Code', 150, finalY + 25);
    } catch (error) {
      // Ignore QR code error
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  async generateNFPNG(nf: NFData): Promise<Buffer> {
    // Generate QR Code as PNG
    try {
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify({
        id: nf.id,
        total: nf.total,
        date: nf.date
      }), { width: 300 });

      // Convert data URL to buffer
      const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    } catch (error) {
      // Ignore PNG generation error, fallback to PDF
      return this.generateNFPDF(nf);
    }
  }

  generateNFTXT(nf: NFData): string {
    return `
NOTA FISCAL ELETRÔNICA
ID: ${nf.id}
Data: ${nf.date} ${nf.time} UTC
Pedido: ${nf.orderId}

EMISSOR:
${nf.issuer.name}
CNPJ: ${nf.issuer.cnpj}
${nf.issuer.address}

CLIENTE:
${nf.customer.name}
CPF: ${nf.customer.cpf}
Email: ${nf.customer.email}

PAGAMENTO:
Gateway: ${nf.payment.gateway}
${nf.payment.cardBrand ? `Cartão: ${nf.payment.cardBrand} **** ${nf.payment.cardLast4}` : ''}

ITENS:
${nf.items.map(item =>
  `${item.id} - ${item.title}
   Quantidade: ${item.quantity}
   Valor Unitário: R$ ${item.unitPrice.toFixed(2).replace('.', ',')}
   Total: R$ ${item.total.toFixed(2).replace('.', ',')}`
).join('\n\n')}

TOTAL: R$ ${nf.total.toFixed(2).replace('.', ',')}
Código de Barras: ${nf.barcode}
    `.trim();
  }
}

export default NFService;