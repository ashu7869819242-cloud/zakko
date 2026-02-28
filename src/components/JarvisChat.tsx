"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface ChatMessage {
    role: "assistant" | "user" | "system";
    content: string;
    timestamp: number;
}

export default function JarvisChat() {
    const { user, profile, getIdToken } = useAuth();
    const { items, total, clearCart } = useCart();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [processing, setProcessing] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initial Greeting
    useEffect(() => {
        if (open && messages.length === 0) {
            const firstName = profile?.name?.split(" ")[0] || "Buddy";
            setMessages([
                {
                    role: "assistant",
                    content: `Namaste ${firstName}! 🙏 Main hoon Jarvis, aapka personal Zayko AI Assistant.\n\nAap mujhse canteen ke baare mein kuch bhi pooch sakte hain Hinglish mein, jaise:\n• "Aaj menu mein kya hai?"\n• "Mera wallet balance kya hai?"\n• "1 tea aur 2 samosa order kar do."`,
                    timestamp: Date.now(),
                },
            ]);
        }
    }, [open, profile, messages.length]);

    // Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input on open
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [open]);

    const handleSend = async (action?: string) => {
        const text = input.trim();
        if ((!text && !action) || processing) return;

        const userMsg = text || (action === "confirm_order" ? "Confirm Order" : "");
        if (userMsg) {
            setMessages(prev => [...prev, { role: "user", content: userMsg, timestamp: Date.now() }]);
        }

        setInput("");
        setProcessing(true);

        try {
            const token = await getIdToken();
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    messages: messages.concat(userMsg ? [{ role: "user", content: userMsg, timestamp: Date.now() }] : []),
                    cart: items,
                    userProfile: profile,
                    action: action || "chat"
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessages(prev => [...prev, { role: "assistant", content: data.message, timestamp: Date.now() }]);

                // If the AI confirms the order, we might need a special UI or action
                if (data.action === "order_placed") {
                    toast.success("Order placed via AI! 🎉");
                    clearCart();
                }
            } else {
                toast.error(data.error || "AI is taking a break...");
                setMessages(prev => [...prev, { role: "assistant", content: "Sorry, server side kuch issue hai. Kripya bad mein try karein! 🙏", timestamp: Date.now() }]);
            }
        } catch (err) {
            console.error("Jarvis Error:", err);
            toast.error("Connection lost");
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
                className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-zayko-950 shadow-[0_8px_30px_rgba(251,191,36,0.4)] flex items-center justify-center text-3xl hover:scale-110 active:scale-95 transition-all border border-white/20"
                whileTap={{ scale: 0.9 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            >
                {open ? (
                    <span className="text-xl">✕</span>
                ) : (
                    <motion.span
                        animate={{
                            rotate: [0, -10, 10, -10, 10, 0],
                        }}
                        transition={{ repeat: Infinity, duration: 4, repeatDelay: 2 }}
                    >
                        🤖
                    </motion.span>
                )}
                {/* Notification Badge if needed */}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zayko-900 animate-pulse"></div>
            </motion.button>

            {/* Chat Panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.9, transformOrigin: "bottom right" }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.9 }}
                        className="fixed bottom-40 right-4 left-4 sm:left-auto sm:right-6 z-50 sm:w-[380px] h-[550px] max-h-[80vh] flex flex-col rounded-3xl overflow-hidden border border-white/[0.08] shadow-[0_32px_64px_rgba(0,0,0,0.6)] bg-zayko-900/90 backdrop-blur-2xl"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-white/[0.06] bg-gradient-to-r from-gold-400/10 to-transparent flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-2xl shadow-lg shadow-gold-500/20">
                                        🤖
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-zayko-900 rounded-full"></span>
                                </div>
                                <div>
                                    <h3 className="font-display font-black text-white text-base tracking-tight italic">JARVIS <span className="text-[10px] bg-gold-400/20 text-gold-400 px-1.5 py-0.5 rounded ml-1 not-italic">AI</span></h3>
                                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest leading-none mt-1">Ready to assist</p>
                                </div>
                            </div>
                            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zayko-400 hover:text-white transition-colors">✕</button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === "user"
                                            ? "bg-gold-500 text-zayko-950 font-bold rounded-tr-sm"
                                            : "bg-white/5 border border-white/[0.08] text-zayko-100 rounded-tl-sm"
                                        }`}>
                                        {msg.content.split("\n").map((line, idx) => (
                                            <p key={idx} className={idx > 0 ? "mt-1" : ""}>{line}</p>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                            {processing && (
                                <div className="flex justify-start">
                                    <div className="bg-white/5 border border-white/[0.08] px-4 py-3 rounded-2xl rounded-tl-sm">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                            <span className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                            <span className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-zayko-800/50 border-t border-white/[0.06]">
                            <div className="relative group">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Order 2 masala dosa..."
                                    className="w-full bg-white/5 border border-white/[0.1] rounded-2xl py-4 pl-5 pr-14 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/30 transition-all placeholder:text-zayko-600 font-medium"
                                    disabled={processing}
                                />
                                <button
                                    onClick={() => handleSend()}
                                    disabled={processing || !input.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-gold-400 text-zayko-900 flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:grayscale"
                                >
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-[9px] text-center text-zayko-600 mt-3 font-black uppercase tracking-[0.2em]">Powered by Zayko AI Core</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
