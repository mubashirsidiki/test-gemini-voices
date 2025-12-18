/**
 * API endpoint for voice synthesis using Gemini TTS
 * POST /api/synthesize
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../config.js';
import { serverLogger } from '../utils/logger.js';

/**
 * Convert PCM audio data to WAV format
 * @param {Buffer|Uint8Array} pcmData - Raw PCM audio bytes
 * @param {number} sampleRate - Sample rate in Hz
 * @param {number} channels - Number of audio channels
 * @param {number} sampleWidth - Sample width in bytes
 * @returns {Buffer} WAV formatted audio bytes
 */
function pcmToWav(pcmData, sampleRate, channels, sampleWidth) {
  // Validate parameters
  if (!pcmData || (typeof pcmData !== 'string' && !Buffer.isBuffer(pcmData) && !(pcmData instanceof Uint8Array))) {
    throw new Error('Invalid pcmData: must be Buffer, Uint8Array, or string');
  }
  
  if (typeof sampleRate !== 'number' || sampleRate <= 0 || !Number.isInteger(sampleRate)) {
    throw new Error(`Invalid sampleRate: must be a positive integer, got ${sampleRate}`);
  }
  
  if (typeof channels !== 'number' || channels <= 0 || !Number.isInteger(channels)) {
    throw new Error(`Invalid channels: must be a positive integer, got ${channels}`);
  }
  
  if (typeof sampleWidth !== 'number' || sampleWidth <= 0 || !Number.isInteger(sampleWidth)) {
    throw new Error(`Invalid sampleWidth: must be a positive integer, got ${sampleWidth}`);
  }
  
  // Ensure pcmData is a Buffer
  let pcmBuffer;
  try {
    pcmBuffer = Buffer.isBuffer(pcmData) ? pcmData : Buffer.from(pcmData);
  } catch (error) {
    throw new Error(`Failed to convert pcmData to Buffer: ${error.message}`);
  }
  
  const dataLength = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataLength);
  
  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // audio format (PCM)
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * sampleWidth, 28); // byte rate
  buffer.writeUInt16LE(channels * sampleWidth, 32); // block align
  buffer.writeUInt16LE(sampleWidth * 8, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  
  // Copy PCM data
  pcmBuffer.copy(buffer, 44);
  
  return buffer;
}

/**
 * Get expression instruction text
 * @param {string} expression - Expression type
 * @param {object} instructions - Expression instructions object
 * @returns {string} Instruction text
 * @throws {Error} If expression is not found in instructions
 */
function getExpressionInstruction(expression, instructions) {
  if (!instructions[expression]) {
    throw new Error(`Invalid expression: ${expression}. Available expressions: ${Object.keys(instructions).join(', ')}`);
  }
  return instructions[expression];
}

/**
 * Process text to replace model name placeholder
 * @param {string} text - Input text
 * @param {string} modelName - Model name to replace placeholder
 * @param {string} placeholder - Placeholder pattern
 * @returns {string} Processed text
 */
function processTextWithModelName(text, modelName, placeholder) {
  const placeholderRegex = new RegExp((placeholder || CONFIG.modelNamePlaceholder).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  return text.replace(placeholderRegex, modelName);
}

export default async function handler(req, res) {
  serverLogger.info('Synthesize endpoint called', {
    method: req.method,
    headers: {
      'content-type': req.headers['content-type'],
      'origin': req.headers['origin']
    }
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    serverLogger.debug('CORS preflight request handled');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    serverLogger.warn('Invalid method for synthesize endpoint', { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, model_name, expression, settings, apiKey, modelId } = req.body;
    
    serverLogger.info('Processing synthesis request', {
      model_name,
      expression,
      text_length: text?.length || 0,
      has_settings: !!settings,
      has_api_key: !!apiKey,
      model_id: modelId
    });
    
    // Get API key from request (required from UI)
    if (!apiKey) {
      serverLogger.warn('Synthesis request missing API key');
      return res.status(400).json({ error: 'API key is required. Please configure it in the setup.' });
    }
    const geminiApiKey = apiKey;
    serverLogger.debug('API key validated', { key_length: apiKey.length });
    
    // Get model ID from request (required from UI)
    if (!modelId) {
      serverLogger.warn('Synthesis request missing model ID');
      return res.status(400).json({ error: 'Model ID is required. Please configure it in the setup.' });
    }
    const ttsModelId = modelId;
    serverLogger.debug('Model ID validated', { model_id: ttsModelId });
    
    // Use custom settings if provided, otherwise use default CONFIG
    const audioSettings = settings?.audio || CONFIG.audio;
    const accentInstruction = settings?.accentInstruction || CONFIG.accentInstruction;
    const modelNamePlaceholder = settings?.modelNamePlaceholder || CONFIG.modelNamePlaceholder;
    const expressionInstructions = settings?.expressionInstructions || CONFIG.expressionInstructions;
    
    // Validate audio settings
    if (!audioSettings || typeof audioSettings !== 'object') {
      return res.status(400).json({ error: 'Invalid audio settings' });
    }
    if (typeof audioSettings.sampleRate !== 'number' || audioSettings.sampleRate <= 0) {
      return res.status(400).json({ error: 'Invalid sampleRate: must be a positive number' });
    }
    if (typeof audioSettings.channels !== 'number' || audioSettings.channels <= 0) {
      return res.status(400).json({ error: 'Invalid channels: must be a positive number' });
    }
    if (typeof audioSettings.sampleWidth !== 'number' || audioSettings.sampleWidth <= 0) {
      return res.status(400).json({ error: 'Invalid sampleWidth: must be a positive number' });
    }
    if (!audioSettings.format || typeof audioSettings.format !== 'string') {
      return res.status(400).json({ error: 'Invalid format: must be a string' });
    }

    // Validate input
    if (!text || typeof text !== 'string') {
      serverLogger.warn('Synthesis request missing or invalid text', { text_type: typeof text });
      return res.status(400).json({ error: 'Text is required' });
    }
    serverLogger.debug('Text validated', { text_length: text.length });

    // Get list of valid model names
    const validModelNames = CONFIG.voiceModels.map(v => v.name);
    if (!model_name || !validModelNames.includes(model_name)) {
      serverLogger.warn('Invalid model name in request', { 
        provided: model_name, 
        valid_models: validModelNames 
      });
      return res.status(400).json({ error: `Invalid model_name. Must be one of: ${validModelNames.join(', ')}` });
    }
    serverLogger.debug('Model name validated', { model_name });

    if (!expression || !CONFIG.expressions.includes(expression)) {
      serverLogger.warn('Invalid expression in request', { 
        provided: expression, 
        valid_expressions: CONFIG.expressions 
      });
      return res.status(400).json({ error: `Invalid expression. Must be one of: ${CONFIG.expressions.join(', ')}` });
    }
    serverLogger.debug('Expression validated', { expression });

    // Initialize Gemini client
    serverLogger.info('Initializing Gemini client', { model_id: ttsModelId });
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const modelName = ttsModelId;

    // Process text
    const processedText = processTextWithModelName(text, model_name, modelNamePlaceholder);
    serverLogger.debug('Text processed with model name placeholder', { 
      original_length: text.length,
      processed_length: processedText.length 
    });
    
    // Get expression instruction
    const expressionInstruction = getExpressionInstruction(expression, expressionInstructions);
    serverLogger.debug('Expression instruction retrieved', { 
      expression,
      instruction_length: expressionInstruction.length 
    });
    
    // Clean accent instruction (remove trailing colon if present, as we add it in the structure)
    let accentInstructionText = accentInstruction.trim();
    if (accentInstructionText.endsWith(':')) {
        accentInstructionText = accentInstructionText.slice(0, -1).trim();
    }
    
    // Create structured prompt with clear separation between instructions and text to speak
    const prompt = `INSTRUCTIONS FOR HOW TO SPEAK:
1. Accent: ${accentInstructionText}
2. Expression Style: ${expressionInstruction}

TEXT TO SPEAK (say this exactly as written):
${processedText}`;
    
    serverLogger.debug('Prompt constructed', { 
      prompt_length: prompt.length,
      has_accent_instruction: !!accentInstructionText,
      has_expression_instruction: !!expressionInstruction
    });
    
    // Log the full prompt for debugging
    serverLogger.info('Full prompt to be sent to Gemini', {
      prompt: prompt,
      accent_instruction: accentInstructionText,
      expression_instruction: expressionInstruction,
      text_to_speak: processedText
    });

    // Generate speech using Gemini
    serverLogger.info('Calling Gemini API for speech generation', {
      model: modelName,
      voice_name: model_name,
      prompt_length: prompt.length
    });
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Use generateContent with audio modality
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: model_name
            }
          }
        }
      }
    });

    // Extract audio from response
    serverLogger.info('Processing Gemini API response');
    const response = result.response;
    let audioData = null;

    serverLogger.debug('Analyzing response structure', {
      has_candidates: !!response.candidates,
      candidates_count: response.candidates?.length || 0
    });

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      serverLogger.debug('Processing candidate', {
        has_content: !!candidate.content,
        has_parts: !!candidate.content?.parts,
        parts_count: candidate.content?.parts?.length || 0
      });

      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          // Check for inlineData (base64) or data property
          if (part.inlineData && part.inlineData.data) {
            audioData = part.inlineData.data;
            serverLogger.debug('Audio data found in inlineData', {
              data_type: typeof audioData,
              data_length: typeof audioData === 'string' ? audioData.length : 'buffer'
            });
            break;
          } else if (part.data) {
            audioData = part.data;
            serverLogger.debug('Audio data found in data property', {
              data_type: typeof audioData,
              data_length: typeof audioData === 'string' ? audioData.length : 'buffer'
            });
            break;
          }
        }
      }
    }

    if (!audioData) {
      serverLogger.error('No audio data found in Gemini response', null, {
        response_structure: {
          has_candidates: !!response.candidates,
          candidates_count: response.candidates?.length || 0
        }
      });
      return res.status(500).json({ error: 'No audio data found in Gemini response' });
    }
    
    serverLogger.success('Audio data extracted successfully', {
      data_type: typeof audioData,
      is_string: typeof audioData === 'string',
      is_buffer: Buffer.isBuffer(audioData)
    });

    // Decode base64 audio data if needed
    serverLogger.info('Decoding audio data');
    let pcmBytes;
    try {
      if (typeof audioData === 'string') {
        serverLogger.debug('Decoding string audio data from base64');
        pcmBytes = Buffer.from(audioData, 'base64');
      } else if (Buffer.isBuffer(audioData)) {
        serverLogger.debug('Audio data is already a Buffer');
        pcmBytes = audioData;
      } else if (audioData instanceof Uint8Array) {
        serverLogger.debug('Converting Uint8Array to Buffer');
        pcmBytes = Buffer.from(audioData);
      } else {
        throw new Error(`Invalid audioData type: ${typeof audioData}`);
      }
      serverLogger.debug('Audio data decoded', { 
        pcm_bytes_length: pcmBytes.length,
        pcm_size_kb: (pcmBytes.length / 1024).toFixed(2)
      });
    } catch (error) {
      serverLogger.error('Failed to decode audio data', error, {
        audio_data_type: typeof audioData,
        is_buffer: Buffer.isBuffer(audioData),
        is_uint8array: audioData instanceof Uint8Array
      });
      return res.status(500).json({ 
        error: 'Failed to decode audio data', 
        detail: error.message 
      });
    }

    // Convert PCM to WAV format
    // Gemini TTS returns: 24kHz, 16-bit, mono PCM
    serverLogger.info('Converting PCM to WAV format', {
      sample_rate: audioSettings.sampleRate,
      channels: audioSettings.channels,
      sample_width: audioSettings.sampleWidth,
      format: audioSettings.format
    });
    const wavBytes = pcmToWav(
      pcmBytes,
      audioSettings.sampleRate,
      audioSettings.channels,
      audioSettings.sampleWidth
    );
    serverLogger.debug('WAV conversion completed', {
      wav_bytes_length: wavBytes.length,
      wav_size_kb: (wavBytes.length / 1024).toFixed(2),
      size_increase: ((wavBytes.length - pcmBytes.length) / 1024).toFixed(2) + ' KB'
    });

    // Encode to base64 for JSON response
    serverLogger.info('Encoding WAV to base64');
    const base64Audio = wavBytes.toString('base64');
    serverLogger.debug('Base64 encoding completed', {
      base64_length: base64Audio.length,
      base64_size_kb: (base64Audio.length / 1024).toFixed(2)
    });

    // Create response
    const responseData = {
      message: `Voice synthesis completed successfully using ${model_name} model`,
      file_type: audioSettings.format,
      file_data: base64Audio,
      model_used: model_name,
      expression_used: expression,
      text_length: text.length
    };

    serverLogger.success('Voice synthesis completed successfully', {
      model_name,
      expression,
      text_length: text.length,
      file_type: audioSettings.format,
      file_size_kb: (base64Audio.length / 1024).toFixed(2),
      response_size_kb: (JSON.stringify(responseData).length / 1024).toFixed(2)
    });

    res.status(200).json(responseData);

  } catch (error) {
    serverLogger.error('Voice synthesis failed', error, {
      model_name: req.body?.model_name,
      expression: req.body?.expression,
      text_length: req.body?.text?.length,
      has_api_key: !!req.body?.apiKey,
      has_model_id: !!req.body?.modelId
    });
    
    // Check if response was already sent
    if (res.headersSent) {
      serverLogger.warn('Response already sent, cannot send error response');
      return;
    }
    
    // Handle specific error types
    const errorMessage = error.message || 'Voice synthesis failed';
    
    try {
      // Check for quota/rate limit errors
      if (errorMessage.includes('429') || 
          errorMessage.includes('quota') || 
          errorMessage.includes('rate limit') ||
          errorMessage.includes('Quota exceeded')) {
        serverLogger.warn('Quota/rate limit exceeded', {
          error_message: errorMessage.substring(0, 200) // Truncate for logging
        });
        
        // Extract retry delay if available
        let retryDelay = null;
        const retryMatch = errorMessage.match(/retry in (\d+(?:\.\d+)?)s/i);
        if (retryMatch) {
          retryDelay = Math.ceil(parseFloat(retryMatch[1]));
        }
        
        if (!res.headersSent) {
          res.status(429).json({ 
            error: 'API quota exceeded. You have reached your usage limit for this model. Please wait a moment and try again, or check your billing plan.',
            errorType: 'quota_exceeded',
            retryDelay: retryDelay,
            detail: 'The free tier has limited requests. Consider upgrading your plan or waiting before retrying.'
          });
        }
        return;
      }
      
      // Check for authentication errors
      if (errorMessage.includes('401') || 
          errorMessage.includes('403') ||
          errorMessage.includes('API key') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('unauthorized')) {
        serverLogger.warn('Authentication error', {
          error_message: errorMessage.substring(0, 200)
        });
        
        if (!res.headersSent) {
          res.status(401).json({ 
            error: 'Invalid API key or authentication failed. Please check your API key in settings.',
            errorType: 'authentication_error'
          });
        }
        return;
      }
      
      // Check for model not found errors
      if (errorMessage.includes('404') || 
          errorMessage.includes('not found') ||
          (errorMessage.includes('model') && errorMessage.includes('not available'))) {
        serverLogger.warn('Model not found error', {
          error_message: errorMessage.substring(0, 200)
        });
        
        if (!res.headersSent) {
          res.status(404).json({ 
            error: 'Model not found or unavailable. Please try a different model.',
            errorType: 'model_not_found'
          });
        }
        return;
      }
      
      // Generic error response
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Voice synthesis failed', 
          errorType: 'synthesis_error',
          detail: errorMessage.substring(0, 500) // Limit detail length
        });
      }
    } catch (responseError) {
      // If we can't send the response, just log it
      serverLogger.error('Failed to send error response', responseError);
    }
  }
}

