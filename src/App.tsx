import { useCallback, useState } from "react";
import { Header } from "@/components/Header";
import { UploadArea } from "@/components/UploadArea";
import { ResultsSection } from "@/components/ResultsSection";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { ErrorState } from "@/components/ErrorState";
import { parseAnalysis, urlToBase64 } from "@/lib/analysis";
import type { AnalysisResult, AppState, UploadedFile, AnalyzeApiResponse } from "@/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const SAMPLE_IMAGE_URL = "/samples/error-screenshot.svg";
const SAMPLE_IMAGE_TYPE = "image/svg+xml";

function App() {
  const [appState, setAppState] = useState<AppState>("empty");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

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
      // Fetch the SVG, convert to base64
      const { dataUrl, base64 } = await urlToBase64(SAMPLE_IMAGE_URL);
      setFile({
        name: "sample-error-screenshot.svg",
        size: 0,
        type: SAMPLE_IMAGE_TYPE,
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
      const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-screenshot`, {
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

      if (!response.ok) {
        let errorText = `The analysis service returned an error (HTTP ${response.status}).`;
        try {
          const errorBody = await response.json();
          if (errorBody?.error) {
            errorText = errorBody.error;
          }
        } catch {
          // Response wasn't JSON — use the generic error
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
        // Couldn't parse into structured sections — show raw markdown
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
      setErrorMessage(
        `Could not reach the analysis service: ${message}. Please check your connection and try again.`,
      );
      setAppState("error");
    }
  }, [file, question]);

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
    setQuestion("");
    setErrorMessage("");
    setAppState("empty");
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 text-slate-200">
      {/* Background gradient accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <Header />

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
            />
          )}

          {appState === "loading" && <LoadingIndicator />}

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
            CodeSnap AI — Powered by Gemma 4 via the Gemini API
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
