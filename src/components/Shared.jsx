import React from "react";
import { BRAND, iconForCategory, swatchFor } from "../lib/helpers.js";

export function StarMascot({ size = 40 }) {
  const starPath =
    "M 48.4 6 Q 55.5 18.0 61.5 36.9 Q 81.0 36.8 92.5 40.6 Q 84.3 49.0 70.2 57.9 Q 78.0 77.0 78.3 89.5 Q 65.8 83.1 49.8 70.0 Q 34.1 82.5 22.3 87.5 Q 24.3 75.3 31.1 58.6 Q 13.6 48.9 5.6 40.1 Q 19.2 36.6 39.3 36.3 Q 43.1 17.2 48.4 6.0 Z";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path d={starPath} fill={BRAND.yellow} />
      <path d={starPath} fill="none" stroke="#1E1E1E" strokeWidth="2.1" strokeLinejoin="round" opacity="0.9" />
      <path d={starPath} fill="none" stroke="#1E1E1E" strokeWidth="1.1" strokeLinejoin="round" opacity="0.25" transform="translate(0.8,0.6) scale(1.01)" />
      <path d="M 56 18 C 61 13.5, 66 12.5, 70 14.5 C 73 16, 75 18.5, 77 21.5" stroke="#1E1E1E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M 60 24 C 65 20.5, 70 20, 74 22 C 76.5 23.2, 78 25, 79.5 27.5" stroke="#1E1E1E" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="30.5" cy="55.5" r="7.2" fill={BRAND.pink} opacity="0.55" />
      <circle cx="68.5" cy="56.5" r="7.8" fill={BRAND.pink} opacity="0.5" />
      <circle cx="39.5" cy="45.5" r="3.5" fill="#1E1E1E" />
      <circle cx="59.5" cy="44.8" r="3.8" fill="#1E1E1E" />
      <path d="M 37.5 56.5 Q 43 63.5, 49.5 63.8 Q 56 64 61.5 55.5" stroke="#1E1E1E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function Pill({ active, onClick, children, dot }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors flex items-center gap-1.5"
      style={{
        borderColor: active ? BRAND.teal : "#E3DED0",
        background: active ? BRAND.teal : "#FFFFFF",
        color: active ? "#FFFFFF" : BRAND.ink,
      }}
    >
      {dot && <span className="rounded-full border flex-shrink-0" style={{ width: 12, height: 12, background: dot, borderColor: "#00000022" }} />}
      {children}
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-bold opacity-60">{label}</label>
      {children}
    </div>
  );
}

export function ProductThumb({ product, size = "9rem", iconSize = 30 }) {
  const image = product.images?.[0];
  if (image) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ height: size }}>
        <img src={image} alt={product.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  const Icon = iconForCategory(product.category);
  const hex = swatchFor(product.color);
  const bg = product.color === "Estampado" ? COLOR_SWATCH_ESTAMPADO : `${hex}33`;
  return (
    <div className="flex items-center justify-center rounded-2xl overflow-hidden" style={{ background: bg, height: size }}>
      <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: "min(3.8rem, 70%)", height: "min(3.8rem, 70%)", background: "#ffffff" }}>
        <Icon size={iconSize} strokeWidth={1.8} color={product.color === "Branco" || product.color === "Estampado" ? BRAND.ink : hex} />
      </div>
    </div>
  );
}
const COLOR_SWATCH_ESTAMPADO = "conic-gradient(#EC4899,#F5B942,#8DC63F,#4EA8DE,#EC4899)";
