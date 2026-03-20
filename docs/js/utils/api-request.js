/**
 * Universal API Request Handler
 * Generalizes API request logic used by model-manager and api-key-manager
 */

import appConfig from '../config.js';

/**
 * Make a generalized API request through Vercel proxy or direct API
 * @param {Object} config - Request configuration
 * @param {string} config.baseUrl - Base URL for the API
 * @param {string} config.endpoint - API endpoint (e.g., 'chat', 'models')
 * @param {Object} config.headers - HTTP headers
 * @param {string} [config.prompt] - User prompt (optional for some endpoints)
 * @param {string} [config.systemPrompt] - System prompt (optional for some endpoints)
 * @param {string} config.provider - Provider name (anthropic, openai, etc.)
 * @param {string} config.model - Model name
 * @param {string} [config.apiKey] - API key for user-provided keys
 * @param {boolean} [config.useUserKey=false] - Whether to use user-provided API key
 * @param {number} [config.timeout=30000] - Request timeout in milliseconds
 * @param {Object} [config.additionalPayload={}] - Additional request body parameters
 * @returns {Promise<Object>} API response data
 * @throws {Error} If request fails or times out
 */
export async function makeAPIRequest(config) {
    const {
        baseUrl,
        endpoint,
        headers = {},
        prompt,
        systemPrompt,
        provider,
        model,
        apiKey,
        useUserKey = false,
        timeout = 30000,
        additionalPayload = {}
    } = config;

    try {
        console.log("⬆️ Sending API request:");
        console.log(config);
        
        // Build request body for Vercel proxy
        const requestBody = {
            ...additionalPayload
        };

        // Add prompts if provided
        if (prompt !== undefined) {
            requestBody.message = prompt;
        }
        if (systemPrompt !== undefined) {
            requestBody.systemMessage = systemPrompt;
        }

        // Always include model
        requestBody.model = model;

        // Include user's provider, model and API key if using user key
        if (useUserKey) {
            if (provider) {
                requestBody.provider = provider;
            }
            if (model) {
                requestBody.model = model;
            }
            if (apiKey) {
                requestBody.apiKey = apiKey;
            }
        }

        const response = await fetch(`${baseUrl}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(timeout)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        if (error.name === 'TimeoutError') {
            throw new Error('Request timeout - try reducing the complexity of your request');
        }
        throw new Error(`API request failed: ${error.message}`);
    }
}

/**
 * Convenience function to make API requests with sensible defaults
 * @param {string} endpoint - API endpoint (e.g., 'chat', 'models')
 * @param {string} [prompt] - User prompt (optional for some endpoints)
 * @param {string} [systemPrompt] - System prompt (optional for some endpoints)
 * @param {string} provider - Provider name (anthropic, openai, etc.)
 * @param {string} model - Model name
 * @param {string} [apiKey] - API key for user-provided keys
 * @returns {Promise<Object>} API response data
 */
export async function requestAPI(endpoint, prompt, systemPrompt, provider, model, apiKey) {

    // Sensible defaults
    const config = {
        baseUrl: appConfig.apiBaseUrl,
        endpoint,
        headers: {
            'Content-Type': 'application/json'
        },
        prompt,
        systemPrompt,
        provider,
        model,
        apiKey,
        useUserKey: !!apiKey,
        timeout: 30000,
        additionalPayload: {}
    };

    return await makeAPIRequest(config);
}

/**
 * Extract content from API response data
 * Handles various response formats from different providers
 * @param {Object} data - API response data
 * @returns {string} Extracted content
 */
export function extractContentFromResponse(data) {
    let content = '';

    if (data.content && Array.isArray(data.content)) {
        content = data.content.map(block => block.text || '').join('');
    } else if (data.content) {
        content = data.content;
    } else if (data.message) {
        content = data.message;
    } else if (data.response) {
        content = data.response;
    } else {
        content = String(data);
    }

    return content;
}