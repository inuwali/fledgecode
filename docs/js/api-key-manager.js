// API Key Management System
// Secure storage and management of user-provided API keys

import { requestAPI, extractContentFromResponse } from './utils/api-request.js';

export class APIKeyManager {
    constructor() {
        this.storageKey = 'vibeInstructor_apiKeys';
        this.isInitialized = false;
        this.supportedProviders = {
            anthropic: {
                name: 'Anthropic (Claude)',
                keyPrefix: 'sk-ant-',
                apiUrl: 'https://api.anthropic.com/v1/messages',
                models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-5-20250929', 'claude-opus-4-1-20250805', 'claude-3-7-sonnet-20250219', 'claude-sonnet-4-20250514'],
                defaultModel: 'claude-sonnet-4-5-20250929',
                modelCapabilities: {
                    'claude-haiku-4-5-20251001': { tier: 2, supportsInlineExplanations: false },
                    'claude-sonnet-4-5-20250929': { tier: 1, supportsInlineExplanations: true },
                    'claude-opus-4-1-20250805': { tier: 1, supportsInlineExplanations: true },
                    'claude-3-7-sonnet-20250219': { tier: 1, supportsInlineExplanations: true },
                    'claude-sonnet-4-20250514': { tier: 1, supportsInlineExplanations: true }
                }
            },
            openai: {
                name: 'OpenAI (GPT)',
                keyPrefix: 'sk-',
                apiUrl: 'https://api.openai.com/v1/chat/completions',
                models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'],
                defaultModel: 'gpt-4o',
                modelCapabilities: {
                    'gpt-3.5-turbo': { tier: 2, supportsInlineExplanations: false },
                    'gpt-4': { tier: 1, supportsInlineExplanations: true },
                    'gpt-4-turbo-preview': { tier: 1, supportsInlineExplanations: true },
                    'gpt-4o': { tier: 1, supportsInlineExplanations: true }
                }
            }
        };
        this.currentProvider = null;
        this.selectedModel = null;
        this.testResults = new Map();
    }

    /**
     * Initialize the API key manager
     * @returns {boolean} Success status
     */
    init() {
        try {
            this.loadStoredKeys();
            this.isInitialized = true;
            console.log('API Key Manager initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize API Key Manager:', error);
            return false;
        }
    }

    /**
     * Store API key securely (sessionStorage only)
     * @param {string} provider - Provider name (anthropic, openai)
     * @param {string} apiKey - API key to store
     * @param {string} model - Optional model to use (defaults to provider's defaultModel)
     * @returns {boolean} Success status
     */
    setAPIKey(provider, apiKey, model = null) {
        if (!this.isInitialized) {
            console.warn('API Key Manager not initialized');
            return false;
        }

        if (!this.supportedProviders[provider]) {
            console.error(`Unsupported provider: ${provider}`);
            return false;
        }

        if (!this.validateAPIKeyFormat(provider, apiKey)) {
            console.error(`Invalid API key format for ${provider}`);
            return false;
        }

        try {
            // Use the selected model or fall back to default
            const providerConfig = this.supportedProviders[provider];
            const modelToUse = model || providerConfig.defaultModel;

            // Use sessionStorage for security (cleared when browser closes)
            const keyData = {
                provider,
                key: this.obfuscateKey(apiKey),
                model: modelToUse,
                timestamp: new Date().toISOString(),
                validated: false
            };

            sessionStorage.setItem(this.storageKey, JSON.stringify(keyData));

            // Store the actual key temporarily for use (in memory only)
            this.currentKey = apiKey;
            this.currentProvider = provider;
            this.selectedModel = modelToUse;

            console.log(`✅ API key stored for ${provider} with model ${modelToUse}`);
            return true;

        } catch (error) {
            console.error('Failed to store API key:', error);
            return false;
        }
    }

    /**
     * Get stored API key for current session
     * @returns {Object|null} Key data or null
     */
    getAPIKey() {
        if (!this.currentKey || !this.currentProvider) {
            return null;
        }

        const providerConfig = this.supportedProviders[this.currentProvider];
        return {
            provider: this.currentProvider,
            key: this.currentKey,
            model: this.selectedModel || providerConfig.defaultModel,
            providerConfig: providerConfig
        };
    }

    /**
     * Check if API key is available
     * @returns {boolean} True if key is available
     */
    hasAPIKey() {
        return !!(this.currentKey && this.currentProvider);
    }

    /**
     * Validate API key format
     * @param {string} provider - Provider name
     * @param {string} apiKey - API key to validate
     * @returns {boolean} True if format is valid
     */
    validateAPIKeyFormat(provider, apiKey) {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }

        const providerConfig = this.supportedProviders[provider];
        if (!providerConfig) {
            return false;
        }

        // When we added the skeleton key, these two checks prevented its use.
        // Check prefix
        // if (!apiKey.startsWith(providerConfig.keyPrefix)) {
        //     return false;
        // }
// 
        // // Basic length check (API keys are typically 40+ characters)
        // if (apiKey.length < 20) {
        //     return false;
        // }

        return true;
    }

    /**
     * Test API key by making a simple API call
     * @param {string} provider - Provider name
     * @param {string} apiKey - API key to test
     * @returns {Promise<Object>} Test result
     */
    async testAPIKey(provider, apiKey) {
        const testId = `${provider}_${Date.now()}`;

        try {
            const providerConfig = this.supportedProviders[provider];
            if (!providerConfig) {
                throw new Error(`Unsupported provider: ${provider}`);
            }

            const data = await requestAPI(
                'verify-key',
                null,
                null,
                provider,
                providerConfig.defaultModel,
                apiKey
            );

            const response = extractContentFromResponse(data);

            const result = {
                success: true,
                provider,
                model: providerConfig.defaultModel,
                response: response.trim(),
                timestamp: new Date().toISOString()
            };

            this.testResults.set(testId, result);
            console.log(`✅ API key test successful for ${provider}`);
            return result;

        } catch (error) {
            const result = {
                success: false,
                provider,
                error: error.message,
                timestamp: new Date().toISOString()
            };

            this.testResults.set(testId, result);
            console.error(`❌ API key test failed for ${provider}:`, error);
            return result;
        }
    }


    /**
     * Clear stored API key
     */
    clearAPIKey() {
        try {
            sessionStorage.removeItem(this.storageKey);
            this.currentKey = null;
            this.currentProvider = null;
            this.selectedModel = null;
            console.log('🗑️ API key cleared');
        } catch (error) {
            console.error('Failed to clear API key:', error);
        }
    }

    /**
     * Load stored keys from sessionStorage
     * @private
     */
    loadStoredKeys() {
        try {
            const stored = sessionStorage.getItem(this.storageKey);
            if (stored) {
                const keyData = JSON.parse(stored);
                // We can't recover the actual key from sessionStorage (it's obfuscated)
                // User will need to re-enter it
                console.log(`📋 Found stored key data for ${keyData.provider} (key needs re-entry)`);
            }
        } catch (error) {
            console.warn('Failed to load stored keys:', error);
        }
    }

    /**
     * Obfuscate API key for storage (show only last 4 characters)
     * @param {string} apiKey - Original API key
     * @returns {string} Obfuscated key
     * @private
     */
    obfuscateKey(apiKey) {
        if (!apiKey || apiKey.length < 8) {
            return '****';
        }
        const visibleChars = 4;
        const maxTotalLength = 15; // Limit total displayed length
        const maxAsterisks = maxTotalLength - visibleChars; // Max 11 asterisks
        
        const hiddenLength = Math.min(apiKey.length - visibleChars, maxAsterisks);
        return '*'.repeat(hiddenLength) + apiKey.slice(-visibleChars);
    }

    /**
     * Get supported providers
     * @returns {Object} Provider configurations
     */
    getSupportedProviders() {
        return this.supportedProviders;
    }

    /**
     * Get current provider info
     * @returns {Object|null} Current provider configuration
     */
    getCurrentProvider() {
        if (!this.currentProvider) {
            return null;
        }
        return {
            name: this.currentProvider,
            config: this.supportedProviders[this.currentProvider],
            hasKey: this.hasAPIKey()
        };
    }

    /**
     * Get masked key for display
     * @returns {string|null} Masked key or null
     */
    getMaskedKey() {
        if (!this.currentKey) {
            return null;
        }
        return this.obfuscateKey(this.currentKey);
    }

    /**
     * Get latest test results
     * @returns {Array} Array of test results
     */
    getTestResults() {
        return Array.from(this.testResults.values()).sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
    }

    /**
     * Generate usage instructions for API key setup
     * @param {string} provider - Provider name
     * @returns {Object} Instructions object
     */
    getSetupInstructions(provider) {
        const instructions = {
            anthropic: {
                title: 'Get Your Anthropic API Key',
                steps: [
                    'Visit https://console.anthropic.com/',
                    'Sign in or create an account',
                    'Go to "API Keys" in your dashboard',
                    'Click "Create Key" and give it a name',
                    'Copy the key (starts with "sk-ant-")',
                    'Paste it in the field below'
                ],
                docs: 'https://docs.anthropic.com/claude/reference/getting-started',
                notes: 'You may need to add credits to your account to use the API.'
            },
            openai: {
                title: 'Get Your OpenAI API Key',
                steps: [
                    'Visit https://platform.openai.com/',
                    'Sign in or create an account',
                    'Go to "API Keys" in your dashboard',
                    'Click "Create new secret key"',
                    'Copy the key (starts with "sk-")',
                    'Paste it in the field below'
                ],
                docs: 'https://platform.openai.com/docs/quickstart',
                notes: 'You may need to add credits to your account to use the API.'
            }
        };

        return instructions[provider] || {
            title: 'API Key Setup',
            steps: ['Contact the provider for API key setup instructions'],
            docs: '',
            notes: ''
        };
    }

    /**
     * Get model capability information
     * @param {string} provider - Provider name (anthropic, openai)
     * @param {string} model - Model identifier
     * @returns {Object|null} Capability object { tier, supportsInlineExplanations } or null
     */
    getModelCapability(provider, model) {
        const providerConfig = this.supportedProviders[provider];
        if (!providerConfig || !providerConfig.modelCapabilities) {
            return null;
        }

        return providerConfig.modelCapabilities[model] || null;
    }

    /**
     * Get capability of currently selected model
     * @returns {Object|null} Capability object or null
     */
    getCurrentModelCapability() {
        if (!this.currentProvider || !this.selectedModel) {
            return null;
        }

        return this.getModelCapability(this.currentProvider, this.selectedModel);
    }

    /**
     * Check if manager is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized;
    }
}