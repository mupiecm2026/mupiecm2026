import { OrderData, PaymentInput } from "../../types/types";
import { createKVStore } from "./kv/kv-store.factory";
import { KVStore } from "./kv/kv-store.interface";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import UPNG from 'upng-js';

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
    const paymentType = nf.payment.cardBrand
      ? `CARTAO ${nf.payment.cardBrand}`
      : nf.payment.gateway.toUpperCase().includes('PIX')
      ? 'PIX'
      : nf.payment.gateway.toUpperCase();

    const header = [
      'NOTA FISCAL ELETRONICA',
      '======================',
      `ID: ${nf.id}`,
      `DATA: ${nf.date} ${nf.time}`,
      `PEDIDO: ${nf.orderId}`,
      '',
      'EMISSOR:',
      `${nf.issuer.name}`,
      `CNPJ: ${nf.issuer.cnpj}`,
      `${nf.issuer.address}`,
      '',
      'CLIENTE:',
      `${nf.customer.name}`,
      `CPF: ${nf.customer.cpf}`,
      `EMAIL: ${nf.customer.email}`,
      '',
      'PAGAMENTO:',
      `TIPO: ${paymentType}`,
      nf.payment.cardBrand ? `CARTAO: **** ${nf.payment.cardLast4}` : `GATEWAY: ${nf.payment.gateway}`,
      '',
      'ITENS:',
      'ID  PRODUTO                 QTD  UNIDADE     TOTAL',
      '-------------------------------------------------------------',
    ];

    const itemLines = nf.items.flatMap(item => this.formatItemLines(item));
    const footer = [
      '',
      `TOTAL: R$ ${nf.total.toFixed(2).replace('.', ',')}`,
      '',
      `CODIGO DE BARRAS: ${nf.barcode}`,
    ];

    const lines = [...header, ...itemLines, ...footer].filter(Boolean);
    const normalizedLines = lines.map(line => this.normalizeTextLine(line));
    const scale = 4;
    const charWidth = 6 * scale;
    const charHeight = 8 * scale;
    const padding = 24;
    const letterSpacing = scale;
    const qrSize = 180;
    const maxLineLength = Math.max(...normalizedLines.map(line => line.length));
    const width = Math.max(1024, padding * 2 + maxLineLength * (charWidth + letterSpacing) + qrSize / 2);
    const height = padding * 2 + normalizedLines.length * (charHeight + scale) + qrSize + 40;

    const rgba = new Uint8Array(width * height * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 255;
      rgba[i + 1] = 255;
      rgba[i + 2] = 255;
      rgba[i + 3] = 255;
    }

    let y = padding;
    for (const line of normalizedLines) {
      let x = padding;
      for (const char of line) {
        this.drawChar(rgba, width, x, y, char, scale);
        x += charWidth + letterSpacing;
      }
      y += charHeight + scale;
    }

    try {
      const qr = await this.createQRCodeImage(nf.id, qrSize);
      this.pasteImage(rgba, width, qr.rgba, qr.width, qr.height, width - padding - qr.width, padding);
    } catch (error) {
      // ignore QR code failures
    }

    this.drawBarcode(rgba, width, padding, y + 16, nf.barcode, Math.min(width - padding * 2, 760), 48);

    const pngArrayBuffer = UPNG.encode([rgba.buffer], width, height, 0);
    return Buffer.from(pngArrayBuffer);
  }

  private formatItemLines(item: NFData['items'][number]): string[] {
    const title = item.title.toUpperCase();
    const quantity = item.quantity.toString();
    const unitPrice = `R$ ${item.unitPrice.toFixed(2).replace('.', ',')}`;
    const total = `R$ ${item.total.toFixed(2).replace('.', ',')}`;
    const maxTitleLength = 24;
    const titleParts = this.wrapText(title, maxTitleLength);

    const firstLine = `${item.id.toString().padEnd(4)} ${titleParts[0].padEnd(maxTitleLength)} ${quantity.padStart(3)} ${unitPrice.padStart(10)} ${total.padStart(12)}`;
    const additionalLines = titleParts.slice(1).map(line => `${"".padEnd(4)} ${line.padEnd(maxTitleLength)} ${"".padStart(3)} ${"".padStart(10)} ${"".padStart(12)}`);

    return [firstLine, ...additionalLines];
  }

  private wrapText(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if ((current + (current ? ' ' : '') + word).length <= maxLength) {
        current = current ? `${current} ${word}` : word;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
    }

    if (current) {
      lines.push(current);
    }

    return lines;
  }

  private async createQRCodeImage(data: string, size: number): Promise<{ rgba: Uint8Array; width: number; height: number }> {
    const dataUrl = await QRCode.toDataURL(data, { width: size, margin: 1 });
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64, 'base64');
    const decoded = UPNG.decode(buffer.buffer);
    const frames = UPNG.toRGBA8(decoded);
    const qrRgba = frames[0];
    return { rgba: qrRgba, width: decoded.width, height: decoded.height };
  }

  private pasteImage(dest: Uint8Array, destWidth: number, src: Uint8Array, srcWidth: number, srcHeight: number, destX: number, destY: number) {
    for (let row = 0; row < srcHeight; row++) {
      for (let col = 0; col < srcWidth; col++) {
        const srcIndex = (row * srcWidth + col) * 4;
        const destIndex = ((destY + row) * destWidth + destX + col) * 4;
        dest[destIndex] = src[srcIndex];
        dest[destIndex + 1] = src[srcIndex + 1];
        dest[destIndex + 2] = src[srcIndex + 2];
        dest[destIndex + 3] = src[srcIndex + 3];
      }
    }
  }

  private drawBarcode(rgba: Uint8Array, width: number, offsetX: number, offsetY: number, code: string, barcodeWidth: number, barcodeHeight: number) {
    const barWidth = Math.max(2, Math.floor(barcodeWidth / (code.length * 3)));
    let x = offsetX;

    for (const digit of code) {
      const value = parseInt(digit, 10);
      const barCount = (isNaN(value) ? 1 : value % 4) + 2;
      for (let i = 0; i < barCount; i++) {
        this.fillRect(rgba, width, x, offsetY, barWidth, barcodeHeight, 0, 0, 0, 255);
        x += barWidth;
        this.fillRect(rgba, width, x, offsetY, barWidth, barcodeHeight, 255, 255, 255, 255);
        x += barWidth;
      }
      x += barWidth;
      if (x + barWidth * 2 > offsetX + barcodeWidth) break;
    }

    const text = code;
    const normalizedText = this.normalizeTextLine(text);
    let textX = offsetX;
    let textY = offsetY + barcodeHeight + 12;
    for (const char of normalizedText) {
      this.drawChar(rgba, width, textX, textY, char, 2);
      textX += 6 * 2 + 1;
    }
  }

  private fillRect(rgba: Uint8Array, width: number, x: number, y: number, rectWidth: number, rectHeight: number, r: number, g: number, b: number, a: number) {
    for (let row = 0; row < rectHeight; row++) {
      for (let col = 0; col < rectWidth; col++) {
        const index = ((y + row) * width + x + col) * 4;
        rgba[index] = r;
        rgba[index + 1] = g;
        rgba[index + 2] = b;
        rgba[index + 3] = a;
      }
    }
  }

  private normalizeTextLine(line: string) {
    return line
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9 .,:\-\/\$]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  private drawChar(rgba: Uint8Array, width: number, offsetX: number, offsetY: number, char: string, scale: number) {
    const pattern = CHAR_PATTERN[char] || CHAR_PATTERN[" "];
    for (let col = 0; col < 5; col += 1) {
      const bits = pattern[col] || 0;
      for (let row = 0; row < 7; row += 1) {
        if ((bits >> row) & 1) {
          for (let sx = 0; sx < scale; sx += 1) {
            for (let sy = 0; sy < scale; sy += 1) {
              const x = offsetX + col * scale + sx;
              const y = offsetY + row * scale + sy;
              const index = (y * width + x) * 4;
              rgba[index] = 0;
              rgba[index + 1] = 0;
              rgba[index + 2] = 0;
              rgba[index + 3] = 255;
            }
          }
        }
      }
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

const CHAR_PATTERN: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0],
  "A": [0x0E, 0x11, 0x1F, 0x11, 0x11],
  "B": [0x1E, 0x11, 0x1E, 0x11, 0x1E],
  "C": [0x0E, 0x11, 0x10, 0x11, 0x0E],
  "D": [0x1E, 0x11, 0x11, 0x11, 0x1E],
  "E": [0x1F, 0x10, 0x1E, 0x10, 0x1F],
  "F": [0x1F, 0x10, 0x1E, 0x10, 0x10],
  "G": [0x0E, 0x10, 0x17, 0x11, 0x0F],
  "H": [0x11, 0x11, 0x1F, 0x11, 0x11],
  "I": [0x1F, 0x04, 0x04, 0x04, 0x1F],
  "J": [0x07, 0x02, 0x02, 0x12, 0x0C],
  "K": [0x11, 0x12, 0x1C, 0x12, 0x11],
  "L": [0x10, 0x10, 0x10, 0x10, 0x1F],
  "M": [0x11, 0x1B, 0x15, 0x11, 0x11],
  "N": [0x11, 0x19, 0x15, 0x13, 0x11],
  "O": [0x0E, 0x11, 0x11, 0x11, 0x0E],
  "P": [0x1E, 0x11, 0x1E, 0x10, 0x10],
  "Q": [0x0E, 0x11, 0x11, 0x1D, 0x0F],
  "R": [0x1E, 0x11, 0x1E, 0x12, 0x11],
  "S": [0x0F, 0x10, 0x0E, 0x01, 0x1E],
  "T": [0x1F, 0x04, 0x04, 0x04, 0x04],
  "U": [0x11, 0x11, 0x11, 0x11, 0x0E],
  "V": [0x11, 0x11, 0x11, 0x0A, 0x04],
  "W": [0x11, 0x11, 0x15, 0x1B, 0x11],
  "X": [0x11, 0x0A, 0x04, 0x0A, 0x11],
  "Y": [0x11, 0x11, 0x0A, 0x04, 0x04],
  "Z": [0x1F, 0x02, 0x04, 0x08, 0x1F],
  "0": [0x0E, 0x11, 0x13, 0x15, 0x0E],
  "1": [0x04, 0x0C, 0x04, 0x04, 0x0E],
  "2": [0x0E, 0x11, 0x06, 0x08, 0x1F],
  "3": [0x1F, 0x02, 0x0E, 0x01, 0x1E],
  "4": [0x12, 0x12, 0x12, 0x1F, 0x02],
  "5": [0x1F, 0x10, 0x1E, 0x01, 0x1E],
  "6": [0x0E, 0x10, 0x1E, 0x11, 0x0E],
  "7": [0x1F, 0x01, 0x02, 0x04, 0x08],
  "8": [0x0E, 0x11, 0x0E, 0x11, 0x0E],
  "9": [0x0E, 0x11, 0x0F, 0x01, 0x0E],
  ":": [0x00, 0x04, 0x00, 0x04, 0x00],
  ".": [0x00, 0x00, 0x00, 0x00, 0x04],
  "-": [0x00, 0x00, 0x1F, 0x00, 0x00],
  "/": [0x00, 0x01, 0x02, 0x04, 0x08],
  "$": [0x04, 0x1F, 0x14, 0x1E, 0x04],
  ",": [0x00, 0x00, 0x00, 0x04, 0x08],
};

export default NFService;