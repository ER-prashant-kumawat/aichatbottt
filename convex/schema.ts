import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User data
  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.optional(v.string()),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    lastActiveAt: v.optional(v.number()),
    settings: v.optional(v.string()), // JSON string of user preferences
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Chat threads
  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    model: v.optional(v.string()), // default model for this thread
    messageCount: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    isPinned: v.optional(v.boolean()),
    tags: v.optional(v.string()), // comma-separated tags
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Chat history (with full metadata)
  messages: defineTable({
    threadId: v.id("threads"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    // Message type for rich content
    messageType: v.optional(v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("file"),
      v.literal("pdf"),
      v.literal("code"),
      v.literal("multi_model")
    )),
    // AI response metadata
    model: v.optional(v.string()),
    tokensUsed: v.optional(v.number()),
    responseTimeMs: v.optional(v.number()),
    // File/image attachments
    attachments: v.optional(v.array(v.object({
      name: v.string(),
      type: v.string(), // mime type
      size: v.number(), // bytes
      storageId: v.optional(v.string()),
      url: v.optional(v.string()),
    }))),
    // Reactions/feedback
    feedback: v.optional(v.union(v.literal("good"), v.literal("bad"))),
    // Edit tracking
    isEdited: v.optional(v.boolean()),
    editedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_userId", ["userId"]),

  // File storage metadata
  files: defineTable({
    userId: v.id("users"),
    storageId: v.string(),
    fileName: v.string(),
    fileType: v.string(), // mime type
    fileSize: v.number(), // bytes
    category: v.optional(v.string()), // "chat", "document", "image", "pdf"
    threadId: v.optional(v.id("threads")),
    messageId: v.optional(v.id("messages")),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_threadId", ["threadId"])
    .index("by_category", ["category"]),

  // Documents for RAG
  documents: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    category: v.string(),
    fileType: v.optional(v.string()), // "text", "pdf", "markdown", etc.
    fileSize: v.optional(v.number()),
    storageId: v.optional(v.string()),
    wordCount: v.optional(v.number()),
    summary: v.optional(v.string()), // AI-generated summary
    tags: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_category", ["category"]),

  // Creative AI generations (images, videos, 3D models)
  creations: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("3d"),
      v.literal("map_snapshot")
    ),
    prompt: v.string(),
    model: v.string(),
    dataUrl: v.optional(v.string()),
    storageId: v.optional(v.string()),
    metadata: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    negativePrompt: v.optional(v.string()),
    isFavorite: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_type", ["type"]),

  // Saved papers library
  papers: defineTable({
    userId: v.id("users"),
    title: v.string(),
    authors: v.string(),
    abstract: v.string(),
    url: v.string(),
    source: v.string(),
    publishedDate: v.optional(v.string()),
    collection: v.string(),
    tags: v.optional(v.string()),
    notes: v.optional(v.string()),
    citationCount: v.optional(v.number()),
    readStatus: v.optional(v.union(v.literal("unread"), v.literal("reading"), v.literal("read"))),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_collection", ["collection"]),

  // Research notes
  researchNotes: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    folder: v.string(),
    pinned: v.boolean(),
    tags: v.optional(v.string()),
    wordCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_folder", ["folder"]),

  // Research notes & history
  research: defineTable({
    userId: v.id("users"),
    query: v.string(),
    mode: v.string(),
    result: v.string(),
    model: v.string(),
    saved: v.boolean(),
    tokensUsed: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  // Humanized texts history
  humanizedTexts: defineTable({
    userId: v.id("users"),
    originalText: v.string(),
    humanizedText: v.string(),
    mode: v.string(),
    intensity: v.number(),
    model: v.string(),
    originalWordCount: v.optional(v.number()),
    humanizedWordCount: v.optional(v.number()),
    aiScore: v.optional(v.number()), // AI detection score after humanizing
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  // PDF Documents
  pdfDocuments: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    style: v.string(),
    pageCount: v.number(),
    hasImages: v.boolean(),
    wordCount: v.optional(v.number()),
    storageId: v.optional(v.string()), // stored PDF file
    downloadCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  // Usage tracking (every AI call logged)
  usageLog: defineTable({
    userId: v.id("users"),
    agentName: v.string(), // "chat", "research", "humanizer", "creative", "pdf", "paper"
    action: v.optional(v.string()), // specific action like "generate", "summarize", etc.
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    responseTimeMs: v.optional(v.number()),
    success: v.optional(v.boolean()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.string()), // JSON string for extra context
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_agentName", ["agentName"])
    .index("by_createdAt", ["createdAt"]),

  // Activity log (tracks all user actions for dashboard)
  activityLog: defineTable({
    userId: v.id("users"),
    action: v.string(), // "chat_sent", "image_generated", "paper_saved", "research_done", etc.
    details: v.optional(v.string()), // JSON string with details
    feature: v.string(), // "chat", "creative", "research", "humanizer", "pdf", "paper"
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_feature", ["feature"])
    .index("by_createdAt", ["createdAt"]),
});
