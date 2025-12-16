/**
 * Backend Configuration
 * Used by API serverless functions
 */

export const CONFIG = {
  // Voice Models with Gender and Traits
  voiceModels: [
    // Female voices
    { name: "Achernar", gender: "Female", trait: "Soft, Higher pitch" },
    { name: "Aoede", gender: "Female", trait: "Breezy, Middle pitch" },
    { name: "Autonoe", gender: "Female", trait: "Bright, Middle pitch" },
    { name: "Callirrhoe", gender: "Female", trait: "Easy-going, Middle pitch" },
    { name: "Despina", gender: "Female", trait: "Smooth, Middle pitch" },
    { name: "Erinome", gender: "Female", trait: "Clear, Middle pitch" },
    { name: "Gacrux", gender: "Female", trait: "Mature, Middle pitch" },
    { name: "Kore", gender: "Female", trait: "Firm, Middle pitch" },
    { name: "Laomedeia", gender: "Female", trait: "Upbeat, Higher pitch" },
    { name: "Leda", gender: "Female", trait: "Youthful, Higher pitch" },
    { name: "Pulcherrima", gender: "Female", trait: "Forward, Middle pitch" },
    { name: "Sulafat", gender: "Female", trait: "Warm, Middle pitch" },
    { name: "Vindemiatrix", gender: "Female", trait: "Gentle, Middle pitch" },
    { name: "Zephyr", gender: "Female", trait: "Bright, Higher pitch" },
    // Male voices
    { name: "Achird", gender: "Male", trait: "Friendly, Lower middle pitch" },
    { name: "Algenib", gender: "Male", trait: "Gravelly, Lower pitch" },
    { name: "Algieba", gender: "Male", trait: "Smooth, Lower pitch" },
    { name: "Alnilam", gender: "Male", trait: "Firm, Lower middle pitch" },
    { name: "Charon", gender: "Male", trait: "Informative, Lower pitch" },
    { name: "Enceladus", gender: "Male", trait: "Breathy, Lower pitch" },
    { name: "Fenrir", gender: "Male", trait: "Excitable, Lower middle pitch" },
    { name: "Iapetus", gender: "Male", trait: "Clear, Lower middle pitch" },
    { name: "Orus", gender: "Male", trait: "Firm, Lower middle pitch" },
    { name: "Puck", gender: "Male", trait: "Upbeat, Middle pitch" },
    { name: "Rasalgethi", gender: "Male", trait: "Informative, Middle pitch" },
    { name: "Sadachbia", gender: "Male", trait: "Lively, Lower pitch" },
    { name: "Sadaltager", gender: "Male", trait: "Knowledgeable, Middle pitch" },
    { name: "Schedar", gender: "Male", trait: "Even, Lower middle pitch" },
    { name: "Umbriel", gender: "Male", trait: "Easy-going, Lower middle pitch" },
    { name: "Zubenelgenubi", gender: "Male", trait: "Casual, Lower middle pitch" }
  ],
  expressions: ["professional_neutral", "warm_friendly"],
  defaultModel: "Puck",
  defaultExpression: "professional_neutral",

  // Expression Instructions
  expressionInstructions: {
    professional_neutral: "Speak in a professional and neutral tone. Maintain a formal, business-like demeanor with clear articulation. Use precise language, avoid emotional expressions, and keep your delivery measured and objective. This tone is appropriate for corporate communications, technical explanations, and formal interactions where clarity and professionalism are paramount.",
    warm_friendly: "Speak in a warm and friendly tone. Use a conversational, approachable style with genuine warmth in your voice. Show empathy and understanding, use friendly language, and maintain a positive, welcoming demeanor. This tone is ideal for customer service, personal interactions, and situations where building rapport and making the user feel comfortable is important."
  },

  // Audio Format Settings
  audio: {
    sampleRate: 24000,
    channels: 1,
    sampleWidth: 2,
    format: "wav"
  },

  // Prompt Configuration
  accentInstruction: "Say with a natural British English (UK) accent:",
  modelNamePlaceholder: "<modelname>",

  // Gemini API Settings
  geminiTTSModel: "gemini-2.5-flash-preview-tts", // Default TTS model (can be overridden by user selection in UI)

  // Sample Texts
  sampleTexts: {
    greeting: "Hi, you're through to [Business Name]. My name's Vera — how may I help you today?",
    business: "Thank you for calling. We're currently experiencing high call volumes. Your call is important to us, and we'll be with you as soon as possible. Please hold the line.",
    customer: "I understand your concern, and I'm here to help resolve this for you. Let me look into that right away. Could you please provide me with your account number?",
    announcement: "Good morning, everyone. This is an important announcement. Please ensure all safety protocols are followed. Thank you for your attention."
  }
};

