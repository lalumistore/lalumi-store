import React, { useCallback, useEffect, useState } from "react";
import {
  ShoppingBag, X, Plus, Minus, Search, MapPin, Trash2, MessageCircle,
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, SlidersHorizontal,
  Loader2, LogIn, LogOut, Package, Settings,
} from "lucide-react";
import { supabase } from "./supabaseClient.js";
import {
  BRAND, SIZE_ORDER, SORT_OPTIONS, formatPrice, toNumber, productSizes, productStock,
  isValidName, isValidEmail, isValidPhone, isValidCEP, isValidCPF,
  maskCPF, maskCEP, maskPhone, effectiveDiscountPct, effectivePrice, todayISO, iconForCategory,
} from "./lib/helpers.js";
import { StarMascot, Pill, ProductThumb } from "./components/Shared.jsx";
import ProductDetailModal from "./components/ProductDetailModal.jsx";
import PaymentBrick from "./components/PaymentBrick.jsx";
import AuthModal from "./components/AuthModal.jsx";
import UpdatePasswordModal from "./components/UpdatePasswordModal.jsx";
import OrderHistory from "./components/OrderHistory.jsx";
import AdminHub from "./components/admin/AdminHub.jsx";
import CategoryManager from "./components/admin/CategoryManager.jsx";
import CarouselManager from "./components/admin/CarouselManager.jsx";
import InventoryPanel from "./components/admin/InventoryPanel.jsx";
import ReportsPanel from "./components/admin/ReportsPanel.jsx";
import UsersPanel from "./components/admin/UsersPanel.jsx";

const WHATSAPP_NUMBER = "5581984277109";
const inputStyle = { border: "2px solid #EFEADC" };
const emptyCheckoutForm = { nome: "", email: "", celular: "", cpf: "", rua: "", numero: "", bairro: "", cidade: "", cep: "" };

export default function App() {
  // ---- auth ----
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [updatePasswordOpen, setUpdatePasswordOpen] = useState(false);
  const [initialAuthParams] = useState(() => {
    const raw = (window.location.hash || window.location.search || "").replace(/^[#?]/, "");
    return new URLSearchParams(raw);
  });
  const [authNotice, setAuthNotice] = useState(null);

  useEffect(() => {
    if (initialAuthParams.get("error")) {
      const description = initialAuthParams.get("error_description");
      const text = description
        ? decodeURIComponent(description.replace(/\+/g, " "))
        : "Não foi possível confirmar o link.";
      setAuthNotice({
        type: "error",
        text: /expired/i.test(initialAuthParams.get("error_code") || "")
          ? "Esse link expirou. Peça um novo (confirmação de cadastro ou redefinição de senha)."
          : text,
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (initialAuthParams.get("type") === "recovery") {
      setUpdatePasswordOpen(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (initialAuthParams.get("access_token") || initialAuthParams.get("type") === "signup") {
      setAuthNotice({ type: "success", text: "E-mail confirmado! Sua conta está pronta e você já está logada." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [initialAuthParams]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setUpdatePasswordOpen(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setProfile(null); return; }
    supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => setProfile(data || null));
  }, [session]);

  const isMaster = profile?.role === "master";

  // ---- products / categories / promotions / carousel (todo mundo vê) ----
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [slides, setSlides] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const refreshProducts = useCallback(async () => {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: true });
    if (!error) setProducts(data || []);
    setLoadingProducts(false);
  }, []);
  const refreshCategories = useCallback(async () => {
    const { data } = await supabase.from("categories").select("*").order("name", { ascending: true });
    setCategories(data || []);
  }, []);
  const refreshPromotions = useCallback(async () => {
    const { data } = await supabase.from("promotions").select("*");
    setPromotions(data || []);
  }, []);
  const refreshSlides = useCallback(async () => {
    const { data } = await supabase.from("carousel_slides").select("*").order("sort_order", { ascending: true });
    setSlides(data || []);
  }, []);

  useEffect(() => {
    refreshProducts();
    refreshCategories();
    refreshPromotions();
    refreshSlides();
    const channel = supabase
      .channel("storefront-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => refreshProducts())
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => refreshCategories())
      .on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, () => refreshPromotions())
      .on("postgres_changes", { event: "*", schema: "public", table: "carousel_slides" }, () => refreshSlides())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refreshProducts, refreshCategories, refreshPromotions, refreshSlides]);

  // ---- view routing ----
  const [view, setView] = useState("home"); // home | category | admin | estoque | relatorio | usuarios
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [carouselManagerOpen, setCarouselManagerOpen] = useState(false);

  // ---- storefront filters ----
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [subFilter, setSubFilter] = useState(new Set());
  const [sizeFilter, setSizeFilter] = useState(new Set());
  const [sortBy, setSortBy] = useState("Novidades");
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    if (slide >= slides.length) setSlide(0);
    const t = setInterval(() => setSlide((s) => (s + 1) % Math.max(slides.length, 1)), 3500);
    return () => clearInterval(t);
  }, [slides.length]);

  const openCategory = (name) => {
    setActiveCategory(name);
    setSubFilter(new Set());
    setSizeFilter(new Set());
    setSortBy("Novidades");
    setView("category");
  };
  const backHome = () => { setView("home"); setActiveCategory(null); };

  const toggleSet = (setFn, current, value) => {
    const next = new Set(current);
    next.has(value) ? next.delete(value) : next.add(value);
    setFn(next);
  };

  const sortProducts = (list) => {
    const arr = [...list];
    const today = todayISO();
    switch (sortBy) {
      case "Menor preço": return arr.sort((a, b) => effectivePrice(a, promotions, today) - effectivePrice(b, promotions, today));
      case "Maior preço": return arr.sort((a, b) => effectivePrice(b, promotions, today) - effectivePrice(a, promotions, today));
      case "A - Z": return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "Z - A": return arr.sort((a, b) => b.name.localeCompare(a.name));
      case "Favoritos": return arr.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
      case "Maior Desconto": return arr.sort((a, b) => effectiveDiscountPct(b, promotions, today) - effectiveDiscountPct(a, promotions, today));
      case "Mais Vendidos": return arr.sort((a, b) => (b.sales || 0) - (a.sales || 0));
      default: return arr;
    }
  };

  const categoryMeta = categories.find((c) => c.name === activeCategory);
  const categoryProducts = sortProducts(
    products.filter((p) => {
      if (!p.active) return false;
      if (p.category !== activeCategory) return false;
      if (subFilter.size > 0 && !subFilter.has(p.sub)) return false;
      if (sizeFilter.size > 0 && !productSizes(p).some((s) => sizeFilter.has(s))) return false;
      return true;
    })
  );

  const suggestions = search.trim()
    ? products.filter((p) => p.active && p.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 5)
    : [];

  // ---- cart ----
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null); // pedido já salvo, aguardando pagamento
  const [paymentResult, setPaymentResult] = useState(null); // { ok, status, statusDetail, message }
  const [checkoutError, setCheckoutError] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [form, setForm] = useState(emptyCheckoutForm);

  const cartItems = Object.entries(cart)
    .map(([cartKey, line]) => {
      const product = products.find((p) => p.id === line.productId);
      if (!product) return null;
      const price = effectivePrice(product, promotions);
      return { ...product, price, size: line.size, qty: line.qty, cartKey };
    })
    .filter((i) => i && i.qty > 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.qty * i.price, 0);

  const addLinesToCart = (product, size, qty) => {
    const key = `${product.id}::${size}`;
    setCart((c) => {
      const current = c[key]?.qty || 0;
      return { ...c, [key]: { productId: product.id, size, qty: current + qty } };
    });
    setSelectedProduct(null);
  };
  const changeQty = (cartKey, delta) => {
    setCart((c) => {
      const line = c[cartKey];
      if (!line) return c;
      const product = products.find((p) => p.id === line.productId);
      const max = product?.size_stock?.[line.size] || 0;
      const nextQty = Math.max(0, Math.min(max, line.qty + delta));
      return { ...c, [cartKey]: { ...line, qty: nextQty } };
    });
  };

  useEffect(() => {
    if (session && profile) {
      setForm((f) => ({ ...f, nome: f.nome || profile.full_name || "", email: f.email || session.user.email || "" }));
    }
  }, [session, profile]);

  const openCheckout = () => {
    if (!session) {
      setAuthMessage("Entre ou crie uma conta para finalizar a compra e acompanhar seu pedido.");
      setAuthOpen(true);
      return;
    }
    setCheckoutOpen(true);
  };

  const buildSupportMessage = () =>
    `Olá! Preciso de ajuda com meu pedido na Lalumi Store${createdOrder ? ` (nº ${createdOrder.id.slice(0, 8)})` : ""}.`;

  const submitOrder = async (e) => {
    e.preventDefault();
    if (!session) return setCheckoutError("Você precisa estar logado para finalizar a compra.");
    if (!isValidName(form.nome)) return setCheckoutError("Informe seu nome completo (nome e sobrenome, sem números).");
    if (!isValidEmail(form.email)) return setCheckoutError("Informe um e-mail válido, ex: nome@email.com.");
    if (!isValidPhone(form.celular)) return setCheckoutError("Informe um celular válido, com DDD, ex: (81) 98427-7109.");
    if (!isValidCPF(form.cpf)) return setCheckoutError("Informe um CPF válido.");
    if (!form.rua.trim()) return setCheckoutError("Preencha a rua.");
    if (!form.numero.trim()) return setCheckoutError("Preencha o número (use S/N se não houver).");
    if (!form.bairro.trim()) return setCheckoutError("Preencha o bairro.");
    if (!form.cidade.trim()) return setCheckoutError("Preencha a cidade.");
    if (!isValidCEP(form.cep)) return setCheckoutError("Informe um CEP válido, com 8 dígitos.");
    if (cartItems.length === 0) return setCheckoutError("Seu carrinho está vazio.");
    setCheckoutError("");
    setPlacingOrder(true);

    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: session.user.id,
          customer_name: form.nome.trim(),
          customer_email: form.email.trim(),
          customer_phone: form.celular,
          customer_cpf: form.cpf,
          address_street: form.rua.trim(),
          address_number: form.numero.trim(),
          address_neighborhood: form.bairro.trim(),
          address_city: form.cidade.trim(),
          address_cep: form.cep,
          payment_method: "Online",
          total: cartTotal,
        })
        .select()
        .single();
      if (orderError) throw orderError;

      const itemsPayload = cartItems.map((i) => ({
        order_id: order.id, product_id: i.id, product_name: i.name, size: i.size, quantity: i.qty, unit_price: i.price,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsError) throw itemsError;

      for (const i of cartItems) {
        const { error: stockError } = await supabase.rpc("decrement_stock", {
          p_product_id: i.id, p_size: i.size, p_qty: i.qty, p_order_id: order.id,
        });
        if (stockError) throw stockError;
      }

      refreshProducts();
      setCreatedOrder(order);
    } catch (err) {
      setCheckoutError(`Não consegui registrar o pedido: ${err.message}`);
    } finally {
      setPlacingOrder(false);
    }
  };

  const finishAfterOrder = () => {
    setCart({});
    setCreatedOrder(null);
    setPaymentResult(null);
    setCheckoutOpen(false);
    setCartOpen(false);
    setCheckoutError("");
    setForm(emptyCheckoutForm);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setView("home");
  };

  return (
    <div
      style={{
        background: BRAND.cream,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M14 4 L16.4 11.6 L24 14 L16.4 16.4 L14 24 L11.6 16.4 L4 14 L11.6 11.6 Z' fill='%231FB6BA' opacity='0.14'/%3E%3Cpath d='M44 30 L45.6 35 L50.6 36.6 L45.6 38.2 L44 43.2 L42.4 38.2 L37.4 36.6 L42.4 35 Z' fill='%23EC4899' opacity='0.12'/%3E%3Cpath d='M6 42 L7.3 46 L11.3 47.3 L7.3 48.6 L6 52.6 L4.7 48.6 L0.7 47.3 L4.7 46 Z' fill='%23F5B942' opacity='0.16'/%3E%3C/svg%3E\")",
        backgroundRepeat: "repeat",
        backgroundSize: "60px 60px",
        minHeight: "100vh",
        fontFamily: "'Nunito', sans-serif",
        color: BRAND.ink,
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&family=Nunito:wght@400;600;700;800&display=swap');
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          .no-print { display: none !important; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-20" style={{ background: BRAND.teal }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <button onClick={backHome} className="flex items-center gap-2 flex-shrink-0">
            <StarMascot size={38} />
            <div className="leading-none text-left" style={{ fontFamily: "'Baloo 2', sans-serif" }}>
              <div className="flex items-baseline gap-0.5" style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                <span style={{ color: BRAND.pink }}>La</span>
                <span style={{ color: BRAND.yellow }}>lu</span>
                <span style={{ color: BRAND.green }}>mi</span>
              </div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#ffffff", letterSpacing: 1 }}>store</div>
            </div>
          </button>

          <div className="flex-1 relative min-w-[140px]">
            <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{ background: "#fff" }}>
              <Search size={16} className="opacity-40 flex-shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar camisa, vestido, tênis..." className="w-full outline-none text-sm bg-transparent" />
              {search && <button onClick={() => setSearch("")}><X size={14} className="opacity-40" /></button>}
            </div>
            {suggestions.length > 0 && (
              <div className="absolute top-11 left-0 right-0 rounded-2xl overflow-hidden z-30" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
                {suggestions.map((p) => (
                  <button key={p.id} onClick={() => { setSearch(""); setSelectedProduct(p); }} className="w-full text-left px-3 py-2 text-sm font-bold flex items-center gap-3" style={{ borderBottom: "1px solid #F2EEE1" }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0 }}><ProductThumb product={p} size="36px" iconSize={16} /></div>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-xs opacity-50 font-normal flex-shrink-0">{p.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {session === undefined ? null : session ? (
            <>
              <span className="hidden sm:inline text-xs font-bold flex-shrink-0" style={{ color: "#fff" }}>
                Olá, {(profile?.full_name || session.user.email || "").split(" ")[0]}
              </span>
              {isMaster && (
                <button
                  onClick={() => setView(["admin", "estoque", "relatorio", "usuarios"].includes(view) ? "home" : "admin")}
                  className="rounded-full px-3 py-2 font-bold text-xs flex-shrink-0"
                  style={{ background: ["admin", "estoque", "relatorio", "usuarios"].includes(view) ? BRAND.pink : "rgba(255,255,255,0.25)", color: "#fff" }}
                >
                  {["admin", "estoque", "relatorio", "usuarios"].includes(view) ? "Voltar à loja" : "Administração"}
                </button>
              )}
              {!isMaster && (
                <button
                  onClick={() => setView(view === "pedidos" ? "home" : "pedidos")}
                  className="flex items-center gap-2 rounded-full px-3 py-2 font-bold text-xs flex-shrink-0"
                  style={{ background: view === "pedidos" ? BRAND.pink : "rgba(255,255,255,0.25)", color: "#fff" }}
                >
                  <Package size={14} />
                  <span className="hidden sm:inline">{view === "pedidos" ? "Voltar à loja" : "Meus pedidos"}</span>
                </button>
              )}
              <button onClick={signOut} className="flex items-center gap-1 rounded-full px-3 py-2 font-bold text-sm flex-shrink-0" style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }} title="Sair">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button onClick={() => { setAuthMessage(""); setAuthOpen(true); }} className="flex items-center gap-2 rounded-full px-3 py-2 font-bold text-sm flex-shrink-0" style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }}>
              <LogIn size={16} /> <span className="hidden sm:inline">Entrar</span>
            </button>
          )}

          {(view === "home" || view === "category") && (
            <button onClick={() => setCartOpen(true)} className="relative flex items-center gap-2 rounded-full px-4 py-2 font-bold flex-shrink-0" style={{ background: "#ffffff", color: BRAND.tealDark }}>
              <ShoppingBag size={18} />
              {cartCount > 0 && <span className="absolute -top-2 -right-2 rounded-full flex items-center justify-center text-xs font-bold" style={{ width: 22, height: 22, background: BRAND.pink, color: "#fff" }}>{cartCount}</span>}
            </button>
          )}
        </div>
      </header>

      {authNotice && (
        <div className="max-w-6xl mx-auto px-5 pt-3">
          <div className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center justify-between gap-3" style={{ background: authNotice.type === "success" ? "#E9F5DD" : "#FCE8E6", color: authNotice.type === "success" ? "#5C7A2B" : "#B23A2F" }}>
            <span>{authNotice.text}</span>
            <button onClick={() => setAuthNotice(null)} aria-label="Fechar aviso"><X size={16} /></button>
          </div>
        </div>
      )}

      {view === "admin" && isMaster ? (
        <AdminHub onNavigate={setView} onBack={() => setView("home")} />
      ) : view === "estoque" && isMaster ? (
        <InventoryPanel products={products} categories={categories} promotions={promotions} refreshProducts={refreshProducts} refreshPromotions={refreshPromotions} onBack={() => setView("admin")} />
      ) : view === "relatorio" && isMaster ? (
        <ReportsPanel products={products} onBack={() => setView("admin")} />
      ) : view === "usuarios" && isMaster ? (
        <UsersPanel onBack={() => setView("admin")} />
      ) : view === "pedidos" && session ? (
        <OrderHistory userId={session.user.id} />
      ) : view === "home" ? (
        <>
          <section className="max-w-5xl mx-auto px-4 pt-6">
            <div className="flex justify-center gap-5 flex-wrap py-2">
              {categories.map((c) => {
                const Icon = iconForCategory(c.name);
                return (
                  <button key={c.id} onClick={() => openCategory(c.name)} className="flex flex-col items-center gap-1.5" style={{ width: 76 }}>
                    <div className="rounded-full flex items-center justify-center" style={{ width: 60, height: 60, background: "#F2EEE1" }}>
                      <Icon size={26} color={BRAND.tealDark} />
                    </div>
                    <span className="text-xs font-bold text-center">{c.name}</span>
                  </button>
                );
              })}
            </div>
            {isMaster && (
              <div className="flex justify-center">
                <button onClick={() => setCategoryManagerOpen(true)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: BRAND.tealDark, color: "#fff" }}>
                  <Settings size={13} /> Gerenciar categorias
                </button>
              </div>
            )}
          </section>

          <section className="pt-4">
            <div className="max-w-5xl mx-auto px-4 flex items-center justify-between mb-2">
              <span className="text-xs font-bold opacity-40">Destaques</span>
              {isMaster && (
                <button onClick={() => setCarouselManagerOpen(true)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: BRAND.tealDark, color: "#fff" }}>
                  <Settings size={13} /> Gerenciar carrossel
                </button>
              )}
            </div>
            <div className="max-w-6xl mx-auto px-2 sm:px-4">
              <div className="relative rounded-3xl overflow-hidden" style={{ height: "min(64vw, 380px)", minHeight: 220 }}>
                {slides.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm font-bold opacity-40" style={{ background: "#F2EEE1" }}>Nenhuma arte cadastrada</div>
                ) : (
                  <>
                    <div className="flex h-full transition-transform duration-500" style={{ width: `${slides.length * 100}%`, transform: `translateX(-${slide * (100 / slides.length)}%)` }}>
                      {slides.map((s) => (
                        <div
                          key={s.id}
                          className="h-full flex flex-col items-center justify-center gap-3 relative overflow-hidden"
                          style={{ width: `${100 / slides.length}%`, flexShrink: 0, backgroundColor: "#F2EEE1", backgroundImage: s.image ? `url("${s.image}")` : "none", backgroundSize: "cover", backgroundPosition: "center" }}
                        >
                          {s.image && <div className="absolute inset-0" style={{ background: "rgba(20,30,30,0.22)" }} />}
                          <div className="relative font-bold text-2xl text-center px-4" style={{ color: "#fff", fontFamily: "'Baloo 2', sans-serif", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{s.title}</div>
                          <div className="relative rounded-full px-5 py-2 font-bold text-sm" style={{ background: BRAND.pink, color: "#fff" }}>Ver coleção</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-1.5" style={{ background: "rgba(255,255,255,0.85)" }}><ChevronLeft size={18} /></button>
                    <button onClick={() => setSlide((s) => (s + 1) % slides.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5" style={{ background: "rgba(255,255,255,0.85)" }}><ChevronRight size={18} /></button>
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                      {slides.map((s, i) => <span key={s.id} className="rounded-full" style={{ width: 6, height: 6, background: i === slide ? "#fff" : "rgba(255,255,255,0.5)" }} />)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <section className="max-w-5xl mx-auto px-4 py-6">
            {loadingProducts ? (
              <div className="flex items-center justify-center gap-2 py-16 opacity-60"><Loader2 className="animate-spin" size={18} /> Carregando produtos...</div>
            ) : (
              <>
                <div className="font-bold mb-3" style={{ color: BRAND.tealDark, fontFamily: "'Baloo 2', sans-serif" }}>Todos os produtos</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {products.filter((p) => p.active).map((p) => (
                    <ProductCard key={p.id} product={p} promotions={promotions} onClick={setSelectedProduct} />
                  ))}
                </div>
              </>
            )}
          </section>

          <footer className="text-center py-6 text-sm opacity-50">Lalumi Store · feito com carinho para pequenas aventuras</footer>
        </>
      ) : view === "category" && categoryMeta ? (
        <section className="max-w-5xl mx-auto px-4 py-4">
          <button onClick={backHome} className="flex items-center gap-1 text-sm font-bold mb-3" style={{ color: BRAND.tealDark }}>
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-bold text-xl" style={{ color: BRAND.tealDark, fontFamily: "'Baloo 2', sans-serif" }}>{activeCategory}</div>
              <div className="text-xs font-bold opacity-50">{categoryProducts.length} {categoryProducts.length === 1 ? "produto" : "produtos"}</div>
            </div>
            <button onClick={() => setFilterOpen(true)} className="flex items-center gap-1.5 rounded-full px-4 py-2 font-bold text-sm" style={{ border: `2px solid ${BRAND.ink}`, background: "#fff" }}>
              <SlidersHorizontal size={14} /> Filtrar e ordenar
            </button>
          </div>
          {categoryProducts.length === 0 ? (
            <div className="text-center py-16 rounded-3xl" style={{ background: "#fff", border: "2px dashed #E3DED0" }}>
              <p className="font-bold" style={{ color: BRAND.tealDark }}>Nenhum produto com esses filtros</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categoryProducts.map((p) => (
                <ProductCard key={p.id} product={p} promotions={promotions} onClick={setSelectedProduct} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-30 flex justify-end" style={{ background: "rgba(30,58,58,0.4)" }} onClick={() => setCartOpen(false)}>
          <div className="w-full max-w-sm h-full flex flex-col" style={{ background: BRAND.cream }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4" style={{ background: BRAND.teal }}>
              <span className="font-bold text-white text-lg">Seu carrinho</span>
              <button onClick={() => setCartOpen(false)} className="text-white"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {cartItems.length === 0 && <p className="text-center opacity-50 mt-10">Seu carrinho está vazio.</p>}
              {cartItems.map((i) => (
                <div key={i.cartKey} className="rounded-2xl p-3 flex gap-3 items-center" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
                  <div style={{ width: 56, height: 56 }}><ProductThumb product={i} size="56px" /></div>
                  <div className="flex-1">
                    <div className="font-bold text-sm leading-snug">{i.name}</div>
                    <div className="text-xs opacity-50">Tam. {i.size}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => changeQty(i.cartKey, -1)} className="rounded-full p-1" style={{ background: "#F2EEE1" }}><Minus size={12} /></button>
                      <span className="text-sm font-bold w-4 text-center">{i.qty}</span>
                      <button onClick={() => changeQty(i.cartKey, 1)} className="rounded-full p-1" style={{ background: "#F2EEE1" }}><Plus size={12} /></button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-sm" style={{ color: BRAND.tealDark }}>{formatPrice(i.price * i.qty)}</span>
                    <span className="text-xs opacity-50">{formatPrice(i.price)} × {i.qty}</span>
                    <button onClick={() => changeQty(i.cartKey, -i.qty)} aria-label="Remover item"><Trash2 size={16} color="#B8827E" /></button>
                  </div>
                </div>
              ))}
            </div>
            {cartItems.length > 0 && (
              <div className="p-4" style={{ borderTop: "2px solid #EFEADC" }}>
                <div className="flex justify-between mb-3">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-lg" style={{ color: BRAND.tealDark }}>{formatPrice(cartTotal)}</span>
                </div>
                <button onClick={openCheckout} className="w-full rounded-full py-3 font-bold" style={{ background: BRAND.pink, color: "#fff" }}>Finalizar compra</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductDetailModal product={selectedProduct} cart={cart} promotions={promotions} onClose={() => setSelectedProduct(null)} onConfirm={addLinesToCart} />
      )}

      {/* Filter drawer (category view) */}
      {filterOpen && categoryMeta && (
        <FilterSheet
          category={categoryMeta}
          sortBy={sortBy}
          onSort={setSortBy}
          subFilter={subFilter}
          onToggleSub={(s) => toggleSet(setSubFilter, subFilter, s)}
          sizeFilter={sizeFilter}
          onToggleSize={(s) => toggleSet(setSizeFilter, sizeFilter, s)}
          onClose={() => setFilterOpen(false)}
          onApply={() => setFilterOpen(false)}
          onClear={() => { setSubFilter(new Set()); setSizeFilter(new Set()); setSortBy("Novidades"); }}
        />
      )}

      {categoryManagerOpen && (
        <CategoryManager categories={categories} onRefresh={refreshCategories} onClose={() => setCategoryManagerOpen(false)} />
      )}
      {carouselManagerOpen && (
        <CarouselManager slides={slides} onRefresh={refreshSlides} onClose={() => setCarouselManagerOpen(false)} />
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center p-3 sm:p-4 overflow-y-auto" style={{ background: "rgba(30,58,58,0.5)" }}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden flex-shrink-0 my-4 sm:my-10" style={{ background: "#fff" }}>
            {!createdOrder ? (
              <>
                <div className="flex items-center justify-between p-4" style={{ background: BRAND.teal }}>
                  <span className="font-bold text-white text-lg">Seus dados</span>
                  <button onClick={() => { setCheckoutOpen(false); setCheckoutError(""); }} className="text-white"><X size={22} /></button>
                </div>
                <div className="p-5 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="text-xs font-bold opacity-60">Nome completo</label>
                    <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Nome de quem recebe" />
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-60">E-mail</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="voce@email.com" />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-bold opacity-60">Celular / WhatsApp</label>
                      <input value={form.celular} onChange={(e) => setForm({ ...form, celular: maskPhone(e.target.value) })} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold opacity-60">CPF</label>
                      <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="000.000.000-00" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-60 flex items-center gap-1"><MapPin size={13} className="opacity-60" /> Endereço de entrega</label>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      <div className="col-span-2"><input value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} className="w-full rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Rua" /></div>
                      <div><input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="w-full rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Número" /></div>
                      <div><input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className="w-full rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Bairro" /></div>
                      <div><input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="w-full rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Cidade" /></div>
                      <div><input value={form.cep} onChange={(e) => setForm({ ...form, cep: maskCEP(e.target.value) })} className="w-full rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="CEP" /></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center rounded-xl px-3 py-2 mt-1" style={{ background: "#F2EEE1" }}>
                    <span className="text-sm font-bold">Total do pedido</span>
                    <span className="font-bold" style={{ color: BRAND.tealDark }}>{formatPrice(cartTotal)}</span>
                  </div>
                  {checkoutError && <div className="text-xs font-bold" style={{ color: "#B23A2F" }}>{checkoutError}</div>}
                  <button type="button" onClick={submitOrder} disabled={placingOrder} className="w-full rounded-full py-3 font-bold mt-1 flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: BRAND.pink, color: "#fff" }}>
                    {placingOrder && <Loader2 size={18} className="animate-spin" />}
                    {placingOrder ? "Registrando pedido..." : "Continuar para pagamento"}
                  </button>
                  <p className="text-xs text-center opacity-40">O pagamento acontece aqui mesmo no site, com segurança do Mercado Pago.</p>
                </div>
              </>
            ) : !paymentResult ? (
              <>
                <div className="flex items-center justify-between p-4" style={{ background: BRAND.teal }}>
                  <span className="font-bold text-white text-lg">Pagamento</span>
                  <button onClick={() => { setCheckoutOpen(false); }} className="text-white"><X size={22} /></button>
                </div>
                <div className="p-5 max-h-[75vh] overflow-y-auto">
                  <div className="flex justify-between items-center rounded-xl px-3 py-2 mb-3" style={{ background: "#F2EEE1" }}>
                    <span className="text-sm font-bold">Total a pagar</span>
                    <span className="font-bold" style={{ color: BRAND.tealDark }}>{formatPrice(cartTotal)}</span>
                  </div>
                  <PaymentBrick
                    amount={cartTotal}
                    payerEmail={form.email}
                    orderId={createdOrder.id}
                    onResult={(result) => setPaymentResult(result)}
                  />
                </div>
              </>
            ) : (
              <div className="p-8 text-center flex flex-col items-center gap-3">
                {paymentResult.ok && paymentResult.status === "approved" ? (
                  <>
                    <div className="rounded-full flex items-center justify-center" style={{ width: 64, height: 64, background: BRAND.green }}><MessageCircle size={32} color="#fff" /></div>
                    <p className="font-bold text-xl" style={{ color: BRAND.tealDark }}>Pagamento aprovado!</p>
                    <p className="text-sm opacity-60">Seu pedido nº {createdOrder.id.slice(0, 8)} foi confirmado. Acompanhe tudo em "Meus pedidos".</p>
                  </>
                ) : paymentResult.ok && ["pending", "in_process"].includes(paymentResult.status) ? (
                  <>
                    <div className="rounded-full flex items-center justify-center" style={{ width: 64, height: 64, background: BRAND.yellow }}><Loader2 size={32} color="#fff" /></div>
                    <p className="font-bold text-xl" style={{ color: BRAND.tealDark }}>Pagamento em análise</p>
                    <p className="text-sm opacity-60">Assim que o Mercado Pago confirmar (Pix ou boleto podem levar um tempinho), seu pedido é atualizado automaticamente.</p>
                  </>
                ) : (
                  <>
                    <div className="rounded-full flex items-center justify-center" style={{ width: 64, height: 64, background: "#B23A2F" }}><X size={32} color="#fff" /></div>
                    <p className="font-bold text-xl" style={{ color: BRAND.tealDark }}>Pagamento não aprovado</p>
                    <p className="text-sm opacity-60">{paymentResult.message || "Tente novamente com outro cartão ou forma de pagamento."}</p>
                    <button onClick={() => setPaymentResult(null)} className="mt-2 rounded-full px-6 py-2.5 font-bold text-sm" style={{ background: BRAND.pink, color: "#fff" }}>Tentar de novo</button>
                  </>
                )}
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildSupportMessage())}`}
                  target="_blank" rel="noreferrer"
                  className="text-sm font-bold underline mt-1"
                  style={{ color: BRAND.tealDark }}
                >
                  Precisa de ajuda? Fale conosco no WhatsApp
                </a>
                <button onClick={finishAfterOrder} className="text-sm font-bold underline" style={{ color: BRAND.tealDark }}>Voltar à loja</button>
              </div>
            )}
          </div>
        </div>
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} message={authMessage} />}
      {updatePasswordOpen && <UpdatePasswordModal onClose={() => setUpdatePasswordOpen(false)} />}
    </div>
  );
}

function ProductCard({ product, promotions, onClick }) {
  const soldOut = productStock(product) <= 0;
  const discount = effectiveDiscountPct(product, promotions);
  const finalPrice = effectivePrice(product, promotions);
  return (
    <button type="button" onClick={() => !soldOut && onClick(product)} disabled={soldOut} className="rounded-3xl p-3 flex flex-col text-left disabled:cursor-not-allowed relative" style={{ background: "#ffffff", border: "2px solid #EFEADC", opacity: soldOut ? 0.6 : 1 }}>
      {discount > 0 && (
        <span className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-bold z-10" style={{ background: BRAND.pink, color: "#fff" }}>-{discount}%</span>
      )}
      <ProductThumb product={product} />
      <div className="mt-3 flex-1">
        <div className="text-xs font-bold opacity-50">{product.category}</div>
        <div className="font-bold leading-snug mt-0.5">{product.name}</div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {productSizes(product).map((s) => <span key={s} className="text-xs rounded-full px-2 py-0.5 font-bold" style={{ background: "#F2EEE1", color: "#6B7A7A" }}>{s}</span>)}
        </div>
        <div className="text-xs font-bold mt-1.5" style={{ color: soldOut ? "#B8827E" : BRAND.green }}>{soldOut ? "Esgotado" : `${productStock(product)} em estoque`}</div>
      </div>
      <div className="flex items-center justify-between mt-3">
        {discount > 0 ? (
          <div>
            <div className="text-xs opacity-50 line-through">{formatPrice(product.price)}</div>
            <span className="font-bold" style={{ color: BRAND.pink }}>{formatPrice(finalPrice)}</span>
          </div>
        ) : (
          <span className="font-bold" style={{ color: BRAND.tealDark }}>{formatPrice(product.price)}</span>
        )}
        <span className="rounded-full p-2" style={{ background: soldOut ? "#D8D2BF" : BRAND.pink, color: "#fff" }} aria-hidden><Plus size={16} strokeWidth={3} /></span>
      </div>
    </button>
  );
}

function FilterSheet({ category, sortBy, onSort, subFilter, onToggleSub, sizeFilter, onToggleSize, onClose, onApply, onClear }) {
  const [sortOpen, setSortOpen] = useState(true);
  const [typeOpen, setTypeOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);

  return (
    <div className="fixed inset-0 z-40 flex justify-end" style={{ background: "rgba(30,58,58,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-sm h-full flex flex-col" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 flex-shrink-0" style={{ borderBottom: "1px solid #EFEADC" }}>
          <span className="font-bold text-lg" style={{ color: BRAND.tealDark, fontFamily: "'Baloo 2', sans-serif" }}>Filtrar e ordenar</span>
          <button onClick={onClose}><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <button onClick={() => setSortOpen((v) => !v)} className="w-full flex items-center justify-between py-2">
            <span className="font-bold" style={{ color: BRAND.ink }}>Ordenar</span>
            {sortOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {sortOpen && (
            <div className="flex flex-wrap gap-2 pb-4">
              {SORT_OPTIONS.map((s) => <Pill key={s} active={sortBy === s} onClick={() => onSort(s)}>{s}</Pill>)}
            </div>
          )}

          {category.subcategories.length > 0 && (
            <>
              <button onClick={() => setTypeOpen((v) => !v)} className="w-full flex items-center justify-between py-2" style={{ borderTop: "1px solid #EFEADC" }}>
                <span className="font-bold" style={{ color: BRAND.ink }}>Tipo</span>
                {typeOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {typeOpen && (
                <div className="flex flex-wrap gap-2 pb-4">
                  {category.subcategories.map((s) => <Pill key={s} active={subFilter.has(s)} onClick={() => onToggleSub(s)}>{s}</Pill>)}
                </div>
              )}
            </>
          )}

          {category.sizes.length > 0 && (
            <>
              <button onClick={() => setSizeOpen((v) => !v)} className="w-full flex items-center justify-between py-2" style={{ borderTop: "1px solid #EFEADC" }}>
                <span className="font-bold" style={{ color: BRAND.ink }}>Tamanho</span>
                {sizeOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {sizeOpen && (
                <div className="flex flex-wrap gap-2 pb-4">
                  {category.sizes.map((s) => <Pill key={s} active={sizeFilter.has(s)} onClick={() => onToggleSize(s)}>{s}</Pill>)}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 flex gap-2 flex-shrink-0" style={{ borderTop: "1px solid #EFEADC" }}>
          <button onClick={onClear} className="flex-1 rounded-full py-3 font-bold text-sm" style={{ border: `2px solid ${BRAND.ink}`, color: BRAND.ink, background: "#fff" }}>Limpar filtros</button>
          <button onClick={onApply} className="flex-1 rounded-full py-3 font-bold text-sm" style={{ background: BRAND.pink, color: "#fff" }}>Ver resultados</button>
        </div>
      </div>
    </div>
  );
}
