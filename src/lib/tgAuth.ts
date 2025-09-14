const API_BASE = "https://recipepad-api.onrender.com";

export type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

export async function authWithTelegram(user: TgUser) {
  // НУЖЕН полный объект от Telegram, обязательно с id/auth_date/hash
  console.log("[tgAuth] authWithTelegram payload:", user);
  const r = await fetch(`${API_BASE}/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  // ожидается { ok, jwt, ownerId, profile }
  console.log("[tgAuth] server replied:", data);
  return data as {
    ok: boolean;
    jwt: string;
    ownerId: string; // "tg:<id>"
    profile: { username?: string; first_name?: string; photo_url?: string };
  };
}

export function getStoredAuth() {
  try { return JSON.parse(localStorage.getItem("tg.auth") || "{}"); } catch { return {}; }
}

export function logoutTelegram() {
  localStorage.removeItem("recipepad.ownerId");
  localStorage.removeItem("recipepad.jwt");
  localStorage.removeItem("tg.auth");
}
