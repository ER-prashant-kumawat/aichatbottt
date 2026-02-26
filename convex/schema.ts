import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User data
  users: defineTable({
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Chat threads
  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Chat history
  messages: defineTable({
    threadId: v.id("threads"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_userId", ["userId"]),

  // Documents for RAG
  documents: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    category: v.string(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_category", ["category"]),

  // Usage tracking
  usageLog: defineTable({
    userId: v.id("users"),
    agentName: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),
});
