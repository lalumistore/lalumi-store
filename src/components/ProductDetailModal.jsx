import React, { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { BRAND, formatPrice, productSizes, remainingForSize, effectiveDiscountPct, effectivePrice } from "../lib/helpers.js";
import { Pill, ProductThumb } from "./Shared.jsx";

export default function ProductDetailModal({ product, cart, promotions, onClose, onConfirm }) {
  const sizes = productSizes(product);
  const images = product.images || [];
  const [size, setSize] = useState(sizes[0] || "");
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const maxAddable = size ? remainingForSize(product, size, cart) : 0;
  const discount = effectiveDiscountPct(product, promotions);
  const finalPrice = effectivePrice(product, promotions);

  const chooseSize = (s) => {
    setSize(s);
    setQty(1);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center p-3 sm:p-4 overflow-y-auto" style={{ background: "rgba(30,58,58,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col flex-shrink-0 my-4 sm:my-10" style={{ background: "#fff", maxHeight: "min(680px, 92dvh)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 flex-shrink-0" style={{ background: BRAND.teal }}>
          <span className="font-bold text-white text-lg" style={{ fontFamily: "'Baloo 2', sans-serif" }}>Escolher opções</span>
          <button onClick={onClose} className="text-white"><X size={22} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            {images.length > 0 ? (
              <div className="rounded-2xl overflow-hidden" style={{ height: 300, background: "#F2EEE1" }}>
                <img src={images[activeImg]} alt={product.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <ProductThumb product={product} size="300px" />
            )}
            {images.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImg(idx)}
                    className="rounded-lg overflow-hidden flex-shrink-0"
                    style={{ width: 56, height: 56, border: `2px solid ${idx === activeImg ? BRAND.teal : "#EFEADC"}` }}
                  >
                    <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs font-bold opacity-50">{product.category}</div>
            <div className="font-bold text-lg leading-snug" style={{ fontFamily: "'Baloo 2', sans-serif" }}>{product.name}</div>
            {discount > 0 ? (
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-sm opacity-50 line-through">{formatPrice(product.price)}</span>
                <span className="font-bold" style={{ color: BRAND.pink }}>{formatPrice(finalPrice)}</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: BRAND.pink, color: "#fff" }}>-{discount}%</span>
              </div>
            ) : (
              <div className="font-bold mt-1" style={{ color: BRAND.tealDark }}>{formatPrice(product.price)}</div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold opacity-60">Escolha o tamanho</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {sizes.map((s) => (
                <Pill key={s} active={size === s} onClick={() => chooseSize(s)}>{s}</Pill>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold opacity-60">Quantidade</label>
            <div className="flex items-center gap-3 mt-1.5">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="rounded-full p-2" style={{ background: "#F2EEE1" }}><Minus size={14} /></button>
              <span className="font-bold text-lg w-6 text-center">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(maxAddable, q + 1))} className="rounded-full p-2" style={{ background: "#F2EEE1" }}><Plus size={14} /></button>
              <span className="text-xs opacity-50">{maxAddable} disponíveis</span>
            </div>
          </div>

          <button
            type="button"
            disabled={!size || qty < 1 || maxAddable < 1}
            onClick={() => onConfirm(product, size, qty)}
            className="w-full rounded-full py-3 font-bold disabled:opacity-40"
            style={{ background: BRAND.pink, color: "#fff" }}
          >
            Adicionar ao carrinho
          </button>
        </div>
      </div>
    </div>
  );
}
