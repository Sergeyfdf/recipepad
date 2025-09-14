// src/lib/auth.ts
export type TelegramAuthData = {
    id: number; first_name?: string; last_name?: string;
    username?: string; photo_url?: string; auth_date: string; hash: string;
  };
  
  const OWNER_KEY = "recipepad.ownerId";
  const JWT_KEY   = "recipepad.jwt";
  
  export function getOwnerId(): string | null {
    return localStorage.getItem(OWNER_KEY);
  }
  export function getJWT(): string | null {
    return localStorage.getItem(JWT_KEY);
  }
  
  export async function authWithTelegram(data: TelegramAuthData) {
    const resp = await fetch(`${import.meta.env.VITE_API_BASE || 'https://recipepad-api.onrender.com'}/auth/telegram`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const j = await resp.json();
    if (!resp.ok || !j?.ok) throw new Error(j?.error || "auth_failed");
  
    localStorage.setItem(OWNER_KEY, j.ownerId);
    if (j.jwt) localStorage.setItem(JWT_KEY, j.jwt);
    return j;
  }
  