import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from "react";
import { UploadCloud, ImageIcon, X, FileImage, Sparkles } from "lucide-react";
import { validateImageFile, fileToBase64 } from "@/lib/analysis";
import type { UploadedFile } from "@/types";

interface UploadAreaProps {
  onFileSelected: (file: UploadedFile) => void;
  onClear: () => void;
  currentFile: UploadedFile | null;
  onLoadSample: () => void;
  question: string;
  onQuestionChange: (q: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  disabled: boolean;
  maxFileSizeMB: number;
}

export function UploadArea({
  onFileSelected,
  onClear,
  currentFile,
  onLoadSample,
  question,
  onQuestionChange,
  onAnalyze,
  isLoading,
  disabled,
  maxFileSizeMB,
}: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validateImageFile(file, maxFileSizeMB);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      try {
        const { dataUrl, base64 } = await fileToBase64(file);
        onFileSelected({
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          base64,
        });
      } catch {
        setError("Failed to read the file. Please try again.");
      }
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFile],
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-5">
      {/* Drag and drop area */}
      {!currentFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          aria-label="Upload screenshot by clicking or dragging a file"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`
            relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer
            min-h-[260px] flex flex-col items-center justify-center gap-4 px-6 py-10
            ${
              isDragging
                ? "border-teal-400 bg-teal-400/10 scale-[1.01]"
                : "border-navy-600 bg-navy-800/50 hover:border-teal-500/60 hover:bg-navy-800/80"
            }
          `}
        >
          <div className="w-16 h-16 rounded-full bg-navy-700/60 flex items-center justify-center">
            <UploadCloud
              className={`w-8 h-8 transition-colors ${isDragging ? "text-teal-400" : "text-slate-400"}`}
              strokeWidth={1.5}
            />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">
              {isDragging ? "Drop your screenshot here" : "Drag & drop your screenshot"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              or click to browse — PNG, JPG, JPEG, WEBP up to {maxFileSizeMB} MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleChange}
            className="sr-only"
            aria-hidden="true"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-navy-600 bg-navy-800/50 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
                <FileImage className="w-5 h-5 text-teal-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">{currentFile.name}</p>
                <p className="text-slate-500 text-xs">{formatFileSize(currentFile.size)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClear();
                setError(null);
              }}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-navy-700/60"
              aria-label="Remove uploaded screenshot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-navy-700 bg-navy-900">
            <img
              src={currentFile.dataUrl}
              alt="Screenshot preview"
              className="w-full max-h-[400px] object-contain"
            />
          </div>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Optional question input */}
      <div>
        <label
          htmlFor="question-input"
          className="block text-sm font-medium text-slate-300 mb-2"
        >
          Optional: Ask a specific question about the error
        </label>
        <input
          id="question-input"
          type="text"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder="e.g., Why is this variable undefined?"
          maxLength={300}
          className="w-full rounded-xl border border-navy-600 bg-navy-800/60 px-4 py-3 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all"
        />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onAnalyze}
          disabled={!currentFile || isLoading || disabled}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3.5 font-semibold text-navy-950 shadow-lg shadow-teal-500/20 transition-all hover:from-teal-400 hover:to-teal-500 hover:shadow-teal-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-teal-500/20"
        >
          <Sparkles className="w-5 h-5" />
          {isLoading ? "Analyzing…" : "Analyze Screenshot"}
        </button>
        {!currentFile && (
          <button
            onClick={onLoadSample}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-navy-600 bg-navy-800/60 px-6 py-3.5 font-medium text-slate-300 transition-all hover:border-teal-500/50 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-5 h-5" />
            Try Sample Screenshot
          </button>
        )}
      </div>
    </div>
  );
}
