// Netlify Function — cria o pagamento no Mercado Pago usando o Access
// Token secreto (nunca exposto ao navegador). Chamada pelo Payment Brick
// no momento em que o cliente confirma o pagamento.
import { MercadoPagoConfig, Payment } from "mercadopago";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  if (!process.env.MP_ACCESS_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "MP_ACCESS_TOKEN não configurado no Netlify." }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { formData, orderId, description } = body;
    if (!formData || !orderId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Dados incompletos." }) };
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    const siteUrl = process.env.URL || "";
    const result = await payment.create({
      body: {
        ...formData,
        description: description || "Pedido Lalumi Store",
        external_reference: orderId,
        notification_url: `${siteUrl}/.netlify/functions/mercadopago-webhook`,
      },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
      }),
    };
  } catch (err) {
    console.error("create-payment error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Erro ao criar pagamento." }) };
  }
};
