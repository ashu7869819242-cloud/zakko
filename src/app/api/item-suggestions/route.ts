/**
 * /api/item-suggestions — User Item Suggestion API
 *
 * GET  — Returns suggestions the authenticated user has participated in.
 * POST — Creates a new suggestion OR upvotes an existing one (dedup via normalizedName).
 *        Uses Firestore transaction for atomic increment.
 *        Prevents same user from requesting the same item twice.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthenticatedUser } from "@/lib/user-auth";
import { FieldValue } from "firebase-admin/firestore";

// ─── GET ────────────────────────────────────────
export async function GET(req: NextRequest) {
    const uid = await getAuthenticatedUser(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const snap = await adminDb
            .collection("itemSuggestions")
            .where("requestedBy", "array-contains", uid)
            .orderBy("createdAt", "desc")
            .get();

        const suggestions = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            // Strip requestedBy for privacy — user only needs their own status
            requestedBy: undefined,
            userRequested: true,
        }));

        return NextResponse.json({ success: true, suggestions });
    } catch (err) {
        console.error("[ItemSuggestions] GET error:", err);
        return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }
}

// ─── POST ───────────────────────────────────────
export async function POST(req: NextRequest) {
    const uid = await getAuthenticatedUser(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await req.json();
        const { itemName, category, description, expectedPrice } = body;

        if (!itemName || typeof itemName !== "string" || itemName.trim().length < 2) {
            return NextResponse.json({ error: "Item name is required (min 2 characters)" }, { status: 400 });
        }

        const normalizedName = itemName.trim().toLowerCase();

        // Check if suggestion already exists
        const existingSnap = await adminDb
            .collection("itemSuggestions")
            .where("normalizedName", "==", normalizedName)
            .limit(1)
            .get();

        if (!existingSnap.empty) {
            // Existing suggestion — upvote it
            const existingDoc = existingSnap.docs[0];
            const existingData = existingDoc.data();

            // Check if user already requested this
            if (existingData.requestedBy?.includes(uid)) {
                return NextResponse.json({
                    error: "You already requested this item",
                    alreadyRequested: true,
                }, { status: 409 });
            }

            // Atomic increment via transaction
            await adminDb.runTransaction(async (tx) => {
                const freshDoc = await tx.get(existingDoc.ref);
                if (!freshDoc.exists) throw new Error("Document disappeared");

                const freshData = freshDoc.data()!;
                if (freshData.requestedBy?.includes(uid)) {
                    throw new Error("Already requested");
                }

                tx.update(existingDoc.ref, {
                    totalRequests: FieldValue.increment(1),
                    requestedBy: FieldValue.arrayUnion(uid),
                    updatedAt: new Date().toISOString(),
                });
            });

            console.log(`[ItemSuggestions] Upvoted "${itemName}" by user ${uid} (doc: ${existingDoc.id})`);

            return NextResponse.json({
                success: true,
                action: "upvoted",
                suggestionId: existingDoc.id,
            });
        }

        // New suggestion
        const now = new Date().toISOString();
        const suggestionData: Record<string, unknown> = {
            itemName: itemName.trim(),
            normalizedName,
            totalRequests: 1,
            requestedBy: [uid],
            status: "pending",
            createdAt: now,
            updatedAt: now,
        };

        if (category && typeof category === "string") suggestionData.category = category.trim();
        if (description && typeof description === "string") suggestionData.description = description.trim();
        if (expectedPrice && typeof expectedPrice === "number" && expectedPrice > 0) {
            suggestionData.expectedPrice = expectedPrice;
        }

        const ref = await adminDb.collection("itemSuggestions").add(suggestionData);
        console.log(`[ItemSuggestions] Created new suggestion "${itemName}" by user ${uid} (doc: ${ref.id})`);

        return NextResponse.json({
            success: true,
            action: "created",
            suggestionId: ref.id,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message === "Already requested") {
            return NextResponse.json({ error: "You already requested this item" }, { status: 409 });
        }
        console.error("[ItemSuggestions] POST error:", err);
        return NextResponse.json({ error: "Failed to submit suggestion" }, { status: 500 });
    }
}
