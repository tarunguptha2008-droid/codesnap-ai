# CodeSnap AI

**Understand errors. Fix code. Learn faster.**

CodeSnap AI is a developer tool that analyzes screenshots of coding errors using AI. Upload a screenshot of an error from your IDE, terminal, browser console, or compiler, and get back a beginner-friendly explanation, the likely cause, a corrected code example, a step-by-step fix, and a prevention tip.

Built for the **Best Use of Gemma 4 Hack Day**.

## Two Modes

| Mode | AI Engine | Requires Internet | Setup |
|------|-----------|-------------------|-------|
| **Online** | Gemma 4 (`gemma-4-26b-a4b-it`) via Gemini API | Yes | Supabase edge function + Gemini API key |
| **Offline** | Ollama local model (`gemma4:e2b` by default) | No (after setup) | Ollama + Node.js backend on your machine |

Switch between modes using the **Online / Offline** toggle in the header.

---

## Features

- **Drag-and-drop upload** — Drop a PNG, JPG, JPEG, or WEBP screenshot (up to 10 MB online, 5 MB offline)
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
- **Secure** — API keys never exposed to the client; Ollama is never called from the browser

---

## Architecture

### Online Mode

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│   React Frontend    │────▶│  Supabase Edge Function  │────▶│  Gemini API     │
│  (Vite + Tailwind)  │◀────│  (analyze-screenshot)     │◀────│  (Gemma 4)      │
└─────────────────────┘     └──────────────────────────┘     └─────────────────┘
```

### Offline Mode

```
┌─────────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│   React Frontend    │────▶│  Node.js Express Backend  │────▶│  Ollama Server  │
│  (Vite + Tailwind)  │◀────│  (POST /api/explain-offline)│◀────│  (127.0.0.1:11434)│
└─────────────────────┘     └──────────────────────────┘     └─────────────────┘
         │                              │
         │  GET /api/health             │
         └──────────────────────────────┘
```

The Vite dev server proxies `/api` requests to the Node.js backend at `http://localhost:3001`.

---

## Online Mode Setup (Gemma 4 via Gemini API)

### Prerequisites
- Node.js 18+
- A Supabase project
- A Google Gemini API key with access to Gemma 4

### Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Copy `.env.example` to `.env`** and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```

3. **Set the Gemini API key** as a Supabase Edge Function secret:
   ```bash
   supabase secrets set GEMINI_API_KEY=your-actual-api-key
   ```

4. **Deploy the edge function:**
   ```bash
   supabase functions deploy analyze-screenshot
   ```

5. **Run the frontend:**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`. Use the **Online** mode toggle.

---

## Offline Mode Setup (Ollama on Windows)

This mode runs entirely on your laptop. After setup, no internet connection is required.

### Step 1: Install Ollama

1. Go to [https://ollama.com/download](https://ollama.com/download)
2. Download the **Windows** installer (`OllamaSetup.exe`)
3. Run the installer and follow the prompts
4. After installation, Ollama runs automatically in the background. Verify it is running:
   ```powershell
   ollama --version
   ```

### Step 2: Download the model

Open PowerShell or Command Prompt and run:

```powershell
ollama pull gemma4:e2b
```

This downloads the vision-capable model (~5 GB). Wait for the download to complete. You can verify it installed:
```powershell
ollama list
```

You should see `gemma4:e2b` in the list.

> **Different model?** Set the `OLLAMA_MODEL` environment variable to use a different model name (see Step 4).

### Step 3: Start the Ollama server

Ollama usually starts automatically. If it isn't running, start it manually:

```powershell
ollama serve
```

Verify it is reachable:
```powershell
curl http://127.0.0.1:11434/api/tags
```

You should see a JSON response listing installed models.

### Step 4: Configure the backend (optional)

The backend reads these environment variables (all have sensible defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `gemma4:e2b` | Model name to use |
| `PORT` | `3001` | Backend server port |

To override any of these, set them in a `.env` file at the project root (already in `.env.example`):

```env
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma4:e2b
PORT=3001
```

### Step 5: Install dependencies

From the project root:

```powershell
npm install
```

### Step 6: Start the backend and frontend

You need two terminal windows:

**Terminal 1 — Backend:**
```powershell
npm run dev:server
```

You should see:
```
CodeSnap AI backend running on http://localhost:3001
Ollama URL: http://127.0.0.1:11434
Ollama model: gemma4:e2b
```

**Terminal 2 — Frontend:**
```powershell
npm run dev
```

The app will be available at `http://localhost:5173`.

> **One-command start:** You can also run both together with `npm run dev:all`.

### Step 7: Use the app in Offline Mode

1. Open `http://localhost:5173` in your browser
2. Click the **Offline** toggle in the header
3. You should see a green banner: "Ollama is running. Local inference is ready."
4. Upload a screenshot and click "Analyze Screenshot"
5. The image is sent to your local Ollama server — no internet required

### Running without internet

After completing Steps 1–6 above, you can disconnect from the internet. Everything runs locally:
- Ollama serves the model from your machine
- The Node.js backend proxies requests to Ollama
- Vite serves the frontend

No external API calls are made in offline mode.

### Troubleshooting (Offline Mode)

| Problem | Solution |
|---------|----------|
| "Ollama is not reachable" | Run `ollama serve` in a terminal, then click the Offline toggle again |
| "Model not found" | Run `ollama pull gemma4:e2b` to download the model |
| "Cannot reach the local backend" | Make sure `npm run dev:server` is running in a separate terminal |
| Image rejected | Use PNG, JPEG, or WebP under 5 MB |
| Slow response | First inference may take 10–30 seconds as the model loads into memory |

---

## API Endpoints (Offline Mode Backend)

### `GET /api/health`
Checks whether Ollama is reachable and the configured model is available.

**Response (200):**
```json
{
  "ok": true,
  "ollamaUrl": "http://127.0.0.1:11434",
  "configuredModel": "gemma4:e2b",
  "modelAvailable": true,
  "installedModels": ["gemma4:e2b"]
}
```

**Response (502):**
```json
{
  "ok": false,
  "error": "Cannot reach Ollama at http://127.0.0.1:11434. Make sure Ollama is running."
}
```

### `POST /api/explain-offline`
Analyzes a screenshot using the local Ollama model.

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `screenshot` | File | Yes | PNG, JPEG, or WebP image (max 5 MB) |
| `question` | String | No | Optional question about the error |

**Response (200):**
```json
{
  "analysis": "## Error Detected\n...",
  "model": "gemma4:e2b"
}
```

---

## How It Works

1. **Upload** — User drags/drops or browses for a screenshot
2. **Preview** — The image is shown with its filename
3. **Analyze** — User clicks "Analyze Screenshot"
4. **Server call**:
   - **Online:** base64 image sent to the Supabase edge function → Gemini API
   - **Offline:** multipart image sent to Node.js backend → Ollama `/api/chat`
5. **Results** — The AI response is parsed into six structured sections and displayed

### AI Prompt Structure

The prompt instructs the AI to return:
1. **Error Detected** — what the error is
2. **Likely Cause** — what's causing it
3. **Simple Explanation** — beginner-friendly English
4. **Suggested Fix** — corrected code in a code block
5. **Step-by-Step Solution** — numbered fix steps
6. **Prevention Tip** — one tip to avoid recurrence

If the screenshot is unclear or doesn't contain a coding error, the AI is instructed to say so rather than fabricating an answer.

---

## Demo / Sample

Click **"Try Sample Screenshot"** to load a pre-built image of a real JavaScript `ReferenceError`. The sample goes through the actual AI (Gemma 4 or Ollama, depending on mode) — no fake results are shown.

---

## Limitations

- **Offline mode is local only:** A deployed Bolt-hosted website cannot access your laptop's localhost Ollama server. Offline mode works only when running the frontend and backend locally on the same machine.
- **Image quality:** Blurry or low-resolution screenshots may produce less accurate analysis.
- **Non-code screenshots:** The AI will indicate when it cannot identify a coding error.
- **No persistence:** Uploaded screenshots are not stored — they're processed in-memory and discarded.
- **Online rate limits:** Online mode is subject to Gemini API rate limits.
- **Offline model size:** The Ollama model download (~5 GB) requires disk space and a one-time internet connection.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Icons | Lucide React |
| Online backend | Supabase Edge Functions (Deno) |
| Offline backend | Node.js + Express |
| Online AI | Gemma 4 (`gemma-4-26b-a4b-it`) via `@google/genai` SDK |
| Offline AI | Ollama (`gemma4:e2b` by default) |

---

## Project Structure

```
├── public/
│   ├── favicon.svg
│   └── samples/
│       └── error-screenshot.svg      # Sample error screenshot
├── server/
│   ├── index.ts                      # Node.js Express backend (Ollama proxy)
│   └── tsconfig.json                 # Backend TypeScript config
├── src/
│   ├── components/
│   │   ├── Header.tsx                # Logo, subtitle, mode toggle
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
│           └── index.ts              # Secure Gemini API server function
├── .env.example                      # Environment variable template
├── .gitignore
├── LICENSE                           # MIT
├── README.md
├── package.json
└── vite.config.ts                    # Vite config with /api proxy
```

---

## License

MIT — see [LICENSE](LICENSE).
