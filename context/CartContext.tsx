// src/context/CartContext.tsx
"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: number | string;
  title: string;
  price: number;
  image?: string;
  quantity: number;
  // optional raw product payload
  meta?: Record<string, any>;
};

type CartState = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (product: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (id: CartItem["id"]) => void;
  increase: (id: CartItem["id"], by?: number) => void;
  decrease: (id: CartItem["id"], by?: number) => void;
  setQuantity: (id: CartItem["id"], quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "nextmarket_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // hydrate from localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const totalItems = useMemo(() => items.reduce((s, it) => s + it.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((s, it) => s + it.price * it.quantity, 0), [items]);

  const findIndex = (id: CartItem["id"]) => items.findIndex((i) => i.id === id);

  const addItem = (product: Omit<CartItem, "quantity">, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === product.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, { ...product, quantity: Math.max(1, qty) }];
    });
  };

  const removeItem = (id: CartItem["id"]) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const increase = (id: CartItem["id"], by = 1) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: Math.max(0, it.quantity + by) } : it))
    );
  };

  const decrease = (id: CartItem["id"], by = 1) => {
    setItems((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, quantity: Math.max(0, it.quantity - by) } : it))
        .filter((it) => it.quantity > 0)
    );
  };

  const setQuantity = (id: CartItem["id"], quantity: number) => {
    const q = Math.max(0, Math.floor(quantity));
    setItems((prev) => {
      if (q === 0) return prev.filter((it) => it.id !== id);
      return prev.map((it) => (it.id === id ? { ...it, quantity: q } : it));
    });
  };

  const clearCart = () => setItems([]);

  const value: CartContextValue = {
    items,
    totalItems,
    totalPrice,
    addItem,
    removeItem,
    increase,
    decrease,
    setQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}