"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

const CATEGORIES = ["Food Quality", "Service", "App Issue", "Suggestion", "Other"];
const CAT_ICONS: Record<string, string> = {
    "Food Quality": "🍽️", "Service": "🤝", "App Issue": "📱", "Suggestion": "💡", "Other": "💬",
};
const STATUS_STYLE: Record<string, string> = {
    new: "bg-yellow-500/20 text-yellow-400",
    reviewed: "bg-emerald-500/20 text-emerald-400",
};

interface FeedbackLocal {
    id: string;
    rating: number;
    category: string;
    message: string;
    status: string;
    createdAt: string;
}

export default function UserFeedbackPage() {
    const { user, loading, getIdToken } = useAuth();
    const router = useRouter();

    const [feedbacks, setFeedbacks] = useState<FeedbackLocal[]>([]);
    const [fetching, setFetching] = useState(true);

    // Form
    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("/auth");
    }, [user, loading, router]);

    const fetchFeedbacks = useCallback(async () => {
        const token = await getIdToken();
        if (!token) return;
        setFetching(true);
        try {
            const res = await fetch("/api/user-feedback", { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            if (json.success) setFeedbacks(json.feedbacks as FeedbackLocal[]);
        } catch { toast.error("Failed to load"); }
        setFetching(false);
    }, [getIdToken]);

    useEffect(() => { if (user) fetchFeedbacks(); }, [user, fetchFeedbacks]);

    const handleSubmit = async () => {
        if (!rating) return toast.error("Select a rating");
        if (!category) return toast.error("Select a category");
        if (message.trim().length < 5) return toast.error("Message too short (min 5 chars)");

        setSubmitting(true);
        const token = await getIdToken();
        if (!token) { setSubmitting(false); return; }

        try {
            const res = await fetch("/api/user-feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ rating, category, message: message.trim() }),
            });
            const json = await res.json();
            if (json.success) {
                toast.success("Feedback submitted! Thank you 🙏");
                setRating(0); setCategory(""); setMessage("");
                fetchFeedbacks();
            } else toast.error(json.error || "Failed");
        } catch { toast.error("Something went wrong"); }
        setSubmitting(false);
    };

    if (loading) return (
        <div className="min-h-screen bg-zayko-900 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-zayko-900 pb-24">
            {/* Header */}
            <div className="bg-zayko-800 border-b border-zayko-700 px-6 py-4">
                <div className="max-w-3xl mx-auto flex items-center gap-3">
                    <Link href="/" className="text-zayko-400 hover:text-white transition-colors">← Back</Link>
                    <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center text-xl">⭐</div>
                    <div>
                        <h1 className="text-lg font-display font-bold text-white">Feedback</h1>
                        <p className="text-xs text-zayko-400">Help us improve your experience</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-6 space-y-8">
                {/* ─── Submit Form ─── */}
                <div className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-6 animate-fade-in">
                    <h2 className="text-base font-display font-bold text-white mb-5 flex items-center gap-2">
                        <span className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-sm">✍️</span>
                        Submit Feedback
                    </h2>

                    {/* Rating */}
                    <div className="mb-5">
                        <label className="text-xs text-zayko-400 block mb-2">Rating</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((r) => (
                                <button key={r} onClick={() => setRating(r)}
                                    className={`w-12 h-12 rounded-xl text-2xl transition-all ${r <= rating ? "bg-gold-500/30 shadow-lg shadow-gold-500/10" : "bg-white/5 border border-white/10 hover:bg-white/10"}`}>
                                    {r <= rating ? "★" : "☆"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category */}
                    <div className="mb-4">
                        <label className="text-xs text-zayko-400 block mb-2">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                                <button key={cat} onClick={() => setCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${category === cat ? "bg-gold-500 text-zayko-900 shadow-lg shadow-gold-500/20" : "bg-white/5 text-zayko-400 border border-white/10 hover:bg-white/10"}`}>
                                    {CAT_ICONS[cat]} {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message */}
                    <div className="mb-5">
                        <label className="text-xs text-zayko-400 block mb-1">Message</label>
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)}
                            placeholder="Tell us what you think…"
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-zayko-500 focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none" />
                    </div>

                    <button onClick={handleSubmit} disabled={submitting}
                        className="btn-gold w-full py-3 flex items-center justify-center gap-2">
                        {submitting ? <div className="w-5 h-5 border-2 border-zayko-900 border-t-transparent rounded-full animate-spin"></div> : <>Submit Feedback 🚀</>}
                    </button>
                </div>

                {/* ─── My Feedbacks ─── */}
                <div>
                    <h2 className="text-base font-display font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-sm">📋</span>
                        My Feedbacks
                    </h2>

                    {fetching ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : feedbacks.length === 0 ? (
                        <div className="bg-zayko-800/30 border border-zayko-700 rounded-2xl p-8 text-center">
                            <div className="text-4xl mb-3">📭</div>
                            <p className="text-zayko-400">No feedbacks yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {feedbacks.map((f) => (
                                <div key={f.id} className="bg-zayko-800/50 border border-zayko-700 rounded-2xl p-4 animate-slide-up">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="flex text-gold-400 text-sm">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <span key={i} className={i < f.rating ? "opacity-100" : "opacity-20"}>★</span>
                                                ))}
                                            </div>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{f.category}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[f.status] || STATUS_STYLE.new}`}>
                                                {f.status === "reviewed" ? "✅ Reviewed" : "⏳ Pending"}
                                            </span>
                                        </div>
                                        <span className="text-xs text-zayko-500">{new Date(f.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-zayko-300">{f.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
