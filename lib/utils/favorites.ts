export type FavoriteProduct = {
  id: number | string;
  title: string;
  price: number;
  image?: string;
  category?: string;
  raw?: any;
};

const STORAGE_KEY = "mupi_favorites_v1";

export function getFavorites(): FavoriteProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FavoriteProduct[];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: FavoriteProduct[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    // ignore write failures
  }
}

export function isProductFavorited(id: number | string) {
  return getFavorites().some((item) => String(item.id) === String(id));
}

export function toggleFavorite(product: FavoriteProduct) {
  if (typeof window === "undefined") return;
  const favorites = getFavorites();
  const exists = favorites.find((item) => String(item.id) === String(product.id));
  const next = exists
    ? favorites.filter((item) => String(item.id) !== String(product.id))
    : [...favorites, product];
  saveFavorites(next);
}

export function removeFavorite(id: number | string) {
  if (typeof window === "undefined") return;
  const favorites = getFavorites();
  const next = favorites.filter((item) => String(item.id) !== String(id));
  saveFavorites(next);
}
