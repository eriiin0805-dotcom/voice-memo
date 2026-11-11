const KEY = "voice-memo:v1";

export class StorageError extends Error {}

function makeId() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function loadMemos(storage) {
  try {
    const list = JSON.parse(storage.getItem(KEY) || "[]");
    if (!Array.isArray(list)) return [];
    return list
      .filter((m) => m && typeof m.text === "string")
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function save(storage, memos) {
  try {
    storage.setItem(KEY, JSON.stringify(memos));
  } catch (e) {
    throw new StorageError("保存できませんでした");
  }
}

export function addMemo(storage, text, now = Date.now()) {
  const clean = String(text ?? "").trim();
  if (!clean) return null;
  const memo = { id: makeId(), text: clean, createdAt: now };
  save(storage, [memo, ...loadMemos(storage)]);
  return memo;
}

export function updateMemo(storage, id, text) {
  const clean = String(text ?? "").trim();
  const memos = loadMemos(storage);
  const target = memos.find((m) => m.id === id);
  if (!target || !clean) return null;
  target.text = clean;
  save(storage, memos);
  return target;
}

export function deleteMemo(storage, id) {
  save(storage, loadMemos(storage).filter((m) => m.id !== id));
}

export function searchMemos(memos, query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return memos;
  return memos.filter((m) => m.text.toLowerCase().includes(q));
}
