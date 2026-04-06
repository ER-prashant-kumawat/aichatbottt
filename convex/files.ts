import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate upload URL for Convex file storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Save file metadata after upload
 */
export const saveFile = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    category: v.optional(v.string()),
    threadId: v.optional(v.id("threads")),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    // Verify user exists
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("files", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get file download URL
 */
export const getFileUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId as any);
  },
});

/**
 * Get all files for a user
 */
export const getByUser = query({
  args: {
    userId: v.id("users"),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { userId, category }) => {
    if (category) {
      const files = await ctx.db
        .query("files")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
      return files.filter((f) => f.category === category)
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    return await ctx.db
      .query("files")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Get files for a specific thread
 */
export const getByThread = query({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
  },
  handler: async (ctx, { threadId, userId }) => {
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) throw new Error("Unauthorized");

    return await ctx.db
      .query("files")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .order("desc")
      .collect();
  },
});

/**
 * Get file storage stats for a user
 */
export const getStorageStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
    const totalFiles = files.length;

    // By category
    const byCategory: Record<string, { count: number; size: number }> = {};
    for (const f of files) {
      const cat = f.category || "other";
      if (!byCategory[cat]) byCategory[cat] = { count: 0, size: 0 };
      byCategory[cat].count++;
      byCategory[cat].size += f.fileSize;
    }

    // By file type
    const byType: Record<string, number> = {};
    for (const f of files) {
      const ext = f.fileName.split(".").pop()?.toLowerCase() || "unknown";
      byType[ext] = (byType[ext] || 0) + 1;
    }

    return {
      totalFiles,
      totalSize,
      totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
      byCategory,
      byType,
    };
  },
});

/**
 * Delete a file (ownership check)
 */
export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
    userId: v.id("users"),
  },
  handler: async (ctx, { fileId, userId }) => {
    const file = await ctx.db.get(fileId);
    if (!file) throw new Error("File not found");
    if (file.userId !== userId) throw new Error("Unauthorized: Not your file");

    // Delete from storage
    try {
      await ctx.storage.delete(file.storageId as any);
    } catch {
      // Storage might already be deleted
    }

    // Delete metadata
    await ctx.db.delete(fileId);
  },
});

/**
 * Delete all files for a user (used in account deletion)
 */
export const deleteAllUserFiles = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const files = await ctx.db
      .query("files")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const file of files) {
      try {
        await ctx.storage.delete(file.storageId as any);
      } catch {
        // Continue even if storage delete fails
      }
      await ctx.db.delete(file._id);
    }

    return { deleted: files.length };
  },
});
