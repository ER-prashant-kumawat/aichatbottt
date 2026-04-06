import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { generateAIResponse } from "./agent";

export const chat = action({
  args: {
    threadId: v.string(),
    userId: v.string(),
    message: v.string(),
    modelId: v.optional(v.string()),
    chatHistory: v.optional(
      v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
        })
      )
    ),
    // Optional attachments sent with user message
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      type: v.string(),
      size: v.number(),
      storageId: v.optional(v.string()),
      url: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    const { threadId, userId, message, modelId, chatHistory = [], attachments } = args;

    try {
      if (!threadId || !userId || !message) {
        throw new Error("Missing required parameters");
      }

      const startTime = Date.now();

      // Save user message to backend with attachments
      const userMessageType = attachments && attachments.length > 0 ? "file" : "text";
      await ctx.runMutation(api.messages.createAndUpdate, {
        threadId,
        userId,
        role: "user",
        content: message,
        messageType: userMessageType,
        attachments: attachments,
        title: message.length > 50 ? message.substring(0, 50) + "..." : message,
      });

      // Generate AI response
      const { text: aiResponse, tokensUsed, model } = await generateAIResponse(
        message,
        chatHistory,
        modelId
      );

      const responseTimeMs = Date.now() - startTime;

      // Save AI response to backend with metadata
      await ctx.runMutation(api.messages.createAndUpdate, {
        threadId,
        userId,
        role: "assistant",
        content: aiResponse,
        messageType: "text",
        model,
        tokensUsed,
        responseTimeMs,
      });

      // Log usage
      await ctx.runMutation(api.usageLog.logUsage, {
        userId: userId as any,
        agentName: "chat",
        action: "message",
        model,
        inputTokens: Math.round(tokensUsed * 0.4),
        outputTokens: Math.round(tokensUsed * 0.6),
        totalTokens: tokensUsed,
        responseTimeMs,
        success: true,
      });

      // Log activity
      await ctx.runMutation(api.activityLog.logActivity, {
        userId: userId as any,
        action: "chat_sent",
        feature: "chat",
        details: JSON.stringify({ model, tokensUsed, responseTimeMs }),
      });

      return {
        success: true,
        response: aiResponse,
        tokensUsed,
        model,
        responseTimeMs,
        threadId,
        userId,
        message,
      };
    } catch (error) {
      console.error("❌ ERROR IN CHAT ACTION:", error);

      // Log failed usage
      try {
        await ctx.runMutation(api.usageLog.logUsage, {
          userId: userId as any,
          agentName: "chat",
          action: "message",
          model: modelId || "unknown",
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          success: false,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      } catch {
        // Don't fail the whole request if logging fails
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process chat",
      };
    }
  },
});
