import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { CohereClientV2 } from "cohere-ai";
import Anthropic from "@anthropic-ai/sdk";

// ─── Multi-LLM fallback chain: Gemini → Groq → Cohere → Claude ───

interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

async function tryGemini(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API key not configured");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const history = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        }));

    const chat = model.startChat({
        history: history.slice(0, -1) as Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
        systemInstruction: systemPrompt,
    });

    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    return response.text();
}

async function tryGroq(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Groq API key not configured");

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || "";
}

async function tryCohere(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) throw new Error("Cohere API key not configured");

    const cohere = new CohereClientV2({ token: apiKey });

    const response = await cohere.chat({
        model: "command-r-plus",
        messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            })),
        ],
    });

    const content = response.message?.content;
    if (Array.isArray(content)) {
        return content.map((c) => (typeof c === "string" ? c : (c as { text?: string }).text || "")).join("");
    }
    return typeof content === "string" ? content : "";
}

async function tryClaude(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) throw new Error("Claude API key not configured");

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({
            role: m.role === "system" ? "user" : m.role,
            content: m.content,
        })),
    });

    const block = response.content[0];
    return block.type === "text" ? block.text : "";
}

export async function chatWithFallback(
    messages: ChatMessage[],
    systemPrompt: string
): Promise<{ response: string; provider: string }> {
    const providers = [
        { name: "Gemini", fn: tryGemini },
        { name: "Groq", fn: tryGroq },
        { name: "Cohere", fn: tryCohere },
        { name: "Claude", fn: tryClaude },
    ];

    for (const provider of providers) {
        try {
            const response = await provider.fn(messages, systemPrompt);
            if (response && response.trim()) {
                return { response, provider: provider.name };
            }
        } catch (error) {
            console.warn(`[LLM] ${provider.name} failed:`, error instanceof Error ? error.message : error);
            continue;
        }
    }

    return {
        response: "I'm sorry, I'm having trouble connecting to my AI services right now. Please try again in a moment! 🙏",
        provider: "fallback",
    };
}

export type { ChatMessage };
