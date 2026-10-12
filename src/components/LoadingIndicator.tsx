import { Loader2 } from "lucide-react";

interface LoadingIndicatorProps {
  mode: "online" | "offline";
}

export function LoadingIndicator({ mode }: LoadingIndicatorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-16 px-4"
      role="status"
      aria-live="polite"
      aria-label="Analyzing screenshot"
    >
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-navy-700" />
        <div className="w-16 h-16 rounded-full border-4 border-transparent border-t-teal-400 animate-spin absolute inset-0" />
        <Loader2 className="w-6 h-6 text-teal-400 absolute inset-0 m-auto animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-lg">Analyzing your screenshot</p>
        <p className="text-slate-400 text-sm mt-1">
          {mode === "offline"
            ? "Local Ollama model is reading the error and preparing your explanation…"
            : "Gemma 4 is reading the error and preparing your explanation…"}
        </p>
      </div>
    </div>
  );
}
