import React, { useState } from "react";
import { X, ImagePlus, Trash2 } from "lucide-react";
import { BRAND, compressImage } from "../../lib/helpers.js";
import { supabase } from "../../supabaseClient.js";

export default function CarouselManager({ slides, onRefresh, onClose }) {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [imgError, setImgError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUpload = async (file) => {
    if (!file) return;
    setImgError("");
    try {
      setImage(await compressImage(file));
    } catch {
      setImgError("Não consegui processar essa imagem. Tente outra foto.");
    }
  };

  const submit = async () => {
    if (!title.trim()) return setError("Dê um título pra arte.");
    setError("");
    setSaving(true);
    const { error: err } = await supabase.from("carousel_slides").insert({
      title: title.trim(),
      image,
      sort_order: slides.length,
    });
    setSaving(false);
    if (err) return setError(`Não consegui salvar: ${err.message}`);
    setTitle("");
    setImage("");
    onRefresh();
  };

  const remove = async (id) => {
    const { error: err } = await supabase.from("carousel_slides").delete().eq("id", id);
    if (err) return setError(`Não consegui remover: ${err.message}`);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto" style={{ background: "rgba(30,58,58,0.55)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col flex-shrink-0 my-4 sm:my-10" style={{ background: "#fff", maxHeight: "min(600px, 92dvh)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 flex-shrink-0" style={{ background: BRAND.teal }}>
          <span className="font-bold text-white text-lg" style={{ fontFamily: "'Baloo 2', sans-serif" }}>Gerenciar carrossel</span>
          <button onClick={onClose} className="text-white"><X size={22} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <div className="text-xs font-bold opacity-60 mb-2">Artes atuais ({slides.length}) — sem limite de quantidade</div>
            <div className="flex flex-col gap-2">
              {slides.map((s) => (
                <div key={s.id} className="rounded-2xl p-2 flex items-center gap-3" style={{ background: "#F2EEE1" }}>
                  <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ width: 56, height: 40, backgroundImage: s.image ? `url("${s.image}")` : "none", backgroundColor: "#EFEADC", backgroundSize: "cover", backgroundPosition: "center" }} />
                  <span className="flex-1 text-sm font-bold truncate">{s.title}</span>
                  <button onClick={() => remove(s.id)} className="rounded-full p-1.5" style={{ background: "#FCE8E6" }} aria-label="Remover arte">
                    <Trash2 size={14} color="#B23A2F" />
                  </button>
                </div>
              ))}
              {slides.length === 0 && <p className="text-sm opacity-50">Nenhuma arte no carrossel ainda.</p>}
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ border: "2px dashed #D8D2BF" }}>
            <div className="text-xs font-bold opacity-60 mb-2">Adicionar nova arte</div>
            <div className="flex gap-3 items-center mb-3">
              <label className="rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0" style={{ width: 72, height: 52, backgroundColor: "#F2EEE1", backgroundImage: image ? `url("${image}")` : "none", backgroundSize: "cover", backgroundPosition: "center", border: "2px dashed #D8D2BF" }}>
                {!image && <ImagePlus size={18} className="opacity-40" />}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
              </label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da arte (ex: Coleção de Verão)" className="flex-1 rounded-xl px-3 py-2 outline-none text-sm" style={{ border: "2px solid #EFEADC" }} />
            </div>
            {imgError && <div className="text-xs font-bold mb-2" style={{ color: "#B23A2F" }}>{imgError}</div>}
            {error && <div className="text-xs font-bold mb-2" style={{ color: "#B23A2F" }}>{error}</div>}
            <button onClick={submit} disabled={saving} className="w-full rounded-full py-2.5 font-bold text-sm disabled:opacity-60" style={{ background: BRAND.pink, color: "#fff" }}>
              {saving ? "Salvando..." : "Adicionar ao carrossel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
