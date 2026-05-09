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
    const limit = parseInt(searchParams.get("limit") || "50");

    const nfs = await nfService.listNFs(limit);

    // Transformar para o formato esperado pelo dashboard
    const transformedNfs = nfs.map(nf => ({
      id: nf.id,
      orderId: nf.orderId,
      date: nf.date,
      time: nf.time,
      total: nf.total
    }));

    return NextResponse.json(transformedNfs);

  } catch (error: any) {
    console.error("Erro ao listar NFs:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}