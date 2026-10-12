export interface AnalysisResult {
  errorDetected: string;
  likelyCause: string;
  simpleExplanation: string;
  suggestedFix: string;
  stepByStep: string;
  preventionTip: string;
  rawMarkdown: string;
  model: string;
}

export interface AnalyzeApiResponse {
  analysis: string;
  model: string;
}

export type AppState = "empty" | "loading" | "success" | "error";

export type AnalysisMode = "online" | "offline";

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  base64: string;
}

export interface HealthCheckResponse {
  ok: boolean;
  ollamaUrl?: string;
  configuredModel?: string;
  modelAvailable?: boolean;
  installedModels?: string[];
  error?: string;
}
