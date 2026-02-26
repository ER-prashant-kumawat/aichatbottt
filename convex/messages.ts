import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create message
export const create = mutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, { threadId, userId, role, content }) => {
    const messageId = await ctx.db.insert("messages", {
      threadId: threadId as any,
      userId: userId as any,
      role,
      content,
      createdAt: Date.now(),
    });

    // Update thread timestamp
    await ctx.db.patch(threadId as any, {
      updatedAt: Date.now(),
    });

    return messageId;
  },
});

// Get messages by thread
export const getByThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId as any))
      .order("asc")
      .collect();
  },
});

// Get recent messages
export const getRecent = query({
  args: {
    threadId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { threadId, limit = 10 }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId as any))
      .order("desc")
      .take(limit);
    return messages.reverse();
  },
});

// Delete message
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    await ctx.db.delete(messageId);
  },
});
