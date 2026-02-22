/**
 * LLM Service — Re-exports the multi-LLM fallback from @/lib/llm.
 * Clean import entry point for components and API routes.
 */

export { chatWithFallback } from "@/lib/llm";
export type { ChatMessage } from "@/lib/llm";
