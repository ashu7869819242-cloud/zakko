"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getMySuggestions, submitSuggestion } from "@/services/itemSuggestionService";
import toast from "react-hot-toast";
import Link from "next/link";

interface SuggestionLocal {
    id: string;
    itemName: string;
    category?: string;
    description?: string;
    expectedPrice?: number;
    totalRequests: number;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-emerald-500/20 text-emerald-400",
    rejected: "bg-red-500/20 text-red-400",
};
const STATUS_ICON: Record<string, string> = { pending: "⏳", approved: "✅", rejected: "❌" };

export default function SuggestItemPage() {
    const { user, loading, getIdToken } = useAuth();
    const router = useRouter();

    const [suggestions, setSuggestions] = useState<SuggestionLocal[]>([]);
    const [sugLoading, setSugLoading] = useState(true);

    // Form state
    const [itemName, setItemName] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [expectedPrice, setExpectedPrice] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("/auth");
    }, [user, loading, router]);

    const fetchSuggestions = useCallback(async () => {
        const token = await getIdToken();
        if (!token) return;
        setSugLoading(true);
        try {
            const res = await getMySuggestions(token);
            if (res.success) setSuggestions(res.suggestions as SuggestionLocal[]);
        } catch {
            toast.error("Failed to load suggestions");
        }
        setSugLoading(false);
    }, [getIdToken]);

    useEffect(() => {
        if (user) fetchSuggestions();
    }, [user, fetchSuggestions]);

    const handleSubmit = async () => {
        if (!itemName.trim() || itemName.trim().length < 2) {
            return toast.error("Enter an item name (min 2 characters)");
        }

        setSubmitting(true);
        const token = await getIdToken();
        if (!token) { setSubmitting(false); return; }

        try {
            const data: { itemName: string; category?: string; description?: string; expectedPrice?: number } = {
                itemName: itemName.trim(),
            };
            if (category.trim()) data.category = category.trim();
            if (description.trim()) data.description = description.trim();
            if (expectedPrice && Number(expectedPrice) > 0) data.expectedPrice = Number(expectedPrice);

            const res = await submitSuggestion(token, data);

            if (res.success) {
                if (res.action === "created") {
                    toast.success("Suggestion submitted! 💡");
                } else {
                    toast.success("Your vote has been added! 👍");
                }
                setItemName("");
                setCategory("");
                setDescription("");
                setExpectedPrice("");
                fetchSuggestions();
            } else if (res.alreadyRequested) {
                toast.error("You already suggested this item");
            } else {
                toast.error(res.error || "Failed to submit");
            }
        } catch {
            toast.error("Something went wrong");
        }
        setSubmitting(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zayko-900 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zayko-900 pb-24">
            {/* Header */}
            <div className="bg-zayko-800 border-b border-zayko-700 px-6 py-4">
                <div className="max-w-3xl mx-auto flex items-center gap-3">
                    <Link href="/" className="text-zayko-400 hover:text-white transition-colors">← Back</Link>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">💡</div>
                    <div>
                        <h1 className="text-lg font-display font-bold text-white">Suggest an Item</h1>
                        <p className="text-xs text-zayko-400">Request items you&apos;d like the canteen to stock</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-6 space-y-8">
                {/* ─── Submission Form ─── */}
                <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-6 animate-fade-in">
                    <h2 className="text-base font-display font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-sm">✨</span>
                        Submit Suggestion
                    </h2>

                    <div className="space-y-4">
                        {/* Item Name */}
                        <div>
                            <label className="text-xs text-zayko-400 block mb-1">Item Name *</label>
                            <input
                                type="text"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                placeholder="e.g. Masala Dosa, Cold Coffee…"
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-zayko-500 focus:outline-none focus:ring-2 focus:ring-gold-400"
                            />
                        </div>

                        {/* Category & Price row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-zayko-400 block mb-1">Category (optional)</label>
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="e.g. Snacks, Beverages…"
                                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-zayko-500 focus:outline-none focus:ring-2 focus:ring-gold-400"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-zayko-400 block mb-1">Expected Price (optional)</label>
                                <input
                                    type="number"
                                    value={expectedPrice}
                                    onChange={(e) => setExpectedPrice(e.target.value)}
                                    placeholder="₹"
                                    min={0}
                                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-zayko-500 focus:outline-none focus:ring-2 focus:ring-gold-400"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs text-zayko-400 block mb-1">Description (optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Any details about the item…"
                                rows={2}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-zayko-500 focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="btn-gold w-full py-3 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-zayko-900 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>Submit Suggestion 🚀</>
                            )}
                        </button>
                    </div>

                    {/* Info */}
                    <p className="text-xs text-zayko-500 mt-3 text-center">
                        If someone already suggested this item, your vote will be added instead.
                    </p>
                </div>

                {/* ─── My Suggestions ─── */}
                <div>
                    <h2 className="text-base font-display font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-sm">📋</span>
                        My Suggestions
                    </h2>

                    {sugLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : suggestions.length === 0 ? (
                        <div className="bg-zayko-800/30 border border-zayko-700 rounded-2xl p-8 text-center">
                            <div className="text-4xl mb-3">📭</div>
                            <p className="text-zayko-400">No suggestions yet. Suggest an item above!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {suggestions.map((s) => (
                                <div key={s.id} className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4 animate-slide-up">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-bold text-white">{s.itemName}</span>
                                                {s.category && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                                                        {s.category}
                                                    </span>
                                                )}
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[s.status]}`}>
                                                    {STATUS_ICON[s.status]} {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                                                </span>
                                            </div>
                                            {s.description && (
                                                <p className="text-xs text-zayko-400 mt-0.5 line-clamp-1">{s.description}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-zayko-500">
                                                <span>👥 {s.totalRequests} request{s.totalRequests !== 1 ? "s" : ""}</span>
                                                {s.expectedPrice && <span>💰 ₹{s.expectedPrice}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
