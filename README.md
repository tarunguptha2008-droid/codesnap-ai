# CodeSnap AI

**Understand errors. Fix code. Learn faster.**

CodeSnap AI is a developer tool that analyzes screenshots of coding errors using **Gemma 4** (model: `gemma-4-26b-a4b-it`) through the Gemini API. Upload a screenshot of an error from your IDE, terminal, browser console, or compiler, and get back a beginner-friendly explanation, the likely cause, a corrected code example, a step-by-step fix, and a prevention tip.

Built for the **Best Use of Gemma 4 Hack Day**.

---

## Features

- **Drag-and-drop upload** — Drop a PNG, JPG, JPEG, or WEBP screenshot (up to 10 MB)
- **Image preview** with file name and size
- **Optional question** — Ask a specific question about your error
- **Structured results**:
  1. Error Detected
  2. Likely Cause
  3. Simple Explanation (beginner-friendly)
  4. Suggested Fix (with copyable code block)
  5. Step-by-Step Solution
  6. Prevention Tip
- **Copy Code** button for the suggested fix
- **Sample screenshot** — Load a real coding error with one click
- **Loading, success, and error states** with clear messaging
- **Mobile-responsive** dark navy + teal developer-tool aesthetic
- **Accessible** — keyboard navigation, ARIA labels, focus indicators
- **Secure** — API key never exposed to the client

---

## Architecture

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│   React Frontend    │────▶│  Supabase Edge Function  │────▶│  Gemini API     │
│  (Vite + Tailwind)  │◀────│  (analyze-screenshot)     │◀────│  (Gemma 4)      │
└─────────────────────┘     └──────────────────────────┘     └─────────────────┘
```

### Frontend
- **React + TypeScript + Tailwind CSS**
- **Lucide React** for icons
- User uploads an image → it's converted to base64 → sent to the edge function
- The frontend never touches the Gemini API key

### Backend (Edge Function)
- **Supabase Edge Function** (`supabase/functions/analyze-screenshot/`)
- Uses the official `@google/genai` SDK (pinned via `npm:@google/genai@^1.0.0`)
- Reads `GEMINI_API_KEY` from server-side secrets (never in client code)
- Validates image type (PNG/JPEG/WEBP) and size (max 10 MB) on the server
- Returns structured error messages without exposing secrets
- Does not store uploaded screenshots or API keys

### Why a server function?
The Gemini API key must never be exposed in client-side JavaScript or in `VITE_`-prefixed environment variables. The edge function acts as a secure proxy: the browser sends the screenshot to the function, and the function calls the Gemini API with the secret key.

---

## Model

| Setting | Value |
|---------|-------|
| Model ID | `gemma-4-26b-a4b-it` |
| Provider | Gemini API (Google) |
| Configurable via | `GEMMA_MODEL_ID` environment variable on the server |

---

## Setup

### Prerequisites
- Node.js 18+
- A Supabase project (or this Bolt project)
- A Google Gemini API key with access to Gemma 4

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

### 3. Set the Gemini API key as a server secret

The `GEMINI_API_KEY` must be set as a Supabase Edge Function secret — **not** in `.env` or any client-visible file:

```bash
supabase secrets set GEMINI_API_KEY=your-actual-api-key
```

To optionally override the model:

```bash
supabase secrets set GEMMA_MODEL_ID=gemma-4-26b-a4b-it
```

### 4. Run locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 5. Build for production

```bash
npm run build
```

---

## Deploying the Server Function

The edge function is deployed to Supabase. From the project root:

```bash
supabase functions deploy analyze-screenshot
```

Ensure the `GEMINI_API_KEY` secret is set before deploying:

```bash
supabase secrets set GEMINI_API_KEY=your-key
```

The function is accessible at:
```
https://<your-project>.supabase.co/functions/v1/analyze-screenshot
```

---

## How It Works

1. **Upload** — User drags/drops or browses for a screenshot (PNG/JPG/WEBP)
2. **Preview** — The image is shown with its filename
3. **Analyze** — User clicks "Analyze Screenshot"
4. **Server call** — The frontend sends the base64 image + optional question to the edge function
5. **Gemma 4** — The edge function calls the Gemini API with the image and a structured prompt
6. **Results** — The AI response is parsed into six structured sections and displayed

### AI Prompt Structure

The system prompt instructs Gemma 4 to return:
1. **Error Detected** — what the error is
2. **Likely Cause** — what's causing it
3. **Simple Explanation** — beginner-friendly English
4. **Suggested Fix** — corrected code in a code block
5. **Step-by-Step Solution** — numbered fix steps
6. **Prevention Tip** — one tip to avoid recurrence

If the screenshot is unclear or doesn't contain a coding error, the AI is instructed to say so rather than fabricating an answer.

---

## Demo / Sample

Click **"Try Sample Screenshot"** to load a pre-built image of a real JavaScript `ReferenceError` (using an undefined variable `coun` instead of `count`). The sample is sent through the actual Gemma 4 API — no fake results are shown.

---

## Limitations

- **API availability**: If the Gemini API is unavailable or the `GEMINI_API_KEY` is not configured, the app shows a clear error message.
- **Image quality**: Blurry or low-resolution screenshots may produce less accurate analysis.
- **Non-code screenshots**: The AI will indicate when it cannot identify a coding error.
- **No persistence**: Uploaded screenshots are not stored — they're processed in-memory and discarded.
- **Rate limits**: Subject to Gemini API rate limits.
- **Model availability**: Gemma 4 (`gemma-4-26b-a4b-it`) availability depends on your Google API access.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Icons | Lucide React |
| Backend | Supabase Edge Functions (Deno) |
| AI SDK | `@google/genai` (official Google Gen AI SDK) |
| Model | Gemma 4 (`gemma-4-26b-a4b-it`) |

---

## Project Structure

```
├── public/
│   ├── favicon.svg
│   └── samples/
│       └── error-screenshot.svg      # Sample error screenshot
├── src/
│   ├── components/
│   │   ├── Header.tsx                # Logo + subtitle
│   │   ├── UploadArea.tsx            # Drag-drop, preview, question input
│   │   ├── ResultsSection.tsx        # Structured results display
│   │   ├── LoadingIndicator.tsx      # Loading animation
│   │   └── ErrorState.tsx            # Error display
│   ├── lib/
│   │   └── analysis.ts               # API call, parsing, validation
│   ├── types.ts                      # TypeScript types
│   ├── App.tsx                       # Main app component
│   ├── main.tsx                      # React entry point
│   └── index.css                     # Global styles
├── supabase/
│   ├── config.toml                   # Edge function config
│   └── functions/
│       └── analyze-screenshot/
│           └── index.ts              # Secure server function
├── .env.example                      # Environment variable template
├── .gitignore
├── LICENSE                           # MIT
├── README.md
└── package.json
```

---

## License

MIT — see [LICENSE](LICENSE).
