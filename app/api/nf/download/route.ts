import { NextRequest, NextResponse } from "next/server";
import NFService from "../../../../lib/services/nf-service";

function getEnv(): any {
  const env =
    (globalThis as any).__ENV__ ||
    (globalThis as any).env ||
    (globalThis as any).process?.env ||
    null;
  return env;
}

export async function GET(request: NextRequest) {
  try {
    const env = getEnv();
    const nfService = new NFService(env);
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "pdf"; // pdf, png, txt
    const nfId = searchParams.get("id");

    if (!nfId) {
      return NextResponse.json({ error: "ID da NF é obrigatório" }, { status: 400 });
    }

    // Buscar NF
    const nf = await nfService.getNF(nfId);
    if (!nf) {
      return NextResponse.json({ error: "NF não encontrada" }, { status: 404 });
    }

    // Gerar arquivo baseado no formato
    if (format === "pdf") {
      const pdfBuffer = await nfService.generateNFPDF(nf);

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="NF-${nf.id}.pdf"`,
        },
      });
    } else if (format === "png") {
      const pngBuffer = await nfService.generateNFPNG(nf);

      return new NextResponse(new Uint8Array(pngBuffer), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="NF-${nf.id}.png"`,
        },
      });
    } else if (format === "txt") {
      const txtContent = nfService.generateNFTXT(nf);

      return new NextResponse(txtContent, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="NF-${nf.id}.txt"`,
        },
      });
    } else {
      return NextResponse.json({ error: "Formato não suportado" }, { status: 400 });
    }

  } catch (error: any) {
    console.error("Erro ao gerar NF:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}