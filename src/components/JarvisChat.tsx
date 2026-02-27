"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import { parseNaturalLanguage, fuzzyMatchItem, ParsedItem } from "@/lib/jarvis-parser";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase";

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    available: boolean;
    quantity: number;
}

interface ChatMessage {
    role: "jarvis" | "user";
    text: string;
    timestamp: number;
}

export default function JarvisChat() {
    const { user, profile } = useAuth();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [processing, setProcessing] = useState(false);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load menu items in real-time
    useEffect(() => {
        const q = query(collection(db, "menuItems"));
        const unsub = onSnapshot(q, (snap) => {
            setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as MenuItem[]);
        });
        return () => unsub();
    }, []);

    // Greeting on open
    useEffect(() => {
        if (open && messages.length === 0) {
            const name = profile?.name?.split(" ")[0] || "there";
            addJarvisMessage(`Hey ${name}! 👋 Bataiye kya order karu? \n\nAap naturally bol sakte ho jaise:\n• "2 momos add karo"\n• "milk 1 packet de do"\n• "1 boil egg aur 2 upma"`);
        }
    }, [open, profile]);

    // Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input on open
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 200);
    }, [open]);

    const addJarvisMessage = useCallback((text: string) => {
        setMessages(prev => [...prev, { role: "jarvis", text, timestamp: Date.now() }]);
    }, []);

    const addUserMessage = useCallback((text: string) => {
        setMessages(prev => [...prev, { role: "user", text, timestamp: Date.now() }]);
    }, []);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || processing) return;

        setInput("");
        addUserMessage(text);
        setProcessing(true);

        try {
            // 1. Parse natural language
            const parsed = parseNaturalLanguage(text);

            if (parsed.length === 0) {
                addJarvisMessage("🤔 Samajh nahi aaya. Kuch aisa boliye:\n\"2 momos add karo\" ya \"milk 1 de do\"");
                setProcessing(false);
                return;
            }

            // 2. Match parsed items against menu
            const matchedItems: { menuItem: MenuItem; quantity: number; parsed: ParsedItem }[] = [];
            const notFound: string[] = [];

            for (const p of parsed) {
                const available = menuItems.filter(m => m.available && m.quantity > 0);
                const match = fuzzyMatchItem(p.rawName, available);

                if (match) {
                    // Check if quantity is available
                    if (p.quantity > match.quantity) {
                        addJarvisMessage(
                            `⚠️ **${match.name}** mein sirf ${match.quantity} available hai, aapne ${p.quantity} maanga. Kam quantity try karo!`
                        );
                        setProcessing(false);
                        return;
                    }
                    matchedItems.push({ menuItem: match, quantity: p.quantity, parsed: p });
                } else {
                    notFound.push(p.rawName);
                }
            }

            if (notFound.length > 0 && matchedItems.length === 0) {
                addJarvisMessage(
                    `❌ "${notFound.join(", ")}" menu mein nahi mila. Available items check karo menu se!`
                );
                setProcessing(false);
                return;
            }

            if (notFound.length > 0) {
                addJarvisMessage(
                    `⚠️ "${notFound.join(", ")}" nahi mila, baaki items order kar raha hu...`
                );
            }

            // 3. Calculate total
            const total = matchedItems.reduce((sum, m) => sum + m.menuItem.price * m.quantity, 0);
            const walletBalance = profile?.walletBalance || 0;

            if (walletBalance < total) {
                addJarvisMessage(
                    `💳 Wallet balance insufficient!\nOrder total: ₹${total}\nWallet: ₹${walletBalance}\n\nPehle wallet recharge karo.`
                );
                setProcessing(false);
                return;
            }

            // 4. Show confirmation preview
            const itemLines = matchedItems
                .map(m => `  • ${m.menuItem.name} × ${m.quantity} = ₹${m.menuItem.price * m.quantity}`)
                .join("\n");

            addJarvisMessage(
                `🛒 Order ready:\n${itemLines}\n\n💰 Total: ₹${total}\n\nPlacing order...`
            );

            // 5. Place order via existing API
            const token = await auth.currentUser?.getIdToken();
            const orderItems = matchedItems.map(m => ({
                id: m.menuItem.id,
                name: m.menuItem.name,
                price: m.menuItem.price,
                quantity: m.quantity,
                category: m.menuItem.category,
            }));

            const res = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    userId: user?.uid,
                    items: orderItems,
                    total,
                    userName: profile?.name || "Unknown",
                    userEmail: user?.email || "Unknown",
                }),
            });

            const data = await res.json();

            if (res.ok) {
                addJarvisMessage(
                    `✅ Order placed successfully! 🎉\n\n🆔 Order ID: #${data.orderId}\n💰 ₹${total} deducted from wallet\n\nAapka order jaldi ready hoga! 🍽️`
                );
            } else {
                addJarvisMessage(`❌ Order fail: ${data.error || "Unknown error"}\n\nDubara try karo!`);
            }
        } catch (err) {
            console.error("Jarvis order error:", err);
            addJarvisMessage("⚠️ Kuch gadbad ho gayi. Dubara try karo!");
        } finally {
            setProcessing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!user) return null;

    return (
        <>
            {/* Floating Trigger Button */}
            <motion.button
                onClick={() => setOpen(!open)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 text-zayko-900 shadow-[0_5px_30px_rgba(251,191,36,0.4)] flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-transform"
                whileTap={{ scale: 0.9 }}
                title="Jarvis AI Assistant"
            >
                {open ? "✕" : "🤖"}
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] max-h-[70vh] flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-[rgba(10,22,40,0.95)] backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-gradient-to-r from-gold-500/10 to-transparent">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-500 flex items-center justify-center text-xl shadow-lg">
                                🤖
                            </div>
                            <div className="flex-1">
                                <h3 className="font-display font-bold text-white text-sm">Jarvis</h3>
                                <p className="text-xs text-emerald-400">● Online — AI Assistant</p>
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-zayko-400 hover:text-white transition-colors text-xl"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[200px] max-h-[50vh]">
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                                            ? "bg-gold-500/20 text-gold-100 border border-gold-500/20 rounded-br-md"
                                            : "bg-white/5 text-zayko-200 border border-white/5 rounded-bl-md"
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </motion.div>
                            ))}
                            {processing && (
                                <div className="flex justify-start">
                                    <div className="bg-white/5 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-md">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="px-4 py-3 border-t border-white/10 bg-zayko-900/50">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="e.g. 2 momos aur 1 milk..."
                                    disabled={processing}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zayko-500 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-400/50 disabled:opacity-50 transition-all"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={processing || !input.trim()}
                                    className="p-3 rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 text-zayko-900 font-bold hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] disabled:opacity-40 transition-all active:scale-95"
                                >
                                    ➤
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
