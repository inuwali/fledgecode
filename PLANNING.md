# Vibe Coding Instructor - Technical Planning

A tool that teaches novices how to code, using an LLM-first approach.

## Design

The system has an ontology that defines concepts, learning objectives, and goals. It tracks the learner's progress and knows which concepts they understand, those they're focused on learning, and those that are beyond their reach.

The LLM uses the ontology when generating code, and the system verifies the generated code to ensure that it doesn't contain any bits of P5.js API that violate the above constraints, looping back to LLM code generation when necessary.

The interface runs locally in a web browser and relies on a Vercel proxy to forward API requests to a user-chosen provider and model, using their API key. It has an editor, an LLM chat area, and a rendering canvas. When the LLM proposes changes to the code, it presents them in a diff format that learners can understand, and each diff has a clickable annotation that explains what it does. The user can partially apply diffs and experiment with the changes.

## Technology Stack

### Frontend Framework
- **Vanilla HTML/CSS/JavaScript** with ES6 modules for simplicity and rapid iteration
- **No build tools** - direct browser execution with CDN dependencies
- **CSS Grid** for responsive three-panel layout

### P5.js Integration
- **P5.js 1.7.0** (CDN) for creative coding canvas
- **P5.js instance mode** to avoid global conflicts and enable clean restarts
- **Monaco Editor 0.45.0** (CDN) for code editing with syntax highlighting
- **Custom P5.js binding system** for seamless variable/function access

### Local LLM Integration (Future)
- **Transformers.js** for running models in browser
- **ONNX.js** as fallback for model inference
- Consider **Ollama** with local API for development/testing

### State Management & Data
- **LocalStorage** for simple persistence
- **Vanilla JavaScript** state management (no external libraries)
- **IndexedDB** for future complex data needs

### Development Tools
- **Pure JavaScript** (no TypeScript to reduce complexity)
- **Custom test framework** for targeted testing
- **Browser DevTools** for debugging

## File Structure
```
src/
├── index.html          # Main application entry point
├── css/                # Layout, styling, responsive design
├── js/                 # Code, divided into subdirectories based on function
├── test/               # Test frameworks, suites, and runner pages
└── ontology/           # P5.js learning concepts
```

## Development Phases

### ✅ Phase 1: Foundation - COMPLETE
**Achieved**: Working P5.js code editor with real-time execution
- Three-panel responsive layout
- Monaco editor with P5.js syntax highlighting  
- Safe P5.js execution with error handling
- Comprehensive test suite (12 tests covering core functionality)
- Auto-run on code changes with manual override

### ✅ Phase 2: Ontology Integration - COMPLETE
**Achieved**: Learning system with concept detection and manual progress tracking
- ✅ Ontology Engine (`ontology.js`): Loads processing-concept-hierarchy.json and detects concepts using regex patterns
- ✅ Learner Profile System (`learner.js`): Manual progress tracking with localStorage persistence
- ✅ Code Validation System (`validation.js`): Internal validation for LLM constraint checking (Phase 3 ready)
- ✅ Learning UI (`learning-ui.js`): Concept selector, learning objectives display, and progress tracking
- ✅ Full integration into main app with real-time objective detection
- ✅ Manual concept selection with prerequisite validation
- ✅ Learning objectives checklist and detection highlighting
- ✅ Creative pathway selection and progress indicators

**Key Features Delivered**:
- Learners can manually select concepts and see learning objectives
- Real-time detection shows what concepts/objectives are being practiced
- Progress tracking with completion marking and prerequisite management
- Internal validation system ready for Phase 3 LLM integration
- No user-facing restrictions - learners have full coding freedom

### ✅ Phase 3: LLM Integration - COMPLETE
**Achieved**: AI-powered code generation with concept constraints
- ✅ Vercel LLM proxy integration with stateless design
- ✅ Context-aware prompts (current code + user request + learning constraints)
- ✅ Ontology constraints ensure generated code respects learner skill level
- ✅ User input interface for code modification requests
- ✅ Developer tools for debugging and testing
- ✅ Code formatting integration with Monaco editor

**Key Features Delivered**:
- AI chat interface with constraint-based code generation
- Real-time learning objective detection and progress tracking
- Developer debugging UI with prompt inspection
- Clean integration with Phase 2 ontology and learning systems

### ✅ Phase 3.5: Enhanced Learning Analytics & Progress Tracking - COMPLETE
**Goal**: Sophisticated learning analytics with "seen vs mastered" progression
- ✅ **Historical Analytics**: Pure event tracking of objective detections and mastery
- ✅ **Progress Metrics**: Nuanced "seen" (3+ detections) vs "mastered" (manually checked) tracking
- ✅ **UI Consolidation**: Merge learning-dashboard.js and learning-ui.js into unified system
- ✅ **Refined Controls**: Deemphasized but accessible "What's Next?" advancement
- ✅ **Clean Architecture**: Separate learning history from UI state management

**Prerequisites**: Phase 3 LLM integration provides foundation for enhanced analytics

**Estimated Duration**: 1-2 weeks

### ✅ Phase 4: Code History & Persistence - COMPLETE
**Goal**: Essential undo/redo system and session persistence (table stakes features)
- ✅ **Undo/Redo system**: Allow learners to safely experiment and revert changes
- ✅ **Code history timeline**: Simple navigation through code evolution
- ✅ **Session persistence**: History and state survive browser refresh
- ✅ **Local storage**: Reliable code and progress persistence
- ✅ **Import/Export**: Allow learners to save and share their work

**Prerequisites**: Phase 3.5 analytics foundation provides state management patterns ✅

**Delivered**: Comprehensive history system with undo/redo, session recovery, and full import/export

### ✅ Phase 5: Testing, Polish & Production Readiness - COMPLETE
**Goal**: Transform prototype into production-ready application for real user trials
- ✅ **Error handling**: Bulletproof edge cases and graceful failure recovery
- ✅ **API Key Support**: Allow users to bring their own API keys
- ✅ **LLM polish**: Make prompting and validation more robust to ensure the best code generation experience
- ✅ **Learning flow**: Ensure the core learning experience is supported and bug-free

**Prerequisites**: Phase 4 complete ✅ (All core functionality implemented)

**Delivered**: Production-ready application with enhanced learning flow, comprehensive API key support, robust error handling, and polished user experience including modal-based concept selection for optimal learning guidance.

### ✅ Phase 6: Educational Diffs - COMPLETE
#### Goal
Transform code generation into guided learning through interactive diffs

**Delivered:**
- ✅ **Diff visualization**: In-editor decorations highlighting additions, deletions, and modifications
- ✅ **Educational annotations**: Modal popups with LLM-generated pedagogical explanations
- ✅ **LLM [EXPLAIN] comments**: Special comment syntax extracted and displayed separately
- ✅ **Decoration lifecycle**: Smart cleanup on user edits, new generations, and interactions
- ✅ **Per-diff deletion**: Full [Delete] button implementation for reverting individual changes
- ✅ **Modal UI**: Two-pass explanation system supporting late-arriving LLM explanations
- ✅ **Info icons**: Clickable indicators positioned in editor with scroll tracking

**Deferred (By Design):**
- Undo/redo integration (needs careful UX research)
- Comprehensive test suite (rapid prototyping approach, pragmatic testing with users)

**Prerequisites**: Phase 5 complete ✅ (Production-ready foundation with polished learning flow)

**Duration**: 2 weeks (as estimated)

**Detailed Plan**: See PHASE6_PLAN.md for complete architectural decisions, implementation tasks, and completion summary

### ✅ Phase 7: Fine-Grained Ontology Structure - COMPLETE
#### Goal
Map individual P5.js/JS functions with prerequisites alongside existing coarse-grained concepts

**Delivered:**
- ✅ **Fine-grained learning objectives**: Added 68 low-level objectives to ontology JSON, each mapping to specific P5.js/JS functions
- ✅ **Dual-layer ontology architecture**: Enhanced OntologyEngine to load and manage both coarse-grained concepts and fine-grained objectives
- ✅ **Prerequisite mapping**: Established prerequisite chains for individual functions with pedagogically sound ordering (e.g., `rectangle` as root node instead of template-dependent)
- ✅ **Interactive D3.js graph visualizer**: Built external-json-graph-visualizer.html with real-time editing, prerequisite management, and metadata editing capabilities
- ✅ **Data validation and verification**: Comprehensive validation of prerequisite chains, concept references, and data integrity
- ✅ **Pedagogical polish**: Made strategic adjustments (e.g., promoting functional code primitives to root nodes) based on domain knowledge

**Deferred (By Design):**
- UI integration of fine-grained ontology (moved to Phase 8)
- Learning dashboard updates for granular progress tracking (moved to Phase 7.5/8)

**Prerequisites**: Phase 5 complete ✅ (Foundation with existing coarse-grained ontology)

**Duration**: 2 weeks (as estimated)

**Detailed Plan**: See PHASE7_PLAN.md for complete architectural decisions, implementation tasks, and completion summary

---

### Phase 8: Learning Dashboard Update
#### Goal
Add capability to track learning progress in fine-grained mode

**Core Deliverables:**
- Update user profile tracking
- Cumulative list view of learning progress (past → current)
- Grouping/disclosure controls to keep UI manageable
- Wire dashboard to fine-grained ontology data
- Simple list-style view
- Hidden developer toggle between fine-grained and concept-based dashboard

**Prerequisites**: Phase 7 fine-grained ontology complete

**Notes**: Visual tree/graph deferred to future phase; keep interaction simple. **This phase is additive** to the existing coarse-grained sequence of broad multi-LO coding concepts; that existing UI and plumbing **should remain intact and usable.** We may offer the ability to toggle between those modes or do A/B user testing. **We are intentionally deferring next-step learning objectives** in the dashboard in this phase.

---

### Phase 9: Adaptive Learning Paths
#### Goal
AI-powered "what should you learn next?" based on ontology and mastery tracking; learning path metadata management and integration

**Core Deliverables:**
- Analyze prerequisite chains from fine-grained ontology
- Structured data to represent learning paths
- Management of learning path data, dynamically updated to track user progress
- User flexibility to update learning paths on the fly
- A handful of premade learning paths for the user to select from
- Generate recommendations for next logical steps
- Suggest concept reinforcement opportunities
- Update LLM prompts to suggest learning pathways to user
- Learning dashboard updates to manage learning paths and next-up objectives

**Prerequisites**: Phase 7 (fine-grained ontology) + Phase 8 (dashboard) complete

**Notes**: Builds on granular ontology structure from Phase 7; enables intelligent guidance. **A key decision** revolves around the learning experience for choosing how to move forward: if the user has a predefined learning path, it's fairly clear how to organize the dashboard; if they're more ad-hoc or veer from their original path, I'm uncertain how we set it up. When/how do we decide to present next LOs in the dashboard? Do we have a way to display the entire path? How do we "chunk" things, e.g. when starting a new path, how many LOs does the user start with? How many do we add at one time? How often do we update?

---

### Phase 10: Enhanced Diff Visualization
#### Goal
Improve code change explanations with granular details and multi-part breakdowns

**Core Deliverables:**
- Word/char-level granularity within line-by-line diffs (highlight specific changes)
- Multi-part explanation system for large code blocks
- Improved LLM prompt guidance for structured explanations
- Better visual distinction between change types

**Prerequisites**: Phase 6 diff system complete ✅

**Notes**: Orthogonal work; can be tackled independently from ontology phases

---

### Phase 11: Assessment Mode Foundation
#### Goal
Enable learning assessments without LLM assistance

**Core Deliverables:**
- UI mode that disables AI prompt/generation
- Foundation for "introduce bug, learner fixes" assessment type
- "Goal + partial project" assessment framework

**Prerequisites**: Phase 7 (fine-grained ontology) provides foundation for assessment design

**Notes**: Specific assessment types and advanced scenarios deferred

---

### Phase 12: UX Polish
#### Goal
Production-ready interface: cross-browser compatibility and accessibility

**Priority 1**
- **Cross-browser compatibility**: Testing on Chrome and Safari
- **Accessibility**: WCAG AA compliance (keyboard navigation, ARIA labels, color contrast)

**Priority 2**
- **Visual refinement**: Intuitive interface with clear feedback
- **Consistency**: Polish emoji usage, spacing, visual hierarchy

**Prerequisites**: All core functionality phases complete