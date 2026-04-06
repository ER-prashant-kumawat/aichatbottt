import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function getGroqKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  return key;
}

// System prompts for each research mode
const RESEARCH_PROMPTS: Record<string, string> = {
  quick: `You are a research assistant. Give a clear, concise answer to the user's question. Include key facts, data points, and a brief summary. Use bullet points for clarity. Keep it under 300 words.`,

  deep: `You are an expert research analyst. Provide a comprehensive, in-depth analysis of the given topic. Structure your response with:
## Overview
Brief introduction to the topic
## Key Findings
Detailed analysis with facts and data
## Important Details
Supporting information, statistics, examples
## Expert Analysis
Your analytical perspective
## Conclusion
Summary of key takeaways

Be thorough, accurate, and detailed. Use bullet points and numbered lists where helpful. Aim for 600-1000 words.`,

  compare: `You are a comparison analyst. The user will give you two or more topics/items to compare. Create a detailed comparison with:
## Comparison: [Topic A] vs [Topic B]
### Overview of Each
Brief description of each item
### Key Differences
| Feature | Topic A | Topic B |
|---------|---------|---------|
List major differences in a table format
### Similarities
What they share in common
### Pros & Cons
For each item
### Verdict
Which is better for what use case

Be objective and data-driven.`,

  summary: `You are a summarization expert. Take the user's text or topic and create:
## Summary
A clear, well-structured summary covering all major points
## Key Points
- Bullet list of the most important takeaways
## Quick Facts
Important numbers, dates, or data points mentioned
Keep it clear and organized.`,

  explain: `You are an expert teacher. Explain the given topic in a way that anyone can understand. Use:
## What is it?
Simple explanation
## How does it work?
Step-by-step breakdown
## Real-World Example
Practical example to illustrate
## Why does it matter?
Importance and relevance
## Fun Fact
An interesting detail

Use simple language, analogies, and examples. Avoid jargon.`,

  brainstorm: `You are a creative brainstorming partner. For the given topic, generate:
## Ideas
10-15 creative ideas or solutions
## Top 3 Recommendations
Your best picks with brief reasoning
## Action Steps
How to get started with the top idea
## Resources Needed
What would be needed to execute
Be creative, think outside the box.`,
};

// ===========================
// AI RESEARCH ACTION
// ===========================
export const doResearch = action({
  args: {
    query: v.string(),
    mode: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const mode = args.mode || "quick";
    const model = args.model || "llama-3.3-70b-versatile";
    const systemPrompt = RESEARCH_PROMPTS[mode] || RESEARCH_PROMPTS.quick;

    console.log(`🔬 Research [${mode}]:`, args.query);
    console.log("🤖 Model:", model);

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getGroqKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.query },
        ],
        max_tokens: mode === "deep" ? 2048 : mode === "quick" ? 512 : 1500,
        temperature: mode === "brainstorm" ? 0.9 : 0.6,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Research error:", response.status, errText);
      return {
        success: false,
        error: `Research failed (${response.status}). Try again.`,
      };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "No results";
    const tokens = data.usage?.total_tokens || 0;

    console.log("✅ Research complete, tokens:", tokens);

    return {
      success: true,
      result: text,
      model: model,
      tokens: tokens,
    };
  },
});

// ===========================
// SAVE RESEARCH
// ===========================
export const saveResearch = mutation({
  args: {
    userId: v.id("users"),
    query: v.string(),
    mode: v.string(),
    result: v.string(),
    model: v.string(),
    saved: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("research", {
      userId: args.userId,
      query: args.query,
      mode: args.mode,
      result: args.result,
      model: args.model,
      saved: args.saved,
      createdAt: Date.now(),
    });
  },
});

// ===========================
// GET RESEARCH HISTORY
// ===========================
export const getHistory = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("research")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// ===========================
// GET SAVED RESEARCH
// ===========================
export const getSaved = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("research")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    return all.filter((r) => r.saved).sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Toggle save (ownership check)
export const toggleSave = mutation({
  args: { id: v.id("research"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Research not found");
    if (item.userId !== args.userId) throw new Error("Unauthorized: Not your research");
    await ctx.db.patch(args.id, { saved: !item.saved });
  },
});

// Delete research (ownership check)
export const deleteResearch = mutation({
  args: { id: v.id("research"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Research not found");
    if (item.userId !== args.userId) throw new Error("Unauthorized: Not your research");
    await ctx.db.delete(args.id);
  },
});
