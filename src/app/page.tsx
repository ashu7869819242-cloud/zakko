"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import MenuCard from "@/components/MenuCard";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import JarvisChat from "@/components/JarvisChat";

import { MenuItem, CategoryDoc } from "@/types";

interface CanteenConfig {
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

export default function MenuPage() {
  const { user, profile, loading } = useAuth();
  const { itemCount, total } = useCart();
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [menuLoading, setMenuLoading] = useState(true);
  const [showUnavailable, setShowUnavailable] = useState(true);
  const [canteenConfig, setCanteenConfig] = useState<CanteenConfig | null>(null);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  // Real-time Firestore subscription for menu
  useEffect(() => {
    const q = query(collection(db, "menuItems"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MenuItem[];
      setMenuItems(items);
      setMenuLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time canteen config subscription
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "canteenConfig"), (snap) => {
      if (snap.exists()) {
        setCanteenConfig(snap.data() as CanteenConfig);
      }
    });
    return () => unsub();
  }, []);

  // Real-time categories subscription
  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CategoryDoc[]);
    });
    return () => unsub();
  }, []);

  // Compute minutes until canteen closes
  const getMinutesUntilClose = (): number | null => {
    if (!canteenConfig?.endTime) return null;
    const now = new Date();
    const [h, m] = canteenConfig.endTime.split(":").map(Number);
    const closeTime = new Date();
    closeTime.setHours(h, m, 0, 0);
    const diff = (closeTime.getTime() - now.getTime()) / 60000;
    return Math.max(0, Math.round(diff));
  };

  const minutesUntilClose = getMinutesUntilClose();
  const isCanteenOpen = canteenConfig?.isOpen !== false;


  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || item.category === category;
    // Only hide items by prep time if canteen is open AND closing soon
    const canPrepare = !item.preparationTime
      || minutesUntilClose === null
      || minutesUntilClose === 0
      || item.preparationTime <= minutesUntilClose;

    const matchesAvailability = showUnavailable ? true : (item.available && item.quantity > 0);

    return matchesSearch && matchesCategory && canPrepare && matchesAvailability;
  })
    .sort((a, b) => {
      // Sort by availability first
      const aAvailable = a.available && a.quantity > 0;
      const bAvailable = b.available && b.quantity > 0;
      if (aAvailable !== bAvailable) {
        return aAvailable ? -1 : 1;
      }
      return 0;
    });

  const availableCount = menuItems.filter((i) => i.available).length;

  const availableItems = filteredItems.filter(i => i.available && i.quantity > 0);
  const unavailableItems = filteredItems.filter(i => !i.available || i.quantity <= 0);

  return (
    <div className="min-h-screen bg-zayko-900 pb-24">
      {/* ... previous code remains same ... */}

      {/* ─── Menu Layout ─── */}
      <div className="page-container space-y-12">
        {menuLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-zayko-400">Loading menu...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white/5 rounded-3xl border border-white/5"
          >
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-display font-bold text-white mb-2">No items found</h3>
            <p className="text-zayko-400">
              {search ? `No results for "${search}"` : "The menu is empty right now"}
            </p>
          </motion.div>
        ) : (
          <>
            {/* Available Section */}
            {availableItems.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
                  <h2 className="text-2xl font-display font-bold text-white">Available Now</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {availableItems.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                    >
                      <MenuCard {...item} />
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Unavailable Section Header with Toggle */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/5 pt-10">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-zayko-400 rounded-full" />
                  <h2 className="text-2xl font-display font-bold text-white">Not Available</h2>
                </div>

                <label className="relative inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showUnavailable}
                    onChange={() => setShowUnavailable(!showUnavailable)}
                  />
                  <div className="w-11 h-6 bg-zayko-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500 shadow-inner"></div>
                  <span className="ms-3 text-sm font-medium text-zayko-300 group-hover:text-gold-400 transition-colors">Show unavailable items</span>
                </label>
              </div>

              {showUnavailable && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 opacity-80">
                  {unavailableItems.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                    >
                      <MenuCard {...item} />
                    </motion.div>
                  ))}
                  {unavailableItems.length === 0 && (
                    <p className="text-zayko-400 italic text-sm py-4">All items are available! 🎉</p>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ─── Floating Cart Bar ─── */}
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-40"
          >
            <Link
              href="/cart"
              className="flex items-center justify-between gap-6 bg-gradient-to-r from-gold-500 to-gold-400 text-zayko-900 px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(251,191,36,0.3)] hover:shadow-[0_15px_50px_rgba(251,191,36,0.4)] transition-all hover:scale-[1.02] active:scale-95"
            >
              <div className="flex items-center gap-3">
                <span className="bg-zayko-900/20 w-10 h-10 rounded-xl flex items-center justify-center text-lg">
                  🛒
                </span>
                <div>
                  <p className="font-bold">{itemCount} item{itemCount > 1 ? "s" : ""}</p>
                  <p className="text-xs text-zayko-900/70">View your cart</p>
                </div>
              </div>
              <span className="font-display font-bold text-lg">₹{total}</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jarvis AI Assistant */}
      <JarvisChat />
    </div>
  );
}
