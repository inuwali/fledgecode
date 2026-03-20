// Internal Code Validation System for LLM constraint checking
// This system is invisible to learners and only used for LLM validation

export class CodeValidator {
    constructor(ontologyEngine) {
        this.ontologyEngine = ontologyEngine;
    }

    /**
     * Validate LLM-generated code against current concept boundaries
     * @param {string} code - Code to validate
     * @param {string} currentConceptId - Current learning concept
     * @returns {Object} Validation result
     */
    validateCodeForConcept(code, currentConceptId) {
        if (!this.ontologyEngine.isReady()) {
            console.warn('Ontology not ready for validation');
            return this.createValidationResult(true, [], []);
        }

        // Get concepts detected in the code
        const detectedConcepts = this.ontologyEngine.detectConcepts(code);
        
        // Get concepts allowed for current learning level
        const allowedConcepts = this.ontologyEngine.getAllowedConcepts(currentConceptId);
        
        // Find violations (concepts beyond current level)
        const violatingConcepts = detectedConcepts.filter(conceptId => 
            !this.isConceptAllowed(conceptId, currentConceptId, allowedConcepts)
        );

        // Generate alternatives if there are violations
        const alternatives = violatingConcepts.length > 0 ? 
            this.suggestAlternatives(violatingConcepts, currentConceptId) : [];

        return this.createValidationResult(
            violatingConcepts.length === 0,
            violatingConcepts,
            alternatives,
            {
                detectedConcepts,
                allowedConcepts,
                currentConcept: currentConceptId,
                codeLength: code.length
            }
        );
    }

    /**
     * Create standardized validation result
     * @param {boolean} allowed - Whether code is allowed
     * @param {Array} violations - Violating concept IDs
     * @param {Array} alternatives - Alternative code suggestions
     * @param {Object} metadata - Additional validation metadata
     * @returns {Object} Validation result
     */
    createValidationResult(allowed, violations, alternatives, metadata = {}) {
        return {
            allowed,
            violatingConcepts: violations,
            alternatives,
            timestamp: new Date().toISOString(),
            metadata
        };
    }

    /**
     * Detect concepts in code that are not allowed for current level
     * @param {string} code - Code to analyze
     * @param {Array} allowedConcepts - Concepts allowed for current level
     * @returns {Array} Disallowed concept IDs found in code
     */
    detectDisallowedConcepts(code, allowedConcepts) {
        if (!this.ontologyEngine.isReady()) return [];

        const detectedConcepts = this.ontologyEngine.detectConcepts(code);
        return detectedConcepts.filter(conceptId => 
            !allowedConcepts.includes(conceptId)
        );
    }

    /**
     * Check if a concept is allowed for current learning level
     * @param {string} conceptId - Concept to check
     * @param {string} currentConceptId - Current learning concept
     * @param {Array} allowedConcepts - Pre-computed allowed concepts (optional)
     * @returns {boolean} Whether concept is allowed
     */
    isConceptAllowed(conceptId, currentConceptId, allowedConcepts = null) {
        if (!this.ontologyEngine.isReady()) return true; // Fail open

        // Use pre-computed allowed concepts if provided
        if (allowedConcepts) {
            return allowedConcepts.includes(conceptId);
        }

        // Compute allowed concepts
        const allowed = this.ontologyEngine.getAllowedConcepts(currentConceptId);
        return allowed.includes(conceptId);
    }

    /**
     * Suggest alternative code that stays within concept boundaries
     * @param {Array} violatingConcepts - Concepts that violate current level
     * @param {string} currentConceptId - Current learning concept
     * @returns {Array} Alternative code suggestions
     */
    suggestAlternatives(violatingConcepts, currentConceptId) {
        if (!this.ontologyEngine.isReady()) return [];

        const alternatives = [];
        const currentConcept = this.ontologyEngine.getConceptById(currentConceptId);
        
        if (!currentConcept) return alternatives;

        // Get learning objectives for current concept
        const objectives = this.ontologyEngine.getLearningObjectives(currentConceptId);
        
        // Create alternatives based on current concept objectives
        const simpleAlternatives = this.generateSimpleAlternatives(objectives);
        alternatives.push(...simpleAlternatives);

        // Add alternatives from prerequisite concepts
        const prerequisites = this.ontologyEngine.getPrerequisites(currentConceptId);
        for (const prereqId of prerequisites) {
            const prereqObjectives = this.ontologyEngine.getLearningObjectives(prereqId);
            const prereqAlternatives = this.generateSimpleAlternatives(prereqObjectives, true);
            alternatives.push(...prereqAlternatives);
        }

        // Generate contextual alternatives based on violating concepts
        const contextualAlternatives = this.generateContextualAlternatives(
            violatingConcepts, 
            currentConceptId
        );
        alternatives.push(...contextualAlternatives);

        // Limit number of alternatives and deduplicate
        return this.deduplicateAlternatives(alternatives).slice(0, 5);
    }

    /**
     * Generate simple code alternatives from learning objectives
     * @param {Array} objectives - Learning objectives to use
     * @param {boolean} isPrerequisite - Whether these are from prerequisite concepts
     * @returns {Array} Alternative code suggestions
     */
    generateSimpleAlternatives(objectives, isPrerequisite = false) {
        const alternatives = [];

        for (const objective of objectives) {
            if (objective.code && objective.code.length < 100) { // Keep it simple
                alternatives.push({
                    code: objective.code,
                    description: objective.description,
                    objective: objective.name,
                    objectiveId: objective.id,
                    conceptId: objective.conceptId,
                    conceptName: objective.conceptName,
                    type: isPrerequisite ? 'prerequisite' : 'current',
                    complexity: 'simple'
                });
            }
        }

        return alternatives;
    }

    /**
     * Generate contextual alternatives based on violating concepts
     * @param {Array} violatingConcepts - Concepts that are too advanced
     * @param {string} currentConceptId - Current learning concept
     * @returns {Array} Contextual alternative suggestions
     */
    generateContextualAlternatives(violatingConcepts, currentConceptId) {
        const alternatives = [];
        const currentConcept = this.ontologyEngine.getConceptById(currentConceptId);
        
        if (!currentConcept) return alternatives;

        // Map common violations to appropriate alternatives
        const violationMappings = {
            'animation': {
                'simpleDrawing': 'rect(100, 100, 50, 50); // Try static shapes first',
                'colors': 'fill(255, 0, 0); ellipse(200, 200, 100, 100); // Add colors to shapes'
            },
            'variables': {
                'simpleDrawing': 'ellipse(200, 200, 80, 80); // Use fixed numbers for now',
                'colors': 'fill(100, 200, 255); rect(150, 150, 100, 100); // Try different color values'
            },
            'interactivity': {
                'simpleDrawing': 'line(100, 100, 300, 300); // Draw static lines',
                'colors': 'stroke(255, 100, 0); strokeWeight(5); line(50, 50, 350, 350);'
            },
            'repetition': {
                'simpleDrawing': 'ellipse(100, 100, 50, 50); ellipse(200, 100, 50, 50); // Draw multiple shapes',
                'colors': 'fill(255, 0, 0); rect(100, 100, 50, 50); fill(0, 255, 0); rect(200, 100, 50, 50);'
            }
        };

        // Generate alternatives based on violations
        for (const violatingConcept of violatingConcepts) {
            const mapping = violationMappings[violatingConcept];
            if (mapping && mapping[currentConceptId]) {
                alternatives.push({
                    code: mapping[currentConceptId],
                    description: `Alternative approach using ${currentConcept.name} concepts`,
                    reasoning: `Instead of ${violatingConcept}, try this approach`,
                    violatingConcept,
                    targetConcept: currentConceptId,
                    type: 'contextual',
                    complexity: 'guided'
                });
            }
        }

        return alternatives;
    }

    /**
     * Remove duplicate alternatives
     * @param {Array} alternatives - Array of alternative suggestions
     * @returns {Array} Deduplicated alternatives
     */
    deduplicateAlternatives(alternatives) {
        const seen = new Set();
        return alternatives.filter(alt => {
            const key = alt.code ? alt.code.trim() : JSON.stringify(alt);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Validate multiple code snippets in batch
     * @param {Array} codeSnippets - Array of code strings to validate
     * @param {string} currentConceptId - Current learning concept
     * @returns {Array} Array of validation results
     */
    validateBatch(codeSnippets, currentConceptId) {
        return codeSnippets.map(code => 
            this.validateCodeForConcept(code, currentConceptId)
        );
    }

    /**
     * Get validation rules for current concept (for LLM prompting)
     * @param {string} currentConceptId - Current learning concept
     * @returns {Object} Validation rules and guidelines
     */
    getValidationRules(currentConceptId) {
        if (!this.ontologyEngine.isReady()) return {};

        const currentConcept = this.ontologyEngine.getConceptById(currentConceptId);
        const allowedConcepts = this.ontologyEngine.getAllowedConcepts(currentConceptId);
        const objectives = this.ontologyEngine.getLearningObjectives(currentConceptId);

        return {
            currentConcept: {
                id: currentConceptId,
                name: currentConcept?.name,
                description: currentConcept?.description
            },
            allowedConcepts: allowedConcepts.map(id => ({
                id,
                name: this.ontologyEngine.getConceptById(id)?.name
            })),
            learningObjectives: objectives.map(obj => ({
                id: obj.id,
                name: obj.name,
                description: obj.description,
                code: obj.code
            })),
            guidelines: {
                'stay_within_concepts': 'Only use functions and patterns from allowed concepts',
                'focus_current': `Emphasize ${currentConcept?.name} learning objectives`,
                'build_incrementally': 'Build on prerequisite concepts gradually',
                'keep_simple': 'Avoid complex patterns not yet introduced'
            }
        };
    }

    /**
     * Generate validation report for debugging
     * @param {string} code - Code to analyze
     * @param {string} currentConceptId - Current learning concept
     * @returns {Object} Detailed validation report
     */
    generateValidationReport(code, currentConceptId) {
        const validation = this.validateCodeForConcept(code, currentConceptId);
        const detectedObjectives = this.ontologyEngine.detectLearningObjectives(code);
        
        return {
            ...validation,
            detectedObjectives,
            analysis: {
                codeLength: code.length,
                lineCount: code.split('\n').length,
                complexity: this.estimateComplexity(code),
                concepts: validation.metadata?.detectedConcepts || []
            },
            recommendations: validation.allowed ? 
                'Code is appropriate for current learning level' :
                'Consider using simpler concepts from current learning objectives'
        };
    }

    /**
     * Estimate code complexity (simple heuristic)
     * @param {string} code - Code to analyze
     * @returns {string} Complexity level
     */
    estimateComplexity(code) {
        const lines = code.split('\n').filter(line => line.trim().length > 0).length;
        const functions = (code.match(/function\s+\w+/g) || []).length;
        const loops = (code.match(/for\s*\(|while\s*\(/g) || []).length;
        const conditionals = (code.match(/if\s*\(/g) || []).length;

        const complexityScore = lines + (functions * 3) + (loops * 5) + (conditionals * 2);

        if (complexityScore < 10) return 'simple';
        if (complexityScore < 25) return 'moderate';
        if (complexityScore < 50) return 'complex';
        return 'advanced';
    }

    /**
     * Check if validator is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.ontologyEngine && this.ontologyEngine.isReady();
    }

    /**
     * Get validator status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            ready: this.isReady(),
            ontologyReady: this.ontologyEngine?.isReady() || false,
            validationRulesAvailable: this.isReady()
        };
    }
}