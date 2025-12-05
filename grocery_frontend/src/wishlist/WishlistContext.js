import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * WishlistProvider persists a set of product IDs as favorites in localStorage and provides helpers.
 */
const WishlistContext = createContext({
  favorites: new Set(),
  isFavorite: (_id) => false,
  toggle: (_id) => {},
  add: (_id) => {},
  remove: (_id) => {},
  clear: () => {},
});

const LS_KEY = "wishlist_product_ids";

// PUBLIC_INTERFACE
export function WishlistProvider({ children }) {
  /** Provides localStorage-backed wishlist state and actions. */
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(Array.from(favorites)));
    } catch {
      // ignore persistence errors
    }
  }, [favorites]);

  const api = useMemo(() => {
    const isFavorite = (id) => favorites.has(Number(id));
    const add = (id) =>
      setFavorites((prev) => {
        const s = new Set(prev);
        s.add(Number(id));
        return s;
      });
    const remove = (id) =>
      setFavorites((prev) => {
        const s = new Set(prev);
        s.delete(Number(id));
        return s;
      });
    const toggle = (id) => (isFavorite(id) ? remove(id) : add(id));
    const clear = () => setFavorites(new Set());
    return { isFavorite, add, remove, toggle, clear };
  }, [favorites]);

  const value = { favorites, ...api };
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

// PUBLIC_INTERFACE
export function useWishlist() {
  /** Hook to access wishlist API. */
  return useContext(WishlistContext);
}
