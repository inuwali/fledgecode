// Session Storage - Reliable persistence across browser sessions with smart recovery
// Handles session data, recovery dialogs, and storage optimization

export class SessionStorage {
    constructor() {
        this.storageKey = 'vibeInstructor_sessionData';
        this.settingsKey = 'vibeInstructor_sessionSettings';
        this.maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
        this.currentSession = null;
        this.isInitialized = false;
    }

    /**
     * Initialize session storage
     * @returns {boolean} Success status
     */
    init() {
        try {
            this.loadSettings();
            this.isInitialized = true;
            console.log('Session Storage initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize Session Storage:', error);
            return false;
        }
    }

    /**
     * Save current session data
     * @param {Object} sessionData - Session data to save
     * @returns {boolean} Success status
     */
    saveSession(sessionData) {
        if (!this.isInitialized) {
            console.warn('Session Storage not initialized');
            return false;
        }

        try {
            const sessionToSave = {
                ...sessionData,
                lastSaved: new Date().toISOString(),
                version: '1.0'
            };

            const dataString = JSON.stringify(sessionToSave);
            
            // Check data size before saving
            const dataSizeKB = new Blob([dataString]).size / 1024;
            if (dataSizeKB > 2048) { // 2MB limit
                console.warn(`Session data is large (${dataSizeKB.toFixed(1)}KB), compression may be needed`);
                
                // Try to compress by removing old history entries
                if (sessionData.codeHistory && sessionData.codeHistory.length > 50) {
                    sessionToSave.codeHistory = sessionData.codeHistory.slice(-50);
                    console.log('Compressed session data by limiting history');
                }
            }

            localStorage.setItem(this.storageKey, JSON.stringify(sessionToSave));
            this.currentSession = sessionToSave;
            
            console.log('💾 Session saved successfully');
            return true;

        } catch (error) {
            console.error('Failed to save session:', error);
            
            // Handle specific storage errors
            if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                console.warn('Storage quota exceeded, attempting cleanup...');
                this.handleStorageQuotaExceeded();
                
                // Try again with minimal data
                try {
                    const minimalSession = {
                        currentCode: sessionData.currentCode || '',
                        lastSaved: new Date().toISOString(),
                        version: '1.0'
                    };
                    localStorage.setItem(this.storageKey, JSON.stringify(minimalSession));
                    console.log('💾 Minimal session saved after quota cleanup');
                    return true;
                } catch (retryError) {
                    console.error('Failed to save even minimal session:', retryError);
                    this.showStorageQuotaError();
                    return false;
                }
            } else if (error.message.includes('not available') || error.message.includes('disabled')) {
                console.warn('Local storage is not available (private browsing mode?)');
                this.showStorageUnavailableWarning();
                return false;
            } else {
                console.error('Unknown storage error:', error);
                return false;
            }
        }
    }

    /**
     * Load previous session data
     * @returns {Object|null} Session data or null if none/invalid
     */
    loadSession() {
        if (!this.isInitialized) {
            console.warn('Session Storage not initialized');
            return null;
        }

        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) {
                console.log('No previous session found');
                return null;
            }

            const sessionData = JSON.parse(stored);
            
            // Validate session data structure
            if (!this.validateSessionData(sessionData)) {
                console.warn('Invalid session data structure, ignoring');
                this.clearSession();
                return null;
            }

            // Check if session is too old
            if (this.isSessionExpired(sessionData)) {
                console.log('Previous session expired, clearing');
                this.clearSession();
                return null;
            }

            console.log('📥 Previous session loaded successfully');
            this.currentSession = sessionData;
            return sessionData;

        } catch (error) {
            console.error('Failed to load session:', error);
            this.clearSession();
            return null;
        }
    }

    /**
     * Check if a valid recoverable session exists
     * @returns {boolean} True if session can be recovered
     */
    hasValidSession() {
        const sessionData = this.loadSession();
        return sessionData !== null;
    }

    /**
     * Get session recovery information for UI
     * @returns {Object|null} Recovery info or null
     */
    getRecoveryInfo() {
        const sessionData = this.loadSession();
        if (!sessionData) {
            return null;
        }

        const lastActivity = new Date(sessionData.lastActivity || sessionData.lastSaved);
        const timeAgo = this.formatTimeAgo(lastActivity);
        
        return {
            hasCode: !!(sessionData.currentCode && sessionData.currentCode.trim()),
            codePreview: this.generateCodePreview(sessionData.currentCode),
            lastActivity: timeAgo,
            conceptName: sessionData.learningContext?.currentConcept || 'Unknown',
            historyCount: sessionData.codeHistory?.length || 0,
            sessionAge: Date.now() - lastActivity.getTime()
        };
    }

    /**
     * Create current session data from app state
     * @param {Object} appState - Current application state
     * @returns {Object} Session data object
     */
    createSessionData(appState) {
        const timestamp = new Date();
        
        return {
            sessionId: this.generateSessionId(),
            startTime: timestamp.toISOString(),
            lastActivity: timestamp.toISOString(),
            currentCode: appState.currentCode || '',
            codeHistory: appState.codeHistory || [],
            learningContext: {
                currentConcept: appState.currentConcept || 'unknown',
                completedObjectives: appState.completedObjectives || [],
                detectedObjectives: appState.detectedObjectives || []
            },
            settings: {
                autoSave: appState.autoSave !== false,
                autoRun: appState.autoRun !== false,
                undoLimit: appState.undoLimit || 50
            },
            analytics: appState.analytics || null
        };
    }

    /**
     * Auto-save current state (called periodically)
     * @param {string} code - Current code
     * @param {Object} context - Current context
     */
    autoSave(code, context = {}) {
        if (!this.isInitialized || !this.getSettings().autoSave) {
            return;
        }

        try {
            // Update existing session or create new one
            const sessionData = this.currentSession || this.createSessionData({});
            
            sessionData.currentCode = code;
            sessionData.lastActivity = new Date().toISOString();
            
            // Update context if provided
            if (context.currentConcept) {
                sessionData.learningContext.currentConcept = context.currentConcept;
            }
            
            if (context.codeHistory) {
                sessionData.codeHistory = context.codeHistory;
            }

            this.saveSession(sessionData);

        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }

    /**
     * Clear current session data
     */
    clearSession() {
        try {
            localStorage.removeItem(this.storageKey);
            this.currentSession = null;
            console.log('🗑️ Session data cleared');
        } catch (error) {
            console.error('Failed to clear session:', error);
        }
    }

    /**
     * Validate session data structure
     * @param {Object} data - Session data to validate
     * @returns {boolean} True if valid
     */
    validateSessionData(data) {
        return data &&
               typeof data.sessionId === 'string' &&
               typeof data.startTime === 'string' &&
               typeof data.currentCode === 'string' &&
               Array.isArray(data.codeHistory) &&
               typeof data.learningContext === 'object';
    }

    /**
     * Check if session is expired
     * @param {Object} sessionData - Session data
     * @returns {boolean} True if expired
     */
    isSessionExpired(sessionData) {
        const lastActivity = new Date(sessionData.lastActivity || sessionData.lastSaved);
        const age = Date.now() - lastActivity.getTime();
        return age > this.maxSessionAge;
    }

    /**
     * Migrate old session format to new (for backwards compatibility)
     * @param {Object} oldData - Old format session data
     * @returns {Object} Migrated session data
     */
    migrateOldFormat(oldData) {
        // Handle migration from older versions if needed
        if (oldData.version === '1.0') {
            return oldData; // Already current format
        }

        // Migration logic for older formats would go here
        console.log('Migrating session data from older format');
        
        return {
            sessionId: oldData.sessionId || this.generateSessionId(),
            startTime: oldData.startTime || new Date().toISOString(),
            lastActivity: oldData.lastActivity || new Date().toISOString(),
            currentCode: oldData.code || oldData.currentCode || '',
            codeHistory: oldData.history || oldData.codeHistory || [],
            learningContext: oldData.learningContext || {
                currentConcept: 'unknown',
                completedObjectives: [],
                detectedObjectives: []
            },
            settings: oldData.settings || {
                autoSave: true,
                autoRun: true,
                undoLimit: 50
            },
            version: '1.0'
        };
    }

    /**
     * Compress history for storage efficiency
     * @param {Array} history - Code history array
     * @returns {Array} Compressed history
     */
    compressHistory(history) {
        if (!Array.isArray(history) || history.length <= 20) {
            return history; // No compression needed for small histories
        }

        // Keep all entries from current session
        const currentSessionId = this.getCurrentSessionId();
        const currentSessionEntries = history.filter(entry => 
            entry.sessionId === currentSessionId
        );

        // Keep major milestones from previous sessions
        const previousSessionEntries = history.filter(entry => 
            entry.sessionId !== currentSessionId
        );

        // Sample previous session entries (keep every 3rd entry)
        const sampledPrevious = previousSessionEntries.filter((entry, index) => 
            index % 3 === 0 || entry.userAction === 'save_point'
        );

        const compressed = [...currentSessionEntries, ...sampledPrevious]
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        console.log(`📦 Compressed history: ${history.length} → ${compressed.length} entries`);
        return compressed;
    }

    /**
     * Generate unique session ID
     * @returns {string} Session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get current session ID (compatible with analytics)
     * @returns {string} Current session ID
     */
    getCurrentSessionId() {
        if (this.currentSession) {
            return this.currentSession.sessionId;
        }
        
        // Try to get from analytics system
        if (typeof window !== 'undefined' && window.vibeApp?.learningAnalytics?.data?.sessionId) {
            return window.vibeApp.learningAnalytics.data.sessionId;
        }
        
        return this.generateSessionId();
    }

    /**
     * Generate code preview for UI (kept for potential future use)
     * @param {string} code - Full code
     * @returns {string} Preview text
     */
    generateCodePreview(code) {
        if (!code || !code.trim()) {
            return 'Empty sketch';
        }

        // Simple preview showing just the code as-is
        return code;
    }

    /**
     * Format time ago for UI display
     * @param {Date} date - Date to format
     * @returns {string} Formatted time
     */
    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        } else {
            return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        }
    }

    /**
     * Get storage usage statistics
     * @returns {Object} Storage stats
     */
    getStorageStats() {
        try {
            const sessionData = localStorage.getItem(this.storageKey);
            const sessionSize = sessionData ? sessionData.length : 0;
            
            // Calculate total localStorage usage
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }

            return {
                sessionSize: sessionSize,
                sessionSizeKB: Math.round(sessionSize / 1024),
                totalSize: totalSize,
                totalSizeKB: Math.round(totalSize / 1024),
                maxSize: 5 * 1024 * 1024, // 5MB typical limit
                usagePercentage: Math.round((totalSize / (5 * 1024 * 1024)) * 100)
            };

        } catch (error) {
            return {
                sessionSize: 0,
                sessionSizeKB: 0,
                totalSize: 0,
                totalSizeKB: 0,
                maxSize: 5 * 1024 * 1024,
                usagePercentage: 0,
                error: error.message
            };
        }
    }

    /**
     * Load session settings
     */
    loadSettings() {
        try {
            const stored = localStorage.getItem(this.settingsKey);
            this.settings = stored ? JSON.parse(stored) : this.getDefaultSettings();
        } catch (error) {
            console.error('Failed to load session settings:', error);
            this.settings = this.getDefaultSettings();
        }
    }

    /**
     * Save session settings
     */
    saveSettings() {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save session settings:', error);
        }
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    getSettings() {
        return {
            autoSave: true,
            autoSaveInterval: 30000, // 30 seconds
            maxSessionAge: this.maxSessionAge,
            ...this.settings
        };
    }

    /**
     * Get default settings
     * @returns {Object} Default settings
     */
    getDefaultSettings() {
        return {
            autoSave: true,
            autoSaveInterval: 30000,
            showRecoveryDialog: true,
            compressHistory: true
        };
    }

    /**
     * Update setting value
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }

    /**
     * Get session statistics for debugging
     * @returns {Object} Session statistics
     */
    getStatistics() {
        const storageStats = this.getStorageStats();
        const settings = this.getSettings();
        
        return {
            initialized: this.isInitialized,
            hasCurrentSession: !!this.currentSession,
            currentSessionId: this.getCurrentSessionId(),
            storageStats,
            settings,
            maxSessionAge: this.maxSessionAge,
            hasValidSession: this.hasValidSession()
        };
    }

    /**
     * Check if session storage is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Handle storage quota exceeded error
     */
    handleStorageQuotaExceeded() {
        try {
            // Clear error logs first
            localStorage.removeItem('vibe_error_log');
            
            // Clear old session data (keep only current)
            const keys = Object.keys(localStorage);
            const oldSessions = keys.filter(key => 
                key.startsWith('vibeInstructor_') && 
                key !== this.storageKey && 
                key !== this.settingsKey
            );
            
            oldSessions.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    // Ignore individual removal errors
                }
            });
            
            console.log(`🧹 Cleaned up ${oldSessions.length} old storage items`);
            
        } catch (error) {
            console.error('Failed to handle storage quota exceeded:', error);
        }
    }

    /**
     * Show storage quota error to user
     */
    showStorageQuotaError() {
        const notification = document.createElement('div');
        notification.className = 'storage-quota-error';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <span>💾 Storage Full</span>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="notification-message">
                    Your browser's storage is full. Your work may not be saved automatically. 
                    Consider exporting your code to save it manually.
                </div>
                <div class="notification-actions">
                    <button onclick="window.app?.importExport?.exportCode(window.app?.editor?.getValue() || '')">Export Code</button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">Continue</button>
                </div>
            </div>
        `;
        
        this.addNotificationStyles();
        document.body.appendChild(notification);
    }

    /**
     * Show storage unavailable warning
     */
    showStorageUnavailableWarning() {
        const notification = document.createElement('div');
        notification.className = 'storage-unavailable-warning';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <span>🔒 Private Browsing Mode</span>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="notification-message">
                    Your work will not be saved between sessions in private browsing mode. 
                    Consider switching to regular browsing or export your code manually.
                </div>
                <div class="notification-actions">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()">Continue</button>
                </div>
            </div>
        `;
        
        this.addNotificationStyles();
        document.body.appendChild(notification);
    }

    /**
     * Add notification styles if not present
     */
    addNotificationStyles() {
        if (document.getElementById('storage-notification-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'storage-notification-styles';
        styles.textContent = `
            .storage-quota-error, .storage-unavailable-warning {
                position: fixed;
                top: 70px;
                right: 20px;
                max-width: 400px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 10000;
                font-family: Arial, sans-serif;
                border-left: 4px solid #f44336;
            }
            .storage-unavailable-warning {
                border-left-color: #ff9800;
            }
            .notification-content { padding: 15px; }
            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                font-weight: bold;
                font-size: 14px;
            }
            .notification-header button {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                color: #666;
            }
            .notification-message {
                font-size: 13px;
                color: #666;
                margin-bottom: 15px;
                line-height: 1.4;
            }
            .notification-actions {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            .notification-actions button {
                padding: 6px 12px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            .notification-actions button:hover {
                background: #f5f5f5;
            }
        `;
        document.head.appendChild(styles);
    }
}