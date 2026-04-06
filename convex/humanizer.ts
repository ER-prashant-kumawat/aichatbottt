import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function getGroqKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  return key;
}

// Humanization mode prompts - each mode rewrites differently
const HUMANIZER_PROMPTS: Record<string, string> = {
  standard: `You are an expert text humanizer. Your job is to rewrite AI-generated text to sound completely natural and human-written. Follow these rules strictly:

1. VARY sentence length - mix short punchy sentences with longer flowing ones
2. Use NATURAL transitions like "Look," "Here's the thing," "Honestly," "That said,"
3. Add subtle IMPERFECTIONS - occasional informal phrasing, contractions (don't, can't, won't)
4. Use ACTIVE voice predominantly
5. Add personal touches - "I think," "In my experience," "What I've noticed is"
6. Break rigid paragraph structures - not every paragraph needs the same format
7. Avoid AI patterns: no "It's important to note," "In conclusion," "Furthermore," "Moreover," "Additionally"
8. Replace formal vocabulary with everyday words
9. Add rhetorical questions occasionally
10. Use em dashes — like this — for natural pauses

CRITICAL: Output ONLY the rewritten text. No explanations, no meta-commentary.`,

  academic: `You are an academic writing specialist. Rewrite the given text to sound like a well-educated human scholar wrote it naturally. Rules:

1. Use sophisticated but NATURAL academic language - not robotic formality
2. Vary sentence structure significantly - complex, compound, and simple sentences mixed
3. Include hedging language naturally: "suggests that," "appears to," "it seems likely"
4. Use discipline-appropriate terminology without over-explaining
5. Add nuanced qualifications - "while this is generally true," "with some notable exceptions"
6. Reference ideas with phrases like "as the evidence suggests" or "building on this"
7. Maintain formal tone but avoid stiff AI patterns
8. Use occasional first-person plural: "we can observe," "let us consider"
9. Ensure logical flow through natural transitions, not mechanical connectors
10. Remove ALL AI-tell phrases: "It is worth noting," "In summary," "This highlights"

CRITICAL: Output ONLY the rewritten text. No explanations.`,

  casual: `You are rewriting text to sound like a real person talking casually. Make it sound like someone writing a blog post or social media caption. Rules:

1. Use contractions everywhere - don't, isn't, they're, we'll
2. Start some sentences with "And" or "But" - it's natural
3. Use slang and colloquialisms where appropriate
4. Add filler phrases: "basically," "pretty much," "kind of," "sort of"
5. Use humor or light sarcasm when fitting
6. Break grammar rules slightly - sentence fragments are fine
7. Use "you" and "your" to address the reader directly
8. Add reactions: "wild, right?" "crazy how that works"
9. Keep paragraphs short - 2-3 sentences max
10. Sound like you're explaining something to a friend over coffee

CRITICAL: Output ONLY the rewritten text. Nothing else.`,

  professional: `You are a professional business writer. Rewrite the text to sound like a seasoned professional wrote it for a business audience. Rules:

1. Clear, direct, and authoritative tone
2. Use industry-standard language naturally
3. Be concise - eliminate unnecessary words
4. Structure information for easy scanning
5. Use confident language: "This approach delivers," "The key advantage is"
6. Add practical context: "In practice," "From a business perspective"
7. Avoid overly casual language but don't be stiff
8. Use data-oriented phrasing where appropriate
9. Natural paragraph transitions without mechanical connectors
10. Remove ALL AI patterns - no "Furthermore," "It's important to note," "In conclusion"

CRITICAL: Output ONLY the rewritten text. No meta-commentary.`,

  creative: `You are a creative writer with a unique voice. Rewrite the text to feel alive, engaging, and distinctly human. Rules:

1. Use vivid metaphors and analogies
2. Paint pictures with words - sensory details
3. Vary rhythm dramatically - staccato phrases. Then longer, flowing sentences that carry the reader forward
4. Use unexpected word choices that surprise
5. Add emotional resonance - make the reader FEEL something
6. Break conventional structure when it serves the writing
7. Use literary devices: alliteration, parallelism, contrast
8. Create a distinctive voice - not generic AI output
9. Engage the reader's imagination
10. Make dry topics interesting through creative framing

CRITICAL: Output ONLY the rewritten text. Keep the same information but make it sing.`,

  storyteller: `You are a natural storyteller. Rewrite the text as if you're telling someone a compelling story or sharing knowledge in a narrative way. Rules:

1. Open with a hook or interesting angle
2. Use narrative techniques - setup, development, payoff
3. Add anecdotes or hypothetical scenarios: "Imagine this..." "Picture a world where..."
4. Create flow through cause-and-effect chains
5. Use dialogue or quoted speech when fitting
6. Build toward insights naturally rather than listing them
7. Add human perspective and emotional context
8. Use "you" to pull the reader into the story
9. Pace information - don't dump everything at once
10. End with a memorable takeaway or thought-provoking closer

CRITICAL: Output ONLY the rewritten text. No explanations.`,
};

// ===========================
// HUMANIZE TEXT ACTION
// ===========================
export const humanizeText = action({
  args: {
    text: v.string(),
    mode: v.string(),
    intensity: v.number(), // 1-3 (light, medium, heavy)
    model: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const mode = args.mode || "standard";
    const model = args.model || "llama-3.3-70b-versatile";
    const systemPrompt = HUMANIZER_PROMPTS[mode] || HUMANIZER_PROMPTS.standard;

    const intensityGuide = args.intensity === 1
      ? "Make minimal changes - keep the core structure but remove obvious AI patterns. Light touch."
      : args.intensity === 2
        ? "Make moderate changes - restructure sentences, change vocabulary, add human touches throughout."
        : "Make significant changes - completely rewrite to sound authentically human. Change structure, vocabulary, and flow dramatically.";

    console.log(`🔄 Humanizing text [${mode}] intensity:${args.intensity}`);
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
          { role: "system", content: systemPrompt + "\n\n" + intensityGuide },
          { role: "user", content: `Rewrite this text to sound human-written:\n\n${args.text}` },
        ],
        max_tokens: 2048,
        temperature: args.intensity === 1 ? 0.6 : args.intensity === 2 ? 0.75 : 0.9,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ Humanizer error:", response.status, errText);
      return {
        success: false,
        error: `Humanization failed (${response.status}). Try again.`,
      };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "No result";
    const tokens = data.usage?.total_tokens || 0;

    console.log("✅ Humanization complete, tokens:", tokens);

    return {
      success: true,
      result: text,
      model: model,
      tokens: tokens,
      mode: mode,
      intensity: args.intensity,
    };
  },
});

// ===========================
// AI DETECTION ACTION
// ===========================
export const detectAI = action({
  args: {
    text: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const model = args.model || "llama-3.3-70b-versatile";
    const text = args.text.trim();

    if (text.length < 20) {
      return { success: false, error: "Text too short. Paste at least a few sentences for accurate detection." };
    }

    console.log("🔍 AI Detection running...");

    // ===== STEP 1: Local pattern analysis =====
    const localAnalysis = analyzeTextPatterns(text);

    // ===== STEP 2: AI-powered deep analysis =====
    const systemPrompt = `You are an expert AI content detector. Analyze the given text and determine whether it was written by AI or a human. You must be thorough and accurate.

Analyze these aspects:
1. **Sentence Structure**: AI tends to use uniform sentence lengths, parallel structures, and predictable patterns. Humans vary more.
2. **Vocabulary & Word Choice**: AI uses formal, safe vocabulary. Humans use colloquial, varied, sometimes imprecise words.
3. **Transitions**: AI overuses "Furthermore," "Moreover," "Additionally," "It's important to note," "In conclusion." Humans use natural transitions or none.
4. **Tone Consistency**: AI maintains perfectly consistent tone throughout. Human writing shifts tone naturally.
5. **Specificity**: AI gives generic examples. Humans reference specific personal experiences.
6. **Filler & Imperfections**: Humans use filler words, contractions, sentence fragments. AI is always grammatically perfect.
7. **Repetitive Patterns**: AI often repeats structural patterns (e.g., every paragraph starts with a topic sentence + explanation + example).
8. **Code Analysis** (if code): AI-generated code has overly verbose comments, perfect formatting, generic variable names, and textbook patterns.
9. **Hedging**: AI uses excessive hedging ("It's worth noting," "It should be mentioned").
10. **Emotional authenticity**: Human text has genuine emotional variance. AI text simulates emotions mechanically.

You MUST respond in EXACTLY this JSON format (no other text, no markdown):
{
  "overall_score": <number 0-100, where 0=definitely human, 100=definitely AI>,
  "verdict": "<Human Written|Likely Human|Mixed/Uncertain|Likely AI|AI Generated>",
  "confidence": <number 0-100>,
  "breakdown": {
    "sentence_uniformity": {"score": <0-100>, "detail": "<1 line explanation>"},
    "vocabulary_naturalness": {"score": <0-100>, "detail": "<1 line explanation>"},
    "transition_patterns": {"score": <0-100>, "detail": "<1 line explanation>"},
    "tone_consistency": {"score": <0-100>, "detail": "<1 line explanation>"},
    "specificity": {"score": <0-100>, "detail": "<1 line explanation>"},
    "structural_patterns": {"score": <0-100>, "detail": "<1 line explanation>"},
    "naturalness": {"score": <0-100>, "detail": "<1 line explanation>"},
    "emotional_authenticity": {"score": <0-100>, "detail": "<1 line explanation>"}
  },
  "ai_phrases_found": ["<list of AI-typical phrases found in the text>"],
  "summary": "<2-3 sentence explanation of your verdict>"
}`;

    try {
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
            { role: "user", content: `Analyze this text for AI detection:\n\n${text}` },
          ],
          max_tokens: 1500,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("❌ Detection API error:", response.status, errText);
        // Fallback to local analysis only
        return {
          success: true,
          aiScore: localAnalysis.score,
          verdict: localAnalysis.verdict,
          confidence: localAnalysis.confidence,
          breakdown: localAnalysis.breakdown,
          aiPhrasesFound: localAnalysis.aiPhrases,
          summary: localAnalysis.summary,
          method: "local",
        };
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content?.trim() || "";

      // Parse the JSON response
      let aiAnalysis;
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found");
        }
      } catch {
        console.error("❌ Failed to parse AI response, using local analysis");
        return {
          success: true,
          aiScore: localAnalysis.score,
          verdict: localAnalysis.verdict,
          confidence: localAnalysis.confidence,
          breakdown: localAnalysis.breakdown,
          aiPhrasesFound: localAnalysis.aiPhrases,
          summary: localAnalysis.summary,
          method: "local",
        };
      }

      // Combine AI analysis with local analysis for best accuracy
      const combinedScore = Math.round(
        (aiAnalysis.overall_score * 0.7) + (localAnalysis.score * 0.3)
      );

      const finalVerdict =
        combinedScore <= 15 ? "Human Written" :
        combinedScore <= 35 ? "Likely Human" :
        combinedScore <= 60 ? "Mixed / Uncertain" :
        combinedScore <= 80 ? "Likely AI" : "AI Generated";

      console.log("✅ AI Detection complete. Score:", combinedScore);

      return {
        success: true,
        aiScore: combinedScore,
        verdict: finalVerdict,
        confidence: Math.round((aiAnalysis.confidence + localAnalysis.confidence) / 2),
        breakdown: aiAnalysis.breakdown || localAnalysis.breakdown,
        aiPhrasesFound: [
          ...(aiAnalysis.ai_phrases_found || []),
          ...localAnalysis.aiPhrases,
        ].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).slice(0, 15),
        summary: aiAnalysis.summary || localAnalysis.summary,
        localScore: localAnalysis.score,
        aiModelScore: aiAnalysis.overall_score,
        method: "hybrid",
        tokens: data.usage?.total_tokens || 0,
      };
    } catch (err) {
      console.error("❌ Detection error:", err);
      // Fallback to local
      return {
        success: true,
        aiScore: localAnalysis.score,
        verdict: localAnalysis.verdict,
        confidence: localAnalysis.confidence,
        breakdown: localAnalysis.breakdown,
        aiPhrasesFound: localAnalysis.aiPhrases,
        summary: localAnalysis.summary,
        method: "local",
      };
    }
  },
});

// ===========================
// LOCAL PATTERN ANALYSIS
// ===========================
function analyzeTextPatterns(text: string) {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  let totalScore = 0;
  let checks = 0;
  const breakdown: Record<string, { score: number; detail: string }> = {};
  const foundPhrases: string[] = [];

  // 1. Check for AI-typical phrases
  const AI_PHRASES = [
    "it's important to note", "it is important to note", "it's worth noting",
    "it is worth mentioning", "in conclusion", "furthermore", "moreover",
    "additionally", "in today's world", "in the realm of", "it should be noted",
    "this highlights", "this underscores", "it is crucial", "it's crucial",
    "delve into", "delve deeper", "navigating the", "landscape of",
    "multifaceted", "paradigm", "leverage", "synergy", "holistic",
    "comprehensive approach", "in this article", "let's explore",
    "without further ado", "first and foremost", "last but not least",
    "at the end of the day", "it goes without saying", "needless to say",
    "plays a crucial role", "plays a vital role", "plays a pivotal role",
    "in the ever-evolving", "in the fast-paced", "cutting-edge",
    "game-changer", "revolutionize", "harness the power",
    "unlock the potential", "deep dive", "key takeaway",
    "stands out as", "serves as a", "aimed at", "designed to",
    "tapestry", "foster", "facilitate", "utilize", "robust",
    "seamless", "streamline", "spearhead", "underscore",
    "commendable", "noteworthy", "remarkable", "pivotal",
  ];

  const lowerText = text.toLowerCase();
  for (const phrase of AI_PHRASES) {
    if (lowerText.includes(phrase)) {
      foundPhrases.push(phrase);
    }
  }
  const phraseScore = Math.min(100, foundPhrases.length * 15);
  totalScore += phraseScore;
  checks++;
  breakdown["ai_phrases"] = {
    score: phraseScore,
    detail: foundPhrases.length > 0
      ? `Found ${foundPhrases.length} AI-typical phrases`
      : "No common AI phrases detected",
  };

  // 2. Sentence length uniformity
  if (sentences.length >= 3) {
    const lengths = sentences.map(s => s.split(/\s+/).length);
    const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avgLen, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgLen > 0 ? (stdDev / avgLen) * 100 : 0;
    // Low variation = more AI-like
    const uniformityScore = cv < 20 ? 80 : cv < 35 ? 55 : cv < 50 ? 30 : 10;
    totalScore += uniformityScore;
    checks++;
    breakdown["sentence_uniformity"] = {
      score: uniformityScore,
      detail: `Coefficient of variation: ${cv.toFixed(1)}% - ${cv < 25 ? 'very uniform (AI-like)' : cv < 45 ? 'moderate variation' : 'natural variation (human-like)'}`,
    };
  }

  // 3. Paragraph structure uniformity
  if (paragraphs.length >= 3) {
    const paraSentCounts = paragraphs.map(p => p.split(/[.!?]+/).filter(s => s.trim().length > 5).length);
    const avgParaSent = paraSentCounts.reduce((a, b) => a + b, 0) / paraSentCounts.length;
    const paraVariance = paraSentCounts.reduce((s, c) => s + Math.pow(c - avgParaSent, 2), 0) / paraSentCounts.length;
    const paraCV = avgParaSent > 0 ? (Math.sqrt(paraVariance) / avgParaSent) * 100 : 0;
    const structScore = paraCV < 15 ? 75 : paraCV < 30 ? 45 : 15;
    totalScore += structScore;
    checks++;
    breakdown["structural_patterns"] = {
      score: structScore,
      detail: `Paragraph uniformity: ${paraCV.toFixed(1)}% - ${paraCV < 20 ? 'very uniform structure (AI-like)' : 'varied structure'}`,
    };
  }

  // 4. Vocabulary diversity (type-token ratio)
  if (words.length >= 20) {
    const lowerWords = words.map(w => w.toLowerCase().replace(/[^a-z]/g, '')).filter(w => w.length > 2);
    const uniqueWords = new Set(lowerWords);
    const ttr = lowerWords.length > 0 ? uniqueWords.size / lowerWords.length : 0;
    // AI tends to have moderate-high TTR (0.5-0.7), humans can be lower or much higher
    const vocabScore = ttr > 0.75 ? 15 : ttr > 0.6 ? 40 : ttr > 0.45 ? 60 : 30;
    totalScore += vocabScore;
    checks++;
    breakdown["vocabulary_naturalness"] = {
      score: vocabScore,
      detail: `Type-token ratio: ${ttr.toFixed(3)} - ${ttr > 0.7 ? 'highly diverse (likely human)' : ttr > 0.5 ? 'moderate diversity' : 'repetitive vocabulary'}`,
    };
  }

  // 5. Contraction usage (humans use more)
  const contractionCount = (text.match(/\b(don't|can't|won't|isn't|aren't|wasn't|weren't|hasn't|haven't|hadn't|couldn't|wouldn't|shouldn't|didn't|I'm|I've|I'd|I'll|we're|we've|we'll|they're|they've|they'll|he's|she's|it's|that's|there's|who's|what's|let's)\b/gi) || []).length;
  const contractionRatio = words.length > 0 ? contractionCount / words.length : 0;
  const contractionScore = contractionRatio < 0.005 ? 65 : contractionRatio < 0.015 ? 40 : 15;
  totalScore += contractionScore;
  checks++;
  breakdown["naturalness"] = {
    score: contractionScore,
    detail: `Contractions: ${contractionCount} found (${(contractionRatio * 100).toFixed(2)}%) - ${contractionRatio < 0.005 ? 'very few (AI-like formal style)' : 'natural contraction usage'}`,
  };

  // 6. Starting word diversity
  if (sentences.length >= 4) {
    const starters = sentences.map(s => s.split(/\s+/)[0]?.toLowerCase() || '');
    const uniqueStarters = new Set(starters);
    const starterDiv = uniqueStarters.size / starters.length;
    const starterScore = starterDiv < 0.5 ? 70 : starterDiv < 0.7 ? 45 : 15;
    totalScore += starterScore;
    checks++;
    breakdown["tone_consistency"] = {
      score: starterScore,
      detail: `Sentence starter diversity: ${(starterDiv * 100).toFixed(0)}% unique - ${starterDiv < 0.5 ? 'repetitive starters (AI-like)' : 'varied openings'}`,
    };
  }

  // Calculate final
  const finalScore = checks > 0 ? Math.round(totalScore / checks) : 50;
  const confidence = Math.min(95, 40 + sentences.length * 2 + foundPhrases.length * 5);

  const verdict =
    finalScore <= 15 ? "Human Written" :
    finalScore <= 35 ? "Likely Human" :
    finalScore <= 60 ? "Mixed / Uncertain" :
    finalScore <= 80 ? "Likely AI" : "AI Generated";

  const summary = finalScore > 60
    ? `This text shows strong AI-generation patterns including ${foundPhrases.length > 0 ? `AI-typical phrases like "${foundPhrases[0]}"` : 'uniform sentence structure'} and formal, predictable writing style.`
    : finalScore > 35
    ? `This text shows some AI characteristics but also human elements. It may be AI-generated with human editing, or human-written with formal style.`
    : `This text appears to be human-written with natural variation in sentence structure, vocabulary, and tone.`;

  return {
    score: finalScore,
    verdict,
    confidence,
    breakdown,
    aiPhrases: foundPhrases,
    summary,
  };
}

// ===========================
// SAVE HUMANIZED TEXT
// ===========================
export const saveHumanized = mutation({
  args: {
    userId: v.id("users"),
    originalText: v.string(),
    humanizedText: v.string(),
    mode: v.string(),
    intensity: v.number(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("humanizedTexts", {
      userId: args.userId,
      originalText: args.originalText,
      humanizedText: args.humanizedText,
      mode: args.mode,
      intensity: args.intensity,
      model: args.model,
      createdAt: Date.now(),
    });
  },
});

// ===========================
// GET HISTORY
// ===========================
export const getHistory = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("humanizedTexts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

// ===========================
// DELETE ENTRY
// ===========================
export const deleteEntry = mutation({
  args: { id: v.id("humanizedTexts"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Entry not found");
    if (item.userId !== args.userId) throw new Error("Unauthorized: Not your entry");
    await ctx.db.delete(args.id);
  },
});
