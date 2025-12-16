# 🎙️ Gemini Voices

A text-to-speech application powered by Google's Gemini TTS API. Convert text into natural speech with 30+ voice models and customizable expressions.

![Vercel](https://img.shields.io/badge/deployed%20on-vercel-black?style=flat-square&logo=vercel)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.x-brightgreen?style=flat-square&logo=node.js)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

## ✨ Features

- 30+ voice models with gender filtering
- Professional/Neutral and Warm/Friendly expression styles
- Customizable audio settings and prompts
- Privacy-first: API keys stored locally in browser
- Serverless deployment on Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

```bash
git clone <repository-url>
cd test-gemini-voices
npm install
```

### Local Development

```bash
vercel dev
```

Visit `http://localhost:3000` and enter your API key in the setup screen.

## 📦 Deployment

```bash
vercel
```

No environment variables needed. API keys are configured in the UI and stored locally.

## 🎯 Usage

1. **Setup**: Enter your Gemini API key (validated automatically)
2. **Select Model**: Choose TTS model (Pro or Flash) and voice
3. **Enter Text**: Type or paste text (up to 5000 characters)
4. **Generate**: Select expression style and click "Generate Speech"

Access settings to customize audio format, accent instructions, and more.

## 📁 Project Structure

```
├── index.html              # Main UI
├── app.js                  # Frontend logic
├── config.js               # Backend config
├── api/
│   ├── models.js          # GET /api/models
│   └── synthesize.js      # POST /api/synthesize
└── vercel.json            # Deployment config
```

## 📄 License

MIT License
