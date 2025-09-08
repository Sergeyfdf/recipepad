// src/lib/personalCache.ts
import type { Recipe } from "../App"; // или из общего types, как у тебя принято

const PERSONAL_CACHE_KEY = "recipepad.personal-cache";

export function loadPersonalCache(): Recipe[] {
  try {
    const raw = localStorage.getItem(PERSONAL_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePersonalCache(list: Recipe[]) {
  try {
    localStorage.setItem(PERSONAL_CACHE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("savePersonalCache failed", e);
  }
}
