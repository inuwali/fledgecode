// Model Manager for LLM API calls
// Supports both user-provided API keys and Vercel proxy fallback

import appConfig from '../config.js';
import { requestAPI, extractContentFromResponse } from '../utils/api-request.js';

export class ModelManager {
    constructor() {
        // Model configuration
        this.config = {
            maxTokens: 150,
            temperature: 0.7,
            timeout: 30000, // 30 second timeout for API calls
            model: 'gpt-4o' // Default to fast, capable model
        };

        // Vercel proxy configuration (fallback)
        this.defaultBaseUrl = appConfig.apiBaseUrl;
        this.proxyConfig = {
            baseUrl: this.defaultBaseUrl,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Will be set via setAPIKeyManager method
        this.apiKeyManager = null;
    }

    /**
     * Set the API key manager instance
     * @param {APIKeyManager} apiKeyManager - API key manager instance
     */
    setAPIKeyManager(apiKeyManager) {
        this.apiKeyManager = apiKeyManager;
    }

    /**
     * Override the Vercel proxy base URL (for testing feature branches)
     * @param {string|null} url - Custom base URL, or null to reset to default
     */
    setBaseUrl(url) {
        if (url && url.trim()) {
            this.proxyConfig.baseUrl = url.trim();
            console.log(`🔧 Vercel endpoint overridden: ${this.proxyConfig.baseUrl}`);
        } else {
            this.proxyConfig.baseUrl = this.defaultBaseUrl;
            console.log('🔧 Vercel endpoint reset to default');
        }
    }

    /**
     * Get the current base URL
     * @returns {string} Current base URL
     */
    getBaseUrl() {
        return this.proxyConfig.baseUrl;
    }

    /**
     * Check if using a custom (non-default) base URL
     * @returns {boolean} True if using a custom endpoint
     */
    isUsingCustomEndpoint() {
        return this.proxyConfig.baseUrl !== this.defaultBaseUrl;
    }

    /**
     * Get current API configuration for Vercel proxy
     * @returns {Object} API configuration for proxy request
     */
    getCurrentAPIConfig() {
        const baseConfig = {
            baseUrl: this.proxyConfig.baseUrl,
            headers: this.proxyConfig.headers
        };

        // Check if user has provided API key
        if (this.apiKeyManager && this.apiKeyManager.hasAPIKey()) {
            const keyData = this.apiKeyManager.getAPIKey();
            if (keyData) {
                return {
                    ...baseConfig,
                    useUserKey: true,
                    provider: keyData.provider,
                    apiKey: keyData.key,
                    model: keyData.model || keyData.providerConfig.defaultModel || this.config.model
                };
            }
        }
        
        // No user key
        return {
            ...baseConfig,
            useUserKey: false,
            model: this.config.model
        };
    }


    /**
     * Generate P5.js code using the Vercel endpoint
     * @param {string} prompt - Code generation prompt
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated code
     */
    async generateCode(prompt, systemPrompt, options = {}) {
        try {
            const codePrompt = `Generate P5.js code for: ${prompt}. Return only the code, no explanations.`;
            return await this.generateWithAPI(codePrompt, systemPrompt, options, 'code');
        } catch (error) {
            console.error('Code generation failed:', error);
            throw error;
        }
    }

    /**
     * Generate explanatory text using the Vercel endpoint
     * @param {string} prompt - Text generation prompt
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated text
     */
    async generateText(prompt, options = {}) {
        try {
            return await this.generateWithAPI(prompt, options, 'text');
        } catch (error) {
            console.error('Text generation failed:', error);
            throw error;
        }
    }

    /**
     * Clean and format generated code
     * @param {string} code - Raw generated code
     * @returns {string} Cleaned code
     * @private
     */
    cleanGeneratedCode(code) {
        // Remove common artifacts and clean up the code
        let cleaned = code
            .replace(/^```javascript\s*/i, '') // Remove code block markers
            .replace(/^```js\s*/i, '')
            .replace(/```\s*$/, '')
            .replace(/^```\s*/, '')
            .trim();

        return cleaned;
    }

    /**
     * Generate content using Vercel proxy with optional user API key
     * @param {string} prompt - Generation prompt
     * @param {Object} options - Generation options
     * @param {string} type - Generation type for response formatting
     * @returns {Promise<string>} Generated content
     * @private
     */
    async generateWithAPI(prompt, systemPrompt, options = {}, type = 'text') {
        const apiConfig = this.getCurrentAPIConfig();
        
        try {
            const data = await requestAPI(
                'chat',
                prompt,
                systemPrompt,
                apiConfig.provider,
                apiConfig.model,
                apiConfig.apiKey
            );
            
            console.log('Response data:', data);
            
            // Extract content from response
            let content = extractContentFromResponse(data);
            
            // Clean code if this is a code generation request
            if (type === 'code') {
                content = this.cleanGeneratedCode(content);
            }
            
            console.log('Full response code:', content);

            return content;

        } catch (error) {
            throw new Error(`API generation failed: ${error.message}`);
        }
    }

    /**
     * Update model configuration
     * @param {Object} newConfig - New configuration options
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Get model information
     * @returns {Object} Model metadata
     */
    getModelInfo() {
        const apiConfig = this.getCurrentAPIConfig();
        
        return {
            model: apiConfig.model || this.config.model,
            provider: apiConfig.provider || 'vercel-default',
            useUserKey: apiConfig.useUserKey,
            config: { ...this.config },
            mode: apiConfig.useUserKey ? 'user-api-key' : 'vercel-default',
            architecture: 'vercel-proxy' // Always use Vercel proxy for all requests
        };
    }

    /**
     * Test if API key is working
     * @returns {boolean} True if user API key is available
     */
    hasUserAPIKey() {
        return this.apiKeyManager && this.apiKeyManager.hasAPIKey();
    }

    /**
     * Get current provider name
     * @returns {string} Provider name
     */
    getCurrentProvider() {
        const apiConfig = this.getCurrentAPIConfig();
        return apiConfig.provider || 'vercel-default';
    }

    /**
     * Check if current model supports inline explanations (single-pass)
     * @returns {boolean} True if model can handle [EXPLAIN] comments in single pass
     */
    supportsInlineExplanations() {
        if (!this.apiKeyManager) {
            // Default to true for backward compatibility with vercel-default
            return true;
        }

        const capability = this.apiKeyManager.getCurrentModelCapability();
        if (!capability) {
            // If no capability data, assume it's a powerful model (safe default)
            return true;
        }

        return capability.supportsInlineExplanations;
    }

    /**
     * Get current model tier (1 = powerful, 2 = weaker)
     * @returns {number} Model tier (1 or 2)
     */
    getModelTier() {
        if (!this.apiKeyManager) {
            return 1; // Default tier
        }

        const capability = this.apiKeyManager.getCurrentModelCapability();
        return capability ? capability.tier : 1;
    }

    /**
     * Generate explanations for code diffs (two-pass approach for weaker models)
     * @param {string} oldCode - Original code before changes
     * @param {string} newCode - New code after changes
     * @param {string} userRequest - User's original request
     * @param {Array} diffBlocks - Array of diff blocks from DiffManager { type, startLine, endLine, content }
     * @returns {Promise<Object>} { explanations: Array, prompt: string, response: string }
     */
    async generateExplanationsForDiff(oldCode, newCode, userRequest, diffBlocks) {
        try {
            console.log('🔍 Generating explanations for diff blocks:', diffBlocks);

            // Format diff blocks for the prompt
            let diffBlocksText = '';
            diffBlocks.forEach((block, index) => {
                const blockNumber = index + 1;
                console.log(`  Block ${blockNumber}:`, { type: block.type, startLine: block.startLine, endLine: block.endLine, hasContent: !!block.content });

                diffBlocksText += `\nBLOCK ${blockNumber} (lines ${block.startLine}-${block.endLine}):\n`;

                // For modifications, show both old and new
                if (block.type === 'modification' && block.oldContent) {
                    const oldLines = block.oldContent.split('\n');
                    oldLines.forEach(line => {
                        if (line) {
                            diffBlocksText += `- ${line}\n`;
                        }
                    });
                }

                // Format content based on block type
                const lines = block.content.split('\n');
                lines.forEach(line => {
                    if (line) { // Skip empty lines
                        const prefix = block.type === 'addition' ? '+ ' :
                                      block.type === 'modification' ? '+ ' :
                                      block.type === 'deletion' ? '- ' : '  ';
                        diffBlocksText += `${prefix}${line}\n`;
                    }
                });
            });

            // Construct the prompt
            const prompt = `=== USER REQUEST ===
${userRequest}

=== ORIGINAL CODE ===
${oldCode}

=== CHANGES MADE ===
${diffBlocksText}

=== TASK ===
For each BLOCK, explain HOW the code accomplishes the user's request. Focus on the technical behavior, not on justifying the change. Limit your response to 1-2 sentences.`;

            const systemPrompt = `You are a helpful coding instructor explaining code modifications to a novice. The novice has prompted an LLM to make changes to their code, and the LLM has modified the code. They're learning how the code works, so your explanations will be displayed as tooltips on the highlighted code changes.

=== STRUCTURE ===
You'll receive the user's request, the original code in its entirety, and the changes made by the LLM as diff chunks with headers like "BLOCK 1 (lines 12-15):". You'll provide an explanation for each of the changes, referring back to the request and the diffs.

=== RULES ===
- Be concise and technical.
- Describe what the code does to accomplish the user's request in simple language.

Format your response exactly as:
BLOCK 1: explanation here
BLOCK 2: explanation here

=== EXAMPLES ===
(Note that the format here is not the same as that used in actual prompt, and the original code is not included for brevity.)

**USER REQUEST**
"Make the background orange."
**CHANGE MADE**
BLOCK 1 (lines 6-7):
-   // Draw a light blue background
-   background('lightgreen');
+   // Draw an orange background
+   background('orange');
**RESPONSE**
BLOCK 1: Sets the background to orange using a named CSS color.

**USER REQUEST**
 "Add a red circle in the center"
**CHANGE MADE**
BLOCK 1 (lines 12-13):
+   // Draw a red circle at the center of the canvas
+   fill('red');
+   circle(200, 200, 50);
**RESPONSE**
BLOCK 1: Draws a red circle at the canvas center (X=200, Y=200) with a 50-pixel diameter.

**USER REQUEST**
"Make the circle size change over time"
**CHANGE MADE**
BLOCK 1 (lines 1-2):
+ let circleSize = 0;
+
**RESPONSE**
BLOCK 1: Creates a variable, circleSize, to track the circle's size. This variable can be updated each frame to create animation.

**USER REQUEST**
"Make the square bounce when it hits the edge"
**CHANGE MADE**
BLOCK 1 (lines 15-18):
-   x = x + 2;
+   x = x + speed;
+   // If the square is at the left or right edge, change its speed
+   if (x > width || x < 0) {
+     speed = speed * -1;
+   }
**RESPONSE**
BLOCK 1: Moves the square using a speed variable that can be positive or negative. When the square reaches either edge, the speed is multiplied by -1 to reverse direction.
`;

            console.log('📤 Sending explanation request to LLM...');
            console.log('Prompt:', prompt);

            // Generate explanations
            const response = await this.generateWithAPI(prompt, systemPrompt, {}, 'text');

            console.log('📥 Received explanation response:', response);

            // Parse the response
            const explanations = this.parseExplanationResponse(response, diffBlocks.length);

            console.log(`✅ Generated ${explanations.length} explanations for ${diffBlocks.length} diff blocks:`, explanations);

            // Return explanations along with prompt and response for debugging
            return {
                explanations,
                prompt,
                response
            };

        } catch (error) {
            console.error('Failed to generate explanations for diff:', error);
            return { explanations: [], prompt: '', response: '' }; // Return empty on failure (graceful degradation)
        }
    }

    /**
     * Parse explanation response text into structured data
     * @param {string} response - Raw LLM response
     * @param {number} expectedBlocks - Number of blocks we expect explanations for
     * @returns {Array} Array of { blockIndex, explanation } objects
     * @private
     */
    parseExplanationResponse(response, expectedBlocks) {
        const explanations = [];

        console.log('🔍 Parsing response (raw):', response);
        console.log('🔍 Expected blocks:', expectedBlocks);

        // Try to match blocks with optional line numbers, handling multi-line explanations
        // Pattern matches: "BLOCK N:" or "BLOCK N (lines X-Y):"
        const blockRegex = /BLOCK\s+(\d+)(?:\s*\(lines\s+\d+-\d+\))?:\s*([^\n]+(?:\n(?!BLOCK)[^\n]+)*)/gi;

        let match;
        while ((match = blockRegex.exec(response)) !== null) {
            const blockNumber = parseInt(match[1], 10);
            const explanation = match[2].trim();

            console.log(`  Found BLOCK ${blockNumber}:`, explanation.substring(0, 50) + '...');

            if (blockNumber >= 1 && blockNumber <= expectedBlocks) {
                explanations.push({
                    blockIndex: blockNumber - 1, // Convert to 0-indexed
                    explanation: explanation
                });
            }
        }

        console.log('📝 Parsed explanations:', explanations);
        return explanations;
    }
}