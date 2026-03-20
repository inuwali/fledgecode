// Comprehensive Error Handling System
// Provides centralized error handling, recovery strategies, and user guidance

export class ErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.recoveryStrategies = new Map();
        this.userNotifications = new Set();
        this.lastErrors = [];
        this.maxErrorHistory = 10;
        
        // Track application state to improve error filtering
        this.isInitializing = true;
        this.isAutoRunning = false;
        this.recentCodeExecution = false;
        
        this.initializeRecoveryStrategies();
        this.setupGlobalErrorHandling();
    }

    /**
     * Initialize recovery strategies for different error types
     */
    initializeRecoveryStrategies() {
        // CDN loading failures
        this.recoveryStrategies.set('cdn_failure', {
            monaco: () => this.fallbackToTextarea(),
            p5js: () => this.showCanvasUnavailable(),
            network: () => this.showOfflineMode()
        });

        // Storage failures
        this.recoveryStrategies.set('storage_failure', {
            quota_exceeded: () => this.handleStorageQuotaExceeded(),
            permission_denied: () => this.showStoragePermissionGuidance(),
            corrupted_data: () => this.handleCorruptedData()
        });

        // File operation failures
        this.recoveryStrategies.set('file_failure', {
            large_file: () => this.handleLargeFile(),
            malformed_file: () => this.handleMalformedFile(),
            unsupported_format: () => this.showFormatGuidance()
        });

        // API failures
        this.recoveryStrategies.set('api_failure', {
            network_error: () => this.handleNetworkError(),
            auth_error: () => this.handleAuthError(),
            rate_limit: () => this.handleRateLimit(),
            service_unavailable: () => this.handleServiceUnavailable()
        });
    }

    /**
     * Set up global error handling for uncaught errors
     */
    setupGlobalErrorHandling() {
        // Catch JavaScript errors (but filter out user code errors)
        window.addEventListener('error', (event) => {
            // Skip errors that are likely from user's P5.js code
            if (this.isUserCodeError(event)) {
                return; // Let the canvas execution system handle these
            }
            
            this.handleError('javascript_error', event.error, {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Catch unhandled promise rejections (but filter out expected ones)
        window.addEventListener('unhandledrejection', (event) => {
            // Skip promise rejections that are likely from user code or expected failures
            if (this.isExpectedPromiseRejection(event)) {
                return;
            }
            
            this.handleError('promise_rejection', event.reason, {
                type: 'unhandled_promise'
            });
        });

        // Catch network errors (if possible)
        this.setupNetworkErrorDetection();
    }

    /**
     * Determine if an error is from user's P5.js code (should be handled by canvas system)
     * @param {ErrorEvent} event - Error event
     * @returns {boolean} True if this is likely user code error
     */
    isUserCodeError(event) {
        const message = event.message?.toLowerCase() || '';
        const filename = event.filename || '';
        
        // Skip all syntax errors - these are always user code issues
        if (message.includes('syntax') || 
            message.includes('unexpected token') ||
            message.includes('unexpected end of input') ||
            message.includes('missing') ||
            message.includes('expected')) {
            return true;
        }
        
        // Skip reference errors for common P5.js variables/functions
        if (message.includes('reference') && (
            message.includes('mousex') || message.includes('mousey') ||
            message.includes('width') || message.includes('height') ||
            message.includes('setup') || message.includes('draw') ||
            message.includes('createcanvas') || message.includes('background') ||
            message.includes('fill') || message.includes('stroke')
        )) {
            return true;
        }
        
        // Skip errors that occur in blob: URLs (user code execution)
        if (filename.startsWith('blob:')) {
            return true;
        }
        
        // Skip errors with no filename (likely eval'd user code)
        if (!filename || filename === window.location.href) {
            return true;
        }
        
        // If we recently executed code, assume errors are from user code
        if (this.recentCodeExecution) {
            return true;
        }
        
        // During auto-run (page load, session recovery), be more lenient
        if (this.isAutoRunning || this.isInitializing) {
            // Any error that could be from user code should be filtered out
            if (message.includes('error') || 
                message.includes('undefined') ||
                message.includes('null') ||
                message.includes('not a function') ||
                message.includes('cannot read property')) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Determine if a promise rejection is expected/handled elsewhere
     * @param {PromiseRejectionEvent} event - Promise rejection event
     * @returns {boolean} True if this is an expected rejection
     */
    isExpectedPromiseRejection(event) {
        const reason = event.reason;
        
        // Skip known expected rejections
        if (reason && typeof reason === 'object') {
            const message = reason.message?.toLowerCase() || '';
            
            // Skip Monaco/CDN loading failures (handled by fallback systems)
            if (message.includes('monaco') || 
                message.includes('cdn') ||
                message.includes('network error') ||
                message.includes('loading chunk')) {
                return true;
            }
            
            // Skip API failures (handled by model manager)
            if (message.includes('fetch') && (
                message.includes('api') || 
                message.includes('vercel') ||
                message.includes('llm')
            )) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Handle system errors that should always be processed (bypass user code filtering)
     * @param {string} category - Error category
     * @param {Error|string} error - Error object or message
     * @param {Object} context - Additional context
     */
    handleSystemError(category, error, context = {}) {
        // Force system error handling (bypass normal filtering)
        this.handleError(category, error, { ...context, isSystemError: true });
    }

    /**
     * Main error handling method
     * @param {string} category - Error category
     * @param {Error|string} error - Error object or message
     * @param {Object} context - Additional context
     */
    handleError(category, error, context = {}) {
        const errorInfo = {
            category,
            error: error instanceof Error ? error : new Error(String(error)),
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        // Log error
        this.logError(errorInfo);

        // Increment error count
        const key = `${category}_${errorInfo.error.message}`;
        this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

        // Attempt recovery
        this.attemptRecovery(category, errorInfo);

        // Show user notification (if appropriate)
        this.showUserNotification(errorInfo);
    }

    /**
     * Log error for debugging and analysis
     * @param {Object} errorInfo - Structured error information
     */
    logError(errorInfo) {
        console.error(`[${errorInfo.category}]`, errorInfo.error, errorInfo.context);
        
        // Add to history
        this.lastErrors.unshift(errorInfo);
        if (this.lastErrors.length > this.maxErrorHistory) {
            this.lastErrors.pop();
        }

        // Store in localStorage for debugging (limit size)
        try {
            const errorLog = JSON.parse(localStorage.getItem('vibe_error_log') || '[]');
            errorLog.unshift({
                category: errorInfo.category,
                message: errorInfo.error.message,
                timestamp: errorInfo.timestamp,
                context: errorInfo.context
            });
            
            // Keep only last 20 errors
            if (errorLog.length > 20) {
                errorLog.splice(20);
            }
            
            localStorage.setItem('vibe_error_log', JSON.stringify(errorLog));
        } catch (e) {
            // Ignore localStorage errors when logging errors
        }
    }

    /**
     * Attempt automatic recovery based on error category
     * @param {string} category - Error category
     * @param {Object} errorInfo - Error information
     */
    attemptRecovery(category, errorInfo) {
        const strategies = this.recoveryStrategies.get(category);
        if (!strategies) return false;

        const specificStrategy = this.identifySpecificStrategy(category, errorInfo);
        if (specificStrategy && strategies[specificStrategy]) {
            try {
                strategies[specificStrategy]();
                console.log(`Recovery attempted for ${category}:${specificStrategy}`);
                return true;
            } catch (recoveryError) {
                console.error('Recovery strategy failed:', recoveryError);
            }
        }

        return false;
    }

    /**
     * Identify specific recovery strategy based on error details
     * @param {string} category - Error category
     * @param {Object} errorInfo - Error information
     * @returns {string|null} Strategy name
     */
    identifySpecificStrategy(category, errorInfo) {
        const message = errorInfo.error.message.toLowerCase();
        
        if (category === 'cdn_failure') {
            if (message.includes('monaco')) return 'monaco';
            if (message.includes('p5') || message.includes('p5.js')) return 'p5js';
            return 'network';
        }
        
        if (category === 'storage_failure') {
            if (message.includes('quota') || message.includes('storage')) return 'quota_exceeded';
            if (message.includes('permission') || message.includes('denied')) return 'permission_denied';
            if (message.includes('corrupt') || message.includes('invalid')) return 'corrupted_data';
        }
        
        if (category === 'api_failure') {
            if (message.includes('network') || message.includes('fetch')) return 'network_error';
            if (message.includes('auth') || message.includes('unauthorized')) return 'auth_error';
            if (message.includes('rate') || message.includes('limit')) return 'rate_limit';
            if (message.includes('unavailable') || message.includes('503')) return 'service_unavailable';
        }
        
        return null;
    }

    /**
     * Show appropriate user notification for error
     * @param {Object} errorInfo - Error information
     */
    showUserNotification(errorInfo) {
        const notificationKey = `${errorInfo.category}_${errorInfo.error.name}`;
        
        // Avoid duplicate notifications
        if (this.userNotifications.has(notificationKey)) return;
        this.userNotifications.add(notificationKey);
        
        const notification = this.createErrorNotification(errorInfo);
        if (notification) {
            this.displayNotification(notification);
        }
    }

    /**
     * Create user-friendly error notification
     * @param {Object} errorInfo - Error information
     * @returns {Object|null} Notification object
     */
    createErrorNotification(errorInfo) {
        const templates = {
            cdn_failure: {
                title: '🔄 Loading Issue Detected',
                message: 'Some features may be temporarily unavailable. The app will continue with basic functionality.',
                type: 'warning',
                actions: [
                    { text: 'Retry', action: () => window.location.reload() },
                    { text: 'Continue', action: () => this.dismissNotification(errorInfo.category) }
                ]
            },
            storage_failure: {
                title: '💾 Storage Issue',
                message: 'Unable to save your progress. Your work may not be preserved between sessions.',
                type: 'warning',
                actions: [
                    { text: 'Export Work', action: () => this.triggerEmergencyExport() },
                    { text: 'Continue', action: () => this.dismissNotification(errorInfo.category) }
                ]
            },
            api_failure: {
                title: '🤖 AI Assistant Unavailable',
                message: 'Code generation is temporarily unavailable. You can still code manually.',
                type: 'info',
                actions: [
                    { text: 'Retry', action: () => this.retryLastAPICall() },
                    { text: 'Continue', action: () => this.dismissNotification(errorInfo.category) }
                ]
            },
            javascript_error: {
                title: '⚠️ Unexpected Error',
                message: 'Something went wrong. The app will try to recover automatically.',
                type: 'error',
                actions: [
                    { text: 'Report Issue', action: () => this.openIssueReporter(errorInfo) },
                    { text: 'Reload', action: () => window.location.reload() }
                ]
            }
        };

        return templates[errorInfo.category] || null;
    }

    /**
     * Display notification to user
     * @param {Object} notification - Notification object
     */
    displayNotification(notification) {
        // Create notification element
        const notificationEl = document.createElement('div');
        notificationEl.className = `error-notification ${notification.type}`;
        notificationEl.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <span class="notification-title">${notification.title}</span>
                    <button class="notification-close" onclick="this.parentElement.parentElement.parentElement.remove()">✕</button>
                </div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-actions">
                    ${notification.actions.map(action => 
                        `<button class="notification-btn" onclick="(${action.action.toString()})()">${action.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        // Add styles if not present
        this.ensureNotificationStyles();

        // Add to DOM
        document.body.appendChild(notificationEl);

        // Auto-remove after 10 seconds for info/warning notifications
        if (notification.type !== 'error') {
            setTimeout(() => {
                if (notificationEl.parentNode) {
                    notificationEl.remove();
                }
            }, 10000);
        }
    }

    /**
     * Ensure notification styles are present
     */
    ensureNotificationStyles() {
        if (document.getElementById('error-notification-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'error-notification-styles';
        styles.textContent = `
            .error-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                max-width: 400px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 10000;
                font-family: Arial, sans-serif;
                border-left: 4px solid #ccc;
            }
            .error-notification.warning { border-left-color: #ff9800; }
            .error-notification.error { border-left-color: #f44336; }
            .error-notification.info { border-left-color: #2196f3; }
            
            .notification-content { padding: 15px; }
            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .notification-title {
                font-weight: bold;
                font-size: 14px;
            }
            .notification-close {
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
            .notification-btn {
                padding: 6px 12px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            }
            .notification-btn:hover {
                background: #f5f5f5;
            }
        `;
        document.head.appendChild(styles);
    }

    // Recovery Strategy Implementations

    /**
     * Fallback to textarea when Monaco fails to load
     */
    fallbackToTextarea() {
        const editorContainer = document.getElementById('editor');
        if (!editorContainer || editorContainer.querySelector('textarea')) return;

        const textarea = document.createElement('textarea');
        textarea.id = 'fallback-editor';
        textarea.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            padding: 10px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            resize: none;
            outline: none;
        `;
        textarea.placeholder = 'Monaco editor failed to load. Using fallback text editor.';
        
        editorContainer.innerHTML = '';
        editorContainer.appendChild(textarea);
        
        console.log('Fallback textarea editor activated');
    }

    /**
     * Show canvas unavailable message
     */
    showCanvasUnavailable() {
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) return;

        canvasContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; text-align: center; padding: 20px;">
                <div>
                    <div style="font-size: 48px; margin-bottom: 10px;">🎨</div>
                    <div style="font-weight: bold; margin-bottom: 5px;">Canvas Unavailable</div>
                    <div style="font-size: 14px;">P5.js failed to load. Try refreshing the page.</div>
                </div>
            </div>
        `;
    }

    /**
     * Handle storage quota exceeded
     */
    handleStorageQuotaExceeded() {
        // Clear old data to free up space
        try {
            // Remove error logs first
            localStorage.removeItem('vibe_error_log');
            
            // Clear old session data if present
            const keys = Object.keys(localStorage);
            const oldSessions = keys.filter(key => 
                key.startsWith('vibeInstructor_') && 
                !key.includes('sessionData') && 
                !key.includes('sessionSettings')
            );
            
            oldSessions.forEach(key => localStorage.removeItem(key));
            
            console.log('Cleared old data to free storage space');
        } catch (e) {
            console.error('Failed to clear storage:', e);
        }
    }

    /**
     * Handle corrupted localStorage data
     */
    handleCorruptedData() {
        const corruptedKeys = [];
        
        // Test each localStorage key
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('vibeInstructor_')) {
                try {
                    JSON.parse(localStorage.getItem(key));
                } catch (e) {
                    corruptedKeys.push(key);
                }
            }
        });
        
        // Remove corrupted data
        corruptedKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log(`Removed corrupted data: ${key}`);
        });
    }

    /**
     * Trigger emergency export of current work
     */
    triggerEmergencyExport() {
        try {
            const editor = window.app?.editor;
            if (editor && typeof editor.getValue === 'function') {
                const code = editor.getValue();
                const blob = new Blob([code], { type: 'text/javascript' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `emergency-backup-${Date.now()}.js`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error('Emergency export failed:', e);
        }
    }

    /**
     * Setup network error detection
     */
    setupNetworkErrorDetection() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            console.log('Network connection restored');
            this.dismissNotification('network_offline');
        });

        window.addEventListener('offline', () => {
            this.handleError('network_failure', new Error('Network connection lost'), {
                type: 'offline'
            });
        });
    }

    /**
     * Get error summary for debugging
     * @returns {Object} Error summary
     */
    getErrorSummary() {
        return {
            recentErrors: this.lastErrors,
            errorCounts: Object.fromEntries(this.errorCounts),
            activeNotifications: Array.from(this.userNotifications)
        };
    }

    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.lastErrors = [];
        this.errorCounts.clear();
        this.userNotifications.clear();
        
        try {
            localStorage.removeItem('vibe_error_log');
        } catch (e) {
            // Ignore
        }
    }

    /**
     * Dismiss notification category
     * @param {string} category - Notification category to dismiss
     */
    dismissNotification(category) {
        this.userNotifications.delete(category);
        // Remove notification elements
        document.querySelectorAll('.error-notification').forEach(el => {
            if (el.dataset.category === category) {
                el.remove();
            }
        });
    }

    /**
     * Set initialization state
     * @param {boolean} isInitializing - Whether app is initializing
     */
    setInitializing(isInitializing) {
        this.isInitializing = isInitializing;
    }

    /**
     * Set auto-run state (when code is running automatically)
     * @param {boolean} isAutoRunning - Whether code is auto-running
     */
    setAutoRunning(isAutoRunning) {
        this.isAutoRunning = isAutoRunning;
        
        // If we're starting auto-run, set recent code execution flag
        if (isAutoRunning) {
            this.recentCodeExecution = true;
            // Clear the flag after a short delay
            setTimeout(() => {
                this.recentCodeExecution = false;
            }, 2000);
        }
    }

    /**
     * Mark that code execution just occurred
     */
    markCodeExecution() {
        this.recentCodeExecution = true;
        setTimeout(() => {
            this.recentCodeExecution = false;
        }, 1000);
    }
}

// Global error handler instance
export const globalErrorHandler = new ErrorHandler();