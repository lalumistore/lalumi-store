import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Plus, Loader2, Check } from "lucide-react";
import { BRAND, fetchAddressByCEP, estimateShipping, maskCEP } from "../lib/helpers.js";
import { supabase } from "../supabaseClient.js";

const inputStyle = { border: "2px solid #EFEADC" };

const AddressStep = forwardRef(function AddressStep({ userId, form, setForm, onShippingChange }, ref) {
  const [savedAddresses, setSavedAddresses] = useState(null);
  const [selectedId, setSelectedId] = useState(null); // null = endereço novo
  const [cepLoading, setCepLoading] = useState(false);
  const [cepNotFound, setCepNotFound] = useState(false);
  const [saveNew, setSaveNew] = useState(true);
  const [label, setLabel] = useState("Casa");

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("addresses")
      .select("*")
      .eq("customer_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setSavedAddresses(list);
        if (list.length > 0) selectSaved(list[0]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const applyAddress = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    onShippingChange(estimateShipping(patch.estado));
  };

  const selectSaved = (a) => {
    setSelectedId(a.id);
    applyAddress({ cep: a.cep, rua: a.street, numero: a.number, bairro: a.neighborhood, cidade: a.city, estado: a.state });
  };

  const selectNew = () => {
    setSelectedId(null);
    applyAddress({ cep: "", rua: "", numero: "", bairro: "", cidade: "", estado: "" });
  };

  const handleCepChange = async (raw) => {
    const masked = maskCEP(raw);
    setForm((f) => ({ ...f, cep: masked }));
    setCepNotFound(false);
    const digits = masked.replace(/\D/g, "");
    if (digits.length === 8) {
      setCepLoading(true);
      const found = await fetchAddressByCEP(masked);
      setCepLoading(false);
      if (found) {
        setForm((f) => ({
          ...f,
          rua: found.street || f.rua,
          bairro: found.neighborhood || f.bairro,
          cidade: found.city || f.cidade,
          estado: found.state,
        }));
        onShippingChange(estimateShipping(found.state));
      } else {
        setCepNotFound(true);
      }
    }
  };

  const saveThisAddress = async () => {
    if (!userId || !saveNew || selectedId) return null; // já é um endereço salvo, não duplica
    const { data } = await supabase
      .from("addresses")
      .insert({
        customer_id: userId,
        label: label.trim() || "Endereço",
        cep: form.cep,
        street: form.rua,
        number: form.numero,
        neighborhood: form.bairro,
        city: form.cidade,
        state: form.estado,
        is_default: (savedAddresses || []).length === 0,
      })
      .select()
      .single();
    return data || null;
  };

  useImperativeHandle(ref, () => ({ saveThisAddress }));

  return (
    <div>
      {savedAddresses && savedAddresses.length > 0 && (
        <div className="mb-3">
          <label className="text-xs font-bold opacity-60">Endereços salvos</label>
          <div className="flex flex-col gap-2 mt-1.5">
            {savedAddresses.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => selectSaved(a)}
                className="rounded-xl p-2.5 text-left flex items-center gap-2"
                style={{ border: `2px solid ${selectedId === a.id ? BRAND.teal : "#EFEADC"}`, background: selectedId === a.id ? "#E5F7F7" : "#fff" }}
              >
                <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 20, height: 20, background: selectedId === a.id ? BRAND.teal : "#F2EEE1" }}>
                  {selectedId === a.id && <Check size={13} color="#fff" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold">{a.label}</div>
                  <div className="text-xs opacity-60 truncate">{a.street}, {a.number} - {a.neighborhood}, {a.city}/{a.state}</div>
                </div>
              </button>
            ))}
            <button type="button" onClick={selectNew} className="rounded-xl p-2.5 text-left flex items-center gap-2" style={{ border: `2px dashed ${selectedId === null ? BRAND.teal : "#D8D2BF"}`, background: selectedId === null ? "#E5F7F7" : "#fff" }}>
              <Plus size={16} className="flex-shrink-0" style={{ color: BRAND.tealDark }} />
              <span className="text-xs font-bold" style={{ color: BRAND.tealDark }}>Usar outro endereço</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs font-bold opacity-60">CEP</label>
          <div className="relative">
            <input value={form.cep} onChange={(e) => handleCepChange(e.target.value)} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="00000-000" />
            {cepLoading && <Loader2 size={14} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 opacity-50" />}
          </div>
          {cepNotFound && <div className="text-xs font-bold mt-1" style={{ color: "#B23A2F" }}>CEP não encontrado, preencha manualmente.</div>}
        </div>
        <div className="col-span-2">
          <label className="text-xs font-bold opacity-60">Rua</label>
          <input value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Rua" />
        </div>
        <div>
          <label className="text-xs font-bold opacity-60">Número</label>
          <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Número" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-bold opacity-60">Bairro</label>
          <input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Bairro" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-bold opacity-60">Cidade</label>
          <input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Cidade" />
        </div>
        <div>
          <label className="text-xs font-bold opacity-60">UF</label>
          <input value={form.estado} onChange={(e) => { const v = e.target.value.toUpperCase().slice(0, 2); setForm({ ...form, estado: v }); onShippingChange(estimateShipping(v)); }} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="UF" />
        </div>
      </div>

      {userId && (
        <label className="flex items-center gap-2 mt-3 text-xs font-bold" style={{ color: BRAND.ink }}>
          <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} />
          Salvar este endereço pra próximas compras
        </label>
      )}
      {userId && saveNew && (
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full mt-2 rounded-xl px-3 py-2 outline-none text-sm" style={inputStyle} placeholder="Nome pro endereço (ex: Casa, Trabalho)" />
      )}
    </div>
  );
});

export default AddressStep;
