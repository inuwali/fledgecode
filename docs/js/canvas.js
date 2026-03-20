// P5.js canvas integration and code execution

import { formatError, showError, hideError } from './utils.js';
import { P5_FUNCTIONS, P5_VARIABLES, P5_CONSTANTS, getAllP5Identifiers } from './p5-vocabulary.js';

export class Canvas {
    constructor(containerId) {
        this.containerId = containerId;
        this.currentSketch = null;
        this.isRunning = false;
        this.executionTimeout = null;
        this.maxExecutionTime = 5000; // 5 seconds max execution time
    }

    /**
     * Execute P5.js code safely
     * @param {string} code - JavaScript code to execute
     */
    async executeCode(code) {
        try {
            // Clear any previous execution
            this.stop();
            hideError();
            console.log('Running code...');
            
            // Validate code before execution
            const validation = this.validateP5Code(code);
            if (!validation.success) {
                throw new Error(validation.errors.join('; '));
            }

            // Create isolated execution environment
            await this.createSketch(code);
            
            console.log('Code running');
            this.isRunning = true;
            
            // Only set timeout for code without draw() function
            // P5.js sketches with draw() are meant to run continuously
            if (!code.includes('function draw')) {
                this.executionTimeout = setTimeout(() => {
                    if (this.isRunning) {
                        this.stop();
                        showError('Code execution timed out. Check for infinite loops.');
                        console.error('Code execution timeout');
                    }
                }, this.maxExecutionTime);
            }
            
        } catch (error) {
            console.error('Code execution error:', error);
            const enhancedError = this.enhanceErrorMessage(error);
            showError(formatError(enhancedError));
            console.error('Code execution error');
            this.isRunning = false;
        }
    }

    /**
     * Create P5.js sketch from code
     * @param {string} code - P5.js code to execute
     */
    async createSketch(code) {
        return new Promise((resolve, reject) => {
            try {
                // Clear canvas container
                const container = document.getElementById(this.containerId);
                container.innerHTML = '<div id="error-display" class="error-display hidden"></div>';
                
                // Create P5 instance with error handling
                const sketch = (p) => {
                    // Wrap user code in try-catch with enhanced error handling
                    try {
                        // Execute user code in the P5 context
                        const wrappedCode = this.wrapUserCode(code);
                        const func = new Function('p', wrappedCode);
                        func.call(this, p);
                        
                        // Set up error handling for P5 errors
                        p._onError = (error) => {
                            console.error('P5 runtime error:', error);
                            const enhancedError = this.enhanceErrorMessage(error);
                            showError(formatError(enhancedError));
                            console.error('Runtime error in user code');
                        };
                        
                    } catch (error) {
                        // Enhance error message for better user experience
                        const enhancedError = this.enhanceErrorMessage(error);
                        reject(enhancedError);
                    }
                };

                // Create P5 instance
                this.currentSketch = new p5(sketch, this.containerId);
                resolve();
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Wrap user code to bind P5 functions to the instance
     * @param {string} code - User's P5.js code
     * @returns {string} Wrapped code
     */
    wrapUserCode(code) {
        // Use centralized P5.js vocabulary
        const p5Functions = P5_FUNCTIONS;
        const p5Variables = P5_VARIABLES;
        const p5Constants = P5_CONSTANTS;

        // Create function bindings that preserve P5.js method signatures
        const functionBindings = p5Functions.map(fn => `const ${fn} = (...args) => p.${fn}(...args);`).join('\n');
        const variableBindings = p5Variables.map(varName => {
            return `
                // Clean up existing binding and create fresh one
                if (Object.getOwnPropertyDescriptor(window, '${varName}')) {
                    delete window['${varName}'];
                }
                Object.defineProperty(window, '${varName}', { 
                    get: () => p.${varName},
                    configurable: true 
                });`;
        }).join('\n');

        const constantBindings = p5Constants.map(constantName => {
            return `
                // Clean up existing binding and create fresh one
                if (Object.getOwnPropertyDescriptor(window, '${constantName}')) {
                    delete window['${constantName}'];
                }
                Object.defineProperty(window, '${constantName}', { 
                    get: () => p.${constantName},
                    configurable: true 
                });`;
        }).join('\n');

        // Wrap the user code
        return `
            ${functionBindings}
            ${variableBindings}
            ${constantBindings}
            
            ${code}
            
            // Bind user functions to P5 instance if they exist
            if (typeof setup === 'function') {
                p.setup = setup;
            }
            if (typeof draw === 'function') {
                p.draw = draw;
            }
            if (typeof mousePressed === 'function') {
                p.mousePressed = mousePressed;
            }
            if (typeof keyPressed === 'function') {
                p.keyPressed = keyPressed;
            }
        `;
    }

    /**
     * Validate P5.js code for common issues
     * @param {string} code - Code to validate
     * @returns {Object} Validation result
     */
    validateP5Code(code) {
        const errors = [];
        
        // Check for balanced braces, brackets, parentheses
        const balanceResult = this.checkBalance(code);
        if (!balanceResult.success) {
            errors.push(balanceResult.error);
        }
        
        // Check for potential infinite loops
        if (code.match(/while\s*\(\s*true\s*\)/)) {
            errors.push('Potential infinite loop detected: while(true)');
        }
        
        // Check for createCanvas outside setup
        if (code.includes('createCanvas') && !code.includes('function setup')) {
            errors.push('createCanvas() should be called inside setup() function');
        }
        
        // Check for malformed function declarations
        const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*\{/g;
        let match;
        while ((match = functionRegex.exec(code)) !== null) {
            // Check if function has proper closing brace (basic check)
            const funcStart = match.index;
            const funcName = match[1];
            
            if (funcName !== 'setup' && funcName !== 'draw' && 
                funcName !== 'mousePressed' && funcName !== 'keyPressed') {
                // Custom function - make sure it's properly defined
                const afterFunc = code.substring(funcStart + match[0].length);
                const braceCount = (afterFunc.match(/\{/g) || []).length - (afterFunc.match(/\}/g) || []).length;
                if (braceCount < 0) {
                    errors.push(`Function ${funcName} appears to have syntax errors`);
                }
            }
        }
        
        return {
            success: errors.length === 0,
            errors
        };
    }

    /**
     * Check if brackets, parentheses, and braces are balanced
     * @param {string} code - Code to check
     * @returns {Object} Balance check result
     */
    checkBalance(code) {
        const pairs = { '(': ')', '[': ']', '{': '}' };
        const stack = [];
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            const prevChar = i > 0 ? code[i - 1] : '';
            
            // Handle string literals
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                    stringChar = '';
                }
                continue;
            }
            
            if (inString) continue;
            
            // Handle comments
            if (char === '/' && i + 1 < code.length && code[i + 1] === '/') {
                // Skip to end of line
                while (i < code.length && code[i] !== '\n') i++;
                continue;
            }
            
            if (char === '/' && i + 1 < code.length && code[i + 1] === '*') {
                // Skip to end of block comment
                i += 2;
                while (i + 1 < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
                i++; // Skip the '/'
                continue;
            }
            
            if (pairs[char]) {
                stack.push(char);
            } else if (Object.values(pairs).includes(char)) {
                const last = stack.pop();
                if (pairs[last] !== char) {
                    return {
                        success: false,
                        error: `Mismatched ${char} at position ${i}`
                    };
                }
            }
        }
        
        if (stack.length > 0) {
            return {
                success: false,
                error: `Unclosed ${stack[stack.length - 1]}`
            };
        }
        
        return { success: true };
    }

    /**
     * Stop current sketch execution
     */
    stop() {
        if (this.currentSketch) {
            this.currentSketch.remove();
            this.currentSketch = null;
        }
        
        if (this.executionTimeout) {
            clearTimeout(this.executionTimeout);
            this.executionTimeout = null;
        }
        
        // Clean up global P5 variable bindings
        this.cleanupGlobalBindings();
        
        this.isRunning = false;
        console.log('Canvas stopped, ready for new code');
    }

    /**
     * Clean up global P5.js variable and constant bindings
     */
    cleanupGlobalBindings() {
        // Use centralized P5.js vocabulary
        const p5Variables = P5_VARIABLES;
        const p5Constants = P5_CONSTANTS;
        
        // Clean up variables
        p5Variables.forEach(varName => {
            if (Object.getOwnPropertyDescriptor(window, varName)) {
                delete window[varName];
            }
        });
        
        // Clean up constants
        p5Constants.forEach(constantName => {
            if (Object.getOwnPropertyDescriptor(window, constantName)) {
                delete window[constantName];
            }
        });
    }

    /**
     * Check if canvas is currently running code
     * @returns {boolean} True if code is executing
     */
    isExecuting() {
        return this.isRunning;
    }

    /**
     * Get canvas container element
     * @returns {HTMLElement} Canvas container
     */
    getContainer() {
        return document.getElementById(this.containerId);
    }

    /**
     * Enhance error messages to provide better user guidance
     * @param {Error} error - Original error
     * @returns {Error} Enhanced error with better message
     */
    enhanceErrorMessage(error) {
        const errorMessage = error.message;
        
        // Check for undefined variable/function errors (different browsers have different messages)
        const referenceErrorMatch = errorMessage.match(/(?:(\w+) is not defined|Can't find variable: (\w+))/);
        if (referenceErrorMatch) {
            const identifier = referenceErrorMatch[1] || referenceErrorMatch[2];
            
            // Check if it's a P5.js constant that might be missing
            if (P5_CONSTANTS.includes(identifier)) {
                const enhancedError = new Error(
                    `The constant '${identifier}' isn't supported yet in this app. ` +
                    `This is a P5.js constant that we haven't added to our bindings yet.`
                );
                enhancedError.name = 'UnsupportedConstantError';
                enhancedError.originalError = error;
                return enhancedError;
            }
            
            // Check if it looks like a P5.js function (camelCase starting with lowercase)
            if (/^[a-z][a-zA-Z]*$/.test(identifier) && identifier.length > 2) {
                // Check for common typos of P5.js functions
                const suggestions = this.getSimilarFunctionSuggestions(identifier);
                
                let message = `The function '${identifier}()' is not recognized.`;
                
                if (suggestions.length > 0) {
                    message += ` Did you mean: ${suggestions.join(', ')}?`;
                } else {
                    message += ` Check your spelling, or this might be a P5.js function that isn't supported yet.`;
                }
                
                const enhancedError = new Error(message);
                enhancedError.name = 'UnknownFunctionError';
                enhancedError.originalError = error;
                return enhancedError;
            }
        }
        
        // Return original error if no enhancement is needed
        return error;
    }

    /**
     * Get suggestions for similar P5.js function names (for typo detection)
     * @param {string} identifier - The unknown identifier
     * @returns {Array<string>} Array of similar function names
     */
    getSimilarFunctionSuggestions(identifier) {
        // Use centralized P5.js vocabulary for suggestions
        const boundFunctions = getAllP5Identifiers();
        
        const suggestions = [];
        const maxDistance = 2; // Allow up to 2 character differences
        
        for (const func of boundFunctions) {
            const distance = this.levenshteinDistance(identifier.toLowerCase(), func.toLowerCase());
            if (distance <= maxDistance && distance > 0) {
                suggestions.push(func);
            }
        }
        
        // Sort by similarity (shorter distance first)
        suggestions.sort((a, b) => {
            const distA = this.levenshteinDistance(identifier.toLowerCase(), a.toLowerCase());
            const distB = this.levenshteinDistance(identifier.toLowerCase(), b.toLowerCase());
            return distA - distB;
        });
        
        return suggestions.slice(0, 3); // Return top 3 suggestions
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} a - First string
     * @param {string} b - Second string
     * @returns {number} Edit distance
     */
    levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

        for (let i = 0; i <= a.length; i += 1) {
            matrix[0][i] = i;
        }

        for (let j = 0; j <= b.length; j += 1) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= b.length; j += 1) {
            for (let i = 1; i <= a.length; i += 1) {
                const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + indicator, // substitution
                );
            }
        }

        return matrix[b.length][a.length];
    }
}