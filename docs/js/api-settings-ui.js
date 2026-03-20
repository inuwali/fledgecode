// API Settings UI Controller
// Manages the API key settings modal interface

import { APIKeyManager } from './api-key-manager.js';

export class APISettingsUI {
    constructor() {
        this.apiKeyManager = new APIKeyManager();
        this.isInitialized = false;
        this.currentSelectedProvider = null;
        this.isKeyVisible = false;
    }

    /**
     * Initialize the API settings UI
     * @returns {boolean} Success status
     */
    init() {
        try {
            if (!this.apiKeyManager.init()) {
                console.error('Failed to initialize API Key Manager');
                return false;
            }

            this.generateProviderButtons();
            this.setupEventListeners();
            this.updateUI();
            this.isInitialized = true;
            console.log('API Settings UI initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize API Settings UI:', error);
            return false;
        }
    }

    /**
     * Generate provider buttons dynamically based on APIKeyManager
     */
    generateProviderButtons() {
        const providerContainer = document.querySelector('.provider-buttons');
        if (!providerContainer) {
            console.error('Provider buttons container not found');
            return;
        }

        const supportedProviders = this.apiKeyManager.getSupportedProviders();
        
        // Clear existing buttons
        providerContainer.innerHTML = '';

        // Generate buttons for each supported provider
        Object.entries(supportedProviders).forEach(([providerId, config]) => {
            const button = document.createElement('button');
            button.className = 'provider-btn';
            button.setAttribute('data-provider', providerId);
            
            // Create provider icon mapping
            const icons = {
                anthropic: '🤖',
                openai: '🧠',
                vercel: '▲'
            };
            
            button.innerHTML = `
                <div class="provider-icon">${icons[providerId] || '🔧'}</div>
                <div class="provider-name">${config.name}</div>
                <div class="provider-desc">${this.getProviderDescription(providerId, config)}</div>
            `;
            
            providerContainer.appendChild(button);
        });
    }

    /**
     * Get provider description for display
     * @param {string} providerId - Provider ID
     * @param {Object} config - Provider configuration
     * @returns {string} Description text
     */
    getProviderDescription(providerId, config) {
        const descriptions = {
            anthropic: 'Claude 3 models',
            openai: 'GPT-4o',
            vercel: 'Vercel AI models'
        };
        
        return descriptions[providerId] || `${config.models ? config.models.slice(0, 2).join(' & ') : 'AI models'}`;
    }

    /**
     * Set up event listeners for the modal
     */
    setupEventListeners() {
        // API Settings button
        const apiSettingsBtn = document.getElementById('api-settings-btn');
        if (apiSettingsBtn) {
            apiSettingsBtn.addEventListener('click', () => this.openModal());
        }

        // Provider selection buttons (delegated event handling for dynamic content)
        const providerContainer = document.querySelector('.provider-buttons');
        if (providerContainer) {
            providerContainer.addEventListener('click', (event) => {
                const providerBtn = event.target.closest('.provider-btn');
                if (providerBtn) {
                    const provider = providerBtn.getAttribute('data-provider');
                    this.selectProvider(provider);
                }
            });
        }

        // Instructions toggle
        const toggleInstructions = document.getElementById('toggle-instructions');
        if (toggleInstructions) {
            toggleInstructions.addEventListener('click', () => this.toggleInstructions());
        }

        // API key input
        const apiKeyInput = document.getElementById('api-key-input');
        if (apiKeyInput) {
            apiKeyInput.addEventListener('input', () => this.onKeyInput());
            apiKeyInput.addEventListener('paste', () => {
                // Delay to allow paste to complete
                setTimeout(() => this.onKeyInput(), 10);
            });
        }

        // Key visibility toggle
        const toggleVisibility = document.getElementById('toggle-key-visibility');
        if (toggleVisibility) {
            toggleVisibility.addEventListener('click', () => this.toggleKeyVisibility());
        }

        // Test API key button
        const testBtn = document.getElementById('test-api-key-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testAPIKey());
        }

        // Save API key button
        const saveBtn = document.getElementById('save-api-key-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveAPIKey());
        }

        // Clear API key button
        const clearBtn = document.getElementById('clear-api-key-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAPIKey());
        }

        // Model selection dropdown
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            modelSelect.addEventListener('change', () => this.onModelChange());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });
    }

    /**
     * Open the API settings modal
     */
    openModal() {
        const modal = document.getElementById('api-settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.updateUI();
            
            // Focus on first interactive element
            const firstInput = modal.querySelector('input, button');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    /**
     * Close the API settings modal
     */
    closeModal() {
        const modal = document.getElementById('api-settings-modal');
        if (modal) {
            modal.classList.add('hidden');
            this.resetForm();
        }
    }

    /**
     * Check if modal is open
     * @returns {boolean} True if modal is open
     */
    isModalOpen() {
        const modal = document.getElementById('api-settings-modal');
        return modal && !modal.classList.contains('hidden');
    }

    /**
     * Select a provider
     * @param {string} provider - Provider name
     */
    selectProvider(provider) {
        this.currentSelectedProvider = provider;

        // Update provider button states
        document.querySelectorAll('.provider-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        const selectedBtn = document.querySelector(`[data-provider="${provider}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }

        // Populate model dropdown
        this.populateModelDropdown(provider);

        // Show API key input section
        const inputSection = document.getElementById('api-key-input-section');
        if (inputSection) {
            inputSection.classList.remove('hidden');
        }

        // Update title and instructions
        this.updateProviderInstructions(provider);

        // Clear previous input
        const apiKeyInput = document.getElementById('api-key-input');
        if (apiKeyInput) {
            apiKeyInput.value = '';
            apiKeyInput.focus();
        }

        this.updateButtonStates();
    }

    /**
     * Update provider instructions
     * @param {string} provider - Provider name
     */
    updateProviderInstructions(provider) {
        const instructions = this.apiKeyManager.getSetupInstructions(provider);
        const providerConfig = this.apiKeyManager.getSupportedProviders()[provider];
        
        // Update title
        const title = document.getElementById('selected-provider-title');
        if (title) {
            title.textContent = `Enter ${providerConfig.name} API Key`;
        }

        // Update instructions list
        const instructionsList = document.getElementById('instructions-list');
        if (instructionsList) {
            instructionsList.innerHTML = instructions.steps
                .map(step => `<li>${step}</li>`)
                .join('');
        }

        // Update documentation link
        const docsLink = document.getElementById('provider-docs-link');
        if (docsLink && instructions.docs) {
            docsLink.href = instructions.docs;
            docsLink.style.display = 'inline';
        } else if (docsLink) {
            docsLink.style.display = 'none';
        }

        // Update notes
        const notes = document.getElementById('provider-notes');
        if (notes) {
            notes.textContent = instructions.notes || '';
        }
    }

    /**
     * Toggle instructions visibility
     */
    toggleInstructions() {
        const content = document.getElementById('instructions-content');
        const toggle = document.getElementById('toggle-instructions');
        
        if (content && toggle) {
            const isHidden = content.classList.contains('hidden');
            content.classList.toggle('hidden');
            toggle.textContent = isHidden ? 'Hide' : 'Show';
        }
    }

    /**
     * Handle API key input changes
     */
    onKeyInput() {
        this.updateButtonStates();
        this.hideTestResults();
    }

    /**
     * Handle model selection change
     */
    onModelChange() {
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            console.log(`Model selected: ${modelSelect.value}`);
        }
    }

    /**
     * Populate model dropdown for selected provider
     * @param {string} provider - Provider name
     */
    populateModelDropdown(provider) {
        const modelSelect = document.getElementById('model-select');
        if (!modelSelect) return;

        const providerConfig = this.apiKeyManager.getSupportedProviders()[provider];
        if (!providerConfig || !providerConfig.models) {
            modelSelect.disabled = true;
            modelSelect.innerHTML = '<option value="">No models available</option>';
            return;
        }

        // Clear existing options
        modelSelect.innerHTML = '';

        // Add options for each model
        providerConfig.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;

            // Select the default model
            if (model === providerConfig.defaultModel) {
                option.selected = true;
            }

            modelSelect.appendChild(option);
        });

        modelSelect.disabled = false;
    }

    /**
     * Toggle API key visibility
     */
    toggleKeyVisibility() {
        const input = document.getElementById('api-key-input');
        const toggleBtn = document.getElementById('toggle-key-visibility');
        
        if (input && toggleBtn) {
            this.isKeyVisible = !this.isKeyVisible;
            input.type = this.isKeyVisible ? 'text' : 'password';
            toggleBtn.textContent = this.isKeyVisible ? '🙈' : '👁️';
            toggleBtn.title = this.isKeyVisible ? 'Hide Key' : 'Show Key';
        }
    }

    /**
     * Test the API key
     */
    async testAPIKey() {
        const apiKeyInput = document.getElementById('api-key-input');
        const testBtn = document.getElementById('test-api-key-btn');
        
        if (!apiKeyInput || !testBtn || !this.currentSelectedProvider) {
            return;
        }

        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            this.showTestResult(false, 'Please enter an API key');
            return;
        }

        try {
            // Update button state
            testBtn.disabled = true;
            testBtn.textContent = '🔄 Testing...';
            
            // Test the key
            const result = await this.apiKeyManager.testAPIKey(this.currentSelectedProvider, apiKey);
            
            if (result.success) {
                this.showTestResult(true, `✅ Success!"`);
                
                // Enable save button
                const saveBtn = document.getElementById('save-api-key-btn');
                if (saveBtn) {
                    saveBtn.disabled = false;
                }
            } else {
                this.showTestResult(false, `❌ Test failed: ${result.error}`);
            }

        } catch (error) {
            this.showTestResult(false, `❌ Test error: ${error.message}`);
        } finally {
            // Reset button state
            testBtn.disabled = false;
            testBtn.textContent = '🧪 Test Key';
        }
    }

    /**
     * Save the API key
     */
    saveAPIKey() {
        const apiKeyInput = document.getElementById('api-key-input');
        const modelSelect = document.getElementById('model-select');

        if (!apiKeyInput || !this.currentSelectedProvider) {
            return;
        }

        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            this.showTestResult(false, 'Please enter an API key');
            return;
        }

        // Get selected model
        const selectedModel = modelSelect ? modelSelect.value : null;

        const success = this.apiKeyManager.setAPIKey(this.currentSelectedProvider, apiKey, selectedModel);

        if (success) {
            this.showTestResult(true, '✅ API key saved successfully!');
            this.updateUI();

            // Notify the main app to update LLM interface
            if (window.vibeApp && typeof window.vibeApp.updateLLMInteractionArea === 'function') {
                window.vibeApp.updateLLMInteractionArea();
            }

            // Close modal after short delay
            setTimeout(() => {
                this.closeModal();
            }, 1500);
        } else {
            this.showTestResult(false, '❌ Failed to save API key');
        }
    }

    /**
     * Clear the stored API key
     */
    clearAPIKey() {
        if (confirm('Are you sure you want to clear the stored API key?')) {
            this.apiKeyManager.clearAPIKey();

            // Also clear persisted dev mode key from localStorage
            try {
                localStorage.removeItem('vibeInstructor_devApiKey');
                console.log('🔑 Cleared persisted dev API key from localStorage');
            } catch (error) {
                console.warn('Failed to clear persisted dev API key:', error);
            }

            this.updateUI();
            this.showTestResult(true, '🗑️ API key cleared');

            // Notify the main app to update LLM interface
            if (window.vibeApp && typeof window.vibeApp.updateLLMInteractionArea === 'function') {
                window.vibeApp.updateLLMInteractionArea();
            }

            // Hide dev mode indicator if active
            if (window.vibeApp && typeof window.vibeApp.hideDevModeIndicator === 'function') {
                window.vibeApp.hideDevModeIndicator();
            }
        }
    }

    /**
     * Show test result
     * @param {boolean} success - Whether test was successful
     * @param {string} message - Result message
     */
    showTestResult(success, message) {
        const testResults = document.getElementById('test-results');
        const resultContent = document.getElementById('test-result-content');
        
        if (testResults && resultContent) {
            testResults.classList.remove('hidden');
            resultContent.textContent = message;
            resultContent.className = success ? 'test-success' : 'test-error';
        }
    }

    /**
     * Hide test results
     */
    hideTestResults() {
        const testResults = document.getElementById('test-results');
        if (testResults) {
            testResults.classList.add('hidden');
        }
    }

    /**
     * Update button states based on current input
     */
    updateButtonStates() {
        const apiKeyInput = document.getElementById('api-key-input');
        const testBtn = document.getElementById('test-api-key-btn');
        const saveBtn = document.getElementById('save-api-key-btn');
        
        if (!apiKeyInput || !testBtn || !saveBtn) return;

        const hasKey = apiKeyInput.value.trim().length > 0;
        const isValidFormat = this.currentSelectedProvider && 
                             this.apiKeyManager.validateAPIKeyFormat(this.currentSelectedProvider, apiKeyInput.value.trim());
        
        testBtn.disabled = !hasKey || !isValidFormat;
        saveBtn.disabled = !hasKey || !isValidFormat;
    }

    /**
     * Update the entire UI state
     */
    updateUI() {
        this.updateAPIStatus();
        this.resetForm();
    }

    /**
     * Update API status indicator
     */
    updateAPIStatus() {
        const statusIndicator = document.getElementById('api-status-indicator');
        const statusText = document.getElementById('api-status-text');
        const providerInfo = document.getElementById('current-provider-info');
        
        if (!statusIndicator || !statusText || !providerInfo) return;

        const currentProvider = this.apiKeyManager.getCurrentProvider();
        
        if (currentProvider && currentProvider.hasKey) {
            // API key is configured
            statusIndicator.className = 'status-indicator status-active';
            statusText.textContent = 'API key configured';
            
            // Show provider info
            providerInfo.classList.remove('hidden');
            
            const providerName = document.getElementById('current-provider-name');
            const modelName = document.getElementById('current-model-name');
            const maskedKey = document.getElementById('current-api-key-masked');

            const apiKeyData = this.apiKeyManager.getAPIKey();
            const displayModel = apiKeyData?.model || currentProvider.config.defaultModel;

            if (providerName) providerName.textContent = currentProvider.config.name;
            if (modelName) modelName.textContent = displayModel;
            if (maskedKey) maskedKey.textContent = this.apiKeyManager.getMaskedKey() || '****';
            
        } else {
            // No API key configured
            statusIndicator.className = 'status-indicator status-none';
            statusText.textContent = 'No API key configured';
            providerInfo.classList.add('hidden');
        }
    }

    /**
     * Reset the form to initial state
     */
    resetForm() {
        // Clear provider selection
        this.currentSelectedProvider = null;
        document.querySelectorAll('.provider-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Reset model dropdown
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            modelSelect.innerHTML = '<option value="">Select a provider first</option>';
            modelSelect.disabled = true;
        }

        // Hide input section
        const inputSection = document.getElementById('api-key-input-section');
        if (inputSection) {
            inputSection.classList.add('hidden');
        }

        // Clear input
        const apiKeyInput = document.getElementById('api-key-input');
        if (apiKeyInput) {
            apiKeyInput.value = '';
            apiKeyInput.type = 'password';
        }

        // Reset visibility toggle
        this.isKeyVisible = false;
        const toggleBtn = document.getElementById('toggle-key-visibility');
        if (toggleBtn) {
            toggleBtn.textContent = '👁️';
            toggleBtn.title = 'Show Key';
        }

        // Hide instructions
        const instructionsContent = document.getElementById('instructions-content');
        const toggleInstructions = document.getElementById('toggle-instructions');
        if (instructionsContent && toggleInstructions) {
            instructionsContent.classList.add('hidden');
            toggleInstructions.textContent = 'Show';
        }

        // Hide test results
        this.hideTestResults();

        // Update button states
        this.updateButtonStates();
    }

    /**
     * Get current API key manager instance
     * @returns {APIKeyManager} API key manager instance
     */
    getAPIKeyManager() {
        return this.apiKeyManager;
    }

    /**
     * Check if API key is available
     * @returns {boolean} True if API key is available
     */
    hasAPIKey() {
        return this.apiKeyManager.hasAPIKey();
    }

    /**
     * Get current API key data
     * @returns {Object|null} API key data or null
     */
    getAPIKey() {
        return this.apiKeyManager.getAPIKey();
    }

    /**
     * Check if UI is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized;
    }
}

// Global functions for HTML onclick handlers
window.closeAPISettings = function() {
    if (window.apiSettingsUI) {
        window.apiSettingsUI.closeModal();
    }
};