import { Baby, Shirt, Footprints, Star, Waves, Moon, Tag } from "lucide-react";

export const BRAND = {
  teal: "#1FB6BA",
  tealDark: "#0E8A8E",
  pink: "#EC4899",
  yellow: "#F5B942",
  green: "#8DC63F",
  cream: "#FFFBF2",
  ink: "#1E3A3A",
};

export const BASE_CATEGORY_ICONS = {
  "Bebê": Baby,
  "Menino": Shirt,
  "Menina": Shirt,
  "Entre Fases": Shirt,
  "Moda Praia": Waves,
  "Pijamas": Moon,
  "Acessórios": Star,
};
export function iconForCategory(name) {
  return BASE_CATEGORY_ICONS[name] || Tag;
}

export const COLOR_SWATCH = {
  Rosa: BRAND.pink,
  Azul: "#4EA8DE",
  Amarelo: BRAND.yellow,
  Verde: BRAND.green,
  Branco: "#FFFFFF",
  Preto: "#2A2A2A",
  Vermelho: "#E4572E",
  Roxo: "#9B6BD9",
  Laranja: "#F2994A",
  Cinza: "#A9ABA9",
  Marrom: "#8A5A3B",
  Estampado: "conic-gradient(#EC4899,#F5B942,#8DC63F,#4EA8DE,#EC4899)",
};
export const swatchFor = (color) => COLOR_SWATCH[color] || "#C9C2AE";

export const SIZE_ORDER = ["RN", "P", "M", "G", "GG", "1", "2", "3", "4", "6", "8", "10", "12", "14", "16", "18", "Único"];

export const SORT_OPTIONS = ["Novidades", "Menor preço", "Maior preço", "A - Z", "Favoritos", "Z - A", "Maior Desconto", "Mais Vendidos"];

export function formatPrice(n) {
  return `R$ ${Number(n).toFixed(2).replace(".", ",")}`;
}
export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
export function toNumber(str) {
  return parseFloat(String(str).trim().replace(",", "."));
}

// Um produto do Supabase tem { size_stock: { "P": 5, "M": 2, ... } }.
export function productSizes(p) {
  return SIZE_ORDER.filter((s) => (p.size_stock?.[s] || 0) > 0);
}
export function productStock(p) {
  return Object.values(p.size_stock || {}).reduce((sum, n) => sum + (n || 0), 0);
}
export function remainingForSize(product, size, cart) {
  const inStock = product.size_stock?.[size] || 0;
  const inCart = cart[`${product.id}::${size}`]?.qty || 0;
  return Math.max(0, inStock - inCart);
}

// ---- Ofertas com período ----
export function activePromotion(productId, promotions, today = todayISO()) {
  return promotions.find((pr) => pr.product_id === productId && pr.start_date <= today && today <= pr.end_date) || null;
}
export function effectiveDiscountPct(product, promotions, today = todayISO()) {
  const promo = activePromotion(product.id, promotions, today);
  return promo ? promo.discount_pct : 0;
}
export function effectivePrice(product, promotions, today = todayISO()) {
  const discount = effectiveDiscountPct(product, promotions, today);
  return discount > 0 ? product.price * (1 - discount / 100) : product.price;
}
export function promotionStatus(promo, today = todayISO()) {
  if (today < promo.start_date) return "Agendada";
  if (today > promo.end_date) return "Encerrada";
  return "Ativa agora";
}

export function orderTotal(order) {
  return (order.order_items || []).reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
}

// ---- Validação ----
export function isValidName(name) {
  const t = name.trim();
  if (t.length < 3 || /\d/.test(t)) return false;
  return t.split(/\s+/).filter(Boolean).length >= 2;
}
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
export function isValidPhone(phone) {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 || d.length === 11;
}
export function isValidCEP(cep) {
  return cep.replace(/\D/g, "").length === 8;
}
export function isValidCPF(cpf) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i], 10) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(d[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i], 10) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return check === parseInt(d[10], 10);
}

// ---- Máscaras ----
export function maskCPF(v) {
  return v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
export function maskCEP(v) {
  return v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}
export function maskPhone(v) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

// Redimensiona e comprime uma foto enviada antes de guardar como
// base64, para o registro no banco não ficar pesado demais.
export function compressImage(file, maxDim = 900, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
