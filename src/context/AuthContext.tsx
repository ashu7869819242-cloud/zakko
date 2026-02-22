/**
 * AuthContext — User authentication state management
 * 
 * SECURITY/UX CHANGES:
 * - Profile uses onSnapshot for REAL-TIME updates (wallet balance, etc.)
 * - Exposes getIdToken() for API calls that need Firebase ID tokens
 * - No more stale wallet balance after orders
 */

"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import {
    onAuthStateChanged,
    User,
    signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

interface UserProfile {
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

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
    getIdToken: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Real-time profile listener — profile updates instantly when wallet changes
    useEffect(() => {
        if (!user) {
            setProfile(null);
            return;
        }

        // SECURITY/UX: Use onSnapshot for real-time profile updates
        const unsubscribe = onSnapshot(
            doc(db, "users", user.uid),
            (docSnap) => {
                if (docSnap.exists()) {
                    setProfile(docSnap.data() as UserProfile);
                } else {
                    setProfile(null);
                }
            },
            (error) => {
                console.error("Profile listener error:", error);
            }
        );

        return () => unsubscribe();
    }, [user]);

    // refreshProfile is now a no-op since onSnapshot handles updates automatically
    // Kept for backward compatibility with pages that call it
    const refreshProfile = useCallback(async () => {
        // No-op: onSnapshot handles real-time updates
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUser(null);
        setProfile(null);
    };

    // SECURITY: Get Firebase ID token for authenticated API calls
    const getIdToken = useCallback(async (): Promise<string | null> => {
        if (!user) return null;
        try {
            return await user.getIdToken();
        } catch {
            return null;
        }
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, getIdToken }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
