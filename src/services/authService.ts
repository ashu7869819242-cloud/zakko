/**
 * Auth Service — Client-side API wrappers for user operations.
 */

export async function registerUser(
    token: string,
    data: { name: string; rollNumber: string; phone?: string }
): Promise<{ success: boolean; error?: string }> {
    const res = await fetch("/api/users/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function lookupByUniqueCode(
    token: string,
    code: string
): Promise<{ name: string; uniqueCode: string } | null> {
    const res = await fetch(`/api/wallet/lookup?code=${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
}
