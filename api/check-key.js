/**
 * API endpoint to validate Gemini API key
 * POST /api/check-key
 */

import { serverLogger } from '../utils/logger.js';

export default async function handler(req, res) {
  serverLogger.info('Check key endpoint called', {
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

  // Only allow POST requests
  if (req.method !== 'POST') {
    serverLogger.warn('Invalid method for check-key endpoint', { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key } = req.body;

  serverLogger.debug('Key validation request received', {
    key_length: key ? key.length : 0,
    has_key: !!key
  });

  // Validate input
  if (!key || typeof key !== 'string') {
    serverLogger.warn('Key validation failed: missing or invalid key');
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    serverLogger.info('Calling Gemini API for key validation');
    
    const startTime = Date.now();
    
    // Call Gemini API to check if the key is valid
    // Using gemini-2.5-flash-lite for lightweight validation
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'test' }]
        }]
      }),
    });

    const responseTime = Date.now() - startTime;
    serverLogger.debug('Gemini API response received', {
      status: geminiResponse.status,
      status_text: geminiResponse.statusText,
      response_time_ms: responseTime
    });

    const data = await geminiResponse.json();

    if (geminiResponse.ok) {
      serverLogger.success('API key is valid and working', {
        response_time_ms: responseTime
      });
      
      return res.status(200).json({ 
        message: 'Your Gemini key is valid and working!',
        valid: true 
      });
    }

    // Handle different error cases
    if (geminiResponse.status === 401) {
      serverLogger.warn('API key validation failed: invalid or expired key');
      return res.status(401).json({ 
        error: 'Your API key is invalid or expired. Please check your key and try again.' 
      });
    }

    if (geminiResponse.status === 429) {
      serverLogger.warn('API key validation: rate limit exceeded');
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.' 
      });
    }

    if (geminiResponse.status === 403) {
      serverLogger.warn('API key validation: access forbidden');
      return res.status(403).json({ 
        error: 'Access forbidden. Your API key may not have the required permissions.' 
      });
    }

    // Handle other API errors
    const errorMessage = data.error?.message || data.error?.code || 'Unknown error occurred';
    serverLogger.error('API key validation failed with unexpected error', null, {
      status: geminiResponse.status,
      error_message: errorMessage,
      error_data: data.error
    });
    
    return res.status(geminiResponse.status).json({ 
      error: `Gemini API error: ${errorMessage}` 
    });

  } catch (error) {
    // Handle network errors or other exceptions
    serverLogger.error('Network/exception error during key validation', error, {
      error_type: error.constructor.name,
      error_message: error.message
    });
    
    return res.status(500).json({ 
      error: 'Failed to connect to Gemini API. Please check your internet connection and try again.' 
    });
  }
}

