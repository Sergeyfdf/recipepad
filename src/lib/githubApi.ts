// src/lib/githubApi.ts
import { getGhToken } from './githubToken';

const DEFAULT_BRANCH = 'main'; // если у тебя master — поставь 'master'

function toBase64Utf8(s: string) {
  return btoa(unescape(encodeURIComponent(s)));
}
function fromBase64Utf8(b64: string) {
  return decodeURIComponent(escape(atob(b64)));
}

// GET file (contents API)
export async function ghGetFile(owner: string, repo: string, path: string, branch = DEFAULT_BRANCH) {
  const token = getGhToken();
  const url =
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}` +
    `?ref=${encodeURIComponent(branch)}&nocache=${Date.now()}`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      ...(token ? { 'Authorization': `token ${token}` } : {})
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET ${res.status} ${text}`);
  }

  const data = await res.json();
  const content = fromBase64Utf8((data.content || '').replace(/\n/g, ''));
  return { sha: data.sha as string, content, branch: data?.branch ?? branch };
}

// PUT file (create/update)
export async function ghPutFile(
  owner: string,
  repo: string,
  path: string,
  jsonObj: any,
  message: string,
  sha?: string,
  branch = DEFAULT_BRANCH
) {
  const token = getGhToken();
  if (!token) throw new Error('Нет GitHub токена (PAT не сохранён).');

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const body = {
    message,
    content: toBase64Utf8(JSON.stringify(jsonObj, null, 2)),
    branch,
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'Authorization': `token ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // пробрасываем реальный ответ GitHub — сразу видно, что не так
    throw new Error(`PUT ${res.status} ${text}`);
  }

  return res.json();
}
