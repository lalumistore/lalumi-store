// Netlify Function — recebe o aviso do Mercado Pago quando o status de um
// pagamento muda (aprovado, recusado, etc.) e atualiza o pedido no Supabase.
// Essa é a fonte confiável de verdade sobre o pagamento — não depende do
// cliente voltar pro site.
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createClient } from "@supabase/supabase-js";

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};
    const paymentId = body?.data?.id || params.id || params["data.id"];
    const topic = body?.type || params.type || params.topic;

    // O Mercado Pago manda vários tipos de notificação; só nos importamos com pagamentos.
    if (topic !== "payment" || !paymentId) {
      return { statusCode: 200, body: "ignorado" };
    }

    if (!process.env.MP_ACCESS_TOKEN || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VITE_SUPABASE_URL) {
      console.error("Variáveis de ambiente faltando no webhook do Mercado Pago.");
      return { statusCode: 500, body: "config faltando" };
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);
    const info = await payment.get({ id: paymentId });

    const orderId = info.external_reference;
    if (!orderId) return { statusCode: 200, body: "sem pedido associado" };

    // Usa a chave service_role — só existe aqui no servidor, nunca no navegador —
    // pra poder atualizar o pedido mesmo sem ser o dono dele (é o sistema
    // confirmando o pagamento, não o cliente).
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Busca o pedido atual pra saber se essa aprovação já tinha sido
    // processada antes (o Mercado Pago pode reenviar o mesmo aviso mais
    // de uma vez) — evita descontar o estoque duas vezes. Também usamos
    // o status atual pra nunca "voltar" um pedido que o master já
    // avançou manualmente (ex: já marcado como enviado).
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("status, payment_status")
      .eq("id", orderId)
      .single();
    if (fetchError) {
      console.error("Erro ao buscar pedido:", fetchError);
      return { statusCode: 500, body: "pedido não encontrado" };
    }
    const alreadyApproved = currentOrder.payment_status === "approved";

    let newStatus = currentOrder.status;
    if (currentOrder.status === "aguardando_pagamento") {
      if (info.status === "approved") newStatus = "pagamento_confirmado";
      else if (["rejected", "cancelled"].includes(info.status)) newStatus = "cancelado";
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus, payment_id: String(paymentId), payment_status: info.status })
      .eq("id", orderId);

    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      return { statusCode: 500, body: "erro ao atualizar pedido" };
    }

    // Só agora, com o pagamento realmente aprovado (e só na primeira vez),
    // é que o estoque é debitado e a saída entra na auditoria.
    if (info.status === "approved" && !alreadyApproved) {
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, product_name, size, quantity")
        .eq("order_id", orderId);

      if (itemsError) {
        console.error("Erro ao buscar itens do pedido:", itemsError);
      } else {
        const failures = [];
        for (const item of items) {
          const { error: stockError } = await supabase.rpc("decrement_stock", {
            p_product_id: item.product_id,
            p_size: item.size,
            p_qty: item.quantity,
            p_order_id: orderId,
          });
          if (stockError) {
            console.error(`Erro ao debitar estoque do produto ${item.product_id}:`, stockError);
            failures.push(`${item.product_name} (Tam. ${item.size})`);
          }
        }
        // Pagamento foi aprovado (dinheiro recebido) mas o estoque não
        // pôde ser debitado pra algum item — provavelmente esgotou entre
        // o momento da compra e a confirmação. Fica marcado pra você
        // resolver manualmente (reembolso, aviso ao cliente, ou reposição).
        if (failures.length > 0) {
          await supabase
            .from("orders")
            .update({
              stock_issue: true,
              stock_issue_note: `Estoque insuficiente ao confirmar o pagamento: ${failures.join(", ")}.`,
            })
            .eq("id", orderId);
        }
      }
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("mercadopago-webhook error:", err);
    return { statusCode: 500, body: "erro" };
  }
};
