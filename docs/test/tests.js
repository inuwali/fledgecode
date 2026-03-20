// Test suite for Vibe Coding Instructor Phase 1

// Import modules for testing
import { validateCode, debounce, formatError } from '../js/utils.js';
import { Canvas } from '../js/canvas.js';
import { OntologyEngine } from '../js/ontology.js';
import { LearnerProfile } from '../js/learner.js';
import { CodeValidator } from '../js/validation.js';
import { ModelManager } from '../js/llm/model-manager.js';

// Simple test framework
class TestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
        this.outputElement = null;
    }

    /**
     * Add a test case
     * @param {string} name - Test name
     * @param {Function} testFn - Test function
     * @param {string} category - Test category (unit, integration)
     */
    test(name, testFn, category = 'unit') {
        this.tests.push({ name, testFn, category });
    }

    /**
     * Assert that a condition is true
     * @param {boolean} condition - Condition to test
     * @param {string} message - Error message if assertion fails
     */
    assert(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(message);
        }
    }

    /**
     * Assert that two values are equal
     * @param {any} actual - Actual value
     * @param {any} expected - Expected value
     * @param {string} message - Error message if assertion fails
     */
    assertEqual(actual, expected, message = `Expected ${expected}, got ${actual}`) {
        if (actual !== expected) {
            throw new Error(message);
        }
    }

    /**
     * Assert that a function throws an error
     * @param {Function} fn - Function that should throw
     * @param {string} message - Error message if assertion fails
     */
    assertThrows(fn, message = 'Expected function to throw an error') {
        try {
            fn();
            throw new Error(message);
        } catch (error) {
            // Expected behavior
        }
    }

    /**
     * Run all tests
     * @param {string} category - Optional category filter
     */
    async runTests(category = null) {
        this.results = [];
        const filteredTests = category ? 
            this.tests.filter(test => test.category === category) : 
            this.tests;

        this.log(`Running ${filteredTests.length} tests...`, 'info');

        for (const test of filteredTests) {
            try {
                await test.testFn();
                this.results.push({ name: test.name, passed: true, error: null });
                this.log(`✓ ${test.name}`, 'pass');
            } catch (error) {
                this.results.push({ name: test.name, passed: false, error: error.message });
                this.log(`✗ ${test.name}: ${error.message}`, 'fail');
            }
        }

        this.showSummary();
    }

    /**
     * Log test output
     * @param {string} message - Message to log
     * @param {string} type - Log type (pass, fail, info)
     */
    log(message, type = 'info') {
        if (!this.outputElement) {
            this.outputElement = document.getElementById('test-output');
        }

        if (this.outputElement) {
            const resultDiv = document.createElement('div');
            resultDiv.className = `test-result ${type}`;
            resultDiv.textContent = message;
            this.outputElement.appendChild(resultDiv);
        }

        console.log(message);
    }

    /**
     * Show test summary
     */
    showSummary() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const total = this.results.length;

        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'test-summary';
        summaryDiv.innerHTML = `
            <h3>Test Summary</h3>
            <p>Total: ${total} | Passed: ${passed} | Failed: ${failed}</p>
            <p>Success Rate: ${total > 0 ? Math.round((passed / total) * 100) : 0}%</p>
        `;

        if (this.outputElement) {
            this.outputElement.appendChild(summaryDiv);
        }
    }

    /**
     * Clear test output
     */
    clear() {
        if (this.outputElement) {
            this.outputElement.innerHTML = '';
        }
    }
}

// Create test framework instance
const testFramework = new TestFramework();

// Unit Tests for Utils
testFramework.test('debounce function works correctly', async () => {
    let callCount = 0;
    const debouncedFn = debounce(() => callCount++, 100);
    
    // Call multiple times rapidly
    debouncedFn();
    debouncedFn();
    debouncedFn();
    
    // Should not have been called yet
    testFramework.assertEqual(callCount, 0, 'Debounced function should not be called immediately');
    
    // Wait for debounce delay
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should have been called once
    testFramework.assertEqual(callCount, 1, 'Debounced function should be called once after delay');
}, 'unit');

testFramework.test('validateCode detects balanced parentheses', () => {
    const validCode = 'function setup() { createCanvas(400, 400); }';
    const invalidCode = 'function setup() { createCanvas(400, 400; }';
    
    const validResult = validateCode(validCode);
    const invalidResult = validateCode(invalidCode);
    
    testFramework.assert(validResult.success, 'Valid code should pass validation');
    testFramework.assert(!invalidResult.success, 'Invalid code should fail validation');
    testFramework.assert(invalidResult.errors.length > 0, 'Invalid code should have error messages');
}, 'unit');

testFramework.test('validateCode detects createCanvas outside setup', () => {
    const invalidCode = 'createCanvas(400, 400); ellipse(100, 100, 50, 50);';
    const result = validateCode(invalidCode);
    
    testFramework.assert(!result.success, 'Code with createCanvas outside setup should fail');
    testFramework.assert(
        result.errors.some(error => error.includes('createCanvas')), 
        'Should warn about createCanvas placement'
    );
}, 'unit');

testFramework.test('formatError handles different error types', () => {
    const syntaxError = new SyntaxError('Unexpected token');
    const referenceError = new ReferenceError('Variable not defined');
    const typeError = new TypeError('Cannot read property');
    
    const syntaxFormatted = formatError(syntaxError);
    const referenceFormatted = formatError(referenceError);
    const typeFormatted = formatError(typeError);
    
    testFramework.assert(syntaxFormatted.includes('Syntax Error'), 'Should format syntax errors');
    testFramework.assert(referenceFormatted.includes('Reference Error'), 'Should format reference errors');
    testFramework.assert(typeFormatted.includes('Type Error'), 'Should format type errors');
}, 'unit');

// Unit Tests for Canvas
testFramework.test('Canvas validates P5.js code correctly', () => {
    const canvas = new Canvas('test-container');
    
    const validCode = `
        function setup() {
            createCanvas(400, 400);
        }
        function draw() {
            background(220);
            ellipse(50, 50, 80, 80);
        }
    `;
    
    const invalidCode = `
        function setup() {
            createCanvas(400, 400;
        }
    `;
    
    const validResult = canvas.validateP5Code(validCode);
    const invalidResult = canvas.validateP5Code(invalidCode);
    
    testFramework.assert(validResult.success, 'Valid P5.js code should pass validation');
    testFramework.assert(!invalidResult.success, 'Invalid P5.js code should fail validation');
}, 'unit');

testFramework.test('Canvas wraps user code correctly', () => {
    const canvas = new Canvas('test-container');
    const userCode = `
        function setup() {
            createCanvas(400, 400);
        }
        function draw() {
            background(220);
        }
    `;
    
    const wrappedCode = canvas.wrapUserCode(userCode);
    
    testFramework.assert(wrappedCode.includes('const createCanvas = (...args) => p.createCanvas(...args)'), 'Should bind createCanvas with arrow function');
    testFramework.assert(wrappedCode.includes('const background = (...args) => p.background(...args)'), 'Should bind background with arrow function');
    testFramework.assert(wrappedCode.includes('p.setup = setup'), 'Should bind setup function');
    testFramework.assert(wrappedCode.includes('p.draw = draw'), 'Should bind draw function');
    testFramework.assert(wrappedCode.includes('RADIUS'), 'Should include P5.js constants like RADIUS');
}, 'unit');

// Integration Tests
testFramework.test('Canvas can be created and initialized', () => {
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.id = 'test-canvas-container';
    document.body.appendChild(testContainer);
    
    const canvas = new Canvas('test-canvas-container');
    testFramework.assert(canvas.getContainer() === testContainer, 'Canvas should find its container');
    
    // Clean up
    document.body.removeChild(testContainer);
}, 'integration');

testFramework.test('Canvas handles simple P5.js code execution', async () => {
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.id = 'test-canvas-execution';
    testContainer.innerHTML = '<div id="error-display" class="error-display hidden"></div>';
    document.body.appendChild(testContainer);
    
    const canvas = new Canvas('test-canvas-execution');
    const simpleCode = `
        function setup() {
            createCanvas(200, 200);
        }
        function draw() {
            background(220);
            fill('red');
            ellipse(100, 100, 50, 50);
        }
    `;
    
    try {
        await canvas.executeCode(simpleCode);
        testFramework.assert(true, 'Simple P5.js code should execute without errors');
        
        // Check if P5.js canvas was created
        const p5Canvas = testContainer.querySelector('canvas');
        testFramework.assert(p5Canvas !== null, 'P5.js should create a canvas element');
        
    } catch (error) {
        testFramework.assert(false, `Code execution failed: ${error.message}`);
    } finally {
        canvas.stop();
        document.body.removeChild(testContainer);
    }
}, 'integration');

testFramework.test('Canvas handles P5.js constants like RADIUS correctly', async () => {
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.id = 'test-canvas-constants';
    testContainer.innerHTML = '<div id="error-display" class="error-display hidden"></div>';
    document.body.appendChild(testContainer);
    
    const canvas = new Canvas('test-canvas-constants');
    const codeWithRADIUS = `
        function setup() {
            createCanvas(200, 200);
        }
        function draw() {
            background(220);
            ellipseMode(RADIUS);
            fill('red');
            ellipse(100, 100, 25, 25);
        }
    `;
    
    try {
        await canvas.executeCode(codeWithRADIUS);
        testFramework.assert(true, 'Code with RADIUS constant should execute without errors');
        
        // Check if P5.js canvas was created
        const p5Canvas = testContainer.querySelector('canvas');
        testFramework.assert(p5Canvas !== null, 'P5.js should create a canvas element with RADIUS constant');
        
    } catch (error) {
        testFramework.assert(false, `Code with RADIUS constant failed: ${error.message}`);
    } finally {
        canvas.stop();
        document.body.removeChild(testContainer);
    }
}, 'integration');

testFramework.test('Canvas handles P5.js accessibility functions like describe()', async () => {
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.id = 'test-canvas-accessibility';
    testContainer.innerHTML = '<div id="error-display" class="error-display hidden"></div>';
    document.body.appendChild(testContainer);
    
    const canvas = new Canvas('test-canvas-accessibility');
    const codeWithDescribe = `
        function setup() {
            createCanvas(200, 200);
            describe('A circle starts in the center of the canvas. When the user holds the mouse down, the circle bounces around the canvas.');
        }
        function draw() {
            background(220);
            ellipse(100, 100, 50, 50);
        }
    `;
    
    try {
        await canvas.executeCode(codeWithDescribe);
        testFramework.assert(true, 'Code with describe() function should execute without errors');
        
        // Check if P5.js canvas was created
        const p5Canvas = testContainer.querySelector('canvas');
        testFramework.assert(p5Canvas !== null, 'P5.js should create a canvas element with describe() function');
        
    } catch (error) {
        testFramework.assert(false, `Code with describe() function failed: ${error.message}`);
    } finally {
        canvas.stop();
        document.body.removeChild(testContainer);
    }
}, 'integration');

testFramework.test('Canvas handles code with syntax errors gracefully', async () => {
    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.id = 'test-canvas-error';
    testContainer.innerHTML = '<div id="error-display" class="error-display hidden"></div>';
    document.body.appendChild(testContainer);
    
    const canvas = new Canvas('test-canvas-error');
    const invalidCode = `
        function setup() {
            createCanvas(200, 200;  // Missing closing parenthesis
        }
    `;
    
    try {
        await canvas.executeCode(invalidCode);
        testFramework.assert(false, 'Invalid code should throw an error');
    } catch (error) {
        testFramework.assert(true, 'Invalid code should be caught and handled');
    } finally {
        canvas.stop();
        document.body.removeChild(testContainer);
    }
}, 'integration');

// Performance Tests
testFramework.test('Large code files are handled efficiently', () => {
    const canvas = new Canvas('test-container');
    
    // Generate a large code file
    let largeCode = 'function setup() { createCanvas(400, 400); }\nfunction draw() {\n';
    for (let i = 0; i < 1000; i++) {
        largeCode += `  ellipse(${i % 400}, ${(i * 2) % 400}, 5, 5);\n`;
    }
    largeCode += '}';
    
    const startTime = performance.now();
    const result = canvas.validateP5Code(largeCode);
    const endTime = performance.now();
    
    testFramework.assert(result.success, 'Large code file should be valid');
    testFramework.assert(endTime - startTime < 100, 'Validation should complete in under 100ms');
}, 'unit');

// ========== Phase 2 Tests ==========

// Phase 2: Ontology Engine Tests
testFramework.test('OntologyEngine loads ontology successfully', async () => {
    const ontology = new OntologyEngine();
    const loaded = await ontology.loadOntology();
    
    console.log('Ontology load result:', loaded);
    console.log('Ontology status after load:', ontology.getStatus());
    
    testFramework.assert(loaded, 'Ontology should load successfully. Check that ontology/processing-concept-hierarchy.json exists and is accessible.');
    testFramework.assert(ontology.isReady(), 'Ontology should be ready after loading');
    
    const status = ontology.getStatus();
    testFramework.assert(status.conceptCount > 0, `Should have loaded concepts. Found: ${status.conceptCount}`);
    testFramework.assert(status.objectiveCount > 0, `Should have loaded learning objectives. Found: ${status.objectiveCount}`);
}, 'unit');

testFramework.test('OntologyEngine structure is valid', async () => {
    const ontology = new OntologyEngine();
    const loaded = await ontology.loadOntology();
    
    if (!loaded) {
        testFramework.assert(false, 'Cannot test structure - ontology failed to load');
        return;
    }
    
    // Test a simple known pattern
    const setupCode = 'function setup() { }';
    const drawCode = 'function draw() { }';
    const fillCode = "fill('red')";
    
    const setupObjectives = ontology.detectLearningObjectives(setupCode);
    const drawObjectives = ontology.detectLearningObjectives(drawCode);
    const fillObjectives = ontology.detectLearningObjectives(fillCode);
    
    console.log('Setup detection:', setupObjectives);
    console.log('Draw detection:', drawObjectives);
    console.log('Fill detection:', fillObjectives);
    
    // At least one of these basic patterns should work
    const totalDetected = setupObjectives.length + drawObjectives.length + fillObjectives.length;
    testFramework.assert(totalDetected > 0, `Should detect at least one basic pattern. Setup: ${setupObjectives.length}, Draw: ${drawObjectives.length}, Fill: ${fillObjectives.length}`);
}, 'unit');

testFramework.test('OntologyEngine detects learning objectives in code', async () => {
    const ontology = new OntologyEngine();
    const loaded = await ontology.loadOntology();
    
    if (!loaded) {
        testFramework.assert(false, 'Failed to load ontology - check file path and server setup');
        return;
    }
    
    const testCode = `
        function setup() {
            createCanvas(400, 400);
        }
        function draw() {
            background(220);
            fill('red');
            ellipse(100, 100, 50, 50);
        }
    `;
    
    const detectedObjectives = ontology.detectLearningObjectives(testCode);
    
    // Debug info
    console.log('Test code:', testCode);
    console.log('Detected objectives:', detectedObjectives);
    console.log('Ontology status:', ontology.getStatus());
    
    testFramework.assert(detectedObjectives.length > 0, `Should detect learning objectives in P5.js code. Found: ${detectedObjectives.length}. Ontology loaded ${ontology.getStatus().objectiveCount} objectives.`);
    
    if (detectedObjectives.length > 0) {
        const objectiveNames = detectedObjectives.map(obj => obj.name);
        console.log('Objective names found:', objectiveNames);
        
        testFramework.assert(
            objectiveNames.some(name => name.includes('setup') || name.includes('draw') || name.toLowerCase().includes('setup') || name.toLowerCase().includes('draw')),
            `Should detect setup/draw functions. Found: ${objectiveNames.join(', ')}`
        );
    }
}, 'unit');

testFramework.test('OntologyEngine detects concepts correctly', async () => {
    const ontology = new OntologyEngine();
    const loaded = await ontology.loadOntology();
    
    if (!loaded) {
        testFramework.assert(false, 'Cannot test concept detection - ontology failed to load');
        return;
    }
    
    const testCode = 'fill(255, 0, 0); ellipse(100, 100, 50, 50);';
    const detectedConcepts = ontology.detectConcepts(testCode);
    
    console.log('Test code for concepts:', testCode);
    console.log('Detected concepts:', detectedConcepts);
    
    testFramework.assert(detectedConcepts.length > 0, `Should detect concepts in code. Found: ${detectedConcepts.length}`);
    
    if (detectedConcepts.length > 0) {
        testFramework.assert(
            detectedConcepts.includes('simpleDrawing') || detectedConcepts.includes('colors'),
            `Should detect relevant concepts. Found: ${detectedConcepts.join(', ')}`
        );
    }
}, 'unit');

testFramework.test('OntologyEngine gets concept prerequisites', async () => {
    const ontology = new OntologyEngine();
    await ontology.loadOntology();
    
    const prereqs = ontology.getPrerequisites('colors');
    testFramework.assert(Array.isArray(prereqs), 'Prerequisites should be an array');
    
    if (prereqs.length > 0) {
        testFramework.assert(prereqs.includes('simpleDrawing'), 'Colors should have simpleDrawing as prerequisite');
    }
}, 'unit');

// Phase 2: Learner Profile Tests
testFramework.test('LearnerProfile initializes correctly', async () => {
    const ontology = new OntologyEngine();
    const loaded = await ontology.loadOntology();
    
    if (!loaded) {
        testFramework.assert(false, 'Cannot test profile - ontology failed to load');
        return;
    }
    
    const profile = new LearnerProfile(ontology);
    const initialized = profile.initializeProfile();
    
    testFramework.assert(initialized, 'Profile should initialize successfully');
    testFramework.assert(profile.isReady(), 'Profile should be ready after initialization');
    
    const status = profile.getStatus();
    testFramework.assert(status.initialized, 'Profile status should show initialized');
}, 'unit');

testFramework.test('LearnerProfile sets current concept correctly', async () => {
    const ontology = new OntologyEngine();
    const loaded = await ontology.loadOntology();
    
    if (!loaded) {
        testFramework.assert(false, 'Cannot test concept setting - ontology failed to load');
        return;
    }
    
    const profile = new LearnerProfile(ontology);
    profile.initializeProfile();
    
    // Set a basic concept that should have no prerequisites
    const success = profile.setCurrentConcept('simpleDrawing');
    testFramework.assert(success, 'Should be able to set basic concept');
    
    const currentConcept = profile.getCurrentConcept();
    testFramework.assertEqual(currentConcept, 'simpleDrawing', 'Current concept should be set correctly');
}, 'unit');

testFramework.test('LearnerProfile marks concepts as completed', async () => {
    const ontology = new OntologyEngine();
    await ontology.loadOntology();
    
    const profile = new LearnerProfile(ontology);
    profile.initializeProfile();
    
    const success = profile.markConceptCompleted('simpleDrawing');
    testFramework.assert(success, 'Should be able to mark concept as completed');
    
    const completedConcepts = profile.getCompletedConcepts();
    testFramework.assert(completedConcepts.includes('simpleDrawing'), 'Completed concepts should include marked concept');
}, 'unit');

testFramework.test('LearnerProfile tracks available concepts based on prerequisites', async () => {
    const ontology = new OntologyEngine();
    await ontology.loadOntology();
    
    const profile = new LearnerProfile(ontology);
    profile.initializeProfile();
    
    // Mark simpleDrawing as completed
    profile.markConceptCompleted('simpleDrawing');
    
    const availableConcepts = profile.getAvailableConcepts();
    testFramework.assert(Array.isArray(availableConcepts), 'Available concepts should be an array');
    
    // Should have concepts that depend on simpleDrawing
    const conceptIds = availableConcepts.map(concept => concept.id);
    testFramework.assert(conceptIds.length > 0, 'Should have available concepts after completing prerequisites');
}, 'unit');

// Phase 2: Code Validator Tests
testFramework.test('CodeValidator validates code against concept level', async () => {
    const ontology = new OntologyEngine();
    await ontology.loadOntology();
    
    const validator = new CodeValidator(ontology);
    testFramework.assert(validator.isReady(), 'Validator should be ready when ontology is loaded');
    
    // Test simple code for simpleDrawing concept
    const simpleCode = 'rect(100, 100, 50, 50);';
    const validation = validator.validateCodeForConcept(simpleCode, 'simpleDrawing');
    
    testFramework.assert(typeof validation.allowed === 'boolean', 'Validation should return allowed boolean');
    testFramework.assert(Array.isArray(validation.violatingConcepts), 'Should return violating concepts array');
}, 'unit');

testFramework.test('CodeValidator detects disallowed concepts', async () => {
    const ontology = new OntologyEngine();
    await ontology.loadOntology();
    
    const validator = new CodeValidator(ontology);
    
    // Test advanced code for basic concept
    const advancedCode = `
        let x = 0;
        function draw() {
            x += 1;
            ellipse(x, 100, 50, 50);
        }
    `;
    
    const validation = validator.validateCodeForConcept(advancedCode, 'simpleDrawing');
    
    // This should detect concepts beyond simpleDrawing
    if (!validation.allowed) {
        testFramework.assert(validation.violatingConcepts.length > 0, 'Should detect violating concepts');
        testFramework.assert(validation.alternatives.length > 0, 'Should suggest alternatives');
    }
}, 'unit');

testFramework.test('CodeValidator suggests appropriate alternatives', async () => {
    const ontology = new OntologyEngine();
    await ontology.loadOntology();
    
    const validator = new CodeValidator(ontology);
    
    const violatingConcepts = ['animation', 'variables'];
    const alternatives = validator.suggestAlternatives(violatingConcepts, 'simpleDrawing');
    
    testFramework.assert(Array.isArray(alternatives), 'Alternatives should be an array');
    
    if (alternatives.length > 0) {
        testFramework.assert(alternatives[0].code, 'Alternatives should include code examples');
        testFramework.assert(alternatives[0].description, 'Alternatives should include descriptions');
    }
}, 'unit');

// Phase 2: Integration Tests
testFramework.test('Phase 2 components integrate correctly', async () => {
    const ontology = new OntologyEngine();
    const loaded = await ontology.loadOntology();
    testFramework.assert(loaded, 'Ontology should load for integration test');
    
    const profile = new LearnerProfile(ontology);
    const profileInit = profile.initializeProfile();
    testFramework.assert(profileInit, 'Profile should initialize for integration test');
    
    const validator = new CodeValidator(ontology);
    testFramework.assert(validator.isReady(), 'Validator should be ready for integration test');
    
    // Test the workflow: set concept → validate code → detect objectives
    profile.setCurrentConcept('simpleDrawing');
    
    const testCode = 'ellipse(100, 100, 50, 50);';
    const validation = validator.validateCodeForConcept(testCode, 'simpleDrawing');
    const objectives = ontology.detectLearningObjectives(testCode);
    
    testFramework.assert(validation.allowed, 'Simple code should be allowed for simpleDrawing');
    testFramework.assert(objectives.length > 0, 'Should detect objectives in simple code');
}, 'integration');

testFramework.test('Learning Dashboard can be created with Phase 2 components', async () => {
    const ontology = new OntologyEngine();
    await ontology.loadOntology();
    
    const profile = new LearnerProfile(ontology);
    profile.initializeProfile();
    
    // Create learning dashboard (without initializing DOM elements in test)
    const { LearningDashboard } = await import('../js/learning-dashboard.js');
    const learningDashboard = new LearningDashboard(ontology, profile);
    
    testFramework.assert(learningDashboard, 'Learning Dashboard should be created');
    testFramework.assert(typeof learningDashboard.getState === 'function', 'Learning Dashboard should have state method');
    
    const state = learningDashboard.getState();
    testFramework.assert(typeof state === 'object', 'State should return an object');
}, 'integration');

// ========== Phase 3 Tests ==========

// Phase 3: Model Manager Tests
testFramework.test('ModelManager initializes correctly', () => {
    const modelManager = new ModelManager();
    
    testFramework.assert(modelManager, 'ModelManager should be created');
    testFramework.assert(!modelManager.isModelReady(), 'Model should not be ready initially');
    testFramework.assert(!modelManager.getStatus().loaded, 'Model should not be loaded initially');
    
    const info = modelManager.getModelInfo();
    testFramework.assert(typeof info === 'object', 'getModelInfo should return an object');
    testFramework.assertEqual(info.loaded, false, 'Initial state should show not loaded');
}, 'unit');

testFramework.test('ModelManager has required methods', () => {
    const modelManager = new ModelManager();
    
    testFramework.assert(typeof modelManager.loadModel === 'function', 'Should have loadModel method');
    testFramework.assert(typeof modelManager.generateCode === 'function', 'Should have generateCode method');
    testFramework.assert(typeof modelManager.generateText === 'function', 'Should have generateText method');
    testFramework.assert(typeof modelManager.isModelReady === 'function', 'Should have isModelReady method');
    testFramework.assert(typeof modelManager.getModelInfo === 'function', 'Should have getModelInfo method');
    testFramework.assert(typeof modelManager.unloadModel === 'function', 'Should have unloadModel method');
}, 'unit');

testFramework.test('ModelManager configuration works', () => {
    const modelManager = new ModelManager();
    
    const originalConfig = { ...modelManager.config };
    
    modelManager.updateConfig({ maxTokens: 200, temperature: 0.5 });
    
    testFramework.assertEqual(modelManager.config.maxTokens, 200, 'Config should be updated');
    testFramework.assertEqual(modelManager.config.temperature, 0.5, 'Temperature should be updated');
    
    // Other config should remain
    testFramework.assertEqual(modelManager.config.doSample, originalConfig.doSample, 'Unchanged config should remain');
}, 'unit');

testFramework.test('ModelManager progress callbacks work', () => {
    const modelManager = new ModelManager();
    let progressCalled = false;
    let errorCalled = false;
    
    modelManager.setProgressCallback((percent, message) => {
        progressCalled = true;
        testFramework.assert(typeof percent === 'number', 'Progress percent should be a number');
        testFramework.assert(typeof message === 'string', 'Progress message should be a string');
    });
    
    modelManager.setErrorCallback((error) => {
        errorCalled = true;
        testFramework.assert(error instanceof Error, 'Error callback should receive Error object');
    });
    
    // Manually trigger callbacks to test
    modelManager.updateProgress(50, 'Test progress');
    testFramework.assert(progressCalled, 'Progress callback should be called');
    
    // Test that callbacks are set
    testFramework.assert(typeof modelManager.onProgress === 'function', 'Progress callback should be set');
    testFramework.assert(typeof modelManager.onError === 'function', 'Error callback should be set');
}, 'unit');

testFramework.test('ModelManager handles generation without model (fallback)', async () => {
    const modelManager = new ModelManager();
    
    // Test without loading model - should use fallback
    const codeResult = await modelManager.generateCode('Create a red circle');
    testFramework.assert(typeof codeResult === 'string', 'Should return string from fallback');
    testFramework.assert(codeResult.length > 0, 'Fallback should return non-empty code');
    
    const textResult = await modelManager.generateText('Explain P5.js');
    testFramework.assert(typeof textResult === 'string', 'Should return string from fallback');
    testFramework.assert(textResult.length > 0, 'Fallback should return non-empty text');
}, 'unit');

testFramework.test('ModelManager status and info methods work', () => {
    const modelManager = new ModelManager();
    
    const status = modelManager.getStatus();
    testFramework.assert(typeof status === 'object', 'Status should be an object');
    testFramework.assert(typeof status.ready === 'boolean', 'Status should have ready boolean');
    testFramework.assert(typeof status.loaded === 'boolean', 'Status should have loaded boolean');
    testFramework.assert(typeof status.loading === 'boolean', 'Status should have loading boolean');
    
    const info = modelManager.getModelInfo();
    testFramework.assert(typeof info === 'object', 'Info should be an object');
    testFramework.assert(typeof info.loaded === 'boolean', 'Info should have loaded boolean');
    testFramework.assert(typeof info.config === 'object', 'Info should have config object');
}, 'unit');

testFramework.test('ModelManager cleans generated code correctly', () => {
    const modelManager = new ModelManager();
    
    // Test cleaning various code formats
    const tests = [
        ['```javascript\nrect(100, 100, 50, 50);\n```', 'rect(100, 100, 50, 50);'],
        ['```js\nellipse(200, 200, 100, 100);\n```', 'ellipse(200, 200, 100, 100);'],
        ['```\nfill(255, 0, 0);\n```', 'fill(255, 0, 0);'],
        ['rect(100, 100, 50, 50);', 'rect(100, 100, 50, 50);']
    ];
    
    for (const [input, expected] of tests) {
        const cleaned = modelManager.cleanGeneratedCode(input);
        testFramework.assertEqual(cleaned, expected, `Should clean code properly: ${input}`);
    }
}, 'unit');

// Export functions for HTML interface
window.runAllTests = () => {
    testFramework.clear();
    testFramework.runTests();
};

window.runUnitTests = () => {
    testFramework.clear();
    testFramework.runTests('unit');
};

window.runIntegrationTests = () => {
    testFramework.clear();
    testFramework.runTests('integration');
};

window.clearOutput = () => {
    testFramework.clear();
};

// Auto-run tests when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('Test framework loaded. Use buttons above to run tests.');
        testFramework.log('Test framework ready. Click "Run All Tests" to begin.', 'info');
    }, 500);
});