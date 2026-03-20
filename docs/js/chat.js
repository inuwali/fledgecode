// Chat interface placeholder for Phase 3

export class Chat {
    constructor(containerId) {
        this.containerId = containerId;
        this.messages = [];
        this.isInitialized = false;
    }

    /**
     * Initialize chat interface (placeholder)
     */
    init() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="placeholder">
                    <p>🤖 Learning Assistant Coming Soon!</p>
                    <p>Phase 3 will add AI-powered coding help.</p>
                    <p>For now, try the example code in the editor.</p>
                </div>
            `;
            this.isInitialized = true;
        }
    }

    /**
     * Add message to chat (placeholder)
     * @param {string} message - Message content
     * @param {string} sender - 'user' or 'assistant'
     */
    addMessage(message, sender = 'user') {
        this.messages.push({
            content: message,
            sender,
            timestamp: new Date()
        });
        
        // TODO: Implement actual chat interface in Phase 3
        console.log(`Chat message from ${sender}: ${message}`);
    }

    /**
     * Get chat history
     * @returns {Array} Array of chat messages
     */
    getHistory() {
        return this.messages;
    }

    /**
     * Clear chat history
     */
    clear() {
        this.messages = [];
    }

    /**
     * Check if chat is ready
     * @returns {boolean} True if chat is initialized
     */
    isReady() {
        return this.isInitialized;
    }
}