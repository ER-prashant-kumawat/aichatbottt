import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Log usage
export const logUsage = mutation({
  args: {
    userId: v.id("users"),
    agentName: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
  },
  handler: async (
    ctx,
    { userId, agentName, model, inputTokens, outputTokens, totalTokens }
  ) => {
    return await ctx.db.insert("usageLog", {
      userId,
      agentName,
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      createdAt: Date.now(),
    });
  },
});

// Get usage by user
export const getUserUsage = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const logs = await ctx.db
      .query("usageLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const totalTokens = logs.reduce((sum, log) => sum + log.totalTokens, 0);
    const avgTokensPerRequest =
      logs.length > 0 ? Math.round(totalTokens / logs.length) : 0;

    return {
      totalRequests: logs.length,
      totalTokens,
      avgTokensPerRequest,
      logs: logs.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

// Get usage stats
export const getUsageStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const logs = await ctx.db
      .query("usageLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const agentStats: Record<string, number> = {};
    const modelStats: Record<string, number> = {};

    logs.forEach((log) => {
      agentStats[log.agentName] = (agentStats[log.agentName] || 0) + log.totalTokens;
      modelStats[log.model] = (modelStats[log.model] || 0) + log.totalTokens;
    });

    return {
      byAgent: agentStats,
      byModel: modelStats,
      totalTokens: logs.reduce((sum, log) => sum + log.totalTokens, 0),
    };
  },
});
