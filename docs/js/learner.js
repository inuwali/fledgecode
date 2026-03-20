// Learner Profile System for manual progress tracking

export class LearnerProfile {
    constructor(ontologyEngine) {
        this.ontologyEngine = ontologyEngine;
        this.profile = null;
        this.storageKey = 'vibeInstructor_learnerProfile';
        this.isInitialized = false;
    }

    /**
     * Initialize or load existing learner profile
     * @returns {boolean} Success status
     */
    initializeProfile() {
        try {
            // Try to load existing profile
            const stored = this.loadProfile();
            
            if (stored && this.validateProfile(stored)) {
                this.profile = stored;
                this.updateSessionInfo();
                console.log('Loaded existing learner profile:', this.profile.id);
            } else {
                // Create new profile
                this.profile = this.createNewProfile();
                this.saveProfile();
                console.log('Created new learner profile:', this.profile.id);
            }
            
            this.isInitialized = true;
            return true;

        } catch (error) {
            console.error('Failed to initialize learner profile:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Create a new learner profile with defaults
     * @returns {Object} New profile object
     */
    createNewProfile() {
        const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        return {
            id: this.generateProfileId(),
            createdAt: now,
            lastActive: now,
            totalSessions: 1,
            concepts: {},
            currentConcept: null, // Will be set manually by user
            currentPath: null,    // Will be set manually by user
            completedObjectives: {}, // Map of conceptId -> array of completed objective IDs
            preferences: {
                pace: 'gradual',
                showObjectives: true,
                validateCode: true
            },
            statistics: {
                totalCodeRuns: 0,
                totalCodingTime: 0, // in minutes
                objectivesCompleted: 0
            }
        };
    }

    /**
     * Generate unique profile ID
     * @returns {string} Unique identifier
     */
    generateProfileId() {
        return 'learner_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Validate profile structure
     * @param {Object} profile - Profile to validate
     * @returns {boolean} Validation result
     */
    validateProfile(profile) {
        return profile && 
               profile.id && 
               profile.createdAt && 
               typeof profile.concepts === 'object' &&
               typeof profile.preferences === 'object';
    }

    /**
     * Update session information
     */
    updateSessionInfo() {
        if (!this.profile) return;

        const today = new Date().toISOString().split('T')[0];
        
        // Increment session count if new day
        if (this.profile.lastActive !== today) {
            this.profile.totalSessions += 1;
        }
        
        this.profile.lastActive = today;
        this.saveProfile();
    }

    /**
     * Manually set current learning concept
     * @param {string} conceptId - Concept identifier
     * @returns {boolean} Success status
     */
    setCurrentConcept(conceptId) {
        if (!this.isInitialized || !this.ontologyEngine.isReady()) {
            console.warn('Profile or ontology not ready');
            return false;
        }

        const concept = this.ontologyEngine.getConceptById(conceptId);
        if (!concept) {
            console.warn('Invalid concept ID:', conceptId);
            return false;
        }

        // Check if prerequisites are met
        const prerequisites = this.ontologyEngine.getPrerequisites(conceptId);
        const completedConcepts = this.getCompletedConcepts();
        
        const unmetPrereqs = prerequisites.filter(prereq => 
            !completedConcepts.includes(prereq)
        );

        if (unmetPrereqs.length > 0) {
            console.warn('Prerequisites not met for concept:', conceptId, 'Missing:', unmetPrereqs);
            return false;
        }

        // Set current concept
        this.profile.currentConcept = conceptId;

        // Initialize concept tracking if not exists
        if (!this.profile.concepts[conceptId]) {
            this.profile.concepts[conceptId] = {
                status: 'learning',
                firstSeen: new Date().toISOString().split('T')[0],
                usage: 0
            };
        } else if (this.profile.concepts[conceptId].status === 'future') {
            // Update status from future to learning
            this.profile.concepts[conceptId].status = 'learning';
            this.profile.concepts[conceptId].firstSeen = new Date().toISOString().split('T')[0];
        }

        this.saveProfile();
        console.log('Set current concept to:', conceptId);
        return true;
    }

    /**
     * Manually mark concept as completed/mastered
     * @param {string} conceptId - Concept identifier
     * @returns {boolean} Success status
     */
    markConceptCompleted(conceptId) {
        if (!this.isInitialized) {
            console.warn('Profile not initialized');
            return false;
        }

        const concept = this.ontologyEngine.getConceptById(conceptId);
        if (!concept) {
            console.warn('Invalid concept ID:', conceptId);
            return false;
        }

        // Initialize concept if not exists
        if (!this.profile.concepts[conceptId]) {
            this.profile.concepts[conceptId] = {
                status: 'mastered',
                firstSeen: new Date().toISOString().split('T')[0],
                masteredAt: new Date().toISOString().split('T')[0],
                usage: 1
            };
        } else {
            // Update existing concept
            this.profile.concepts[conceptId].status = 'mastered';
            this.profile.concepts[conceptId].masteredAt = new Date().toISOString().split('T')[0];
        }

        this.profile.statistics.objectivesCompleted += 1;
        this.saveProfile();
        
        console.log('Marked concept as completed:', conceptId);
        return true;
    }

    /**
     * Get current learning concept
     * @returns {string|null} Current concept ID
     */
    getCurrentConcept() {
        return this.profile ? this.profile.currentConcept : null;
    }

    /**
     * Get all completed concepts
     * @returns {Array} Array of completed concept IDs
     */
    getCompletedConcepts() {
        if (!this.profile || !this.profile.concepts) return [];

        return Object.entries(this.profile.concepts)
            .filter(([_, data]) => data.status === 'mastered')
            .map(([conceptId, _]) => conceptId);
    }

    /**
     * Get concepts available to learn (prerequisites met)
     * @param {boolean} allowCurrentConceptIncomplete - Whether to exclude the current concept from results
     * @returns {Array} Available concepts with metadata
     */
    getAvailableConcepts(allowCurrentConceptIncomplete = false) {
        if (!this.isInitialized || !this.ontologyEngine.isReady()) {
            return [];
        }

        const allConcepts = this.ontologyEngine.getAllConcepts();
        let completedConcepts = this.getCompletedConcepts();
        if (allowCurrentConceptIncomplete) {
            completedConcepts.push(this.profile.currentConcept);
        }
            
        return allConcepts.filter(concept => {
            if (this.profile.currentConcept === concept.id) {
                return false;
            }
            
            // If already completed, don't include
            if (completedConcepts.includes(concept.id)) {
                return false;
            }
            
            // Check if prerequisites are met
            const prerequisites = concept.prerequisites || [];
            const unmetPrereqs = prerequisites.filter(prereq => 
                !completedConcepts.includes(prereq)
            );

            return unmetPrereqs.length === 0;
        }).map(concept => ({
            ...concept,
            isAvailable: true,
            isCurrent: concept.id === this.profile.currentConcept
        }));
    }

    /**
     * Set creative pathway preference
     * @param {string} pathwayName - Name of creative pathway
     * @returns {boolean} Success status
     */
    setCreativePathway(pathwayName) {
        if (!this.isInitialized) return false;

        const pathways = this.ontologyEngine.getCreativePathways();
        if (!pathways[pathwayName]) {
            console.warn('Invalid creative pathway:', pathwayName);
            return false;
        }

        this.profile.currentPath = pathwayName;
        this.saveProfile();
        
        console.log('Set creative pathway to:', pathwayName);
        return true;
    }

    /**
     * Record concept usage (when learner uses it in code)
     * @param {string} conceptId - Concept identifier
     */
    recordConceptUsage(conceptId) {
        if (!this.isInitialized || !this.profile.concepts[conceptId]) return;

        this.profile.concepts[conceptId].usage += 1;
        
        // Don't save immediately for performance - let other operations handle saving
    }

    /**
     * Record code execution
     */
    recordCodeExecution() {
        if (!this.isInitialized) return;

        this.profile.statistics.totalCodeRuns += 1;
        
        // Update usage for current concept if set
        if (this.profile.currentConcept && this.profile.concepts[this.profile.currentConcept]) {
            this.profile.concepts[this.profile.currentConcept].usage += 1;
        }
    }

    /**
     * Get profile statistics
     * @returns {Object} Profile statistics
     */
    getStatistics() {
        if (!this.profile) return {};

        const completedCount = this.getCompletedConcepts().length;
        const availableCount = this.getAvailableConcepts().length;
        const totalConcepts = this.ontologyEngine.getAllConcepts().length;

        return {
            ...this.profile.statistics,
            conceptsCompleted: completedCount,
            conceptsAvailable: availableCount,
            totalConcepts,
            progressPercentage: Math.round((completedCount / totalConcepts) * 100),
            currentStreak: this.calculateStreak()
        };
    }

    /**
     * Calculate learning streak (days)
     * @returns {number} Streak in days
     */
    calculateStreak() {
        // Simplified streak calculation
        // In a real implementation, you'd track daily activity
        return this.profile ? this.profile.totalSessions : 0;
    }

    /**
     * Get completed objectives for a concept
     * @param {string} conceptId - Concept ID
     * @returns {Array} Array of completed objective IDs
     */
    getCompletedObjectives(conceptId) {
        if (!this.profile || !this.profile.completedObjectives) {
            return [];
        }
        return this.profile.completedObjectives[conceptId] || [];
    }

    /**
     * Set completed objectives for a concept
     * @param {string} conceptId - Concept ID
     * @param {Array} completedObjectives - Array of objective IDs
     */
    setCompletedObjectives(conceptId, completedObjectives) {
        if (!this.profile) {
            console.warn('No profile available to set completed objectives');
            return;
        }

        // Initialize completedObjectives if not present (backward compatibility)
        if (!this.profile.completedObjectives) {
            this.profile.completedObjectives = {};
        }

        this.profile.completedObjectives[conceptId] = completedObjectives;
        
        // Update statistics
        const totalCompleted = Object.values(this.profile.completedObjectives)
            .flat().length;
        this.profile.statistics.objectivesCompleted = totalCompleted;

        // Save to localStorage
        this.saveProfile();
        
        console.log(`Updated completed objectives for ${conceptId}:`, completedObjectives);
    }

    /**
     * Mark an objective as completed
     * @param {string} conceptId - Concept ID
     * @param {string} objectiveId - Objective ID
     */
    markObjectiveComplete(conceptId, objectiveId) {
        const completed = this.getCompletedObjectives(conceptId);
        if (!completed.includes(objectiveId)) {
            completed.push(objectiveId);
            this.setCompletedObjectives(conceptId, completed);
        }
    }

    /**
     * Unmark an objective as completed
     * @param {string} conceptId - Concept ID
     * @param {string} objectiveId - Objective ID
     */
    unmarkObjectiveComplete(conceptId, objectiveId) {
        const completed = this.getCompletedObjectives(conceptId);
        const updated = completed.filter(id => id !== objectiveId);
        this.setCompletedObjectives(conceptId, updated);
    }

    /**
     * Export profile data
     * @returns {string} JSON string of profile data
     */
    exportProfile() {
        if (!this.profile) return null;

        return JSON.stringify({
            ...this.profile,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        }, null, 2);
    }

    /**
     * Import profile data
     * @param {string} profileJson - JSON string of profile data
     * @returns {boolean} Success status
     */
    importProfile(profileJson) {
        try {
            const imported = JSON.parse(profileJson);
            
            if (this.validateProfile(imported)) {
                this.profile = imported;
                this.saveProfile();
                this.isInitialized = true;
                console.log('Successfully imported profile:', imported.id);
                return true;
            } else {
                console.warn('Invalid profile format for import');
                return false;
            }
        } catch (error) {
            console.error('Failed to import profile:', error);
            return false;
        }
    }

    /**
     * Reset profile (clear all progress)
     * @returns {boolean} Success status
     */
    resetProfile() {
        try {
            this.profile = this.createNewProfile();
            this.saveProfile();
            this.isInitialized = true;
            console.log('Profile reset successfully');
            return true;
        } catch (error) {
            console.error('Failed to reset profile:', error);
            return false;
        }
    }

    /**
     * Save profile to localStorage
     */
    saveProfile() {
        if (!this.profile) return;

        try {
            const profileData = {
                ...this.profile,
                lastSaved: new Date().toISOString()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(profileData));
        } catch (error) {
            console.error('Failed to save profile:', error);
        }
    }

    /**
     * Load profile from localStorage
     * @returns {Object|null} Loaded profile or null
     */
    loadProfile() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Failed to load profile:', error);
            return null;
        }
    }

    /**
     * Check if profile is ready
     * @returns {boolean} Initialization status
     */
    isReady() {
        return this.isInitialized && this.profile !== null;
    }

    /**
     * Get profile status and metadata
     * @returns {Object} Status information
     */
    getStatus() {
        if (!this.isReady()) {
            return { initialized: false };
        }

        return {
            initialized: true,
            profileId: this.profile.id,
            currentConcept: this.profile.currentConcept,
            currentPath: this.profile.currentPath,
            totalSessions: this.profile.totalSessions,
            conceptsTracked: Object.keys(this.profile.concepts).length,
            lastActive: this.profile.lastActive
        };
    }
}