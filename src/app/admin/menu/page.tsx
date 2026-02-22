"use client";
import React, { useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import toast from "react-hot-toast";

interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    available: boolean;
    quantity: number;
    preparationTime?: number;
    description?: string;
}

const CATEGORIES = ["meals", "snacks", "beverages", "desserts", "other"];

export default function AdminMenuPage() {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<MenuItem | null>(null);
    const [form, setForm] = useState({
        name: "", price: "", category: "meals", quantity: "", description: "", available: true, preparationTime: "",
    });
    const [saving, setSaving] = useState(false);

    // Real-time subscription
    useEffect(() => {
        const q = query(collection(db, "menuItems"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const menuList = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as MenuItem[];
            setItems(menuList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const resetForm = () => {
        setForm({ name: "", price: "", category: "meals", quantity: "", description: "", available: true, preparationTime: "" });
        setEditItem(null);
        setShowForm(false);
    };

    const openEdit = (item: MenuItem) => {
        setEditItem(item);
        setForm({
            name: item.name,
            price: String(item.price),
            category: item.category,
            quantity: String(item.quantity),
            description: item.description || "",
            available: item.available,
            preparationTime: item.preparationTime ? String(item.preparationTime) : "",
        });
        setShowForm(true);
    };

    // SECURITY: Helper to include admin JWT in all admin API calls
    const getAdminHeaders = (contentType = true): HeadersInit => {
        const token = localStorage.getItem("adminToken");
        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
        };
        if (contentType) headers["Content-Type"] = "application/json";
        return headers;
    };

    const handleSubmit = async () => {
        if (!form.name || !form.price || !form.quantity) {
            toast.error("Name, price, and quantity are required");
            return;
        }

        setSaving(true);
        try {
            if (editItem) {
                // Update existing
                await fetch("/api/admin/menu", {
                    method: "PUT",
                    headers: getAdminHeaders(),
                    body: JSON.stringify({
                        id: editItem.id,
                        name: form.name,
                        price: Number(form.price),
                        category: form.category,
                        quantity: Number(form.quantity),
                        description: form.description,
                        available: form.available,
                        preparationTime: form.preparationTime ? Number(form.preparationTime) : 0,
                    }),
                });
                toast.success("Item updated! ✅");
            } else {
                // Add new
                await fetch("/api/admin/menu", {
                    method: "POST",
                    headers: getAdminHeaders(),
                    body: JSON.stringify({
                        name: form.name,
                        price: Number(form.price),
                        category: form.category,
                        quantity: Number(form.quantity),
                        description: form.description,
                        available: form.available,
                        preparationTime: form.preparationTime ? Number(form.preparationTime) : 0,
                    }),
                });
                toast.success("Item added! 🎉");
            }
            resetForm();
        } catch {
            toast.error("Failed to save item");
        }
        setSaving(false);
    };

    const deleteItem = async (id: string) => {
        if (!confirm("Delete this item?")) return;
        try {
            await fetch("/api/admin/menu", {
                method: "DELETE",
                headers: getAdminHeaders(),
                body: JSON.stringify({ id }),
            });
            toast.success("Item deleted");
        } catch {
            toast.error("Failed to delete");
        }
    };

    const toggleAvailability = async (item: MenuItem) => {
        try {
            await fetch("/api/admin/menu", {
                method: "PUT",
                headers: getAdminHeaders(),
                body: JSON.stringify({ id: item.id, available: !item.available }),
            });
            toast.success(`${item.name} marked as ${!item.available ? "available" : "unavailable"}`);
        } catch {
            toast.error("Failed to update");
        }
    };

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
                            <h1 className="text-lg font-display font-bold text-white">🍽️ Menu Management</h1>
                        </div>
                        <button
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="btn-gold text-sm py-2"
                        >
                            + Add Item
                        </button>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto p-6">
                    {/* Add/Edit Modal */}
                    {showForm && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-campus-800 border border-campus-700 rounded-2xl p-6 w-full max-w-md animate-scale-in">
                                <h3 className="text-lg font-display font-bold text-white mb-4">
                                    {editItem ? "✏️ Edit Item" : "➕ Add New Item"}
                                </h3>

                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Item name"
                                        className="w-full px-4 py-3 rounded-xl bg-campus-700 border border-campus-600 text-white placeholder:text-campus-500 focus:ring-2 focus:ring-gold-400 focus:outline-none"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="number"
                                            value={form.price}
                                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                                            placeholder="Price (₹)"
                                            className="w-full px-4 py-3 rounded-xl bg-campus-700 border border-campus-600 text-white placeholder:text-campus-500 focus:ring-2 focus:ring-gold-400 focus:outline-none"
                                        />
                                        <input
                                            type="number"
                                            value={form.quantity}
                                            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                            placeholder="Quantity"
                                            className="w-full px-4 py-3 rounded-xl bg-campus-700 border border-campus-600 text-white placeholder:text-campus-500 focus:ring-2 focus:ring-gold-400 focus:outline-none"
                                        />
                                    </div>
                                    <input
                                        type="number"
                                        value={form.preparationTime}
                                        onChange={(e) => setForm({ ...form, preparationTime: e.target.value })}
                                        placeholder="Preparation time (minutes)"
                                        min={0}
                                        className="w-full px-4 py-3 rounded-xl bg-campus-700 border border-campus-600 text-white placeholder:text-campus-500 focus:ring-2 focus:ring-gold-400 focus:outline-none"
                                    />
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-campus-700 border border-campus-600 text-white focus:ring-2 focus:ring-gold-400 focus:outline-none"
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option key={c} value={c} className="capitalize">{c}</option>
                                        ))}
                                    </select>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Description (optional)"
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl bg-campus-700 border border-campus-600 text-white placeholder:text-campus-500 focus:ring-2 focus:ring-gold-400 focus:outline-none resize-none"
                                    />
                                    <label className="flex items-center gap-2 text-campus-300 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.available}
                                            onChange={(e) => setForm({ ...form, available: e.target.checked })}
                                            className="w-4 h-4 rounded accent-gold-500"
                                        />
                                        Available for ordering
                                    </label>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button onClick={resetForm} className="flex-1 px-4 py-3 bg-campus-700 text-campus-300 rounded-xl hover:bg-campus-600 transition-all">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={saving}
                                        className="flex-1 btn-gold py-3"
                                    >
                                        {saving ? "Saving..." : editItem ? "Update" : "Add Item"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Menu Items Table */}
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-20 text-campus-500">
                            <div className="text-5xl mb-4">🍽️</div>
                            <p>No menu items yet. Add your first item!</p>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-fade-in">
                            {/* Desktop Table Header */}
                            <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold text-campus-500 uppercase">
                                <div className="col-span-3">Item</div>
                                <div className="col-span-2">Category</div>
                                <div className="col-span-1">Price</div>
                                <div className="col-span-1">Qty</div>
                                <div className="col-span-1">Prep</div>
                                <div className="col-span-1">Status</div>
                                <div className="col-span-3 text-right">Actions</div>
                            </div>

                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-campus-800/50 border border-campus-700 rounded-xl p-4 lg:p-5 lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center"
                                >
                                    <div className="col-span-3 mb-2 lg:mb-0">
                                        <h4 className="font-semibold text-white">{item.name}</h4>
                                        {item.description && <p className="text-xs text-campus-500 truncate">{item.description}</p>}
                                    </div>
                                    <div className="col-span-2 mb-2 lg:mb-0">
                                        <span className="px-3 py-1 bg-campus-700 text-campus-300 text-xs rounded-full capitalize">
                                            {item.category}
                                        </span>
                                    </div>
                                    <div className="col-span-1 text-gold-400 font-bold mb-2 lg:mb-0">₹{item.price}</div>
                                    <div className="col-span-1 text-campus-300 mb-2 lg:mb-0">{item.quantity}</div>
                                    <div className="col-span-1 text-campus-300 text-sm mb-2 lg:mb-0">
                                        {item.preparationTime ? `${item.preparationTime}m` : "—"}
                                    </div>
                                    <div className="col-span-1 mb-3 lg:mb-0">
                                        <button
                                            onClick={() => toggleAvailability(item)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${item.available
                                                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                                : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                                }`}
                                        >
                                            {item.available ? "✓ Available" : "✗ Unavailable"}
                                        </button>
                                    </div>
                                    <div className="col-span-3 flex gap-2 justify-end">
                                        <button
                                            onClick={() => openEdit(item)}
                                            className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-all"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => deleteItem(item.id)}
                                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-all"
                                        >
                                            🗑️ Delete
                                        </button>
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
