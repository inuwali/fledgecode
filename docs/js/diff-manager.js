// Diff Manager - Handles code diffs, decorations, and educational explanations
// Phase 6: Educational Diffs

// Import diff library from CDN as ES module
import { structuredPatch } from 'https://esm.sh/diff@5.1.0';

export class DiffManager {
    constructor(editor) {
        this.editor = editor;              // Monaco editor instance
        this.decorations = [];             // Current decoration IDs
        this.explanations = new Map();     // Explanations mapped to line ranges
        this.diffChunks = [];             // Current diff chunks
        this.explanationMap = new Map();  // Map chunk index to explanation
        this.activePopup = null;          // Current popup element
        this.contentWidgets = [];         // Info icon widgets
        this.modalOverlay = null;         // Modal overlay element
        this.isModalActive = false;       // Track modal state
        this.isInitialized = false;
        this.ignoreNextEdit = false;      // Flag to ignore format/system edits
    }

    /**
     * Initialize diff manager
     */
    init() {
        if (!this.editor) {
            console.error('DiffManager: No editor instance provided');
            return false;
        }

        // Verify diff library imported successfully
        if (typeof structuredPatch !== 'function') {
            console.error('DiffManager: structuredPatch function not imported correctly');
            return false;
        }

        this.setupEventListeners();
        this.isInitialized = true;
        console.log('✅ DiffManager initialized with diff library');
        return true;
    }

    /**
     * Extract [EXPLAIN] comments from generated code
     * @param {string} code - Generated code with [EXPLAIN] comments
     * @returns {Array} Array of {comment, lineNumber, originalLine, targetLineContent}
     */
    extractExplanations(code) {
        const explanations = [];
        const lines = code.split('\n');
        const explainPattern = /\/\/\s*\[EXPLAIN\]\s*(.+)/i;

        lines.forEach((line, index) => {
            const match = line.match(explainPattern);
            if (match) {
                // Find the next non-empty, non-comment line after this [EXPLAIN]
                let targetLineContent = null;
                for (let i = index + 1; i < lines.length; i++) {
                    const nextLine = lines[i].trim();
                    if (nextLine && !nextLine.startsWith('//')) {
                        targetLineContent = nextLine;
                        break;
                    }
                }

                explanations.push({
                    comment: match[1].trim(),
                    lineNumber: index + 1,
                    originalLine: line,
                    targetLineContent: targetLineContent // The code line this explains
                });
            }
        });

        console.log(`📝 Extracted ${explanations.length} [EXPLAIN] comments`);
        explanations.forEach((exp, idx) => {
            console.log(`  [${idx}] Target: "${exp.targetLineContent}"`);
        });
        return explanations;
    }

    /**
     * Clean [EXPLAIN] comments from code (keep regular comments)
     * @param {string} code - Code with [EXPLAIN] comments
     * @returns {string} Code with [EXPLAIN] comments removed
     */
    cleanExplanationComments(code) {
        // Remove entire lines containing [EXPLAIN] comments
        const explainPattern = /^.*\/\/\s*\[EXPLAIN\][^\n]*\n?/gim;
        return code.replace(explainPattern, '');
    }

    /**
     * Calculate diff and apply code with decorations
     * Main workflow for applying LLM-generated code with visual diffs
     * @param {string} oldCode - Current code in editor (formatted)
     * @param {string} newCode - LLM-generated code with [EXPLAIN] comments
     * @param {Function} formatCallback - Callback to format code (async)
     */
    async applyCodeWithDiff(oldCode, newCode, formatCallback) {
        try {
            console.log('📊 Applying code with diff visualization...');

            // 1. Extract explanations before cleaning
            const explanations = this.extractExplanations(newCode);

            // 2. Clean [EXPLAIN] comments from code
            const cleanedCode = this.cleanExplanationComments(newCode);

            // 3. Apply cleaned code to editor first (ignore this change event)
            this.ignoreNextEdit = true;
            this.editor.setValue(cleanedCode);

            // 4. Format the code (ignore this change event too)
            if (formatCallback) {
                this.ignoreNextEdit = true;
                await formatCallback();
            }

            // 5. Get the final formatted code
            const formattedCode = this.editor.getValue();

            // 6. Calculate diff between old (formatted) and new (formatted) code
            const diffChunks = this.calculateDiff(oldCode, formattedCode);

            // 6b. Mark comment-only chunks (but keep them for decoration)
            diffChunks.forEach(chunk => {
                chunk.isCommentOnly = this.isCommentOnlyChunk(chunk);
            });

            // 7. Convert extracted explanations to blockIndex format (like second-tier)
            const mappedExplanations = this.convertExplanationsToBlockFormat(explanations, diffChunks);

            // 8. Add decorations for changes (without explanations initially)
            this.addDecorations(diffChunks, new Map());

            // 9. Add explanations using the unified path (same as second-tier)
            if (mappedExplanations.length > 0) {
                this.addExplanationsToExistingDiff(mappedExplanations);
            }

            console.log('✅ Diff applied with', diffChunks.length, 'changes');

        } catch (error) {
            console.error('Failed to apply code with diff:', error);
            // Fallback: just set the code without decorations
            this.editor.setValue(newCode);
        }
    }

    /**
     * Calculate diff using structured patch (unified diff format)
     * @param {string} oldCode - Original code
     * @param {string} newCode - New code
     * @returns {Array} Array of diff chunks {type, startLine, endLine, content, oldContent}
     */
    calculateDiff(oldCode, newCode) {
        // Create structured patch (like git diff)
        const patch = structuredPatch('code.js', 'code.js', oldCode, newCode, '', '', { context: 0 });

        const chunks = [];

        // Process each hunk (continuous change region)
        patch.hunks.forEach(hunk => {
            const addedLines = [];
            const removedLines = [];
            let currentNewLine = hunk.newStart;
            let chunkStartLine = null;
            let chunkEndLine = null;

            // Parse lines in this hunk
            hunk.lines.forEach(line => {
                const prefix = line[0];
                const content = line.substring(1); // Remove prefix

                if (prefix === '+') {
                    addedLines.push(content);
                    if (chunkStartLine === null) {
                        chunkStartLine = currentNewLine;
                    }
                    chunkEndLine = currentNewLine;
                    currentNewLine++;
                } else if (prefix === '-') {
                    removedLines.push(content);
                    if (chunkStartLine === null) {
                        chunkStartLine = currentNewLine;
                    }
                } else {
                    // Context line (shouldn't appear with context: 0, but handle it)
                    currentNewLine++;
                }
            });

            // Determine chunk type
            let type, content, oldContent;

            if (addedLines.length > 0 && removedLines.length > 0) {
                // Modification (both removed and added)
                type = 'modification';
                content = addedLines.join('\n');
                oldContent = removedLines.join('\n');
                chunkEndLine = chunkStartLine + addedLines.length - 1;
            } else if (addedLines.length > 0) {
                // Pure addition
                type = 'addition';
                content = addedLines.join('\n');
                chunkEndLine = chunkStartLine + addedLines.length - 1;
            } else if (removedLines.length > 0) {
                // Pure deletion
                type = 'deletion';
                content = removedLines.join('\n');
                chunkEndLine = chunkStartLine; // Deletions don't span multiple lines in the new code
            }

            if (chunkStartLine !== null) {
                chunks.push({
                    type,
                    startLine: chunkStartLine,
                    endLine: chunkEndLine,
                    content,
                    oldContent: oldContent || null
                });
            }
        });

        return chunks;
    }

    /**
     * Check if a diff chunk contains only comments (no executable code)
     * Uses Monaco's tokenization to accurately detect comments
     * @param {Object} chunk - Diff chunk {type, startLine, endLine, content}
     * @returns {boolean} True if chunk contains only comments
     */
    isCommentOnlyChunk(chunk) {
        const model = this.editor.getModel();

        for (let lineNum = chunk.startLine; lineNum <= chunk.endLine; lineNum++) {
            const lineContent = model.getLineContent(lineNum).trim();

            if (!lineContent) continue; // Skip empty lines

            // Get tokens for this line using Monaco's tokenization
            const tokens = monaco.editor.tokenize(lineContent, 'javascript')[0];

            // Check if all tokens are comments
            for (const token of tokens) {
                // Token types include: 'comment', 'string', 'keyword', 'identifier', etc.
                if (!token.type.includes('comment')) {
                    return false;
                }
            }
        }

        // All non-empty lines were comments
        return true;
    }

    /**
     * Convert extracted [EXPLAIN] comments to blockIndex format (same as second-tier)
     * This unifies the first-tier and second-tier explanation paths.
     * @param {Array} explanations - Extracted [EXPLAIN] comments with targetLineContent
     * @param {Array} diffChunks - Calculated diff chunks (with isCommentOnly property)
     * @returns {Array} Array of {blockIndex, explanation} objects
     */
    convertExplanationsToBlockFormat(explanations, diffChunks) {
        console.log('🔄 Converting explanations to block format:', {
            explanationCount: explanations.length,
            chunkCount: diffChunks.length
        });

        const mappedExplanations = [];
        const usedExplanations = new Set();

        // For each non-comment-only chunk, try to find a matching explanation
        diffChunks.forEach((chunk, blockIndex) => {
            // Skip comment-only chunks - they don't get explanations
            if (chunk.isCommentOnly) {
                console.log(`  Block ${blockIndex}: Skipping comment-only chunk`);
                return;
            }

            console.log(`  Block ${blockIndex}:`, {
                type: chunk.type,
                lines: `${chunk.startLine}-${chunk.endLine}`,
                content: chunk.content.substring(0, 50) + '...'
            });

            // Find first UNUSED explanation that matches this chunk's content
            const explanation = explanations.find((exp, idx) => {
                if (usedExplanations.has(idx)) return false;
                if (!exp.targetLineContent) return false;

                // Check if this chunk's content includes the target line
                const chunkContent = chunk.content.trim();
                const targetContent = exp.targetLineContent.trim();

                return chunkContent.includes(targetContent);
            });

            if (explanation) {
                const idx = explanations.indexOf(explanation);
                usedExplanations.add(idx);
                mappedExplanations.push({
                    blockIndex: blockIndex,
                    explanation: explanation.comment
                });
                console.log(`    ✅ Matched explanation: "${explanation.comment.substring(0, 50)}..."`);
            } else {
                console.log(`    ❌ No matching explanation found`);
            }
        });

        console.log(`🔄 Conversion complete: ${mappedExplanations.length} explanations mapped`);
        return mappedExplanations;
    }

    /**
     * Map extracted explanations to diff chunks
     * @deprecated Use convertExplanationsToBlockFormat instead
     * @param {Array} explanations - Extracted [EXPLAIN] comments with targetLineContent
     * @param {Array} diffChunks - Calculated diff chunks (with isCommentOnly property)
     * @returns {Map} Map of chunkIndex → explanation text
     */
    mapExplanationsToDiffs(explanations, diffChunks) {
        console.log('🗺️ Mapping explanations to diffs:', {
            explanationCount: explanations.length,
            chunkCount: diffChunks.length
        });

        const mapping = new Map();
        const usedExplanations = new Set(); // Track which explanations we've used

        diffChunks.forEach((chunk, chunkId) => {
            console.log(`  Chunk ${chunkId}:`, {
                type: chunk.type,
                lines: `${chunk.startLine}-${chunk.endLine}`,
                isCommentOnly: chunk.isCommentOnly,
                content: chunk.content.substring(0, 50) + '...'
            });

            // Skip comment-only chunks - they don't get explanations
            if (chunk.isCommentOnly) {
                console.log(`    ⏭️ Skipping comment-only chunk`);
                return;
            }

            // Find the closest UNUSED explanation that appears BEFORE this chunk
            // Comments explain the code below them, never above
            let bestMatch = null;
            let bestDistance = Infinity;

            explanations.forEach((exp, idx) => {
                if (usedExplanations.has(idx)) return; // Skip already-used explanations

                // Calculate distance from explanation line to chunk start
                // Only consider explanations that are BEFORE the chunk (lineNumber < startLine)
                if (exp.lineNumber < chunk.startLine) {
                    const distance = chunk.startLine - exp.lineNumber;
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestMatch = { exp, idx };
                    }
                }
            });

            if (bestMatch) {
                usedExplanations.add(bestMatch.idx); // Mark this explanation as used
                mapping.set(chunkId, bestMatch.exp.comment);
                console.log(`    ✅ Matched explanation from line ${bestMatch.exp.lineNumber} (distance: ${bestDistance})`);
            } else {
                console.log(`    ❌ No matching explanation found (no unused explanations before this chunk)`);
            }
        });

        console.log('🗺️ Mapping complete:', mapping.size, 'explanations mapped');
        return mapping;
    }

    /**
     * Add Monaco decorations for diff chunks
     * @param {Array} diffChunks - Diff chunks to decorate
     * @param {Map} explanationMap - Map of chunk index to explanation
     */
    addDecorations(diffChunks, explanationMap) {
        // Store for later reference
        this.diffChunks = diffChunks;
        this.explanationMap = explanationMap;

        // Clear any existing decorations first
        if (this.decorations.length > 0) {
            this.decorations = this.editor.deltaDecorations(this.decorations, []);
        }

        // Create decoration options for each chunk
        const decorationOptions = diffChunks.map((chunk, index) => {
            const hasExplanation = explanationMap.has(index);

            // Determine decoration class based on chunk type
            const className = chunk.type === 'addition'
                ? 'diff-addition'
                : chunk.type === 'deletion'
                ? 'diff-deletion'
                : 'diff-modification';

            const glyphClassName = chunk.type === 'addition'
                ? 'diff-glyph-addition'
                : chunk.type === 'deletion'
                ? 'diff-glyph-deletion'
                : 'diff-glyph-modification';

            const decoration = {
                range: new monaco.Range(
                    chunk.startLine, 1,
                    chunk.endLine, Number.MAX_SAFE_INTEGER
                ),
                options: {
                    isWholeLine: true,
                    className: className,
                    glyphMarginClassName: glyphClassName,
                    hoverMessage: {
                        value: hasExplanation
                            ? '💡 Click for explanation'
                            : 'Click to delete this change'
                    }
                }
            };

            return decoration;
        });

        // Apply decorations to editor
        this.decorations = this.editor.deltaDecorations([], decorationOptions);

        // Clear existing content widgets
        this.clearContentWidgets();

        // Add info icon widgets for chunks with explanations
        diffChunks.forEach((chunk, index) => {
            if (explanationMap.has(index)) {
                this.addInfoIconWidget(chunk, index);
            }
        });

        console.log('📍 Added', this.decorations.length, 'decorations and', this.contentWidgets.length, 'info icons');
    }

    /**
     * Add info icon widget for a chunk with explanation
     * @param {Object} chunk - Diff chunk
     * @param {number} chunkIndex - Index of chunk
     */
    addInfoIconWidget(chunk, chunkIndex) {
        // Create icon as an overlay widget positioned at right edge
        const icon = document.createElement('div');
        icon.className = 'diff-info-icon';
        icon.textContent = 'ⓘ';
        icon.title = 'Click for explanation';
        icon.onclick = (e) => {
            e.stopPropagation();
            this.showExplanationPopupForChunk(chunkIndex);
        };

        // Position the icon
        const editorElement = this.editor.getDomNode();
        const lineHeight = this.editor.getOption(monaco.editor.EditorOption.lineHeight);
        const scrollTop = this.editor.getScrollTop();

        // Calculate vertical position within the Monaco editor
        const topPosition = (chunk.startLine - 1) * lineHeight - scrollTop;

        icon.style.position = 'absolute';
        icon.style.top = `${topPosition + 2}px`; // 2px offset for better alignment
        icon.style.right = '20px'; // 20px from right edge
        icon.style.zIndex = '1000';

        // Add to the Monaco editor DOM node itself (has position: relative)
        editorElement.appendChild(icon);

        this.contentWidgets.push(icon);

        // Update position on scroll
        const scrollListener = this.editor.onDidScrollChange(() => {
            const scrollTop = this.editor.getScrollTop();
            const topPosition = (chunk.startLine - 1) * lineHeight - scrollTop;
            icon.style.top = `${topPosition + 2}px`;
        });

        // Store listener for cleanup
        icon._scrollListener = scrollListener;
    }

    /**
     * Clear all content widgets (info icons)
     */
    clearContentWidgets() {
        this.contentWidgets.forEach(icon => {
            // Dispose scroll listener
            if (icon._scrollListener) {
                icon._scrollListener.dispose();
            }
            // Remove DOM element
            if (icon.parentElement) {
                icon.parentElement.removeChild(icon);
            }
        });
        this.contentWidgets = [];
    }

    /**
     * Show explanation popup for a specific chunk (called by info icon click)
     * @param {number} chunkIndex - Index of chunk to show explanation for
     */
    showExplanationPopupForChunk(chunkIndex) {
        const explanation = this.explanationMap.get(chunkIndex);
        const chunk = this.diffChunks[chunkIndex];

        if (!chunk) {
            console.warn('No chunk found at index:', chunkIndex);
            return;
        }

        this.showExplanationPopup(explanation, chunk, chunkIndex, false);
    }

    /**
     * Show modal explanation popup
     * @param {string} explanation - Explanation text (or null for no explanation)
     * @param {Object} chunk - Diff chunk object
     * @param {number} chunkIndex - Index of diff chunk
     * @param {boolean} animate - Whether to animate the appearance (for late-arriving explanations)
     */
    showExplanationPopup(explanation, chunk, chunkIndex, animate = false) {
        // Hide existing popup
        this.hidePopup();

        // Enable modal mode
        this.enableModal();

        // Create popup element
        const popup = document.createElement('div');
        popup.className = 'diff-explanation-popup';

        // Add animation class if requested
        if (animate) {
            popup.classList.add('explanation-fade-in');
        }

        // Include explanation text if available
        const explanationHtml = explanation
            ? `<div class="explanation-text">${this.escapeHtml(explanation)}</div>`
            : '<div class="explanation-text"><em>No explanation available</em></div>';

        popup.innerHTML = `
            <div class="popup-header">
                <div class="popup-title">Change Explanation</div>
                <button class="close-button" title="Close (click outside or press Escape)">×</button>
            </div>
            ${explanationHtml}
            <button class="delete-button" data-chunk="${chunkIndex}">
                Delete This Change
            </button>
        `;

        // Position popup at right edge of editor, aligned with code line
        const editorElement = this.editor.getDomNode();
        const editorRect = editorElement.getBoundingClientRect();
        const lineHeight = this.editor.getOption(monaco.editor.EditorOption.lineHeight);
        const scrollTop = this.editor.getScrollTop();

        // Calculate vertical position aligned with the chunk's start line
        const lineTopOffset = (chunk.startLine - 1) * lineHeight - scrollTop;
        const absoluteTop = editorRect.top + lineTopOffset;

        // Position at right edge of editor panel (33.33% of viewport width)
        const editorRightEdge = editorRect.right;

        popup.style.position = 'fixed';
        popup.style.top = `${absoluteTop}px`;
        popup.style.left = `${editorRightEdge + 10}px`; // 10px gap from editor edge

        // Add to body (fixed positioning)
        document.body.appendChild(popup);
        this.activePopup = popup;

        // Setup close button handler
        popup.querySelector('.close-button').addEventListener('click', (e) => {
            e.stopPropagation();
            this.hidePopup();
        });

        // Setup delete button handler
        popup.querySelector('.delete-button').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteChange(chunkIndex);
        });

        console.log('💡 Showing modal popup for chunk', chunkIndex, animate ? '(animated)' : '');
    }

    /**
     * Enable modal mode (overlay + disable editor)
     */
    enableModal() {
        if (this.isModalActive) return;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'diff-modal-overlay';

        // Transparent overlay over editor
        const editorOverlay = document.createElement('div');
        editorOverlay.className = 'diff-modal-overlay-editor';
        overlay.appendChild(editorOverlay);

        // Frosted overlay over chat panel
        const chatOverlay = document.createElement('div');
        chatOverlay.className = 'diff-modal-overlay-chat';
        overlay.appendChild(chatOverlay);

        // Click overlay to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target === editorOverlay || e.target === chatOverlay) {
                this.hidePopup();
            }
        });

        document.body.appendChild(overlay);
        this.modalOverlay = overlay;
        this.isModalActive = true;

        // Disable editor interactions
        this.editor.updateOptions({ readOnly: true });

        console.log('🔒 Modal enabled');
    }

    /**
     * Disable modal mode (remove overlay + re-enable editor)
     */
    disableModal() {
        if (!this.isModalActive) return;

        if (this.modalOverlay) {
            this.modalOverlay.remove();
            this.modalOverlay = null;
        }

        this.isModalActive = false;

        // Re-enable editor interactions
        this.editor.updateOptions({ readOnly: false });

        console.log('🔓 Modal disabled');
    }

    /**
     * Hide active popup and disable modal
     */
    hidePopup() {
        if (this.activePopup) {
            this.activePopup.remove();
            this.activePopup = null;
        }

        this.disableModal();
    }

    /**
     * Add explanations to existing diff (two-pass approach)
     * @param {Array} explanations - Array of {blockIndex, explanation} objects
     */
    addExplanationsToExistingDiff(explanations) {
        if (!explanations || explanations.length === 0) {
            console.log('⚠️ No explanations to add');
            return;
        }

        let addedCount = 0;

        // Add each explanation to the map
        explanations.forEach(({ blockIndex, explanation }) => {
            if (blockIndex >= 0 && blockIndex < this.diffChunks.length) {
                this.explanationMap.set(blockIndex, explanation);
                addedCount++;
            }
        });

        console.log(`✅ Added ${addedCount} explanations to existing diff`);
        console.log('📊 Current explanationMap:', Array.from(this.explanationMap.entries()));
        console.log('📊 diffChunks count:', this.diffChunks.length);

        // If there's an active popup without an explanation, update it
        if (this.activePopup) {
            const chunkIndex = parseInt(this.activePopup.querySelector('.delete-button')?.getAttribute('data-chunk'));
            if (!isNaN(chunkIndex) && this.explanationMap.has(chunkIndex)) {
                const chunk = this.diffChunks[chunkIndex];
                const explanation = this.explanationMap.get(chunkIndex);

                // Re-show popup with new explanation (with animation)
                this.hidePopup();
                this.showExplanationPopup(explanation, chunk, chunkIndex, true);
            }
        }

        // Update decorations to show explanation availability (this will add info icons)
        this.addDecorations(this.diffChunks, this.explanationMap);
    }

    /**
     * Clear all decorations
     */
    clearDecorations() {
        if (this.decorations.length > 0) {
            this.decorations = this.editor.deltaDecorations(this.decorations, []);
            console.log('🧹 Cleared diff decorations');
        }

        // Clear content widgets (info icons)
        this.clearContentWidgets();

        // Clear stored data
        this.diffChunks = [];
        this.explanationMap.clear();

        // Hide any active popup
        this.hidePopup();
    }

    /**
     * Delete a specific change (revert it)
     * @param {number} chunkIndex - Index of chunk to delete
     */
    deleteChange(chunkIndex) {
        const chunk = this.diffChunks[chunkIndex];
        if (!chunk) {
            console.error('Cannot delete: chunk not found at index', chunkIndex);
            return;
        }

        console.log('🗑️ Deleting change:', chunkIndex, chunk);

        const model = this.editor.getModel();

        // Determine what edit to make based on chunk type
        let editOperation;

        switch (chunk.type) {
            case 'addition':
                // Remove the added lines
                editOperation = {
                    range: new monaco.Range(
                        chunk.startLine, 1,
                        chunk.endLine + 1, 1 // +1 to include the line break
                    ),
                    text: ''
                };
                break;

            case 'deletion':
                // Deletions are shown with strikethrough but the lines don't exist in the new code
                // We can't actually "restore" them since they're not in the editor
                // Just remove the decoration
                console.log('⚠️ Cannot restore deleted lines - they are not in the editor');
                this.removeChunkDecoration(chunkIndex);
                this.hidePopup();
                return;

            case 'modification':
                // Replace with old content
                if (!chunk.oldContent) {
                    console.error('Cannot revert modification: oldContent is missing');
                    return;
                }
                editOperation = {
                    range: new monaco.Range(
                        chunk.startLine, 1,
                        chunk.endLine, model.getLineMaxColumn(chunk.endLine)
                    ),
                    text: chunk.oldContent
                };
                break;

            default:
                console.error('Unknown chunk type:', chunk.type);
                return;
        }

        // Apply the edit
        this.ignoreNextEdit = true; // Don't trigger change listener
        model.pushEditOperations(
            [],
            [editOperation],
            () => null
        );

        console.log('✅ Change reverted');

        // Close popup
        this.hidePopup();

        // Remove only this chunk's decoration
        this.removeChunkDecoration(chunkIndex);
    }

    /**
     * Remove decoration for a specific chunk and adjust line numbers
     * @param {number} chunkIndex - Index of chunk
     */
    removeChunkDecoration(chunkIndex) {
        const removedChunk = this.diffChunks[chunkIndex];

        // Calculate line offset for adjusting subsequent chunks
        let lineOffset = 0;
        if (removedChunk.type === 'addition') {
            // Lines were removed, so subsequent chunks shift up
            lineOffset = -(removedChunk.endLine - removedChunk.startLine + 1);
        }

        // Remove this chunk from tracking
        this.diffChunks.splice(chunkIndex, 1);

        // Adjust line numbers for all subsequent chunks
        if (lineOffset !== 0) {
            for (let i = chunkIndex; i < this.diffChunks.length; i++) {
                this.diffChunks[i].startLine += lineOffset;
                this.diffChunks[i].endLine += lineOffset;
            }
        }

        // Rebuild explanation map with updated indices
        const newExplanationMap = new Map();
        this.explanationMap.forEach((explanation, oldIndex) => {
            if (oldIndex < chunkIndex) {
                // Before removed chunk - keep same index
                newExplanationMap.set(oldIndex, explanation);
            } else if (oldIndex > chunkIndex) {
                // After removed chunk - shift index down
                newExplanationMap.set(oldIndex - 1, explanation);
            }
            // oldIndex === chunkIndex - skip (this is the removed chunk)
        });
        this.explanationMap = newExplanationMap;

        // Rebuild decorations with updated chunks
        this.addDecorations(this.diffChunks, this.explanationMap);
    }

    /**
     * Find which chunk contains the given position
     * @param {Object} position - Monaco position {lineNumber, column}
     * @returns {number} Chunk index or -1 if not found
     */
    findChunkAtPosition(position) {
        return this.diffChunks.findIndex(chunk =>
            position.lineNumber >= chunk.startLine &&
            position.lineNumber <= chunk.endLine
        );
    }

    /**
     * Setup editor event listeners
     */
    setupEventListeners() {
        // Clear decoration when user edits a decorated line
        this.setupEditorChangeListener();

        // ESC key to close popup
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalActive) {
                this.hidePopup();
            }
        });
    }

    /**
     * Setup listener to clear decorations when user edits decorated lines
     */
    setupEditorChangeListener() {
        this.editor.onDidChangeModelContent((e) => {
            // Ignore edits that are programmatic (setValue, format, etc)
            if (this.ignoreNextEdit) {
                this.ignoreNextEdit = false;
                return;
            }

            if (!e.changes || e.changes.length === 0) return;

            e.changes.forEach(change => {
                const changedLine = change.range.startLineNumber;

                // Find decorations that overlap with this line
                const affectedChunks = this.diffChunks.filter(chunk =>
                    changedLine >= chunk.startLine &&
                    changedLine <= chunk.endLine
                );

                if (affectedChunks.length > 0) {
                    // User edited a decorated line - treat as "applied"
                    console.log('User edited decorated line', changedLine, '- clearing decoration');
                    // For now, clear all decorations (can optimize later)
                    this.clearDecorations();
                }
            });
        });
    }

    /**
     * Escape HTML for safe display
     * @param {string} text - Text to escape
     * @returns {string} HTML-safe text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Check if manager is ready
     * @returns {boolean} Ready status
     */
    isReady() {
        return this.isInitialized;
    }
}