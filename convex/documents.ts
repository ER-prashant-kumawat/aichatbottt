import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Add document
export const addDocument = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title, content, category = "general" }) => {
    return await ctx.db.insert("documents", {
      userId,
      title,
      content,
      category,
      createdAt: Date.now(),
    });
  },
});

// Search documents (simple text search)
export const search = query({
  args: {
    userId: v.id("users"),
    query: v.string(),
  },
  handler: async (ctx, { userId, query: searchQuery }) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Simple text search
    const lowerQuery = searchQuery.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.content.toLowerCase().includes(lowerQuery)
    );
  },
});

// Get user documents
export const getByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Get documents by category
export const getByCategory = query({
  args: {
    userId: v.id("users"),
    category: v.string(),
  },
  handler: async (ctx, { userId, category }) => {
    return await ctx.db
      .query("documents")
      .withIndex("by_category", (q) => q.eq("category", category))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
  },
});

// Delete document (ownership check)
export const deleteDocument = mutation({
  args: { documentId: v.id("documents"), userId: v.id("users") },
  handler: async (ctx, { documentId, userId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc) throw new Error("Document not found");
    if (doc.userId !== userId) throw new Error("Unauthorized: Not your document");
    await ctx.db.delete(documentId);
  },
});
