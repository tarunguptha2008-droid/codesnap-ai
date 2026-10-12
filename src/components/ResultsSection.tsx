import { useState } from "react";
import {
  AlertCircle,
  Bug,
  BookOpen,
  Code2,
  ListChecks,
  ShieldCheck,
  Copy,
  Check,
  RotateCcw,
  Lightbulb,
} from "lucide-react";
import type { AnalysisResult } from "@/types";

interface ResultsSectionProps {
  result: AnalysisResult;
  onReset: () => void;
}

interface SectionProps {
  icon: typeof AlertCircle;
  iconColor: string;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, iconColor, iconBg, title, children }: SectionProps) {
  return (
    <div className="rounded-xl border border-navy-700/60 bg-navy-800/30 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <h3 className="text-white font-semibold text-base">{title}</h3>
      </div>
      <div className="text-slate-300 text-sm leading-relaxed prose-content">{children}</div>
    </div>
  );
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
      document.body.removeChild(textarea);
    }
  };

  if (!code.trim()) return null;

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-navy-600 bg-navy-700/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-teal-500/50 hover:text-white"
      aria-label="Copy code to clipboard"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-teal-400" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copy Code
        </>
      )}
    </button>
  );
}

function CodeBlock({ content }: { content: string }) {
  // Extract fenced code block from markdown
  const codeMatch = content.match(/```(?:\w+)?\n?([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1].trim() : "";
  const surrounding = codeMatch
    ? content.replace(/```[\s\S]*?```/g, "").trim()
    : content.trim();

  if (!code && !surrounding) return null;

  return (
    <div className="space-y-3">
      {surrounding && <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{surrounding}</p>}
      {code && (
        <div className="relative">
          <div className="absolute right-3 top-3 z-10">
            <CopyCodeButton code={code} />
          </div>
          <pre className="rounded-xl border border-navy-700 bg-navy-950/80 p-4 pt-12 overflow-x-auto">
            <code className="text-sm text-teal-200 font-mono leading-relaxed whitespace-pre">{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

function FormattedText({ content }: { content: string }) {
  // Render text with basic markdown: numbered lists, bullet lists, bold, code spans
  const lines = content.split("\n").filter((l) => l.trim());
  const hasListItems = lines.some((l) => /^\d+\.|^-|^\*/.test(l.trim()));

  if (!hasListItems) {
    // Simple inline formatting
    const formatted = content
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-navy-700/60 text-teal-300 text-xs font-mono">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
    return <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: formatted }} />;
  }

  return (
    <ol className="space-y-2">
      {lines.map((line, i) => {
        const cleaned = line.replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, "");
        const formatted = cleaned
          .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-navy-700/60 text-teal-300 text-xs font-mono">$1</code>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
        return (
          <li key={i} className="flex gap-3 text-sm">
            <span className="text-teal-400 font-mono font-bold shrink-0">{i + 1}.</span>
            <span dangerouslySetInnerHTML={{ __html: formatted }} />
          </li>
        );
      })}
    </ol>
  );
}

export function ResultsSection({ result, onReset }: ResultsSectionProps) {
  const hasContent =
    result.errorDetected ||
    result.likelyCause ||
    result.simpleExplanation ||
    result.suggestedFix ||
    result.stepByStep ||
    result.preventionTip;

  return (
    <div className="space-y-4">
      {hasContent ? (
        <>
          {result.errorDetected && (
            <Section icon={AlertCircle} iconColor="text-red-400" iconBg="bg-red-500/15" title="Error Detected">
              <FormattedText content={result.errorDetected} />
            </Section>
          )}

          {result.likelyCause && (
            <Section icon={Bug} iconColor="text-amber-400" iconBg="bg-amber-500/15" title="Likely Cause">
              <FormattedText content={result.likelyCause} />
            </Section>
          )}

          {result.simpleExplanation && (
            <Section icon={BookOpen} iconColor="text-sky-400" iconBg="bg-sky-500/15" title="Simple Explanation">
              <FormattedText content={result.simpleExplanation} />
            </Section>
          )}

          {result.suggestedFix && (
            <Section icon={Code2} iconColor="text-teal-400" iconBg="bg-teal-500/15" title="Suggested Fix">
              <CodeBlock content={result.suggestedFix} />
            </Section>
          )}

          {result.stepByStep && (
            <Section icon={ListChecks} iconColor="text-violet-400" iconBg="bg-violet-500/15" title="Step-by-Step Solution">
              <FormattedText content={result.stepByStep} />
            </Section>
          )}

          {result.preventionTip && (
            <Section icon={ShieldCheck} iconColor="text-emerald-400" iconBg="bg-emerald-500/15" title="Prevention Tip">
              <div className="flex gap-3">
                <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <FormattedText content={result.preventionTip} />
              </div>
            </Section>
          )}

          {result.model && (
            <p className="text-center text-xs text-slate-600 pt-2">
              Analyzed with <span className="text-slate-500 font-mono">{result.model}</span>
            </p>
          )}
        </>
      ) : (
        // Fallback: show raw markdown if parsing failed
        <div className="rounded-xl border border-navy-700/60 bg-navy-800/30 p-5">
          <h3 className="text-white font-semibold text-base mb-3">AI Analysis</h3>
          <pre className="text-slate-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {result.rawMarkdown}
          </pre>
        </div>
      )}

      <div className="flex justify-center pt-4">
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
