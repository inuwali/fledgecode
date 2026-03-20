# Phase 4: Code History & Persistence - Detailed Planning

## Overview

**Goal**: Essential undo/redo system and session persistence (table stakes features that enable safe experimentation)

**Duration**: 1-2 weeks  
**Prerequisites**: Phase 3.5 complete ✅ (Analytics foundation provides state management patterns)  
**Deliverable**: Robust undo/redo system with session persistence and code history timeline

## Current State Analysis

### What We Have from Phase 3.5 ✅
- **LearningAnalytics**: Pure event sourcing system for learning data
- **ProgressTracker**: State calculations from event history
- **LocalStorage patterns**: Already used for learner profiles and analytics
- **Session management**: Session IDs and timestamps in analytics system
- **Developer tools**: Reset functionality and debugging infrastructure

### What We're Building in Phase 4 🎯
- **Undo/Redo System**: Allow learners to safely experiment and revert changes
- **Code History Timeline**: Simple navigation through code evolution
- **Session Persistence**: History and state survive browser refresh
- **Local Storage**: Reliable code and progress persistence
- **Import/Export**: Allow learners to save and share their work

## Technical Architecture

### New Modules to Create

```
src/js/
├── history/                # Phase 4: Code History & Persistence
│   ├── code-history.js        # Track code evolution over time
│   ├── undo-manager.js        # Undo/redo state management
│   └── session-storage.js     # Persist history across sessions
└── utils/                  # Enhanced utilities
    └── import-export.js       # Save and share functionality
```

### Integration Architecture

```javascript
// Phase 4 History Pipeline
User Code Change → History Capture → State Storage → Undo Stack Update
     ↓                ↓              ↓               ↓
Auto-save Timer   Code Snapshot   LocalStorage    UI Update
     ↓                ↓              ↓               ↓
Session Persist   Diff Detection  History Limit   Undo/Redo
     ↓                ↓              ↓               ↓
Analytics Event   Timeline Entry  Memory Mgmt     User Control
```

### Data Structures

```javascript
// Code history state
const CodeHistoryEntry = {
    id: string,              // Unique entry identifier
    code: string,            // Complete code at this state
    timestamp: Date,         // When this state was created
    userAction: string,      // What triggered this state ("edit", "generate", "undo", "redo")
    changeType: string,      // Type of change ("manual", "ai_generated", "format")
    sessionId: string,       // Session grouping
    conceptId: string,       // Learning context when change was made
    characterCount: number,  // Code length for quick reference
    hasErrors: boolean       // Whether code had syntax errors
};

// Undo/redo state
const UndoState = {
    undoStack: CodeHistoryEntry[],  // States available for undo
    redoStack: CodeHistoryEntry[],  // States available for redo
    currentState: CodeHistoryEntry, // Current active state
    maxUndoSteps: number,           // Limit undo history size
    autoSaveEnabled: boolean        // Whether to auto-save changes
};

// Session storage
const SessionData = {
    sessionId: string,           // Unique session identifier
    startTime: Date,             // Session start time
    lastActivity: Date,          // Last user interaction
    codeHistory: CodeHistoryEntry[], // All code states in session
    currentCode: string,         // Most recent code
    learningContext: {           // Learning state at session start
        currentConcept: string,
        completedObjectives: []
    },
    settings: {                  // User preferences
        autoSave: boolean,
        undoLimit: number
    }
};
```

## Implementation Plan

### ✅ Task 1: Code History Tracking (`code-history.js`) - COMPLETE

**Purpose**: Core history tracking functionality to capture and manage code evolution

**Key Components:**
```javascript
class CodeHistory {
    captureState(code, userAction, changeType)    // Save current code state
    getHistoryTimeline()                          // Get chronological history
    getStateById(id)                             // Retrieve specific state
    calculateStateDiff(fromId, toId)             // Generate diff between states
    pruneOldHistory(maxEntries)                  // Manage memory usage
    exportHistory()                              // Export for backup/sharing
}
```

**Implementation Approach:**
- Capture code states on user actions and AI generations
- Track context (current concept, session) with each state
- Implement intelligent deduplication (don't save identical states)
- Provide diff calculation between any two states
- Memory management with configurable history limits

**Example Flow:**
```javascript
// User types code
codeHistory.captureState(newCode, "manual_edit", "user_typing");

// AI generates code  
codeHistory.captureState(generatedCode, "ai_generation", "llm_response");

// User formats code
codeHistory.captureState(formattedCode, "manual_action", "code_format");
```

### ✅ Task 2: Undo/Redo Manager (`undo-manager.js`) 🎯 SECOND

**Purpose**: Manage undo/redo stacks and provide user-friendly state navigation

**Key Components:**
```javascript
class UndoManager {
    undo()                           // Move back one state
    redo()                          // Move forward one state  
    canUndo()                       // Check if undo is available
    canRedo()                       // Check if redo is available
    pushState(codeEntry)            // Add new state to undo stack
    clearRedoStack()                // Clear redo when new action taken
    getUndoCount()                  // Number of undo steps available
    getRedoCount()                  // Number of redo steps available
}
```

**Integration with Editor:**
```javascript
// Enhanced App class integration
class App {
    constructor() {
        // ... existing components
        this.codeHistory = null;
        this.undoManager = null;
        this.autoSaveTimer = null;
    }
    
    async init() {
        // ... existing initialization
        this.codeHistory = new CodeHistory();
        this.undoManager = new UndoManager(this.codeHistory);
        this.setupAutoSave();
    }
    
    onCodeChange(newCode) {
        // Capture state for undo/redo
        if (this.shouldCaptureState(newCode)) {
            const entry = this.codeHistory.captureState(newCode, "manual_edit", "user_typing");
            this.undoManager.pushState(entry);
        }
        
        // Existing auto-run logic
        if (this.autoRun) {
            this.debouncedRunCode();
        }
    }
}
```

### Task 3: Session Persistence (`session-storage.js`) 🎯 THIRD

**Purpose**: Reliable persistence across browser sessions with smart recovery

**Key Components:**
```javascript
class SessionStorage {
    saveSession(sessionData)             // Persist current session
    loadSession()                        // Restore previous session  
    hasValidSession()                   // Check for recoverable session
    clearSession()                      // Start fresh session
    migrateOldFormat(oldData)           // Handle data format upgrades
    compressHistory(history)            // Optimize storage usage
    autoSave(code, context)             // Automatic persistence
}
```

**Session Recovery Flow:**
```javascript
// On app initialization
if (sessionStorage.hasValidSession()) {
    const recovered = sessionStorage.loadSession();
    
    if (recovered.lastActivity > oneDayAgo) {
        // Show recovery dialog
        showSessionRecoveryDialog(recovered);
    } else {
        // Auto-start fresh session
        sessionStorage.clearSession();
    }
}
```

**Storage Optimization:**
```javascript
// Intelligent compression for large histories
compressHistory(history) {
    // Keep all states from current session
    // Keep major milestones from previous sessions
    // Compress similar states into single entries
    // Maintain key learning progression states
}
```

### Task 4: Import/Export System (`import-export.js`) 🎯 FOURTH

**Purpose**: Enable learners to save, share, and backup their work

**Key Components:**
```javascript
class ImportExport {
    exportCode()                    // Export current code as file
    exportProject()                 // Export code + history + progress
    importCode(file)               // Import code file
    importProject(file)            // Import full project backup
    generateShareableLink(code)    // Create shareable code snippet
    validateImportData(data)       // Ensure import data is safe
}
```

**Export Formats:**
```javascript
// Simple code export (.js file)
const codeExport = {
    code: currentCode,
    timestamp: new Date().toISOString(),
    concept: currentConcept,
    exportType: "code_only"
};

// Full project export (.json file)
const projectExport = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    code: currentCode,
    codeHistory: recentHistory,
    learningProgress: {
        currentConcept: conceptId,
        completedObjectives: objectives,
        masteryData: analytics.exportData()
    },
    exportType: "full_project"
};
```

## UI/UX Integration Strategy

### Enhanced Editor Controls

**New Toolbar Buttons:**
```html
<div class="editor-toolbar">
    <!-- Existing buttons -->
    <button id="run-btn">▶ Run</button>
    <button id="format-code-btn">⚡ Format</button>
    
    <!-- New Phase 4 buttons -->
    <button id="undo-btn" disabled>↶ Undo</button>
    <button id="redo-btn" disabled>↷ Redo</button>
    <button id="history-btn">📜 History</button>
    <button id="save-btn">💾 Save</button>
</div>
```

**Keyboard Shortcuts:**
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z`: Redo  
- `Ctrl/Cmd + S`: Save/Export code
- `Ctrl/Cmd + H`: Show history timeline

### History Timeline UI

**Collapsible History Panel:**
```html
<div id="history-panel" class="history-panel collapsed">
    <div class="history-header">
        <h3>📜 Code History</h3>
        <button id="toggle-history">▼</button>
    </div>
    
    <div class="history-content">
        <div class="history-timeline">
            <!-- Timeline entries populated by JavaScript -->
        </div>
        
        <div class="history-actions">
            <button id="export-history-btn">📤 Export</button>
            <button id="clear-history-btn">🗑️ Clear</button>
        </div>
    </div>
</div>
```

**Timeline Entry Format:**
```html
<div class="timeline-entry" data-state-id="state_123">
    <div class="entry-time">2:34 PM</div>
    <div class="entry-action">Manual edit</div>
    <div class="entry-preview">fill(255, 0, 0); ellipse...</div>
    <div class="entry-actions">
        <button class="restore-btn">↶ Restore</button>
        <button class="diff-btn">📋 Diff</button>
    </div>
</div>
```

### Session Recovery Dialog

**Recovery Options:**
```html
<div id="session-recovery-dialog" class="dialog-overlay">
    <div class="dialog-content">
        <h3>🔄 Restore Previous Session?</h3>
        <p>We found code from your previous session:</p>
        
        <div class="recovery-preview">
            <pre class="code-preview">function setup() {
    createCanvas(400, 400);
}</pre>
            <div class="recovery-meta">
                Last edited: 2 hours ago
                Concept: Basic Shapes
            </div>
        </div>
        
        <div class="recovery-actions">
            <button id="start-fresh-btn">🆕 Start Fresh</button>
            <button id="restore-session-btn">🔄 Restore Session</button>
        </div>
    </div>
</div>
```

## Technical Implementation Strategy

### Monaco Editor Integration

**Undo/Redo Coordination:**
```javascript
// Coordinate with Monaco's built-in undo/redo
class EditorIntegration {
    setupUndoRedoIntercept() {
        // Override Monaco's undo/redo to use our system
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
            this.app.undoManager.undo();
        });
        
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
            this.app.undoManager.redo();
        });
    }
    
    syncWithHistory(codeEntry) {
        // Update Monaco editor without triggering change events
        this.editor.setValue(codeEntry.code);
        this.editor.setScrollPosition(codeEntry.scrollPosition || { scrollTop: 0 });
    }
}
```

### Storage Management

**Efficient LocalStorage Usage:**
```javascript
// Smart storage with size limits
class StorageManager {
    static MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit
    static STORAGE_KEYS = {
        CODE_HISTORY: 'vibeInstructor_codeHistory',
        SESSION_DATA: 'vibeInstructor_sessionData',
        USER_SETTINGS: 'vibeInstructor_settings'
    };
    
    saveWithSizeCheck(key, data) {
        const serialized = JSON.stringify(data);
        
        if (this.getStorageSize() + serialized.length > this.MAX_STORAGE_SIZE) {
            this.pruneOldData();
        }
        
        localStorage.setItem(key, serialized);
    }
    
    pruneOldData() {
        // Remove oldest history entries
        // Keep current session + last 48 hours
        // Preserve important milestones
    }
}
```

### State Management Enhancement

**Extend Existing App State:**
```javascript
// Enhanced App class with history support
class App {
    constructor() {
        // ... existing Phase 3.5 components
        
        // Phase 4 components
        this.codeHistory = null;
        this.undoManager = null;
        this.sessionStorage = null;
        this.importExport = null;
        
        // Phase 4 state
        this.currentStateId = null;
        this.autoSaveEnabled = true;
        this.lastSaveTime = null;
    }
    
    async restoreFromHistory(stateId) {
        const state = this.codeHistory.getStateById(stateId);
        if (!state) return false;
        
        // Update editor
        await this.editor.setCode(state.code);
        
        // Update learning context if changed
        if (state.conceptId !== this.learnerProfile.getCurrentConcept()) {
            this.learnerProfile.setCurrentConcept(state.conceptId);
            this.learningDashboard.updateCurrentLearning();
        }
        
        // Run code if it was running
        if (this.autoRun) {
            await this.runCode();
        }
        
        this.currentStateId = stateId;
        this.updateHistoryUI();
        
        return true;
    }
}
```

## Testing Strategy

### Unit Tests (New)
```javascript
// Code History Tests
✓ Capture code states correctly with metadata
✓ Generate accurate diffs between states
✓ Prune old history while preserving milestones
✓ Handle edge cases (empty code, very large code)

// Undo Manager Tests  
✓ Undo/redo operations maintain correct state
✓ Stack management (clear redo on new action)
✓ Integration with code history
✓ Keyboard shortcut handling

// Session Storage Tests
✓ Save and restore session data correctly
✓ Handle corrupted or invalid session data gracefully
✓ Storage size management and pruning
✓ Session recovery dialog logic

// Import/Export Tests
✓ Export code in valid formats
✓ Import validation and error handling
✓ Full project backup and restore
✓ Shareable link generation
```

### Integration Tests (Enhanced)
```javascript
// End-to-End History Flow
✓ Code change → History capture → Undo → Redo → Restore
✓ Session persistence → Browser refresh → Recovery dialog → Restore
✓ Export project → Clear storage → Import project → Verify state
✓ Learning progress preserved across undo/redo operations
✓ Analytics events properly recorded for history actions

// Performance Tests
✓ Large code files don't slow down history operations
✓ Long history (100+ entries) maintains responsive undo/redo
✓ Storage pruning keeps memory usage reasonable
✓ Auto-save doesn't interfere with user typing
```

### Manual Testing Scenarios
1. **Basic Undo/Redo**: Make changes, undo them, redo them, verify state
2. **Session Recovery**: Close browser, reopen, verify recovery dialog and restore
3. **History Navigation**: Generate multiple code versions, navigate timeline
4. **Export/Import**: Export project, clear data, import, verify everything restored
5. **Edge Cases**: Very large code, rapid typing, network disconnection
6. **Learning Integration**: Verify progress tracking works with history operations

## Success Criteria

### Technical Metrics
- ✅ Undo/redo operations complete in < 50ms
- ✅ History capture time < 20ms for typical code changes
- ✅ Session restore time < 200ms
- ✅ Storage usage stays under 5MB for typical usage patterns
- ✅ Memory usage reasonable with 100+ history entries

### User Experience Metrics  
- ✅ Undo/redo feels responsive and predictable
- ✅ Session recovery successful > 95% of the time
- ✅ History timeline is discoverable and useful
- ✅ Export/import works reliably across different devices
- ✅ Auto-save doesn't disrupt coding flow

### Educational Integration Metrics
- ✅ Learning progress preserved through history operations
- ✅ Undo/redo increases learner experimentation confidence
- ✅ History shows clear learning progression over time
- ✅ Export functionality enables sharing and portfolio building
- ✅ No conflicts between history system and learning analytics

## Implementation Timeline

### Week 1: Core History Infrastructure
- **Days 1-2**: Code History tracking with state capture and storage
- **Days 3-4**: Undo/Redo Manager with keyboard shortcuts and UI integration
- **Days 5**: Session persistence and recovery dialog

### Week 2: Enhanced Features & Polish
- **Days 1-2**: History timeline UI and navigation
- **Days 3-4**: Import/Export functionality and sharing features  
- **Days 5**: Performance optimization, testing, and UI refinement

### Ready for Testing When:
1. ✅ Learners can undo/redo code changes reliably
2. ✅ Sessions persist across browser refresh with recovery option
3. ✅ History timeline shows clear code evolution
4. ✅ Export/import enables saving and sharing work
5. ✅ Performance remains smooth with extended usage

## Integration with Phase 3.5 Foundation

### Leveraging Existing Systems
- **Analytics Events**: Record history actions for learning insights
- **Session Management**: Build on existing session ID system
- **LocalStorage Patterns**: Extend current storage approach
- **Developer Tools**: Add history debugging and inspection
- **Progress Tracking**: Ensure learning data survives history operations

### Maintaining Backward Compatibility
- **Phase 3.5 Features**: All existing functionality remains available
- **Graceful Degradation**: If history system fails, fall back to normal operation
- **Learning Continuity**: Progress tracking unaffected by undo/redo operations

### Future Phase Preparation
- **Phase 5 Ready**: History system provides foundation for educational diffs
- **Code Evolution**: Timeline enables sophisticated learning analytics
- **Collaboration**: Import/export prepares for sharing features

**Phase 4 transforms the learning environment into a safe space for experimentation by providing essential undo/redo functionality and reliable persistence, enabling learners to take risks and explore without fear of losing their work.**