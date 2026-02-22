/**
 * Admin Stats API — Sales statistics for dashboard charts
 * 
 * SECURITY CHANGES:
 * - Requires admin JWT verification via verifyAdmin()
 * - Returns 401 Unauthorized if token is missing or invalid
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
    // SECURITY: Require valid admin JWT
    if (!verifyAdmin(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Fetch orders from last 30 days
        const snapshot = await adminDb
            .collection("orders")
            .where("createdAt", ">=", thirtyDaysAgo.toISOString())
            .orderBy("createdAt", "desc")
            .get();

        const orders = snapshot.docs.map((doc) => doc.data());

        // Daily sales aggregation
        const dailySales: Record<string, { date: string; revenue: number; orders: number }> = {};
        const monthlySales: Record<string, { month: string; revenue: number; orders: number }> = {};

        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalOrders = orders.length;
        const pendingOrders = orders.filter((o) => o.status === "pending").length;
        const completedOrders = orders.filter((o) => o.status === "completed").length;

        // Item popularity
        const itemCounts: Record<string, number> = {};
        // Top student (daily spender)
        const todayStr = now.toISOString().substring(0, 10);
        const dailySpenders: Record<string, number> = {};

        for (const order of orders) {
            const date = order.createdAt?.substring(0, 10) || "unknown";
            const month = order.createdAt?.substring(0, 7) || "unknown";

            if (!dailySales[date]) {
                dailySales[date] = { date, revenue: 0, orders: 0 };
            }
            dailySales[date].revenue += order.total || 0;
            dailySales[date].orders += 1;

            if (!monthlySales[month]) {
                monthlySales[month] = { month, revenue: 0, orders: 0 };
            }
            monthlySales[month].revenue += order.total || 0;
            monthlySales[month].orders += 1;

            if (order.items && Array.isArray(order.items)) {
                for (const item of order.items) {
                    itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
                }
            }

            // Track today's spenders
            if (date === todayStr && order.userId) {
                dailySpenders[order.userId] = (dailySpenders[order.userId] || 0) + (order.total || 0);
            }
        }

        // Find top student of the day
        let topStudent: { name: string; totalSpent: number } | null = null;
        const spenderEntries = Object.entries(dailySpenders);
        if (spenderEntries.length > 0) {
            spenderEntries.sort((a, b) => b[1] - a[1]);
            const [topUserId, topAmount] = spenderEntries[0];
            try {
                const userDoc = await adminDb.collection("users").doc(topUserId).get();
                const userData = userDoc.data();
                topStudent = { name: userData?.name || "Unknown", totalSpent: topAmount };
            } catch {
                topStudent = { name: "Unknown", totalSpent: topAmount };
            }
        }

        const topItems = Object.entries(itemCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return NextResponse.json({
            summary: {
                totalRevenue,
                totalOrders,
                pendingOrders,
                completedOrders,
                averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
            },
            dailySales: Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date)),
            monthlySales: Object.values(monthlySales).sort((a, b) => a.month.localeCompare(b.month)),
            topItems,
            topStudent,
        });
    } catch (error) {
        console.error("Error fetching stats:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
