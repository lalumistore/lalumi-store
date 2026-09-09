import React from "react";
import { ArrowLeft, ChevronRight, PackagePlus, FileSpreadsheet, Users as UsersIcon } from "lucide-react";
import { BRAND } from "../../lib/helpers.js";

export default function AdminHub({ onNavigate, onBack }) {
  const cards = [
    { id: "estoque", title: "Estoque", desc: "Cadastro de produtos, entrada por nota fiscal, auditoria e ofertas.", icon: PackagePlus },
    { id: "relatorio", title: "Relatórios", desc: "Mais vendidos, produtos zerados e todos os pedidos da loja.", icon: FileSpreadsheet },
    { id: "usuarios", title: "Usuários", desc: "Clientes e administradores cadastrados, com opção de trocar a permissão.", icon: UsersIcon },
  ];
  return (
    <section className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-bold mb-4" style={{ color: BRAND.tealDark }}>
        <ArrowLeft size={16} /> Voltar à loja
      </button>
      <div className="font-bold text-xl mb-1" style={{ color: BRAND.tealDark, fontFamily: "'Baloo 2', sans-serif" }}>Administração</div>
      <p className="text-sm opacity-60 mb-5">Tudo que só o master consegue acessar, num só lugar.</p>
      <div className="flex flex-col gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button key={c.id} onClick={() => onNavigate(c.id)} className="rounded-2xl p-4 flex items-center gap-4 text-left" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
              <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 48, height: 48, background: "#E5F7F7" }}>
                <Icon size={22} color={BRAND.tealDark} />
              </div>
              <div className="flex-1">
                <div className="font-bold" style={{ fontFamily: "'Baloo 2', sans-serif" }}>{c.title}</div>
                <div className="text-xs opacity-60 mt-0.5">{c.desc}</div>
              </div>
              <ChevronRight size={18} className="opacity-40 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
