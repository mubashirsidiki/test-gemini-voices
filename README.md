# 🎙️ Gemini Voices

A minimalist, dark-themed text-to-speech application powered by Google's Gemini TTS API. Convert text into natural speech with 30+ voice models, customizable expressions, and real-time audio generation.

![Vercel](https://img.shields.io/badge/deployed%20on-vercel-black?style=flat-square&logo=vercel)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.x-brightgreen?style=flat-square&logo=node.js)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

---

## ✨ Features

- 🎤 **30+ Voice Models** - Choose from diverse voices with gender and trait information
- 🎭 **Expression Styles** - Professional/Neutral, Warm/Friendly speaking styles
- 🔍 **Gender Filtering** - Filter voices by gender (Male, Female, All)
- 🇬🇧 **Customizable Accents** - British English accent with customizable instructions
- 🎨 **Minimalist Dark UI** - Elegant, spacious, and user-friendly interface
- ⚙️ **Advanced Settings** - Fine-tune audio settings, prompts, and sample texts
- 📊 **Comprehensive Logging** - Detailed, pretty logging for debugging and monitoring
- 🔒 **Privacy-First** - API keys stored locally, never sent to external servers
- ⚡ **Serverless Architecture** - Deployed on Vercel with zero-config setup

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Vercel CLI** (for local dev): `npm i -g vercel`
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd gemini-voices

# Install dependencies
npm install
```

### Local Development

```bash
# Start development server
vercel dev
```

Visit `http://localhost:3000` and configure your API key and model in the initial setup screen.

---

## 📦 Deployment

### Deploy to Vercel

```bash
# Option 1: Using Vercel CLI
vercel

# Option 2: Git Integration
# 1. Push code to GitHub
# 2. Import project in Vercel Dashboard
# 3. Deploy automatically
```

**Note:** No environment variables needed! API keys and model selection are configured directly in the UI.

---

## 📁 Project Structure

```
gemini-voices/
├── index.html              # Main application UI
├── styles.css              # Dark-themed, minimalist styles
├── app.js                  # Frontend logic & state management
├── config.js               # Backend configuration (voice models, expressions)
├── config-frontend.js      # Frontend configuration constants
├── api/
│   ├── models.js          # GET /api/models - Voice models & expressions
│   └── synthesize.js      # POST /api/synthesize - Text-to-speech synthesis
├── utils/
│   └── logger.js          # Comprehensive logging utility
├── vercel.json            # Vercel deployment configuration
└── package.json           # Dependencies & scripts
```

---

## 🎯 Usage

### Initial Setup

1. **Enter API Key** - Your Google Gemini API key (stored locally)
2. **Select Model** - Choose from:
   - `gemini-2.5-pro-preview-tts` - High control for structured workflows
   - `gemini-2.5-flash-preview-tts` - Price-performance, low-latency

### Generating Speech

1. **Enter Text** - Type or paste your text (up to 5000 characters)
2. **Select Voice** - Choose from 30+ voices, optionally filter by gender
3. **Choose Expression** - Professional/Neutral or Warm/Friendly
4. **Generate** - Click "Generate Speech" and play the audio

### Advanced Settings

Access the settings panel to customize:
- Audio format (sample rate, channels, bit depth)
- Accent instructions
- Expression instructions
- Sample texts
- Default voice and expression

---

## 🔌 API Endpoints

### `GET /api/models`

Returns available voice models, expressions, and sample texts.

**Response:**
```json
{
  "voice_models": ["Puck", "Kore", ...],
  "voice_models_with_gender": [
    { "name": "Puck", "gender": "Male", "trait": "Upbeat, Middle pitch" },
    ...
  ],
  "expressions": ["professional_neutral", "warm_friendly"],
  "expression_instructions": { ... },
  "default_model": "Puck",
  "default_expression": "professional_neutral",
  "sample_texts": { ... }
}
```

### `POST /api/synthesize`

Synthesizes text to speech using Gemini TTS.

**Request Body:**
```json
{
  "text": "Hello, world!",
  "model_name": "Puck",
  "expression": "professional_neutral",
  "apiKey": "your-api-key",
  "modelId": "gemini-2.5-flash-preview-tts",
  "settings": {
    "audio": {
      "sampleRate": 24000,
      "channels": 1,
      "sampleWidth": 2,
      "format": "wav"
    },
    "accentInstruction": "Say with a natural British English (UK) accent:",
    "modelNamePlaceholder": "<modelname>",
    "expressionInstructions": { ... }
  }
}
```

**Response:**
```json
{
  "message": "Voice synthesis completed successfully",
  "file_type": "wav",
  "file_data": "base64-encoded-audio",
  "model_used": "Puck",
  "expression_used": "professional_neutral",
  "text_length": 12
}
```

---

## 🛠️ Configuration

### Voice Models

30+ prebuilt voices available, each with:
- **Name** - Voice identifier (e.g., "Puck", "Kore")
- **Gender** - Male or Female
- **Trait** - Voice characteristics (e.g., "Upbeat, Middle pitch")

### Expressions

- **Professional/Neutral** - Formal, business-like tone
- **Warm/Friendly** - Casual, approachable tone

### Audio Settings

Default: 24kHz, Mono, 16-bit PCM, converted to WAV format.

---

## 📝 Logging

The application includes comprehensive logging:

- **Server-side** - Color-coded console logs with timestamps
- **Client-side** - Styled browser console logs
- **Log Levels** - DEBUG, INFO, WARN, ERROR, SUCCESS
- **Context** - Detailed context objects for debugging

All API calls, user interactions, and errors are logged with full context.

---

## 🔒 Privacy & Security

- **Local Storage** - API keys stored in browser localStorage only
- **No Server Storage** - Keys never sent to external servers
- **Client-Side Validation** - Input validation before API calls
- **Open Source** - Verify our code - it's all open source!

---

## 🐛 Troubleshooting

### API Key Issues
- Ensure your Gemini API key is valid
- Check API key permissions for TTS models
- Verify model ID matches available models

### Audio Playback Issues
- Check browser audio permissions
- Ensure audio format is supported (WAV)
- Try refreshing the page

### Network Errors
- Verify internet connection
- Check Vercel deployment status
- Review browser console for detailed error logs

---

## 📄 License

MIT License - feel free to use, modify, and distribute.

---

## 🙏 Acknowledgments

- [Google Gemini API](https://ai.google.dev/) for TTS capabilities
- [Vercel](https://vercel.com) for serverless hosting
- Built with vanilla JavaScript, HTML, and CSS

---

**Made with ❤️ for natural voice synthesis**
