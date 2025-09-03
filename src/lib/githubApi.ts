// src/lib/githubApi.ts
import { getGhToken } from './githubToken';

const apiBase = 'https://api.github.com';

// корректная кодировка UTF-8 <-> base64
const utf8ToBase64 = (str: string) => btoa(unescape(encodeURIComponent(str)));
const base64ToUtf8 = (b64: string) => decodeURIComponent(escape(atob(b64)));

// api: чтение файла из репо
export async function ghGetFile(owner: string, repo: string, path: string) {
  const token = getGhToken();
  const res = await fetch(
    `${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        // Для PAT допустимы и 'token', и 'Bearer'
        ...(token ? { Authorization: `token ${token}` } : {}),
      },
      cache: 'no-store',
    }
  );
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const data = await res.json();
  const raw = base64ToUtf8((data.content || '').replace(/\n/g, ''));
  return { sha: data.sha as string, content: raw };
}

// api: запись/обновление файла (коммит)
export async function ghPutFile(
  owner: string,
  repo: string,
  path: string,
  jsonObj: any,
  message: string,
  sha?: string
) {
  const token = getGhToken();
  if (!token) throw new Error('Нет GitHub токена');

  const body = {
    message,
    content: utf8ToBase64(JSON.stringify(jsonObj, null, 2)),
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(
    `${apiBase}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
    {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        Authorization: `token ${token}`,
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`PUT ${res.status}`);
  return res.json();
}
