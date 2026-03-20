// Undo Manager - Manage undo/redo stacks and state navigation
// Provides user-friendly undo/redo operations on top of CodeHistory

export class UndoManager {
    constructor(codeHistory) {
        this.codeHistory = codeHistory;
        this.maxUndoSteps = 50;        // Configurable undo limit
        this.isInitialized = false;
        
        // Track navigation state
        this.navigationInProgress = false;
        this.lastNavigationAction = null;
    }

    /**
     * Initialize undo manager
     * @returns {boolean} Success status
     */
    init() {
        try {
            if (!this.codeHistory || !this.codeHistory.isReady()) {
                throw new Error('CodeHistory not available or not ready');
            }

            this.isInitialized = true;
            console.log('Undo Manager initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize Undo Manager:', error);
            return false;
        }
    }

    /**
     * Move back one state (undo)
     * @returns {Object|null} Previous state entry or null if not possible
     */
    async undo() {
        if (!this.canUndo()) {
            console.warn('Cannot undo - no previous states available');
            return null;
        }

        try {
            this.navigationInProgress = true;
            this.lastNavigationAction = 'undo';

            const undoableEntries = this.codeHistory.getUndoableEntries();
            if (undoableEntries.length === 0) {
                return null;
            }

            // Get the previous state (most recent undoable entry)
            const previousState = undoableEntries[undoableEntries.length - 1];
            
            // Set current state to previous
            const success = this.codeHistory.setCurrentState(previousState.id);
            if (!success) {
                throw new Error('Failed to set previous state');
            }

            console.log(`↶ Undo to state: ${previousState.userAction} (${previousState.id})`);
            
            this.navigationInProgress = false;
            return previousState;

        } catch (error) {
            console.error('Undo operation failed:', error);
            this.navigationInProgress = false;
            return null;
        }
    }

    /**
     * Move forward one state (redo)
     * @returns {Object|null} Next state entry or null if not possible
     */
    async redo() {
        if (!this.canRedo()) {
            console.warn('Cannot redo - no next states available');
            return null;
        }

        try {
            this.navigationInProgress = true;
            this.lastNavigationAction = 'redo';

            const redoableEntries = this.codeHistory.getRedoableEntries();
            if (redoableEntries.length === 0) {
                return null;
            }

            // Get the next state (first redoable entry)
            const nextState = redoableEntries[0];
            
            // Set current state to next
            const success = this.codeHistory.setCurrentState(nextState.id);
            if (!success) {
                throw new Error('Failed to set next state');
            }

            console.log(`↷ Redo to state: ${nextState.userAction} (${nextState.id})`);
            
            this.navigationInProgress = false;
            return nextState;

        } catch (error) {
            console.error('Redo operation failed:', error);
            this.navigationInProgress = false;
            return null;
        }
    }

    /**
     * Check if undo is available
     * @returns {boolean} True if undo is possible
     */
    canUndo() {
        if (!this.isInitialized || !this.codeHistory.isReady()) {
            return false;
        }

        const undoableEntries = this.codeHistory.getUndoableEntries();
        return undoableEntries.length > 0;
    }

    /**
     * Check if redo is available
     * @returns {boolean} True if redo is possible
     */
    canRedo() {
        if (!this.isInitialized || !this.codeHistory.isReady()) {
            return false;
        }

        const redoableEntries = this.codeHistory.getRedoableEntries();
        return redoableEntries.length > 0;
    }

    /**
     * Add new state to undo stack (called when user makes changes)
     * @param {Object} codeEntry - History entry to add
     */
    pushState(codeEntry) {
        if (!this.isInitialized || this.navigationInProgress) {
            return;
        }

        // When a new state is pushed after undo operations,
        // the redo stack is effectively cleared since we're creating
        // a new timeline branch. This is handled automatically by
        // CodeHistory's timeline management.
        
        console.log(`📌 New state pushed: ${codeEntry.userAction} (${codeEntry.id})`);
    }

    /**
     * Get number of undo steps available
     * @returns {number} Number of undoable states
     */
    getUndoCount() {
        if (!this.isInitialized || !this.codeHistory.isReady()) {
            return 0;
        }

        return this.codeHistory.getUndoableEntries().length;
    }

    /**
     * Get number of redo steps available
     * @returns {number} Number of redoable states
     */
    getRedoCount() {
        if (!this.isInitialized || !this.codeHistory.isReady()) {
            return 0;
        }

        return this.codeHistory.getRedoableEntries().length;
    }

    /**
     * Jump to specific state by ID
     * @param {string} stateId - State ID to jump to
     * @returns {Object|null} Target state or null if failed
     */
    async jumpToState(stateId) {
        if (!this.isInitialized) {
            console.warn('Cannot jump to state - undo manager not initialized');
            return null;
        }

        try {
            this.navigationInProgress = true;
            this.lastNavigationAction = 'jump';

            const targetState = this.codeHistory.getStateById(stateId);
            if (!targetState) {
                throw new Error(`State not found: ${stateId}`);
            }

            const success = this.codeHistory.setCurrentState(stateId);
            if (!success) {
                throw new Error('Failed to set target state');
            }

            console.log(`🎯 Jumped to state: ${targetState.userAction} (${stateId})`);
            
            this.navigationInProgress = false;
            return targetState;

        } catch (error) {
            console.error('Jump to state failed:', error);
            this.navigationInProgress = false;
            return null;
        }
    }

    /**
     * Get preview of what undo would restore
     * @returns {Object|null} Preview of undo target
     */
    getUndoPreview() {
        if (!this.canUndo()) {
            return null;
        }

        const undoableEntries = this.codeHistory.getUndoableEntries();
        const targetState = undoableEntries[undoableEntries.length - 1];

        return {
            id: targetState.id,
            timestamp: targetState.timestamp,
            userAction: targetState.userAction,
            preview: targetState.preview,
            changeType: targetState.changeType
        };
    }

    /**
     * Get preview of what redo would restore
     * @returns {Object|null} Preview of redo target
     */
    getRedoPreview() {
        if (!this.canRedo()) {
            return null;
        }

        const redoableEntries = this.codeHistory.getRedoableEntries();
        const targetState = redoableEntries[0];

        return {
            id: targetState.id,
            timestamp: targetState.timestamp,
            userAction: targetState.userAction,
            preview: targetState.preview,
            changeType: targetState.changeType
        };
    }

    /**
     * Get undo/redo navigation options for UI
     * @returns {Object} Navigation options
     */
    getNavigationOptions() {
        return {
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            undoCount: this.getUndoCount(),
            redoCount: this.getRedoCount(),
            undoPreview: this.getUndoPreview(),
            redoPreview: this.getRedoPreview(),
            isNavigating: this.navigationInProgress,
            lastAction: this.lastNavigationAction
        };
    }

    /**
     * Get recent history for timeline UI
     * @param {number} limit - Number of recent entries to return
     * @returns {Array} Recent history entries
     */
    getRecentHistory(limit = 10) {
        if (!this.isInitialized || !this.codeHistory.isReady()) {
            return [];
        }

        const timeline = this.codeHistory.getHistoryTimeline(limit);
        const currentEntry = this.codeHistory.getCurrentEntry();
        
        // Mark which entry is current
        return timeline.map(entry => ({
            ...entry,
            isCurrent: currentEntry && entry.id === currentEntry.id,
            canNavigateTo: true
        }));
    }

    /**
     * Create save point (manually marked important state)
     * @param {string} description - Description of save point
     * @returns {Object|null} Created save point entry
     */
    createSavePoint(description = 'Manual save point') {
        if (!this.isInitialized) {
            console.warn('Cannot create save point - undo manager not initialized');
            return null;
        }

        // Get current code from the app
        const currentCode = this.getCurrentCode();
        if (!currentCode) {
            console.warn('Cannot create save point - no current code');
            return null;
        }

        // Capture state with save point marker
        const context = {
            savePoint: true,
            description: description
        };

        const entry = this.codeHistory.captureState(currentCode, 'save_point', 'manual', context);
        if (entry) {
            console.log(`💾 Save point created: ${description} (${entry.id})`);
        }

        return entry;
    }

    /**
     * Get current code from editor (helper method)
     * @returns {string|null} Current code
     */
    getCurrentCode() {
        // Access global app instance to get current code
        if (typeof window !== 'undefined' && window.vibeApp?.editor) {
            return window.vibeApp.editor.getCode();
        }
        return null;
    }

    /**
     * Handle keyboard shortcuts for undo/redo
     * @param {KeyboardEvent} event - Keyboard event
     * @returns {boolean} True if event was handled
     */
    handleKeyboardShortcut(event) {
        if (!this.isInitialized) {
            return false;
        }

        // Ctrl/Cmd + Z for undo
        if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
            event.preventDefault();
            this.performUndo();
            return true;
        }

        // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z for redo
        if ((event.ctrlKey || event.metaKey) && 
            (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
            event.preventDefault();
            this.performRedo();
            return true;
        }

        return false;
    }

    /**
     * Perform undo operation and update UI
     * @returns {Promise<boolean>} Success status
     */
    async performUndo() {
        const previousState = await this.undo();
        if (!previousState) {
            return false;
        }

        // Update editor with previous code
        if (typeof window !== 'undefined' && window.vibeApp?.editor) {
            await window.vibeApp.editor.setCode(previousState.code);
            
            // Auto-run if enabled
            if (window.vibeApp.autoRun) {
                await window.vibeApp.runCode();
            }
        }

        // Update UI button states
        this.updateUndoRedoButtons();
        
        return true;
    }

    /**
     * Perform redo operation and update UI
     * @returns {Promise<boolean>} Success status
     */
    async performRedo() {
        const nextState = await this.redo();
        if (!nextState) {
            return false;
        }

        // Update editor with next code
        if (typeof window !== 'undefined' && window.vibeApp?.editor) {
            await window.vibeApp.editor.setCode(nextState.code);
            
            // Auto-run if enabled
            if (window.vibeApp.autoRun) {
                await window.vibeApp.runCode();
            }
        }

        // Update UI button states
        this.updateUndoRedoButtons();
        
        return true;
    }

    /**
     * Update undo/redo button states in UI
     */
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');

        if (undoBtn) {
            undoBtn.disabled = !this.canUndo();
            undoBtn.title = this.canUndo() ? 
                `Undo: ${this.getUndoPreview()?.preview || 'previous action'}` : 
                'No actions to undo';
        }

        if (redoBtn) {
            redoBtn.disabled = !this.canRedo();
            redoBtn.title = this.canRedo() ? 
                `Redo: ${this.getRedoPreview()?.preview || 'next action'}` : 
                'No actions to redo';
        }
    }

    /**
     * Get undo manager statistics for debugging
     * @returns {Object} Statistics
     */
    getStatistics() {
        const navigation = this.getNavigationOptions();
        
        return {
            initialized: this.isInitialized,
            maxUndoSteps: this.maxUndoSteps,
            navigationInProgress: this.navigationInProgress,
            lastNavigationAction: this.lastNavigationAction,
            ...navigation,
            codeHistoryReady: this.codeHistory?.isReady() || false
        };
    }

    /**
     * Check if undo manager is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized && this.codeHistory?.isReady();
    }
}