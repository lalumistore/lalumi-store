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

    let status = "pendente";
    if (info.status === "approved") status = "confirmado";
    else if (["rejected", "cancelled"].includes(info.status)) status = "cancelado";

    // Usa a chave service_role — só existe aqui no servidor, nunca no navegador —
    // pra poder atualizar o pedido mesmo sem ser o dono dele (é o sistema
    // confirmando o pagamento, não o cliente).
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from("orders")
      .update({ status, payment_id: String(paymentId), payment_status: info.status })
      .eq("id", orderId);

    if (error) {
      console.error("Erro ao atualizar pedido:", error);
      return { statusCode: 500, body: "erro ao atualizar pedido" };
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("mercadopago-webhook error:", err);
    return { statusCode: 500, body: "erro" };
  }
};
