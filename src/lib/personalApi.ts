// src/lib/personalApi.ts
import type { Recipe } from "../App"; // или свой тип, откуда он у тебя экспортится

const API = "https://recipepad-api.onrender.com";

function authHeaders(): Record<string, string> {
  const ownerId = localStorage.getItem("recipepad.ownerId") || "";
  const jwt = localStorage.getItem("recipepad.jwt") || "";
  const h: Record<string, string> = { Accept: "application/json" };
  if (ownerId) h["X-Owner-Id"] = ownerId;
  if (jwt) h["Authorization"] = `Bearer ${jwt}`;
  return h;
}

export async function listPersonalRecipes() {
  const owner = localStorage.getItem("recipepad.ownerId") || "";
  const jwt   = localStorage.getItem("recipepad.jwt") || "";

  const headers: Record<string,string> = { "X-Owner-Id": owner };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const r = await fetch(`${API}/local/recipes`, { headers });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function putPersonalRecipe(rec: any) {
  const owner = localStorage.getItem("recipepad.ownerId") || "";
  const jwt   = localStorage.getItem("recipepad.jwt") || "";
  const headers: Record<string,string> = {
    "Content-Type":"application/json",
    "X-Owner-Id": owner
  };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;

  const r = await fetch(`${API}/local/recipes/${encodeURIComponent(rec.id)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ recipe: rec }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function deletePersonalRecipe(id: string) {
  const r = await fetch(`${API}/local/recipes/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function bulkUploadPersonal(list: Recipe[]) {
  const r = await fetch(`${API}/local/recipes/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ recipes: list }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
