import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Log AI usage (called after every AI API call)
 */
export const logUsage = mutation({
  args: {
    userId: v.id("users"),
    agentName: v.string(),
    action: v.optional(v.string()),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    responseTimeMs: v.optional(v.number()),
    success: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("usageLog", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get usage history for a user
 */
export const getUsageHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 100 }) => {
    const logs = await ctx.db
      .query("usageLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
    return logs;
  },
});

/**
 * Get usage stats for a user (aggregated)
 */
export const getUsageStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const logs = await ctx.db
      .query("usageLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const totalTokens = logs.reduce((sum, l) => sum + l.totalTokens, 0);
    const totalCalls = logs.length;
    const successCalls = logs.filter((l) => l.success !== false).length;
    const failedCalls = logs.filter((l) => l.success === false).length;
    const avgResponseTime = logs.length > 0
      ? logs.reduce((sum, l) => sum + (l.responseTimeMs || 0), 0) / logs.length
      : 0;

    // By agent breakdown
    const byAgent: Record<string, { calls: number; tokens: number }> = {};
    for (const log of logs) {
      if (!byAgent[log.agentName]) {
        byAgent[log.agentName] = { calls: 0, tokens: 0 };
      }
      byAgent[log.agentName].calls++;
      byAgent[log.agentName].tokens += log.totalTokens;
    }

    // By model breakdown
    const byModel: Record<string, { calls: number; tokens: number }> = {};
    for (const log of logs) {
      if (!byModel[log.model]) {
        byModel[log.model] = { calls: 0, tokens: 0 };
      }
      byModel[log.model].calls++;
      byModel[log.model].tokens += log.totalTokens;
    }

    // Today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = logs.filter((l) => l.createdAt >= today.getTime());
    const todayTokens = todayLogs.reduce((sum, l) => sum + l.totalTokens, 0);
    const todayCalls = todayLogs.length;

    // This week's usage
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekLogs = logs.filter((l) => l.createdAt >= weekAgo);
    const weekTokens = weekLogs.reduce((sum, l) => sum + l.totalTokens, 0);
    const weekCalls = weekLogs.length;

    return {
      totalTokens,
      totalCalls,
      successCalls,
      failedCalls,
      avgResponseTime: Math.round(avgResponseTime),
      byAgent,
      byModel,
      today: { tokens: todayTokens, calls: todayCalls },
      thisWeek: { tokens: weekTokens, calls: weekCalls },
    };
  },
});

/**
 * Get daily usage for charts (last 30 days)
 */
export const getDailyUsage = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("usageLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const recentLogs = logs.filter((l) => l.createdAt >= thirtyDaysAgo);

    // Group by date
    const daily: Record<string, { tokens: number; calls: number }> = {};
    for (const log of recentLogs) {
      const date = new Date(log.createdAt).toISOString().split("T")[0];
      if (!daily[date]) {
        daily[date] = { tokens: 0, calls: 0 };
      }
      daily[date].tokens += log.totalTokens;
      daily[date].calls++;
    }

    return Object.entries(daily)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

/**
 * Delete old usage logs (cleanup - older than 90 days)
 */
export const cleanupOldLogs = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    const oldLogs = await ctx.db
      .query("usageLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const toDelete = oldLogs.filter((l) => l.createdAt < ninetyDaysAgo);
    for (const log of toDelete) {
      await ctx.db.delete(log._id);
    }

    return { deleted: toDelete.length };
  },
});
