// Welcome UI Controller
// Manages the welcome modal for first-time users

export class WelcomeUI {
    constructor() {
        this.isInitialized = false;
        this.localStorageKey = 'vibe-welcome-shown';
    }

    /**
     * Initialize the welcome UI
     * @returns {boolean} Success status
     */
    init() {
        try {
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('Welcome UI initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize Welcome UI:', error);
            return false;
        }
    }

    /**
     * Set up event listeners for the welcome modal
     */
    setupEventListeners() {
        // Setup API key button - opens API settings modal
        const setupApiKeyBtn = document.getElementById('setup-api-key-btn');
        if (setupApiKeyBtn) {
            setupApiKeyBtn.addEventListener('click', () => {
                this.closeWelcome();
                this.openAPISettings();
            });
        }

        // Start coding button - closes welcome modal
        const startCodingBtn = document.getElementById('start-coding-btn');
        if (startCodingBtn) {
            startCodingBtn.addEventListener('click', () => {
                this.closeWelcome();
            });
        }

        // Close on overlay click
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal) {
            const overlay = welcomeModal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => {
                    this.closeWelcome();
                });
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isWelcomeOpen()) {
                this.closeWelcome();
            }
        });
    }

    /**
     * Check if this is the user's first visit
     * @returns {boolean} True if first visit
     */
    isFirstVisit() {
        try {
            const hasSeenWelcome = localStorage.getItem(this.localStorageKey);

            // If user has a persisted dev API key, don't show welcome
            const hasDevAPIKey = localStorage.getItem('vibeInstructor_devApiKey');
            if (hasDevAPIKey) {
                return false;
            }

            return !hasSeenWelcome;
        } catch (error) {
            // If localStorage is not available, show welcome anyway
            console.warn('localStorage not available, showing welcome');
            return true;
        }
    }

    /**
     * Show the welcome modal
     */
    showWelcome() {
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal) {
            welcomeModal.classList.remove('hidden');
            
            // Focus on first interactive element
            const firstButton = welcomeModal.querySelector('button');
            if (firstButton) {
                setTimeout(() => firstButton.focus(), 100);
            }
        }
    }

    /**
     * Close the welcome modal
     */
    closeWelcome() {
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal) {
            welcomeModal.classList.add('hidden');
            
            // Check if user wants to hide welcome permanently
            const dontShowCheckbox = document.getElementById('dont-show-welcome');
            if (dontShowCheckbox && dontShowCheckbox.checked) {
                this.markWelcomeAsSeen();
            }
        }
    }

    /**
     * Check if welcome modal is currently open
     * @returns {boolean} True if welcome modal is open
     */
    isWelcomeOpen() {
        const welcomeModal = document.getElementById('welcome-modal');
        return welcomeModal && !welcomeModal.classList.contains('hidden');
    }

    /**
     * Mark welcome as seen in localStorage
     */
    markWelcomeAsSeen() {
        try {
            localStorage.setItem(this.localStorageKey, 'true');
        } catch (error) {
            console.warn('Could not save welcome preference to localStorage:', error);
        }
    }

    /**
     * Open the API settings modal (integration with existing API settings)
     */
    openAPISettings() {
        // Trigger the existing API settings functionality
        const apiSettingsBtn = document.getElementById('api-settings-btn');
        if (apiSettingsBtn) {
            apiSettingsBtn.click();
        } else {
            // Fallback: directly open the modal if button not found
            const apiModal = document.getElementById('api-settings-modal');
            if (apiModal) {
                apiModal.classList.remove('hidden');
            }
        }
    }

    /**
     * Show welcome if it's a first visit
     * Call this during app initialization
     */
    showWelcomeIfFirstVisit() {
        if (this.isFirstVisit()) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                this.showWelcome();
            }, 500);
        }
    }

    /**
     * Force show welcome (for manual trigger)
     */
    forceShowWelcome() {
        this.showWelcome();
    }

    /**
     * Reset welcome preference (for testing/development)
     */
    resetWelcomePreference() {
        try {
            localStorage.removeItem(this.localStorageKey);
            console.log('Welcome preference reset');
        } catch (error) {
            console.warn('Could not reset welcome preference:', error);
        }
    }

    /**
     * Check if UI is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized;
    }
}

// Global function for HTML onclick handlers
window.showWelcome = function() {
    if (window.welcomeUI) {
        window.welcomeUI.forceShowWelcome();
    }
};