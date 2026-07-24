import type { PagedHistoryItem } from '@/types/api';

const HISTORY_STORAGE_KEY = 'medipulse-history';

export function readHistory(): PagedHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PagedHistoryItem[];
  } catch {
    return [];
  }
}

export function writeHistory(items: PagedHistoryItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 30)));
}

export function addHistoryItem(item: Omit<PagedHistoryItem, 'id' | 'createdAt'>) {
  const items = readHistory();
  items.unshift({
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  writeHistory(items);
  return items;
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(HISTORY_STORAGE_KEY);
}