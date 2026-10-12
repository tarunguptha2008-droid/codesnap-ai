import type { AnalysisResult } from "@/types";

const SECTION_HEADINGS = [
  "Error Detected",
  "Likely Cause",
  "Simple Explanation",
  "Suggested Fix",
  "Step-by-Step Solution",
  "Prevention Tip",
] as const;

/**
 * Parses the markdown response from the AI into structured sections.
 * The AI is prompted to return exactly these headings as ## sections.
 */
export function parseAnalysis(markdown: string): AnalysisResult | null {
  if (!markdown.trim()) return null;

  const sections: Record<string, string> = {};
  let currentHeading = "";
  let currentLines: string[] = [];

  for (const line of markdown.split("\n")) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      if (currentHeading) {
        sections[currentHeading] = currentLines.join("\n").trim();
      }
      currentHeading = headingMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading) {
    sections[currentHeading] = currentLines.join("\n").trim();
  }

  // Try to find each section by matching against known headings (case-insensitive)
  const getSection = (target: string): string => {
    const key = Object.keys(sections).find(
      (k) => k.toLowerCase().replace(/[^a-z]/g, "") === target.toLowerCase().replace(/[^a-z]/g, ""),
    );
    return key ? sections[key] : "";
  };

  const result: AnalysisResult = {
    errorDetected: getSection("Error Detected"),
    likelyCause: getSection("Likely Cause"),
    simpleExplanation: getSection("Simple Explanation"),
    suggestedFix: getSection("Suggested Fix"),
    stepByStep: getSection("Step-by-Step Solution"),
    preventionTip: getSection("Prevention Tip"),
    rawMarkdown: markdown,
    model: "",
  };

  // If we couldn't parse any sections, return null so the UI can show raw markdown
  const hasAnySection = SECTION_HEADINGS.some((h) =>
    getSection(h).length > 0,
  );
  if (!hasAnySection) return null;

  return result;
}

/**
 * Extracts code blocks from a markdown string.
 * Returns the first fenced code block content, or the raw text if none found.
 */
export function extractCodeBlock(markdown: string): string {
  const match = markdown.match(/```(?:\w+)?\n?([\s\S]*?)```/);
  return match ? match[1].trim() : "";
}

/**
 * Converts a File to a base64 data URL and raw base64 string.
 */
export function fileToBase64(file: File): Promise<{ dataUrl: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      resolve({ dataUrl, base64 });
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  const normalizedType = file.type.toLowerCase().replace("image/jpg", "image/jpeg");
  if (!ACCEPTED_TYPES.includes(normalizedType)) {
    return "Unsupported file type. Please upload a PNG, JPG, or WEBP image.";
  }
  if (file.size > MAX_SIZE) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 10 MB.`;
  }
  return null;
}

/**
 * Fetches an image URL and converts it to PNG base64 for API upload.
 * SVG sources are rasterized to PNG via canvas so they pass server-side type validation.
 */
export async function urlToBase64(url: string): Promise<{ dataUrl: string; base64: string; type: string }> {
  const response = await fetch(url);
  const blob = await response.blob();

  // For SVG, rasterize to PNG via canvas
  if (blob.type === "image/svg+xml") {
    const dataUrl = await blobToDataURL(blob);
    const img = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 800;
    canvas.height = img.naturalHeight || 500;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available.");
    ctx.drawImage(img, 0, 0);
    const pngDataUrl = canvas.toDataURL("image/png");
    return { dataUrl: pngDataUrl, base64: pngDataUrl.split(",")[1] ?? "", type: "image/png" };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      resolve({ dataUrl, base64, type: blob.type });
    };
    reader.onerror = () => reject(new Error("Failed to read sample image."));
    reader.readAsDataURL(blob);
  });
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = src;
  });
}
