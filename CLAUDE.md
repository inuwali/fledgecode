# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibe Coding Instructor is an LLM-first coding education tool that teaches novices to code using P5.js in a progressive learning environment.

Learners use a chat interface to code in a P5.js environment. They begin by writing prompts to create projects, and gradually learn how to read and modify generated code. Over time, they learn enough to begin writing code of their own.

The system tracks the learner's current coding level, and always generates the appropriate code to avoid overloading too many unfamiliar concepts. The learner drives the process, pushing their discovery in accordance with their goals.

## Development Status

The project is published as a functional prototype with production-ready core features.

**Current Phase**: Phase 8 - Learning Dashboard Update

**Next Phase**: Phase 9 - Adaptive Learning Paths

## How to Work

1. Check development status, above, to know which development phase we're currently in, and the overall plan document (PLANNING.md) for an overview of the roadmap.
2. Read the associated phase planning document (PHASE<n>_PLAN.md) to gather information about where we are in the current phase.
3. As you interact with the user, refer as needed to additional sections in this document. *Note that the Engineering Plan Process section details how to follow plan preparation and execution.*
4. For additional context, you may refer to COMMON_PATTERNS.md and TECHNICAL_OVERVIEW.md when writing code or making architectural decisions.

**If you come across discrepancies across various documents, CALL THEM OUT TO THE USER. We should resolve those as they arise to ensure the best quality work.**

## Architecture

The system consists of three main components:
- **Ontology System**: Defines concepts, learning objectives, and goals. Tracks learner progress and current understanding level
- **Code Generation & Verification**: LLM generates P5.js code appropriate to learner level, with verification to ensure it doesn't exceed comprehension constraints
- **Browser Interface**: Local web interface with editor, LLM chat, and P5.js canvas. Features diff-based code explanations with clickable annotations

## Technical Approach

- **Progressive Learning**: Code complexity scales with learner understanding
- **Remote model via Vercel proxy**: Uses a Vercel proxy to pass requests to a user-selected provider and model, using the user-provided API key.
- **Interactive Diffs**: Code changes presented as annotated diffs for educational clarity
- **P5.js Focus**: Creative coding environment ideal for visual learning

## Engineering Plan Process

This project uses a phased development approach with detailed planning documents. Each phase has specific deliverables and success criteria.

### Creating New Plans

When creating engineering plans:

Use the PLANNING.md document as the source of truth for the overall phase guidance. When you enter the next phase of work, be sure to update the Development Status section in this document accordingly.

1. **Create a new document from the plan template** - Using PLAN_TEMPLATE.md as the canonical structure, create a PHASE<n>_PLAN.md file.
2. **Define clear deliverables** - Each phase must have specific, testable outcomes
3. **Identify prerequisites** - Explicitly state which phases must be complete
4. **Break down tasks** - Include specific components, classes, and functions to implement
5. **Plan testing approach** - Define unit tests, integration tests, and manual scenarios
6. **Set success criteria** - Include measurable metrics for completion

**Be sure to validate all decisions with the user. Don't start plan execution until consensus is achieved.**

### Executing Plans

During implementation:

1. **Follow task order** - Complete tasks in the planned sequence
2. **Track progress** - Use TodoWrite to track implementation progress
3. **Test incrementally** - Run tests as each component is completed
4. **Update status** - Mark phases as complete in PLANNING.md when done
5. **Document lessons** - Add "Lessons Learned" section after completion

**Be sure to validate all decisions with the user. Don't write code for a task until consensus is achieved.**

### Plan Maintenance

- Keep PLANNING.md updated with phase completion status
- Document any deviations from planned approach
- Add implementation lessons to completed phase documents
- Update future phase prerequisites based on actual deliverables

### Handling Deferred Work

When a phase involves tasks that are intentionally deferred to future work:

1. **Categorize Deferred Tasks in Phase Plan**
   - Create "Deferred Tasks (By Design)" section in the phase completion summary
   - Distinguish between intentional deferrals vs. incomplete tasks
   - Clearly state the rationale for deferral (e.g., "rapid prototyping approach", "needs further UX research")

2. **Document Each Deferred Task**
   - Task title and original task number
   - Clear description of what was deferred and why
   - What would be needed to complete it (design thinking, user testing, refactoring, etc.)
   - Which future phase (if known) should consider this work
   - Any temporary workarounds or current limitations

3. **Tracking Deferred Work**
   - Maintain a "Deferred Work Backlog" section in PLANNING.md if multiple phases have deferrals
   - Link each deferral to its original phase plan document
   - When planning new phases, review deferred work to see if prerequisites are now met
   - Update PLANNING.md prerequisites section if deferred work becomes relevant

4. **Example Format**
   ```
   ### Deferred Tasks (By Design)

   **Task #12: Undo/Redo Integration** - Deferred for Phase 8
   - What: Integration of diff decorations with undo/redo system
   - Why: Requires careful UX thinking and user testing to get right
   - What's needed: Research whether decorations should persist through undo/redo, testing mixed interaction flows
   - Current workaround: Decorations are cleared on user edit, which is safe but may feel heavy-handed
   ```

5. **When Reviewing Deferred Work**
   - Don't force deferred work into the next phase if prerequisites aren't met
   - Only pull in deferred tasks when they align with current phase goals
   - If a deferred task becomes a blocker for new features, escalate to planning discussion

### Phase Transition Checklist

Use this comprehensive checklist when completing a phase and transitioning to the next:

#### Pre-Transition Verification
- [ ] All planned tasks from phase plan have been completed
- [ ] All unit tests are passing
- [ ] All integration tests are passing
- [ ] Manual testing scenarios have been executed successfully
- [ ] Performance requirements are met
- [ ] Code follows established patterns and conventions

#### Documentation Updates
- [ ] Update PLANNING.md with phase completion status
- [ ] Fill "Phase Completion Summary" section in the phase plan document
- [ ] Document key lessons learned in phase plan
- [ ] Update architectural decisions in DECISIONS.md if needed
- [ ] Update this file's Development Status section

#### Code Quality Checks
- [ ] Run full test suite: `open docs/test/test.html`
- [ ] Check for console errors in browser
- [ ] Verify all new modules follow established patterns
- [ ] Ensure error handling is consistent
- [ ] Confirm localStorage persistence works correctly

#### User Experience Validation
- [ ] Test complete user flows from start to finish
- [ ] Verify UI responsiveness and feedback
- [ ] Check that learning objectives are clear and helpful
- [ ] Ensure no broken functionality from previous phases

#### Technical Debt Assessment
- [ ] Review TODO comments and technical debt items
- [ ] Identify any refactoring needs for future phases
- [ ] Document any shortcuts taken that need future attention
- [ ] Update utility functions if new patterns emerged

#### Future Phase Preparation
- [ ] Verify prerequisites for next phase are met
- [ ] Update next phase plan based on actual deliverables
- [ ] Document any API changes that affect future phases
- [ ] Ensure data structures support planned future features

#### Final Phase Closeout
- [ ] Commit all changes with descriptive commit message
- [ ] Tag release if applicable
- [ ] Update team/stakeholders on completion
- [ ] Plan celebration of milestone reached! 🎉