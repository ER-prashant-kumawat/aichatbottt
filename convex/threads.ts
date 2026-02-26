import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create thread
export const createThread = mutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title }) => {
    const threadId = await ctx.db.insert("threads", {
      userId,
      title: title || "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return threadId;
  },
});

// Get threads by user
export const getThreadsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Get single thread
export const getThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    return await ctx.db.get(threadId);
  },
});

// Update thread title
export const updateThreadTitle = mutation({
  args: {
    threadId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { threadId, title }) => {
    await ctx.db.patch(threadId as any, {
      title,
      updatedAt: Date.now(),
    });
  },
});

// Delete thread
export const deleteThread = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    // Delete all messages in thread first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    // Delete thread
    await ctx.db.delete(threadId);
  },
});
