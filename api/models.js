/**
 * API endpoint to get available voice models and expressions
 * GET /api/models
 */

import { CONFIG } from '../config.js';
import { serverLogger } from '../utils/logger.js';

export default function handler(req, res) {
  serverLogger.info('Models endpoint called', {
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

  if (req.method !== 'GET') {
    serverLogger.warn('Invalid method for models endpoint', { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    serverLogger.info('Loading models configuration');
    
    // Format voice models for response
    const voiceModelsList = CONFIG.voiceModels.map(v => v.name);
    const voiceModelsWithGender = CONFIG.voiceModels;

    serverLogger.debug('Models data prepared', {
      total_voice_models: voiceModelsList.length,
      models_with_gender: voiceModelsWithGender.length,
      expressions_count: CONFIG.expressions.length,
      default_model: CONFIG.defaultModel,
      default_expression: CONFIG.defaultExpression,
      has_sample_texts: !!CONFIG.sampleTexts
    });

    const response = {
      voice_models: voiceModelsList,
      voice_models_with_gender: voiceModelsWithGender,
      expressions: CONFIG.expressions,
      expression_instructions: CONFIG.expressionInstructions,
      default_model: CONFIG.defaultModel,
      default_expression: CONFIG.defaultExpression,
      sample_texts: CONFIG.sampleTexts
    };

    serverLogger.success('Models configuration loaded successfully', {
      response_size_kb: (JSON.stringify(response).length / 1024).toFixed(2),
      voice_models_count: voiceModelsList.length,
      expressions_count: CONFIG.expressions.length
    });

    res.status(200).json(response);
  } catch (error) {
    serverLogger.error('Error in models endpoint', error, {
      config_available: !!CONFIG,
      voice_models_available: !!CONFIG?.voiceModels,
      expressions_available: !!CONFIG?.expressions
    });
    res.status(500).json({ 
      error: 'Failed to load models configuration',
      detail: error.message 
    });
  }
}

