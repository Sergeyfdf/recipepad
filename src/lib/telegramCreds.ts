// src/lib/telegramCreds.ts
import { ghGetFile } from '../lib/githubApi';

const OWNER = 'Sergeyfdf';
const REPO  = 'recipepad-settings';
const PATH  = 'telegram.json';

export type TelegramCreds = { botToken: string; chatId: string };

let cache: TelegramCreds | null = null;

export async function loadTelegramCreds(): Promise<TelegramCreds | null> {
  if (cache) return cache;
  try {
    const { content } = await ghGetFile(OWNER, REPO, PATH);
    const data = JSON.parse(content);
    if (typeof data.botToken === 'string' && typeof data.chatId === 'string') {
      cache = { botToken: data.botToken, chatId: data.chatId };
      return cache;
    }
    return null;
  } catch (e) {
    console.error('Не удалось прочитать telegram.json из репо:', e);
    return null;
  }
}
