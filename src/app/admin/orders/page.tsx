"use client";
import React, { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import toast from "react-hot-toast";
import { useCountdown } from "@/hooks/useCountdown";

interface OrderItem {
    name: string;
    price: number;
    quantity: number;
}

interface AdminOrder {
    id: string;
    orderId: string;
    userName: string;
    userEmail: string;
    items: OrderItem[];
    total: number;
    status: string;
    prepTime?: number;
    estimatedReadyAt?: string;
    readyAt?: string;
    createdAt: string;
}

const STATUS_OPTIONS = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];
const PREP_TIMES = [5, 10, 15, 20, 30];

const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    preparing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    ready: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    completed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

/* ─── Admin Countdown Display ────────────────────────────── */
function AdminCountdown({ readyAt }: { readyAt?: string }) {
    const { formatted, isExpired, totalSeconds } = useCountdown(readyAt);
    if (!readyAt) return null;
    if (isExpired) return <span className="text-emerald-400 text-xs font-semibold">⏰ Time up</span>;
    return (
        <span className={`text-xs font-mono font-bold ${totalSeconds <= 60 ? "text-red-400 animate-pulse" : "text-orange-400"}`}>
            🕒 {formatted}
        </span>
    );
}

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [customPrepTimes, setCustomPrepTimes] = useState<Record<string, string>>({});

    // Real-time subscription
    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const orderList = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as AdminOrder[];
                setOrders(orderList);
                setLoading(false);
            },
            (error) => {
                console.error("Admin orders listener error:", error);
                toast.error("Failed to sync orders in real-time. Check connectivity.");
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, []);

    const updateOrder = async (orderId: string, data: { status?: string; prepTime?: number }) => {
        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch("/api/admin/orders", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ orderId, ...data }),
            });
            if ((await res.json()).success) {
                toast.success("Order updated!");
            }
        } catch {
            toast.error("Failed to update order");
        }
    };

    const filteredOrders = filter === "all" ? orders : orders.filter((o) => o.status === filter);
    const pendingCount = orders.filter((o) => o.status === "pending").length;
    const preparingCount = orders.filter((o) => o.status === "preparing").length;

    return (
        <AdminGuard>
            <div className="min-h-screen bg-campus-900">
                {/* Header */}
                <div className="bg-campus-800 border-b border-campus-700 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/admin/dashboard" className="text-campus-400 hover:text-white transition-colors">
                                ← Dashboard
                            </Link>
                            <h1 className="text-lg font-display font-bold text-white">📋 Orders</h1>
                            {pendingCount > 0 && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                                    {pendingCount} new
                                </span>
                            )}
                            {preparingCount > 0 && (
                                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                    {preparingCount} preparing
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto p-6">
                    {/* Status Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
                        {["all", ...STATUS_OPTIONS].map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilter(s)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap capitalize transition-all ${filter === s
                                    ? "bg-gold-500 text-campus-900"
                                    : "bg-campus-800 text-campus-400 hover:bg-campus-700"
                                    }`}
                            >
                                {s} {s !== "all" && `(${orders.filter((o) => o.status === s).length})`}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-20 text-campus-500">
                            <div className="text-5xl mb-4">📋</div>
                            <p>No orders found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrders.map((order) => (
                                <div key={order.id} className="bg-campus-800/50 border border-campus-700 rounded-2xl overflow-hidden animate-slide-up">
                                    {/* Order Header */}
                                    <div className="p-5 border-b border-campus-700">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-display font-bold text-white">#{order.orderId}</h3>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusColors[order.status] || ""}`}>
                                                        {order.status}
                                                    </span>
                                                    {/* Live countdown for confirmed/preparing orders */}
                                                    {(order.status === "preparing" || order.status === "confirmed") && (
                                                        <AdminCountdown readyAt={order.readyAt || order.estimatedReadyAt} />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-campus-400">
                                                    <span>👤 {order.userName}</span>
                                                    <span>📧 {order.userEmail}</span>
                                                    <span>🕐 {new Date(order.createdAt).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <span className="text-2xl font-display font-bold text-gold-400">₹{order.total}</span>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="p-5 border-b border-campus-700 bg-campus-800/30">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between py-1 text-sm">
                                                <span className="text-campus-300">{item.name} × {item.quantity}</span>
                                                <span className="text-campus-400">₹{item.price * item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Controls */}
                                    <div className="p-5 space-y-3">
                                        {/* Status Update */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs text-campus-500">Status:</span>
                                            {STATUS_OPTIONS.map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => updateOrder(order.id, { status: s })}
                                                    disabled={order.status === s}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${order.status === s
                                                        ? "bg-gold-500 text-campus-900"
                                                        : "bg-campus-700 text-campus-300 hover:bg-campus-600"
                                                        }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Prep Time + Mark Ready */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs text-campus-500">Prep:</span>
                                            {PREP_TIMES.map((t) => (
                                                <button
                                                    key={t}
                                                    onClick={() => updateOrder(order.id, { status: "preparing", prepTime: t })}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${order.prepTime === t && order.status === "preparing"
                                                        ? "bg-teal-500 text-white"
                                                        : "bg-campus-700 text-campus-300 hover:bg-campus-600"
                                                        }`}
                                                >
                                                    +{t}m
                                                </button>
                                            ))}

                                            {/* Custom input */}
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={120}
                                                    placeholder="min"
                                                    value={customPrepTimes[order.id] || ""}
                                                    onChange={(e) => setCustomPrepTimes((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                                    className="w-16 px-2 py-1.5 rounded-lg bg-campus-700 text-white text-xs border border-campus-600 focus:border-teal-500 focus:outline-none placeholder:text-campus-500"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const mins = Number(customPrepTimes[order.id]);
                                                        if (mins >= 1 && mins <= 120) {
                                                            updateOrder(order.id, { status: "preparing", prepTime: mins });
                                                            setCustomPrepTimes((prev) => ({ ...prev, [order.id]: "" }));
                                                        } else {
                                                            toast.error("Enter 1-120 minutes");
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 text-white hover:bg-teal-500 transition-all"
                                                >
                                                    Set
                                                </button>
                                            </div>

                                            {/* Mark Ready button */}
                                            {(order.status === "preparing" || order.status === "confirmed") && (
                                                <button
                                                    onClick={() => updateOrder(order.id, { status: "ready" })}
                                                    className="ml-auto px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/25"
                                                >
                                                    ✅ Mark Ready
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminGuard>
    );
}
