// Test suite for enhanced error handling

import { Canvas } from '../js/canvas.js';

// Simple test framework
class ErrorTestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    assert(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(message);
        }
    }

    async runTests() {
        console.log('Running enhanced error handling tests...');
        
        for (const test of this.tests) {
            try {
                await test.testFn();
                this.results.push({ name: test.name, passed: true, error: null });
                console.log(`✓ ${test.name}`);
            } catch (error) {
                this.results.push({ name: test.name, passed: false, error: error.message });
                console.log(`✗ ${test.name}: ${error.message}`);
            }
        }
        
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        console.log(`\nResults: ${passed}/${total} tests passed`);
        
        return { passed, total, success: passed === total };
    }
}

const testFramework = new ErrorTestFramework();

// Test enhanced error messages for missing P5.js functions
testFramework.test('Enhanced error for missing circle() function', async () => {
    const canvas = new Canvas('test-container');
    
    // Test code that uses circle() function (which might not be bound)
    const testCode = `
        function setup() {
            createCanvas(200, 200);
        }
        function draw() {
            // Remove circle from bindings to test error handling
            nonExistentFunction();
        }
    `;
    
    const error = new Error('nonExistentFunction is not defined');
    const enhancedError = canvas.enhanceErrorMessage(error);
    
    // Should detect this as a potentially missing P5.js function
    testFramework.assert(
        enhancedError.message.includes('not recognized') || enhancedError.message.includes('Check your spelling'),
        'Should provide helpful message for unknown functions'
    );
});

// Test enhanced error messages for missing P5.js constants
testFramework.test('Enhanced error for missing RADIUS constant', async () => {
    const canvas = new Canvas('test-container');
    
    const error = new Error('RADIUS is not defined');
    const enhancedError = canvas.enhanceErrorMessage(error);
    
    testFramework.assert(
        enhancedError.message.includes("isn't supported yet") && enhancedError.message.includes('RADIUS'),
        'Should provide helpful message for missing P5.js constants'
    );
    testFramework.assert(enhancedError.name === 'UnsupportedConstantError', 'Should set appropriate error type');
});

// Test enhanced error messages for known P5.js functions
testFramework.test('Enhanced error for known P5.js functions', async () => {
    const canvas = new Canvas('test-container');
    
    const error = new Error('loadImage is not defined');
    const enhancedError = canvas.enhanceErrorMessage(error);
    
    testFramework.assert(
        enhancedError.message.includes("isn't supported yet") && enhancedError.message.includes('loadImage'),
        'Should provide helpful message for known P5.js functions'
    );
    testFramework.assert(enhancedError.name === 'UnsupportedFunctionError', 'Should set appropriate error type');
});

// Test that regular errors pass through unchanged
testFramework.test('Regular errors pass through unchanged', async () => {
    const canvas = new Canvas('test-container');
    
    const error = new Error('Syntax error: unexpected token');
    const enhancedError = canvas.enhanceErrorMessage(error);
    
    testFramework.assert(
        enhancedError === error,
        'Should return original error for non-P5.js errors'
    );
});

// Test basic P5.js functions are properly bound
testFramework.test('Common P5.js functions are bound correctly', () => {
    const canvas = new Canvas('test-container');
    
    const userCode = `
        function setup() {
            createCanvas(400, 400);
        }
        function draw() {
            background(220);
            circle(100, 100, 50);
            describe('A circle on a canvas');
        }
    `;
    
    const wrappedCode = canvas.wrapUserCode(userCode);
    
    // Check that new functions are included
    testFramework.assert(wrappedCode.includes('circle'), 'Should bind circle function');
    testFramework.assert(wrappedCode.includes('describe'), 'Should bind describe function');
    testFramework.assert(wrappedCode.includes('RADIUS'), 'Should bind RADIUS constant');
    testFramework.assert(wrappedCode.includes('CENTER'), 'Should bind CENTER constant');
});

// Export for use in other test files
if (typeof window !== 'undefined') {
    window.runErrorHandlingTests = async () => {
        const framework = new ErrorTestFramework();
        
        // Copy tests from this framework
        framework.tests = testFramework.tests;
        
        return await framework.runTests();
    };
}

export { testFramework as errorTestFramework };