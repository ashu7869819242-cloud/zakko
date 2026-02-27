/**
 * Jarvis NLP Parser — extracts item names and quantities 
 * from natural Hinglish/English text like:
 * "milk 2 packet kar do" → { name: "milk", quantity: 2 }
 * "mere liye 3 upma de do" → { name: "upma", quantity: 3 }
 * "1 boil egg add karo" → { name: "boil egg", quantity: 1 }
 */

export interface ParsedItem {
    rawName: string;
    quantity: number;
}

// Common Hindi filler words to strip
const FILLER_WORDS = new Set([
    "kar", "karo", "kardo", "kro", "de", "do", "dedo", "dena",
    "add", "order", "laga", "lagao", "lagado", "bhej", "bhejo",
    "mere", "mera", "meri", "mujhe", "ko", "liye", "ke", "ka",
    "ek", "please", "plz", "pls", "bhi", "aur", "or", "and",
    "packet", "packets", "plate", "plates", "piece", "pieces",
    "glass", "glasses", "cup", "cups", "bowl", "bowls",
    "chahiye", "chaiye", "manga", "mangao", "mangwa", "rakh",
    "set", "sets", "la", "lao", "lana", "hai", "hain",
]);

/**
 * Parse a single line/sentence for item + quantity.
 * Supports patterns like:
 *   "2 momos"  |  "momos 2"  |  "momos x2"  |  "momos × 2"
 *   "ek momos" (Hindi ek=1)  |  "do momos" (Hindi do=2)
 */
const HINDI_NUMBERS: Record<string, number> = {
    ek: 1, do: 2, teen: 3, char: 4, panch: 5,
    che: 6, saat: 7, aath: 8, nau: 9, das: 10,
};

export function parseNaturalLanguage(text: string): ParsedItem[] {
    // Split by comma, "aur", "and", "&" or newline for multi-item support
    const segments = text
        .split(/[,&\n]|(?:\s+(?:aur|and|or)\s+)/gi)
        .map(s => s.trim())
        .filter(Boolean);

    const results: ParsedItem[] = [];

    for (const segment of segments) {
        const parsed = parseSingleSegment(segment);
        if (parsed) results.push(parsed);
    }

    return results;
}

function parseSingleSegment(text: string): ParsedItem | null {
    let quantity = 1;
    let remaining = text.toLowerCase().trim();

    // 1. Try extract leading number: "2 momos" or "02 momos"
    const leadingNum = remaining.match(/^(\d+)\s+/);
    if (leadingNum) {
        quantity = parseInt(leadingNum[1], 10);
        remaining = remaining.slice(leadingNum[0].length);
    }

    // 2. Try extract trailing number: "momos 2" or "momos x2"
    const trailingNum = remaining.match(/\s+[x×]?(\d+)$/);
    if (trailingNum) {
        quantity = parseInt(trailingNum[1], 10);
        remaining = remaining.slice(0, -trailingNum[0].length);
    }

    // 3. Try Hindi number words
    const words = remaining.split(/\s+/);
    const hindiIdx = words.findIndex(w => HINDI_NUMBERS[w] !== undefined);
    if (hindiIdx !== -1 && !leadingNum && !trailingNum) {
        quantity = HINDI_NUMBERS[words[hindiIdx]];
        words.splice(hindiIdx, 1);
        remaining = words.join(" ");
    }

    // 4. Strip filler words
    const cleaned = remaining
        .split(/\s+/)
        .filter(w => !FILLER_WORDS.has(w) && w.length > 0)
        .join(" ")
        .trim();

    if (!cleaned) return null;
    if (quantity <= 0) quantity = 1;
    if (quantity > 50) quantity = 50; // Safety cap

    return { rawName: cleaned, quantity };
}

/**
 * Fuzzy match a parsed name against available menu items.
 * Returns the best matching menu item or null.
 */
export function fuzzyMatchItem<T extends { name: string }>(
    rawName: string,
    menuItems: T[]
): T | null {
    const query = rawName.toLowerCase().trim();

    // 1. Exact match
    const exact = menuItems.find(m => m.name.toLowerCase() === query);
    if (exact) return exact;

    // 2. Starts-with match
    const startsWith = menuItems.find(m => m.name.toLowerCase().startsWith(query));
    if (startsWith) return startsWith;

    // 3. Contains match
    const contains = menuItems.find(m => m.name.toLowerCase().includes(query));
    if (contains) return contains;

    // 4. Reverse contains (query contains item name)
    const reverseContains = menuItems.find(m => query.includes(m.name.toLowerCase()));
    if (reverseContains) return reverseContains;

    // 5. Word overlap similarity
    const queryWords = query.split(/\s+/);
    let bestMatch: T | null = null;
    let bestScore = 0;

    for (const item of menuItems) {
        const itemWords = item.name.toLowerCase().split(/\s+/);
        const overlap = queryWords.filter(qw =>
            itemWords.some(iw => iw.includes(qw) || qw.includes(iw))
        ).length;
        const score = overlap / Math.max(queryWords.length, itemWords.length);
        if (score > bestScore && score >= 0.4) {
            bestScore = score;
            bestMatch = item;
        }
    }

    return bestMatch;
}
