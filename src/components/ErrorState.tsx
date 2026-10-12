import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onReset: () => void;
}

export function ErrorState({ message, onReset }: ErrorStateProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">Analysis Failed</h3>
        <p className="text-red-300/90 text-sm max-w-md mx-auto leading-relaxed">{message}</p>
      </div>
      <div className="flex justify-center">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl border border-navy-600 bg-navy-800/60 px-6 py-3 font-medium text-slate-300 transition-all hover:border-teal-500/50 hover:text-white"
        >
          <RotateCcw className="w-4 h-4" />
          Try Another Screenshot
        </button>
      </div>
    </div>
  );
}
