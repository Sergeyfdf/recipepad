const GH_PAT_KEY = 'recipepad.gh_pat';

export const getGhToken = () => {
  try { return localStorage.getItem(GH_PAT_KEY); } catch { return null; }
};
export const setGhToken = (t: string) => {
  try { localStorage.setItem(GH_PAT_KEY, t.trim()); } catch {}
};
export const clearGhToken = () => {
  try { localStorage.removeItem(GH_PAT_KEY); } catch {}
};
