import React from "react";

export default function NFTemplate({ nf, qrDataUrl, barcodeDataUrl }: any) {
  const formatCurrency = (value: number) =>
    `R$ ${Number(value).toFixed(2).replace(".", ",")}`;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "1100px",
      height: "1600px",
      backgroundColor: "#ffffff",
      padding: "40px",
      fontFamily: "Inter",
      color: "#1a1a1a",
    }}>
      {/* CABEÇALHO */}
      <div style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        borderBottom: "2px solid #333",
        paddingBottom: "20px",
        marginBottom: "20px",
      }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "32px", fontWeight: 700 }}>{nf.issuer.name}</div>
          <div style={{ display: "flex", fontSize: "14px", color: "#444" }}>CNPJ: {nf.issuer.cnpj}</div>
          <div style={{ display: "flex", fontSize: "14px", color: "#444" }}>{nf.issuer.address}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: "18px", fontWeight: 600 }}>NOTA FISCAL ELETRÔNICA</div>
          <div style={{ display: "flex", fontSize: "14px" }}>{nf.date} {nf.time}</div>
          <div style={{ display: "flex", fontSize: "12px", color: "#666" }}>ID: {nf.id}</div>
        </div>
      </div>

      {/* DESTINATÁRIO E PAGAMENTO */}
      <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: "30px" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", fontSize: "12px", fontWeight: 700, color: "#888" }}>DESTINATÁRIO</div>
          <div style={{ display: "flex", fontSize: "16px", fontWeight: 600 }}>{nf.customer.name}</div>
          <div style={{ display: "flex", fontSize: "14px" }}>CPF: {nf.customer.cpf}</div>
          <div style={{ display: "flex", fontSize: "14px" }}>{nf.customer.email}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: "12px", fontWeight: 700, color: "#888" }}>PAGAMENTO</div>
          <div style={{ display: "flex", fontSize: "14px" }}>Método: {nf.payment.gateway.toUpperCase()}</div>
          <div style={{ display: "flex", fontSize: "14px" }}>Pedido: {nf.orderId}</div>
        </div>
      </div>

      {/* TABELA DE ITENS */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ 
          display: "flex", 
          flexDirection: "row",
          backgroundColor: "#f4f4f4", 
          padding: "10px", 
          borderBottom: "1px solid #ddd" 
        }}>
          <div style={{ display: "flex", flex: 4, fontWeight: 700, fontSize: "14px" }}>PRODUTO</div>
          <div style={{ display: "flex", flex: 1, fontWeight: 700, fontSize: "14px", justifyContent: "center" }}>QTD</div>
          <div style={{ display: "flex", flex: 2, fontWeight: 700, fontSize: "14px", justifyContent: "flex-end" }}>UNIT</div>
          <div style={{ display: "flex", flex: 2, fontWeight: 700, fontSize: "14px", justifyContent: "flex-end" }}>TOTAL</div>
        </div>

        {nf.items.map((item: any, i: number) => (
          <div key={i} style={{ 
            display: "flex", 
            flexDirection: "row",
            padding: "10px", 
            borderBottom: "1px solid #eee",
            alignItems: "center" 
          }}>
            <div style={{ display: "flex", flex: 4, fontSize: "14px" }}>{item.title}</div>
            <div style={{ display: "flex", flex: 1, fontSize: "14px", justifyContent: "center" }}>{item.quantity}</div>
            <div style={{ display: "flex", flex: 2, fontSize: "14px", justifyContent: "flex-end" }}>{formatCurrency(item.unitPrice)}</div>
            <div style={{ display: "flex", flex: 2, fontSize: "14px", fontWeight: 600, justifyContent: "flex-end" }}>{formatCurrency(item.total)}</div>
          </div>
        ))}
      </div>

      {/* RESUMO TOTAL */}
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "flex-end", 
        marginTop: "20px", 
        paddingTop: "10px",
        borderTop: "2px solid #333" 
      }}>
        <div style={{ display: "flex", fontSize: "28px", fontWeight: 800 }}>
          TOTAL: {formatCurrency(nf.total)}
        </div>
      </div>

      {/* RODAPÉ COM BARCODE E QR CODE */}
      <div style={{ 
        display: "flex", 
        flexDirection: "row",
        marginTop: "auto", 
        justifyContent: "space-between", 
        alignItems: "flex-end",
        borderTop: "1px dashed #ccc",
        paddingTop: "30px"
      }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "10px", color: "#888", marginBottom: "5px" }}>CÓDIGO DE BARRAS / CHAVE DE ACESSO</div>
          {/* Satori exige largura/altura explícita para imagens */}
          <img src={barcodeDataUrl} style={{ display: "flex", width: "450px", height: "80px" }} />
          <div style={{ display: "flex", fontSize: "12px", marginTop: "8px", letterSpacing: "2px" }}>{nf.barcode}</div>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src={qrDataUrl} style={{ display: "flex", width: "150px", height: "150px" }} />
          <div style={{ display: "flex", fontSize: "10px", color: "#666", marginTop: "8px" }}>AUTENTICAÇÃO DO SISTEMA</div>
        </div>
      </div>
    </div>
  );
}