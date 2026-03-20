# Architectural Decision Log

This document captures key architectural decisions made during the development of Vibe Coding Instructor, including context, alternatives considered, and reasoning.

## Decision Format

Each decision follows this structure:
- **Decision**: What was decided
- **Context**: Why this decision was needed
- **Alternatives**: Other options considered
- **Reasoning**: Why this approach was chosen
- **Consequences**: Trade-offs and implications
- **Date**: When the decision was made

---

## ADR-001: Vanilla JavaScript Over Framework

**Decision**: Use vanilla HTML/CSS/JavaScript instead of React/Vue/Angular

**Context**: Need to build a P5.js coding environment with minimal complexity and maximum iteration speed

**Alternatives**: 
- React with build tools
- Vue with Vite
- Angular with CLI

**Reasoning**: 
- Direct browser execution without build step
- Reduced complexity for rapid prototyping
- Easier integration with P5.js
- No framework learning curve for contributors

**Consequences**: 
- Manual DOM manipulation
- No component state management
- More verbose code in some areas
- Faster initial development and iteration

**Date**: Phase 1 planning

---

## ADR-002: P5.js Instance Mode

**Decision**: Use P5.js instance mode instead of global mode

**Context**: Need to safely restart sketches and avoid global variable conflicts

**Alternatives**: 
- Global P5.js mode with manual cleanup
- Multiple canvas elements
- Web Workers for isolation

**Reasoning**: 
- Prevents global namespace pollution
- Enables clean sketch restarts
- Allows multiple sketch instances
- Better error isolation

**Consequences**: 
- More complex variable binding system
- Requires custom global property mapping
- Cleaner architecture overall

**Date**: Phase 1 implementation

---

## ADR-003: Manual Learning Progress Over Automatic

**Decision**: Learner-controlled concept advancement rather than automatic progression

**Context**: Need to balance educational guidance with learner agency

**Alternatives**: 
- Automatic advancement based on code analysis
- Hybrid manual/automatic system
- External assessment integration

**Reasoning**: 
- Learners know their understanding better than algorithms
- Prevents false progression from copy-paste behavior
- Maintains learner agency and motivation
- Simpler to implement and debug

**Consequences**: 
- Requires learner to actively manage progress
- May lead to under-advancement by cautious learners
- Clearer educational intentions
- Better learner ownership of journey

**Date**: Phase 2 planning

---

## ADR-004: Vercel Proxy for LLM API

**Decision**: Use Vercel serverless function as proxy for LLM API calls

**Context**: Need to support multiple LLM providers while handling CORS and API keys

**Alternatives**: 
- Direct client-side API calls
- Dedicated backend server
- Browser extension approach

**Reasoning**: 
- Handles CORS restrictions
- Supports multiple providers (OpenAI, Anthropic, etc.)
- Serverless scaling
- User brings own API key (no cost to us)

**Consequences**: 
- Dependency on Vercel infrastructure
- API key must be configured by user
- Additional network hop
- Clean separation of concerns

**Date**: Phase 3 planning

---

## ADR-005: localStorage for Persistence

**Decision**: Use localStorage for profile and code persistence

**Context**: Need simple, reliable local storage for user data

**Alternatives**: 
- IndexedDB for complex data
- File system APIs
- Cloud storage integration

**Reasoning**: 
- Simple key-value storage sufficient for current needs
- No external dependencies
- Works across all browsers
- Immediate availability

**Consequences**: 
- Limited storage space (~5-10MB)
- No cross-device sync
- Data tied to specific browser
- Easy to implement and debug

**Date**: Phase 2 implementation

---

## ADR-006: Regex-Based Concept Detection

**Decision**: Use regex patterns to detect P5.js concepts in user code

**Context**: Need to identify which concepts learners are practicing

**Alternatives**: 
- AST parsing for semantic analysis
- Machine learning classification
- Static analysis tools

**Reasoning**: 
- Fast execution for real-time feedback
- Exact pattern matching for P5.js functions
- Easy to maintain and update patterns
- Sufficient accuracy for educational purposes

**Consequences**: 
- May miss complex usage patterns
- Requires careful pattern crafting
- Fast performance
- Maintainable by non-experts

**Date**: Phase 2 implementation

---

## ADR-007: Modular File Organization

**Decision**: Organize code into logical modules with clear separation of concerns

**Context**: Need maintainable codebase as project grows

**File Structure**: 
```
docs/js/
├── core modules (app.js, editor.js, canvas.js)
├── history/ (undo/redo functionality)
├── llm/ (AI integration)
├── progress/ (learning analytics)
└── utils/ (shared utilities)
```

**Reasoning**: 
- Clear boundaries between functional areas
- Easier to locate and modify specific features
- Supports team development
- Logical grouping of related functionality

**Consequences**: 
- More files to manage
- Clear code organization
- Easier testing and debugging
- Better maintainability

**Date**: Phase 2-3 evolution

---

## Template for New Decisions

```markdown
## ADR-XXX: [Decision Title]

**Decision**: [What was decided]

**Context**: [Why this decision was needed]

**Alternatives**: 
- [Option 1]
- [Option 2]
- [Option 3]

**Reasoning**: 
- [Reason 1]
- [Reason 2]
- [Reason 3]

**Consequences**: 
- [Trade-off 1]
- [Trade-off 2]
- [Benefit 1]
- [Benefit 2]

**Date**: [When decided]
```

---

## Decision Review Process

1. **Propose Decision**: Document the decision using the template above
2. **Review Context**: Ensure the problem and alternatives are clearly stated
3. **Evaluate Trade-offs**: Consider long-term implications
4. **Document Reasoning**: Capture why this approach was chosen
5. **Add to Log**: Include in this document with sequential ADR number
6. **Update Code**: Implement the decision and update relevant documentation