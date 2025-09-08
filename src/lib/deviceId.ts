// src/lib/deviceId.ts
const DEVICE_ID_KEY = "recipepad.deviceId";

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    // @ts-ignore — в браузере crypto.randomUUID есть
    id = (crypto as any).randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
