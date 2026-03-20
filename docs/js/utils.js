// Utility functions for the Vibe Coding Instructor

/**
 * Debounce function to limit how often a function can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Basic validation for P5.js code
 * @param {string} code - JavaScript code to validate
 * @returns {Object} Validation result with success boolean and errors array
 */
export function validateCode(code) {
    const errors = [];
    
    // Check for balanced parentheses, brackets, and braces
    const balanceCheck = checkBalance(code);
    if (!balanceCheck.success) {
        errors.push(`Syntax error: ${balanceCheck.error}`);
    }
    
    // Check for common P5.js function calls without proper setup
    if (code.includes('createCanvas') && !code.includes('function setup')) {
        errors.push('createCanvas() should be called inside setup() function');
    }
    
    // Check for infinite loop patterns (basic detection)
    if (code.match(/while\s*\(\s*true\s*\)/)) {
        errors.push('Potential infinite loop detected: while(true)');
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
function checkBalance(code) {
    const pairs = { '(': ')', '[': ']', '{': '}' };
    const stack = [];
    
    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        
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
 * Extract error information from JavaScript error objects
 * @param {Error} error - JavaScript error object
 * @returns {string} Formatted error message
 */
export function formatError(error) {
    if (error.name === 'SyntaxError') {
        return `Syntax Error: ${error.message}`;
    } else if (error.name === 'ReferenceError') {
        return `Reference Error: ${error.message}`;
    } else if (error.name === 'TypeError') {
        return `Type Error: ${error.message}`;
    } else {
        return `Error: ${error.message}`;
    }
}

/**
 * Set the status indicator in the header
 * @param {string} status - Status text
 * @param {string} type - Status type: 'ready', 'running', 'error'
 */
export function setStatus(status, type = 'ready') {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = status;
        statusEl.className = type;
    }
}

/**
 * Show error message in the canvas panel
 * @param {string} message - Error message to display
 */
export function showError(message) {
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) {
        errorDisplay.textContent = message;
        errorDisplay.classList.remove('hidden');
    }
}

/**
 * Hide error message
 */
export function hideError() {
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) {
        errorDisplay.classList.add('hidden');
    }
}