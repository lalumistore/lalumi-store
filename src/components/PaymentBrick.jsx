import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { BRAND } from "../lib/helpers.js";

const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY;
const SDK_URL = "https://sdk.mercadopago.com/js/v2";

function loadMercadoPagoSdk() {
  return new Promise((resolve, reject) => {
    if (window.MercadoPago) return resolve(window.MercadoPago);
    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.MercadoPago));
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.onload = () => resolve(window.MercadoPago);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function PaymentBrick({ amount, payerEmail, orderId, onResult }) {
  const containerRef = useRef(null);
  const brickRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!MP_PUBLIC_KEY) {
      setError("O pagamento online ainda não foi configurado (falta a chave pública do Mercado Pago).");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const MercadoPago = await loadMercadoPagoSdk();
        if (cancelled) return;
        const mp = new MercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

        brickRef.current = await bricksBuilder.create("payment", "mp-payment-brick-container", {
          initialization: {
            amount,
            payer: { email: payerEmail || undefined },
          },
          customization: {
            paymentMethods: {
              creditCard: "all",
              debitCard: "all",
              bankTransfer: "all", // Pix
              ticket: "all", // Boleto
            },
          },
          callbacks: {
            onReady: () => setLoading(false),
            onSubmit: ({ formData }) =>
              new Promise((resolve, reject) => {
                fetch("/.netlify/functions/create-payment", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ formData, orderId, description: "Pedido Lalumi Store" }),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.error) {
                      onResult({ ok: false, message: data.error });
                      reject();
                      return;
                    }
                    onResult({ ok: true, status: data.status, statusDetail: data.status_detail, paymentId: data.id });
                    resolve();
                  })
                  .catch((err) => {
                    onResult({ ok: false, message: err.message });
                    reject();
                  });
              }),
            onError: (err) => {
              console.error("Payment Brick error:", err);
              setError("Não consegui carregar o formulário de pagamento. Recarregue a página e tente de novo.");
            },
          },
        });
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Não consegui carregar o pagamento online.");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (brickRef.current) brickRef.current.unmount();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, payerEmail, orderId]);

  if (error) {
    return <div className="text-sm font-bold rounded-xl px-4 py-3" style={{ background: "#FCE8E6", color: "#B23A2F" }}>{error}</div>;
  }

  return (
    <div>
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 opacity-60">
          <Loader2 className="animate-spin" size={18} /> Carregando pagamento...
        </div>
      )}
      <div id="mp-payment-brick-container" />
    </div>
  );
}
