import React, { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { BRAND, formatPrice } from "../lib/helpers.js";

const STATUS_LABEL = {
  pendente: "Pedido recebido",
  confirmado: "Confirmado",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

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
        {orders?.map((o) => (
          <div key={o.id} className="rounded-2xl p-4" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: BRAND.tealDark }}>Pedido #{o.order_number}</span>
              <span className="text-xs font-bold rounded-full px-3 py-1" style={{ background: "#E5F7F7", color: BRAND.tealDark }}>
                {STATUS_LABEL[o.status] || o.status}
              </span>
            </div>
            <div className="text-xs opacity-50 -mt-1">{new Date(o.created_at).toLocaleDateString("pt-BR")}</div>
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
        ))}
      </div>
    </section>
  );
}
