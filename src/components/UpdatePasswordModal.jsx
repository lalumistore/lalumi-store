import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { BRAND } from "../lib/helpers.js";
import { supabase } from "../supabaseClient.js";

const inputStyle = { border: "2px solid #EFEADC" };

export default function UpdatePasswordModal({ onClose }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    setError("");
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto" style={{ background: "rgba(30,58,58,0.55)" }}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden flex-shrink-0 my-6 sm:my-14" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4" style={{ background: BRAND.teal }}>
          <span className="font-bold text-white text-lg">Criar nova senha</span>
          {done && <button onClick={onClose} className="text-white"><X size={22} /></button>}
        </div>
        <div className="p-5 flex flex-col gap-3">
          {done ? (
            <div className="text-center py-4">
              <p className="font-bold" style={{ color: BRAND.tealDark }}>Senha atualizada!</p>
              <p className="text-sm opacity-70 mt-2">Já pode continuar comprando com a senha nova.</p>
              <button onClick={onClose} className="mt-3 rounded-full px-6 py-2.5 font-bold text-sm" style={{ background: BRAND.pink, color: "#fff" }}>Fechar</button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <p className="text-xs opacity-60">Você chegou aqui pelo link de redefinição de senha. Escolha uma senha nova.</p>
              <div>
                <label className="text-xs font-bold opacity-60">Nova senha</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Pelo menos 6 caracteres" />
              </div>
              <div>
                <label className="text-xs font-bold opacity-60">Confirmar nova senha</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Repita a senha" />
              </div>
              {error && <div className="text-xs font-bold" style={{ color: "#B23A2F" }}>{error}</div>}
              <button type="submit" disabled={loading} className="w-full rounded-full py-3 font-bold mt-1 flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: BRAND.pink, color: "#fff" }}>
                {loading && <Loader2 size={16} className="animate-spin" />}
                Salvar nova senha
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
