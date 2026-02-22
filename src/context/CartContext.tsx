/**
 * CartContext — Shopping cart state management
 * 
 * UX FIX: Cart is now persisted to localStorage so items survive page refreshes.
 */

"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    maxQuantity: number;
    category: string;
    image?: string;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    total: number;
    itemCount: number;
}

const CartContext = createContext<CartContextType>({
    items: [],
    addItem: () => { },
    removeItem: () => { },
    updateQuantity: () => { },
    clearCart: () => { },
    total: 0,
    itemCount: 0,
});

const CART_STORAGE_KEY = "canteen_cart";

export function CartProvider({ children }: { children: ReactNode }) {
    // UX FIX: Initialize cart from localStorage to survive page refreshes
    const [items, setItems] = useState<CartItem[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // UX FIX: Persist cart to localStorage on every change
    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch {
            // localStorage might be full or unavailable — silently ignore
        }
    }, [items]);

    const addItem = useCallback((item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.id === item.id);
            if (existing) {
                if (existing.quantity >= existing.maxQuantity) return prev;
                return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
            }
            return [...prev, { ...item, quantity: item.quantity || 1 }];
        });
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
    }, []);

    const updateQuantity = useCallback((id: string, quantity: number) => {
        if (quantity <= 0) {
            setItems((prev) => prev.filter((i) => i.id !== id));
        } else {
            setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(quantity, i.maxQuantity) } : i)));
        }
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        try {
            localStorage.removeItem(CART_STORAGE_KEY);
        } catch {
            // Silently ignore
        }
    }, []);

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
