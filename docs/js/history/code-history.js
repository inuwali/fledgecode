// Code History - Track code evolution over time
// Captures code states with context for undo/redo and learning analytics

export class CodeHistory {
    constructor() {
        this.entries = new Map(); // Map<id, CodeHistoryEntry>
        this.timeline = [];       // Array of entry IDs in chronological order
        this.currentEntryId = null;
        this.maxEntries = 100;    // Configurable history limit
        this.storageKey = 'vibeInstructor_codeHistory';
        this.isInitialized = false;
    }

    /**
     * Initialize code history - load existing or create new
     * @returns {boolean} Success status
     */
    init() {
        try {
            this.load();
            this.isInitialized = true;
            console.log('Code History initialized with', this.timeline.length, 'entries');
            return true;
        } catch (error) {
            console.error('Failed to initialize Code History:', error);
            return false;
        }
    }

    /**
     * Capture current code state
     * @param {string} code - Code content
     * @param {string} userAction - What triggered this state ("edit", "generate", "undo", "redo", "format")
     * @param {string} changeType - Type of change ("manual", "ai_generated", "format", "restore")
     * @param {Object} context - Additional context (conceptId, sessionId, etc.)
     * @returns {Object} Created history entry
     */
    captureState(code, userAction = 'edit', changeType = 'manual', context = {}) {
        if (!this.isInitialized) {
            console.warn('Code History not initialized');
            return null;
        }

        // Skip capture if code hasn't changed
        if (this.isDuplicateState(code)) {
            return this.getCurrentEntry();
        }

        // Create history entry
        const entry = this.createHistoryEntry(code, userAction, changeType, context);
        
        // Add to history - but first handle branching from undo state
        this.entries.set(entry.id, entry);
        
        // If we're not at the end of the timeline (i.e., we've undone some operations),
        // truncate the timeline to create a new branch and remove unreachable states
        if (this.currentEntryId) {
            const currentIndex = this.timeline.indexOf(this.currentEntryId);
            if (currentIndex >= 0 && currentIndex < this.timeline.length - 1) {
                // We're in the middle of the timeline - truncate it
                const removedIds = this.timeline.splice(currentIndex + 1);
                
                // Remove the orphaned entries from the map
                removedIds.forEach(id => {
                    this.entries.delete(id);
                });
                
                console.log(`🔀 Branched from timeline, removed ${removedIds.length} unreachable states`);
            }
        }
        
        this.timeline.push(entry.id);
        this.currentEntryId = entry.id;

        // Prune old entries if needed
        this.pruneOldHistory();

        // Save to storage
        this.save();

        console.log(`📜 Captured code state: ${userAction} (${entry.id})`);
        return entry;
    }

    /**
     * Create a history entry object
     * @param {string} code - Code content
     * @param {string} userAction - User action
     * @param {string} changeType - Change type
     * @param {Object} context - Additional context
     * @returns {Object} History entry
     */
    createHistoryEntry(code, userAction, changeType, context) {
        const timestamp = new Date();
        const id = this.generateEntryId(timestamp);

        return {
            id,
            code,
            timestamp: timestamp.toISOString(),
            userAction,
            changeType,
            sessionId: context.sessionId || this.getCurrentSessionId(),
            conceptId: context.conceptId || 'unknown',
            characterCount: code.length,
            lineCount: code.split('\n').length,
            hasErrors: context.hasErrors || false,
            preview: this.generatePreview(code),
            checksum: this.generateChecksum(code)
        };
    }

    /**
     * Check if code state is duplicate of current
     * @param {string} code - Code to check
     * @returns {boolean} True if duplicate
     */
    isDuplicateState(code) {
        const currentEntry = this.getCurrentEntry();
        if (!currentEntry) return false;

        // Compare checksums for efficiency
        const newChecksum = this.generateChecksum(code);
        return currentEntry.checksum === newChecksum;
    }

    /**
     * Get current history entry
     * @returns {Object|null} Current entry
     */
    getCurrentEntry() {
        if (!this.currentEntryId) return null;
        return this.entries.get(this.currentEntryId) || null;
    }

    /**
     * Get history entry by ID
     * @param {string} id - Entry ID
     * @returns {Object|null} History entry
     */
    getStateById(id) {
        return this.entries.get(id) || null;
    }

    /**
     * Get chronological history timeline
     * @param {number} limit - Optional limit on entries returned
     * @returns {Array} Timeline of history entries
     */
    getHistoryTimeline(limit = null) {
        let timelineIds = [...this.timeline];
        
        if (limit && limit > 0) {
            timelineIds = timelineIds.slice(-limit);
        }

        return timelineIds.map(id => this.entries.get(id)).filter(Boolean);
    }

    /**
     * Get recent history entries for current session
     * @returns {Array} Recent entries
     */
    getCurrentSessionHistory() {
        const currentSessionId = this.getCurrentSessionId();
        return this.getHistoryTimeline().filter(entry => 
            entry.sessionId === currentSessionId
        );
    }

    /**
     * Calculate diff between two history states
     * @param {string} fromId - Starting state ID
     * @param {string} toId - Ending state ID
     * @returns {Object} Diff information
     */
    calculateStateDiff(fromId, toId) {
        const fromEntry = this.getStateById(fromId);
        const toEntry = this.getStateById(toId);

        if (!fromEntry || !toEntry) {
            return { error: 'Invalid state IDs' };
        }

        const fromLines = fromEntry.code.split('\n');
        const toLines = toEntry.code.split('\n');

        return {
            fromEntry: {
                id: fromEntry.id,
                timestamp: fromEntry.timestamp,
                preview: fromEntry.preview
            },
            toEntry: {
                id: toEntry.id,
                timestamp: toEntry.timestamp,
                preview: toEntry.preview
            },
            stats: {
                linesAdded: Math.max(0, toLines.length - fromLines.length),
                linesRemoved: Math.max(0, fromLines.length - toLines.length),
                charactersChanged: Math.abs(toEntry.characterCount - fromEntry.characterCount)
            },
            changes: this.calculateLineDiff(fromLines, toLines)
        };
    }

    /**
     * Calculate line-by-line diff (simplified implementation)
     * @param {Array} fromLines - Original lines
     * @param {Array} toLines - New lines
     * @returns {Array} Change information
     */
    calculateLineDiff(fromLines, toLines) {
        const changes = [];
        const maxLines = Math.max(fromLines.length, toLines.length);

        for (let i = 0; i < maxLines; i++) {
            const fromLine = fromLines[i] || '';
            const toLine = toLines[i] || '';

            if (fromLine !== toLine) {
                if (!fromLine) {
                    changes.push({
                        type: 'addition',
                        lineNumber: i + 1,
                        content: toLine
                    });
                } else if (!toLine) {
                    changes.push({
                        type: 'deletion',
                        lineNumber: i + 1,
                        content: fromLine
                    });
                } else {
                    changes.push({
                        type: 'modification',
                        lineNumber: i + 1,
                        from: fromLine,
                        to: toLine
                    });
                }
            }
        }

        return changes;
    }

    /**
     * Get entries that can be used for undo operation
     * @returns {Array} Undo-able entries
     */
    getUndoableEntries() {
        const currentIndex = this.timeline.indexOf(this.currentEntryId);
        if (currentIndex <= 0) return [];

        return this.timeline.slice(0, currentIndex).map(id => 
            this.entries.get(id)
        ).filter(Boolean);
    }

    /**
     * Get entries that can be used for redo operation
     * @returns {Array} Redo-able entries
     */
    getRedoableEntries() {
        const currentIndex = this.timeline.indexOf(this.currentEntryId);
        if (currentIndex < 0 || currentIndex >= this.timeline.length - 1) return [];

        return this.timeline.slice(currentIndex + 1).map(id => 
            this.entries.get(id)
        ).filter(Boolean);
    }

    /**
     * Set current state to specific entry (for undo/redo)
     * @param {string} entryId - Entry ID to set as current
     * @returns {boolean} Success status
     */
    setCurrentState(entryId) {
        if (!this.entries.has(entryId)) {
            console.error('Cannot set current state - entry not found:', entryId);
            return false;
        }

        this.currentEntryId = entryId;
        this.save();
        return true;
    }

    /**
     * Prune old history entries to manage memory
     */
    pruneOldHistory() {
        if (this.timeline.length <= this.maxEntries) return;

        const entriesToRemove = this.timeline.length - this.maxEntries;
        const removedIds = this.timeline.splice(0, entriesToRemove);

        // Remove entries from map
        removedIds.forEach(id => {
            this.entries.delete(id);
        });

        console.log(`🗑️ Pruned ${entriesToRemove} old history entries`);
    }

    /**
     * Export history data for backup or analysis
     * @returns {Object} Export data
     */
    exportHistory() {
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            currentEntryId: this.currentEntryId,
            timeline: [...this.timeline],
            entries: Object.fromEntries(this.entries),
            stats: {
                totalEntries: this.timeline.length,
                sessionCount: new Set(Array.from(this.entries.values()).map(e => e.sessionId)).size,
                dateRange: this.getDateRange()
            }
        };
    }

    /**
     * Import history data
     * @param {Object} data - Import data
     * @returns {boolean} Success status
     */
    importHistory(data) {
        try {
            if (!this.validateImportData(data)) {
                throw new Error('Invalid import data structure');
            }

            this.entries = new Map(Object.entries(data.entries));
            this.timeline = [...data.timeline];
            this.currentEntryId = data.currentEntryId;

            this.save();
            console.log('📥 Imported history with', this.timeline.length, 'entries');
            return true;

        } catch (error) {
            console.error('Failed to import history:', error);
            return false;
        }
    }

    /**
     * Clear all history (for reset/testing)
     */
    clearHistory() {
        this.entries.clear();
        this.timeline = [];
        this.currentEntryId = null;
        this.save();
        console.log('🗑️ Code history cleared');
    }

    /**
     * Generate unique entry ID
     * @param {Date} timestamp - Entry timestamp
     * @returns {string} Unique ID
     */
    generateEntryId(timestamp) {
        return 'entry_' + timestamp.getTime() + '_' + Math.random().toString(36).substr(2, 6);
    }

    /**
     * Generate code preview for UI display
     * @param {string} code - Full code
     * @returns {string} Preview text
     */
    generatePreview(code) {
        const firstLine = code.split('\n')[0] || '';
        const maxLength = 50;
        
        if (firstLine.length <= maxLength) {
            return firstLine;
        }
        
        return firstLine.substring(0, maxLength) + '...';
    }

    /**
     * Generate checksum for duplicate detection
     * @param {string} code - Code content
     * @returns {string} Checksum
     */
    generateChecksum(code) {
        // Simple hash function for duplicate detection
        let hash = 0;
        for (let i = 0; i < code.length; i++) {
            const char = code.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Get current session ID (compatible with analytics system)
     * @returns {string} Session ID
     */
    getCurrentSessionId() {
        // Try to get from analytics system if available
        if (typeof window !== 'undefined' && window.vibeApp?.learningAnalytics?.data?.sessionId) {
            return window.vibeApp.learningAnalytics.data.sessionId;
        }
        
        // Fallback to timestamp-based ID
        return 'session_' + Date.now();
    }

    /**
     * Get date range of history entries
     * @returns {Object} Date range info
     */
    getDateRange() {
        if (this.timeline.length === 0) {
            return { start: null, end: null, span: '0 minutes' };
        }

        const entries = this.timeline.map(id => this.entries.get(id)).filter(Boolean);
        const timestamps = entries.map(e => new Date(e.timestamp));
        
        const start = new Date(Math.min(...timestamps));
        const end = new Date(Math.max(...timestamps));
        const spanMs = end.getTime() - start.getTime();
        const spanMinutes = Math.round(spanMs / (1000 * 60));

        return {
            start: start.toISOString(),
            end: end.toISOString(),
            span: spanMinutes < 60 ? `${spanMinutes} minutes` : `${Math.round(spanMinutes / 60)} hours`
        };
    }

    /**
     * Validate import data structure
     * @param {Object} data - Data to validate
     * @returns {boolean} Valid structure
     */
    validateImportData(data) {
        return data &&
               typeof data.version === 'string' &&
               Array.isArray(data.timeline) &&
               typeof data.entries === 'object' &&
               data.timeline.every(id => data.entries[id]);
    }

    /**
     * Save history to localStorage
     */
    save() {
        try {
            const data = {
                currentEntryId: this.currentEntryId,
                timeline: this.timeline,
                entries: Object.fromEntries(this.entries),
                lastSaved: new Date().toISOString()
            };

            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save code history:', error);
        }
    }

    /**
     * Load history from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                
                if (this.validateStoredData(data)) {
                    this.entries = new Map(Object.entries(data.entries || {}));
                    this.timeline = data.timeline || [];
                    this.currentEntryId = data.currentEntryId || null;
                    
                    console.log('Loaded existing code history');
                } else {
                    console.warn('Invalid code history data, starting fresh');
                    this.clearHistory();
                }
            } else {
                console.log('No existing code history, starting fresh');
            }
        } catch (error) {
            console.error('Failed to load code history:', error);
            this.clearHistory();
        }
    }

    /**
     * Validate stored data structure
     * @param {Object} data - Stored data
     * @returns {boolean} Valid structure
     */
    validateStoredData(data) {
        return data &&
               Array.isArray(data.timeline) &&
               typeof data.entries === 'object';
    }

    /**
     * Get history statistics for debugging
     * @returns {Object} Statistics
     */
    getStatistics() {
        const entries = Array.from(this.entries.values());
        const sessions = new Set(entries.map(e => e.sessionId));
        const concepts = new Set(entries.map(e => e.conceptId));
        const actions = new Set(entries.map(e => e.userAction));

        return {
            totalEntries: this.timeline.length,
            currentEntryId: this.currentEntryId,
            sessionsCount: sessions.size,
            conceptsCount: concepts.size,
            actionTypes: Array.from(actions),
            storageSize: this.getStorageSize(),
            memoryUsage: this.getMemoryUsage(),
            dateRange: this.getDateRange()
        };
    }

    /**
     * Get storage size in bytes
     * @returns {number} Storage size
     */
    getStorageSize() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? stored.length : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get memory usage estimate
     * @returns {Object} Memory usage info
     */
    getMemoryUsage() {
        const entriesSize = Array.from(this.entries.values())
            .reduce((total, entry) => total + entry.code.length, 0);
        
        return {
            entriesBytes: entriesSize,
            entriesKB: Math.round(entriesSize / 1024),
            averageEntrySize: Math.round(entriesSize / this.timeline.length) || 0
        };
    }

    /**
     * Import a single history entry (for project imports)
     * @param {Object} entry - History entry to import
     * @returns {boolean} Success status
     */
    importEntry(entry) {
        if (!this.isInitialized) {
            console.warn('Code History not initialized');
            return false;
        }

        try {
            // Validate entry structure
            if (!entry || !entry.id || !entry.code || !entry.timestamp) {
                console.warn('Invalid history entry for import:', entry);
                return false;
            }

            // Check if entry already exists
            if (this.entries[entry.id]) {
                console.log('History entry already exists, skipping:', entry.id);
                return true;
            }

            // Add to entries
            this.entries[entry.id] = entry;
            
            // Add to timeline if not already there
            if (!this.timeline.includes(entry.id)) {
                // Insert in chronological order
                const entryTime = new Date(entry.timestamp).getTime();
                let insertIndex = this.timeline.length;
                
                for (let i = this.timeline.length - 1; i >= 0; i--) {
                    const existingEntry = this.entries[this.timeline[i]];
                    const existingTime = new Date(existingEntry.timestamp).getTime();
                    
                    if (entryTime > existingTime) {
                        insertIndex = i + 1;
                        break;
                    }
                    insertIndex = i;
                }
                
                this.timeline.splice(insertIndex, 0, entry.id);
            }

            console.log(`📥 Imported history entry: ${entry.id}`);
            return true;

        } catch (error) {
            console.error('Failed to import history entry:', error);
            return false;
        }
    }

    /**
     * Check if history is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized;
    }
}