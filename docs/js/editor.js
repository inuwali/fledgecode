// Monaco Editor integration for P5.js code editing

import { debounce } from './utils.js';
import { P5_TYPE_DEFINITIONS } from './p5-vocabulary.js';

export class Editor {
    constructor(containerId, onCodeChange) {
        this.containerId = containerId;
        this.onCodeChange = onCodeChange;
        this.editor = null;
        this.isInitialized = false;
        
        // Default P5.js starter code
        this.defaultCode = `function setup() {
  createCanvas(400, 400);
}

function draw() {
  // Draw a light green background
  background('lightgreen');
  
  // Draw a square in the center
  fill('yellow');
  rect(175, 175, 50, 50);
}`;
    }

    /**
     * Initialize Monaco Editor
     */
    async init() {
        try {
            // Configure Monaco loader with CDN fallback
            require.config({
                paths: {
                    'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs'
                }
            });

            // Load Monaco Editor with fallback
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Monaco Editor CDN timeout'));
                }, 15000); // 15 second timeout

                require(['vs/editor/editor.main'], () => {
                    clearTimeout(timeout);
                    this.setupEditor();
                    resolve();
                }, (error) => {
                    clearTimeout(timeout);
                    console.warn('Monaco CDN failed, attempting fallback:', error);
                    this.initializeFallbackEditor();
                    resolve(); // Resolve anyway with fallback
                });
            });
            
            this.isInitialized = true;
            console.log('Monaco Editor initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Monaco Editor:', error);
            this.initializeFallbackEditor();
            this.isInitialized = true;
        }
    }

    /**
     * Set up Monaco Editor with P5.js configuration
     */
    setupEditor() {
        // Configure P5.js language features
        this.setupP5jsLanguageFeatures();
        
        // Create editor instance
        this.editor = monaco.editor.create(document.getElementById(this.containerId), {
            value: this.defaultCode,
            language: 'javascript',
            theme: 'vs-dark',
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            folding: true,
            bracketMatching: 'always',
            autoIndent: 'full',
            trimAutoWhitespace: false  // Keep indentation on empty lines
        });

        // Set up change listener with debouncing
        const debouncedChange = debounce(() => {
            if (this.onCodeChange) {
                this.onCodeChange(this.getCode());
            }
        }, 500);

        this.editor.onDidChangeModelContent(debouncedChange);
    }

    /**
     * Configure Monaco with P5.js-specific language features
     */
    setupP5jsLanguageFeatures() {
        // Use centralized P5.js type definitions for autocomplete
        monaco.languages.typescript.javascriptDefaults.addExtraLib(
            P5_TYPE_DEFINITIONS,
            'p5.d.ts'
        );

        // Configure JavaScript compiler options
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ES2020,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.CommonJS,
            noEmit: true,
            typeRoots: ["node_modules/@types"]
        });

    }

    /**
     * Fallback to simple textarea if Monaco fails
     */
    fallbackToTextarea() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = `
            <textarea 
                id="fallback-editor" 
                style="width: 100%; height: 100%; background: #1e1e1e; color: white; border: none; padding: 16px; font-family: 'Courier New', monospace; font-size: 14px; resize: none;"
                placeholder="Monaco Editor failed to load. Using fallback editor..."
            >${this.defaultCode}</textarea>
        `;
        
        const textarea = document.getElementById('fallback-editor');
        const debouncedChange = debounce(() => {
            if (this.onCodeChange) {
                this.onCodeChange(textarea.value);
            }
        }, 500);
        
        textarea.addEventListener('input', debouncedChange);
        this.isInitialized = true;
    }

    /**
     * Get current code from editor
     * @returns {string} Current code content
     */
    getCode() {
        if (this.editor) {
            return this.editor.getValue();
        } else {
            const fallbackEditor = document.getElementById('fallback-editor');
            return fallbackEditor ? fallbackEditor.value : '';
        }
    }

    /**
     * Set code in editor
     * @param {string} code - Code to set
     */
    setCode(code) {
        if (this.editor) {
            this.editor.setValue(code);
        } else {
            const fallbackEditor = document.getElementById('fallback-editor');
            if (fallbackEditor) {
                fallbackEditor.value = code;
            }
        }
    }

    /**
     * Format the current code using Monaco's built-in formatter
     */
    async formatCode() {
        if (this.editor) {
            try {
                // Use Monaco's built-in document formatter
                await this.editor.getAction('editor.action.formatDocument').run();
                console.log('Code formatted successfully');
            } catch (error) {
                console.warn('Code formatting failed:', error);
                // Formatting failure shouldn't break the app, just log it
            }
        }
    }

    /**
     * Set code and automatically format it
     * @param {string} code - Code to set
     */
    async setCodeAndFormat(code) {
        this.setCode(code);
        // Small delay to ensure code is set before formatting
        setTimeout(() => {
            this.formatCode();
        }, 100);
    }

    /**
     * Focus the editor
     */
    focus() {
        if (this.editor) {
            this.editor.focus();
        } else {
            const fallbackEditor = document.getElementById('fallback-editor');
            if (fallbackEditor) {
                fallbackEditor.focus();
            }
        }
    }

    /**
     * Resize editor (useful for responsive layouts)
     */
    resize() {
        if (this.editor) {
            this.editor.layout();
        }
    }

    /**
     * Check if editor is ready
     * @returns {boolean} True if editor is initialized
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Initialize fallback textarea editor when Monaco fails
     */
    initializeFallbackEditor() {
        console.log('Initializing fallback textarea editor');
        
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Editor container not found');
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Create textarea
        const textarea = document.createElement('textarea');
        textarea.id = 'fallback-editor';
        textarea.value = this.defaultCode;
        textarea.style.cssText = `
            width: 100%;
            height: 100%;
            border: 1px solid #ddd;
            padding: 10px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            resize: none;
            outline: none;
            background: #f8f8f8;
            color: #333;
            tab-size: 2;
        `;
        textarea.setAttribute('spellcheck', 'false');
        textarea.setAttribute('autocomplete', 'off');
        textarea.setAttribute('autocorrect', 'off');
        textarea.setAttribute('autocapitalize', 'off');

        // Add placeholder notice
        const notice = document.createElement('div');
        notice.style.cssText = `
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 8px 12px;
            font-size: 12px;
            color: #856404;
            margin-bottom: 5px;
            border-radius: 4px;
        `;
        notice.innerHTML = '⚠️ Using fallback editor - advanced features unavailable';

        container.appendChild(notice);
        container.appendChild(textarea);

        // Set up event listeners
        textarea.addEventListener('input', () => {
            if (this.onCodeChange) {
                this.onCodeChange(textarea.value);
            }
        });

        // Store reference to textarea as editor with Monaco-compatible API
        this.editor = {
            getValue: () => textarea.value,
            setValue: (value) => {
                textarea.value = value;
            },
            getModel: () => ({
                onDidChangeContent: (callback) => {
                    textarea.addEventListener('input', callback);
                }
            }),
            focus: () => textarea.focus(),
            layout: () => {}, // No-op for textarea
            dispose: () => {
                if (textarea.parentNode) {
                    textarea.parentNode.removeChild(textarea);
                }
            }
        };

        this.isFallbackMode = true;
        console.log('Fallback editor ready');
    }
}