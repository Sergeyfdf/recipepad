import { useNavigate } from "react-router-dom";

const BOT_NAME = "recipepad_bot"; // без @

export default function TelegramAuthPage() {
  const navigate = useNavigate();
  return (
    <div style={{
      height: "100vh", display: "flex", justifyContent: "center",
      alignItems: "center", background: "#0d1117"
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ color: "white", marginBottom: "2rem" }}>Добро пожаловать</h1>

        <button
          style={btn("#229ED9")}
          onClick={() => navigate("/login")}
        >Войти</button>
        <br />
        <button
          style={btn("#2ea043")}
          onClick={() => window.open(`https://t.me/${BOT_NAME}?start=register`, "_blank")}
        >Регистрация через Telegram</button>
      </div>
    </div>
  );
}
const btn = (bg: string) => ({
  background: bg, border: "none", borderRadius: "12px",
  padding: "1rem 2rem", fontSize: "1.2rem", color: "white",
  cursor: "pointer", width: "280px", marginBottom: "1rem"
});
