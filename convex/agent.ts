import OpenAI from 'openai';

// HuggingFace Token (get from https://huggingface.co/settings/tokens)
const client = new OpenAI({
  // baseURL: "https://router.huggingface.co/v1",
  // apiKey: process.env.HUGGINGFACE_API_KEY || "",
});

console.log("✅ HuggingFace AI Agent initialized");

/**
 * AI AGENT - HUGGINGFACE WITH OPENAI SDK
 */

export async function generateAIResponse(
  ctx: any,
  userMessage: string,
  threadId: string,
  userId: string,
  useRag: boolean = true
): Promise<{ text: string; tokensUsed: number }> {
  try {
    console.log("💬 Processing message...");

    // Get chat history
    const recentMessages = await ctx.runQuery("messages:getRecent", {
      threadId,
      limit: 5,
    });

    // Build message history for OpenAI format
    const messageHistory = (recentMessages || [])
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
      .slice(-4);

    console.log("🚀 Calling HuggingFace API...");

    // Format messages for OpenAI SDK
    const messages = [
      {
        role: "system" as const,
        content: "You are a helpful AI assistant. IMPORTANT: Always respond in ENGLISH ONLY, regardless of the user's language. Do not switch to any other language. Be concise and helpful.",
      },
      ...messageHistory,
      { role: "user" as const, content: userMessage },
    ];

    // Call HuggingFace API via OpenAI SDK
    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b:cerebras",
      messages: messages,
      max_tokens: 300,
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content || "No response";

    console.log("✅ Response received from HuggingFace");

    return {
      text,
      tokensUsed: response.usage?.total_tokens || 100,
    };
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

export async function simpleGenerate(prompt: string): Promise<string> {
  try {
    console.log("🚀 Generating with HuggingFace...");

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b:cerebras",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant. IMPORTANT: Always respond in ENGLISH ONLY. Be concise and helpful.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content || "No response";

    console.log("✅ Generated from HuggingFace");
    return text;
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}
