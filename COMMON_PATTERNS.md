## Common Patterns Reference

This section documents coding patterns, conventions, and utilities used throughout the project.

### File Organization

```
docs/
├── index.html          # Main application entry point
├── css/               # Styles and responsive design
├── js/                # JavaScript modules
│   ├── core modules   # app.js, editor.js, canvas.js, chat.js
│   ├── history/       # code-history.js, undo-manager.js, session-storage.js
│   ├── llm/           # model-manager.js
│   ├── progress/      # learning-analytics.js, progress-tracker.js
│   └── utils/         # shared utilities and import-export.js
├── test/              # Test files and runner
└── ontology/          # Learning concept hierarchy data
```

### Naming Conventions

- **Files**: kebab-case (e.g., `code-history.js`, `api-key-manager.js`)
- **Classes**: PascalCase (e.g., `LearningAnalytics`, `CodeHistory`)
- **Variables/Functions**: camelCase (e.g., `currentSketch`, `executeCode`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_TIMEOUT`, `API_ENDPOINTS`)

### Module Pattern

All modules use ES6 module syntax with clear exports:

```javascript
// Standard module pattern
class ModuleName {
    constructor(dependencies) {
        this.dependency = dependencies;
    }
    
    // Public methods
    publicMethod() {
        return this.privateMethod();
    }
    
    // Private methods (convention)
    #privateMethod() {
        // Implementation
    }
}

export default ModuleName;
```

### Error Handling Pattern

Consistent error handling with user-friendly messages:

```javascript
try {
    // Risky operation
    const result = await riskyOperation();
    return result;
} catch (error) {
    console.error('Operation failed:', error);
    this.showUserError('User-friendly error message');
    return defaultValue;
}
```

### DOM Manipulation Pattern

Use consistent DOM interaction patterns:

```javascript
// Element selection
const element = document.getElementById('specific-id');
const elements = document.querySelectorAll('.class-name');

// Event handling
element.addEventListener('click', this.handleClick.bind(this));

// Content updates
element.textContent = 'Safe text content';
element.innerHTML = sanitizedHTML; // Only with sanitized content
```

### Testing Patterns

Test files follow consistent structure:

```javascript
// Test structure
const tests = {
    'should do something': () => {
        // Arrange
        const input = setupTest();
        
        // Act
        const result = functionUnderTest(input);
        
        // Assert
        assert(result === expected, 'Expected result');
    }
};
```

### Development Commands

Common development tasks:

```bash
# Run tests
open docs/test/test.html

# View application
open docs/index.html

# Check for issues
# (no build step - pure HTML/CSS/JS)
```

### Key Utilities

- **utils.js**: Shared helper functions
- **error-handler.js**: Centralized error handling
- **import-export.js**: Data persistence utilities
- **validation.js**: Code validation for LLM integration

### P5.js Integration Patterns

Standard P5.js sketch setup:

```javascript
// Instance mode setup
const sketch = (p) => {
    p.setup = () => {
        p.createCanvas(400, 400);
    };
    
    p.draw = () => {
        p.background(220);
        // Drawing code
    };
};

// Create and manage instance
this.currentSketch = new p5(sketch, canvasContainer);
```

### Local Storage Patterns

Consistent data persistence:

```javascript
// Save data
const data = { key: 'value' };
localStorage.setItem('keyName', JSON.stringify(data));

// Load data with fallback
const loadData = () => {
    try {
        const stored = localStorage.getItem('keyName');
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.error('Failed to load data:', error);
        return defaultValue;
    }
};
```
