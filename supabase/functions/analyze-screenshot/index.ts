import { GoogleGenAI } from "npm:@google/genai@^1.0.0";
import { createClient } from "npm:@supabase/supabase-js@^2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL_ID = Deno.env.get("GEMMA_MODEL_ID") ?? "gemma-4-26b-a4b-it";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const SYSTEM_PROMPT = `You are CodeSnap AI, an expert debugging assistant.
You will be shown a screenshot of a coding error (from an IDE, terminal, browser console, or compiler).

Your job:
1. Analyze the ACTUAL image content carefully.
2. Respond in clean, structured markdown with EXACTLY these sections:

## Error Detected
Name or briefly describe the error you see in the screenshot. If there are multiple, focus on the primary one.

## Likely Cause
What is most likely causing this error? Be specific.

## Simple Explanation
Explain the error in beginner-friendly English. Assume the reader is new to programming. Avoid jargon or explain it when used.

## Suggested Fix
Provide the corrected code in a fenced code block. Use the same language shown in the screenshot. If you cannot determine the exact fix, explain why and give the closest correction you can.

## Step-by-Step Solution
Numbered list of steps to fix the error, from first to last.

## Prevention Tip
One actionable tip to avoid this error in the future.

IMPORTANT RULES:
- Base your analysis ONLY on what you see in the screenshot. Do not invent errors or code that is not visible.
- If the screenshot is unclear, does not contain a coding error, or you cannot identify the error, say so explicitly in "Error Detected" and explain what you would need to help further.
- Do not make up file paths, line numbers, or code that is not visible or directly inferable from the screenshot.
- Keep your response concise and practical.`;

interface AnalyzeRequest {
  image: string;        // base64 data URI or raw base64
  mimeType?: string;    // image/png, image/jpeg, image/webp
  question?: string;    // optional user question
}

function errorResponse(status: number, message: string) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed. Use POST.");
  }

  try {
    // Fetch the API key from the Supabase vault (stored as a secret)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    let apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey && supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const { data, error } = await supabase
        .rpc("get_vault_secret", { secret_name: "GEMINI_API_KEY" });

      if (error || !data) {
        return errorResponse(
          503,
          "AI service is not configured. The GEMINI_API_KEY secret could not be retrieved. Please set it in the Supabase vault.",
        );
      }
      apiKey = data as string;
    }

    if (!apiKey) {
      return errorResponse(
        503,
        "AI service is not configured. The server is missing the GEMINI_API_KEY secret. Please contact the administrator.",
      );
    }

    let body: AnalyzeRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, "Invalid JSON body.");
    }

    const { image, mimeType, question } = body ?? {};

    if (!image || typeof image !== "string") {
      return errorResponse(400, "Missing required field: image (base64-encoded screenshot).");
    }

    // Strip data URI prefix if present
    let base64Data = image;
    let detectedMime = mimeType;
    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return errorResponse(400, "Invalid data URI format for image.");
      }
      detectedMime = match[1];
      base64Data = match[2];
    }

    if (!detectedMime) {
      return errorResponse(400, "Missing image mimeType. Provide mimeType as image/png, image/jpeg, or image/webp.");
    }

    const normalizedMime = detectedMime.toLowerCase().replace("image/jpg", "image/jpeg");
    if (!ALLOWED_TYPES.includes(normalizedMime)) {
      return errorResponse(
        415,
        `Unsupported image type: ${detectedMime}. Supported types: PNG, JPG, JPEG, WEBP.`,
      );
    }

    // Validate base64 size (approximate — base64 is ~33% larger than raw bytes)
    const approxBytes = Math.ceil((base64Data.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) {
      return errorResponse(
        413,
        `Image is too large (${(approxBytes / 1024 / 1024).toFixed(1)} MB). Maximum size is 10 MB.`,
      );
    }

    // Initialize the Google Gen AI SDK
    const ai = new GoogleGenAI({ apiKey });

    const userText = question?.trim()
      ? `Analyze this screenshot of a coding error. The user also asks: "${question.trim()}"`
      : "Analyze this screenshot of a coding error.";

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: {
        parts: [
          { text: SYSTEM_PROMPT },
          { text: userText },
          {
            inlineData: {
              mimeType: normalizedMime,
              data: base64Data,
            },
          },
        ],
      },
    });

    const analysisText = response.text ?? "";

    if (!analysisText.trim()) {
      return errorResponse(
        502,
        "The AI model returned an empty response. Please try again with a clearer screenshot.",
      );
    }

    return new Response(
      JSON.stringify({
        analysis: analysisText,
        model: MODEL_ID,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    // Never expose the API key or full stack trace
    const safeMessage = message
      .replace(/AIza[A-Za-z0-9_-]+/g, "[REDACTED]")
      .replace(/AQ\.[A-Za-z0-9_.-]+/g, "[REDACTED]");
    return errorResponse(502, `AI analysis failed: ${safeMessage}`);
  }
});
