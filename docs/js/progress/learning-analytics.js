// Learning Analytics - Pure event history tracking
// Records what happened and when, with no derived state calculations

export class LearningAnalytics {
    constructor() {
        this.data = {
            sessionId: this.generateSessionId(),
            startTime: new Date().toISOString(),
            detectionEvents: [],    // Every time an objective is detected in code
            masteryEvents: [],      // Every time user marks objective as mastered
            conceptChangeEvents: [], // Every time user changes current concept
            userGoals: []           // Track user requests/goals for LLM context
        };
        this.storageKey = 'vibeInstructor_learningAnalytics';
        this.isInitialized = false;
    }

    /**
     * Initialize analytics - load existing history or create new
     * @returns {boolean} Success status
     */
    init() {
        try {
            this.load();
            this.isInitialized = true;
            console.log('Learning Analytics initialized with', this.data.detectionEvents.length, 'detection events');
            return true;
        } catch (error) {
            console.error('Failed to initialize Learning Analytics:', error);
            return false;
        }
    }

    /**
     * Record an objective detection event
     * @param {string} objectiveId - ID of detected objective
     * @param {string} objectiveName - Name of detected objective (for display)
     * @param {string} conceptId - Concept the objective belongs to
     * @param {string} code - Code snippet where objective was detected
     */
    recordDetection(objectiveId, objectiveName, conceptId, code) {
        if (!this.isInitialized) {
            console.warn('Learning Analytics not initialized');
            return;
        }

        const event = {
            objectiveId,
            objectiveName, // Keep for display purposes
            conceptId,
            timestamp: new Date().toISOString(),
            codeSnippet: this.truncateCode(code), // Limit storage size
            sessionId: this.data.sessionId
        };

        this.data.detectionEvents.push(event);
        this.save();
        
        console.log(`📊 Recorded detection: ${objectiveName} (total: ${this.getDetectionCount(objectiveId)})`);
    }

    /**
     * Record an objective mastery event
     * @param {string} objectiveId - ID of mastered objective
     * @param {string} objectiveName - Name of mastered objective (for display)
     * @param {string} conceptId - Concept the objective belongs to
     */
    recordMastery(objectiveId, objectiveName, conceptId) {
        if (!this.isInitialized) {
            console.warn('Learning Analytics not initialized');
            return;
        }

        const event = {
            objectiveId,
            objectiveName, // Keep for display purposes
            conceptId,
            timestamp: new Date().toISOString(),
            sessionId: this.data.sessionId
        };

        this.data.masteryEvents.push(event);
        this.save();
        
        console.log(`✅ Recorded mastery: ${objectiveName}`);
    }

    /**
     * Remove mastery event (when user unmarks objective)
     * @param {string} objectiveId - ID of objective to unmask
     * @param {string} objectiveName - Name of objective (for display)
     * @param {string} conceptId - Concept the objective belongs to
     */
    removeMastery(objectiveId, objectiveName, conceptId) {
        if (!this.isInitialized) {
            console.warn('Learning Analytics not initialized');
            return;
        }

        // Remove the most recent mastery event for this objective
        const eventIndex = this.data.masteryEvents.findLastIndex(
            event => event.objectiveId === objectiveId && event.conceptId === conceptId
        );

        if (eventIndex !== -1) {
            this.data.masteryEvents.splice(eventIndex, 1);
            this.save();
            console.log(`❌ Removed mastery: ${objectiveName}`);
        }
    }

    /**
     * Record a concept change event
     * @param {string} fromConceptId - Previous concept (null if first)
     * @param {string} toConceptId - New concept
     */
    recordConceptChange(fromConceptId, toConceptId) {
        if (!this.isInitialized) {
            console.warn('Learning Analytics not initialized');
            return;
        }

        const event = {
            fromConceptId,
            toConceptId,
            timestamp: new Date().toISOString(),
            sessionId: this.data.sessionId
        };

        this.data.conceptChangeEvents.push(event);
        this.save();
        
        console.log(`🔄 Recorded concept change: ${fromConceptId} → ${toConceptId}`);
    }

    /**
     * Get total detection count for an objective across all sessions
     * @param {string} objectiveId - Objective ID
     * @returns {number} Total detection count
     */
    getDetectionCount(objectiveId) {
        return this.data.detectionEvents.filter(
            event => event.objectiveId === objectiveId
        ).length;
    }

    /**
     * Check if objective has been manually mastered
     * @param {string} objectiveId - Objective ID
     * @returns {boolean} True if mastered
     */
    isObjectiveMastered(objectiveId) {
        return this.data.masteryEvents.some(
            event => event.objectiveId === objectiveId
        );
    }

    /**
     * Get all detection events for an objective (for debugging/analysis)
     * @param {string} objectiveId - Objective ID
     * @returns {Array} Detection events
     */
    getObjectiveHistory(objectiveId) {
        return this.data.detectionEvents.filter(
            event => event.objectiveId === objectiveId
        );
    }

    /**
     * Get detection events for current session only
     * @returns {Array} Current session detection events
     */
    getCurrentSessionDetections() {
        return this.data.detectionEvents.filter(
            event => event.sessionId === this.data.sessionId
        );
    }

    /**
     * Get analytics summary for debugging
     * @returns {Object} Analytics summary
     */
    getSummary() {
        const uniqueObjectives = new Set(
            this.data.detectionEvents.map(event => event.objectiveId || event.objectiveName)
        );
        
        const masteredObjectives = new Set(
            this.data.masteryEvents.map(event => event.objectiveId || event.objectiveName)
        );

        return {
            totalDetections: this.data.detectionEvents.length,
            uniqueObjectivesPracticed: uniqueObjectives.size,
            totalMasteryEvents: this.data.masteryEvents.length,
            uniqueObjectivesMastered: masteredObjectives.size,
            conceptChanges: this.data.conceptChangeEvents.length,
            currentSessionDetections: this.getCurrentSessionDetections().length,
            sessionId: this.data.sessionId,
            sessionStartTime: this.data.startTime
        };
    }

    /**
     * Record a user goal/request for LLM context
     * @param {string} goalText - User's request text
     */
    recordUserGoal(goalText) {
        if (!this.isInitialized) {
            console.warn('Learning Analytics not initialized');
            return;
        }

        const event = {
            goal: goalText.trim(),
            timestamp: new Date().toISOString(),
            sessionId: this.data.sessionId
        };

        this.data.userGoals.push(event);
        
        // Keep only recent goals (last 10 to avoid storage bloat)
        if (this.data.userGoals.length > 10) {
            this.data.userGoals = this.data.userGoals.slice(-10);
        }
        
        this.save();
        console.log(`🎯 Recorded user goal: "${goalText.substring(0, 50)}..."`);
    }

    /**
     * Get recent user goals for LLM context
     * @param {number} limit - Maximum number of recent goals to return
     * @returns {Array<string>} Array of recent goal texts
     */
    getRecentUserGoals(limit = 5) {
        if (!Array.isArray(this.data.userGoals)) {
            return [];
        }

        // Filter goals from current session within last 15 minutes
        const fifteenMinutesAgo = Date.now() - (15 * 60 * 1000);
        
        return this.data.userGoals
            .filter(goal => goal.sessionId === this.data.sessionId)
            .filter(goal => new Date(goal.timestamp).getTime() > fifteenMinutesAgo)
            .slice(-limit)
            .map(goal => goal.goal);
    }

    /**
     * Get session duration in minutes
     * @returns {number} Session duration in minutes
     */
    getSessionDuration() {
        const startTime = new Date(this.data.startTime).getTime();
        const now = Date.now();
        return Math.round((now - startTime) / (1000 * 60));
    }

    /**
     * Export all analytics data (for debugging or backup)
     * @returns {Object} Complete analytics data
     */
    exportData() {
        return {
            ...this.data,
            exportedAt: new Date().toISOString(),
            summary: this.getSummary()
        };
    }

    /**
     * Clear all analytics data (for testing/reset)
     */
    clearData() {
        this.data = {
            sessionId: this.generateSessionId(),
            startTime: new Date().toISOString(),
            detectionEvents: [],
            masteryEvents: [],
            conceptChangeEvents: [],
            userGoals: []
        };
        this.save();
        console.log('🗑️ Analytics data cleared');
    }

    /**
     * Generate unique session identifier
     * @returns {string} Session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Truncate code snippet for storage efficiency
     * @param {string} code - Full code
     * @returns {string} Truncated code
     */
    truncateCode(code) {
        const maxLength = 200; // Reasonable limit for storage
        if (code.length <= maxLength) return code;
        
        return code.substring(0, maxLength) + '...';
    }

    /**
     * Save analytics data to localStorage
     */
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (error) {
            console.error('Failed to save analytics data:', error);
        }
    }

    /**
     * Load analytics data from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                
                // Validate structure
                if (this.validateData(parsed)) {
                    this.data = parsed;
                    
                    // Start new session but keep existing data
                    this.data.sessionId = this.generateSessionId();
                    this.data.startTime = new Date().toISOString();
                    
                    // Ensure userGoals array exists for older data
                    if (!Array.isArray(this.data.userGoals)) {
                        this.data.userGoals = [];
                    }
                    
                    console.log('Loaded existing analytics data');
                } else {
                    console.warn('Invalid analytics data structure, starting fresh');
                    this.clearData();
                }
            } else {
                console.log('No existing analytics data, starting fresh');
            }
        } catch (error) {
            console.error('Failed to load analytics data:', error);
            this.clearData();
        }
    }

    /**
     * Validate analytics data structure
     * @param {Object} data - Data to validate
     * @returns {boolean} Valid structure
     */
    validateData(data) {
        return data &&
               Array.isArray(data.detectionEvents) &&
               Array.isArray(data.masteryEvents) &&
               Array.isArray(data.conceptChangeEvents) &&
               typeof data.sessionId === 'string';
    }

    /**
     * Check if analytics is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized;
    }
}