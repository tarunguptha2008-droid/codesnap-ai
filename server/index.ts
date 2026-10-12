import express from "express";
import multer from "multer";
import cors from "cors";

const app = express();
const PORT = process.env.PORT ?? 3001;

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:e2b";
const MAX_UPLOAD = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD },
});

app.use(cors());
app.use(express.json());

const DEBUGGING_PROMPT = `You are CodeSnap AI, an expert debugging assistant.
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

function jsonResponse(res: express.Response, status: number, body: unknown) {
  return res.status(status).json(body);
}

// --- Health check: is Ollama reachable? ---
app.get("/api/health", async (_req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return jsonResponse(res, 502, {
        ok: false,
        error: `Ollama responded with HTTP ${response.status}`,
      });
    }

    const data = await response.json() as { models?: Array<{ name: string }> };
    const installedModels = data.models?.map((m) => m.name) ?? [];
    const modelAvailable = installedModels.some(
      (name) => name === OLLAMA_MODEL || name.startsWith(OLLAMA_MODEL),
    );

    return jsonResponse(res, 200, {
      ok: true,
      ollamaUrl: OLLAMA_URL,
      configuredModel: OLLAMA_MODEL,
      modelAvailable,
      installedModels,
    });
  } catch {
    return jsonResponse(res, 502, {
      ok: false,
      error: `Cannot reach Ollama at ${OLLAMA_URL}. Make sure Ollama is running.`,
    });
  }
});

// --- Offline analysis via Ollama ---
app.post("/api/explain-offline", upload.single("screenshot"), async (req, res) => {
  try {
    if (!req.file) {
      return jsonResponse(res, 400, { error: "Missing required field: screenshot (image file)." });
    }

    const mimeType = req.file.mimetype.toLowerCase().replace("image/jpg", "image/jpeg");
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return jsonResponse(res, 415, {
        error: `Unsupported image type: ${req.file.mimetype}. Supported types: PNG, JPEG, WebP.`,
      });
    }

    if (req.file.size > MAX_UPLOAD) {
      return jsonResponse(res, 413, {
        error: `Image is too large (${(req.file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 5 MB.`,
      });
    }

    const base64Image = req.file.buffer.toString("base64");
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";

    const userText = question
      ? `Analyze this screenshot of a coding error. The user also asks: "${question}"`
      : "Analyze this screenshot of a coding error.";

    // Call Ollama /api/chat with the image in the message's images array
    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          {
            role: "system",
            content: DEBUGGING_PROMPT,
          },
          {
            role: "user",
            content: userText,
            images: [base64Image],
          },
        ],
      }),
    });

    if (!ollamaResponse.ok) {
      const errText = await ollamaResponse.text().catch(() => "");
      if (ollamaResponse.status === 404) {
        return jsonResponse(res, 503, {
          error: `Model "${OLLAMA_MODEL}" not found in Ollama. Run: ollama pull ${OLLAMA_MODEL}`,
        });
      }
      return jsonResponse(res, 502, {
        error: `Ollama returned HTTP ${ollamaResponse.status}: ${errText.slice(0, 200)}`,
      });
    }

    const ollamaData = await ollamaResponse.json() as {
      message?: { content?: string };
      error?: string;
    };

    if (ollamaData.error) {
      return jsonResponse(res, 502, { error: `Ollama error: ${ollamaData.error}` });
    }

    const analysisText = ollamaData.message?.content ?? "";

    if (!analysisText.trim()) {
      return jsonResponse(res, 502, {
        error: "The AI model returned an empty response. Please try again with a clearer screenshot.",
      });
    }

    return jsonResponse(res, 200, {
      analysis: analysisText,
      model: OLLAMA_MODEL,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      return jsonResponse(res, 503, {
        error: `Cannot reach Ollama at ${OLLAMA_URL}. Make sure Ollama is running on your machine.`,
      });
    }
    return jsonResponse(res, 500, { error: `Analysis failed: ${message}` });
  }
});

app.listen(PORT, () => {
  console.log(`CodeSnap AI backend running on http://localhost:${PORT}`);
  console.log(`Ollama URL: ${OLLAMA_URL}`);
  console.log(`Ollama model: ${OLLAMA_MODEL}`);
});
