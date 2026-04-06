import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper: verify thread belongs to user
async function verifyThreadOwnership(ctx: any, threadId: string, userId: string) {
  const thread = await ctx.db
    .query("threads")
    .filter((q: any) => q.eq(q.field("_id"), threadId as any))
    .first();
  if (!thread) throw new Error("Thread not found");
  if (String(thread.userId) !== String(userId)) {
    throw new Error("Unauthorized: Not your thread");
  }
  return thread;
}

/**
 * Create message with full metadata and update thread
 */
export const createAndUpdate = mutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    title: v.optional(v.string()),
    // Rich metadata
    messageType: v.optional(v.string()),
    model: v.optional(v.string()),
    tokensUsed: v.optional(v.number()),
    responseTimeMs: v.optional(v.number()),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      type: v.string(),
      size: v.number(),
      storageId: v.optional(v.string()),
      url: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, { threadId, userId, role, content, title, messageType, model, tokensUsed, responseTimeMs, attachments }) => {
    // Verify user exists
    const user = await ctx.db.get(userId as any);
    if (!user) throw new Error("Unauthorized: User not found");

    // Verify thread ownership
    const thread = await verifyThreadOwnership(ctx, threadId, userId);

    // Build message data
    const messageData: any = {
      threadId: threadId as any,
      userId: userId as any,
      role,
      content,
      messageType: messageType || "text",
      createdAt: Date.now(),
    };

    // Add optional metadata
    if (model) messageData.model = model;
    if (tokensUsed !== undefined) messageData.tokensUsed = tokensUsed;
    if (responseTimeMs !== undefined) messageData.responseTimeMs = responseTimeMs;
    if (attachments && attachments.length > 0) messageData.attachments = attachments;

    // Insert message
    const messageId = await ctx.db.insert("messages", messageData);

    // Update thread: timestamp, title, message count, token count
    const updateData: any = { updatedAt: Date.now() };
    if (title) updateData.title = title;

    // Update message count
    const currentCount = thread.messageCount || 0;
    updateData.messageCount = currentCount + 1;

    // Update total tokens
    if (tokensUsed) {
      const currentTokens = thread.totalTokens || 0;
      updateData.totalTokens = currentTokens + tokensUsed;
    }

    // Track model used in thread
    if (model && role === "assistant") {
      updateData.model = model;
    }

    await ctx.db.patch(thread._id, updateData);

    // Update user last active
    await ctx.db.patch(userId as any, { lastActiveAt: Date.now() });

    return messageId;
  },
});

/**
 * Create message without thread title update
 */
export const create = mutation({
  args: {
    threadId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    messageType: v.optional(v.string()),
    model: v.optional(v.string()),
    tokensUsed: v.optional(v.number()),
    responseTimeMs: v.optional(v.number()),
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      type: v.string(),
      size: v.number(),
      storageId: v.optional(v.string()),
      url: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, { threadId, userId, role, content, messageType, model, tokensUsed, responseTimeMs, attachments }) => {
    const user = await ctx.db.get(userId as any);
    if (!user) throw new Error("Unauthorized: User not found");

    const thread = await verifyThreadOwnership(ctx, threadId, userId);

    const messageData: any = {
      threadId: threadId as any,
      userId: userId as any,
      role,
      content,
      messageType: messageType || "text",
      createdAt: Date.now(),
    };

    if (model) messageData.model = model;
    if (tokensUsed !== undefined) messageData.tokensUsed = tokensUsed;
    if (responseTimeMs !== undefined) messageData.responseTimeMs = responseTimeMs;
    if (attachments && attachments.length > 0) messageData.attachments = attachments;

    const messageId = await ctx.db.insert("messages", messageData);

    // Update thread stats
    const updateData: any = { updatedAt: Date.now() };
    const currentCount = thread.messageCount || 0;
    updateData.messageCount = currentCount + 1;
    if (tokensUsed) {
      updateData.totalTokens = (thread.totalTokens || 0) + tokensUsed;
    }

    await ctx.db.patch(thread._id, updateData);
    return messageId;
  },
});

/**
 * Get messages by thread (caller must own thread)
 */
export const getByThread = query({
  args: {
    threadId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { threadId, userId }) => {
    // If userId provided, verify ownership
    if (userId) {
      const thread = await ctx.db
        .query("threads")
        .filter((q) => q.eq(q.field("_id"), threadId as any))
        .first();
      if (thread && String(thread.userId) !== String(userId)) {
        throw new Error("Unauthorized: Not your thread");
      }
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId as any))
      .order("asc")
      .collect();

    return messages;
  },
});

/**
 * Get recent messages for AI context
 */
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

/**
 * Update message feedback (thumbs up/down)
 */
export const updateFeedback = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    feedback: v.union(v.literal("good"), v.literal("bad")),
  },
  handler: async (ctx, { messageId, userId, feedback }) => {
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");

    // Verify the message belongs to user's thread
    const thread = await ctx.db.get(message.threadId);
    if (!thread || thread.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(messageId, { feedback });
  },
});

/**
 * Edit message content
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, { messageId, userId, content }) => {
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");
    if (message.userId !== userId) throw new Error("Unauthorized: Not your message");

    await ctx.db.patch(messageId, {
      content,
      isEdited: true,
      editedAt: Date.now(),
    });
  },
});

/**
 * Delete message (ownership check)
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, { messageId, userId }) => {
    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");

    // Verify message belongs to user
    if (message.userId !== userId) {
      throw new Error("Unauthorized: Not your message");
    }

    await ctx.db.delete(messageId);
  },
});

/**
 * Get message count for a thread
 */
export const getThreadMessageCount = query({
  args: { threadId: v.string() },
  handler: async (ctx, { threadId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId as any))
      .collect();
    return messages.length;
  },
});

/**
 * Get all messages by user (only own messages)
 */
export const getByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_userId", (q) => q.eq("userId", userId as any))
      .order("desc")
      .collect();
    return messages;
  },
});

/**
 * Get messages with attachments for a thread
 */
export const getAttachments = query({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
  },
  handler: async (ctx, { threadId, userId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) throw new Error("Unauthorized");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .collect();

    // Filter messages that have attachments
    return messages.filter((m) => m.attachments && m.attachments.length > 0);
  },
});

/**
 * Get thread statistics
 */
export const getThreadStats = query({
  args: { threadId: v.id("threads"), userId: v.id("users") },
  handler: async (ctx, { threadId, userId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) throw new Error("Unauthorized");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .collect();

    const userMessages = messages.filter((m) => m.role === "user");
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    const totalTokens = messages.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
    const avgResponseTime = assistantMessages.length > 0
      ? assistantMessages.reduce((sum, m) => sum + (m.responseTimeMs || 0), 0) / assistantMessages.length
      : 0;
    const modelsUsed = [...new Set(assistantMessages.map((m) => m.model).filter(Boolean))];
    const attachmentCount = messages.reduce(
      (sum, m) => sum + (m.attachments ? m.attachments.length : 0), 0
    );

    return {
      totalMessages: messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      totalTokens,
      avgResponseTime: Math.round(avgResponseTime),
      modelsUsed,
      attachmentCount,
      firstMessageAt: messages.length > 0 ? messages[0].createdAt : null,
      lastMessageAt: messages.length > 0 ? messages[messages.length - 1].createdAt : null,
    };
  },
});
