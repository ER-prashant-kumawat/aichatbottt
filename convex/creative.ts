import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ============================================
// HuggingFace FREE AI Models for Creative Work
// ============================================

// HuggingFace API URL (api-inference is deprecated, use router only)
const HF_API_URL = "https://router.huggingface.co/hf-inference/models";

// FREE Image Models
const IMAGE_MODELS = {
  "stabilityai/stable-diffusion-xl-base-1.0": "Stable Diffusion XL",
  "runwayml/stable-diffusion-v1-5": "Stable Diffusion 1.5",
  "prompthero/openjourney-v4": "OpenJourney v4",
  "CompVis/stable-diffusion-v1-4": "Stable Diffusion 1.4",
} as const;

// FREE Video Models
const VIDEO_MODELS = {
  "damo-vilab/text-to-video-ms-1.7b": "Text to Video 1.7B",
} as const;

// FREE 3D Models
const THREE_D_MODELS = {
  "openai/shap-e": "Shap-E (Text to 3D)",
} as const;

// FREE Image Utility Models
const UTILITY_MODELS = {
  "briaai/RMBG-2.0": "Background Remover",
  "stabilityai/stable-diffusion-x4-upscaler": "Image Upscaler 4x",
} as const;

function getHfToken(): string {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("HF_TOKEN not set");
  return token;
}

// Helper: call HuggingFace API
async function fetchHF(
  modelId: string,
  options: RequestInit
): Promise<Response> {
  const headers = {
    Authorization: `Bearer ${getHfToken()}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  const url = `${HF_API_URL}/${modelId}`;
  console.log("🔗 Calling:", url);
  return await fetch(url, { ...options, headers });
}

// ===========================
// IMAGE GENERATION (FREE - Pollinations.ai)
// No API key needed, unlimited, 100% free
// ===========================
export const generateImage = action({
  args: {
    prompt: v.string(),
    model: v.optional(v.string()),
    negativePrompt: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const model = args.model || "flux";
    console.log("🎨 Generating image with Pollinations.ai");
    console.log("📝 Prompt:", args.prompt);

    try {
      // Pollinations.ai - 100% free, no API key needed
      const encodedPrompt = encodeURIComponent(args.prompt);
      const negPrompt = args.negativePrompt
        ? `&negative=${encodeURIComponent(args.negativePrompt)}`
        : "";
      const seed = Date.now();
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&nologo=true&model=${model}&seed=${seed}${negPrompt}`;

      console.log("🔗 Verifying Pollinations.ai image URL...");

      // Just verify the URL works with a HEAD request, don't download the full image
      const response = await fetch(imageUrl, { method: "HEAD" });

      if (!response.ok) {
        // If HEAD fails, try a GET to confirm
        const getResponse = await fetch(imageUrl);
        if (!getResponse.ok) {
          console.error("❌ Pollinations error:", getResponse.status);
          return {
            success: false,
            error: `Image generation failed (${getResponse.status}). Please try again.`,
          };
        }
        // Discard body, we just needed to confirm it works
        await getResponse.arrayBuffer();
      }

      console.log("✅ Image URL verified via Pollinations.ai");
      // Return the direct URL instead of base64 - avoids size limits and conversion issues
      return {
        success: true,
        imageBase64: imageUrl,
        model: "pollinations-" + model,
        prompt: args.prompt,
      };
    } catch (error: any) {
      console.error("❌ Image generation error:", error.message);
      return {
        success: false,
        error: `Image generation failed: ${error.message}. Please try again.`,
      };
    }
  },
});

// ===========================
// BACKGROUND REMOVAL (FREE)
// ===========================
export const removeBackground = action({
  args: {
    imageBase64: v.string(),
  },
  handler: async (_ctx, args) => {
    console.log("🔲 Removing background...");

    // Convert base64 to binary
    const base64Data = args.imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Try multiple BG removal models in order
    const bgModels = [
      "briaai/RMBG-2.0",
      "briaai/RMBG-1.4",
      "schirrmacher/lama-cleaner",
    ];

    let lastError = "";

    for (const modelId of bgModels) {
      console.log("🔄 Trying BG removal model:", modelId);

      try {
        const response = await fetch(`${HF_API_URL}/${modelId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getHfToken()}`,
            "Content-Type": "application/octet-stream",
          },
          body: bytes,
        });

        if (response.status === 503) {
          return {
            success: false,
            error:
              "Background removal model is loading... Please try again in 30-60 seconds.",
          };
        }

        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );

          console.log("✅ Background removed with", modelId);
          return {
            success: true,
            imageBase64: `data:image/png;base64,${base64}`,
          };
        }

        lastError = `${modelId}: ${response.status}`;
        console.log("⚠️ Model unavailable:", lastError);
      } catch (err: any) {
        lastError = `${modelId}: ${err.message}`;
        console.log("⚠️ Error:", lastError);
      }
    }

    return {
      success: false,
      error: `Background removal temporarily unavailable. All models returned errors. Try again in 1-2 minutes. (${lastError})`,
    };
  },
});

// ===========================
// IMAGE TO IMAGE (FREE)
// ===========================
export const imageToImage = action({
  args: {
    imageBase64: v.string(),
    prompt: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    console.log("🖌️ Image-to-image transformation...");

    const model = args.model || "lllyasviel/sd-controlnet-canny";

    const response = await fetchHF(model, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: {
          image: args.imageBase64,
          prompt: args.prompt,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 503) {
        return {
          success: false,
          error: "Model loading... try again in 20-30 seconds.",
        };
      }
      return {
        success: false,
        error: `Image-to-image failed (${response.status}). Try again.`,
      };
    }

    const buffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    return {
      success: true,
      imageBase64: `data:image/png;base64,${base64}`,
    };
  },
});

// ===========================
// VIDEO GENERATION (FREE)
// ===========================
export const generateVideo = action({
  args: {
    prompt: v.string(),
  },
  handler: async (_ctx, args) => {
    console.log("🎬 Generating video:", args.prompt);

    // Try multiple video models
    const videoModels = [
      "damo-vilab/text-to-video-ms-1.7b",
      "ali-vilab/text-to-video-ms-1.7b",
      "cerspense/zeroscope_v2_576w",
    ];

    let lastError = "";

    for (const modelId of videoModels) {
      console.log("🔄 Trying video model:", modelId);

      try {
        const response = await fetch(`${HF_API_URL}/${modelId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getHfToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: args.prompt,
            parameters: {
              num_frames: 16,
              num_inference_steps: 25,
            },
          }),
        });

        if (response.status === 503) {
          const body = await response.text();
          let eta = "1-2 minutes";
          try {
            const parsed = JSON.parse(body);
            if (parsed.estimated_time) {
              eta = `~${Math.ceil(parsed.estimated_time)} seconds`;
            }
          } catch {}
          return {
            success: false,
            error: `Video model "${modelId.split("/")[1]}" is loading (${eta}). Please try again shortly.`,
            estimatedTime: 60,
          };
        }

        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(buffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ""
            )
          );

          console.log("✅ Video generated with", modelId);
          return {
            success: true,
            videoBase64: `data:video/mp4;base64,${base64}`,
            prompt: args.prompt,
          };
        }

        lastError = `${modelId}: ${response.status}`;
        console.log("⚠️ Video model unavailable:", lastError);
      } catch (err: any) {
        lastError = `${modelId}: ${err.message}`;
        console.log("⚠️ Error:", lastError);
      }
    }

    return {
      success: false,
      error: `Video generation temporarily unavailable. Models are either loading or not accessible right now. Try again in 1-2 minutes. (${lastError})`,
    };
  },
});

// ===========================
// AI TEXT FOR 3D SCENE DESC
// ===========================
export const generate3DScene = action({
  args: {
    prompt: v.string(),
  },
  handler: async (_ctx, args) => {
    console.log("🧊 Generating 3D scene description:", args.prompt);

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return { success: false, error: "GROQ_API_KEY not set", objects: [] };

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a 3D scene generator. Given a description, output ONLY a valid JSON array of 3D objects. Each object has: {"type": "box"|"sphere"|"cylinder"|"cone"|"torus", "position": [x,y,z], "rotation": [x,y,z], "scale": [x,y,z], "color": "#hexcolor"}. Generate 5-15 objects that form the described scene. Output ONLY JSON, no markdown, no explanation.`,
            },
            { role: "user", content: args.prompt },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        sceneData: "[]",
        prompt: args.prompt,
        error: `3D scene generation failed (${response.status}). Try again.`,
      };
    }

    const data = await response.json();
    const sceneText = data.choices?.[0]?.message?.content?.trim() || "[]";

    console.log("✅ 3D scene generated");
    return {
      success: true,
      sceneData: sceneText,
      prompt: args.prompt,
    };
  },
});

// ===========================
// SAVE CREATION TO DB
// ===========================
export const saveCreation = mutation({
  args: {
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
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("creations", {
      userId: args.userId,
      type: args.type,
      prompt: args.prompt,
      model: args.model,
      dataUrl: args.dataUrl,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

// ===========================
// GET USER CREATIONS
// ===========================
export const getCreations = query({
  args: {
    userId: v.id("users"),
    type: v.optional(
      v.union(
        v.literal("image"),
        v.literal("video"),
        v.literal("3d"),
        v.literal("map_snapshot")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.type) {
      const all = await ctx.db
        .query("creations")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
      return all
        .filter((c) => c.type === args.type)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
    return await ctx.db
      .query("creations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const deleteCreation = mutation({
  args: {
    id: v.id("creations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const creation = await ctx.db.get(args.id);
    if (!creation) throw new Error("Creation not found");
    if (creation.userId !== args.userId) {
      throw new Error("Unauthorized: Not your creation");
    }
    await ctx.db.delete(args.id);
  },
});

// Export model lists for frontend
export const getAvailableModels = query({
  args: {},
  handler: async () => {
    return {
      image: IMAGE_MODELS,
      video: VIDEO_MODELS,
      threeD: THREE_D_MODELS,
      utility: UTILITY_MODELS,
    };
  },
});
