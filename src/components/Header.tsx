import { ScanSearch, Cloud, WifiOff } from "lucide-react";
import type { AnalysisMode } from "@/types";

interface HeaderProps {
  mode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  ollamaStatus: "unknown" | "checking" | "online" | "offline";
}

export function Header({ mode, onModeChange, ollamaStatus }: HeaderProps) {
  return (
    <header className="text-center pt-12 pb-8 px-4">
      <div className="inline-flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
          <ScanSearch className="w-7 h-7 text-navy-950" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          CodeSnap <span className="text-teal-400">AI</span>
        </h1>
      </div>
      <p className="text-base sm:text-lg text-slate-400 font-medium">
        Understand errors. Fix code. Learn faster.
      </p>

      {/* Mode toggle */}
      <div className="inline-flex items-center gap-1 mt-5 rounded-xl border border-navy-700 bg-navy-800/60 p-1" role="tablist" aria-label="Analysis mode">
        <button
          role="tab"
          aria-selected={mode === "online"}
          onClick={() => onModeChange("online")}
          className={`
            inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all
            ${mode === "online"
              ? "bg-teal-500 text-navy-950 shadow-sm"
              : "text-slate-400 hover:text-white"
            }
          `}
        >
          <Cloud className="w-4 h-4" />
          Online
        </button>
        <button
          role="tab"
          aria-selected={mode === "offline"}
          onClick={() => onModeChange("offline")}
          className={`
            inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all
            ${mode === "offline"
              ? "bg-teal-500 text-navy-950 shadow-sm"
              : "text-slate-400 hover:text-white"
            }
          `}
        >
          <WifiOff className="w-4 h-4" />
          Offline
          {mode === "offline" && ollamaStatus !== "unknown" && (
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                ollamaStatus === "online"
                  ? "bg-emerald-400"
                  : ollamaStatus === "checking"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-400"
              }`}
              aria-label={`Ollama ${ollamaStatus}`}
            />
          )}
        </button>
      </div>
    </header>
  );
}
