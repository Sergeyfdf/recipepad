import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const { detail } = await res.json();
        throw new Error(detail || "Ошибка входа");
      }
      const data = await res.json();
      localStorage.setItem("token", data.token);
      navigate("/app", { replace: true });
    } catch (e:any) {
      setErr(e.message);
    }
  }

  return (
    <div style={{
      height: "100vh", display: "flex", justifyContent: "center",
      alignItems: "center", background: "#0d1117", color: "white"
    }}>
      <form onSubmit={onLogin} style={{ width: 320 }}>
        <h2 style={{ marginBottom: 16 }}>Вход</h2>
        <label>Ник в Telegram</label>
        <input value={username} onChange={e=>setU(e.target.value)} required
          style={inputStyle} placeholder="например, mynickname" />
        <label>Пароль</label>
        <input type="password" value={password} onChange={e=>setP(e.target.value)} required
          style={inputStyle} placeholder="••••••" />
        {err && <div style={{ color: "#ff6b6b", marginBottom: 12 }}>{err}</div>}
        <button style={btn}>Войти</button>
      </form>
    </div>
  );
}
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", margin: "8px 0 16px",
  borderRadius: 10, border: "1px solid #30363d", background: "#161b22", color: "white"
};
const btn: React.CSSProperties = {
  width: "100%", background: "#238636", color: "white", border: "none",
  padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontSize: 16
};
