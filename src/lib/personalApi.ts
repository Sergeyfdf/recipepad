import { getDeviceId } from "./deviceId";

const API = "https://recipepad-api.onrender.com";
const ownerHeader = () => ({ "X-Owner-Id": getDeviceId() });

async function j<T>(r: Response) {
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}

export type Recipe = /* твой тип */ any;

export function listPersonalRecipes() {
  return fetch(`${API}/local/recipes`, { headers: ownerHeader() }).then(j<Recipe[]>);
}

export function getPersonalRecipe(id: string) {
  return fetch(`${API}/local/recipes/${id}`, { headers: ownerHeader() }).then(j<Recipe>);
}

export function putPersonalRecipe(recipe: Recipe) {
  return fetch(`${API}/local/recipes/${recipe.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...ownerHeader() },
    body: JSON.stringify({ recipe })
  }).then(j<{ ok: true }>);
}

export function deletePersonalRecipe(id: string) {
  return fetch(`${API}/local/recipes/${id}`, {
    method: "DELETE",
    headers: ownerHeader()
  }).then(() => {});
}

export function bulkUploadPersonal(recipes: Recipe[]) {
  return fetch(`${API}/local/recipes/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...ownerHeader() },
    body: JSON.stringify({ recipes })
  }).then(j<{ ok: true; count: number }>);
}
