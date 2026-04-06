import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ===========================
// SEARCH ARXIV PAPERS (FREE)
// ===========================
export const searchArxiv = action({
  args: {
    query: v.string(),
    maxResults: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const max = args.maxResults || 15;
    const q = encodeURIComponent(args.query);
    console.log("📚 Searching Arxiv:", args.query);

    const url = `https://export.arxiv.org/api/query?search_query=all:${q}&start=0&max_results=${max}&sortBy=relevance&sortOrder=descending`;

    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, papers: [], error: "Arxiv search failed" };
    }

    const xml = await response.text();
    const papers = parseArxivXML(xml);
    console.log(`✅ Found ${papers.length} papers`);

    return { success: true, papers };
  },
});

// Parse Arxiv XML response
function parseArxivXML(xml: string): any[] {
  const papers: any[] = [];
  const entries = xml.split("<entry>");

  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    const title = extractTag(entry, "title")?.replace(/\s+/g, " ").trim() || "";
    const summary = extractTag(entry, "summary")?.replace(/\s+/g, " ").trim() || "";
    const published = extractTag(entry, "published") || "";
    const id = extractTag(entry, "id") || "";

    // Extract authors
    const authorMatches = entry.match(/<name>([^<]+)<\/name>/g) || [];
    const authors = authorMatches
      .map((a) => a.replace(/<\/?name>/g, ""))
      .join(", ");

    // Extract PDF link
    const pdfMatch = entry.match(/href="([^"]*)"[^>]*title="pdf"/);
    const pdfUrl = pdfMatch ? pdfMatch[1] : id;

    // Extract categories
    const catMatches = entry.match(/term="([^"]+)"/g) || [];
    const categories = catMatches
      .map((c) => c.replace(/term="|"/g, ""))
      .slice(0, 3)
      .join(", ");

    if (title) {
      papers.push({
        title,
        authors,
        abstract: summary.substring(0, 500),
        url: pdfUrl || id,
        arxivId: id.split("/abs/").pop() || id,
        published: published.split("T")[0],
        categories,
        source: "arxiv",
      });
    }
  }
  return papers;
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1] : null;
}

// ===========================
// SEARCH WIKIPEDIA (FREE)
// ===========================
export const searchWikipedia = action({
  args: {
    query: v.string(),
    maxResults: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const max = args.maxResults || 10;
    console.log("📖 Searching Wikipedia:", args.query);

    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(args.query)}&srlimit=${max}&format=json&origin=*`;

    const response = await fetch(url);
    if (!response.ok) {
      return { success: false, results: [], error: "Wikipedia search failed" };
    }

    const data = await response.json();
    const results = (data.query?.search || []).map((item: any) => ({
      title: item.title,
      snippet: item.snippet?.replace(/<[^>]+>/g, "") || "",
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
      wordcount: item.wordcount,
      source: "wikipedia",
    }));

    console.log(`✅ Found ${results.length} Wikipedia results`);
    return { success: true, results };
  },
});

// ===========================
// AI SUMMARIZE PAPER
// ===========================
export const summarizePaper = action({
  args: {
    title: v.string(),
    abstract: v.string(),
  },
  handler: async (_ctx, args) => {
    const token = process.env.GROQ_API_KEY;
    if (!token) return { success: false, error: "GROQ_API_KEY not set" };

    console.log("🤖 Summarizing paper:", args.title);

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "You are a research paper analyst. Given a paper title and abstract, provide: 1) A simple 2-3 sentence summary anyone can understand 2) Key findings (bullet points) 3) Why this paper matters 4) Related topics to explore. Use markdown formatting.",
            },
            {
              role: "user",
              content: `Paper: "${args.title}"\n\nAbstract: ${args.abstract}`,
            },
          ],
          max_tokens: 800,
          temperature: 0.5,
        }),
      }
    );

    if (!response.ok) {
      return { success: false, error: "AI summarization failed" };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";

    return { success: true, summary: text };
  },
});

// ===========================
// SAVE PAPER TO LIBRARY
// ===========================
export const savePaper = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    authors: v.string(),
    abstract: v.string(),
    url: v.string(),
    source: v.string(),
    publishedDate: v.optional(v.string()),
    collection: v.string(),
    tags: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("papers", {
      ...args,
      notes: "",
      createdAt: Date.now(),
    });
  },
});

export const getPapers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("papers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const updatePaperNotes = mutation({
  args: { id: v.id("papers"), userId: v.id("users"), notes: v.string() },
  handler: async (ctx, args) => {
    const paper = await ctx.db.get(args.id);
    if (!paper) throw new Error("Paper not found");
    if (paper.userId !== args.userId) throw new Error("Unauthorized: Not your paper");
    await ctx.db.patch(args.id, { notes: args.notes });
  },
});

export const updatePaperTags = mutation({
  args: { id: v.id("papers"), userId: v.id("users"), tags: v.string() },
  handler: async (ctx, args) => {
    const paper = await ctx.db.get(args.id);
    if (!paper) throw new Error("Paper not found");
    if (paper.userId !== args.userId) throw new Error("Unauthorized: Not your paper");
    await ctx.db.patch(args.id, { tags: args.tags });
  },
});

export const deletePaper = mutation({
  args: { id: v.id("papers"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const paper = await ctx.db.get(args.id);
    if (!paper) throw new Error("Paper not found");
    if (paper.userId !== args.userId) throw new Error("Unauthorized: Not your paper");
    await ctx.db.delete(args.id);
  },
});

// ===========================
// RESEARCH NOTES
// ===========================
export const createNote = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    folder: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("researchNotes", {
      userId: args.userId,
      title: args.title,
      content: args.content,
      folder: args.folder,
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateNote = mutation({
  args: {
    id: v.id("researchNotes"),
    userId: v.id("users"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    folder: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Note not found");
    if (note.userId !== args.userId) throw new Error("Unauthorized: Not your note");
    const { id, userId, ...updates } = args;
    const filtered: Record<string, any> = { updatedAt: Date.now() };
    if (updates.title !== undefined) filtered.title = updates.title;
    if (updates.content !== undefined) filtered.content = updates.content;
    if (updates.folder !== undefined) filtered.folder = updates.folder;
    if (updates.pinned !== undefined) filtered.pinned = updates.pinned;
    await ctx.db.patch(id, filtered);
  },
});

export const getNotes = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("researchNotes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const deleteNote = mutation({
  args: { id: v.id("researchNotes"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Note not found");
    if (note.userId !== args.userId) throw new Error("Unauthorized: Not your note");
    await ctx.db.delete(args.id);
  },
});

// ===========================
// AI PAPER WRITING ASSISTANT
// ===========================
const PAPER_PROMPTS: Record<string, string> = {
  write_section: `You are an academic paper writing assistant. Write a well-structured section for a research paper based on the user's request. Use formal academic language, proper paragraph structure, and include relevant technical details. Output only the section content in plain text (no markdown headers unless the user asks for subsections).`,

  improve: `You are an academic writing editor. Improve the given text for clarity, grammar, academic tone, and flow. Keep the original meaning but make it publication-ready. Output only the improved text.`,

  abstract: `You are an academic paper writing assistant. Generate a concise, well-structured abstract (150-250 words) for the research paper based on the provided content. Include: background, objective, methodology, key findings, and conclusion. Output only the abstract text.`,

  introduction: `You are an academic paper writing assistant. Write a comprehensive Introduction section based on the topic. Include: background context, problem statement, motivation, research objectives, and a brief overview of the paper structure. Use formal academic language.`,

  literature_review: `You are an academic paper writing assistant. Write a Literature Review section based on the topic. Discuss relevant prior work, identify research gaps, and position the current work within the existing body of knowledge. Use formal academic language and reference general findings.`,

  methodology: `You are an academic paper writing assistant. Write a Methodology section based on the topic. Describe the research approach, data collection methods, analysis techniques, and experimental setup. Be specific and detailed enough for reproducibility.`,

  conclusion: `You are an academic paper writing assistant. Write a Conclusion section based on the provided content. Summarize key findings, discuss implications, acknowledge limitations, and suggest future work directions.`,

  references: `You are an academic citation generator. Generate realistic and properly formatted academic references/citations related to the given topic. Generate 8-12 references in the requested format. Include a mix of journal articles, conference papers, and books from plausible authors and venues.`,

  research_topic: `You are an AI research assistant. For the given topic, provide a comprehensive research overview including: key concepts, current state of research, major findings, open problems, and potential research directions. Use academic language and be thorough.`,
};

export const aiPaperAssist = action({
  args: {
    content: v.string(),
    mode: v.string(),
    format: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const token = process.env.GROQ_API_KEY;
    if (!token) return { success: false, error: "GROQ_API_KEY not set" };

    const mode = args.mode || "write_section";
    const format = args.format || "IEEE";
    const systemPrompt = PAPER_PROMPTS[mode] || PAPER_PROMPTS.write_section;
    const formatNote = `\n\nNote: The paper uses ${format} format. Adjust writing style accordingly.`;

    console.log(`📝 Paper AI Assist [${mode}]:`, args.content.substring(0, 100));

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt + formatNote },
            { role: "user", content: args.content },
          ],
          max_tokens: mode === "references" ? 1500 : mode === "improve" ? 1200 : 2048,
          temperature: 0.6,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Paper AI error:", response.status, errText);
      return { success: false, error: `AI assistance failed (${response.status})` };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    const tokens = data.usage?.total_tokens || 0;

    console.log("✅ Paper AI assist complete, tokens:", tokens);
    return { success: true, result: text, tokens };
  },
});

// ===========================
// GENERATE FULL PAPER SECTION BY SECTION
// ===========================
export const generatePaperSection = action({
  args: {
    topic: v.string(),
    sectionName: v.string(),
    sectionPrompt: v.string(),
    format: v.string(),
    wordTarget: v.number(),
    previousSections: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const token = process.env.GROQ_API_KEY;
    if (!token) return { success: false, error: "GROQ_API_KEY not set" };

    console.log(`📝 Generating section [${args.sectionName}] for: ${args.topic} (~${args.wordTarget} words)`);

    const contextNote = args.previousSections
      ? `\n\nPrevious sections summary for context:\n${args.previousSections.substring(0, 1500)}`
      : "";

    // For large word targets, split into multiple chunks and combine
    const MAX_WORDS_PER_CALL = 1200;
    const chunks = Math.max(1, Math.ceil(args.wordTarget / MAX_WORDS_PER_CALL));
    let combinedText = "";
    let totalTokens = 0;

    for (let chunk = 0; chunk < chunks; chunk++) {
      const chunkWordTarget = chunk < chunks - 1
        ? MAX_WORDS_PER_CALL
        : args.wordTarget - (MAX_WORDS_PER_CALL * (chunks - 1));

      const maxTokens = Math.min(8192, Math.max(800, Math.ceil(chunkWordTarget * 2.0)));

      let chunkInstruction = "";
      if (chunks > 1) {
        if (chunk === 0) {
          chunkInstruction = `\n\nThis is part ${chunk + 1} of ${chunks} for this section. Write the FIRST part (~${chunkWordTarget} words). Start from the beginning of the section. Do NOT write a conclusion or summary - more content will follow.`;
        } else if (chunk === chunks - 1) {
          chunkInstruction = `\n\nThis is the FINAL part (${chunk + 1} of ${chunks}) for this section. Continue from where the previous part ended. Write ~${chunkWordTarget} more words. Conclude this section properly.\n\nPrevious part ended with:\n${combinedText.slice(-500)}`;
        } else {
          chunkInstruction = `\n\nThis is part ${chunk + 1} of ${chunks} for this section. Continue from where the previous part ended. Write ~${chunkWordTarget} more words. Do NOT write a conclusion - more content will follow.\n\nPrevious part ended with:\n${combinedText.slice(-500)}`;
        }
      }

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: args.sectionPrompt + `\n\nPaper format: ${args.format}. Write approximately ${chunkWordTarget} words. Be thorough, detailed, and academic. Use multiple paragraphs with proper transitions. Include specific examples, data points, and technical details where appropriate. Do NOT include the section heading itself - only the content. You MUST write at least ${Math.round(chunkWordTarget * 0.8)} words - do not stop early.${contextNote}${chunkInstruction}`,
              },
              {
                role: "user",
                content: `Research Paper Topic: "${args.topic}"\n\nWrite the "${args.sectionName}" section. Target: ~${chunkWordTarget} words. Be comprehensive, detailed, and thorough. Write LONG paragraphs with extensive details.`,
              },
            ],
            max_tokens: maxTokens,
            temperature: 0.65,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ Section [${args.sectionName}] chunk ${chunk + 1} error:`, response.status, errText);
        if (combinedText) break; // Return what we have so far
        return { success: false, error: `Failed to generate ${args.sectionName}` };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim() || "";
      totalTokens += data.usage?.total_tokens || 0;

      combinedText += (combinedText ? "\n\n" : "") + text;
      console.log(`✅ Section [${args.sectionName}] chunk ${chunk + 1}/${chunks}: ${text.split(/\s+/).length} words`);
    }

    const finalWordCount = combinedText.split(/\s+/).length;
    console.log(`✅ Section [${args.sectionName}] complete: ${finalWordCount} words total, ${totalTokens} tokens`);
    return { success: true, result: combinedText, tokens: totalTokens, wordCount: finalWordCount };
  },
});
