import React, { useEffect, useState } from "react";
import { Package, Check } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { BRAND, formatPrice, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, ORDER_PROGRESS_STEPS } from "../lib/helpers.js";

function OrderProgress({ status }) {
  if (status === "cancelado") {
    return (
      <div className="text-xs font-bold rounded-lg px-3 py-2 mt-2" style={{ background: "#FCE8E6", color: "#B23A2F" }}>
        Este pedido foi cancelado.
      </div>
    );
  }
  if (status === "aguardando_pagamento") return null; // ainda não vale a pena mostrar a linha do tempo

  const currentIndex = ORDER_PROGRESS_STEPS.indexOf(status);

  return (
    <div className="flex items-center mt-3 mb-1">
      {ORDER_PROGRESS_STEPS.map((step, idx) => {
        const done = idx <= currentIndex;
        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center" style={{ width: 60 }}>
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{ width: 20, height: 20, background: done ? BRAND.teal : "#EFEADC" }}
              >
                {done && <Check size={12} color="#fff" />}
              </div>
              <span className="text-[10px] font-bold text-center mt-1 leading-tight" style={{ color: done ? BRAND.tealDark : "#B0AA98" }}>
                {ORDER_STATUS_LABEL[step].replace("Produto ", "").replace("Pagamento ", "")}
              </span>
            </div>
            {idx < ORDER_PROGRESS_STEPS.length - 1 && (
              <div className="flex-1" style={{ height: 2, background: idx < currentIndex ? BRAND.teal : "#EFEADC", marginBottom: 14 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function OrderHistory({ userId }) {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      else setOrders(data);
    })();
  }, [userId]);

  return (
    <section className="max-w-3xl mx-auto px-5 py-8">
      <h2 className="font-bold text-xl mb-4" style={{ color: BRAND.tealDark }}>Meus pedidos</h2>

      {error && <p className="text-sm font-bold" style={{ color: "#B23A2F" }}>Erro ao carregar: {error}</p>}
      {orders === null && !error && <p className="text-sm opacity-50">Carregando...</p>}
      {orders && orders.length === 0 && (
        <div className="text-center py-16 rounded-3xl" style={{ background: "#fff", border: "2px dashed #E3DED0" }}>
          <Package size={28} className="mx-auto opacity-30" />
          <p className="font-bold mt-2" style={{ color: BRAND.tealDark }}>Você ainda não fez nenhum pedido</p>
          <p className="text-sm opacity-60 mt-1">Quando comprar algo na loja, ele aparece aqui.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {orders?.map((o) => {
          const color = ORDER_STATUS_COLOR[o.status] || { bg: "#F2EEE1", text: "#6B7A7A" };
          return (
            <div key={o.id} className="rounded-2xl p-4" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: BRAND.tealDark }}>Pedido #{o.order_number}</span>
                <span className="text-xs font-bold rounded-full px-3 py-1" style={{ background: color.bg, color: color.text }}>
                  {ORDER_STATUS_LABEL[o.status] || o.status}
                </span>
              </div>
              <div className="text-xs opacity-50 -mt-1">{new Date(o.created_at).toLocaleDateString("pt-BR")}</div>

              <OrderProgress status={o.status} />

              <div className="mt-2 flex flex-col gap-1">
                {o.order_items.map((item) => (
                  <div key={item.id} className="text-sm flex justify-between">
                    <span>{item.quantity}x {item.product_name} (Tam. {item.size})</span>
                    <span className="font-bold">{formatPrice(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 pt-2" style={{ borderTop: "1px solid #EFEADC" }}>
                <span className="text-sm font-bold">Total</span>
                <span className="font-bold" style={{ color: BRAND.tealDark }}>{formatPrice(o.total)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
