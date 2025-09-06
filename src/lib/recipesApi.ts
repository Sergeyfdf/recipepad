// src/lib/recipesApi.ts
export type Recipe = {
    id: string;
    title: string;
    description?: string;
    cover?: string;
    createdAt: number;
    favorite?: boolean;
    categories?: string[];
    done?: boolean;
    parts?: Array<{
      id: string;
      title: string;
      ingredients: string[];
      steps: string[];
    }>;
    ingredients?: string[];
    steps?: string[];
  };
  
  const API = import.meta.env.VITE_API_BASE || "https://recipepad-api.onrender.com";
  
  async function j<T>(r: Response) {
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<T>;
  }
  
  // Список всех серверных рецептов
  export function listServerRecipes() {
    return fetch(`${API}/recipes`).then(j<Recipe[]>);
  }
  
  // Выложить/обновить рецепт (upsert)
  export function putServerRecipe(recipe: Recipe) {
    return fetch(`${API}/recipes/${encodeURIComponent(recipe.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe }),
    }).then(j<{ ok: true }>);
  }
  
  // Удалить рецепт
  export function deleteServerRecipe(id: string) {
    return fetch(`${API}/recipes/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).then((r) => {
      if (!r.ok && r.status !== 204) throw new Error("Delete failed");
    });
  }
  