import React, { useEffect, useState } from "react";
import { ArrowLeft, ImagePlus, X, Search, Trash2, Pencil, PackagePlus } from "lucide-react";
import { supabase } from "../../supabaseClient.js";
import {
  BRAND, BASE_CATEGORY_ICONS, formatPrice, formatDate, todayISO, toNumber,
  productStock, productSizes, compressImage, promotionStatus,
} from "../../lib/helpers.js";
import { Field, Pill, ProductThumb } from "../Shared.jsx";
import ExportButtons from "./ExportButtons.jsx";

const INVENTORY_TABS = [
  { id: "cadastro", label: "Cadastro de produto" },
  { id: "entrada", label: "Entrada de produto" },
  { id: "produtos", label: "Produtos" },
  { id: "auditoria", label: "Auditoria" },
  { id: "ofertas", label: "Ofertas" },
];

export default function InventoryPanel({ products, categories, promotions, refreshProducts, refreshPromotions, onBack }) {
  const [tab, setTab] = useState("cadastro");
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(true);

  const refreshMovements = async () => {
    setLoadingMovements(true);
    const { data } = await supabase.from("stock_movements").select("*").order("movement_date", { ascending: false });
    setMovements(data || []);
    setLoadingMovements(false);
  };
  useEffect(() => { refreshMovements(); }, []);

  const totalInStock = products.reduce((sum, p) => sum + productStock(p), 0);
  const zeroCount = products.filter((p) => productStock(p) <= 0).length;
  const entriesCount = movements.filter((m) => m.type === "entrada").length;
  const exitsCount = movements.filter((m) => m.type === "saida").length;

  return (
    <section className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-bold mb-3 no-print" style={{ color: BRAND.tealDark }}>
        <ArrowLeft size={16} /> Voltar
      </button>
      <div className="font-bold text-xl mb-1" style={{ color: BRAND.tealDark, fontFamily: "'Baloo 2', sans-serif" }}>Controle de estoque</div>
      <p className="text-sm opacity-60 mb-4">Cadastro de produtos novos, entrada por nota fiscal, e relatórios pra auditoria.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 no-print">
        {[
          { label: "Peças em estoque", value: totalInStock, color: BRAND.tealDark },
          { label: "Produtos zerados", value: zeroCount, color: zeroCount > 0 ? "#B23A2F" : BRAND.green },
          { label: "Entradas registradas", value: entriesCount, color: BRAND.green },
          { label: "Saídas registradas", value: exitsCount, color: BRAND.pink },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl p-3" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
            <div className="text-xs font-bold opacity-50">{c.label}</div>
            <div className="text-xl font-bold mt-1" style={{ color: c.color, fontFamily: "'Baloo 2', sans-serif" }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-5 no-print">
        {INVENTORY_TABS.map((t) => (
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

      {tab === "cadastro" && <ProductEditorForm mode="create" categories={categories} onDone={refreshProducts} />}
      {tab === "entrada" && <NewStockEntryForm products={products} onDone={() => { refreshProducts(); refreshMovements(); }} />}
      {tab === "produtos" && (
        <ProductsInventoryList products={products} categories={categories} onRefresh={refreshProducts} />
      )}
      {tab === "auditoria" && <AuditTrail products={products} movements={movements} loading={loadingMovements} />}
      {tab === "ofertas" && (
        <OffersManager products={products} promotions={promotions} onDone={refreshPromotions} />
      )}
    </section>
  );
}

const emptyProductForm = { code: "", category: "", categoryCustom: "", sub: "", subCustom: "", name: "", images: [], price: "", date: todayISO() };

// Formulário compartilhado — cadastro de produto novo e edição de existente.
function ProductEditorForm({ mode, initial, categories, onDone, onCancel }) {
  const [form, setForm] = useState(initial || emptyProductForm);
  const [imgError, setImgError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedCategory = categories.find((c) => c.name === (form.category || form.categoryCustom));
  const subOptions = selectedCategory ? selectedCategory.subcategories : [];

  const handleUpload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setImgError("");
    try {
      const compressed = await Promise.all(files.map((f) => compressImage(f)));
      setForm((f) => ({ ...f, images: [...f.images, ...compressed] }));
    } catch {
      setImgError("Não consegui processar uma das imagens. Tente outra foto.");
    }
  };
  const removeImage = (idx) => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  const ensureCategoryAndSub = async (categoryName, subName) => {
    if (!categoryName) return;
    const existing = categories.find((c) => c.name === categoryName);
    if (!existing) {
      await supabase.from("categories").insert({ name: categoryName, subcategories: subName ? [subName] : [], sizes: [] });
    } else if (subName && !existing.subcategories.includes(subName)) {
      await supabase.from("categories").update({ subcategories: [...existing.subcategories, subName] }).eq("id", existing.id);
    }
  };

  const submit = async () => {
    if (!form.code.trim()) return setError("Informe o código do produto.");
    if (!form.name.trim()) return setError("Informe a descrição do produto.");
    const finalCategory = (form.categoryCustom || form.category || "").trim();
    if (!finalCategory) return setError("Escolha ou digite uma categoria.");
    setError("");
    setSaving(true);
    const finalSub = (form.subCustom || form.sub || "").trim();
    await ensureCategoryAndSub(finalCategory, finalSub);

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      category: finalCategory,
      sub: finalSub,
      images: form.images,
      price: toNumber(form.price) || 0,
    };

    const query = mode === "edit"
      ? supabase.from("products").update(payload).eq("id", form.id)
      : supabase.from("products").insert({ ...payload, size_stock: {} });

    const { error: err } = await query;
    setSaving(false);
    if (err) return setError(`Não consegui salvar: ${err.message}`);
    onDone();

    if (mode === "create") {
      setSuccess("Produto cadastrado! Agora é só ir em \"Entrada de produto\" pra dar entrada na quantidade e no tamanho.");
      setForm(emptyProductForm);
      setTimeout(() => setSuccess(""), 4500);
    } else if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="rounded-2xl p-4 max-w-md" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
      {mode === "create" && (
        <>
          <div className="font-bold mb-1" style={{ color: BRAND.tealDark }}>Cadastrar produto novo</div>
          <p className="text-xs opacity-60 mb-3">Para peças que ainda não existem no catálogo. A quantidade e o tamanho são adicionados depois, em "Entrada de produto".</p>
        </>
      )}
      {success && <div className="text-xs font-bold rounded-lg px-3 py-2 mb-3" style={{ background: "#E9F5DD", color: "#5C7A2B" }}>{success}</div>}
      <div className="flex flex-col gap-3">
        <Field label="Código">
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Ex: MEN-004" className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
        </Field>

        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Categoria">
              <select
                value={categories.some((c) => c.name === form.category) ? form.category : ""}
                onChange={(e) => setForm({ ...form, category: e.target.value, categoryCustom: "", sub: "", subCustom: "" })}
                className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm bg-white"
                style={{ border: "2px solid #EFEADC" }}
              >
                <option value="">Selecione...</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input
                value={form.categoryCustom}
                onChange={(e) => setForm({ ...form, categoryCustom: e.target.value, category: "" })}
                placeholder="ou digite uma categoria nova"
                className="w-full mt-1.5 rounded-xl px-3 py-1.5 outline-none text-xs"
                style={{ border: "2px solid #EFEADC" }}
              />
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Subcategoria">
              <select
                value={subOptions.includes(form.sub) ? form.sub : ""}
                onChange={(e) => setForm({ ...form, sub: e.target.value, subCustom: "" })}
                className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm bg-white"
                style={{ border: "2px solid #EFEADC" }}
              >
                <option value="">Selecione...</option>
                {subOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                value={form.subCustom}
                onChange={(e) => setForm({ ...form, subCustom: e.target.value, sub: "" })}
                placeholder="ou digite uma nova"
                className="w-full mt-1.5 rounded-xl px-3 py-1.5 outline-none text-xs"
                style={{ border: "2px solid #EFEADC" }}
              />
            </Field>
          </div>
        </div>

        <Field label="Descrição">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Camiseta Dinossauro" className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
        </Field>

        <div>
          <label className="text-xs font-bold opacity-60">Fotos</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {form.images.map((img, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden flex-shrink-0" style={{ width: 68, height: 68 }}>
                <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 rounded-full flex items-center justify-center" style={{ width: 16, height: 16, background: "rgba(30,58,58,0.75)" }} aria-label="Remover foto">
                  <X size={10} color="#fff" />
                </button>
              </div>
            ))}
            <label className="rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0" style={{ width: 68, height: 68, background: "#F2EEE1", border: "2px dashed #D8D2BF" }}>
              <ImagePlus size={20} className="opacity-40" />
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
            </label>
          </div>
          <div className="text-xs opacity-60 mt-1.5">Pode enviar quantas fotos quiser — quanto mais ângulos, melhor pro cliente.</div>
          {imgError && <div className="text-xs font-bold mt-1" style={{ color: "#B23A2F" }}>{imgError}</div>}
        </div>

        <Field label="Preço (R$)">
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="decimal" placeholder="Ex: 49,90" className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
        </Field>

        {error && <div className="text-xs font-bold" style={{ color: "#B23A2F" }}>{error}</div>}

        <div className="flex gap-2">
          {onCancel && (
            <button onClick={onCancel} className="flex-1 rounded-full py-2.5 font-bold text-sm" style={{ border: `2px solid ${BRAND.ink}`, color: BRAND.ink, background: "#fff" }}>
              Cancelar
            </button>
          )}
          <button onClick={submit} disabled={saving} className="flex-1 rounded-full py-2.5 font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60" style={{ background: BRAND.pink, color: "#fff" }}>
            {mode === "create" ? (<><PackagePlus size={16} /> {saving ? "Salvando..." : "Cadastrar produto"}</>) : (saving ? "Salvando..." : "Salvar alterações")}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewStockEntryForm({ products, onDone }) {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState("");
  const [invoice, setInvoice] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const suggestions =
    search.trim() && !selectedProduct
      ? products.filter((p) => (p.code || "").toLowerCase().includes(search.trim().toLowerCase()) || p.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 6)
      : [];

  const pickProduct = (p) => { setSelectedProduct(p); setSearch(`${p.code} — ${p.name}`); };
  const handleSearchChange = (v) => { setSearch(v); if (selectedProduct) setSelectedProduct(null); };

  const submit = async () => {
    if (!selectedProduct) return setError("Busque e escolha o produto pelo código ou descrição.");
    if (!size.trim()) return setError("Informe o tamanho.");
    const n = Math.round(toNumber(qty));
    if (!n || n <= 0) return setError("Informe uma quantidade válida.");
    if (!invoice.trim()) return setError("Informe o número da nota fiscal.");
    setError("");
    setSaving(true);

    const sizeKey = size.trim();
    const newSizeStock = { ...selectedProduct.size_stock, [sizeKey]: (selectedProduct.size_stock?.[sizeKey] || 0) + n };
    const { error: updateErr } = await supabase.from("products").update({ size_stock: newSizeStock }).eq("id", selectedProduct.id);
    if (updateErr) { setSaving(false); return setError(`Não consegui atualizar o estoque: ${updateErr.message}`); }

    const { error: moveErr } = await supabase.from("stock_movements").insert({
      type: "entrada", product_id: selectedProduct.id, size: sizeKey, qty: n, movement_date: date, invoice: invoice.trim(),
    });
    setSaving(false);
    if (moveErr) return setError(`Estoque atualizado, mas não consegui registrar a auditoria: ${moveErr.message}`);

    onDone();
    setSuccess("Entrada registrada com sucesso!");
    setSearch(""); setSelectedProduct(null); setSize(""); setQty(""); setInvoice("");
    setTimeout(() => setSuccess(""), 3000);
  };

  return (
    <div className="rounded-2xl p-4 max-w-md" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
      <div className="font-bold mb-1" style={{ color: BRAND.tealDark }}>Entrada de produto</div>
      <p className="text-xs opacity-60 mb-3">Para reposição de produtos que já existem no catálogo.</p>
      {success && <div className="text-xs font-bold rounded-lg px-3 py-2 mb-3" style={{ background: "#E9F5DD", color: "#5C7A2B" }}>{success}</div>}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <label className="text-xs font-bold opacity-60">Código/Descrição</label>
          <div className="flex items-center gap-2 mt-1 rounded-xl px-3 py-2" style={{ border: "2px solid #EFEADC" }}>
            <Search size={15} className="opacity-40 flex-shrink-0" />
            <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Busque pelo código ou descrição..." className="w-full outline-none text-sm" />
          </div>
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
              {suggestions.map((p) => (
                <button key={p.id} type="button" onClick={() => pickProduct(p)} className="w-full text-left px-3 py-2 text-sm font-bold flex items-center justify-between gap-2" style={{ borderBottom: "1px solid #F2EEE1" }}>
                  <span className="truncate">{p.code} — {p.name}</span>
                  <span className="text-xs opacity-50 font-normal flex-shrink-0">{productStock(p)} em estoque</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-bold opacity-60">Tamanho</label>
            <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Ex: M" className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold opacity-60">Quantidade</label>
            <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" placeholder="Ex: 10" className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-bold opacity-60">Nota fiscal</label>
            <input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="Ex: NF-10345" className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold opacity-60">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
          </div>
        </div>
        {error && <div className="text-xs font-bold" style={{ color: "#B23A2F" }}>{error}</div>}
        <button onClick={submit} disabled={saving} className="w-full rounded-full py-2.5 font-bold text-sm disabled:opacity-60" style={{ background: BRAND.pink, color: "#fff" }}>
          {saving ? "Registrando..." : "Registrar entrada"}
        </button>
      </div>
    </div>
  );
}

function AuditTrail({ products, movements, loading }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [typeFilter, setTypeFilter] = useState("todos");

  const productById = (id) => products.find((p) => p.id === id);

  const rows = movements.filter((m) => {
    if (typeFilter !== "todos" && m.type !== typeFilter) return false;
    if (from && m.movement_date < from) return false;
    if (to && m.movement_date > to) return false;
    return true;
  });

  if (loading) return <p className="text-sm opacity-50">Carregando...</p>;

  return (
    <div>
      <ExportButtons
        rows={rows}
        filename="auditoria-estoque"
        title="Auditoria de estoque"
        columns={[
          { label: "Data", value: (m) => formatDate(m.movement_date) },
          { label: "Tipo", value: (m) => (m.type === "entrada" ? "Entrada" : "Saída") },
          { label: "Código", value: (m) => productById(m.product_id)?.code || "" },
          { label: "Produto", value: (m) => productById(m.product_id)?.name || "Produto removido" },
          { label: "Tamanho", value: (m) => m.size },
          { label: "Quantidade", value: (m) => m.qty },
          { label: "Referência", value: (m) => (m.type === "entrada" ? m.invoice : m.order_id) },
        ]}
      />
      <div id="print-area">
        <div className="flex flex-wrap gap-2 mb-4 items-end no-print">
          <div>
            <label className="text-xs font-bold opacity-60">De</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
          </div>
          <div>
            <label className="text-xs font-bold opacity-60">Até</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
          </div>
          <div className="flex gap-1.5">
            {[["todos", "Todos"], ["entrada", "Entradas"], ["saida", "Saídas"]].map(([id, label]) => (
              <Pill key={id} active={typeFilter === id} onClick={() => setTypeFilter(id)}>{label}</Pill>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {rows.length === 0 && <p className="text-sm opacity-50">Nenhuma movimentação nesse período.</p>}
          {rows.map((m) => {
            const p = productById(m.product_id);
            const isEntrada = m.type === "entrada";
            return (
              <div key={m.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
                <span className="rounded-full px-2.5 py-1 text-xs font-bold flex-shrink-0" style={{ background: isEntrada ? "#E9F5DD" : "#FBEAF0", color: isEntrada ? "#5C7A2B" : "#993556" }}>
                  {isEntrada ? "Entrada" : "Saída"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{p ? `${p.code} — ${p.name}` : "Produto removido"}</div>
                  <div className="text-xs opacity-50">Tamanho {m.size} · {formatDate(m.movement_date)} · {isEntrada ? `Nota ${m.invoice}` : "Venda registrada"}</div>
                </div>
                <div className="font-bold flex-shrink-0" style={{ color: isEntrada ? BRAND.green : BRAND.pink }}>{isEntrada ? "+" : "-"}{m.qty}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OffersManager({ products, promotions, onDone }) {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [discountPct, setDiscountPct] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const today = todayISO();

  const suggestions =
    search.trim() && !selectedProduct
      ? products.filter((p) => (p.code || "").toLowerCase().includes(search.trim().toLowerCase()) || p.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 6)
      : [];
  const pickProduct = (p) => { setSelectedProduct(p); setSearch(`${p.code} — ${p.name}`); };
  const handleSearchChange = (v) => { setSearch(v); if (selectedProduct) setSelectedProduct(null); };

  const submit = async () => {
    if (!selectedProduct) return setError("Busque e escolha o produto pelo código ou descrição.");
    const pct = Math.round(toNumber(discountPct));
    if (!pct || pct <= 0 || pct >= 100) return setError("Informe um desconto válido, entre 1 e 99%.");
    if (!startDate || !endDate) return setError("Informe o período (data de início e de fim).");
    if (endDate < startDate) return setError("A data final não pode ser antes da data inicial.");
    setError("");
    setSaving(true);
    const { error: err } = await supabase.from("promotions").insert({
      product_id: selectedProduct.id, discount_pct: pct, start_date: startDate, end_date: endDate,
    });
    setSaving(false);
    if (err) return setError(`Não consegui salvar: ${err.message}`);
    onDone();
    setSuccess(`Oferta cadastrada: ${selectedProduct.name} com ${pct}% off de ${formatDate(startDate)} a ${formatDate(endDate)}.`);
    setSearch(""); setSelectedProduct(null); setDiscountPct(""); setStartDate(todayISO()); setEndDate(todayISO());
    setTimeout(() => setSuccess(""), 4500);
  };

  const remove = async (id) => {
    await supabase.from("promotions").delete().eq("id", id);
    onDone();
  };

  const productById = (id) => products.find((p) => p.id === id);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-2xl p-4 max-w-md" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
        <div className="font-bold mb-1" style={{ color: BRAND.tealDark }}>Cadastrar oferta</div>
        <p className="text-xs opacity-60 mb-3">O desconto só vale dentro do período escolhido — antes e depois disso, o produto volta ao preço normal sozinho.</p>
        {success && <div className="text-xs font-bold rounded-lg px-3 py-2 mb-3" style={{ background: "#E9F5DD", color: "#5C7A2B" }}>{success}</div>}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <label className="text-xs font-bold opacity-60">Código/Descrição</label>
            <div className="flex items-center gap-2 mt-1 rounded-xl px-3 py-2" style={{ border: "2px solid #EFEADC" }}>
              <Search size={15} className="opacity-40 flex-shrink-0" />
              <input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Busque pelo código ou descrição..." className="w-full outline-none text-sm" />
            </div>
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
                {suggestions.map((p) => (
                  <button key={p.id} type="button" onClick={() => pickProduct(p)} className="w-full text-left px-3 py-2 text-sm font-bold flex items-center justify-between gap-2" style={{ borderBottom: "1px solid #F2EEE1" }}>
                    <span className="truncate">{p.code} — {p.name}</span>
                    <span className="text-xs opacity-50 font-normal flex-shrink-0">{formatPrice(p.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-bold opacity-60">Desconto (%)</label>
            <input value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} inputMode="numeric" placeholder="Ex: 15" className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold opacity-60">De</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold opacity-60">Até</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
            </div>
          </div>
          {error && <div className="text-xs font-bold" style={{ color: "#B23A2F" }}>{error}</div>}
          <button onClick={submit} disabled={saving} className="w-full rounded-full py-2.5 font-bold text-sm disabled:opacity-60" style={{ background: BRAND.pink, color: "#fff" }}>
            {saving ? "Salvando..." : "Cadastrar oferta"}
          </button>
        </div>
      </div>

      <div>
        <div className="font-bold mb-2" style={{ color: BRAND.tealDark }}>Ofertas cadastradas ({promotions.length})</div>
        <div className="flex flex-col gap-2">
          {promotions.length === 0 && <p className="text-sm opacity-50">Nenhuma oferta cadastrada ainda.</p>}
          {promotions.map((pr) => {
            const p = productById(pr.product_id);
            const status = promotionStatus(pr, today);
            const statusColor = status === "Ativa agora" ? { bg: "#E9F5DD", text: "#5C7A2B" } : status === "Agendada" ? { bg: "#E5F7F7", text: BRAND.tealDark } : { bg: "#F2EEE1", text: "#6B7A7A" };
            return (
              <div key={pr.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{p ? `${p.code} — ${p.name}` : "Produto removido"}</div>
                  <div className="text-xs opacity-50">{formatDate(pr.start_date)} a {formatDate(pr.end_date)} · {pr.discount_pct}% off{p ? ` · de ${formatPrice(p.price)} por ${formatPrice(p.price * (1 - pr.discount_pct / 100))}` : ""}</div>
                </div>
                <span className="rounded-full px-2.5 py-1 text-xs font-bold flex-shrink-0" style={{ background: statusColor.bg, color: statusColor.text }}>{status}</span>
                <button onClick={() => remove(pr.id)} className="rounded-full p-1.5 flex-shrink-0" style={{ background: "#FCE8E6" }} aria-label="Remover oferta">
                  <Trash2 size={14} color="#B23A2F" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProductsInventoryList({ products, categories, onRefresh }) {
  const [blockedMsg, setBlockedMsg] = useState("");
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? products.filter((p) => (p.code || "").toLowerCase().includes(search.trim().toLowerCase()) || p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : products;

  const toggleActive = async (p) => {
    await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    onRefresh();
  };

  const tryDelete = async (p) => {
    const { count } = await supabase.from("stock_movements").select("id", { count: "exact", head: true }).eq("product_id", p.id);
    if (count > 0) {
      setBlockedMsg("Esse produto já teve entrada ou venda registrada — não pode ser excluído, pra não perder o histórico. Você pode arquivá-lo em vez disso.");
      return;
    }
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return setBlockedMsg(`Não consegui excluir: ${error.message}`);
    setBlockedMsg("");
    onRefresh();
  };

  return (
    <div>
      {blockedMsg && (
        <div className="text-xs font-bold rounded-lg px-3 py-2 mb-3 flex items-center justify-between gap-3 no-print" style={{ background: "#FCE8E6", color: "#B23A2F" }}>
          <span>{blockedMsg}</span>
          <button onClick={() => setBlockedMsg("")} aria-label="Fechar"><X size={14} /></button>
        </div>
      )}
      <div className="flex items-center gap-2 mb-3 rounded-full px-4 py-2 max-w-sm no-print" style={{ border: "2px solid #EFEADC" }}>
        <Search size={15} className="opacity-40 flex-shrink-0" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código ou descrição..." className="w-full outline-none text-sm" />
        {search && <button onClick={() => setSearch("")}><X size={14} className="opacity-40" /></button>}
      </div>
      <ExportButtons
        rows={filtered}
        filename="produtos"
        title="Catálogo de produtos"
        columns={[
          { label: "Código", value: (p) => p.code },
          { label: "Produto", value: (p) => p.name },
          { label: "Categoria", value: (p) => p.category },
          { label: "Estoque", value: (p) => productStock(p) },
          { label: "Status", value: (p) => (p.active ? "Ativo" : "Inativo") },
        ]}
      />
      <div id="print-area" className="flex flex-col gap-2">
        {filtered.length === 0 && <p className="text-sm opacity-50">Nenhum produto encontrado.</p>}
        {filtered.map((p) => (
          <div key={p.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: "#fff", border: "2px solid #EFEADC", opacity: p.active ? 1 : 0.55 }}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{p.code} — {p.name} {!p.active && <span className="text-xs font-normal opacity-60">(inativo)</span>}</div>
              <div className="text-xs opacity-50">{p.category}{p.sub ? ` · ${p.sub}` : ""} · {productStock(p)} em estoque</div>
            </div>
            <button onClick={() => setEditingProduct(p)} className="rounded-full p-1.5 flex-shrink-0 no-print" style={{ background: "#F2EEE1" }} aria-label="Editar produto">
              <Pencil size={14} />
            </button>
            <button onClick={() => toggleActive(p)} className="rounded-full px-3 py-1.5 text-xs font-bold flex-shrink-0 no-print" style={{ background: "#F2EEE1", color: BRAND.ink }}>
              {p.active ? "Arquivar" : "Reativar"}
            </button>
            <button onClick={() => tryDelete(p)} className="rounded-full p-1.5 flex-shrink-0 no-print" style={{ background: "#FCE8E6" }} aria-label="Excluir produto">
              <Trash2 size={14} color="#B23A2F" />
            </button>
          </div>
        ))}
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto no-print" style={{ background: "rgba(30,58,58,0.55)" }} onClick={() => setEditingProduct(null)}>
          <div className="w-full max-w-md my-4 sm:my-10" onClick={(e) => e.stopPropagation()}>
            <ProductEditorForm
              mode="edit"
              categories={categories}
              initial={{
                id: editingProduct.id,
                code: editingProduct.code || "",
                category: editingProduct.category || "",
                categoryCustom: "",
                sub: editingProduct.sub || "",
                subCustom: "",
                name: editingProduct.name,
                images: editingProduct.images || [],
                price: String(editingProduct.price ?? ""),
                date: todayISO(),
              }}
              onCancel={() => setEditingProduct(null)}
              onDone={onRefresh}
            />
          </div>
        </div>
      )}
    </div>
  );
}
