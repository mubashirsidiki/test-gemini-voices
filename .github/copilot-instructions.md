# Gemini Voices - AI Coding Agent Instructions

## Architecture Overview

This is a Vercel-deployed voice synthesis application using Google Gemini TTS API. The codebase consists of:

- **Frontend**: Vanilla HTML/CSS/JavaScript single-page application (`index.html`, `styles.css`, `app.js`)
- **Backend**: Vercel serverless functions (Node.js) in `/api` directory
- **Deployment**: Vercel-ready with `vercel.json` configuration

## Key Patterns & Conventions

### Frontend Structure
- **`index.html`**: Main UI with form for text input, model/expression selection, and audio player
- **`styles.css`**: Dark-themed minimalist design (`#0a0a0a` background, elegant typography)
- **`app.js`**: Handles API calls, audio playback, and UI state management

### Serverless Functions
- **`api/synthesize.js`**: POST endpoint for voice synthesis, returns base64-encoded WAV audio
- **`api/models.js`**: GET endpoint returning available models and expressions
- Functions use Vercel's default export pattern: `export default async function handler(req, res)`
- Handle CORS preflight requests with `OPTIONS` method

### Configuration
- Environment variables accessed via `process.env.GEMINI_API_KEY` and `process.env.GEMINI_TTS_MODEL`
- Required: `GEMINI_API_KEY` (set in Vercel dashboard)
- Optional: `GEMINI_TTS_MODEL` (defaults to `gemini-2.5-flash-preview-tts`)
- Document in `.env.example` for local development

### Audio Processing
- Gemini TTS returns **24kHz, 16-bit, mono PCM** audio
- Convert PCM to WAV using `pcmToWav()` function (manual WAV header creation)
- Return base64-encoded WAV in JSON response
- Frontend converts base64 to Blob for HTML5 Audio playback

### Voice Synthesis Flow
1. Process text: replace `<modelname>` placeholder with actual model name
2. Build prompt: combine British accent instruction + processed text + expression instruction
3. Call Gemini: use `@google/generative-ai` SDK with `responseModalities: ['AUDIO']`
4. Extract audio: navigate `response.candidates[0].content.parts[].inlineData.data`
5. Convert format: PCM → WAV using `pcmToWav()` function
6. Return: base64-encoded WAV in JSON response

### API Response Patterns
- Success: return JSON with `file_data` (base64 WAV), `model_used`, `expression_used`, `text_length`
- Errors: return JSON with `error` and optional `detail` fields, use appropriate HTTP status codes
- Validate inputs: check for required fields and valid enum values

### Voice Models & Expressions
- Models: `Puck` (male-upbeat), `Charon` (male-informative), `Kore` (female-firm), `Leda` (female-youthful)
- Expressions: `professional_neutral`, `warm_friendly` (stored in `EXPRESSION_INSTRUCTIONS` object)
- **British accent is hardcoded** in prompts - modify `britishAccentInstruction` in `api/synthesize.js` to change

### Error Handling
- Serverless functions: Try/catch blocks, return JSON error responses with status codes
- Frontend: Display user-friendly error messages, handle network errors gracefully
- Log errors to console for debugging (Vercel logs)

### UI/UX Patterns
- Minimalist dark theme: deep blacks, subtle grays, white text
- Loading states: show spinner and disable buttons during API calls
- Smooth transitions: CSS transitions for hover effects and state changes
- Responsive design: mobile-first approach with media queries
- Audio playback: HTML5 Audio element with custom styling

## File Structure

```
/
├── index.html              # Main UI page
├── styles.css              # Dark-themed minimalist styles
├── app.js                  # Frontend JavaScript logic
├── api/
│   ├── synthesize.js       # Serverless function for synthesis
│   └── models.js           # Serverless function for model list
├── vercel.json             # Vercel configuration
├── package.json            # Dependencies (for API functions)
└── .env.example            # Environment variables template
```

## Dependencies

- `@google/generative-ai`: Google Gemini API SDK for Node.js
- Vercel serverless functions runtime (Node.js 18+)

## Development

- Local development: `vercel dev` (requires Vercel CLI)
- Environment variables: Set in Vercel dashboard or `.env.local` for local dev
- Deployment: `vercel` command or push to connected Git repository
