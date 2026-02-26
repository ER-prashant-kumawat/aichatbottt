import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateAIResponse } from "./agent";

export const chat = action({
  args: {
    threadId: v.string(),
    userId: v.string(),
    message: v.string(),
    useRag: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { threadId, userId, message, useRag = true } = args;
    
    try {
      console.log("💬 Chat action");

      // Save user message
      await ctx.runMutation("messages:create", {
        threadId,
        userId,
        role: "user",
        content: message,
      });

      // Update thread title with first message (smart naming)
      const firstMessage = message.substring(0, 50);
      await ctx.runMutation("threads:updateThreadTitle", {
        threadId,
        title: firstMessage.length < message.length ? firstMessage + "..." : firstMessage,
      });

      // Get AI response
      const { text: aiResponse, tokensUsed } = await generateAIResponse(
        ctx,
        message,
        threadId,
        userId,
        useRag
      );

      // Save AI response
      await ctx.runMutation("messages:create", {
        threadId,
        userId,
        role: "assistant",
        content: aiResponse,
      });

      return {
        success: true,
        response: aiResponse,
      };
    } catch (error) {
      console.error("Error:", error);
      return {
        success: false,
        error: "Failed to get response",
      };
    }
  },
});
