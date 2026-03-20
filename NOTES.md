# Notes

## Utilities

It'd be nice to have an actual editor for the ontology. We can use the LO dependency graph visualizer as the starting point.

## Documentation

Live documentation playground for learning the API. For example, learning the rectangle function by seeing what each parameter does interactively. Think Companion for SwiftUI or similar.

## Diff visualization

Need a way for quick comparison before/after. Has to be inline, not side-by-side. Could be in place or below/above. May want to be more granular (word/char level diff) to add extra visual context inside the larger diff.

Need a way to break up larger additive changes if they occur in one big block. I got one really big change and the explanation was useless (just described the first LOC and comment).

## Ontology

Should we support flexible prerequisites, e.g. one-of vs. all and combinations? Would either need simple switch or full Boolean expression support. Could it be as simple as nested arrays and sets? Array means all of, set means one of?

## Learning support

### Learning paths

More granular skill tree and LLM driven paths. Tell the LLM what you want to do and it will show you the path you need to take with the concepts, and walk you through gradually.

### "Middle ground" scaffolding

Helping learners from Use through Modify towards Create. Could include some more fine-grained guidance, like sub-goals or analysis of a complex prompt to break down into mini-path. Also might be interesting to introduce code generation with partially-completed bits that learners would be required to complete: stuff that they should have already mastered based on their profile.

### Assessment mode

Consider an assessment mode that disables the prompting window entirely. On learner request, we could have the AI do one or all of:

- Modify existing code to introduce an error, then require the learner to fix it (turning off AI generation for this task)
- Supply brand-new code with errors, requiring learner to fix (again, with AI generation off)
- Supply a goal and a partially done project, and asking the learner to achieve the goal
- Recreate, from scratch, an earlier artifact (perhaps give them a browsable list of graphics pulled from their history); offer an A/B switch that will overlay the original

## Commit history

We already have a hand-rolled code history mechanism, and one pathway for adding to it is the manual "run code" button, which is essentially useless otherwise since we automatically re-run code on successful edits. We could change that button to something like "capture snapshot" and then provide a way to browse through the diff history and go back and forward in history. Because we're not going to do branching, we could make that an edit-only mode, with explicit user request to make changes from an earlier commit after warning that all future commits will be discarded.

## General feature ideas

Maybe llm/concepts on left, code in middle?

Maybe just plain Return to enter the prompt?

A Clear canvas button to empty out the Draw function

History view to see the prompts and code that was generated. Maybe this view appears over the canvas and that way you can attach to visual appearance

Highlighting individual changes within a changed line

Click on a highlighted code concept and see them highlighted in code, and maybe explained

Need a better distinction between the green and blue highlights of concepts

Somebody did text; it worked but since it’s not in my learning path it generated inside the Basic Shapes phase.

Save Image button, or maybe even render to a PNG so it can be dragged out or right-clicked

## Bugs

The LLM will sometimes carry over older code even after the learner has explicitly deleted or undone it. Let’s look at the prompt to see if it is causing issues by including the past n versions of code.

Try out generating an image based on base64 input and see what it does. A guy maxed out learning path and put in mona lisa, didn’t get anything back

## Archived roadmap ideas

Here are some objectives from older phase planning docs.

### UI and accessibility

```javascript
polish: {
    icons: 'Review current emoji icons for consistency',
    layout: 'Assess visual hierarchy and spacing issues',
    branding: 'Defer comprehensive branding to Phase 6'
} 

const accessibilityTasks = {
    keyboardNavigation: {
        modals: 'API Settings, Welcome - Tab navigation and Escape to close',
        buttons: 'All buttons accessible via Tab and Enter/Space',
        forms: 'Proper form field navigation and submission',
        menus: 'Dropdown menus navigable with arrow keys'
    },
    ariaLabels: {
        buttons: 'aria-label for icon-only buttons (🔑, 📁, etc.)',
        sections: 'role="region" with aria-labelledby for main panels',
        forms: 'aria-describedby for form validation messages',
        status: 'aria-live regions for dynamic status updates'
    },
    colorContrast: {
        audit: 'Run WCAG AA contrast checker on all text',
        fixes: 'Adjust colors that fail contrast requirements',
        focus: 'Ensure focus indicators have sufficient contrast'
    },
    focusManagement: {
        indicators: 'Visible focus rings on all interactive elements',
        trapping: 'Focus trapping in modals',
        restoration: 'Return focus to triggering element when closing modals'
    }
};
```

**Testing Approach:**
- Manual testing with keyboard-only navigation
- Screen reader testing (VoiceOver on macOS, NVDA on Windows)
- Automated accessibility testing tools
- Color contrast validation

### Learning experience

**Core Learning Experience Requirements:**
```javascript
const learningFlow = {
    onboarding: {
        welcome: 'Clear introduction to the learning approach',
        firstSteps: 'Guided creation of initial P5.js sketch',
        conceptIntro: 'Explanation of learning objectives and progression',
        aiIntroduction: 'How to effectively work with AI assistance'
    },
    progression: {
        conceptSelection: 'Intuitive way to choose what to learn next',
        objectiveClarity: 'Clear understanding of current learning goals',
        progressFeedback: 'Visible indication of learning achievements',
        nextSteps: 'Obvious pathways for continued learning'
    },
    guidance: {
        contextualHelp: 'Just-in-time assistance when needed',
        errorRecovery: 'Clear guidance when learners get stuck',
        conceptReinforcement: 'Opportunities to practice learned concepts',
        encouragement: 'Positive feedback for progress and attempts'
    }
};


**User Experience Enhancements:**
- **Tutorial Integration**: Optional guided walkthrough for new users
- **Progress Visibility**: Clear indicators of what's been learned and what's next
- **Contextual Guidance**: Helpful hints based on current learning state
- **Error Prevention**: UI design that prevents common mistakes

**Learning Analytics Integration:**
- **Stuck Detection**: Identify when learners need additional support
- **Progress Pacing**: Ensure learners aren't overwhelmed or under-challenged  
- **Concept Reinforcement**: Suggest practice opportunities for learned concepts
- **Pathway Optimization**: Recommend optimal learning sequences

**Testing with Learning Scenarios:**
```javascript
const learningScenarios = [
    'Complete beginner: no coding experience',
    'Some programming experience: new to P5.js/creative coding',
    'Art background: creative but not technical',
    'Returning user: continuing previous learning session',
    'Exploration mode: user wants to try advanced concepts early'
];
```

**Success Indicators:**
- Learners complete their first meaningful sketch within 15 minutes
- Clear understanding of how to request AI assistance effectively
- Obvious next steps available at every stage of learning
- Recovery paths available when learners encounter difficulties
- Positive reinforcement for both successful and unsuccessful attempts