import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { BRAND } from "../lib/helpers.js";
import { supabase } from "../supabaseClient.js";

const inputStyle = { border: "2px solid #EFEADC" };

export default function AuthModal({ onClose, message }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup' | 'forgot'
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signupDone, setSignupDone] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "forgot") {
      if (!email.trim()) return setError("Informe seu e-mail.");
      setLoading(true);
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setResetSent(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) return setError("Preencha e-mail e senha.");
    if (mode === "signup" && fullName.trim().length < 3) return setError("Informe seu nome completo.");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (signUpError) throw signUpError;
        setSignupDone(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        onClose();
      }
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : err.message);
    } finally {
      setLoading(false);
    }
  };

  const titles = { login: "Entrar", signup: "Criar conta", forgot: "Redefinir senha" };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto" style={{ background: "rgba(30,58,58,0.55)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl overflow-hidden flex-shrink-0 my-6 sm:my-14" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4" style={{ background: BRAND.teal }}>
          <span className="font-bold text-white text-lg">{titles[mode]}</span>
          <button onClick={onClose} className="text-white"><X size={22} /></button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {message && !signupDone && !resetSent && (
            <div className="text-xs font-bold rounded-lg px-3 py-2" style={{ background: "#E5F7F7", color: BRAND.tealDark }}>{message}</div>
          )}

          {signupDone ? (
            <div className="text-center py-4">
              <p className="font-bold" style={{ color: BRAND.tealDark }}>Quase lá!</p>
              <p className="text-sm opacity-70 mt-2">
                Enviamos um e-mail de confirmação para <strong>{email}</strong>. Confirme para poder entrar.
              </p>
              <button onClick={() => { setSignupDone(false); switchMode("login"); }} className="text-sm font-bold underline mt-3" style={{ color: BRAND.tealDark }}>
                Voltar para o login
              </button>
            </div>
          ) : resetSent ? (
            <div className="text-center py-4">
              <p className="font-bold" style={{ color: BRAND.tealDark }}>E-mail enviado!</p>
              <p className="text-sm opacity-70 mt-2">
                Mandamos um link de redefinição de senha para <strong>{email}</strong>. Abra o e-mail e siga as instruções pra criar uma senha nova.
              </p>
              <button onClick={() => { setResetSent(false); switchMode("login"); }} className="text-sm font-bold underline mt-3" style={{ color: BRAND.tealDark }}>
                Voltar para o login
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3">
              {mode === "signup" && (
                <div>
                  <label className="text-xs font-bold opacity-60">Nome completo</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Seu nome" />
                </div>
              )}
              <div>
                <label className="text-xs font-bold opacity-60">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="voce@email.com" />
              </div>
              {mode !== "forgot" && (
                <div>
                  <label className="text-xs font-bold opacity-60">Senha</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 rounded-xl px-3 py-2 outline-none" style={inputStyle} placeholder="Pelo menos 6 caracteres" />
                </div>
              )}
              {mode === "login" && (
                <button type="button" onClick={() => switchMode("forgot")} className="text-xs font-bold text-right" style={{ color: BRAND.pink }}>
                  Esqueci minha senha
                </button>
              )}
              {mode === "forgot" && (
                <p className="text-xs opacity-60">Vamos mandar um link no seu e-mail pra você criar uma senha nova.</p>
              )}
              {error && <div className="text-xs font-bold" style={{ color: "#B23A2F" }}>{error}</div>}
              <button type="submit" disabled={loading} className="w-full rounded-full py-3 font-bold mt-1 flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: BRAND.pink, color: "#fff" }}>
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link de redefinição"}
              </button>
              {mode === "forgot" ? (
                <button type="button" onClick={() => switchMode("login")} className="text-sm font-bold text-center" style={{ color: BRAND.tealDark }}>
                  Voltar para o login
                </button>
              ) : (
                <button type="button" onClick={() => switchMode(mode === "login" ? "signup" : "login")} className="text-sm font-bold text-center" style={{ color: BRAND.tealDark }}>
                  {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
