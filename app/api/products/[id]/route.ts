import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID do produto é obrigatório" }, { status: 400 });
    }

    // Buscar produto da API externa
    const productsUrl = process.env.NEXT_PUBLIC_PRODUCTS_URL;
    if (!productsUrl) {
      return NextResponse.json({ error: "URL dos produtos não configurada" }, { status: 500 });
    }

    // Para dummyjson, buscar produto individual
    const productUrl = `${productsUrl}/products/${id}`;
    const response = await fetch(productUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Erro ao buscar produto" }, { status: 500 });
    }

    const product: any = await response.json();

    // Transformar dados para o formato esperado
    const supportsSizes = /clo|fashion|shoe|apparel|shirt|dress/i.test(String(product.category));
    const transformedProduct = {
      id: product.id,
      title: product.title,
      price: product.price,
      description: product.description,
      images: product.images || [product.thumbnail],
      thumbnail: product.thumbnail,
      category: product.category,
      brand: product.brand,
      rating: product.rating,
      stock: product.stock,
      sku: `MP-${product.id.toString().padStart(3, '0')}`,
      sizes: supportsSizes ? ["P", "M", "G", "GG"] : [],
      characteristics: `Marca: ${product.brand}\nCategoria: ${product.category}\nAvaliação: ${product.rating}/5\nEstoque: ${product.stock} unidades`,
      raw: product
    };

    return NextResponse.json({ product: transformedProduct });

  } catch (error: any) {
    console.error("Erro ao buscar produto:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}