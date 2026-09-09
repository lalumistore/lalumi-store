import React, { useEffect, useState } from "react";
import { ArrowLeft, Search, X, ChevronRight } from "lucide-react";
import { supabase } from "../../supabaseClient.js";
import { BRAND, formatPrice, formatDate } from "../../lib/helpers.js";
import { Pill } from "../Shared.jsx";

const ROLE_LABEL = { cliente: "Cliente", master: "Administrador" };

export default function UsersPanel({ onBack }) {
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("todos");
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");

  const refresh = async () => {
    const { data, error: err } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setUsers(data || []);
  };
  useEffect(() => { refresh(); }, []);

  const changeRole = async (id, role) => {
    const { error: err } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (err) return setError(err.message);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    if (selectedUser?.id === id) setSelectedUser((u) => ({ ...u, role }));
  };

  if (error) return <p className="text-sm font-bold" style={{ color: "#B23A2F" }}>Erro ao carregar usuários: {error}</p>;
  if (users === null) return <p className="text-sm opacity-50">Carregando...</p>;

  const filtered = users.filter((u) => {
    if (roleFilter !== "todos" && u.role !== roleFilter) return false;
    const name = u.full_name || "";
    const email = u.email || "";
    if (search.trim() && !name.toLowerCase().includes(search.trim().toLowerCase()) && !email.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <section className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm font-bold mb-3" style={{ color: BRAND.tealDark }}>
        <ArrowLeft size={16} /> Voltar
      </button>
      <div className="font-bold text-xl mb-1" style={{ color: BRAND.tealDark, fontFamily: "'Baloo 2', sans-serif" }}>Usuários</div>
      <p className="text-sm opacity-60 mb-4">Todo mundo que já criou conta na loja. Clique num usuário pra ver os dados e trocar a permissão.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 rounded-full px-4 py-2 max-w-sm flex-1" style={{ border: "2px solid #EFEADC" }}>
          <Search size={15} className="opacity-40 flex-shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou e-mail..." className="w-full outline-none text-sm" />
          {search && <button onClick={() => setSearch("")}><X size={14} className="opacity-40" /></button>}
        </div>
        <div className="flex gap-1.5">
          {[["todos", "Todos"], ["cliente", "Cliente"], ["master", "Administrador"]].map(([id, label]) => (
            <Pill key={id} active={roleFilter === id} onClick={() => setRoleFilter(id)}>{label}</Pill>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && <p className="text-sm opacity-50">Nenhum usuário encontrado.</p>}
        {filtered.map((u) => (
          <button key={u.id} type="button" onClick={() => setSelectedUser(u)} className="rounded-2xl p-3 flex items-center gap-3 text-left" style={{ background: "#fff", border: "2px solid #EFEADC" }}>
            <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm" style={{ width: 40, height: 40, background: "#F2EEE1", color: BRAND.tealDark }}>
              {(u.full_name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{u.full_name || "Sem nome"}</div>
              <div className="text-xs opacity-50 truncate">{u.email}</div>
            </div>
            <span className="rounded-full px-2.5 py-1 text-xs font-bold flex-shrink-0" style={{ background: u.role === "master" ? "#FBEAF0" : "#E5F7F7", color: u.role === "master" ? BRAND.pink : BRAND.tealDark }}>
              {ROLE_LABEL[u.role] || u.role}
            </span>
            <ChevronRight size={16} className="opacity-40 flex-shrink-0" />
          </button>
        ))}
      </div>

      {selectedUser && (
        <UserDetailModal user={selectedUser} onChangeRole={changeRole} onClose={() => setSelectedUser(null)} />
      )}
    </section>
  );
}

function UserDetailModal({ user, onChangeRole, onClose }) {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("orders").select("*, order_items(*)").eq("customer_id", user.id).order("created_at", { ascending: false });
      setOrders(data || []);
    })();
  }, [user.id]);

  const latestOrder = orders && orders.length > 0 ? orders[0] : null;
  const total = (o) => (o.order_items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto" style={{ background: "rgba(30,58,58,0.55)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl overflow-hidden flex flex-col flex-shrink-0 my-4 sm:my-10" style={{ background: "#fff", maxHeight: "min(640px, 92dvh)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 flex-shrink-0" style={{ background: BRAND.teal }}>
          <span className="font-bold text-white text-lg" style={{ fontFamily: "'Baloo 2', sans-serif" }}>Detalhes do usuário</span>
          <button onClick={onClose} className="text-white"><X size={22} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold" style={{ width: 52, height: 52, background: "#F2EEE1", color: BRAND.tealDark }}>
              {(user.full_name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <div className="font-bold" style={{ fontFamily: "'Baloo 2', sans-serif" }}>{user.full_name || "Sem nome"}</div>
              <div className="text-xs opacity-50">Cadastrado em {formatDate(user.created_at?.slice(0, 10))}</div>
            </div>
          </div>

          <div className="rounded-2xl p-3 flex flex-col gap-1.5 text-sm" style={{ background: "#F2EEE1" }}>
            <div><span className="opacity-50">E-mail:</span> {user.email}</div>
            <div><span className="opacity-50">Celular:</span> {latestOrder?.customer_phone || "não informado ainda"}</div>
            <div><span className="opacity-50">CPF:</span> {latestOrder?.customer_cpf || "não informado ainda"}</div>
            <div><span className="opacity-50">Endereço:</span> {latestOrder ? `${latestOrder.address_street}, ${latestOrder.address_number} - ${latestOrder.address_neighborhood}, ${latestOrder.address_city}` : "não informado ainda"}</div>
          </div>
          <p className="text-xs opacity-40 -mt-2">Celular, CPF e endereço vêm do último pedido feito por essa pessoa.</p>

          <div>
            <label className="text-xs font-bold opacity-60">Permissão</label>
            <select
              value={user.role}
              onChange={(e) => onChangeRole(user.id, e.target.value)}
              className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm bg-white"
              style={{ border: `2px solid ${user.role === "master" ? BRAND.pink : BRAND.teal}` }}
            >
              <option value="cliente">Cliente</option>
              <option value="master">Administrador</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-bold opacity-60 mb-2">Pedidos ({orders === null ? "..." : orders.length})</div>
            <div className="flex flex-col gap-2">
              {orders === null && <p className="text-sm opacity-50">Carregando...</p>}
              {orders && orders.length === 0 && <p className="text-sm opacity-50">Nenhum pedido ainda.</p>}
              {orders && orders.map((o) => (
                <div key={o.id} className="rounded-xl p-2.5" style={{ border: "2px solid #EFEADC" }}>
                  <div className="flex justify-between text-sm font-bold">
                    <span>#{o.order_number}</span>
                    <span style={{ color: BRAND.tealDark }}>{formatPrice(total(o))}</span>
                  </div>
                  <div className="text-xs opacity-50">{new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.order_items.map((i) => `${i.quantity}x ${i.product_name}`).join(", ")}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
