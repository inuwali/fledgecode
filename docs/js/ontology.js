// Ontology Engine for P5.js concept detection and validation

export class OntologyEngine {
    constructor() {
        this.ontology = null;
        this.concepts = new Map();
        this.learningObjectives = new Map();
        this.compiledPatterns = new Map();
        this.isLoaded = false;
    }

    /**
     * Load ontology from JSON file
     * @param {string} ontologyPath - Optional path to ontology JSON file. If not provided, uses default 'ontology/processing-concept-hierarchy.json'
     * @returns {Promise<boolean>} Success status
     */
    async loadOntology(ontologyPath) {
        try {
            const path = ontologyPath || 'ontology/processing-concept-hierarchy.json';
            console.log(`Loading ontology from: ${path}`);

            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load ontology: ${response.status}`);
            }

            this.ontology = await response.json();
            this.indexOntology();
            this.compileRegexPatterns();
            this.isLoaded = true;

            console.log(`Ontology loaded: ${this.concepts.size} concepts, ${this.learningObjectives.size} learning objectives`);
            return true;

        } catch (error) {
            console.error('Failed to load ontology:', error);
            this.isLoaded = false;
            return false;
        }
    }

    /**
     * Index ontology data for fast access
     * Uses new fine-grained structure with:
     * - Concepts referencing learning objectives by ID
     * - Top-level learningObjectives array with full definitions
     */
    indexOntology() {
        if (!this.ontology || !this.ontology.creativeCodingConcepts || !this.ontology.learningObjectives) {
            throw new Error('Invalid ontology structure: missing creativeCodingConcepts or learningObjectives');
        }

        // Index concepts by ID
        for (const concept of this.ontology.creativeCodingConcepts) {
            this.concepts.set(concept.id, concept);
        }

        // Index fine-grained learning objectives with concept associations
        for (const objective of this.ontology.learningObjectives) {
            this.learningObjectives.set(objective.id, {
                ...objective,
                // Map first concept as the primary one for backwards compatibility with detection
                conceptId: objective.concepts?.[0] || null,
                conceptName: objective.concepts?.[0] ? this.concepts.get(objective.concepts[0])?.name : null
            });
        }
    }

    /**
     * Compile regex patterns for performance
     */
    compileRegexPatterns() {
        let compiledCount = 0;
        let errorCount = 0;
        
        for (const [key, objective] of this.learningObjectives) {
            if (objective.regexPatterns && Array.isArray(objective.regexPatterns)) {
                const compiledPatterns = objective.regexPatterns.map(pattern => {
                    try {
                        const regex = new RegExp(pattern, 'g');
                        compiledCount++;
                        return regex;
                    } catch (error) {
                        console.warn(`Invalid regex pattern for ${key}: ${pattern}`, error);
                        errorCount++;
                        return null;
                    }
                }).filter(Boolean);
                
                if (compiledPatterns.length > 0) {
                    this.compiledPatterns.set(key, compiledPatterns);
                }
            }
        }
        
        console.log(`Compiled ${compiledCount} regex patterns, ${errorCount} errors`);
    }

    /**
     * Strip comments from code before analysis
     * @param {string} code - Code to strip comments from
     * @returns {string} Code without comments
     * @private
     */
    stripComments(code) {
        // Remove single-line comments
        let stripped = code.replace(/\/\/.*$/gm, '');
        // Remove multi-line comments
        stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
        return stripped;
    }

    /**
     * Detect concepts in code using learning objectives
     * @param {string} code - Code to analyze
     * @returns {Array} Detected concept IDs
     */
    detectConcepts(code) {
        if (!this.isLoaded) {
            console.warn('Ontology not loaded');
            return [];
        }

        // Strip comments before detection to avoid false positives
        const detectedObjectives = this.detectLearningObjectives(code);
        const conceptIds = new Set();

        for (const objective of detectedObjectives) {
            // objective.concepts is now an array, spread it into the Set
            if (objective.concepts && Array.isArray(objective.concepts)) {
                objective.concepts.forEach(conceptId => conceptIds.add(conceptId));
            }
        }

        return Array.from(conceptIds);
    }

    /**
     * Detect specific learning objectives in code
     * @param {string} code - Code to analyze
     * @returns {Array} Detected learning objectives
     */
    detectLearningObjectives(code) {
        if (!this.isLoaded) {
            console.warn('Ontology not loaded');
            return [];
        }

        const codeWithoutComments = this.stripComments(code);

        const detected = [];
        let totalChecked = 0;

        for (const [key, patterns] of this.compiledPatterns) {
            const objective = this.learningObjectives.get(key);
            if (!objective) continue;

            let found = false;
            for (const pattern of patterns) {
                pattern.lastIndex = 0; // Reset regex state
                totalChecked++;
                
                if (pattern.test(codeWithoutComments)) {
                    found = true;
                    // console.log(`Pattern matched for ${key}: ${pattern.source}`); // Debug only
                    break;
                }
            }

            if (found) {
                detected.push(objective);
            }
        }

        // console.log(`Checked ${totalChecked} patterns, found ${detected.length} matches`); // Debug only
        return detected;
    }

    /**
     * Get concept by ID
     * @param {string} conceptId - Concept identifier
     * @returns {Object|null} Concept data
     */
    getConceptById(conceptId) {
        if (!this.isLoaded) {
            console.warn('Ontology not loaded');
            return null;
        }

        return this.concepts.get(conceptId) || null;
    }

    /**
     * Get all learning objectives for a concept
     * @param {string} conceptId - Concept identifier
     * @returns {Array} Learning objectives with full definitions
     */
    getLearningObjectives(conceptId) {
        if (!this.isLoaded) {
            console.warn('Ontology not loaded');
            return [];
        }

        const concept = this.concepts.get(conceptId);
        if (!concept || !concept.learningObjectives) {
            return [];
        }

        // concept.learningObjectives now contains IDs (strings), look up full definitions
        return concept.learningObjectives
            .map(objectiveId => this.learningObjectives.get(objectiveId))
            .filter(Boolean);
    }

    /**
     * Get prerequisite concepts for a given concept
     * @param {string} conceptId - Concept identifier
     * @returns {Array} Prerequisite concept IDs
     */
    getPrerequisites(conceptId) {
        if (!this.isLoaded) {
            console.warn('Ontology not loaded');
            return [];
        }

        const concept = this.concepts.get(conceptId);
        if (!concept) {
            return [];
        }

        return concept.prerequisites || [];
    }

    /**
     * Get all available concepts (for dropdown selection)
     * @returns {Array} All concepts with basic info
     */
    getAllConcepts() {
        if (!this.isLoaded) {
            console.warn('Ontology not loaded');
            return [];
        }

        return Array.from(this.concepts.values()).map(concept => ({
            id: concept.id,
            name: concept.name,
            description: concept.description,
            difficulty: concept.difficulty,
            category: concept.category,
            prerequisites: concept.prerequisites || []
        }));
    }

    /**
     * Get creative pathways
     * @returns {Object} Creative pathways from ontology
     */
    getCreativePathways() {
        if (!this.isLoaded || !this.ontology.creativePathways) {
            console.warn('Ontology not loaded or no creative pathways');
            return {};
        }

        return this.ontology.creativePathways;
    }

    /**
     * Get artistic goals
     * @returns {Object} Artistic goals from ontology
     */
    getArtisticGoals() {
        if (!this.isLoaded || !this.ontology.artisticGoals) {
            console.warn('Ontology not loaded or no artistic goals');
            return {};
        }

        return this.ontology.artisticGoals;
    }

    /**
     * Internal validation for LLM-generated code (Phase 3)
     * @param {string} code - Code to validate
     * @param {string} currentConceptId - Current learning concept
     * @returns {Object} Validation result
     */
    validateCodeForConcept(code, currentConceptId) {
        if (!this.isLoaded) {
            console.warn('Ontology not loaded');
            return { allowed: true, violations: [], alternatives: [] };
        }

        const detectedConcepts = this.detectConcepts(code);
        const allowedConcepts = this.getAllowedConcepts(currentConceptId);
        
        const violations = detectedConcepts.filter(conceptId => 
            !allowedConcepts.includes(conceptId)
        );

        return {
            allowed: violations.length === 0,
            violatingConcepts: violations,
            detectedConcepts,
            allowedConcepts,
            alternatives: violations.length > 0 ? this.suggestAlternatives(violations, currentConceptId) : []
        };
    }

    /**
     * Get all concepts allowed for current concept (including prerequisites)
     * @param {string} currentConceptId - Current learning concept
     * @returns {Array} Allowed concept IDs
     */
    getAllowedConcepts(currentConceptId) {
        if (!this.isLoaded) return [];

        const allowed = new Set([currentConceptId]);
        const prerequisites = this.getPrerequisites(currentConceptId);
        
        // Add all prerequisites recursively
        const addPrerequisites = (conceptId) => {
            const prereqs = this.getPrerequisites(conceptId);
            for (const prereq of prereqs) {
                if (!allowed.has(prereq)) {
                    allowed.add(prereq);
                    addPrerequisites(prereq); // Recursive
                }
            }
        };

        addPrerequisites(currentConceptId);
        
        return Array.from(allowed);
    }

    /**
     * Suggest alternatives for violating concepts (for LLM)
     * @param {Array} violatingConcepts - Concepts that violate current level
     * @param {string} currentConceptId - Current learning concept
     * @returns {Array} Alternative code suggestions
     */
    suggestAlternatives(violatingConcepts, currentConceptId) {
        // This is a placeholder for Phase 3 LLM integration
        // Will be expanded with actual alternative generation logic
        const currentConcept = this.getConceptById(currentConceptId);
        if (!currentConcept) return [];

        const alternatives = [];
        const objectives = this.getLearningObjectives(currentConceptId);

        // Suggest simple examples from current concept
        for (const objective of objectives.slice(0, 3)) { // Max 3 alternatives
            if (objective.code) {
                alternatives.push({
                    code: objective.code,
                    description: objective.description,
                    objective: objective.name,
                    objectiveId: objective.id
                });
            }
        }

        return alternatives;
    }

    /**
     * Get a fine-grained learning objective by ID
     * Alias for backwards compatibility
     * @param {string} objectiveId - Learning objective ID
     * @returns {Object|null} Learning objective or null
     */
    getLearningObjectiveById(objectiveId) {
        if (!this.isLoaded) {
            console.warn('Ontology not loaded');
            return null;
        }

        return this.learningObjectives.get(objectiveId) || null;
    }

    /**
     * Get function objective by ID (alias for getLearningObjectiveById)
     * @param {string} functionId - Function objective ID
     * @returns {Object|null} Function objective or null
     */
    getFunctionObjective(functionId) {
        return this.getLearningObjectiveById(functionId);
    }

    /**
     * Get all fine-grained learning objectives (only if new structure exists)
     * @returns {Array} All learning objectives from top-level array
     */
    getAllFineGrainedObjectives() {
        if (!this.isLoaded || !this.ontology.learningObjectives) {
            return [];
        }

        return this.ontology.learningObjectives;
    }

    /**
     * Get prerequisite functions/objectives for a given objective
     * @param {string} objectiveId - Learning objective ID
     * @returns {Array} Prerequisite objective IDs
     */
    getObjectivePrerequisites(objectiveId) {
        if (!this.isLoaded) {
            console.warn('Ontology not loaded');
            return [];
        }

        const objective = this.getLearningObjectiveById(objectiveId);
        if (!objective) {
            return [];
        }

        return objective.prerequisites || [];
    }

    /**
     * Get all functions that depend on a given objective (reverse dependencies)
     * @param {string} objectiveId - Learning objective ID
     * @returns {Array} Dependent objective IDs
     */
    getObjectiveDependents(objectiveId) {
        if (!this.isLoaded || !this.ontology.learningObjectives) {
            return [];
        }

        return this.ontology.learningObjectives
            .filter(obj => obj.prerequisites && obj.prerequisites.includes(objectiveId))
            .map(obj => obj.id);
    }

    /**
     * Validate code against fine-grained prerequisites
     * @param {string} code - Code to validate
     * @param {string} allowedObjectiveId - Currently allowed objective
     * @returns {Object} Validation result with prerequisite violations
     */
    validateCodeAgainstObjectives(code, allowedObjectiveId) {
        if (!this.isLoaded) {
            console.warn('Ontology not loaded');
            return { allowed: true, violations: [], allowedFunctions: [] };
        }

        const detectedFunctions = this.detectLearningObjectives(code);
        const allowedFunctions = this.getAllowedFunctions(allowedObjectiveId);

        const violations = detectedFunctions.filter(func =>
            !allowedFunctions.includes(func.id)
        );

        return {
            allowed: violations.length === 0,
            violatingFunctions: violations.map(f => f.id),
            detectedFunctions: detectedFunctions.map(f => f.id),
            allowedFunctions,
            details: violations
        };
    }

    /**
     * Get all functions allowed for a given objective (including prerequisite chain)
     * @param {string} objectiveId - Objective ID
     * @returns {Array} Allowed function IDs
     */
    getAllowedFunctions(objectiveId) {
        if (!this.isLoaded) return [];

        const allowed = new Set([objectiveId]);
        const prerequisites = this.getObjectivePrerequisites(objectiveId);

        // Add all prerequisites recursively
        const addPrerequisites = (objId) => {
            const prereqs = this.getObjectivePrerequisites(objId);
            for (const prereq of prereqs) {
                if (!allowed.has(prereq)) {
                    allowed.add(prereq);
                    addPrerequisites(prereq); // Recursive
                }
            }
        };

        addPrerequisites(objectiveId);

        return Array.from(allowed);
    }

    /**
     * Get all functions/objectives in a category
     * @param {string} category - Category name (e.g., 'p5Drawing', 'jsLanguage')
     * @returns {Array} Function objectives in the category
     */
    getFunctionsByCategory(category) {
        if (!this.isLoaded || !this.ontology.learningObjectives) {
            return [];
        }

        return this.ontology.learningObjectives.filter(obj => obj.category === category);
    }

    /**
     * Get full prerequisite chain for a function (all prerequisites recursively)
     * Mirrors visualizer logic for consistency
     * @param {string} functionId - Function ID
     * @param {Set} visited - Set of visited nodes (for cycle detection)
     * @returns {Array} All prerequisite objective IDs in dependency order
     */
    getPrerequisiteChain(functionId, visited = new Set()) {
        if (!this.isLoaded) {
            return [];
        }

        if (visited.has(functionId)) {
            return [];
        }

        visited.add(functionId);

        const objective = this.getFunctionObjective(functionId);
        if (!objective || !objective.prerequisites.length) {
            return [];
        }

        let chain = [];
        for (const prereqId of objective.prerequisites) {
            const prereq = this.getFunctionObjective(prereqId);
            if (prereq) {
                chain.push(prereq);
                chain = chain.concat(this.getPrerequisiteChain(prereqId, new Set(visited)));
            }
        }

        // Remove duplicates while preserving order
        const seen = new Set();
        return chain.filter(obj => {
            if (seen.has(obj.id)) return false;
            seen.add(obj.id);
            return true;
        });
    }

    /**
     * Get what depends on a function (reverse dependencies)
     * Alias for getObjectiveDependents for consistency with Task 2 spec
     * @param {string} functionId - Function ID
     * @returns {Array} Function IDs that depend on this one
     */
    getDependents(functionId) {
        return this.getObjectiveDependents(functionId);
    }

    /**
     * Get category breakdown of learning objectives
     * @returns {Object} Count of objectives by category
     */
    getCategoryStats() {
        if (!this.isLoaded || !this.ontology.learningObjectives) {
            return {};
        }

        const stats = {};
        for (const objective of this.ontology.learningObjectives) {
            const category = objective.category || 'uncategorized';
            stats[category] = (stats[category] || 0) + 1;
        }

        return stats;
    }

    /**
     * Validate prerequisite chains for issues
     * Checks for:
     * - Circular dependencies
     * - Missing prerequisite references
     * - Orphaned objectives (not linked to any concept)
     * @returns {Object} Validation result with errors and warnings
     */
    validatePrerequisiteChains() {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            stats: {
                totalObjectives: 0,
                orphaned: 0,
                circularDeps: 0,
                missingRefs: 0
            }
        };

        if (!this.isLoaded || !this.ontology.learningObjectives) {
            return result;
        }

        const objectives = this.ontology.learningObjectives;
        result.stats.totalObjectives = objectives.length;

        // Check each objective
        for (const objective of objectives) {
            // Check for orphaned objectives (not linked to any concept)
            if (!objective.concepts || objective.concepts.length === 0) {
                result.warnings.push(`Orphaned objective: ${objective.id} not linked to any concept`);
                result.stats.orphaned++;
            }

            // Check prerequisites
            if (objective.prerequisites && Array.isArray(objective.prerequisites)) {
                for (const prereqId of objective.prerequisites) {
                    // Check for missing references
                    const prereq = this.getFunctionObjective(prereqId);
                    if (!prereq) {
                        result.errors.push(`Missing reference: ${objective.id} requires ${prereqId} which doesn't exist`);
                        result.stats.missingRefs++;
                        result.valid = false;
                    }

                    // Check for circular dependencies
                    if (this.hasCircularDependency(objective.id, new Set())) {
                        result.errors.push(`Circular dependency detected involving ${objective.id}`);
                        result.stats.circularDeps++;
                        result.valid = false;
                        break;
                    }
                }
            }
        }

        return result;
    }

    /**
     * Internal helper: check if objective has circular dependency
     * @private
     * @param {string} objectiveId - Objective to check
     * @param {Set} visited - Already visited objectives
     * @returns {boolean} True if circular dependency found
     */
    hasCircularDependency(objectiveId, visited) {
        if (visited.has(objectiveId)) {
            return true;
        }

        visited.add(objectiveId);

        const objective = this.getFunctionObjective(objectiveId);
        if (!objective || !objective.prerequisites) {
            return false;
        }

        for (const prereqId of objective.prerequisites) {
            if (this.hasCircularDependency(prereqId, new Set(visited))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if ontology is ready
     * @returns {boolean} Loading status
     */
    isReady() {
        return this.isLoaded;
    }

    /**
     * Get loading status and stats
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            loaded: this.isLoaded,
            conceptCount: this.concepts.size,
            objectiveCount: this.learningObjectives.size,
            patternCount: this.compiledPatterns.size,
            fineGrainedCount: this.ontology?.learningObjectives?.length || 0,
            hasFineGrained: !!(this.ontology?.learningObjectives)
        };
    }
}