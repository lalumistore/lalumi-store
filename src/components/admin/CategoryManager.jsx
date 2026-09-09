import React, { useState } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import { BRAND } from "../../lib/helpers.js";
import { supabase } from "../../supabaseClient.js";

function TagInput({ tags, onChange, placeholder }) {
  const [value, setValue] = useState("");
  const addTag = () => {
    const v = value.trim();
    if (!v || tags.includes(v)) { setValue(""); return; }
    onChange([...tags, v]);
    setValue("");
  };
  const removeTag = (t) => onChange(tags.filter((x) => x !== t));
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map((t) => (
          <span key={t} className="rounded-full px-2.5 py-1 text-xs font-bold flex items-center gap-1" style={{ background: "#E5F7F7", color: BRAND.tealDark }}>
            {t}
            <button type="button" onClick={() => removeTag(t)} aria-label={`Remover ${t}`}><X size={11} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
          placeholder={placeholder}
          className="flex-1 rounded-xl px-3 py-2 outline-none text-sm"
          style={{ border: "2px solid #EFEADC" }}
        />
        <button type="button" onClick={addTag} className="rounded-xl px-3 font-bold text-sm" style={{ background: "#F2EEE1", color: BRAND.ink }}>+</button>
      </div>
    </div>
  );
}

const emptyForm = { id: null, name: "", subcategories: [], sizes: [] };

export default function CategoryManager({ categories, onRefresh, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (c) => setForm({ id: c.id, name: c.name, subcategories: [...c.subcategories], sizes: [...c.sizes] });
  const startNew = () => { setForm(emptyForm); setError(""); };

  const submit = async () => {
    if (!form.name.trim()) return setError("Dê um nome pra categoria.");
    setError("");
    setSaving(true);
    const payload = { name: form.name.trim(), subcategories: form.subcategories, sizes: form.sizes };
    const query = form.id
      ? supabase.from("categories").update(payload).eq("id", form.id)
      : supabase.from("categories").insert(payload);
    const { error: err } = await query;
    setSaving(false);
    if (err) return setError(`Não consegui salvar: ${err.message}`);
    setForm(emptyForm);
    onRefresh();
  };

  const remove = async (id) => {
    const { error: err } = await supabase.from("categories").delete().eq("id", id);
    if (err) return setError(`Não consegui excluir: ${err.message}`);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto" style={{ background: "rgba(30,58,58,0.55)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col flex-shrink-0 my-4 sm:my-10" style={{ background: "#fff", maxHeight: "min(640px, 92dvh)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 flex-shrink-0" style={{ background: BRAND.teal }}>
          <span className="font-bold text-white text-lg" style={{ fontFamily: "'Baloo 2', sans-serif" }}>Gerenciar categorias</span>
          <button onClick={onClose} className="text-white"><X size={22} /></button>
        </div>
        <div className="p-5 flex flex-col gap-5 overflow-y-auto flex-1 min-h-0">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold opacity-60">{form.id ? "Editar categoria" : "Nova categoria"} — sem limite de categoria, tipo ou tamanho</div>
              {form.id && <button onClick={startNew} className="text-xs font-bold" style={{ color: BRAND.pink }}>Cancelar edição</button>}
            </div>
            <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ border: "2px dashed #D8D2BF" }}>
              <div>
                <label className="text-xs font-bold opacity-60">Nome da categoria</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Moda Inverno" className="w-full mt-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
              </div>
              <div>
                <label className="text-xs font-bold opacity-60">Subcategorias (tipos de peça)</label>
                <div className="mt-1"><TagInput tags={form.subcategories} onChange={(t) => setForm({ ...form, subcategories: t })} placeholder="Digite e aperte Enter" /></div>
              </div>
              <div>
                <label className="text-xs font-bold opacity-60">Tamanhos</label>
                <div className="mt-1"><TagInput tags={form.sizes} onChange={(t) => setForm({ ...form, sizes: t })} placeholder="Digite e aperte Enter" /></div>
              </div>
              {error && <div className="text-xs font-bold" style={{ color: "#B23A2F" }}>{error}</div>}
              <button onClick={submit} disabled={saving} className="w-full rounded-full py-2.5 font-bold text-sm disabled:opacity-60" style={{ background: BRAND.pink, color: "#fff" }}>
                {saving ? "Salvando..." : form.id ? "Salvar alterações" : "Adicionar categoria"}
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold opacity-60 mb-2">Categorias atuais ({categories.length})</div>
            <div className="flex flex-col gap-2">
              {categories.map((c) => (
                <div key={c.id} className="rounded-2xl p-3" style={{ background: "#F2EEE1" }}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{c.name}</span>
                    <div className="flex gap-1.5">
                      <button onClick={() => startEdit(c)} className="rounded-full p-1.5" style={{ background: "#fff" }} aria-label="Editar categoria"><Pencil size={13} /></button>
                      <button onClick={() => remove(c.id)} className="rounded-full p-1.5" style={{ background: "#FCE8E6" }} aria-label="Excluir categoria"><Trash2 size={13} color="#B23A2F" /></button>
                    </div>
                  </div>
                  <div className="text-xs opacity-60 mt-1">
                    {c.subcategories.length > 0 && <div>Tipos: {c.subcategories.join(", ")}</div>}
                    {c.sizes.length > 0 && <div>Tamanhos: {c.sizes.join(", ")}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
