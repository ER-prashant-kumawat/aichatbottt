import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { simpleGenerate } from "./agent";

// AI-powered content enhancement for PDF
export const enhanceContent = action({
  args: {
    content: v.string(),
    style: v.string(), // "professional", "academic", "creative", "minimal"
    instructions: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const stylePrompts: Record<string, string> = {
      professional: `You are a professional document formatter. Take the following content and enhance it for a professional PDF document.
        - Add proper headings with ## markdown
        - Improve grammar and clarity
        - Structure with bullet points where appropriate
        - Make it polished and business-ready
        - Keep the original meaning intact
        - Return ONLY the enhanced content, no explanations`,
      academic: `You are an academic document formatter. Take the following content and format it for an academic/research PDF.
        - Add proper section headings (Abstract, Introduction, Body, Conclusion if applicable)
        - Use formal academic language
        - Add proper structure and flow
        - Include citations placeholders where relevant [1], [2]
        - Return ONLY the enhanced content, no explanations`,
      creative: `You are a creative content designer. Take the following content and make it visually engaging for a PDF.
        - Add creative headings and subheadings
        - Use engaging language
        - Add relevant emoji where appropriate
        - Structure for visual appeal
        - Return ONLY the enhanced content, no explanations`,
      minimal: `You are a minimalist document formatter. Take the following content and make it clean and minimal.
        - Use short, clear sentences
        - Minimal headings - only where necessary
        - Remove fluff
        - Keep it scannable
        - Return ONLY the enhanced content, no explanations`,
    };

    const basePrompt = stylePrompts[args.style] || stylePrompts.professional;
    const extraInstructions = args.instructions ? `\n\nAdditional instructions: ${args.instructions}` : "";

    const prompt = `${basePrompt}${extraInstructions}\n\nContent to enhance:\n${args.content}`;

    const enhanced = await simpleGenerate(prompt);
    return enhanced;
  },
});

// Generate a title from content using AI
export const generateTitle = action({
  args: {
    content: v.string(),
  },
  handler: async (_ctx, args) => {
    const prompt = `Generate a short, professional title (max 8 words) for a PDF document with this content. Return ONLY the title, nothing else:\n\n${args.content.substring(0, 500)}`;
    const title = await simpleGenerate(prompt);
    return title.replace(/['"]/g, "").trim();
  },
});

// Save PDF record to database
export const savePdfRecord = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    style: v.string(),
    pageCount: v.number(),
    hasImages: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pdfDocuments", {
      userId: args.userId,
      title: args.title,
      content: args.content,
      style: args.style,
      pageCount: args.pageCount,
      hasImages: args.hasImages,
      createdAt: Date.now(),
    });
  },
});

// Get user's PDF history
export const getPdfHistory = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pdfDocuments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

// Delete a PDF record
export const deletePdfRecord = mutation({
  args: {
    id: v.id("pdfDocuments"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.userId !== args.userId) {
      throw new Error("Not authorized");
    }
    await ctx.db.delete(args.id);
  },
});
