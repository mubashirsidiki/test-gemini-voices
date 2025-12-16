/**
 * Frontend Configuration
 * Used by browser/client-side code
 */

const CONFIG = window.CONFIG = {
  // API Endpoints
  apiBaseUrl: "/api",
  apiModelsEndpoint: "/api/models",
  apiSynthesizeEndpoint: "/api/synthesize",

  // File Naming
  audioFilenamePrefix: "vera_voice_",

  // Error Messages
  errorMessages: {
    loadModelsFailed: "Failed to load voice models. Please refresh the page.",
    noText: "Please enter text to synthesize.",
    noModelExpression: "Please select a voice model and expression.",
    synthesisFailed: "Failed to synthesize speech. Please try again.",
    noAudioData: "No audio data received"
  }
};

