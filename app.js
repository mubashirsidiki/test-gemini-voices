/**
 * Main application JavaScript
 * Handles form submission, API calls, and audio playback
 */

// Import logger (will be available in browser via script tag or module)
const logger = {
  debug: (msg, ctx) => console.log(`%c[DEBUG] ${msg}`, 'color: #888; font-weight: normal', ctx || ''),
  info: (msg, ctx) => console.log(`%c[INFO] ${msg}`, 'color: #0ea5e9; font-weight: bold', ctx || ''),
  warn: (msg, ctx) => console.warn(`%c[WARN] ${msg}`, 'color: #f59e0b; font-weight: bold', ctx || ''),
  error: (msg, err, ctx) => {
    const errorCtx = { ...ctx, ...(err && { error: { message: err.message, stack: err.stack } }) };
    console.error(`%c[ERROR] ${msg}`, 'color: #ef4444; font-weight: bold', errorCtx);
  },
  success: (msg, ctx) => console.log(`%c[SUCCESS] ${msg}`, 'color: #10b981; font-weight: bold', ctx || ''),
  api: (method, endpoint, data) => {
    console.log(
      `%c[API] ${method} ${endpoint}`,
      'color: #6366f1; font-weight: bold; background: #f3f4f6; padding: 2px 6px; border-radius: 3px',
      data || {}
    );
  }
};

let currentAudioBlob = null;
let currentFilename = '';
let allVoiceModels = []; // Store all voice models
let currentSettings = {}; // Store current settings
let userConfig = {}; // Store user API key and model ID

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    logger.info('Application initializing', {
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      url: window.location.href
    });
    
    // Attach setup form handler immediately (before checking config)
    const setupForm = document.getElementById('setupForm');
    const saveSetupBtn = document.getElementById('saveSetupBtn');
    
    logger.debug('Setting up event listeners', {
      setup_form_found: !!setupForm,
      save_button_found: !!saveSetupBtn
    });
    
    if (setupForm) {
        setupForm.addEventListener('submit', handleSetupSubmit);
        logger.debug('Setup form submit listener attached');
    }
    
    if (saveSetupBtn) {
        saveSetupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logger.debug('Save setup button clicked');
            const form = document.getElementById('setupForm');
            if (form) {
                // Trigger form validation and submission
                if (form.checkValidity()) {
                    logger.debug('Form validation passed, dispatching submit event');
                    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                } else {
                    logger.warn('Form validation failed');
                    form.reportValidity();
                }
            }
        });
        logger.debug('Save setup button click listener attached');
    }
    
    // Now check user config
    logger.info('Checking user configuration');
    checkUserConfig();
});

/**
 * Load available models and expressions from API
 */
async function loadModels() {
    try {
        const response = await fetch(CONFIG.apiModelsEndpoint);
        if (!response.ok) {
            throw new Error('Failed to load models');
        }

        const data = await response.json();
        
        // Store sample texts from API response
        if (data.sample_texts) {
            CONFIG.sampleTexts = data.sample_texts;
        }
        
        // Store all voice models
        if (data.voice_models_with_gender) {
            allVoiceModels = data.voice_models_with_gender;
        } else {
            // Fallback if gender info not available
            allVoiceModels = data.voice_models.map(name => ({ name, gender: '' }));
        }
        
        // Populate expressions
        const expressionSelect = document.getElementById('expressionSelect');
        if (!expressionSelect) {
            throw new Error('Expression select element not found');
        }
        expressionSelect.innerHTML = '';
        
        if (!data.expressions || !Array.isArray(data.expressions)) {
            throw new Error('Invalid expressions data from API');
        }
        
        data.expressions.forEach(expr => {
            const option = document.createElement('option');
            option.value = expr;
            option.textContent = formatExpressionName(expr);
            if (expr === data.default_expression) {
                option.selected = true;
            }
            expressionSelect.appendChild(option);
        });
        
        // Filter and populate voice models based on gender
        filterVoiceModelsByGender();
        
        // Validate form after loading
        setTimeout(() => validateForm(), 100);

    } catch (error) {
        logger.error('Error loading models', error, {
          endpoint: CONFIG.apiModelsEndpoint
        });
        showError(CONFIG.errorMessages.loadModelsFailed);
    }
}

/**
 * Format expression name for display
 */
function formatExpressionName(expr) {
    return expr.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

/**
 * Filter and populate voice models based on selected gender
 */
function filterVoiceModelsByGender() {
    const genderSelect = document.getElementById('genderSelect');
    const modelSelect = document.getElementById('modelSelect');
    const selectedGender = genderSelect.value;
    
    // Clear current options
    modelSelect.innerHTML = '';
    
    // Filter models by gender
    let filteredModels = allVoiceModels;
    if (selectedGender !== 'all') {
        filteredModels = allVoiceModels.filter(model => model.gender === selectedGender);
    }
    
    // Sort models by name
    filteredModels.sort((a, b) => a.name.localeCompare(b.name));
    
    // Populate dropdown
    if (filteredModels.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No models available';
        modelSelect.appendChild(option);
    } else {
        filteredModels.forEach(model => {
            const option = document.createElement('option');
            const traitText = model.trait ? ` - ${model.trait}` : '';
            option.value = model.name;
            option.textContent = `${model.name} (${model.gender}${traitText})`;
            option.setAttribute('data-trait', model.trait || '');
            modelSelect.appendChild(option);
        });
        
        // Select default model if available
        const defaultModel = allVoiceModels.find(m => m.name === 'Puck');
        if (defaultModel && filteredModels.some(m => m.name === defaultModel.name)) {
            modelSelect.value = defaultModel.name;
        }
    }
}

// CONFIG is loaded from config-frontend.js

/**
 * Setup event listeners
 */
function setupEventListeners() {
    const form = document.getElementById('synthesisForm');
    const textInput = document.getElementById('textInput');
    const charCount = document.getElementById('charCount');
    const downloadBtn = document.getElementById('downloadBtn');
    const sampleButtons = document.querySelectorAll('.sample-btn');
    const genderSelect = document.getElementById('genderSelect');

    // Character count update function with validation
    const updateCharCount = () => {
        const length = textInput.value.length;
        charCount.textContent = length;
        
        // Add warning/error classes
        charCount.parentElement.classList.remove('warning', 'error');
        if (length > 4000) {
            charCount.parentElement.classList.add('error');
        } else if (length > 3000) {
            charCount.parentElement.classList.add('warning');
        }
        
        // Real-time form validation
        validateForm();
    };
    textInput.addEventListener('input', updateCharCount);
    // Initialize count on page load
    updateCharCount();

    // Gender filter change
    genderSelect.addEventListener('change', () => {
        filterVoiceModelsByGender();
        // Clear voice selection when filter changes
        const modelSelect = document.getElementById('modelSelect');
        modelSelect.value = '';
        updateVoiceModelHint('');
        validateForm();
    });
    
    // Voice model change - update hint and validate
    const modelSelect = document.getElementById('modelSelect');
    modelSelect.addEventListener('change', () => {
        const selectedModel = allVoiceModels.find(m => m.name === modelSelect.value);
        if (selectedModel) {
            updateVoiceModelHint(selectedModel);
        } else {
            updateVoiceModelHint('');
        }
        validateForm();
    });
    
    // Expression change - validate
    const expressionSelect = document.getElementById('expressionSelect');
    expressionSelect.addEventListener('change', validateForm);

    // Sample text buttons
    sampleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const sampleType = btn.getAttribute('data-sample');
            if (CONFIG.sampleTexts && CONFIG.sampleTexts[sampleType]) {
                textInput.value = CONFIG.sampleTexts[sampleType];
                updateCharCount();
                textInput.focus();
                // Visual feedback
                btn.classList.add('sample-btn-active');
                setTimeout(() => btn.classList.remove('sample-btn-active'), 300);
            }
        });
    });

    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter or Cmd+Enter to submit form
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (!document.getElementById('generateBtn').disabled) {
                e.preventDefault();
                form.dispatchEvent(new Event('submit'));
            }
        }
    });

    // Download button
    downloadBtn.addEventListener('click', handleDownload);
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    const editConfigBtn = document.getElementById('editConfigBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            openSettings();
        });
    }
    
    if (editConfigBtn) {
        editConfigBtn.addEventListener('click', () => {
            openSetupModal(true);
        });
    }
    
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettings);
    }
    
    if (cancelSettingsBtn) {
        cancelSettingsBtn.addEventListener('click', closeSettings);
    }
    
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetSettings);
    }
    
    // Close modal on outside click
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettings();
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsModal.style.display !== 'none') {
            closeSettings();
        }
    });
    
    // Tab switching
    const tabs = document.querySelectorAll('.settings-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Generate example button
    const generateExampleBtn = document.getElementById('generateExampleBtn');
    if (generateExampleBtn) {
        generateExampleBtn.addEventListener('click', generateExample);
    }
    
    // Setup form
    const setupForm = document.getElementById('setupForm');
    const setupApiKey = document.getElementById('setupApiKey');
    const setupModelId = document.getElementById('setupModelId');
    const saveSetupBtn = document.getElementById('saveSetupBtn');
    const closeSetupModalBtn = document.getElementById('closeSetupModalBtn');
    const setupModal = document.getElementById('setupModal');
    
    if (setupForm) {
        setupForm.addEventListener('submit', handleSetupSubmit);
    }
    
    // Also handle button click directly as fallback
    if (saveSetupBtn) {
        saveSetupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (setupForm) {
                setupForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            } else {
                handleSetupSubmit(e);
            }
        });
    }
    
    // Close setup modal button
    if (closeSetupModalBtn) {
        closeSetupModalBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Only allow closing if user has already configured (editing mode)
            if (userConfig.apiKey && userConfig.modelId) {
                if (setupModal) {
                    setupModal.style.display = 'none';
                    const mainContainer = document.getElementById('mainContainer');
                    if (mainContainer) {
                        mainContainer.style.display = 'block';
                    }
                }
            }
            // If not configured, don't allow closing (setup is required)
        });
    }
    
    // Close modal on outside click (only if already configured)
    if (setupModal) {
        setupModal.addEventListener('click', (e) => {
            if (e.target === setupModal) {
                // Only allow closing if user has already configured (editing mode)
                if (userConfig.apiKey && userConfig.modelId) {
                    setupModal.style.display = 'none';
                    const mainContainer = document.getElementById('mainContainer');
                    if (mainContainer) {
                        mainContainer.style.display = 'block';
                    }
                }
            }
        });
    }
    
    if (setupModelId) {
        setupModelId.addEventListener('change', updateModelDescription);
    }
    
    // Update model description on load
    if (setupModelId) {
        updateModelDescription();
    }
}

/**
 * Check if user has configured API key and model
 */
function checkUserConfig() {
    const saved = localStorage.getItem('geminiVoicesUserConfig');
    if (saved) {
        try {
            userConfig = JSON.parse(saved);
            if (userConfig && userConfig.apiKey && userConfig.modelId) {
                // User is configured, show main app
                showMainApp();
                return;
            }
        } catch (e) {
            logger.error('Failed to load user config from localStorage', e);
            // Clear corrupted localStorage
            localStorage.removeItem('geminiVoicesUserConfig');
            userConfig = {};
        }
    }
    
    // User not configured, show setup
    showSetupModal();
}

/**
 * Show setup modal
 */
function showSetupModal() {
    const setupModal = document.getElementById('setupModal');
    const mainContainer = document.getElementById('mainContainer');
    const setupModelId = document.getElementById('setupModelId');
    
    if (setupModal) {
        setupModal.style.display = 'flex';
        if (mainContainer) {
            mainContainer.style.display = 'none';
        }
        
        // Load existing values if editing
        if (userConfig.apiKey) {
            document.getElementById('setupApiKey').value = userConfig.apiKey;
        }
        // Set default model if not already set
        if (setupModelId) {
            if (userConfig.modelId) {
                setupModelId.value = userConfig.modelId;
            } else {
                setupModelId.value = 'gemini-2.5-flash-preview-tts';
            }
        }
        
        // Ensure event listener is attached for model description
        if (setupModelId && !setupModelId.hasAttribute('data-listener-attached')) {
            setupModelId.addEventListener('change', updateModelDescription);
            setupModelId.setAttribute('data-listener-attached', 'true');
        }
        
        // Always update description when modal opens
        setTimeout(() => {
            updateModelDescription();
        }, 100);
    }
}

/**
 * Open setup modal for editing
 */
function openSetupModal(isEdit = false) {
    showSetupModal();
    if (isEdit && userConfig.apiKey) {
        document.getElementById('setupApiKey').value = userConfig.apiKey;
    }
    if (isEdit && userConfig.modelId) {
        document.getElementById('setupModelId').value = userConfig.modelId;
        updateModelDescription();
    }
}

/**
 * Update model description
 */
function updateModelDescription() {
    const modelIdSelect = document.getElementById('setupModelId');
    const descDiv = document.getElementById('modelDescription');
    
    if (!descDiv || !modelIdSelect) {
        return;
    }
    
    const modelId = modelIdSelect.value;
    
    const modelInfo = {
        'gemini-2.5-pro-preview-tts': {
            title: 'Gemini 2.5 Pro Preview TTS',
            modelId: 'gemini-2.5-pro-preview-tts',
            description: 'Our 2.5 Pro text-to-speech audio model optimized for powerful, low-latency speech generation for more natural outputs and easier to steer prompts.',
            contextLengths: 'All context lengths',
            inputPrice: '$1.00',
            outputPrice: '$20.00',
            knowledgeCutoff: 'Unknown'
        },
        'gemini-2.5-flash-preview-tts': {
            title: 'Gemini 2.5 Flash Preview TTS',
            modelId: 'gemini-2.5-flash-preview-tts',
            description: 'Our 2.5 Flash text-to-speech audio model optimized for price-performance, low-latency, controllable speech generation.',
            contextLengths: 'All context lengths',
            inputPrice: '$0.50',
            outputPrice: '$10.00',
            knowledgeCutoff: 'Unknown'
        }
    };
    
    if (modelId && modelInfo[modelId]) {
        const info = modelInfo[modelId];
        descDiv.innerHTML = `
            <div class="model-desc-header">
                <h4 class="model-desc-title">${info.title}</h4>
                <code class="model-desc-id">${info.modelId}</code>
            </div>
            <div class="model-desc-text">${info.description}</div>
            <div class="model-desc-details">
                <div class="model-desc-detail-item">
                    <span class="detail-label">Context lengths:</span>
                    <span class="detail-value">${info.contextLengths}</span>
                </div>
                <div class="model-desc-detail-item">
                    <span class="detail-label">Pricing:</span>
                    <span class="detail-value">Input: ${info.inputPrice} / Output: ${info.outputPrice}</span>
                </div>
                <div class="model-desc-detail-item">
                    <span class="detail-label">Knowledge cut off:</span>
                    <span class="detail-value">${info.knowledgeCutoff}</span>
                </div>
            </div>
        `;
        descDiv.style.display = 'block';
    } else {
        descDiv.style.display = 'none';
    }
}

/**
 * Handle setup form submission
 */
function handleSetupSubmit(e) {
    e.preventDefault();
    
    logger.info('Setup form submission started');
    
    const apiKey = document.getElementById('setupApiKey').value.trim();
    const modelId = document.getElementById('setupModelId').value;
    
    logger.debug('Setup form data extracted', {
      has_api_key: !!apiKey,
      api_key_length: apiKey.length,
      model_id: modelId
    });
    
    if (!apiKey) {
        logger.warn('Setup submission rejected: API key missing');
        showError('Please enter your API key');
        return;
    }
    
    if (!modelId) {
        logger.warn('Setup submission rejected: Model ID missing');
        showError('Please select a TTS model');
        return;
    }
    
    // Save user config
    userConfig = {
        apiKey: apiKey,
        modelId: modelId
    };
    
    logger.info('Saving user configuration to localStorage', {
      model_id: modelId,
      api_key_length: apiKey.length
    });
    
    try {
        localStorage.setItem('geminiVoicesUserConfig', JSON.stringify(userConfig));
        logger.success('User configuration saved successfully', {
          model_id: modelId
        });
        
        // Show main app
        showMainApp();
    } catch (error) {
        logger.error('Failed to save configuration to localStorage', error, {
          model_id: modelId,
          api_key_length: apiKey.length
        });
        showError('Failed to save configuration. Please try again.');
    }
}

/**
 * Show main application
 */
function showMainApp() {
    const setupModal = document.getElementById('setupModal');
    const mainContainer = document.getElementById('mainContainer');
    
    if (!setupModal || !mainContainer) {
        logger.error('Required elements not found', null, { setupModal, mainContainer });
        return;
    }
    
    // Hide setup modal
    setupModal.style.display = 'none';
    
    // Show main container
    mainContainer.style.display = 'block';
    
    // Initialize main app
    try {
        initializeMainApp();
    } catch (error) {
        logger.error('Error initializing main app', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

/**
 * Initialize main application
 */
async function initializeMainApp() {
    try {
        await loadModels();
        loadSettings();
        setupEventListeners();
    } catch (error) {
        console.error('Error in initializeMainApp:', error);
        // Don't throw - let the app show even if initialization has issues
        showError('Some features may not be available. Please refresh if you encounter issues.');
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const text = formData.get('text');
    const modelName = formData.get('model_name');
    const expression = formData.get('expression');
    const textInput = document.getElementById('textInput');

    // Validate inputs (real-time validation should have caught these, but double-check)
    if (!validateForm()) {
        return;
    }
    
    const trimmedText = text ? text.trim() : '';
    if (!trimmedText) {
        showError(CONFIG.errorMessages.noText);
        textInput.focus();
        return;
    }

    if (!modelName || !expression) {
        showError(CONFIG.errorMessages.noModelExpression);
        return;
    }
    
    // Check if text is too long (optional validation)
    if (trimmedText.length > 5000) {
        showError('Text is too long. Please keep it under 5000 characters.');
        return;
    }

    // Hide previous errors and audio
    hideError();
    hideAudioSection();

    // Show loading state
    setLoading(true);

    try {
        // Validate userConfig before sending
        if (!userConfig || !userConfig.apiKey || !userConfig.modelId) {
            showError('Configuration missing. Please set up your API key and model in the settings.');
            setLoading(false);
            return;
        }
        
        // Include settings in request if available
        const requestBody = {
            text: trimmedText,
            model_name: modelName,
            expression: expression,
            apiKey: userConfig.apiKey,
            modelId: userConfig.modelId
        };
        
        // Add custom settings if user has modified them
        if (Object.keys(currentSettings).length > 0) {
            requestBody.settings = {
                audio: currentSettings.audio,
                accentInstruction: currentSettings.accentInstruction,
                modelNamePlaceholder: currentSettings.modelNamePlaceholder,
                expressionInstructions: currentSettings.expressionInstructions
            };
            logger.debug('Custom settings added to request', {
              settings_keys: Object.keys(requestBody.settings)
            });
        }
        
        logger.api('POST', CONFIG.apiSynthesizeEndpoint, {
          text_length: trimmedText.length,
          model_name: modelName,
          expression: expression,
          request_size_kb: (JSON.stringify(requestBody).length / 1024).toFixed(2)
        });
        
        const response = await fetch(CONFIG.apiSynthesizeEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        logger.debug('Synthesis API response received', {
          status: response.status,
          status_text: response.statusText,
          ok: response.ok,
          content_type: response.headers.get('content-type')
        });

        if (!response.ok) {
            logger.warn('Synthesis API returned error status', {
              status: response.status,
              status_text: response.statusText
            });
            
            let errorData;
            try {
                errorData = await response.json();
                logger.debug('Error response parsed', { error_data: errorData });
            } catch (e) {
                logger.error('Failed to parse error response JSON', e);
                throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
            }
            throw new Error(errorData.error || errorData.detail || 'Synthesis failed');
        }

        let data;
        try {
            data = await response.json();
            logger.debug('Success response parsed', {
              has_file_data: !!data.file_data,
              file_type: data.file_type,
              model_used: data.model_used,
              expression_used: data.expression_used,
              text_length: data.text_length
            });
        } catch (e) {
            logger.error('Failed to parse success response JSON', e);
            throw new Error('Invalid JSON response from server');
        }

        if (!data.file_data) {
            logger.error('Response missing audio data', null, {
              response_keys: Object.keys(data),
              has_file_data: !!data.file_data
            });
            throw new Error(CONFIG.errorMessages.noAudioData);
        }

        // Convert base64 to blob
        // Validate file_type is present
        if (!data.file_type) {
            logger.error('Response missing file_type', null, {
              response_keys: Object.keys(data)
            });
            throw new Error('Invalid API response: file_type is missing');
        }
        
        logger.info('Converting base64 audio to blob', {
          file_type: data.file_type,
          base64_length: data.file_data.length,
          base64_size_kb: (data.file_data.length / 1024).toFixed(2)
        });
        
        const audioBlob = base64ToBlob(data.file_data, `audio/${data.file_type}`);
        currentAudioBlob = audioBlob;
        currentFilename = `${CONFIG.audioFilenamePrefix}${data.model_used}_${data.expression_used}_${Date.now()}.${data.file_type}`;
        
        logger.debug('Audio blob created', {
          blob_size: audioBlob.size,
          blob_size_kb: (audioBlob.size / 1024).toFixed(2),
          blob_type: audioBlob.type,
          filename: currentFilename
        });

        // Display audio
        displayAudio(audioBlob, data);
        
        // Show success message
        logger.success('Speech synthesis completed successfully', {
          model_used: data.model_used,
          expression_used: data.expression_used,
          file_type: data.file_type,
          audio_size_kb: (audioBlob.size / 1024).toFixed(2)
        });
        showSuccess('Speech generated successfully!');

    } catch (error) {
        logger.error('Synthesis error occurred', error, {
          model_name: modelName,
          expression: expression,
          text_length: trimmedText.length,
          error_type: error.name,
          error_message: error.message
        });
        
        let errorMessage = CONFIG.errorMessages.synthesisFailed;
        
        // Provide specific error messages
        if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403')) {
            errorMessage = 'Invalid API key. Please check your configuration.';
            logger.warn('API key authentication error detected');
        } else if (error.message.includes('model') || error.message.includes('404')) {
            errorMessage = 'Selected model is not available. Please try a different model.';
            logger.warn('Model not found error detected', { model_name: modelName });
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection and try again.';
            logger.warn('Network error detected');
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showError(errorMessage);
    } finally {
        logger.debug('Form submission completed, resetting loading state');
        setLoading(false);
        validateForm();
    }
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64, mimeType) {
    if (!base64 || typeof base64 !== 'string') {
        throw new Error('Invalid base64 data: must be a non-empty string');
    }
    
    try {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    } catch (error) {
        throw new Error(`Failed to decode base64 data: ${error.message}`);
    }
}

/**
 * Display audio player and info
 */
function displayAudio(audioBlob, data) {
    const audioSection = document.getElementById('audioSection');
    const audioPlayer = document.getElementById('audioPlayer');
    const modelUsed = document.getElementById('modelUsed');
    const expressionUsed = document.getElementById('expressionUsed');
    const textLength = document.getElementById('textLength');

    // Create object URL for audio
    const audioUrl = URL.createObjectURL(audioBlob);
    audioPlayer.src = audioUrl;

    // Find gender for the model
    const modelInfo = allVoiceModels.find(m => m.name === data.model_used);
    let modelDisplay = data.model_used;
    if (modelInfo && modelInfo.gender) {
        modelDisplay = `${data.model_used} (${modelInfo.gender})`;
    }

    // Update info
    modelUsed.textContent = modelDisplay;
    expressionUsed.textContent = formatExpressionName(data.expression_used);
    textLength.textContent = data.text_length;

    // Show audio section with animation
    audioSection.style.display = 'block';
    audioSection.style.animation = 'slideIn 0.3s ease-out';
    audioSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-play audio (optional - can be removed if not desired)
    // audioPlayer.play().catch(e => console.log('Auto-play prevented:', e));
}

/**
 * Handle audio download
 */
function handleDownload() {
    if (!currentAudioBlob) {
        return;
    }

    const url = URL.createObjectURL(currentAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Show error message
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = errorDiv.querySelector('.error-text');
    if (errorText) {
        errorText.textContent = message;
    } else {
        errorDiv.textContent = message;
    }
    errorDiv.style.display = 'flex';
    
    // Hide success message if shown
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.style.display = 'none';
    }
    
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Show success message
 */
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    const successText = successDiv.querySelector('.success-text');
    if (successText) {
        successText.textContent = message;
    } else {
        successDiv.textContent = message;
    }
    successDiv.style.display = 'flex';
    
    // Hide error message if shown
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
    
    successDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

/**
 * Hide error message
 */
function hideError() {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.style.display = 'none';
}

/**
 * Update voice model hint
 */
function updateVoiceModelHint(model) {
    const hint = document.getElementById('voiceModelHint');
    if (!hint) return;
    
    if (model && model.gender) {
        const desc = model.trait 
            ? `${model.gender} - ${model.trait}`
            : `${model.gender} voice`;
        hint.textContent = desc;
        hint.style.display = 'inline';
    } else {
        hint.style.display = 'none';
    }
}

/**
 * Real-time form validation
 */
function validateForm() {
    const textInput = document.getElementById('textInput');
    const modelSelect = document.getElementById('modelSelect');
    const expressionSelect = document.getElementById('expressionSelect');
    const generateBtn = document.getElementById('generateBtn');
    const validationDiv = document.getElementById('formValidation');
    
    // Return early if elements don't exist yet
    if (!textInput || !modelSelect || !expressionSelect || !generateBtn) {
        return false;
    }
    
    const text = textInput.value.trim();
    const model = modelSelect.value;
    const expression = expressionSelect.value;
    
    let validationMessage = '';
    let isValid = true;
    
    if (!text) {
        validationMessage = 'Enter text to synthesize';
        isValid = false;
    } else if (text.length > 5000) {
        validationMessage = 'Text is too long (max 5000 characters)';
        isValid = false;
    } else if (!model) {
        validationMessage = 'Select a voice model';
        isValid = false;
    } else if (!expression) {
        validationMessage = 'Select a speaking style';
        isValid = false;
    }
    
    if (validationMessage) {
        if (validationDiv) {
            const validationText = validationDiv.querySelector('.validation-text');
            if (validationText) {
                validationText.textContent = validationMessage;
            }
            validationDiv.style.display = 'flex';
        }
        generateBtn.disabled = true;
    } else {
        if (validationDiv) {
            validationDiv.style.display = 'none';
        }
        generateBtn.disabled = false;
    }
    
    return isValid;
}

/**
 * Hide audio section
 */
function hideAudioSection() {
    const audioSection = document.getElementById('audioSection');
    audioSection.style.display = 'none';
    
    // Clean up previous audio URL
    const audioPlayer = document.getElementById('audioPlayer');
    if (audioPlayer.src) {
        URL.revokeObjectURL(audioPlayer.src);
        audioPlayer.src = '';
    }
    currentAudioBlob = null;
}

/**
 * Set loading state
 */
function setLoading(loading) {
    const btn = document.getElementById('generateBtn');
    const btnText = btn.querySelector('.btn-text');
    const loader = document.getElementById('loader');

    if (loading) {
        btn.disabled = true;
        btnText.textContent = 'Generating...';
        loader.style.display = 'inline-flex';
    } else {
        btn.disabled = false;
        btnText.textContent = 'Generate Speech';
        loader.style.display = 'none';
    }
}

/**
 * Settings Management
 */
function loadSettings() {
    const saved = localStorage.getItem('geminiVoicesSettings');
    if (saved) {
        try {
            currentSettings = JSON.parse(saved);
            applySettings();
        } catch (e) {
            logger.error('Failed to parse settings from localStorage', e);
        }
    }
}

function saveSettingsToStorage() {
    localStorage.setItem('geminiVoicesSettings', JSON.stringify(currentSettings));
}

function applySettings() {
    // Apply settings to UI if needed
    // Most settings are used in API calls
}

function openSettings() {
    const modal = document.getElementById('settingsModal');
    if (!modal) {
        logger.error('Settings modal element not found in DOM', null);
        return;
    }
    
    // Load current config values into settings form
    loadSettingsIntoForm();
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function loadSettingsIntoForm() {
    // Load from API or use defaults
    fetch(CONFIG.apiModelsEndpoint)
        .then(async res => {
            if (!res.ok) {
                throw new Error(`Failed to load models: ${res.status} ${res.statusText}`);
            }
            try {
                return await res.json();
            } catch (e) {
                throw new Error('Invalid JSON response from models API');
            }
        })
        .then(data => {
            // Audio settings
            document.getElementById('settingSampleRate').value = currentSettings.audio?.sampleRate || 24000;
            document.getElementById('settingChannels').value = currentSettings.audio?.channels || 1;
            document.getElementById('settingSampleWidth').value = currentSettings.audio?.sampleWidth || 2;
            document.getElementById('settingFormat').value = currentSettings.audio?.format || 'wav';
            
            // Prompt settings
            document.getElementById('settingAccentInstruction').value = currentSettings.accentInstruction || "Say with a natural British English (UK) accent:";
            document.getElementById('settingModelPlaceholder').value = currentSettings.modelNamePlaceholder || "<modelname>";
            
            // Defaults
            const defaultModelSelect = document.getElementById('settingDefaultModel');
            defaultModelSelect.innerHTML = '';
            if (data.voice_models_with_gender) {
                data.voice_models_with_gender.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = `${model.name} (${model.gender})`;
                    if (model.name === (currentSettings.defaultModel || data.default_model)) {
                        option.selected = true;
                    }
                    defaultModelSelect.appendChild(option);
                });
            }
            
            document.getElementById('settingDefaultExpression').value = currentSettings.defaultExpression || data.default_expression;
            
            // Expression instructions
            document.getElementById('settingExprProfessional').value = currentSettings.expressionInstructions?.professional_neutral || data.expression_instructions?.professional_neutral || '';
            document.getElementById('settingExprWarm').value = currentSettings.expressionInstructions?.warm_friendly || data.expression_instructions?.warm_friendly || '';
            
            // Sample texts
            const samples = currentSettings.sampleTexts || data.sample_texts || {};
            document.getElementById('settingSampleGreeting').value = samples.greeting || '';
            document.getElementById('settingSampleBusiness').value = samples.business || '';
            document.getElementById('settingSampleCustomer').value = samples.customer || '';
            document.getElementById('settingSampleAnnouncement').value = samples.announcement || '';
        })
        .catch(err => {
            logger.error('Failed to load settings data from API', err, {
              endpoint: CONFIG.apiModelsEndpoint
            });
            showError('Failed to load settings from API. Using defaults. Please refresh if issues persist.');
            // Load defaults but inform user
            loadDefaultSettingsIntoForm();
        });
}

function loadDefaultSettingsIntoForm() {
    document.getElementById('settingSampleRate').value = 24000;
    document.getElementById('settingChannels').value = 1;
    document.getElementById('settingSampleWidth').value = 2;
    document.getElementById('settingFormat').value = 'wav';
    document.getElementById('settingAccentInstruction').value = "Say with a natural British English (UK) accent:";
    document.getElementById('settingModelPlaceholder').value = "<modelname>";
    document.getElementById('settingDefaultExpression').value = 'professional_neutral';
}

function saveSettings() {
    // Collect all settings from form
    currentSettings = {
        audio: {
            sampleRate: parseInt(document.getElementById('settingSampleRate').value),
            channels: parseInt(document.getElementById('settingChannels').value),
            sampleWidth: parseInt(document.getElementById('settingSampleWidth').value),
            format: document.getElementById('settingFormat').value
        },
        accentInstruction: document.getElementById('settingAccentInstruction').value,
        modelNamePlaceholder: document.getElementById('settingModelPlaceholder').value,
        defaultModel: document.getElementById('settingDefaultModel').value,
        defaultExpression: document.getElementById('settingDefaultExpression').value,
        expressionInstructions: {
            professional_neutral: document.getElementById('settingExprProfessional').value,
            warm_friendly: document.getElementById('settingExprWarm').value
        },
        sampleTexts: {
            greeting: document.getElementById('settingSampleGreeting').value,
            business: document.getElementById('settingSampleBusiness').value,
            customer: document.getElementById('settingSampleCustomer').value,
            announcement: document.getElementById('settingSampleAnnouncement').value
        }
    };
    
    saveSettingsToStorage();
    applySettings();
    
    // Update frontend config
    if (CONFIG) {
        CONFIG.sampleTexts = currentSettings.sampleTexts;
    }
    
    closeSettings();
    
    // Show success message
    showSuccessMessage('Settings saved successfully!');
}

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
        localStorage.removeItem('geminiVoicesSettings');
        currentSettings = {};
        loadDefaultSettingsIntoForm();
        showSuccessMessage('Settings reset to defaults. Click Save to apply.');
    }
}

function showSuccessMessage(message) {
    showSuccess(message);
}

/**
 * Tab Management
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.settings-tab').forEach(tab => {
        if (tab.getAttribute('data-tab') === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(`${tabName}TabContent`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

/**
 * Generate Example Prompt
 */
function generateExample() {
    const text = document.getElementById('exampleText').value;
    const voice = document.getElementById('exampleVoice').value;
    const expression = document.getElementById('exampleExpression').value;
    
    if (!text.trim()) {
        alert('Please enter some text');
        return;
    }
    
    // Get expression instruction
    fetch(CONFIG.apiModelsEndpoint)
        .then(async res => {
            if (!res.ok) {
                throw new Error(`Failed to load models: ${res.status} ${res.statusText}`);
            }
            try {
                return await res.json();
            } catch (e) {
                throw new Error('Invalid JSON response from models API');
            }
        })
        .then(data => {
            const expressionInstructions = data.expression_instructions || {};
            const accentInstruction = currentSettings.accentInstruction || "Say with a natural British English (UK) accent:";
            const expressionInstruction = expressionInstructions[expression] || '';
            
            // Process text (replace placeholder if exists)
            const processedText = text.replace(/<modelname>/g, voice);
            
            // Build prompt
            const prompt = `${accentInstruction} ${processedText}\n\n${expressionInstruction}`;
            
            // Show result
            const outputDiv = document.getElementById('exampleOutput');
            const promptPre = document.getElementById('examplePrompt');
            
            if (promptPre) {
                promptPre.textContent = prompt;
            }
            if (outputDiv) {
                outputDiv.style.display = 'block';
                outputDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        })
        .catch(err => {
            logger.error('Failed to load expression instructions', err);
            showError('Failed to load expression instructions. Please refresh the page.');
            // Show error message as fallback
            const outputDiv = document.getElementById('exampleOutput');
            const promptPre = document.getElementById('examplePrompt');
            if (promptPre) {
                promptPre.textContent = 'Error: Could not load expression instructions.';
            }
            if (outputDiv) {
                outputDiv.style.display = 'block';
            }
            // Fallback
            const accentInstruction = "Say with a natural British English (UK) accent:";
            const processedText = text.replace(/<modelname>/g, voice);
            const prompt = `${accentInstruction} ${processedText}`;
            
            const outputDiv = document.getElementById('exampleOutput');
            const promptPre = document.getElementById('examplePrompt');
            promptPre.textContent = prompt;
            outputDiv.style.display = 'block';
        });
}

