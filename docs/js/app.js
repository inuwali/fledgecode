// Main application controller for Vibe Coding Instructor

import { Editor } from './editor.js';
import { Canvas } from './canvas.js';
import { Chat } from './chat.js';
import { OntologyEngine } from './ontology.js';
import { LearnerProfile } from './learner.js';
import { CodeValidator } from './validation.js';
import { LearningDashboard } from './learning-dashboard.js';
import { ModelManager } from './llm/model-manager.js';
import { CodeHistory } from './history/code-history.js';
import { UndoManager } from './history/undo-manager.js';
import { SessionStorage } from './history/session-storage.js';
import { ImportExport } from './utils/import-export.js';
import { debounce } from './utils.js';
import { globalErrorHandler } from './error-handler.js';
import { APISettingsUI } from './api-settings-ui.js';
import { WelcomeUI } from './welcome-ui.js';
import { DiffManager } from './diff-manager.js';

class App {
    constructor() {
        this.editor = null;
        this.canvas = null;
        this.chat = null;
        
        // Phase 2 components
        this.ontologyEngine = null;
        this.learnerProfile = null;
        this.codeValidator = null;
        this.learningDashboard = null;
        
        // Phase 3 components
        this.modelManager = null;
        
        // Phase 4 components
        this.codeHistory = null;
        this.undoManager = null;
        this.sessionStorage = null;
        this.importExport = null;
        
        // Phase 5 components
        this.apiSettingsUI = null;
        this.welcomeUI = null;

        // Phase 6 components
        this.diffManager = null;

        // Developer UI
        this.lastPrompt = null;
        this.lastSystemPrompt = null;
        this.lastPromptTimestamp = null;
        this.lastResponse = null;
        this.lastResponseTimestamp = null;
        this.lastModelInfo = null; // { provider, model }
        // Explanation generation tracking (Tier 2 models)
        this.lastExplanationsPrompt = null;
        this.lastExplanationsResponse = null;
        // Raw response tracking (for debugging)
        this.lastRawResponse = null; // Tier 1: code with [EXPLAIN], Tier 2: clean code
        this.consoleLog = [];
        
        // Error handling
        this.errorHandler = globalErrorHandler;
        
        this.isInitialized = false;
        this.autoRun = true; // Auto-run code on changes
        this.sessionRecovered = false; // Track if session was recovered
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing Vibe Coding Instructor...');

            // Phase 6: Diff library loaded via ES module import in DiffManager

            // Initialize components
            await this.initializeComponents();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize developer UI
            this.setupDeveloperUI();
            
            // Phase 4: Check for session recovery
            await this.checkSessionRecovery();
            
            // Run initial code (unless recovered from session)
            if (this.editor && this.canvas && !this.sessionRecovered) {
                this.errorHandler.setAutoRunning(true);
                await this.runCode();
                this.errorHandler.setAutoRunning(false);
            }
            
            this.isInitialized = true;
            this.errorHandler.setInitializing(false);
            console.log('Application initialized successfully');
            
            // Update LLM interaction area based on API availability
            this.updateLLMInteractionArea();
            
            // Show first-time user guidance if needed
            this.showFirstTimeUserGuidance();
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.errorHandler.handleError('initialization_failure', error, {
                phase: 'app_init',
                components: this.getInitializationStatus()
            });
            console.error('Init Error - App running in safe mode');
            
            // Try to initialize in safe mode with basic functionality
            try {
                await this.initializeSafeMode();
                console.log('Safe Mode Active');
            } catch (safeModeError) {
                console.error('Safe mode initialization failed:', safeModeError);
            }
        }
    }

    /**
     * Initialize all application components
     */
    async initializeComponents() {
        console.log('Initializing Phase 2 components...');
        
        // Phase 2: Initialize ontology engine first
        this.ontologyEngine = new OntologyEngine();
        const ontologyLoaded = await this.ontologyEngine.loadOntology();
        
        if (!ontologyLoaded) {
            console.warn('Ontology failed to load - Phase 2 features disabled');
            // Fall back to Phase 1 behavior
            await this.initializePhase1Components();
            return;
        }

        // Initialize learner profile
        this.learnerProfile = new LearnerProfile(this.ontologyEngine);
        const profileInitialized = this.learnerProfile.initializeProfile();
        
        if (!profileInitialized) {
            console.warn('Learner profile failed to initialize');
        }

        // Initialize code validator for internal use
        this.codeValidator = new CodeValidator(this.ontologyEngine);

        // Initialize enhanced learning dashboard
        this.learningDashboard = new LearningDashboard(this.ontologyEngine, this.learnerProfile);

        // Initialize Phase 1 components
        await this.initializePhase1Components();

        // Initialize learning dashboard after other components are ready
        if (this.learningDashboard) {
            this.learningDashboard.init();
        }
        
        // Phase 3.5: Initialize analytics after all systems are ready
        this.initializeAnalytics();

        // Phase 3: Initialize model manager
        this.modelManager = new ModelManager();
        console.log('Model manager initialized');

        // Phase 4: Initialize session storage first
        this.sessionStorage = new SessionStorage();
        if (this.sessionStorage.init()) {
            console.log('Session storage initialized');
        } else {
            console.warn('Session storage failed to initialize');
        }

        // Phase 4: Initialize code history
        this.codeHistory = new CodeHistory();
        if (this.codeHistory.init()) {
            console.log('Code history initialized');
            
            // Initialize undo manager after code history is ready
            this.undoManager = new UndoManager(this.codeHistory);
            if (this.undoManager.init()) {
                console.log('Undo manager initialized');
            } else {
                console.warn('Undo manager failed to initialize');
            }
        } else {
            console.warn('Code history failed to initialize');
        }

        // Phase 4: Initialize import/export system
        try {
            this.importExport = new ImportExport();
            if (this.importExport.init()) {
                console.log('✅ Import/Export system initialized successfully');
            } else {
                console.warn('⚠️ Import/Export system failed to initialize');
            }
        } catch (error) {
            console.error('❌ Failed to load ImportExport class:', error);
            this.importExport = null;
        }

        // Phase 5: Initialize API settings UI
        try {
            this.apiSettingsUI = new APISettingsUI();
            if (this.apiSettingsUI.init()) {
                console.log('✅ API Settings UI initialized successfully');
                // Make it globally available for HTML onclick handlers
                window.apiSettingsUI = this.apiSettingsUI;
            } else {
                console.warn('⚠️ API Settings UI failed to initialize');
            }
        } catch (error) {
            console.error('❌ Failed to load API Settings UI:', error);
            this.apiSettingsUI = null;
        }

        // Phase 5: Initialize Welcome UI
        try {
            this.welcomeUI = new WelcomeUI();
            if (this.welcomeUI.init()) {
                console.log('✅ Welcome UI initialized successfully');
                // Make it globally available for HTML onclick handlers
                window.welcomeUI = this.welcomeUI;
            } else {
                console.warn('⚠️ Welcome UI failed to initialize');
            }
        } catch (error) {
            console.error('❌ Failed to load Welcome UI:', error);
            this.welcomeUI = null;
        }

        // Phase 5: Connect ModelManager with APIKeyManager now that APISettingsUI is initialized
        if (this.modelManager && this.apiSettingsUI && this.apiSettingsUI.isReady()) {
            const apiKeyManager = this.apiSettingsUI.getAPIKeyManager();
            if (apiKeyManager) {
                this.modelManager.setAPIKeyManager(apiKeyManager);
                console.log('✅ ModelManager connected to APIKeyManager');
            }
        }

        // Phase 6: Initialize DiffManager after editor is ready
        if (this.editor && this.editor.editor) {
            this.diffManager = new DiffManager(this.editor.editor);
            if (this.diffManager.init()) {
                console.log('✅ DiffManager initialized successfully');
            } else {
                console.warn('⚠️ DiffManager failed to initialize');
            }
        }
    }

    /**
     * Phase 3.5: Initialize analytics enhancement (optional, dynamic import)
     */
    async initializeAnalytics() {
        try {
            // Only load progress tracking if not blocked by content blockers
            const analyticsModule = await import('./progress/learning-analytics.js');
            const trackerModule = await import('./progress/progress-tracker.js');
            
            // Initialize analytics
            this.learningAnalytics = new analyticsModule.LearningAnalytics();
            this.learningAnalytics.init();
            
            // Initialize progress tracker
            this.progressTracker = new trackerModule.ProgressTracker(this.learningAnalytics, this.ontologyEngine);
            this.progressTracker.init();
            
            // Enhance the learning dashboard with analytics
            this.learningDashboard.analytics = this.learningAnalytics;
            this.learningDashboard.progressTracker = this.progressTracker;
            
            // Update progress metrics now that tracking is available
            if (this.learningDashboard.isReady()) {
                this.learningDashboard.updateProgressMetrics();
            }
            
            console.log('📊 Progress tracking loaded successfully');
        } catch (error) {
            console.log('📊 Progress tracking not available - continuing without progress bars');
        }
    }

    /**
     * Phase 4: Check for session recovery and auto-restore
     */
    async checkSessionRecovery() {
        if (!this.sessionStorage || !this.sessionStorage.isReady()) {
            return;
        }

        try {
            if (this.sessionStorage.hasValidSession()) {
                const recoveryInfo = this.sessionStorage.getRecoveryInfo();
                
                if (recoveryInfo && recoveryInfo.hasCode) {
                    // Auto-restore the session
                    await this.restoreSession();
                    this.sessionRecovered = true;
                    
                    // Show notification banner
                    this.showSessionRestoreNotification();
                    
                    console.log('🔄 Session auto-restored successfully');
                } else {
                    // Session exists but no meaningful code, just clear it
                    this.sessionStorage.clearSession();
                }
            }
        } catch (error) {
            console.error('Session recovery failed:', error);
            this.sessionStorage.clearSession();
        }
    }

    /**
     * Initialize Phase 1 components (backward compatibility)
     */
    async initializePhase1Components() {
        // Initialize canvas
        this.canvas = new Canvas('canvas-container');

        // Initialize editor with enhanced auto-run callback
        const debouncedRunCode = debounce(() => {
            if (this.autoRun && this.canvas) {
                this.runCode();
            }
        }, 800); // Wait 800ms after user stops typing

        this.editor = new Editor('editor', debouncedRunCode);
        await this.editor.init();

        // Chat is replaced by learning dashboard in Phase 3
    }

    /**
     * Set up event listeners for UI interactions
     */
    setupEventListeners() {
        // Run button
        const runBtn = document.getElementById('run-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => {
                this.runCode();
            });
        }

        // Format code button
        const formatBtn = document.getElementById('format-code-btn');
        if (formatBtn) {
            formatBtn.addEventListener('click', () => {
                this.formatCode();
            });
        }

        // Phase 4: Undo/Redo buttons
        const undoBtn = document.getElementById('undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                if (this.undoManager && this.undoManager.isReady()) {
                    this.undoManager.performUndo();
                }
            });
        }

        const redoBtn = document.getElementById('redo-btn');
        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                if (this.undoManager && this.undoManager.isReady()) {
                    this.undoManager.performRedo();
                }
            });
        }

        // LLM interface event listeners are handled by updateLLMInteractionArea()
        // This ensures they work properly when the interface is dynamically updated

        // Suggestion tags (if any exist)
        const suggestionTags = document.querySelectorAll('.suggestion-tag');
        suggestionTags.forEach(tag => {
            tag.addEventListener('click', () => {
                const suggestion = tag.getAttribute('data-suggestion');
                this.fillUserInput(suggestion);
            });
        });

        // Phase 4: Save/Load buttons
        const saveBtn = document.getElementById('save-code-btn');
        if (saveBtn) {
            console.log('✅ Save button found, adding event listener');
            saveBtn.addEventListener('click', (event) => {
                console.log('💾 Save button clicked');
                
                // If Alt/Option key is held, directly export code
                if (event.altKey) {
                    console.log('🚀 Alt+Click detected, directly exporting code');
                    this.exportCode();
                } else {
                    this.toggleSaveOptions();
                }
            });
        } else {
            console.error('❌ Save button not found in DOM');
        }

        const loadBtn = document.getElementById('load-code-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                this.openFileSelector();
            });
        }

        // Save options dropdown
        const saveCodeOnlyBtn = document.getElementById('save-code-only');
        if (saveCodeOnlyBtn) {
            saveCodeOnlyBtn.addEventListener('click', () => {
                this.exportCode();
                this.hideSaveOptions();
            });
        }

        const saveFullProjectBtn = document.getElementById('save-full-project');
        if (saveFullProjectBtn) {
            saveFullProjectBtn.addEventListener('click', () => {
                this.exportProject();
                this.hideSaveOptions();
            });
        }

        const copyShareLinkBtn = document.getElementById('copy-share-link');
        if (copyShareLinkBtn) {
            copyShareLinkBtn.addEventListener('click', () => {
                this.copyShareLink();
                this.hideSaveOptions();
            });
        }

        // File input
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (event) => {
                this.handleFileImport(event);
            });
        }

        // Click outside to close save options
        document.addEventListener('click', (event) => {
            const saveOptions = document.getElementById('save-options');
            const saveBtn = document.getElementById('save-code-btn');
            
            if (saveOptions && !saveOptions.contains(event.target) && event.target !== saveBtn) {
                this.hideSaveOptions();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + Enter to run code
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                this.errorHandler.markCodeExecution();
                this.runCode();
            }
            
            // Ctrl/Cmd + S to save
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                this.saveCodeWithDialog();
            }

            // Phase 4: Undo/Redo keyboard shortcuts
            if (this.undoManager && this.undoManager.isReady()) {
                if (this.undoManager.handleKeyboardShortcut(event)) {
                    return; // Event was handled by undo manager
                }
            }

            // Ctrl + ` to toggle developer UI
            if (event.ctrlKey && event.key === '`') {
                event.preventDefault();
                this.toggleDeveloperUI();
            }
        });

        // Window resize handler
        window.addEventListener('resize', debounce(() => {
            if (this.editor) {
                this.editor.resize();
            }
        }, 250));

        // Handle visibility change (pause/resume when tab is hidden/visible)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pause execution when tab is hidden
                if (this.canvas && this.canvas.isExecuting()) {
                    console.log('Tab hidden, pausing execution');
                }
            } else {
                // Resume when tab becomes visible
                console.log('Tab visible');
            }
        });
    }

    /**
     * Run the current code in the editor
     */
    async runCode() {
        if (!this.editor || !this.canvas) {
            console.error('Editor or canvas not initialized');
            return;
        }

        try {
            const code = this.editor.getCode();
            if (!code.trim()) {
                console.log('No code to run');
                return;
            }

            console.log('Running code...');
            
            // Mark that we're about to execute user code
            this.errorHandler.markCodeExecution();
            
            // Phase 4: Capture code state before execution
            this.captureCodeState(code, 'run', 'manual');
            
            // Execute code in canvas
            await this.canvas.executeCode(code);
            
            // Notify learning dashboard if available
            if (this.learningDashboard && this.learningDashboard.isReady()) {
                this.learningDashboard.onCodeExecuted(code);
            }
            
        } catch (error) {
            console.error('Error running code:', error);
        }
    }

    /**
     * Stop current code execution
     */
    stopCode() {
        if (this.canvas) {
            this.canvas.stop();
        }
    }

    /**
     * Phase 4: Capture current code state to history
     * @param {string} code - Code content
     * @param {string} userAction - Action that triggered this ("run", "edit", "generate", "format")
     * @param {string} changeType - Type of change ("manual", "ai_generated", "format")
     */
    captureCodeState(code, userAction = 'edit', changeType = 'manual') {
        if (!this.codeHistory || !this.codeHistory.isReady()) {
            return;
        }

        // Get current learning context
        const context = {
            conceptId: this.learnerProfile?.getCurrentConcept() || 'unknown',
            sessionId: this.learningAnalytics?.data?.sessionId || 'unknown',
            hasErrors: false // TODO: Integrate with error detection in future
        };

        const entry = this.codeHistory.captureState(code, userAction, changeType, context);
        
        // Notify undo manager of new state
        if (entry && this.undoManager && this.undoManager.isReady()) {
            this.undoManager.pushState(entry);
            this.undoManager.updateUndoRedoButtons();
        }
        
        // Phase 4: Auto-save session
        if (this.sessionStorage && this.sessionStorage.isReady()) {
            this.sessionStorage.autoSave(code, {
                currentConcept: context.conceptId,
                codeHistory: this.codeHistory?.getHistoryTimeline(20) // Keep recent 20 entries
            });
        }
        
        return entry;
    }

    /**
     * Generate ontology synopsis for LLM prompts
     * @returns {string} Formatted learning constraints
     */
    generateLearningConstraints() {
        if (!this.learnerProfile?.isReady() || !this.ontologyEngine?.isReady()) {
            return "No learning constraints available - generate any appropriate P5.js code.";
        }

        const currentConceptId = this.learnerProfile.getCurrentConcept();
        const completedConcepts = this.learnerProfile.getCompletedConcepts();
        
        if (!currentConceptId) {
            return "No current learning focus - generate any appropriate P5.js code.";
        }

        const currentConcept = this.ontologyEngine.getConceptById(currentConceptId);
        const learningObjectives = this.ontologyEngine.getLearningObjectives(currentConceptId);
        
        if (!currentConcept) {
            return "No learning constraints available - generate any appropriate P5.js code.";
        }

        let constraints = `## LEARNING CONSTRAINTS - STRICT REQUIREMENTS

**Current Learning Focus:** ${currentConcept.name}
*${currentConcept.description}*

**Mastered Concepts:** `;
        
        if (completedConcepts.length > 0) {
            const masteredNames = completedConcepts
                .map(id => this.ontologyEngine.getConceptById(id)?.name)
                .filter(name => name)
                .join(', ');
            constraints += masteredNames;
        } else {
            constraints += "None yet - this is a beginner learner";
        }

        constraints += `

**ALLOWED P5.js Functions for Current Level:**
`;
        
        if (learningObjectives && learningObjectives.length > 0) {
            learningObjectives.forEach(objective => {
                if (objective.code) {
                    constraints += `- ${objective.name}: \`${objective.code}\`\n`;
                } else {
                    constraints += `- ${objective.name}\n`;
                }
            });
        } else {
            constraints += "- Basic P5.js functions only\n";
        }

        constraints += `
**CRITICAL RESTRICTIONS:**
- ONLY use the functions and concepts listed above
- Stay within the learner's current skill level (${currentConcept.name})
- Any code using advanced concepts beyond this level will be REJECTED
- Keep examples simple and focused on current learning objectives`;

        return constraints;
    }

    /**
     * Build the system prompt
     * @returns {string} Complete prompt for LLM
     */
    buildSystemPrompt() {
        const learningConstraints = this.generateLearningConstraints();

        // Check if model supports inline explanations
        const supportsInlineExplanations = this.modelManager.supportsInlineExplanations();

        // Build base prompt (common to all models)
        let prompt = `You are a P5.js coding instructor. Generate complete, working P5.js code that respects the learner's current skill level.

${learningConstraints}

You will receive the learner's current code, followed by instructions for requested modifications.

DETAILED INSTRUCTIONS:
- ALWAYS generate a complete P5.js sketch with setup() and draw() functions
- STRICTLY follow the learning constraints above
- ALWAYS strive to make the miniumum changes required to fulfill the prompt
- NEVER remove regular comments if they're still valid
- If a regular comment can remain viable with small changes, make those changes rather than deleting it
- When considering what considers a "minimum change," remember to keep working code, even if it's not an efficient implementation
- Respect whitespace in the learner's code; do not remove it
- Infer context based on the current state of the code, including comments
- Make the code functional and ready to run
- Keep it simple and educational for current skill level
- Return ONLY the code, no explanations or markdown, no preamble such as "here's the updated code"
- Ensure proper P5.js syntax and conventions`;

        // Add educational comments section only for powerful models (Tier 1)
        if (supportsInlineExplanations) {
            prompt += `

EDUCATIONAL COMMENTS:
When modifying code, include two types of comments:
1. Regular code comments describing what the code does (continue as normal)
2. Educational [EXPLAIN] comments to describe HOW the code accomplishes the user's request:
   // [EXPLAIN] Brief explanation of this change

Guidelines for [EXPLAIN] comments:
- Keep them concise (1-2 sentences)
- Place the comment on the line immediately before the change
- Focus on the technical behavior - describe what the code does to accomplish the request
- Use simple language suitable for beginners
- DO NOT say "to fulfill the user's request" or justify why the change was made
- They supplement, but DO NOT REPLACE, accompanying code comments

Guidelines for preserving existing comments:
- ALWAYS preserve existing regular comments unless they become factually incorrect
- If a comment mentions specific values that you're changing (e.g., "yellow square" when changing to white, "large circle" when changing to rectangle), update it
- If a comment is generic and still accurate (e.g., "Draw a square in the center"), keep it unchanged
- When in doubt, KEEP the existing comment

Example 1 - Simple color change:
> CURRENT CODE:
> function draw() {
>   background('lightgreen');
> }
>
> YOUR TASK: Make the background orange.
>
> Generated code:
> function draw() {
>   // [EXPLAIN] Sets the background to orange using a named CSS color.
>   background('orange');
> }

Example 2 - Adding a shape:
> CURRENT CODE:
> function draw() {
>   background(220);
> }
>
> YOUR TASK: Add a red circle in the center.
>
> Generated code:
> function draw() {
>   background(220);
>   
>   // Draw a red circle at the center of the canvas
>   fill('red');
>   // [EXPLAIN] Draws a red circle at the canvas center (X=200, Y=200) with a 50-pixel diameter.
>   circle(200, 200, 50);
> }

Example 3 - Creating animation variable:
> CURRENT CODE:
> function setup() {
>   createCanvas(400, 400);
> }
>
> YOUR TASK: Make the circle size change over time.
>
> Generated code:
> // [EXPLAIN] Creates a variable, circleSize, to track the circle's size. This variable can be updated each frame to create animation.
> let circleSize = 0;
>
> function setup() {
>   createCanvas(400, 400);
> }

Example 4 - Adding logic:
> CURRENT CODE:
> x = x + 2;
> circle(x, 200, 30);
>
> YOUR TASK: Make the circle bounce when it hits the edge.
>
> Generated code:
> // [EXPLAIN] Moves the circle using a speed variable that can be positive or negative. When the circle reaches either edge, the speed is multiplied by -1 to reverse direction.
> // If the square is at the left or right edge, change its speed
> if (x > width || x < 0) {
>   speed = speed * -1;
> }
> 
> x = x + speed;
> circle(x, 200, 30);
`;
        }

        prompt += '\n';

        this.lastSystemPrompt = prompt;

        return prompt;
    }
    
    /**
     * Build prompt template with current code context and learning constraints
     * @param {string} userRequest - User's request for code modification
     * @param {string} currentCode - Current code in editor
     * @param {Object} enhancedContext - Enhanced context from existing systems
     * @returns {string} Complete prompt for LLM
     */
    buildPrompt(userRequest, currentCode, enhancedContext = null) {
        let prompt = "";

        // Add context section if available
        if (enhancedContext?.recentUserGoals?.length > 0 || enhancedContext?.recentCodeChanges?.length > 0) {
            prompt += `

CONTEXT:`;

            if (enhancedContext?.recentUserGoals?.length > 0) {
                prompt += `

SESSION FOCUS: ${enhancedContext.recentUserGoals.join(' → ')}`;
            }

            if (enhancedContext?.recentCodeChanges?.length > 0) {
                prompt += `

RECENT REVISIONS:`;
                
                enhancedContext.recentCodeChanges.forEach((change, index) => {
                    prompt += `

--- REVISION ${index + 1} (${this.formatTimestamp(change.when)}) ---
${change.code}`;
                });
            }
            
            prompt += "\n";
        }

        prompt += `
CURRENT CODE:
\`\`\`
${currentCode || '// No existing code'}
\`\`\``;
        
        prompt += `

YOUR TASK:
${userRequest}

REMEMBER the DETAILED INSTRUCTIONS you have been given.

Generated code:`;

        // Store for developer UI
        this.lastPrompt = prompt;
        this.lastPromptTimestamp = new Date();
        this.updateDeveloperPromptDisplay();

        return prompt;
    }

    /**
     * Gather enhanced context from existing systems for LLM prompts
     * @param {string} currentUserRequest - Current user request
     * @returns {Object} Enhanced context data
     */
    gatherLLMContext(currentUserRequest) {
        const context = {
            recentUserGoals: [],
            recentCodeChanges: [],
            sessionDuration: 0
        };

        // From LearningAnalytics (recent user requests/goals)
        if (this.learningAnalytics) {
            context.recentUserGoals = this.learningAnalytics.getRecentUserGoals?.(3) || [];
            context.sessionDuration = this.learningAnalytics.getSessionDuration?.() || 0;
            console.log('📋 Recent user goals for context:', context.recentUserGoals);
        } else {
            console.warn('⚠️ LearningAnalytics not available for gathering context');
        }

        // From CodeHistory (complete code from recent revisions)
        if (this.codeHistory?.isReady()) {
            const recentEntries = this.codeHistory.getHistoryTimeline?.(4) || [];
            const aiGeneratedEntries = recentEntries
                .filter(entry => entry.changeType === 'ai_generated')
                .slice(-2); // Keep only last 2 AI changes

            context.recentCodeChanges = aiGeneratedEntries.map(entry => ({
                code: entry.code,
                when: entry.timestamp
            }));
        }

        return context;
    }


    /**
     * Track user intent in analytics (parallel to code generation)
     * @param {string} userRequest - User's request text
     */
    trackUserIntent(userRequest) {
        if (this.learningAnalytics) {
            console.log('🎯 Recording user goal:', userRequest);
            this.learningAnalytics.recordUserGoal?.(userRequest);
        } else {
            console.warn('⚠️ LearningAnalytics not available for tracking user intent');
        }
    }

    /**
     * Format timestamp for display in prompts
     * @param {string|Date} timestamp - Timestamp to format
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return 'recently';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMinutes = Math.round((now - date) / (1000 * 60));
        
        if (diffMinutes < 1) return 'just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        
        const diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        return date.toLocaleDateString();
    }

    /**
     * Generate code from user input with current code context
     */
    async generateCodeFromInput() {
        if (!this.modelManager) {
            console.error('Model manager not initialized');
            return;
        }

        if (!this.editor) {
            console.error('Editor not initialized');
            return;
        }

        const userInput = document.getElementById('user-request-input');
        const userRequest = userInput?.value?.trim();

        if (!userRequest) {
            console.log('No user request entered');
            userInput?.focus();
            return;
        }

        try {
            // Show which API mode we're using
            const hasUserKey = this.modelManager.hasUserAPIKey();
            const provider = this.modelManager.getCurrentProvider();
            const statusText = hasUserKey ? 
                `Generating with your ${provider} key...` : 
                'Generating with default API...';
            
            console.log(statusText);
            
            // Disable buttons during generation
            const generateBtn = document.getElementById('generate-from-input-btn');
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = '⏳ Generating...';
            }

            // Format current code before sending to LLM (ensures clean diffs)
            await this.editor.formatCode();

            // Get current code from editor (now formatted)
            const currentCode = this.editor.getCode();

            // Track user intent FIRST so it appears in context
            this.trackUserIntent(userRequest);

            // Then gather enhanced context from existing systems
            const enhancedContext = this.gatherLLMContext(userRequest);

            // Build enhanced prompts with context
            const systemPrompt = this.buildSystemPrompt();
            const prompt = this.buildPrompt(userRequest, currentCode, enhancedContext);
            
            console.log(`Sending enhanced contextual prompt to ${provider}:`, prompt);
            
            // Phase 5: Generate with validation retry loop
            const { code: generatedCode, success, attempts } = await this.generateWithValidation(
                prompt, systemPrompt, userRequest, { maxTokens: 300, temperature: 0.7 }
            );

            console.log(`Generated code after ${attempts} attempt(s):`, generatedCode);

            // Capture the raw LLM response for developer UI (before any processing)
            this.lastRawResponse = generatedCode; // Store raw response with [EXPLAIN] comments
            this.lastResponseTimestamp = new Date();
            this.lastModelInfo = this.modelManager.getModelInfo();
            // Don't update developer display yet - wait until after diff processing

            if (!success) {
                // CRITICAL: Don't update editor with invalid code
                // Rationale: Invalid code breaks the entire validation system going forward.
                // Every subsequent generation inherits constraint violations, creating a
                // cascade of validation failures and retry costs. Better to keep learners
                // working within their current capabilities.
                // Future enhancement: Track deferred ideas and suggest revisiting when
                // learners have acquired the necessary concepts.
                this.handleValidationFailure(userRequest, generatedCode);
                return; // Exit early - don't update editor or capture state
            }

            // Phase 6: Clear previous diff decorations before applying new ones
            if (this.diffManager && this.diffManager.isReady()) {
                this.diffManager.clearDecorations();
            }

            // Phase 6: Apply code with diff visualization (if available)
            let cleanedCode = generatedCode;
            if (this.diffManager && this.diffManager.isReady()) {
                const oldCode = currentCode;

                // Apply with diff, passing format callback so diff is calculated on formatted code
                await this.diffManager.applyCodeWithDiff(
                    oldCode,
                    generatedCode,
                    async () => await this.editor.formatCode()
                );

                // Get the final formatted code from editor for history
                cleanedCode = this.editor.getCode();

                // Store the cleaned code as the final response (for Code sub-tab)
                this.lastResponse = cleanedCode;

                // Check if we need two-pass explanation generation (Tier 2 models)
                if (!this.modelManager.supportsInlineExplanations()) {
                    console.log('🔄 Using two-pass explanation generation for weaker model');

                    // Get all diff blocks from the diff manager
                    const diffBlocks = this.diffManager.diffChunks;

                    if (diffBlocks && diffBlocks.length > 0) {
                        // Filter to only code blocks (not comment-only) for explanation generation
                        const codeBlocks = diffBlocks.filter(chunk => !chunk.isCommentOnly);

                        console.log(`📊 Filtered ${diffBlocks.length - codeBlocks.length} comment-only chunks (${codeBlocks.length} remaining)`);

                        if (codeBlocks.length > 0) {
                            // Generate explanations in second pass
                            const result = await this.modelManager.generateExplanationsForDiff(
                                oldCode,
                                cleanedCode,
                                userRequest,
                                codeBlocks
                            );

                            // Store explanations prompt and response for developer UI
                            this.lastExplanationsPrompt = result.prompt;
                            this.lastExplanationsResponse = result.response;

                            // Map explanations back to original chunk indices
                            if (result.explanations && result.explanations.length > 0) {
                                const mappedExplanations = result.explanations.map(exp => ({
                                    blockIndex: diffBlocks.indexOf(codeBlocks[exp.blockIndex]),
                                    explanation: exp.explanation
                                }));

                                this.diffManager.addExplanationsToExistingDiff(mappedExplanations);
                            }
                        }
                    }
                } else {
                    // Tier 1: Store raw response with [EXPLAIN] for Explanations sub-tab
                    // (lastRawResponse already contains this)
                }

                // Update developer UI display
                this.updateDeveloperResponseDisplay();
            } else {
                // Fallback: Apply code normally without diffs
                await this.editor.setCodeAndFormat(generatedCode);
            }

            // Phase 4: Capture AI-generated code state (cleaned code without [EXPLAIN] comments)
            this.captureCodeState(cleanedCode, 'generate', 'ai_generated');

            // Auto-run the generated code
            if (this.autoRun) {
                this.errorHandler.setAutoRunning(true);
                await this.runCode();
                this.errorHandler.setAutoRunning(false);
            }

            const successText = hasUserKey ? 
                `Code generated with your ${provider} key!` : 
                'Code generated from request!';
            console.log(successText);

        } catch (error) {
            console.error('Code generation from input failed:', error);
            
            // Handle API key failures gracefully
            const hasUserKey = this.modelManager.hasUserAPIKey();
            if (hasUserKey && error.message.includes('API request failed')) {
                console.error('API key error - check settings');
                this.suggestAPIKeySetup('Your API key may be invalid or expired. Please check your API settings.');
            } else {
                console.error('Generation failed');
            }
        } finally {
            // Re-enable the generate button
            const generateBtn = document.getElementById('generate-from-input-btn');
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent = '✨ Generate Code';
            }
        }
    }

    /**
     * Clear user input field
     */
    clearUserInput() {
        const userInput = document.getElementById('user-request-input');
        if (userInput) {
            userInput.value = '';
            userInput.focus();
        }
    }

    /**
     * Fill user input with suggestion
     * @param {string} suggestion - Suggestion text to fill
     */
    fillUserInput(suggestion) {
        const userInput = document.getElementById('user-request-input');
        if (userInput) {
            userInput.value = suggestion;
            userInput.focus();
            // Move cursor to end
            userInput.setSelectionRange(suggestion.length, suggestion.length);
        }
    }

    /**
     * Format current code in editor
     */
    async formatCode() {
        if (!this.editor) {
            console.error('Editor not initialized');
            return;
        }

        try {
            await this.editor.formatCode();
            
            // Phase 4: Capture formatted code state
            const formattedCode = this.editor.getCode();
            this.captureCodeState(formattedCode, 'format', 'format');
            
            console.log('Code formatted');
        } catch (error) {
            console.error('Code formatting failed:', error);
        }
    }

    /**
     * Get current code from editor
     * @returns {string} Current code
     */
    getCurrentCode() {
        return this.editor ? this.editor.getCode() : '';
    }

    /**
     * Set code in editor
     * @param {string} code - Code to set
     */
    setCode(code) {
        if (this.editor) {
            this.editor.setCode(code);
        }
    }

    /**
     * Toggle auto-run mode
     * @param {boolean} enabled - Whether to enable auto-run
     */
    setAutoRun(enabled) {
        this.autoRun = enabled;
        console.log(`Auto-run ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Validate LLM-generated code against current concept (Phase 3 ready)
     * @param {string} code - Code to validate
     * @returns {Object} Validation result
     */
    validateLLMCode(code) {
        if (!this.codeValidator || !this.learnerProfile) {
            return { allowed: true, message: 'Validation not available' };
        }

        const currentConcept = this.learnerProfile.getCurrentConcept();
        if (!currentConcept) {
            return { allowed: true, message: 'No current concept set' };
        }

        return this.codeValidator.validateCodeForConcept(code, currentConcept);
    }

    /**
     * Get validation rules for LLM prompting (Phase 3 ready)
     * @returns {Object} Validation rules and guidelines
     */
    getValidationRules() {
        if (!this.codeValidator || !this.learnerProfile) {
            return {};
        }

        const currentConcept = this.learnerProfile.getCurrentConcept();
        if (!currentConcept) {
            return {};
        }

        return this.codeValidator.getValidationRules(currentConcept);
    }

    /**
     * Generate code with validation retry loop
     * @param {string} prompt - User prompt
     * @param {string} systemPrompt - System prompt
     * @param {string} userRequest - Original user request
     * @param {Object} options - Generation options
     * @returns {Object} Generation result with validation info
     */
    async generateWithValidation(prompt, systemPrompt, userRequest, options = {}) {
        const maxRetries = 3;
        let attempts = 0;
        let lastCode = null;
        let lastValidation = null;
        let failedAttempts = []; // Track all failed attempts

        while (attempts < maxRetries) {
            attempts++;
            console.log(`Generation attempt ${attempts}/${maxRetries}`);

            try {
                // Generate code
                const generatedCode = await this.modelManager.generateCode(prompt, systemPrompt, options);
                lastCode = generatedCode;

                // Validate the generated code
                const validation = this.validateLLMCode(generatedCode);
                lastValidation = validation;

                if (validation.allowed) {
                    console.log(`✅ Valid code generated on attempt ${attempts}`);
                    return { code: generatedCode, success: true, attempts };
                }

                // Code failed validation - track the failure
                console.log(`❌ Validation failed on attempt ${attempts}. Violating concepts detected:`, validation.violatingConcepts);
                failedAttempts.push({
                    code: generatedCode,
                    validation: validation,
                    attempt: attempts
                });
                
                if (attempts < maxRetries) {
                    // Add validation failure context to prompt for retry
                    const retryContext = this.buildRetryPrompt(validation, userRequest, failedAttempts);
                    prompt = retryContext;
                    console.log('Retrying with validation guidance and failed code examples...');
                }

            } catch (error) {
                console.error(`Generation attempt ${attempts} failed:`, error);
                if (attempts === maxRetries) {
                    throw error; // Re-throw on final attempt
                }
            }
        }

        // All attempts failed validation
        console.warn(`Code generation failed validation after ${maxRetries} attempts`);
        return { code: lastCode, success: false, attempts, lastValidation };
    }

    /**
     * Build retry prompt with validation guidance
     * @param {Object} validation - Previous validation result
     * @param {string} userRequest - Original user request
     * @param {Array} failedAttempts - All previous failed attempts
     * @returns {string} Enhanced prompt for retry
     */
    buildRetryPrompt(validation, userRequest, failedAttempts) {
        const currentConcept = this.learnerProfile?.getCurrentConcept();
        const conceptName = currentConcept ? 
            this.ontologyEngine?.getConceptById(currentConcept)?.name : 'current level';

        let retryPrompt = `Previous code generations have used concepts too advanced for the learner's ${conceptName} level. `;
        
        if (validation.violatingConcepts && validation.violatingConcepts.length > 0) {
            const violatingNames = validation.violatingConcepts
                .map(id => this.ontologyEngine?.getConceptById(id)?.name)
                .filter(name => name)
                .join(', ');
            if (violatingNames) {
                retryPrompt += `Specifically, avoid using: ${violatingNames}. `;
            }
        }

        retryPrompt += `Please accomplish the same goal using only the concepts and functions allowed for the current learning level.\n\n`;

        // Include all failed attempts so LLM can learn from them
        retryPrompt += `FAILED ATTEMPTS TO AVOID:\n`;
        failedAttempts.forEach((attempt, index) => {
            retryPrompt += `\nAttempt ${attempt.attempt}:\n`;
            retryPrompt += `\`\`\`\n${attempt.code}\n\`\`\`\n`;
            retryPrompt += `Problem: ${attempt.validation.message}\n`;
        });

        retryPrompt += `\nOriginal request: ${userRequest}\n\n`;
        retryPrompt += `Generate NEW code that accomplishes the same goal without the problems shown above.`;

        return retryPrompt;
    }

    /**
     * Handle validation failure after multiple retries - encourage alternative approaches
     * @param {string} userRequest - Original user request
     * @param {string} generatedCode - The last generated code (not used in editor)
     */
    handleValidationFailure(userRequest, generatedCode) {
        const currentConcept = this.learnerProfile?.getCurrentConcept();
        const conceptName = currentConcept ? 
            this.ontologyEngine?.getConceptById(currentConcept)?.name : 'current level';

        // Educational and encouraging messaging that maintains learning integrity
        // CRITICAL: Invalid code breaks the entire validation system going forward.
        // Every subsequent generation inherits constraint violations, creating a
        // cascade of validation failures and retry costs. Better to keep learners
        // working within their current capabilities.
        
        // Display user-facing notification instead of console logging
        const notification = {
            title: `💡 Great idea! Keep it for later`,
            message: `"${userRequest}" needs concepts beyond your current ${conceptName} level. ` +
                    `To keep your learning on track, I'm not updating your code this time.\n\n` +
                    `✨ Try a simpler version using current concepts, or save this idea for when you learn more!\n` +
                    `🚀 Building skills step-by-step creates a stronger foundation!`,
            type: 'info',
            actions: [
                { text: 'Got it!', action: () => {} }
            ]
        };
        
        this.errorHandler.displayNotification(notification);
        
        // Future enhancements:
        // 1. Track deferred ideas in learner profile for later suggestion
        // 2. Automatically suggest when prerequisite concepts are learned  
        // 3. Provide specific concept roadmap: "Learn X, then Y, then you can do this!"
        // 4. Add UI for "Save this idea for later" functionality
        // 5. Analytics: track what ideas learners want vs. current capabilities
        // 6. Show this message in UI rather than just console logging
    }

    /**
     * Check if application is ready
     * @returns {boolean} True if fully initialized
     */
    isReady() {
        const phase1Ready = this.isInitialized && 
                           this.editor && this.editor.isReady() &&
                           this.canvas;

        // Phase 2 components are optional for backward compatibility
        return phase1Ready;
    }

    /**
     * Get application status
     * @returns {Object} Status information
     */
    getStatus() {
        const baseStatus = {
            initialized: this.isInitialized,
            editor: this.editor ? this.editor.isReady() : false,
            canvas: this.canvas ? !this.canvas.isExecuting() : false,
            autoRun: this.autoRun
        };

        // Add Phase 2 status if available
        if (this.ontologyEngine || this.learnerProfile || this.learningDashboard) {
            baseStatus.phase2 = {
                ontology: this.ontologyEngine ? this.ontologyEngine.isReady() : false,
                profile: this.learnerProfile ? this.learnerProfile.isReady() : false,
                validator: this.codeValidator ? this.codeValidator.isReady() : false,
                learningDashboard: this.learningDashboard ? this.learningDashboard.isReady() : false
            };

            // Add current concept info
            if (this.learnerProfile && this.learnerProfile.isReady()) {
                baseStatus.currentConcept = this.learnerProfile.getCurrentConcept();
                baseStatus.learningStats = this.learnerProfile.getStatistics();
            }
        }

        // Add Phase 3 status if available
        if (this.modelManager) {
            baseStatus.phase3 = {
                modelManager: !!this.modelManager,
                modelInfo: this.modelManager.getModelInfo()
            };
        }

        // Add Phase 4 status if available
        if (this.codeHistory || this.undoManager || this.sessionStorage) {
            baseStatus.phase4 = {
                codeHistory: this.codeHistory ? this.codeHistory.isReady() : false,
                undoManager: this.undoManager ? this.undoManager.isReady() : false,
                sessionStorage: this.sessionStorage ? this.sessionStorage.isReady() : false,
                historyStats: this.codeHistory?.isReady() ? this.codeHistory.getStatistics() : null,
                undoStats: this.undoManager?.isReady() ? this.undoManager.getStatistics() : null,
                sessionStats: this.sessionStorage?.isReady() ? this.sessionStorage.getStatistics() : null
            };
        }

        // Keep chat status for backward compatibility
        if (this.chat) {
            baseStatus.chat = this.chat.isReady();
        }

        return baseStatus;
    }

    /**
     * Setup developer UI functionality
     */
    setupDeveloperUI() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchDeveloperTab(tabName);
            });
        });

        // Sub-tab switching
        const subTabBtns = document.querySelectorAll('.sub-tab-btn');
        subTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const subtabName = btn.getAttribute('data-subtab');
                this.switchDeveloperSubTab(btn, subtabName);
            });
        });

        // Close button
        const closeBtn = document.getElementById('close-developer-ui');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.toggleDeveloperUI();
            });
        }

        // Action buttons
        const copyPromptBtn = document.getElementById('copy-prompt-btn');
        if (copyPromptBtn) {
            copyPromptBtn.addEventListener('click', () => {
                this.copyPromptToClipboard();
            });
        }

        const copyResponseBtn = document.getElementById('copy-response-btn');
        if (copyResponseBtn) {
            copyResponseBtn.addEventListener('click', () => {
                this.copyResponseToClipboard();
            });
        }

        const refreshStateBtn = document.getElementById('refresh-state-btn');
        if (refreshStateBtn) {
            refreshStateBtn.addEventListener('click', () => {
                this.updateDeveloperStateDisplay();
            });
        }

        const refreshOntologyBtn = document.getElementById('refresh-ontology-btn');
        if (refreshOntologyBtn) {
            refreshOntologyBtn.addEventListener('click', () => {
                this.updateDeveloperOntologyDisplay();
            });
        }

        const clearLogsBtn = document.getElementById('clear-logs-btn');
        if (clearLogsBtn) {
            clearLogsBtn.addEventListener('click', () => {
                this.clearDeveloperLogs();
            });
        }

        const resetProgressBtn = document.getElementById('reset-progress-btn');
        if (resetProgressBtn) {
            resetProgressBtn.addEventListener('click', () => {
                this.resetProgressData();
            });
        }

        const resetHistoryBtn = document.getElementById('reset-history-btn');
        if (resetHistoryBtn) {
            resetHistoryBtn.addEventListener('click', () => {
                this.resetHistoryData();
            });
        }

        const resetAllBtn = document.getElementById('reset-all-btn');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => {
                this.resetAllData();
            });
        }

        // Dev API Key persistence checkbox
        const persistCheckbox = document.getElementById('persist-api-key-checkbox');
        if (persistCheckbox) {
            persistCheckbox.addEventListener('change', () => {
                this.togglePersistAPIKey();
            });
        }

        // Dev custom endpoint input
        const endpointInput = document.getElementById('dev-endpoint-input');
        if (endpointInput) {
            endpointInput.addEventListener('change', () => {
                this.applyDevEndpoint(endpointInput.value);
            });
            endpointInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    this.applyDevEndpoint(endpointInput.value);
                }
            });
        }

        const resetEndpointBtn = document.getElementById('reset-endpoint-btn');
        if (resetEndpointBtn) {
            resetEndpointBtn.addEventListener('click', () => {
                this.resetDevEndpoint();
            });
        }

        // Load persisted dev API key on init
        this.loadDevAPIKey();

        // Load persisted dev endpoint on init
        this.loadDevEndpoint();

        // Capture console logs
        // this.interceptConsole();
    }

    /**
     * Toggle developer UI visibility
     */
    toggleDeveloperUI() {
        const devUI = document.getElementById('developer-ui');
        if (devUI) {
            devUI.classList.toggle('hidden');
            if (!devUI.classList.contains('hidden')) {
                // Refresh displays when opening
                this.updateDeveloperPromptDisplay();
                this.updateDeveloperStateDisplay();
                this.updateDeveloperOntologyDisplay();
            }
        }
    }

    /**
     * Switch developer UI tabs
     */
    switchDeveloperTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update panels
        document.querySelectorAll('.dev-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-panel`).classList.add('active');
    }

    /**
     * Switch developer UI sub-tabs within a panel
     */
    switchDeveloperSubTab(clickedBtn, subtabName) {
        // Find the parent panel
        const parentPanel = clickedBtn.closest('.dev-panel');
        if (!parentPanel) return;

        // Update sub-tab buttons within this panel
        parentPanel.querySelectorAll('.sub-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        clickedBtn.classList.add('active');

        // Update sub-panels within this panel
        parentPanel.querySelectorAll('.sub-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        const targetPanel = parentPanel.querySelector(`#${subtabName}-panel`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
    }

    /**
     * Update prompt display in developer UI
     */
    updateDeveloperPromptDisplay() {
        // Main Prompt sub-tab
        const promptContent = document.getElementById('prompt-content');
        if (promptContent && this.lastPrompt) {
            promptContent.textContent = this.lastPrompt;
            if (this.lastSystemPrompt) {
                promptContent.textContent = "SYSTEM:\n" + this.lastSystemPrompt + "\n\nUSER:\n" + promptContent.textContent;
            }
        } else if (promptContent) {
            promptContent.textContent = 'No prompt generated yet';
        }

        // Explanations Prompt sub-tab
        const explanationsPromptContent = document.getElementById('explanations-prompt-content');
        if (explanationsPromptContent) {
            if (this.lastExplanationsPrompt) {
                explanationsPromptContent.textContent = this.lastExplanationsPrompt;
            } else {
                explanationsPromptContent.textContent = 'No explanations prompt (Tier 1 model or no generation yet)';
            }
        }

        // Stats
        const promptLength = document.getElementById('prompt-length');
        const promptTimestamp = document.getElementById('prompt-timestamp');
        const promptModel = document.getElementById('prompt-model');

        if (promptLength) {
            const length = this.lastPrompt ? this.lastPrompt.length : 0;
            promptLength.textContent = `Length: ${length} chars`;
        }

        if (promptTimestamp && this.lastPromptTimestamp) {
            promptTimestamp.textContent = `Generated: ${this.lastPromptTimestamp.toLocaleTimeString()}`;
        } else if (promptTimestamp) {
            promptTimestamp.textContent = 'Generated: Never';
        }

        if (promptModel && this.lastModelInfo) {
            promptModel.textContent = `Model: ${this.lastModelInfo.provider} / ${this.lastModelInfo.model}`;
        } else if (promptModel) {
            promptModel.textContent = 'Model: Unknown';
        }
    }

    /**
     * Update response display in developer UI
     */
    updateDeveloperResponseDisplay() {
        // Code sub-tab (clean code for both Tier 1 and Tier 2)
        const responseContent = document.getElementById('response-content');
        if (responseContent && this.lastResponse) {
            responseContent.textContent = this.lastResponse;
        } else if (responseContent) {
            responseContent.textContent = 'No response received yet';
        }

        // Explanations sub-tab
        const explanationsResponseContent = document.getElementById('explanations-response-content');
        if (explanationsResponseContent) {
            if (this.lastExplanationsResponse) {
                // Tier 2: Show raw LLM response with "BLOCK N: explanation"
                explanationsResponseContent.textContent = this.lastExplanationsResponse;
            } else if (this.lastRawResponse && this.modelManager.supportsInlineExplanations()) {
                // Tier 1: Show raw code with [EXPLAIN] comments
                explanationsResponseContent.textContent = this.lastRawResponse;
            } else {
                explanationsResponseContent.textContent = 'No explanations data';
            }
        }

        // Stats
        const responseLength = document.getElementById('response-length');
        const responseTimestamp = document.getElementById('response-timestamp');
        const responseModel = document.getElementById('response-model');

        if (responseLength) {
            const length = this.lastResponse ? this.lastResponse.length : 0;
            responseLength.textContent = `Length: ${length} chars`;
        }

        if (responseTimestamp && this.lastResponseTimestamp) {
            responseTimestamp.textContent = `Received: ${this.lastResponseTimestamp.toLocaleTimeString()}`;
        } else if (responseTimestamp) {
            responseTimestamp.textContent = 'Received: Never';
        }

        if (responseModel && this.lastModelInfo) {
            responseModel.textContent = `Model: ${this.lastModelInfo.provider} / ${this.lastModelInfo.model}`;
        } else if (responseModel) {
            responseModel.textContent = 'Model: Unknown';
        }
    }

    /**
     * Update state display in developer UI
     */
    updateDeveloperStateDisplay() {
        const stateContent = document.getElementById('state-content');
        if (stateContent) {
            try {
                const state = this.getStatus();
                stateContent.textContent = JSON.stringify(state, null, 2);
            } catch (error) {
                stateContent.textContent = `Error loading state: ${error.message}`;
            }
        }
    }

    /**
     * Update ontology display in developer UI
     */
    updateDeveloperOntologyDisplay() {
        const ontologyContent = document.getElementById('ontology-content');
        if (ontologyContent) {
            try {
                const constraints = this.generateLearningConstraints();
                const currentConcept = this.learnerProfile?.getCurrentConcept();
                const availableConcepts = this.learnerProfile?.getAvailableConcepts() || [];
                
                const info = {
                    currentConcept,
                    constraintsGenerated: constraints,
                    availableConcepts: availableConcepts.map(c => ({ id: c.id, name: c.name })),
                    ontologyReady: this.ontologyEngine?.isReady() || false,
                    profileReady: this.learnerProfile?.isReady() || false
                };
                
                ontologyContent.textContent = JSON.stringify(info, null, 2);
            } catch (error) {
                ontologyContent.textContent = `Error loading ontology info: ${error.message}`;
            }
        }
    }

    /**
     * Copy prompt to clipboard
     */
    async copyPromptToClipboard() {
        if (!this.lastPrompt) {
            alert('No prompt to copy');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.lastPrompt);
            alert('Prompt copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy prompt:', error);
            alert('Failed to copy prompt');
        }
    }

    /**
     * Copy LLM response to clipboard
     */
    async copyResponseToClipboard() {
        if (!this.lastResponse) {
            alert('No response to copy');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.lastResponse);
            alert('Response copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy response:', error);
            alert('Failed to copy response');
        }
    }

    /**
     * Clear developer logs
     */
    clearDeveloperLogs() {
        this.consoleLog = [];
        const consoleLogsDiv = document.getElementById('console-logs');
        if (consoleLogsDiv) {
            consoleLogsDiv.textContent = 'No logs captured yet';
        }
    }

    /**
     * Intercept console methods for developer UI
     */
    interceptConsole() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            this.addToDevLog('info', args.join(' '));
            originalLog.apply(console, args);
        };

        console.error = (...args) => {
            this.addToDevLog('error', args.join(' '));
            originalError.apply(console, args);
        };

        console.warn = (...args) => {
            this.addToDevLog('warn', args.join(' '));
            originalWarn.apply(console, args);
        };
    }

    /**
     * Reset all progress data (for testing/debugging)
     */
    resetProgressData() {
        if (confirm('Reset all learning progress data? This cannot be undone.')) {
            try {
                // Clear analytics data
                if (this.learningAnalytics) {
                    this.learningAnalytics.clearData();
                }
                
                // Clear learner profile completed objectives
                if (this.learnerProfile) {
                    const currentConcept = this.learnerProfile.getCurrentConcept();
                    if (currentConcept) {
                        this.learnerProfile.setCompletedObjectives(currentConcept, []);
                    }
                }
                
                // Update dashboard UI
                if (this.learningDashboard) {
                    this.learningDashboard.updateCurrentLearning();
                    this.learningDashboard.updateObjectivesGrid();
                    this.learningDashboard.updateProgressMetrics();
                }
                
                console.log('🔄 Progress data reset successfully');
                alert('Progress data reset successfully!');
                
            } catch (error) {
                console.error('Failed to reset progress data:', error);
                alert('Failed to reset progress data. Check console for details.');
            }
        }
    }

    /**
     * Phase 4: Reset all code history data (for testing/debugging)
     */
    resetHistoryData() {
        if (confirm('Reset all code history and undo/redo data? This cannot be undone.')) {
            try {
                // Clear code history
                if (this.codeHistory && this.codeHistory.isReady()) {
                    this.codeHistory.clearHistory();
                }
                
                // Update undo/redo button states
                if (this.undoManager && this.undoManager.isReady()) {
                    this.undoManager.updateUndoRedoButtons();
                }
                
                // Capture current code state as new starting point
                const currentCode = this.editor?.getCode();
                if (currentCode) {
                    this.captureCodeState(currentCode, 'reset', 'manual');
                }
                
                console.log('🗑️ Code history reset successfully');
                alert('Code history reset successfully!');
                
            } catch (error) {
                console.error('Failed to reset code history:', error);
                alert('Failed to reset code history. Check console for details.');
            }
        }
    }

    /**
     * Phase 5: Reset all localStorage data (for testing/debugging onboarding flow)
     */
    resetAllData() {
        const confirmMessage = `⚠️ RESET ALL DATA

This will completely clear all stored data including:
• Welcome preferences (will show onboarding again)
• API key settings
• Learning progress and analytics
• Code history and undo/redo data
• Session storage

This action cannot be undone. Are you sure?`;

        if (confirm(confirmMessage)) {
            try {
                // Clear all localStorage
                localStorage.clear();
                
                // Clear all sessionStorage 
                sessionStorage.clear();
                
                // Reset components that might have cached data
                if (this.welcomeUI && this.welcomeUI.isReady()) {
                    console.log('🔄 Welcome UI preferences reset');
                }
                
                if (this.apiSettingsUI && this.apiSettingsUI.isReady()) {
                    console.log('🔄 API settings reset');
                }
                
                if (this.learningAnalytics) {
                    this.learningAnalytics.clearData();
                    console.log('🔄 Learning analytics reset');
                }
                
                if (this.codeHistory && this.codeHistory.isReady()) {
                    this.codeHistory.clearHistory();
                    console.log('🔄 Code history reset');
                }
                
                if (this.undoManager && this.undoManager.isReady()) {
                    this.undoManager.updateUndoRedoButtons();
                    console.log('🔄 Undo/redo state reset');
                }
                
                console.log('🗑️ All data reset successfully');
                alert('All data reset successfully! Refresh the page to see the onboarding flow.');
                
            } catch (error) {
                console.error('Failed to reset all data:', error);
                alert('Failed to reset all data. Check console for details.');
            }
        }
    }

    /**
     * Persist current API key configuration to localStorage (dev mode)
     */
    persistAPIKeyToLocalStorage() {
        if (!this.apiSettingsUI || !this.apiSettingsUI.isReady()) {
            console.error('API Settings UI not available');
            return false;
        }

        const apiKeyManager = this.apiSettingsUI.getAPIKeyManager();
        if (!apiKeyManager || !apiKeyManager.hasAPIKey()) {
            this.updateDevKeyStatus('❌ No API key configured', 'error');
            return false;
        }

        try {
            const keyData = apiKeyManager.getAPIKey();
            if (!keyData) {
                this.updateDevKeyStatus('❌ No API key to persist', 'error');
                return false;
            }

            // Store provider + model + key to localStorage
            const persistData = {
                provider: keyData.provider,
                model: keyData.model,
                key: keyData.key,
                timestamp: new Date().toISOString()
            };

            localStorage.setItem('vibeInstructor_devApiKey', JSON.stringify(persistData));

            this.updateDevKeyStatus(`✅ Persisted: ${keyData.provider} / ${keyData.model}`, 'success');
            console.log(`🔑 API key persisted to localStorage: ${keyData.provider} / ${keyData.model}`);

            // Show dev mode indicator
            this.showDevModeIndicator();
            return true;

        } catch (error) {
            console.error('Failed to persist API key:', error);
            this.updateDevKeyStatus('❌ Failed to persist', 'error');
            return false;
        }
    }

    /**
     * Load persisted API key from localStorage and apply it (dev mode)
     */
    loadDevAPIKey() {
        try {
            const savedData = localStorage.getItem('vibeInstructor_devApiKey');
            if (!savedData) {
                return;
            }

            // Try to parse as JSON (new format with provider + model + key)
            let persistData;
            try {
                persistData = JSON.parse(savedData);
            } catch (e) {
                // Legacy format: just a string key, assume Anthropic
                console.log('🔑 Migrating legacy dev API key format');
                persistData = {
                    provider: 'anthropic',
                    model: 'claude-3-haiku-20240307',
                    key: savedData
                };
            }

            if (!this.apiSettingsUI || !this.apiSettingsUI.isReady()) {
                console.warn('API Settings UI not ready, will retry loading dev key');
                return;
            }

            const apiKeyManager = this.apiSettingsUI.getAPIKeyManager();
            if (!apiKeyManager) {
                console.warn('API Key Manager not available');
                return;
            }

            // Apply the persisted configuration
            apiKeyManager.setAPIKey(persistData.provider, persistData.key, persistData.model);
            this.updateDevKeyStatus(`✅ Dev mode: ${persistData.provider} / ${persistData.model}`, 'success');
            console.log(`🔑 Dev API key loaded: ${persistData.provider} / ${persistData.model}`);

            // Update checkbox state
            const persistCheckbox = document.getElementById('persist-api-key-checkbox');
            if (persistCheckbox) {
                persistCheckbox.checked = true;
            }

            // Update LLM interaction area
            this.updateLLMInteractionArea();

            // Show dev mode indicator
            this.showDevModeIndicator();

        } catch (error) {
            console.error('Failed to load dev API key:', error);
        }
    }

    /**
     * Toggle API key persistence (dev mode checkbox)
     */
    togglePersistAPIKey() {
        const persistCheckbox = document.getElementById('persist-api-key-checkbox');
        if (!persistCheckbox) {
            return;
        }

        if (persistCheckbox.checked) {
            // Persist current API configuration
            this.persistAPIKeyToLocalStorage();
        } else {
            // Remove persistence
            this.clearDevAPIKey();
        }
    }

    /**
     * Clear persisted API key from localStorage (dev mode)
     */
    clearDevAPIKey() {
        try {
            localStorage.removeItem('vibeInstructor_devApiKey');

            // Remove dev mode indicator
            this.hideDevModeIndicator();

            this.updateDevKeyStatus('✅ Persistence disabled', 'success');
            console.log('🔑 Dev API key persistence cleared');

            // Note: sessionStorage key remains active until page reload
            alert('API key persistence disabled. The key will be cleared on page reload.');
        } catch (error) {
            console.error('Failed to clear dev API key:', error);
            this.updateDevKeyStatus('❌ Failed to clear persistence', 'error');
        }
    }

    /**
     * Update dev API key status message
     * @param {string} message - Status message
     * @param {string} type - Message type (success, error, info)
     */
    updateDevKeyStatus(message, type = 'info') {
        const statusEl = document.getElementById('dev-api-key-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.style.color = type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#888';
        }
    }

    /**
     * Show dev mode indicator in UI header
     */
    showDevModeIndicator() {
        // Check if indicator already exists
        let indicator = document.getElementById('dev-mode-indicator');
        if (indicator) {
            indicator.style.display = 'inline-block';
            return;
        }

        // Create indicator
        indicator = document.createElement('div');
        indicator.id = 'dev-mode-indicator';
        indicator.style.cssText = `
            display: inline-block;
            background: #ff9800;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 10px;
            animation: pulse 2s infinite;
        `;
        indicator.textContent = '🔧 DEV MODE';

        // Add to header
        const header = document.querySelector('header h1');
        if (header) {
            header.parentElement.insertBefore(indicator, header.nextSibling);
        }

        // Add pulse animation if not exists
        if (!document.getElementById('dev-mode-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'dev-mode-pulse-style';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Hide dev mode indicator
     */
    hideDevModeIndicator() {
        const indicator = document.getElementById('dev-mode-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    /**
     * Apply a custom Vercel endpoint URL (dev mode)
     * @param {string} url - Custom endpoint URL
     */
    applyDevEndpoint(url) {
        if (!this.modelManager) {
            console.warn('Model manager not available');
            return;
        }

        const trimmed = url?.trim() || '';
        this.modelManager.setBaseUrl(trimmed || null);

        const statusEl = document.getElementById('dev-endpoint-status');
        if (trimmed) {
            localStorage.setItem('vibeInstructor_devEndpoint', trimmed);
            if (statusEl) {
                statusEl.textContent = `✅ Using: ${trimmed}`;
                statusEl.style.color = '#4caf50';
            }
        } else {
            localStorage.removeItem('vibeInstructor_devEndpoint');
            if (statusEl) {
                statusEl.textContent = 'Using default endpoint';
                statusEl.style.color = '#888';
            }
        }
    }

    /**
     * Reset custom endpoint to default (dev mode)
     */
    resetDevEndpoint() {
        localStorage.removeItem('vibeInstructor_devEndpoint');

        if (this.modelManager) {
            this.modelManager.setBaseUrl(null);
        }

        const endpointInput = document.getElementById('dev-endpoint-input');
        if (endpointInput) {
            endpointInput.value = '';
        }

        const statusEl = document.getElementById('dev-endpoint-status');
        if (statusEl) {
            statusEl.textContent = 'Reset to default endpoint';
            statusEl.style.color = '#888';
        }
    }

    /**
     * Load persisted dev endpoint from localStorage
     */
    loadDevEndpoint() {
        try {
            const savedEndpoint = localStorage.getItem('vibeInstructor_devEndpoint');
            if (!savedEndpoint) return;

            if (this.modelManager) {
                this.modelManager.setBaseUrl(savedEndpoint);
            }

            const endpointInput = document.getElementById('dev-endpoint-input');
            if (endpointInput) {
                endpointInput.value = savedEndpoint;
            }

            const statusEl = document.getElementById('dev-endpoint-status');
            if (statusEl) {
                statusEl.textContent = `✅ Using: ${savedEndpoint}`;
                statusEl.style.color = '#4caf50';
            }

            console.log(`🔧 Dev endpoint loaded: ${savedEndpoint}`);
        } catch (error) {
            console.error('Failed to load dev endpoint:', error);
        }
    }

    /**
     * Phase 4: Show session restore notification banner
     */
    showSessionRestoreNotification() {
        const notification = document.getElementById('session-restore-notification');
        if (!notification) {
            console.error('Session restore notification element not found');
            return;
        }

        // Show the notification
        notification.classList.remove('hidden');

        // Set up event listeners for notification buttons
        this.setupNotificationEventListeners();

        // Set up editor change listener to auto-dismiss
        this.setupEditorChangeDismissal();
    }

    /**
     * Phase 4: Hide session restore notification with smooth animation
     */
    hideSessionRestoreNotification() {
        const notification = document.getElementById('session-restore-notification');
        if (notification && !notification.classList.contains('removing')) {
            // Start the removal animation
            notification.classList.add('removing');
            
            // After animation completes, fully hide the element
            setTimeout(() => {
                notification.classList.add('hidden');
                notification.classList.remove('removing');
            }, 300); // Match the CSS transition duration
        }

        // Clean up editor listener
        this.cleanupEditorChangeDismissal();
    }

    /**
     * Phase 4: Setup notification button event listeners
     */
    setupNotificationEventListeners() {
        const startFreshBtn = document.getElementById('start-fresh-notification-btn');
        const dismissBtn = document.getElementById('dismiss-notification-btn');

        if (startFreshBtn) {
            startFreshBtn.addEventListener('click', this.handleStartFreshFromNotification.bind(this));
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', this.hideSessionRestoreNotification.bind(this));
        }
    }

    /**
     * Phase 4: Handle "Start Fresh" from notification
     */
    async handleStartFreshFromNotification() {
        try {
            // Clear session storage
            if (this.sessionStorage) {
                this.sessionStorage.clearSession();
            }

            // Clear code history
            if (this.codeHistory && this.codeHistory.isReady()) {
                this.codeHistory.clearHistory();
            }

            // Clear editor
            if (this.editor) {
                await this.editor.setCode(this.editor.defaultCode);
            }

            // Clear learning state (optional - user might want to keep progress)
            // Could be made configurable in the future

            // Update undo/redo buttons
            if (this.undoManager && this.undoManager.isReady()) {
                this.undoManager.updateUndoRedoButtons();
            }

            // Hide notification
            this.hideSessionRestoreNotification();

            // Run the fresh code
            if (this.autoRun) {
                this.errorHandler.setAutoRunning(true);
                await this.runCode();
                this.errorHandler.setAutoRunning(false);
            }

            console.log('🆕 Started fresh session from notification');

        } catch (error) {
            console.error('Failed to start fresh session:', error);
        }
    }

    /**
     * Phase 4: Setup editor change detection to auto-dismiss notification
     */
    setupEditorChangeDismissal() {
        if (!this.editor) return;

        // Listen for editor changes to auto-dismiss notification
        this.editorChangeHandler = () => {
            this.hideSessionRestoreNotification();
        };

        // Hook into Monaco editor's content change events
        const setupMonacoListener = () => {
            if (this.editor.editor) {
                this.monacoChangeDisposable = this.editor.editor.onDidChangeModelContent(this.editorChangeHandler);
                return true;
            }
            return false;
        };

        // Try to set up immediately, then retry if Monaco isn't ready
        if (!setupMonacoListener()) {
            const retryInterval = setInterval(() => {
                if (setupMonacoListener()) {
                    clearInterval(retryInterval);
                }
            }, 50);

            // Give up after 5 seconds
            setTimeout(() => {
                clearInterval(retryInterval);
            }, 5000);
        }
    }

    /**
     * Phase 4: Cleanup editor change dismissal
     */
    cleanupEditorChangeDismissal() {
        // Dispose Monaco change listener
        if (this.monacoChangeDisposable) {
            this.monacoChangeDisposable.dispose();
            this.monacoChangeDisposable = null;
        }
        this.editorChangeHandler = null;
    }

    /**
     * Phase 4: Restore session from storage
     */
    async restoreSession() {
        if (!this.sessionStorage || !this.sessionStorage.isReady()) {
            throw new Error('Session storage not available');
        }

        const sessionData = this.sessionStorage.loadSession();
        if (!sessionData) {
            throw new Error('No session data to restore');
        }

        try {
            // Restore code in editor
            if (sessionData.currentCode && this.editor) {
                await this.editor.setCode(sessionData.currentCode);
                console.log('📝 Code restored to editor');
            }

            // Restore code history if available
            if (sessionData.codeHistory && this.codeHistory && this.codeHistory.isReady()) {
                if (sessionData.codeHistory.length > 0) {
                    // Import the history
                    const historyData = {
                        version: '1.0',
                        currentEntryId: sessionData.codeHistory[sessionData.codeHistory.length - 1]?.id,
                        timeline: sessionData.codeHistory.map(entry => entry.id),
                        entries: sessionData.codeHistory.reduce((acc, entry) => {
                            acc[entry.id] = entry;
                            return acc;
                        }, {})
                    };

                    this.codeHistory.importHistory(historyData);
                    console.log('📜 Code history restored');
                }
            }

            // Restore learning context if available
            if (sessionData.learningContext && this.learnerProfile) {
                if (sessionData.learningContext.currentConcept && 
                    sessionData.learningContext.currentConcept !== 'unknown') {
                    this.learnerProfile.setCurrentConcept(sessionData.learningContext.currentConcept);
                    console.log('🎓 Learning concept restored');
                }

                if (sessionData.learningContext.completedObjectives) {
                    sessionData.learningContext.completedObjectives.forEach(objective => {
                        // Restore completed objectives for the current concept
                        const conceptId = sessionData.learningContext.currentConcept;
                        if (conceptId) {
                            const existing = this.learnerProfile.getCompletedObjectives(conceptId) || [];
                            if (!existing.includes(objective)) {
                                this.learnerProfile.setCompletedObjectives(conceptId, [...existing, objective]);
                            }
                        }
                    });
                    console.log('✅ Completed objectives restored');
                }
            }

            // Update UI components
            if (this.learningDashboard && this.learningDashboard.isReady()) {
                this.learningDashboard.updateCurrentLearning();
                this.learningDashboard.updateObjectivesGrid();
                this.learningDashboard.updateProgressMetrics();
            }

            // Update undo/redo button states
            if (this.undoManager && this.undoManager.isReady()) {
                this.undoManager.updateUndoRedoButtons();
            }

            // Run the restored code
            if (this.autoRun && sessionData.currentCode && sessionData.currentCode.trim()) {
                this.errorHandler.setAutoRunning(true);
                await this.runCode();
                this.errorHandler.setAutoRunning(false);
            }

        } catch (error) {
            console.error('Failed to restore session:', error);
            throw error;
        }
    }

    /**
     * Phase 4: Toggle save options dropdown
     */
    toggleSaveOptions() {
        console.log('🔄 Toggling save options dropdown');
        const saveOptions = document.getElementById('save-options');
        if (saveOptions) {
            const wasHidden = saveOptions.classList.contains('hidden');
            saveOptions.classList.toggle('hidden');
            console.log(`📋 Save options dropdown ${wasHidden ? 'shown' : 'hidden'}`);
        } else {
            console.error('❌ Save options dropdown not found in DOM');
        }
    }

    /**
     * Phase 4: Hide save options dropdown
     */
    hideSaveOptions() {
        const saveOptions = document.getElementById('save-options');
        if (saveOptions) {
            saveOptions.classList.add('hidden');
        }
    }

    /**
     * Phase 4: Open file selector for import
     */
    openFileSelector() {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Phase 4: Export current code as downloadable file
     */
    async exportCode() {
        console.log('📤 exportCode() called');
        
        if (!this.importExport) {
            console.error('❌ ImportExport instance not available');
            return;
        }
        
        if (!this.importExport.isReady()) {
            console.error('❌ ImportExport not ready');
            return;
        }
        
        console.log('✅ ImportExport is ready, proceeding with export');

        try {
            const code = this.getCurrentCode();
            if (!code || !code.trim()) {
                console.error('No code to export');
                return;
            }

            const options = {
                concept: this.learnerProfile?.getCurrentConcept() || 'Unknown'
            };

            const success = this.importExport.exportCode(code, options);
            if (success) {
                console.log('Code exported successfully');
            } else {
                console.error('Export failed');
            }

        } catch (error) {
            console.error('Export code failed:', error);
        }
    }

    /**
     * Save current code using native save dialog (File System Access API)
     */
    async saveCodeWithDialog() {
        console.log('💾 saveCodeWithDialog() called');
        
        if (!this.importExport) {
            console.error('❌ ImportExport instance not available');
            return;
        }
        
        if (!this.importExport.isReady()) {
            console.error('❌ ImportExport not ready');
            return;
        }
        
        console.log('✅ ImportExport is ready, proceeding with save dialog');

        try {
            const code = this.getCurrentCode();
            if (!code || !code.trim()) {
                console.error('No code to save');
                return;
            }

            const options = {
                concept: this.learnerProfile?.getCurrentConcept() || 'Unknown'
            };

            const success = await this.importExport.saveCodeWithDialog(code, options);
            if (success) {
                console.log('Code saved successfully');
            } else {
                console.log('Save operation cancelled or failed');
            }

        } catch (error) {
            console.error('Save code failed:', error);
        }
    }

    /**
     * Phase 4: Export full project including history and progress
     */
    async exportProject() {
        if (!this.importExport || !this.importExport.isReady()) {
            console.error('Export not available');
            return;
        }

        try {
            const projectData = this.gatherProjectData();
            const success = this.importExport.exportProject(projectData);
            
            if (success) {
                console.log('Project exported successfully');
            } else {
                console.error('Project export failed');
            }

        } catch (error) {
            console.error('Export project failed:', error);
        }
    }

    /**
     * Phase 4: Copy shareable link to clipboard
     */
    async copyShareLink() {
        if (!this.importExport || !this.importExport.isReady()) {
            console.error('Share not available');
            return;
        }

        try {
            const code = this.getCurrentCode();
            if (!code || !code.trim()) {
                console.error('No code to share');
                return;
            }

            const options = {
                concept: this.learnerProfile?.getCurrentConcept() || null
            };

            const shareUrl = this.importExport.generateShareableLink(code, options);
            if (shareUrl) {
                await navigator.clipboard.writeText(shareUrl);
                console.log('Share link copied to clipboard');
            } else {
                console.error('Failed to generate share link');
            }

        } catch (error) {
            console.error('Copy share link failed:', error);
        }
    }

    /**
     * Phase 4: Handle file import
     */
    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!this.importExport || !this.importExport.isReady()) {
            console.error('Import not available');
            return;
        }

        try {
            console.log('Importing file...');

            // Determine import type based on file extension
            const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            
            if (extension === '.json') {
                await this.importProject(file);
            } else {
                await this.importCode(file);
            }

        } catch (error) {
            console.error('File import failed:', error);
        } finally {
            // Clear the file input
            event.target.value = '';
        }
    }

    /**
     * Phase 4: Import code file
     */
    async importCode(file) {
        const result = await this.importExport.importCode(file);
        
        if (result.success) {
            // Capture current state before importing
            const currentCode = this.getCurrentCode();
            if (currentCode && currentCode.trim()) {
                this.captureCodeState(currentCode, 'import_backup', 'manual');
            }

            // Set the imported code
            await this.editor.setCode(result.code);
            
            // Capture the imported state
            this.captureCodeState(result.code, 'import', 'file_import');
            
            // Run the imported code
            if (this.autoRun) {
                this.errorHandler.setAutoRunning(true);
                await this.runCode();
                this.errorHandler.setAutoRunning(false);
            }
            
            console.log(`Code imported from ${result.filename}`);
            console.log('📥 Code imported successfully:', result.metadata);

        } else {
            console.error(`Import failed: ${result.error}`);
        }
    }

    /**
     * Phase 4: Import project file
     */
    async importProject(file) {
        const result = await this.importExport.importProject(file);
        
        if (result.success) {
            const projectData = result.projectData;
            
            // Restore code
            if (projectData.code) {
                await this.editor.setCode(projectData.code);
            }
            
            // Restore learning progress
            if (projectData.learningProgress && this.learnerProfile) {
                if (projectData.learningProgress.currentConcept) {
                    this.learnerProfile.setCurrentConcept(projectData.learningProgress.currentConcept);
                }
                
                if (projectData.learningProgress.completedObjectives) {
                    // Restore completed objectives for the current concept
                    const conceptId = projectData.learningProgress.currentConcept;
                    if (conceptId) {
                        this.learnerProfile.setCompletedObjectives(conceptId, projectData.learningProgress.completedObjectives);
                    }
                }
            }
            
            // Restore code history if available
            if (projectData.codeHistory && this.codeHistory && this.codeHistory.isReady()) {
                // Import the history entries
                projectData.codeHistory.forEach(entry => {
                    this.codeHistory.importEntry(entry);
                });
            }
            
            // Update UI components
            if (this.learningDashboard && this.learningDashboard.isReady()) {
                this.learningDashboard.updateCurrentLearning();
                this.learningDashboard.updateObjectivesGrid();
                this.learningDashboard.updateProgressMetrics();
            }
            
            // Update undo/redo button states
            if (this.undoManager && this.undoManager.isReady()) {
                this.undoManager.updateUndoRedoButtons();
            }
            
            // Run the imported code
            if (this.autoRun && projectData.code && projectData.code.trim()) {
                await this.runCode();
            }
            
            console.log(`Project imported from ${result.filename}`);
            console.log('📦 Project imported successfully');

        } else {
            console.error(`Project import failed: ${result.error}`);
        }
    }

    /**
     * Phase 4: Gather current project data for export
     */
    gatherProjectData() {
        const currentCode = this.getCurrentCode();
        const currentConcept = this.learnerProfile?.getCurrentConcept();
        
        // Calculate total time if analytics available
        let totalTime = 0;
        if (this.learningAnalytics?.data?.startTime) {
            const startTime = new Date(this.learningAnalytics.data.startTime);
            const now = new Date();
            totalTime = Math.round((now.getTime() - startTime.getTime()) / 1000); // seconds
        }
        
        return {
            currentCode: currentCode,
            currentConcept: currentConcept,
            completedObjectives: this.learnerProfile?.getCompletedObjectives(currentConcept) || [],
            detectedObjectives: this.learningDashboard?.getCurrentDetectedObjectives() || [],
            codeHistory: this.codeHistory?.getHistoryTimeline(50) || [], // Last 50 entries
            sessionId: this.learningAnalytics?.data?.sessionId || null,
            startTime: this.learningAnalytics?.data?.startTime || null,
            totalTime: totalTime,
            masteryData: this.learningAnalytics ? this.safeExportAnalytics() : null,
            settings: {
                autoSave: this.sessionStorage?.getSettings()?.autoSave || true,
                autoRun: this.autoRun,
                undoLimit: this.undoManager?.maxUndoSteps || 50
            }
        };
    }

    /**
     * Phase 4: Safely export analytics data with error handling
     */
    safeExportAnalytics() {
        try {
            if (this.learningAnalytics && typeof this.learningAnalytics.exportData === 'function') {
                return this.learningAnalytics.exportData();
            } else if (this.learningAnalytics?.data) {
                // Fallback: return raw data if exportData method doesn't exist
                return {
                    sessionId: this.learningAnalytics.data.sessionId,
                    startTime: this.learningAnalytics.data.startTime,
                    detectionEvents: this.learningAnalytics.data.detectionEvents || [],
                    masteryEvents: this.learningAnalytics.data.masteryEvents || [],
                    conceptChangeEvents: this.learningAnalytics.data.conceptChangeEvents || []
                };
            }
        } catch (error) {
            console.warn('Failed to export analytics data:', error);
        }
        return null;
    }

    /**
     * Initialize safe mode with basic functionality when full initialization fails
     */
    async initializeSafeMode() {
        console.log('Initializing safe mode...');
        
        try {
            // Try to initialize basic editor (fallback mode)
            this.editor = new Editor('editor', this.onEditorChange.bind(this));
            await this.editor.init(); // This should fallback to textarea if Monaco fails
            
            // Try to initialize basic canvas
            this.canvas = new Canvas('canvas-container');
            
            // Set up basic event listeners
            this.setupBasicEventListeners();
            
            console.log('Safe mode initialized - basic functionality available');
            return true;
            
        } catch (error) {
            console.error('Safe mode initialization failed:', error);
            throw error;
        }
    }

    /**
     * Set up basic event listeners for safe mode
     */
    setupBasicEventListeners() {
        // Run button
        const runBtn = document.getElementById('run-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => this.runCode());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                this.runCode();
            }
        });
    }

    /**
     * Get initialization status for debugging
     */
    getInitializationStatus() {
        return {
            editor: !!this.editor,
            canvas: !!this.canvas,
            ontologyEngine: !!this.ontologyEngine,
            learnerProfile: !!this.learnerProfile,
            codeValidator: !!this.codeValidator,
            learningDashboard: !!this.learningDashboard,
            modelManager: !!this.modelManager,
            codeHistory: !!this.codeHistory,
            undoManager: !!this.undoManager,
            sessionStorage: !!this.sessionStorage,
            importExport: !!this.importExport
        };
    }

    /**
     * Add log entry to developer console
     */
    addToDevLog(type, message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        
        this.consoleLog.push({ type, message: logEntry, timestamp });
        
        // Keep only last 100 entries
        if (this.consoleLog.length > 100) {
            this.consoleLog.shift();
        }

        // Update display if visible
        const consoleLogsDiv = document.getElementById('console-logs');
        if (consoleLogsDiv) {
            const logHTML = this.consoleLog
                .map(entry => `<div class="log-entry log-${entry.type}">${entry.message}</div>`)
                .join('');
            consoleLogsDiv.innerHTML = logHTML || 'No logs captured yet';
            consoleLogsDiv.scrollTop = consoleLogsDiv.scrollHeight;
        }
    }

    /**
     * Suggest API key setup to users with helpful guidance
     * @param {string} message - Custom message to display
     */
    suggestAPIKeySetup(message = 'For best performance and reliability, consider setting up your own API key.') {
        // Check if we should show guidance (not shown recently)
        const lastShown = localStorage.getItem('vibe_api_guidance_shown');
        const now = Date.now();
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        
        if (lastShown && (now - parseInt(lastShown)) < oneHour) {
            return; // Don't spam user with guidance
        }

        // Store when we showed guidance
        localStorage.setItem('vibe_api_guidance_shown', now.toString());

        // Create a temporary notification
        this.showAPIKeyGuidance(message);
    }

    /**
     * Show API key setup guidance notification
     * @param {string} message - Message to display
     */
    showAPIKeyGuidance(message) {
        // Create guidance notification element
        const notification = document.createElement('div');
        notification.className = 'api-guidance-notification';
        notification.innerHTML = `
            <div class="guidance-content">
                <div class="guidance-icon">🔑</div>
                <div class="guidance-text">
                    <strong>API Key Setup</strong>
                    <p>${message}</p>
                </div>
                <div class="guidance-actions">
                    <button id="setup-api-key-btn" class="guidance-btn primary">Setup API Key</button>
                    <button id="dismiss-guidance-btn" class="guidance-btn secondary">Maybe Later</button>
                </div>
            </div>
        `;

        // Add styles inline to avoid CSS dependency issues
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            background: #2d2d30;
            border: 1px solid #0e639c;
            border-radius: 8px;
            padding: 16px;
            max-width: 350px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            animation: slideInRight 0.3s ease-out;
        `;

        // Add styles for content
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(100%); }
                to { opacity: 1; transform: translateX(0); }
            }
            .guidance-content { display: flex; align-items: flex-start; gap: 12px; }
            .guidance-icon { font-size: 24px; flex-shrink: 0; }
            .guidance-text { flex: 1; }
            .guidance-text strong { color: #ffffff; font-size: 0.95rem; }
            .guidance-text p { margin: 4px 0 0 0; color: #cccccc; font-size: 0.85rem; line-height: 1.4; }
            .guidance-actions { display: flex; gap: 8px; margin-top: 12px; flex-direction: column; }
            .guidance-btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
            .guidance-btn.primary { background: #0e639c; color: white; }
            .guidance-btn.primary:hover { background: #0d5a8a; }
            .guidance-btn.secondary { background: #3e3e42; color: #cccccc; }
            .guidance-btn.secondary:hover { background: #4e4e52; }
        `;
        document.head.appendChild(style);

        // Add to page
        document.body.appendChild(notification);

        // Set up event listeners
        const setupBtn = notification.querySelector('#setup-api-key-btn');
        const dismissBtn = notification.querySelector('#dismiss-guidance-btn');

        if (setupBtn) {
            setupBtn.addEventListener('click', () => {
                this.openAPISettings();
                this.removeGuidanceNotification(notification, style);
            });
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                this.removeGuidanceNotification(notification, style);
            });
        }

        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            this.removeGuidanceNotification(notification, style);
        }, 10000);
    }

    /**
     * Open API settings modal
     */
    openAPISettings() {
        if (this.apiSettingsUI && this.apiSettingsUI.isReady()) {
            this.apiSettingsUI.openModal();
        } else {
            console.error('API Settings UI not available');
        }
    }

    /**
     * Remove guidance notification from DOM
     * @param {HTMLElement} notification - Notification element
     * @param {HTMLElement} style - Style element
     */
    removeGuidanceNotification(notification, style) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                if (style && style.parentNode) {
                    style.parentNode.removeChild(style);
                }
            }, 300);
        }
    }

    /**
     * Update LLM interaction area based on API availability
     */
    updateLLMInteractionArea() {
        const hasAPIKey = this.modelManager && this.modelManager.hasUserAPIKey();
        const inputSection = document.querySelector('.ai-input-section');
        
        if (!inputSection) {
            return;
        }

        if (hasAPIKey) {
            // API key available - show normal interface
            this.showNormalLLMInterface(inputSection);
        } else {
            // No API key - show setup message
            this.showAPIUnavailableInterface(inputSection);
        }
    }

    /**
     * Show normal LLM interface when API key is available
     */
    showNormalLLMInterface(inputSection) {
        inputSection.innerHTML = `
            <div class="input-header">
                <h3>🤖 Modify Your Code</h3>
                <p>Describe what you want to change or add to your P5.js sketch</p>
            </div>
            
            <div class="input-area">
                <textarea 
                    id="user-request-input" 
                    rows="3"
                ></textarea>
                
                <div class="input-actions">
                    <button id="generate-from-input-btn" class="generate-input-btn">
                        ✨ Generate Code
                    </button>
                    <button id="clear-input-btn" class="clear-btn" title="Clear input">
                        🗑️ Clear
                    </button>
                </div>
            </div>
        `;

        // Re-setup event listeners for the regenerated elements
        this.setupLLMEventListeners();
    }

    /**
     * Show API unavailable interface when no API key is configured
     */
    showAPIUnavailableInterface(inputSection) {
        inputSection.innerHTML = `
            <div class="api-unavailable-message">
                <div class="unavailable-icon">🔑</div>
                <h3>AI Code Generation Not Available</h3>
                <div class="unavailable-actions">
                    <button id="setup-api-key-from-llm-btn" class="setup-api-btn">
                        🔑 Setup API Key
                    </button>
                </div>
            </div>
        `;

        // Setup event listener for the API setup button
        const setupBtn = document.getElementById('setup-api-key-from-llm-btn');
        if (setupBtn) {
            setupBtn.addEventListener('click', () => {
                this.openAPISettings();
            });
        }
    }

    /**
     * Setup event listeners for LLM interface elements
     */
    setupLLMEventListeners() {
        // User input generation button
        const generateFromInputBtn = document.getElementById('generate-from-input-btn');
        if (generateFromInputBtn) {
            generateFromInputBtn.addEventListener('click', () => {
                this.generateCodeFromInput();
            });
        }

        // Clear input button
        const clearInputBtn = document.getElementById('clear-input-btn');
        if (clearInputBtn) {
            clearInputBtn.addEventListener('click', () => {
                this.clearUserInput();
            });
        }

        // Enter key in textarea to generate
        const userInput = document.getElementById('user-request-input');
        if (userInput) {
            userInput.addEventListener('keydown', (event) => {
                // Ctrl/Cmd + Enter to generate
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    this.generateCodeFromInput();
                }
            });
        }
    }

    /**
     * Show first-time user welcome guidance
     */
    showFirstTimeUserGuidance() {
        // Use the new welcome UI if available
        if (this.welcomeUI && this.welcomeUI.isReady()) {
            this.welcomeUI.showWelcomeIfFirstVisit();
        } else {
            // Fallback to old behavior if welcome UI is not available
            const hasSeenWelcome = localStorage.getItem('vibe_welcome_shown');
            if (hasSeenWelcome) {
                return;
            }

            localStorage.setItem('vibe_welcome_shown', 'true');

            setTimeout(() => {
                this.suggestAPIKeySetup(
                    'Welcome to Vibe Coding Instructor! For the best experience with AI code generation, consider setting up your own API key. You can always use our fallback API to get started.'
                );
            }, 2000);
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    
    // Make app instance globally available for debugging
    window.vibeApp = app;
    
    // Initialize the application
    app.init().catch(error => {
        console.error('Failed to start application:', error);
    });
});

// Keep legacy P5.js error enhancement for backwards compatibility
window.addEventListener('error', (event) => {
    // Only handle P5.js-specific errors here, let global error handler deal with the rest
    if (window.vibeApp && window.vibeApp.canvas && event.error) {
        const enhancedError = window.vibeApp.canvas.enhanceErrorMessage(event.error);
        if (enhancedError.name === 'UnknownFunctionError' || enhancedError.name === 'UnsupportedConstantError') {
            console.error(enhancedError.message);
            // Don't prevent the global error handler from logging this
        }
    }
});