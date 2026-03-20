// Enhanced Learning Dashboard for integrated AI + learning experience

export class LearningDashboard {
    constructor(ontologyEngine, learnerProfile) {
        this.ontologyEngine = ontologyEngine;
        this.learnerProfile = learnerProfile;
        this.detectedObjectives = [];
        this.currentConcept = null;
        this.isInitialized = false;
        this.showingConceptSelection = false;
    }

    /**
     * Initialize the learning dashboard
     * @returns {boolean} Success status
     */
    init() {
        try {
            console.log('Initializing Enhanced Learning Dashboard...');

            // Initialize dashboard components
            this.initializeDashboard();
            this.setupEventListeners();
            this.updateCurrentLearning();
            this.updateObjectivesGrid();
            this.updateProgressMetrics(); // Initialize progress metrics

            // If systems aren't ready yet, set up a retry mechanism
            if (!this.ontologyEngine?.isReady() || !this.learnerProfile?.isReady()) {
                setTimeout(() => {
                    this.updateObjectivesGrid();
                    this.updateProgressMetrics();
                }, 1000);
            }

            this.isInitialized = true;
            console.log('Learning Dashboard initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Learning Dashboard:', error);
            return false;
        }
    }

    /**
     * Initialize dashboard with current state
     */
    initializeDashboard() {
        if (!this.ontologyEngine?.isReady() || !this.learnerProfile?.isReady()) {
            this.showBasicLearningState();
            return;
        }

        // Get current concept or default to first available
        let currentConceptId = this.learnerProfile.getCurrentConcept();
        
        if (!currentConceptId) {
            const availableConcepts = this.learnerProfile.getAvailableConcepts();
            if (availableConcepts.length > 0) {
                currentConceptId = availableConcepts[0].id;
                this.learnerProfile.setCurrentConcept(currentConceptId);
            }
        }

        this.currentConcept = currentConceptId;
        this.updateCurrentLearning();
        this.updateWhatsNextButton(currentConceptId);
    }

    /**
     * Show basic learning state when ontology not ready
     */
    showBasicLearningState() {
        const conceptNameEl = document.getElementById('current-concept-name');
        
        if (conceptNameEl) {
            conceptNameEl.textContent = 'Basic Shapes';
        }
    }

    /**
     * Update current learning section with enhanced guidance
     */
    updateCurrentLearning() {
        if (!this.ontologyEngine?.isReady() || !this.learnerProfile?.isReady()) {
            this.showBasicLearningState();
            return;
        }

        const conceptNameEl = document.getElementById('current-concept-name');
        const nextBtn = document.getElementById('next-concept-btn');

        if (!conceptNameEl) return;

        const currentConceptId = this.learnerProfile.getCurrentConcept();
        if (!currentConceptId) return;

        const concept = this.ontologyEngine.getConceptById(currentConceptId);
        if (!concept) return;

        // Update concept name
        conceptNameEl.textContent = concept.name;

        // Update button appearance and text based on mastery
        this.updateWhatsNextButton(currentConceptId);
        
        // Add learning guidance if available
        this.updateLearningGuidance(currentConceptId);
    }

    /**
     * Update learning guidance based on current progress
     * @param {string} conceptId - Current concept ID
     */
    updateLearningGuidance(conceptId) {
        const guidanceEl = document.querySelector('.learning-guidance');
        if (!guidanceEl) return; // Guidance element is optional

        const masteryPercentage = this.calculateMasteryPercentage(conceptId);
        const objectives = this.ontologyEngine.getLearningObjectives(conceptId);
        const completedObjectives = this.learnerProfile.getCompletedObjectives(conceptId) || [];
        const nextObjectives = objectives.filter(obj => !completedObjectives.includes(obj.id)).slice(0, 2);

        let guidanceHTML = '';
        
        if (masteryPercentage === 0 && objectives.length > 0) {
            guidanceHTML = `
                <div class="guidance-message getting-started">
                    <strong>🌱 Getting Started:</strong> Try coding with <em>${nextObjectives[0]?.name || 'the first objective'}</em>
                </div>
            `;
        } else if (masteryPercentage < 50 && nextObjectives.length > 0) {
            guidanceHTML = `
                <div class="guidance-message keep-practicing">
                    <strong>💪 Keep Going:</strong> Focus on <em>${nextObjectives[0].name}</em> ${nextObjectives.length > 1 ? `and <em>${nextObjectives[1].name}</em>` : ''}
                </div>
            `;
        } else if (masteryPercentage < 100 && nextObjectives.length > 0) {
            guidanceHTML = `
                <div class="guidance-message almost-there">
                    <strong>🎆 Almost There:</strong> Complete <em>${nextObjectives[0].name}</em> to finish this concept
                </div>
            `;
        } else if (masteryPercentage === 100) {
            guidanceHTML = `
                <div class="guidance-message completed">
                    <strong>🎉 Concept Complete:</strong> Great job! Ready to explore something new?
                </div>
            `;
        }

        guidanceEl.innerHTML = guidanceHTML;
    }

    /**
     * Update "What's Next?" button appearance and text based on mastery level
     * @param {string} conceptId - Current concept ID
     */
    updateWhatsNextButton(conceptId) {
        const nextBtn = document.getElementById('next-concept-btn');
        if (!nextBtn || !conceptId) return;

        const masteryPercentage = this.calculateMasteryPercentage(conceptId);
        
        // Update button styling
        if (masteryPercentage >= 75) {
            nextBtn.classList.add('ready');
        } else {
            nextBtn.classList.remove('ready');
        }
        
        // Update button text based on progress
        let buttonText = 'Explore Topics';
        if (masteryPercentage < 75) {
            buttonText = 'Continue Learning';
        }
        
        nextBtn.textContent = buttonText;
    }

    /**
     * Update objectives grid with unified badge system
     */
    updateObjectivesGrid() {
        const badgesContainer = document.getElementById('objectives-badges');
        if (!badgesContainer) return;

        if (!this.ontologyEngine?.isReady() || !this.learnerProfile?.isReady()) {
            badgesContainer.innerHTML = `
                <div class="no-objectives">
                    <p>Loading learning objectives...</p>
                </div>
            `;
            return;
        }

        const currentConceptId = this.learnerProfile.getCurrentConcept();
        if (!currentConceptId) {
            badgesContainer.innerHTML = `
                <div class="no-objectives">
                    <p>Select a concept to see learning objectives</p>
                </div>
            `;
            return;
        }

        const objectives = this.ontologyEngine.getLearningObjectives(currentConceptId);
        if (objectives.length === 0) {
            badgesContainer.innerHTML = `
                <div class="no-objectives">
                    <p>No learning objectives defined for this concept</p>
                </div>
            `;
            return;
        }

        // Get completed objectives from learner profile
        const completedObjectives = this.learnerProfile.getCompletedObjectives(currentConceptId) || [];

        const badgesHTML = objectives.map((objective, index) => {
            const isDetected = this.detectedObjectives.some(detected => 
                detected.id === objective.id
            );
            const isCompleted = completedObjectives.includes(objective.id);
            
            const badgeClasses = [
                'objective-badge',
                isDetected ? 'detected' : '',
                isCompleted ? 'completed' : ''
            ].filter(Boolean).join(' ');

            // Enhanced status text
            let statusText = '';

            return `
                <div class="${badgeClasses}" 
                     data-objective-id="${objective.id}"
                     data-objective-name="${objective.name}"
                     data-concept-id="${currentConceptId}"
                     onclick="window.vibeApp?.learningDashboard?.toggleObjectiveCompletion('${objective.id}', '${currentConceptId}')">
                    
                    <div class="badge-header">
                        <span class="badge-name">${objective.name}</span>
                        <div class="badge-status">
                            <div class="status-indicator"></div>
                            <span class="status-text">${statusText}</span>
                        </div>
                    </div>
                    
                    <p class="badge-description">${objective.description}</p>
                    
                    ${objective.code ? `<code class="badge-code">${objective.code}</code>` : ''}
                </div>
            `;
        }).join('');

        badgesContainer.innerHTML = badgesHTML;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // "What's Next?" button
        const nextBtn = document.getElementById('next-concept-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.handleWhatsNextClick();
            });
        }

        // Concept selection buttons (will be added dynamically)
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('concept-button')) {
                const conceptId = event.target.getAttribute('data-concept-id');
                this.selectConcept(conceptId);
            }
        });

        // Progress dialog buttons
        const dialogCancel = document.getElementById('dialog-cancel');
        const dialogContinue = document.getElementById('dialog-continue');
        
        if (dialogCancel) {
            dialogCancel.addEventListener('click', () => {
                this.hideProgressDialog();
            });
        }
        
        if (dialogContinue) {
            dialogContinue.addEventListener('click', () => {
                this.hideProgressDialog();
                this.showConceptSelection();
            });
        }

        // Close dialog when clicking overlay (use event delegation)
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('dialog-overlay')) {
                this.hideProgressDialog();
            }
        });

        // Concept selection modal events
        const stayCurrentBtn = document.getElementById('stay-current-concept-btn');
        if (stayCurrentBtn) {
            stayCurrentBtn.addEventListener('click', () => {
                this.hideConceptSelectionModal();
            });
        }

        // Close modal when clicking overlay
        document.addEventListener('click', (event) => {
            if (event.target.closest('#concept-selection-modal .modal-overlay')) {
                this.hideConceptSelectionModal();
            }
        });
    }

    /**
     * Handle "What's Next?" button click
     */
    handleWhatsNextClick() {
        if (!this.ontologyEngine?.isReady() || !this.learnerProfile?.isReady()) {
            console.warn('Cannot proceed - systems not ready');
            return;
        }

        const currentConceptId = this.learnerProfile.getCurrentConcept();
        if (!currentConceptId) {
            this.showConceptSelection();
            return;
        }

        // Calculate mastery percentage
        const masteryPercentage = this.calculateMasteryPercentage(currentConceptId);
        
        if (masteryPercentage >= 75) {
            // Green light - proceed directly
            this.showConceptSelection();
        } else {
            // Show dialog recommending more practice
            this.showProgressDialog(masteryPercentage);
        }
    }

    /**
     * Calculate mastery percentage for current concept
     * @param {string} conceptId - Concept ID
     * @returns {number} Mastery percentage (0-100)
     */
    calculateMasteryPercentage(conceptId) {
        if (!this.ontologyEngine?.isReady() || !this.learnerProfile?.isReady()) {
            return 0;
        }

        const objectives = this.ontologyEngine.getLearningObjectives(conceptId);
        if (objectives.length === 0) return 100; // No objectives = fully mastered

        const completedObjectives = this.learnerProfile.getCompletedObjectives(conceptId) || [];
        return Math.round((completedObjectives.length / objectives.length) * 100);
    }

    /**
     * Show progress confirmation dialog with improved guidance
     * @param {number} masteryPercentage - Current mastery percentage
     */
    showProgressDialog(masteryPercentage) {
        const dialog = document.getElementById('progress-dialog');
        const dialogTitle = document.getElementById('dialog-title');
        const dialogMessage = document.getElementById('dialog-message');
        
        if (!dialog || !dialogTitle || !dialogMessage) return;

        const currentConceptId = this.learnerProfile.getCurrentConcept();
        const concept = this.ontologyEngine.getConceptById(currentConceptId);
        const objectives = this.ontologyEngine.getLearningObjectives(currentConceptId);
        const completedObjectives = this.learnerProfile.getCompletedObjectives(currentConceptId) || [];
        const remainingObjectives = objectives.filter(obj => !completedObjectives.includes(obj.name));

        // Enhanced dialog content based on mastery level
        if (masteryPercentage >= 75) {
            dialogTitle.textContent = '🎉 Great Progress!';
            dialogMessage.innerHTML = `
                <p>You've mastered <strong>${masteryPercentage}%</strong> of ${concept?.name || 'this concept'}! You're ready to explore new topics.</p>
                ${masteryPercentage < 100 ? `<p>You still have ${remainingObjectives.length} objective${remainingObjectives.length === 1 ? '' : 's'} to complete, but you've built a solid foundation.</p>` : ''}
                <p><strong>Ready to move forward?</strong> You can always return to practice more later.</p>
            `;
        } else if (masteryPercentage >= 50) {
            dialogTitle.textContent = '🚀 Good Progress!';
            dialogMessage.innerHTML = `
                <p>You've mastered <strong>${masteryPercentage}%</strong> of ${concept?.name || 'this concept'}. You're making solid progress!</p>
                <p><strong>Consider practicing:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    ${remainingObjectives.slice(0, 3).map(obj => `<li>${obj.name}</li>`).join('')}
                    ${remainingObjectives.length > 3 ? `<li>...and ${remainingObjectives.length - 3} more</li>` : ''}
                </ul>
                <p>More practice will strengthen your foundation, but you can move forward if you prefer!</p>
            `;
        } else if (masteryPercentage > 0) {
            dialogTitle.textContent = '💪 Keep Building!';
            dialogMessage.innerHTML = `
                <p>You've mastered <strong>${masteryPercentage}%</strong> of ${concept?.name || 'this concept'}. Great start!</p>
                <p><strong>Try working on these next:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    ${remainingObjectives.slice(0, 2).map(obj => `<li><strong>${obj.name}</strong> - ${obj.description}</li>`).join('')}
                </ul>
                <p>Building more skills here will make the next topics easier to understand.</p>
            `;
        } else {
            dialogTitle.textContent = '🌱 Ready to Start Learning?';
            dialogMessage.innerHTML = `
                <p>You're just getting started with <strong>${concept?.name || 'this concept'}</strong>!</p>
                <p><strong>Here's what you can learn:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    ${objectives.slice(0, 3).map(obj => `<li><strong>${obj.name}</strong> - ${obj.description}</li>`).join('')}
                    ${objectives.length > 3 ? `<li>...and ${objectives.length - 3} more skills</li>` : ''}
                </ul>
                <p>Try coding some examples, or explore a new topic if you prefer to learn as you go!</p>
            `;
        }

        // Show dialog
        dialog.classList.remove('hidden');
    }

    /**
     * Hide progress confirmation dialog
     */
    hideProgressDialog() {
        const dialog = document.getElementById('progress-dialog');
        if (dialog) {
            dialog.classList.add('hidden');
        }
    }

    /**
     * Show concept selection modal
     */
    showConceptSelection() {
        this.showConceptSelectionModal();
    }

    /**
     * Show concept selection modal (new modal-based approach)
     */
    showConceptSelectionModal() {
        if (!this.ontologyEngine?.isReady() || !this.learnerProfile?.isReady()) {
            console.warn('Cannot show concept selection - systems not ready');
            return;
        }

        const modal = document.getElementById('concept-selection-modal');
        const progressEl = document.getElementById('concept-selection-progress');
        const contentEl = document.getElementById('concept-selection-content');
        const debugEl = document.getElementById('concept-selection-debug');
        
        if (!modal || !contentEl) return;

        // Get available next concepts
        const currentConceptId = this.learnerProfile.getCurrentConcept();
        const availableConcepts = this.getNextAvailableConcepts(currentConceptId);
        const currentMastery = this.calculateMasteryPercentage(currentConceptId);
        const currentConcept = this.ontologyEngine.getConceptById(currentConceptId);

        // Populate progress info
        if (progressEl) {
            progressEl.innerHTML = `
                <h3>📊 Your Progress</h3>
                <p>You've mastered <strong>${currentMastery}%</strong> of <em>${currentConcept?.name || 'your current topic'}</em>.</p>
                <p>Ready to explore new concepts or continue building skills with your current topic?</p>
            `;
        }

        // Populate concept content
        if (availableConcepts.length === 0) {
            // Show debug info when no concepts available
            const allConcepts = this.ontologyEngine.getAllConcepts();
            const allAvailable = this.learnerProfile.getAvailableConcepts();
            const completed = this.learnerProfile.getCompletedConcepts();
            
            contentEl.innerHTML = `
                <div class="no-concepts" style="text-align: center; padding: 40px 20px;">
                    <h3>🎉 Great Job!</h3>
                    <p>No additional concepts are available right now. This might be because:</p>
                    <ul style="text-align: left; margin: 20px 0; max-width: 400px; margin-left: auto; margin-right: auto;">
                        <li>All available concepts are completed (${completed.length} done)</li>
                        <li>Prerequisites aren't met for advanced topics</li>
                        <li>Only ${allAvailable.length} concepts available vs ${allConcepts.length} total</li>
                    </ul>
                    <p>💡 <strong>Keep practicing!</strong> Continue working on objectives in your current concept to unlock new possibilities.</p>
                </div>
            `;
            
            // Show debug info
            if (debugEl) {
                debugEl.innerHTML = `
                    <details>
                        <summary>🔧 Debug Information</summary>
                        <pre>Current Concept: ${currentConceptId}
Available Concepts: ${allAvailable.map(c => c.id).join(', ')}
Completed Concepts: ${completed.join(', ')}</pre>
                    </details>
                `;
                debugEl.classList.remove('hidden');
            }
        } else {
            // Show available concepts
            const conceptsHTML = availableConcepts.map((concept, index) => {
                const unlockInfo = this.getUnlockInfo(concept);
                const difficultyClass = concept.estimatedDifficulty || 'intermediate';
                const isRecommended = index === 0; // First concept is most recommended
                
                return `
                    <button class="concept-modal-button ${difficultyClass} ${isRecommended ? 'recommended' : ''}" 
                            data-concept-id="${concept.id}"
                            onclick="window.vibeApp?.learningDashboard?.selectConceptFromModal('${concept.id}')">
                        <div class="concept-button-info">
                            <h4>
                                ${concept.name}
                                ${isRecommended ? '<span class="recommendation-badge">⭐ Recommended</span>' : ''}
                                <span class="difficulty-badge ${difficultyClass}">${difficultyClass}</span>
                            </h4>
                            <p>${concept.description}</p>
                            <div class="concept-button-meta">
                                ${unlockInfo ? unlockInfo.replace(/<br>/g, ' • ') : `${concept.objectiveCount || 0} skills to learn`}
                            </div>
                        </div>
                    </button>
                `;
            }).join('');
            
            contentEl.innerHTML = `
                <div class="concept-modal-buttons">
                    ${conceptsHTML}
                </div>
            `;
            
            // Hide debug info when concepts are available
            if (debugEl) {
                debugEl.classList.add('hidden');
            }
        }

        // Show the modal
        modal.classList.remove('hidden');
        this.showingConceptSelection = true;
        
        console.log('Concept selection modal shown, available concepts:', availableConcepts.length);
    }

    /**
     * Hide concept selection interface
     */
    hideConceptSelection() {
        this.hideConceptSelectionModal();
    }

    /**
     * Hide concept selection modal
     */
    hideConceptSelectionModal() {
        const modal = document.getElementById('concept-selection-modal');
        
        if (modal) {
            modal.classList.add('hidden');
        }
        
        this.showingConceptSelection = false;
    }

    /**
     * Select concept from modal and close modal
     * @param {string} conceptId - Concept ID to select
     */
    selectConceptFromModal(conceptId) {
        console.log(`Selecting concept from modal: ${conceptId}`);
        
        // Hide the modal first
        this.hideConceptSelectionModal();
        
        // Then select the concept (reuse existing logic)
        this.selectConcept(conceptId);
    }

    /**
     * Get next available concepts based on current progress with enhanced filtering
     * @param {string} currentConceptId - Current concept ID
     * @returns {Array} Available next concepts with enhanced metadata
     */
    getNextAvailableConcepts(currentConceptId) {
        if (!this.ontologyEngine?.isReady() || !this.learnerProfile?.isReady()) {
            console.warn('Ontology or learner profile not ready for concept selection');
            return [];
        }

        // Get available concepts excluding current concept (prerequisite checking built-in)
        let candidates = this.learnerProfile.getAvailableConcepts(true);
        
        console.log('Debug concept selection:', {
            currentConceptId,
            candidates: candidates.length,
            candidateIds: candidates.map(c => c.id)
        });
        
        // Enhance with learning path information
        const enhancedConcepts = candidates.map(concept => {
            const objectives = this.ontologyEngine.getLearningObjectives(concept.id);
            const currentMastery = this.calculateMasteryPercentage(currentConceptId);
            
            return {
                ...concept,
                objectiveCount: objectives.length,
                estimatedDifficulty: this.estimateConceptDifficulty(concept),
                recommendationScore: this.calculateRecommendationScore(concept, currentMastery),
                learningBenefits: this.getConceptBenefits(concept, objectives)
            };
        });

        // Sort by recommendation score and limit to best options
        const result = enhancedConcepts
            .sort((a, b) => b.recommendationScore - a.recommendationScore)
            .slice(0, 4); // Limit to 4 best options
            
        console.log('Final enhanced concepts:', result.length, result.map(c => c.name));
        return result;
    }

    /**
     * Get unlock information for a concept with enhanced details
     * @param {Object} concept - Enhanced concept object
     * @returns {string} Unlock information
     */
    getUnlockInfo(concept) {
        if (!concept || !this.ontologyEngine?.isReady()) return '';

        const objectives = this.ontologyEngine.getLearningObjectives(concept.id);
        if (objectives.length === 0) return '';

        // Show benefits and learning outcomes
        let info = '';
        
        if (concept.learningBenefits) {
            info += `🎯 ${concept.learningBenefits}<br>`;
        }
        
        if (concept.estimatedDifficulty) {
            const difficultyText = concept.estimatedDifficulty === 'beginner' ? '🟢 Beginner-friendly' :
                                 concept.estimatedDifficulty === 'intermediate' ? '🟡 Intermediate level' :
                                 '🔴 Advanced topic';
            info += `${difficultyText}<br>`;
        }
        
        const keyObjectives = objectives.slice(0, 2).map(obj => obj.name);
        const moreCount = objectives.length - keyObjectives.length;
        
        info += `📚 Key skills: ${keyObjectives.join(', ')}`;
        if (moreCount > 0) {
            info += ` +${moreCount} more`;
        }
        
        return info;
    }

    /**
     * Estimate concept difficulty level
     * @param {Object} concept - Concept object
     * @returns {string} Difficulty level
     */
    estimateConceptDifficulty(concept) {
        // Simple heuristic based on concept name and position
        const name = concept.name.toLowerCase();
        if (name.includes('basic') || name.includes('simple') || name.includes('intro')) {
            return 'beginner';
        }
        if (name.includes('advanced') || name.includes('complex') || name.includes('transform')) {
            return 'advanced';
        }
        return 'intermediate';
    }

    /**
     * Calculate recommendation score for concept selection
     * @param {Object} concept - Concept object
     * @param {number} currentMastery - Current concept mastery percentage
     * @returns {number} Recommendation score (0-100)
     */
    calculateRecommendationScore(concept, currentMastery) {
        let score = 50; // Base score
        
        // Boost score if current mastery is high
        score += currentMastery * 0.3;
        
        // Prefer beginner concepts for low mastery users
        if (currentMastery < 50 && concept.estimatedDifficulty === 'beginner') {
            score += 20;
        }
        
        // Slightly boost intermediate concepts for medium mastery
        if (currentMastery >= 50 && currentMastery < 80 && concept.estimatedDifficulty === 'intermediate') {
            score += 15;
        }
        
        return Math.min(100, score);
    }

    /**
     * Get learning benefits description for a concept
     * @param {Object} concept - Concept object
     * @param {Array} objectives - Concept objectives
     * @returns {string} Benefits description
     */
    getConceptBenefits(concept, objectives) {
        if (objectives.length === 0) return 'Explore new coding techniques';
        
        const name = concept.name.toLowerCase();
        
        // Provide context-specific benefits
        if (name.includes('color')) {
            return 'Make your art more vibrant and expressive';
        }
        if (name.includes('shape') || name.includes('drawing')) {
            return 'Create more diverse and interesting visuals';
        }
        if (name.includes('interaction') || name.includes('mouse')) {
            return 'Make your sketches respond to user input';
        }
        if (name.includes('animation') || name.includes('motion')) {
            return 'Bring your creations to life with movement';
        }
        if (name.includes('random')) {
            return 'Add variety and surprise to your projects';
        }
        
        return `Master ${objectives.length} new creative coding skill${objectives.length === 1 ? '' : 's'}`;
    }

    /**
     * Select a new concept
     * @param {string} conceptId - Concept ID to select
     */
    selectConcept(conceptId) {
        if (!this.learnerProfile?.isReady()) {
            console.warn('Cannot select concept - learner profile not ready');
            return;
        }

        console.log(`Selecting new concept: ${conceptId}`);

        // Mark current concept as completed (if there was one)
        const currentConceptId = this.learnerProfile.getCurrentConcept();
        if (currentConceptId && currentConceptId !== conceptId) {
            this.learnerProfile.markConceptCompleted(currentConceptId);
        }

        // Set new current concept
        this.learnerProfile.setCurrentConcept(conceptId);
        this.currentConcept = conceptId;

        // Update UI
        this.hideConceptSelection();
        this.updateCurrentLearning();
        
        // Clear detected objectives for fresh start
        this.detectedObjectives = [];
        this.updateObjectivesGrid();
        this.updateWhatsNextButton(conceptId);

        // Notify user
        const concept = this.ontologyEngine?.getConceptById(conceptId);
        if (concept) {
            console.log(`🎓 Now learning: ${concept.name}`);
        }
    }

    /**
     * Toggle objective completion status
     * @param {string} objectiveId - ID of the objective
     * @param {string} conceptId - Concept ID  
     */
    toggleObjectiveCompletion(objectiveId, conceptId) {
        if (!this.learnerProfile?.isReady()) {
            console.warn('Cannot toggle objective - learner profile not ready');
            return;
        }

        // Get objective details for display
        const objectives = this.ontologyEngine.getLearningObjectives(conceptId);
        const objective = objectives.find(obj => obj.id === objectiveId);
        const objectiveName = objective?.name || objectiveId;

        console.log(`Toggling objective: ${objectiveName} (ID: ${objectiveId}) for concept: ${conceptId}`);

        // Get current completed objectives
        const completedObjectives = this.learnerProfile.getCompletedObjectives(conceptId) || [];
        const isCurrentlyCompleted = completedObjectives.includes(objectiveId);

        if (isCurrentlyCompleted) {
            // Remove from completed list
            const updatedCompleted = completedObjectives.filter(id => id !== objectiveId);
            this.learnerProfile.setCompletedObjectives(conceptId, updatedCompleted);
            console.log(`✅ Unmarked as complete: ${objectiveName}`);
            
            // Phase 3.5: Remove mastery from analytics
            this.removeMastery(objectiveId, objectiveName, conceptId);
        } else {
            // Add to completed list
            const updatedCompleted = [...completedObjectives, objectiveId];
            this.learnerProfile.setCompletedObjectives(conceptId, updatedCompleted);
            console.log(`🎯 Marked as complete: ${objectiveName}`);
            
            // Phase 3.5: Record mastery for analytics
            this.recordMastery(objectiveId, objectiveName, conceptId);
        }

        // Update UI immediately
        this.updateCurrentLearning();
        this.updateObjectivesGrid();
        this.updateProgressMetrics();
        this.updateWhatsNextButton(conceptId);

        // Check if ready for next concept
        this.checkProgressForAdvancement(conceptId);
    }

    /**
     * Check if learner has made enough progress to show "What's Next?" button
     * @param {string} conceptId - Concept ID to check
     */
    checkProgressForAdvancement(conceptId) {
        // The "What's Next?" button is now permanently visible
        // Progress checking is handled in the handleWhatsNextClick method
    }

    /**
     * Update detected objectives (called from main app when code is executed)
     * @param {string} code - Executed code
     */
    onCodeExecuted(code) {
        if (!this.ontologyEngine?.isReady()) return;

        try {
            console.log('🔍 Detecting objectives in code...');
            
            // Use existing ontology detection system
            const detectedObjectives = this.ontologyEngine.detectLearningObjectives(code);
            console.log('📊 Detected objectives:', detectedObjectives.length, detectedObjectives);
            
            // Update detected objectives
            this.detectedObjectives = detectedObjectives;
            
            // Phase 3.5: Record detections for analytics
            const currentConceptId = this.learnerProfile.getCurrentConcept();
            detectedObjectives.forEach(obj => {
                this.recordDetection(obj.id, obj.name, currentConceptId || 'unknown', code);
            });
            
            // Update UI
            this.updateCurrentLearning();
            this.updateObjectivesGrid();
            this.updateProgressMetrics();
            
        } catch (error) {
            console.error('Error detecting objectives:', error);
        }
    }

    /**
     * Get current detected objectives (for export functionality)
     * @returns {Array} List of detected objective names
     */
    getCurrentDetectedObjectives() {
        return this.detectedObjectives.map(obj => obj.name || obj.objectiveName || obj);
    }

    /**
     * Check if dashboard is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Phase 3.5: Record analytics if available (safe enhancement)
     * @param {string} objectiveId - Objective ID
     * @param {string} objectiveName - Objective name
     * @param {string} conceptId - Concept ID
     * @param {string} code - Code snippet
     */
    recordDetection(objectiveId, objectiveName, conceptId, code) {
        if (this.analytics && typeof this.analytics.recordDetection === 'function') {
            this.analytics.recordDetection(objectiveId, objectiveName, conceptId, code);
        }
    }

    /**
     * Phase 3.5: Record mastery if available (safe enhancement)
     * @param {string} objectiveId - Objective ID
     * @param {string} objectiveName - Objective name
     * @param {string} conceptId - Concept ID
     */
    recordMastery(objectiveId, objectiveName, conceptId) {
        if (this.analytics && typeof this.analytics.recordMastery === 'function') {
            this.analytics.recordMastery(objectiveId, objectiveName, conceptId);
        }
    }

    /**
     * Phase 3.5: Remove mastery if available (safe enhancement)
     * @param {string} objectiveId - Objective ID
     * @param {string} objectiveName - Objective name
     * @param {string} conceptId - Concept ID
     */
    removeMastery(objectiveId, objectiveName, conceptId) {
        if (this.analytics && typeof this.analytics.removeMastery === 'function') {
            this.analytics.removeMastery(objectiveId, objectiveName, conceptId);
        }
    }

    /**
     * Phase 3.5: Update progress metrics if available (safe enhancement)
     */
    updateProgressMetrics() {
        const progressMetrics = document.querySelector('.progress-metrics-inline');
        if (!progressMetrics) return;

        try {
            // Get current concept progress
            const currentConceptId = this.learnerProfile?.getCurrentConcept();
            if (!currentConceptId || !this.ontologyEngine?.isReady() || !this.learnerProfile?.isReady()) {
                // Show basic progress bar
                progressMetrics.style.display = 'flex';
                progressMetrics.innerHTML = `
                    <div class="progress-bar">
                        <div class="progress-fill mastered" style="width: 0%"></div>
                    </div>
                    <span class="metric-value">0/0</span>
                `;
                return;
            }

            let mastered = 0;
            let total = 0;
            let masteredPercentage = 0;

            if (this.progressTracker && typeof this.progressTracker.getConceptProgress === 'function') {
                // Use progress tracker if available
                const conceptProgress = this.progressTracker.getConceptProgress(currentConceptId);
                mastered = conceptProgress.mastered;
                total = conceptProgress.total;
                masteredPercentage = conceptProgress.masteredPercentage;
            } else {
                // Fall back to basic calculation
                const objectives = this.ontologyEngine.getLearningObjectives(currentConceptId);
                const completedObjectives = this.learnerProfile.getCompletedObjectives(currentConceptId) || [];
                mastered = completedObjectives.length;
                total = objectives.length;
                masteredPercentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
            }
            
            // Update inline progress metrics
            progressMetrics.style.display = 'flex';
            progressMetrics.innerHTML = `
                <div class="progress-bar">
                    <div class="progress-fill mastered" style="width: ${masteredPercentage}%"></div>
                </div>
                <span class="metric-value">${mastered}/${total}</span>
            `;
        } catch (error) {
            console.warn('Error updating progress metrics:', error);
            // Show empty progress bar on error
            progressMetrics.style.display = 'flex';
            progressMetrics.innerHTML = `
                <div class="progress-bar">
                    <div class="progress-fill mastered" style="width: 0%"></div>
                </div>
                <span class="metric-value">0/0</span>
            `;
        }
    }

    /**
     * Get current dashboard state for debugging
     * @returns {Object} Dashboard state
     */
    getState() {
        return {
            initialized: this.isInitialized,
            currentConcept: this.currentConcept,
            detectedObjectives: this.detectedObjectives.length,
            showingSelection: this.showingConceptSelection,
            ontologyReady: this.ontologyEngine?.isReady() || false,
            profileReady: this.learnerProfile?.isReady() || false,
            analyticsAvailable: !!this.analytics,
            progressTrackerAvailable: !!this.progressTracker
        };
    }
}