import { CartItem } from '../types/catalog';

const CART_STORAGE_KEY = 'parfumerie_elkhalifi_cart_v1';

export function loadCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        Boolean(
          item &&
            typeof item.key === 'string' &&
            typeof item.id === 'string' &&
            typeof item.title === 'string' &&
            typeof item.unitPrice === 'number' &&
            typeof item.quantity === 'number' &&
            item.quantity > 0
        )
    );
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}
