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

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  base64: string;
}
