import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Log user activity (every action tracked)
 */
export const logActivity = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    feature: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activityLog", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get recent activity for a user
 */
export const getRecentActivity = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 50 }) => {
    return await ctx.db
      .query("activityLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get activity by feature
 */
export const getByFeature = query({
  args: {
    userId: v.id("users"),
    feature: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, feature, limit = 50 }) => {
    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return activities.filter((a) => a.feature === feature).slice(0, limit);
  },
});

/**
 * Get activity summary (for dashboard)
 */
export const getActivitySummary = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayActivities = activities.filter((a) => a.createdAt >= today.getTime());

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekActivities = activities.filter((a) => a.createdAt >= weekAgo);

    // Count by feature
    const byFeature: Record<string, number> = {};
    for (const a of activities) {
      byFeature[a.feature] = (byFeature[a.feature] || 0) + 1;
    }

    // Count by action
    const byAction: Record<string, number> = {};
    for (const a of activities) {
      byAction[a.action] = (byAction[a.action] || 0) + 1;
    }

    // Daily activity for last 7 days
    const dailyActivity: Record<string, number> = {};
    for (const a of weekActivities) {
      const date = new Date(a.createdAt).toISOString().split("T")[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    }

    return {
      totalActivities: activities.length,
      todayCount: todayActivities.length,
      weekCount: weekActivities.length,
      byFeature,
      byAction,
      dailyActivity,
      lastActivity: activities.length > 0 ? activities[activities.length - 1].createdAt : null,
    };
  },
});

/**
 * Delete old activity logs (older than 60 days)
 */
export const cleanupOldActivity = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

    const oldActivities = await ctx.db
      .query("activityLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const toDelete = oldActivities.filter((a) => a.createdAt < sixtyDaysAgo);
    for (const activity of toDelete) {
      await ctx.db.delete(activity._id);
    }

    return { deleted: toDelete.length };
  },
});
