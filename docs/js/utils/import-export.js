// Import/Export - Save, share, and backup functionality
// Enables learners to save their work and share with others

export class ImportExport {
    constructor() {
        this.isInitialized = false;
        this.supportedFormats = {
            code: ['.js', '.txt'],
            project: ['.json']
        };
    }

    /**
     * Initialize the import/export system
     * @returns {boolean} Success status
     */
    init() {
        try {
            // Check for browser support
            if (!this.checkBrowserSupport()) {
                console.warn('Import/Export features may be limited in this browser');
            }
            
            this.isInitialized = true;
            console.log('Import/Export system initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize Import/Export:', error);
            return false;
        }
    }

    /**
     * Export current code as a downloadable file
     * @param {string} code - Code to export
     * @param {Object} options - Export options
     * @returns {boolean} Success status
     */
    exportCode(code, options = {}) {
        if (!this.isInitialized) {
            console.warn('Import/Export not initialized');
            return false;
        }

        try {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = options.filename || `vibe-sketch-${timestamp}.js`;
            
            // Create export data
            const exportData = this.createCodeExport(code, options);
            
            // Download as file
            this.downloadAsFile(exportData.content, filename, 'text/javascript');
            
            console.log('💾 Code exported successfully:', filename);
            return true;

        } catch (error) {
            console.error('Failed to export code:', error);
            return false;
        }
    }

    /**
     * Save current code using native save dialog (File System Access API)
     * @param {string} code - Code to save
     * @param {Object} options - Save options
     * @returns {Promise<boolean>} Success status
     */
    async saveCodeWithDialog(code, options = {}) {
        if (!this.isInitialized) {
            console.warn('Import/Export not initialized');
            return false;
        }

        try {
            // Create export data
            const exportData = this.createCodeExport(code, options);
            
            // Try native save dialog first
            if (this.supportsFileSystemAccess()) {
                return await this.saveWithNativeDialog(exportData.content, options);
            } else {
                // Fallback to traditional download
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const filename = options.filename || `vibe-sketch-${timestamp}.js`;
                this.downloadAsFile(exportData.content, filename, 'text/javascript');
                console.log('💾 Code exported successfully (fallback):', filename);
                return true;
            }

        } catch (error) {
            console.error('Failed to save code:', error);
            return false;
        }
    }

    /**
     * Export full project including code, history, and learning progress
     * @param {Object} projectData - Complete project state
     * @returns {boolean} Success status
     */
    exportProject(projectData) {
        if (!this.isInitialized) {
            console.warn('Import/Export not initialized');
            return false;
        }

        try {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const filename = `vibe-project-${timestamp}.json`;
            
            // Create complete project export
            const exportData = this.createProjectExport(projectData);
            
            // Validate export data
            if (!this.validateProjectExport(exportData)) {
                throw new Error('Invalid project export data');
            }
            
            // Download as JSON file
            const jsonString = JSON.stringify(exportData, null, 2);
            this.downloadAsFile(jsonString, filename, 'application/json');
            
            console.log('📦 Project exported successfully:', filename);
            return true;

        } catch (error) {
            console.error('Failed to export project:', error);
            return false;
        }
    }

    /**
     * Import code from file
     * @param {File} file - File to import
     * @returns {Promise<Object>} Import result with code and metadata
     */
    async importCode(file) {
        if (!this.isInitialized) {
            throw new Error('Import/Export not initialized');
        }

        try {
            // Validate file
            if (!this.validateCodeFile(file)) {
                throw new Error('Invalid code file format');
            }

            // Read file content
            const content = await this.readFileAsText(file);
            
            // Parse content based on file type
            const importData = this.parseCodeImport(content, file);
            
            console.log('📥 Code imported successfully from:', file.name);
            return {
                success: true,
                code: importData.code,
                metadata: importData.metadata,
                filename: file.name
            };

        } catch (error) {
            console.error('Failed to import code:', error);
            return {
                success: false,
                error: error.message,
                filename: file.name
            };
        }
    }

    /**
     * Import full project from file
     * @param {File} file - Project file to import
     * @returns {Promise<Object>} Import result with full project data
     */
    async importProject(file) {
        if (!this.isInitialized) {
            throw new Error('Import/Export not initialized');
        }

        try {
            // Validate file
            if (!this.validateProjectFile(file)) {
                throw new Error('Invalid project file format');
            }

            // Read and parse JSON content
            const content = await this.readFileAsText(file);
            const projectData = JSON.parse(content);
            
            // Validate project data structure
            if (!this.validateProjectImport(projectData)) {
                throw new Error('Invalid project data structure');
            }

            // Migrate data if needed
            const migratedData = this.migrateProjectData(projectData);
            
            console.log('📦 Project imported successfully from:', file.name);
            return {
                success: true,
                projectData: migratedData,
                filename: file.name
            };

        } catch (error) {
            console.error('Failed to import project:', error);
            return {
                success: false,
                error: error.message,
                filename: file.name
            };
        }
    }

    /**
     * Generate shareable link for code (base64 encoded)
     * @param {string} code - Code to share
     * @param {Object} options - Share options
     * @returns {string} Shareable URL
     */
    generateShareableLink(code, options = {}) {
        try {
            const shareData = {
                code: code,
                concept: options.concept || null,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };

            // Encode as base64
            const encoded = btoa(JSON.stringify(shareData));
            
            // Create URL (would need server endpoint in real implementation)
            const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
            
            console.log('🔗 Shareable link generated');
            return shareUrl;

        } catch (error) {
            console.error('Failed to generate shareable link:', error);
            return null;
        }
    }

    /**
     * Parse shareable link and extract code
     * @param {string} shareParam - Share parameter from URL
     * @returns {Object|null} Decoded share data
     */
    parseShareableLink(shareParam) {
        try {
            const decoded = atob(shareParam);
            const shareData = JSON.parse(decoded);
            
            // Validate share data
            if (!shareData.code || !shareData.version) {
                throw new Error('Invalid share data structure');
            }
            
            console.log('🔗 Shareable link parsed successfully');
            return shareData;

        } catch (error) {
            console.error('Failed to parse shareable link:', error);
            return null;
        }
    }

    /**
     * Create code export data structure
     * @param {string} code - Code to export
     * @param {Object} options - Export options
     * @returns {Object} Export data
     */
    createCodeExport(code, options) {
        const header = `// Vibe Coding Instructor - P5.js Sketch
// Exported: ${new Date().toLocaleString()}
// Concept: ${options.concept || 'Unknown'}
// Learn more at: https://github.com/your-repo/vibe-coding-instructor

`;

        return {
            content: header + code,
            metadata: {
                exportedAt: new Date().toISOString(),
                concept: options.concept || null,
                codeLength: code.length,
                exportType: 'code_only'
            }
        };
    }

    /**
     * Create project export data structure
     * @param {Object} projectData - Complete project state
     * @returns {Object} Export data
     */
    createProjectExport(projectData) {
        return {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            exportType: 'full_project',
            
            // Code and history
            code: projectData.currentCode || '',
            codeHistory: this.compressHistoryForExport(projectData.codeHistory || []),
            
            // Learning context
            learningProgress: {
                currentConcept: projectData.currentConcept || null,
                completedObjectives: projectData.completedObjectives || [],
                detectedObjectives: projectData.detectedObjectives || [],
                masteryData: projectData.masteryData || null
            },
            
            // Session info
            sessionData: {
                sessionId: projectData.sessionId || null,
                startTime: projectData.startTime || null,
                totalTime: projectData.totalTime || 0
            },
            
            // Settings
            settings: projectData.settings || {
                autoSave: true,
                autoRun: true,
                undoLimit: 50
            }
        };
    }

    /**
     * Parse imported code content
     * @param {string} content - File content
     * @param {File} file - Original file
     * @returns {Object} Parsed import data
     */
    parseCodeImport(content, file) {
        // Remove export header if present
        const cleanCode = this.cleanImportedCode(content);
        
        return {
            code: cleanCode,
            metadata: {
                filename: file.name,
                fileSize: file.size,
                importedAt: new Date().toISOString(),
                originalSize: content.length,
                cleanedSize: cleanCode.length
            }
        };
    }

    /**
     * Clean imported code by removing export headers
     * @param {string} code - Raw imported code
     * @returns {string} Cleaned code
     */
    cleanImportedCode(code) {
        // Remove our export header
        const headerPattern = /^\/\/ Vibe Coding Instructor.*?\n\n/s;
        let cleaned = code.replace(headerPattern, '');
        
        // Remove common code comments that might interfere
        cleaned = cleaned.replace(/^\/\/ Exported:.*?\n/gm, '');
        cleaned = cleaned.replace(/^\/\/ Concept:.*?\n/gm, '');
        cleaned = cleaned.replace(/^\/\/ Learn more at:.*?\n/gm, '');
        
        return cleaned.trim();
    }

    /**
     * Compress code history for export (keep only important entries)
     * @param {Array} history - Full code history
     * @returns {Array} Compressed history
     */
    compressHistoryForExport(history) {
        if (!Array.isArray(history) || history.length <= 10) {
            return history; // No compression needed
        }

        // Keep first entry, last entry, and significant milestones
        const compressed = [];
        
        // Always keep first and last
        compressed.push(history[0]);
        
        // Keep every 5th entry from the middle
        for (let i = 5; i < history.length - 1; i += 5) {
            compressed.push(history[i]);
        }
        
        // Always keep last
        if (history.length > 1) {
            compressed.push(history[history.length - 1]);
        }
        
        console.log(`📦 Compressed history: ${history.length} → ${compressed.length} entries`);
        return compressed;
    }

    /**
     * Migrate project data to current version
     * @param {Object} projectData - Raw project data
     * @returns {Object} Migrated project data
     */
    migrateProjectData(projectData) {
        // Handle version migrations
        if (projectData.version === '1.0') {
            return projectData; // Already current version
        }

        // Migration for older versions would go here
        console.log('📦 Migrating project data from older version');
        
        return {
            ...projectData,
            version: '1.0',
            migratedAt: new Date().toISOString()
        };
    }

    /**
     * Download data as file
     * @param {string} content - File content
     * @param {string} filename - File name
     * @param {string} mimeType - MIME type
     */
    downloadAsFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up object URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    /**
     * Check if File System Access API is supported
     * @returns {boolean} Support status
     */
    supportsFileSystemAccess() {
        return 'showSaveFilePicker' in window;
    }

    /**
     * Save file using native save dialog (File System Access API)
     * @param {string} content - File content
     * @param {Object} options - Save options
     * @returns {Promise<boolean>} Success status
     */
    async saveWithNativeDialog(content, options = {}) {
        try {
            // Configure file picker options
            const pickerOptions = {
                types: [
                    {
                        description: 'JavaScript files',
                        accept: {
                            'text/javascript': ['.js'],
                            'text/plain': ['.txt']
                        }
                    }
                ],
                suggestedName: options.filename || `vibe-sketch-${new Date().toISOString().slice(0, 10)}.js`
            };

            // Show save dialog
            const fileHandle = await window.showSaveFilePicker(pickerOptions);
            
            // Create a writable stream
            const writable = await fileHandle.createWritable();
            
            // Write content to file
            await writable.write(content);
            await writable.close();
            
            console.log('💾 Code saved successfully with native dialog:', fileHandle.name);
            return true;

        } catch (error) {
            // User cancelled or other error
            if (error.name === 'AbortError') {
                console.log('Save dialog cancelled by user');
                return false;
            }
            console.error('Failed to save with native dialog:', error);
            throw error;
        }
    }

    /**
     * Read file as text
     * @param {File} file - File to read
     * @returns {Promise<string>} File content
     */
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            
            reader.readAsText(file);
        });
    }

    /**
     * Validate code file
     * @param {File} file - File to validate
     * @returns {boolean} Valid status
     */
    validateCodeFile(file) {
        // Check file size (max 1MB for code files)
        if (file.size > 1024 * 1024) {
            throw new Error('Code file too large (max 1MB)');
        }

        // Check file extension
        const extension = this.getFileExtension(file.name);
        if (!this.supportedFormats.code.includes(extension)) {
            throw new Error(`Unsupported file type: ${extension}`);
        }

        return true;
    }

    /**
     * Validate project file
     * @param {File} file - File to validate
     * @returns {boolean} Valid status
     */
    validateProjectFile(file) {
        // Check file size (max 5MB for project files)
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('Project file too large (max 5MB)');
        }

        // Check file extension
        const extension = this.getFileExtension(file.name);
        if (!this.supportedFormats.project.includes(extension)) {
            throw new Error(`Unsupported project file type: ${extension}`);
        }

        return true;
    }

    /**
     * Validate project export data
     * @param {Object} data - Export data to validate
     * @returns {boolean} Valid status
     */
    validateProjectExport(data) {
        return data &&
               typeof data.version === 'string' &&
               typeof data.exportedAt === 'string' &&
               typeof data.code === 'string' &&
               typeof data.learningProgress === 'object';
    }

    /**
     * Validate project import data
     * @param {Object} data - Import data to validate
     * @returns {boolean} Valid status
     */
    validateProjectImport(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        // Check required fields
        const requiredFields = ['version', 'exportedAt', 'code'];
        for (const field of requiredFields) {
            if (!(field in data)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        return true;
    }

    /**
     * Get file extension from filename
     * @param {string} filename - File name
     * @returns {string} File extension
     */
    getFileExtension(filename) {
        return filename.toLowerCase().substring(filename.lastIndexOf('.'));
    }

    /**
     * Check browser support for import/export features
     * @returns {boolean} Support status
     */
    checkBrowserSupport() {
        return !!(window.Blob && 
                 window.URL && 
                 window.FileReader && 
                 document.createElement('a').download !== undefined);
    }

    /**
     * Get import/export statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        return {
            initialized: this.isInitialized,
            browserSupport: this.checkBrowserSupport(),
            supportedFormats: this.supportedFormats
        };
    }

    /**
     * Check if import/export is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized && this.checkBrowserSupport();
    }
}