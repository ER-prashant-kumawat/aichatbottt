import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ===========================
// CREATE THREAD (verified user)
// ===========================
export const createThread = mutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
    model: v.optional(v.string()),
    tags: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title, model, tags }) => {
    // Verify user exists
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Unauthorized: User not found");

    const threadData: any = {
      userId,
      title: title || "New Chat",
      messageCount: 0,
      totalTokens: 0,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (model) threadData.model = model;
    if (tags) threadData.tags = tags;

    const threadId = await ctx.db.insert("threads", threadData);

    // Update user last active
    await ctx.db.patch(userId, { lastActiveAt: Date.now() });

    return threadId;
  },
});

// ===========================
// GET THREADS (only own threads)
// ===========================
export const getThreadsByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return threads;
  },
});

// ===========================
// GET SINGLE THREAD (ownership check)
// ===========================
export const getThread = query({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
  },
  handler: async (ctx, { threadId, userId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread) return null;

    // Ownership check
    if (thread.userId !== userId) {
      throw new Error("Unauthorized: Not your thread");
    }

    return thread;
  },
});

// ===========================
// UPDATE THREAD TITLE (ownership check)
// ===========================
export const updateThreadTitle = mutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { threadId, userId, title }) => {
    const thread = await ctx.db
      .query("threads")
      .filter((q) => q.eq(q.field("_id"), threadId as any))
      .first();
    if (!thread) throw new Error("Thread not found");

    // Ownership check
    if (String(thread.userId) !== String(userId)) {
      throw new Error("Unauthorized: Not your thread");
    }

    await ctx.db.patch(thread._id, {
      title,
      updatedAt: Date.now(),
    });
  },
});

// ===========================
// DELETE THREAD (ownership check)
// ===========================
export const deleteThread = mutation({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
  },
  handler: async (ctx, { threadId, userId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new Error("Thread not found");

    // Ownership check
    if (thread.userId !== userId) {
      throw new Error("Unauthorized: Not your thread");
    }

    // Delete all messages in thread
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(threadId);
  },
});

// ===========================
// PIN/UNPIN THREAD
// ===========================
export const togglePinThread = mutation({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
  },
  handler: async (ctx, { threadId, userId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread) throw new Error("Thread not found");
    if (thread.userId !== userId) throw new Error("Unauthorized: Not your thread");

    await ctx.db.patch(threadId, { isPinned: !thread.isPinned });
  },
});

// ===========================
// GET THREAD COUNT
// ===========================
export const getUserThreadCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return threads.length;
  },
});
