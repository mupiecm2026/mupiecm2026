import React from "react";
import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import QRCode from "qrcode";
import bwipjs from "bwip-js/generic";
import NFTemplate from "./nf-template";
import { NFData } from "./nf-service";
import font from '../../../../public/fonts/Inter-Regular.ttf';

let fontDataPromise: Promise<ArrayBuffer> | null = null;
let wasmInitialized = false;

async function initializeWasm() {
  if (wasmInitialized) return;
  try {
    // Carrega via fetch de CDN (funciona em Node.js e Edge Runtime)
    const response = await fetch(
      "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm"
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao buscar WASM do CDN`);
    }
    await initWasm(response);
    wasmInitialized = true;
  } catch (err) {
    throw new Error(
      `Falha ao inicializar WASM resvg: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function loadFont() {
  if (!fontDataPromise) {
    const fontUrl = new URL(font, import.meta.url);
    fontDataPromise = fetch(fontUrl).then(async (res) => {
      if (!res.ok) {
        throw new Error(`Falha ao carregar fonte Inter: ${res.status}`);
      }
      return res.arrayBuffer();
    });
  }
  return fontDataPromise;
}

function encodeBase64(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf-8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(value)));
}

export async function generateNFPNG(nf: NFData): Promise<Uint8Array> {
  // Garantir que o WASM está inicializado
  await initializeWasm();

  // 1. Validação estrita baseada na sua Interface NFData
  if (!nf || !nf.barcode || !nf.id || !nf.items) {
    throw new Error("Dados da NF incompletos para geração de imagem");
  }

  // Geração de assets visuais
  const qrDataUrl = await QRCode.toDataURL(String(nf.id), {
    margin: 1,
    width: 300,
  });

  const barcodeSvg = bwipjs.toSVG({
    bcid: "code128",
    text: String(nf.barcode),
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: "center",
    backgroundcolor: "FFFFFF",
  });

  const barcodeDataUrl = `data:image/svg+xml;base64,${encodeBase64(barcodeSvg)}`;
  const fontData = await loadFont();

  // 2. Chamada ao Satori com o template atualizado
  const svg = await satori(
    <NFTemplate
      nf={nf}
      qrDataUrl={qrDataUrl}
      barcodeDataUrl={barcodeDataUrl}
    />,
    {
      width: 1100,
      height: 1600, // Altura A4 proporcional
      fonts: [
        {
          name: "Inter",
          data: fontData,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );

  // 3. Conversão de SVG para PNG usando @resvg/resvg-wasm (edge-compatible)
  const resvg = new Resvg(svg, {
    background: "#ffffff",
  });

  const pngData = resvg.render();
  return pngData.asPng();
}