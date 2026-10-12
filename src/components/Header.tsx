import { ScanSearch } from "lucide-react";

export function Header() {
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
    </header>
  );
}
