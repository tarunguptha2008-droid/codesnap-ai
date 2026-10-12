import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { UploadArea } from "@/components/UploadArea";
import { ResultsSection } from "@/components/ResultsSection";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { ErrorState } from "@/components/ErrorState";
import { parseAnalysis, urlToBase64 } from "@/lib/analysis";
import type {
  AnalysisResult,
  AppState,
  AnalysisMode,
  UploadedFile,
  AnalyzeApiResponse,
  HealthCheckResponse,
} from "@/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SAMPLE_IMAGE_URL = "/samples/error-screenshot.svg";

type OllamaStatus = "unknown" | "checking" | "online" | "offline";

function App() {
  const [mode, setMode] = useState<AnalysisMode>("online");
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>("unknown");
  const [appState, setAppState] = useState<AppState>("empty");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Check Ollama health when switching to offline mode
  const checkOllamaHealth = useCallback(async () => {
    setOllamaStatus("checking");
    try {
      const response = await fetch("/api/health");
      const data: HealthCheckResponse = await response.json();
      if (data.ok) {
        setOllamaStatus("online");
      } else {
        setOllamaStatus("offline");
      }
    } catch {
      setOllamaStatus("offline");
    }
  }, []);

  useEffect(() => {
    if (mode === "offline") {
      checkOllamaHealth();
    } else {
      setOllamaStatus("unknown");
    }
  }, [mode, checkOllamaHealth]);

  const handleModeChange = useCallback((newMode: AnalysisMode) => {
    setMode(newMode);
    setAppState("empty");
    setResult(null);
    setErrorMessage("");
  }, []);

  const handleFileSelected = useCallback((uploaded: UploadedFile) => {
    setFile(uploaded);
    setResult(null);
    setErrorMessage("");
    setAppState("empty");
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setResult(null);
    setErrorMessage("");
    setAppState("empty");
  }, []);

  const handleLoadSample = useCallback(async () => {
    try {
      const { dataUrl, base64 } = await urlToBase64(SAMPLE_IMAGE_URL);
      setFile({
        name: "sample-error-screenshot.png",
        size: base64.length,
        type: "image/png",
        dataUrl,
        base64,
      });
      setResult(null);
      setErrorMessage("");
      setAppState("empty");
    } catch {
      setErrorMessage("Could not load the sample screenshot. Please try uploading your own image.");
      setAppState("error");
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;

    setAppState("loading");
    setErrorMessage("");

    try {
      let response: Response;

      if (mode === "offline") {
        // Offline mode: send multipart form data to the Node.js backend
        const formData = new FormData();
        // Convert data URL back to a File for multipart upload
        const blob = await (await fetch(file.dataUrl)).blob();
        formData.append("screenshot", blob, file.name);
        if (question.trim()) {
          formData.append("question", question.trim());
        }

        response = await fetch("/api/explain-offline", {
          method: "POST",
          body: formData,
        });
      } else {
        // Online mode: send JSON to the Supabase edge function
        response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-screenshot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            image: file.dataUrl,
            mimeType: file.type,
            question: question.trim() || undefined,
          }),
        });
      }

      if (!response.ok) {
        let errorText = `The analysis service returned an error (HTTP ${response.status}).`;
        try {
          const errorBody = await response.json();
          if (errorBody?.error) {
            errorText = errorBody.error;
          }
        } catch {
          // Response wasn't JSON
        }
        setErrorMessage(errorText);
        setAppState("error");
        return;
      }

      const data: AnalyzeApiResponse = await response.json();

      if (!data.analysis) {
        setErrorMessage("The AI returned an empty response. Please try again with a clearer screenshot.");
        setAppState("error");
        return;
      }

      const parsed = parseAnalysis(data.analysis);
      if (parsed) {
        parsed.model = data.model;
        setResult(parsed);
      } else {
        setResult({
          errorDetected: "",
          likelyCause: "",
          simpleExplanation: "",
          suggestedFix: "",
          stepByStep: "",
          preventionTip: "",
          rawMarkdown: data.analysis,
          model: data.model,
        });
      }
      setAppState("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      if (mode === "offline") {
        setErrorMessage(
          `Could not reach the local backend. Make sure the backend server is running (npm run dev:server). Error: ${message}`,
        );
      } else {
        setErrorMessage(
          `Could not reach the analysis service: ${message}. Please check your connection and try again.`,
        );
      }
      setAppState("error");
    }
  }, [file, question, mode]);

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
    setQuestion("");
    setErrorMessage("");
    setAppState("empty");
  }, []);

  const maxFileSizeMB = mode === "offline" ? 5 : 10;

  return (
    <div className="min-h-screen bg-navy-950 text-slate-200">
      {/* Background gradient accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <Header mode={mode} onModeChange={handleModeChange} ollamaStatus={ollamaStatus} />

        {/* Ollama status banner in offline mode */}
        {mode === "offline" && ollamaStatus === "offline" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 mb-6" role="alert">
            <strong className="font-semibold">Ollama is not reachable.</strong> Make sure Ollama is running on your machine. Open a terminal and run <code className="px-1.5 py-0.5 rounded bg-navy-700/60 text-amber-200 text-xs font-mono">ollama serve</code>, then click "Offline" again to recheck.
          </div>
        )}
        {mode === "offline" && ollamaStatus === "online" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 mb-6" role="status">
            Ollama is running. Local inference is ready.
          </div>
        )}

        <main className="space-y-6">
          {(appState === "empty" || appState === "loading") && (
            <UploadArea
              onFileSelected={handleFileSelected}
              onClear={handleClear}
              currentFile={file}
              onLoadSample={handleLoadSample}
              question={question}
              onQuestionChange={setQuestion}
              onAnalyze={handleAnalyze}
              isLoading={appState === "loading"}
              disabled={appState === "loading"}
              maxFileSizeMB={maxFileSizeMB}
            />
          )}

          {appState === "loading" && <LoadingIndicator mode={mode} />}

          {appState === "success" && result && (
            <ResultsSection result={result} onReset={handleReset} />
          )}

          {appState === "error" && (
            <>
              {file && (
                <div className="rounded-2xl border border-navy-700 bg-navy-800/50 p-5">
                  <div className="rounded-xl overflow-hidden border border-navy-700 bg-navy-900">
                    <img
                      src={file.dataUrl}
                      alt="Screenshot preview"
                      className="w-full max-h-[200px] object-contain"
                    />
                  </div>
                </div>
              )}
              <ErrorState message={errorMessage} onReset={handleReset} />
            </>
          )}
        </main>

        <footer className="text-center pt-12 pb-8">
          <p className="text-slate-600 text-xs">
            {mode === "offline"
              ? "CodeSnap AI — Offline mode, powered by Ollama on your machine"
              : "CodeSnap AI — Powered by Gemma 4 via the Gemini API"}
          </p>
          <p className="text-slate-700 text-xs mt-1">
            Screenshots are processed securely and not stored permanently.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
