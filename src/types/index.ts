/**
 * Shared TypeScript interfaces for the Campus Canteen application.
 * Single source of truth for all data models used across client/server.
 */

// ─── User ───────────────────────────────────────

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    phone: string;
    rollNumber: string;
    walletBalance: number;
    uniqueCode: string;
    role: "user" | "admin";
    createdAt: string;
}

// ─── Menu ───────────────────────────────────────

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: string;
    available: boolean;
    quantity: number;
    preparationTime: number; // minutes
    description?: string;
    image?: string;
    createdAt?: string;
    updatedAt?: string;
}

// ─── Orders ─────────────────────────────────────

export interface OrderItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

export interface Order {
    id: string;
    orderId: string;
    userId: string;
    userName: string;
    userEmail: string;
    items: OrderItem[];
    total: number;
    status: "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
    prepTime?: number;
    estimatedReadyAt?: string;
    readyAt?: string; // canonical countdown target (ISO string)
    createdAt: string;
    updatedAt?: string;
}

// ─── Wallet ─────────────────────────────────────

export interface WalletTransaction {
    id: string;
    fromUserId: string;
    toUserId: string;
    userId: string; // owner of this transaction record
    amount: number;
    type: "topup" | "transfer" | "payment" | "refund";
    description: string;
    referenceId?: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    createdAt: string;
}

// ─── Payments (Razorpay dedup) ──────────────────

export interface Payment {
    razorpayPaymentId: string;
    userId: string;
    amount: number;
    verified: boolean;
    createdAt: string;
}

// ─── Canteen Settings ───────────────────────────

export interface CanteenConfig {
    startTime: string; // "HH:MM" format, e.g. "09:00"
    endTime: string;   // "HH:MM" format, e.g. "17:00"
    isOpen: boolean;
}

// ─── Chat ───────────────────────────────────────

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}
