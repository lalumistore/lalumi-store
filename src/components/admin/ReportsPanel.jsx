import React, { useEffect, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { supabase } from "../../supabaseClient.js";
import { BRAND, formatPrice, formatDate, productStock } from "../../lib/helpers.js";
import ExportButtons from "./ExportButtons.jsx";

const REPORT_TABS = [
  { id: "vendidos", label: "Mais vendidos" },
  { id: "zerados", label: "Zerados" },
  { id: "pedidos", label: "Pedidos" },
];

export default function ReportsPanel({ products, onBack }) {
  const [tab, setTab] = useState("vendidos");
  return (
    <section className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-bold mb-3 no-print" style={{ color: BRAND.tealDark }}>
        <ArrowLeft size={16} /> Voltar
      </button>
      <div className="font-bold text-xl mb-1" style={{ color: BRAND.tealDark, fontFamily: "'Baloo 2', sans-serif" }}>Relatórios</div>
      <p className="text-sm opacity-60 mb-4">Uma visão rápida do desempenho do catálogo.</p>

      <div className="flex gap-2 flex-wrap mb-5 no-print">
        {REPORT_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-full px-4 py-2 font-bold text-sm"
            style={{ background: tab === t.id ? BRAND.teal : "#fff", color: tab === t.id ? "#fff" : BRAND.ink, border: "2px solid #EFEADC" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "vendidos" && <BestSellersReport products={products} />}
      {tab === "zerados" && <ZeroStockReport products={products} />}
      {tab === "pedidos" && <OrdersReport />}
    </section>
  );
}

function BestSellersReport({ products }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("order_items").select("product_id, quantity, product_name");
      const totals = {};
      (data || []).forEach((i) => { totals[i.product_id] = (totals[i.product_id] || 0) + i.quantity; });
      const list = products
        .map((p) => ({ product: p, sold: totals[p.id] || 0 }))
        .filter((r) => r.sold > 0)
        .sort((a, b) => b.sold - a.sold);
      setRows(list);
    })();
  }, [products]);

  if (rows === null) return <p className="text-sm opacity-50">Carregando...</p>;
  if (rows.length === 0) return <p className="text-sm opacity-50">Nenhuma venda registrada ainda.</p>;

  return (
    <div>
      <ExportButtons
        rows={rows}
        filename="mais-vendidos"
        title="Produtos mais vendidos"
        columns={[
          { label: "Posição", value: (r, i) => i + 1 },
          { label: "Código", value: (r) => r.product.code },
          { label: "Produto", value: (r) => r.product.name },
          { label: "Vendidos", value: (r) => r.sold },
          { label: "Estoque atual", value: (r) => productStock(r.product) },
        ]}
      />
      <div id="print-area" className="flex flex-col gap-2">
        {rows.map((r, idx) => (
          <div key={r.product.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
            <span className="font-bold text-sm w-6 text-center flex-shrink-0" style={{ color: BRAND.tealDark }}>{idx + 1}º</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{r.product.code} — {r.product.name}</div>
              <div className="text-xs opacity-50">Estoque atual: {productStock(r.product)}</div>
            </div>
            <div className="font-bold flex-shrink-0" style={{ color: BRAND.pink }}>{r.sold} vendidos</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ZeroStockReport({ products }) {
  const rows = products.filter((p) => productStock(p) <= 0);
  if (rows.length === 0) return <p className="text-sm opacity-50">Nenhum produto zerado no momento. 🎉</p>;
  return (
    <div>
      <ExportButtons
        rows={rows}
        filename="produtos-zerados"
        title="Produtos zerados"
        columns={[
          { label: "Código", value: (p) => p.code },
          { label: "Produto", value: (p) => p.name },
          { label: "Categoria", value: (p) => p.category },
          { label: "Tipo", value: (p) => p.sub },
        ]}
      />
      <div id="print-area" className="flex flex-col gap-2">
        {rows.map((p) => (
          <div key={p.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: "#fff", border: "2px solid #F5D0CB" }}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{p.code} — {p.name}</div>
              <div className="text-xs opacity-50">{p.category}{p.sub ? ` · ${p.sub}` : ""}</div>
            </div>
            <span className="rounded-full px-3 py-1 text-xs font-bold flex-shrink-0" style={{ background: "#FCE8E6", color: "#B23A2F" }}>Esgotado</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersReport() {
  const [orders, setOrders] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
      setOrders(data || []);
    })();
  }, []);

  if (orders === null) return <p className="text-sm opacity-50">Carregando...</p>;

  const filtered = search.trim()
    ? orders.filter((o) => o.customer_name.toLowerCase().includes(search.trim().toLowerCase()) || o.id.toLowerCase().includes(search.trim().toLowerCase()))
    : orders;

  const total = (o) => (o.order_items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 rounded-full px-4 py-2 max-w-sm no-print" style={{ border: "2px solid #EFEADC" }}>
        <Search size={15} className="opacity-40 flex-shrink-0" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente ou número do pedido..." className="w-full outline-none text-sm" />
      </div>
      <ExportButtons
        rows={filtered}
        filename="pedidos"
        title="Pedidos da loja"
        columns={[
          { label: "Pedido", value: (o) => o.id.slice(0, 8) },
          { label: "Data", value: (o) => new Date(o.created_at).toLocaleDateString("pt-BR") },
          { label: "Cliente", value: (o) => o.customer_name },
          { label: "Produtos", value: (o) => o.order_items.map((i) => `${i.quantity}x ${i.product_name} (${i.size})`).join(", ") },
          { label: "Valor", value: (o) => formatPrice(total(o)) },
          { label: "Status", value: (o) => o.status },
        ]}
      />
      <div id="print-area" className="flex flex-col gap-2">
        {filtered.length === 0 && <p className="text-sm opacity-50">Nenhum pedido encontrado.</p>}
        {filtered.map((o) => (
          <div key={o.id} className="rounded-2xl p-3" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold">#{o.id.slice(0, 8)} · {o.customer_name}</div>
                <div className="text-xs opacity-50">{new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.status}</div>
              </div>
              <div className="font-bold flex-shrink-0" style={{ color: BRAND.tealDark }}>{formatPrice(total(o))}</div>
            </div>
            <div className="mt-2 pt-2 flex flex-col gap-0.5" style={{ borderTop: "1px solid #F2EEE1" }}>
              {o.order_items.map((i) => (
                <div key={i.id} className="text-xs opacity-70 flex justify-between">
                  <span>{i.quantity}x {i.product_name} (Tam. {i.size})</span>
                  <span>{formatPrice(i.quantity * i.unit_price)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
