// Progress Tracker - Calculate derived state from learning analytics history
// Provides real-time progress metrics without storing derived data

export class ProgressTracker {
    constructor(learningAnalytics, ontologyEngine) {
        this.analytics = learningAnalytics;
        this.ontologyEngine = ontologyEngine;
        this.SEEN_THRESHOLD = 3; // 3+ detections = "historically seen"
        this.isInitialized = false;
    }

    /**
     * Initialize progress tracker
     * @returns {boolean} Success status
     */
    init() {
        try {
            if (!this.analytics || !this.ontologyEngine) {
                console.error('ProgressTracker requires LearningAnalytics and OntologyEngine');
                return false;
            }

            if (!this.analytics.isReady() || !this.ontologyEngine.isReady()) {
                console.warn('Dependencies not ready yet, will retry');
                return false;
            }

            this.isInitialized = true;
            console.log('Progress Tracker initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Progress Tracker:', error);
            return false;
        }
    }

    /**
     * Check if objective has been historically "seen" (3+ total detections)
     * @param {string} objectiveId - Objective ID
     * @returns {boolean} True if objective has been seen enough times
     */
    isObjectiveHistoricallySeen(objectiveId) {
        if (!this.isInitialized) return false;
        return this.getDetectionCount(objectiveId) >= this.SEEN_THRESHOLD;
    }

    /**
     * Check if objective has been manually mastered
     * @param {string} objectiveId - Objective ID  
     * @returns {boolean} True if manually marked as mastered
     */
    isObjectiveMastered(objectiveId) {
        if (!this.isInitialized) return false;
        return this.analytics.isObjectiveMastered(objectiveId);
    }

    /**
     * Get total detection count for an objective across all sessions
     * @param {string} objectiveId - Objective ID
     * @returns {number} Total detection count
     */
    getDetectionCount(objectiveId) {
        if (!this.isInitialized) return 0;
        return this.analytics.getDetectionCount(objectiveId);
    }

    /**
     * Get current session detection count for an objective
     * @param {string} objectiveId - Objective ID
     * @returns {number} Current session detection count
     */
    getCurrentSessionDetectionCount(objectiveId) {
        if (!this.isInitialized) return 0;
        
        const sessionDetections = this.analytics.getCurrentSessionDetections();
        return sessionDetections.filter(event => event.objectiveId === objectiveId).length;
    }

    /**
     * Calculate progress metrics for a specific concept
     * @param {string} conceptId - Concept ID
     * @returns {Object} Progress metrics for the concept
     */
    getConceptProgress(conceptId) {
        if (!this.isInitialized) {
            return { seen: 0, mastered: 0, total: 0, seenPercentage: 0, masteredPercentage: 0 };
        }

        const objectives = this.ontologyEngine.getLearningObjectives(conceptId);
        if (!objectives || objectives.length === 0) {
            return { seen: 0, mastered: 0, total: 0, seenPercentage: 0, masteredPercentage: 0 };
        }

        const seen = objectives.filter(obj => this.isObjectiveHistoricallySeen(obj.id)).length;
        const mastered = objectives.filter(obj => this.isObjectiveMastered(obj.id)).length;
        const total = objectives.length;

        return {
            seen,
            mastered,
            total,
            seenPercentage: total > 0 ? Math.round((seen / total) * 100) : 0,
            masteredPercentage: total > 0 ? Math.round((mastered / total) * 100) : 0,
            objectives: objectives.map(obj => ({
                id: obj.id,
                name: obj.name,
                description: obj.description,
                detectionCount: this.getDetectionCount(obj.id),
                isHistoricallySeen: this.isObjectiveHistoricallySeen(obj.id),
                isMastered: this.isObjectiveMastered(obj.id),
                currentSessionDetections: this.getCurrentSessionDetectionCount(obj.id)
            }))
        };
    }

    /**
     * Calculate overall progress metrics across all concepts
     * @returns {Object} Overall progress metrics
     */
    getOverallProgress() {
        if (!this.isInitialized) {
            return { 
                totalSeen: 0, 
                totalMastered: 0, 
                totalObjectives: 0, 
                seenPercentage: 0, 
                masteredPercentage: 0,
                conceptsWithProgress: 0,
                totalConcepts: 0
            };
        }

        const allConcepts = this.ontologyEngine.getAllConcepts();
        let totalSeen = 0;
        let totalMastered = 0;
        let totalObjectives = 0;
        let conceptsWithProgress = 0;

        allConcepts.forEach(concept => {
            const progress = this.getConceptProgress(concept.id);
            totalSeen += progress.seen;
            totalMastered += progress.mastered;
            totalObjectives += progress.total;
            
            if (progress.seen > 0 || progress.mastered > 0) {
                conceptsWithProgress++;
            }
        });

        return {
            totalSeen,
            totalMastered,
            totalObjectives,
            seenPercentage: totalObjectives > 0 ? Math.round((totalSeen / totalObjectives) * 100) : 0,
            masteredPercentage: totalObjectives > 0 ? Math.round((totalMastered / totalObjectives) * 100) : 0,
            conceptsWithProgress,
            totalConcepts: allConcepts.length
        };
    }

    /**
     * Get detailed objective state for UI rendering
     * @param {string} objectiveId - Objective ID
     * @param {string} objectiveName - Objective name (for display)
     * @param {string} conceptId - Concept ID
     * @returns {Object} Detailed objective state
     */
    getObjectiveState(objectiveId, objectiveName, conceptId) {
        if (!this.isInitialized) {
            return {
                id: objectiveId,
                name: objectiveName,
                conceptId,
                detectionCount: 0,
                isHistoricallySeen: false,
                isMastered: false,
                currentSessionDetections: 0,
                progressLevel: 'none'
            };
        }

        const detectionCount = this.getDetectionCount(objectiveId);
        const isHistoricallySeen = this.isObjectiveHistoricallySeen(objectiveId);
        const isMastered = this.isObjectiveMastered(objectiveId);
        const currentSessionDetections = this.getCurrentSessionDetectionCount(objectiveId);

        // Determine progress level for UI styling
        let progressLevel = 'none';
        if (isMastered) {
            progressLevel = 'mastered';
        } else if (isHistoricallySeen) {
            progressLevel = 'seen';
        } else if (detectionCount > 0) {
            progressLevel = 'practicing';
        }

        return {
            id: objectiveId,
            name: objectiveName,
            conceptId,
            detectionCount,
            isHistoricallySeen,
            isMastered,
            currentSessionDetections,
            progressLevel,
            needsMorePractice: detectionCount > 0 && detectionCount < this.SEEN_THRESHOLD,
            practiceProgress: Math.min(detectionCount / this.SEEN_THRESHOLD, 1.0)
        };
    }

    /**
     * Get learning insights for a concept
     * @param {string} conceptId - Concept ID
     * @returns {Object} Learning insights
     */
    getConceptInsights(conceptId) {
        if (!this.isInitialized) {
            return { recommendations: [], strengths: [], needsWork: [] };
        }

        const progress = this.getConceptProgress(conceptId);
        const recommendations = [];
        const strengths = [];
        const needsWork = [];

        // Analyze progress and provide insights
        progress.objectives.forEach(obj => {
            if (obj.isMastered) {
                strengths.push(`Mastered ${obj.name}`);
            } else if (obj.isHistoricallySeen) {
                recommendations.push(`Consider practicing ${obj.name} more to build confidence`);
            } else if (obj.detectionCount > 0) {
                needsWork.push(`Keep practicing ${obj.name} (${obj.detectionCount}/${this.SEEN_THRESHOLD} sessions)`);
            } else {
                needsWork.push(`Try using ${obj.name} in your code`);
            }
        });

        // Overall concept recommendations
        if (progress.masteredPercentage >= 80) {
            recommendations.unshift('🎉 Excellent progress! Consider moving to the next concept.');
        } else if (progress.seenPercentage >= 60) {
            recommendations.unshift('👍 Good practice! Focus on mastering the concepts you\'ve tried.');
        } else if (progress.seenPercentage >= 20) {
            recommendations.unshift('📈 Keep experimenting with different objectives.');
        } else {
            recommendations.unshift('🚀 Start by trying some of the learning objectives!');
        }

        return {
            recommendations,
            strengths,
            needsWork,
            overallLevel: this.getOverallLevelForConcept(progress)
        };
    }

    /**
     * Determine overall learning level for a concept
     * @param {Object} progress - Concept progress object
     * @returns {string} Learning level
     */
    getOverallLevelForConcept(progress) {
        if (progress.masteredPercentage >= 80) return 'expert';
        if (progress.masteredPercentage >= 50) return 'proficient';
        if (progress.seenPercentage >= 60) return 'practicing';
        if (progress.seenPercentage >= 20) return 'exploring';
        return 'beginner';
    }

    /**
     * Get analytics summary for debugging
     * @returns {Object} Analytics summary
     */
    getAnalyticsSummary() {
        if (!this.isInitialized) {
            return { error: 'ProgressTracker not initialized' };
        }

        const overallProgress = this.getOverallProgress();
        const analyticsSummary = this.analytics.getSummary();

        return {
            ...analyticsSummary,
            progressMetrics: overallProgress,
            seenThreshold: this.SEEN_THRESHOLD,
            isReady: this.isInitialized
        };
    }

    /**
     * Export progress data for analysis
     * @returns {Object} Complete progress data
     */
    exportProgressData() {
        if (!this.isInitialized) {
            return { error: 'ProgressTracker not initialized' };
        }

        const allConcepts = this.ontologyEngine.getAllConcepts();
        const conceptProgress = {};

        allConcepts.forEach(concept => {
            conceptProgress[concept.id] = this.getConceptProgress(concept.id);
        });

        return {
            timestamp: new Date().toISOString(),
            overallProgress: this.getOverallProgress(),
            conceptProgress,
            analyticsData: this.analytics.exportData(),
            configuration: {
                seenThreshold: this.SEEN_THRESHOLD
            }
        };
    }

    /**
     * Check if progress tracker is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized && 
               this.analytics?.isReady() && 
               this.ontologyEngine?.isReady();
    }

    /**
     * Update seen threshold (for testing/configuration)
     * @param {number} newThreshold - New threshold value
     */
    updateSeenThreshold(newThreshold) {
        if (typeof newThreshold === 'number' && newThreshold > 0) {
            this.SEEN_THRESHOLD = newThreshold;
            console.log(`📊 Updated seen threshold to ${newThreshold}`);
        } else {
            console.warn('Invalid seen threshold value');
        }
    }
}