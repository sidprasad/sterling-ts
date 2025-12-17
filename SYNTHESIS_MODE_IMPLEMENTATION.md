# Selector Synthesis Mode - Implementation Summary

## Overview
Implemented a complete selector synthesis workflow in Sterling that allows users to automatically generate selector expressions by providing examples across multiple instances. Supports both **unary selectors** (individual atoms) and **binary selectors** (pairs of atoms).

## Selector Types

### Unary Selectors
- Match individual atoms (e.g., `Student & Adult`, `Node & ~Leaf`)
- Used for: Styling specific types, filtering sets, highlighting elements
- Selection: Click individual atoms across instances
- API: `synthesizeAtomSelectorWithExplanation()`

### Binary Selectors
- Match pairs of atoms (e.g., `friend | coworker`, `parent.child`)
- Used for: Relationship constraints, edge styling, tuple matching
- Selection: Two-click workflow to form pairs
- API: `synthesizeBinarySelector()`

## User Workflow

### Step 1: Setup
- User clicks "Enable Synthesis Mode" toggle in Graph Layout Drawer
- **Choose selector type**: Unary or Binary (with descriptions and examples)
- Specify number of instances to load (default: 3, range: 2-10)
- System loads N instances from solver upfront

### Step 2: Example Selection
**For Unary:**
- Select atoms matching desired pattern in each instance
- Visual: Checkboxes, selected count
- Progress: N/N instances indicator

**For Binary:**
- Select pairs using two-click workflow
- First click: Highlight first atom (purple border)
- Second click: Complete pair, display with arrow icon
- Visual: List of pairs with atom badges and arrows
- Progress: N/N instances indicator

### Step 3: Synthesis
- Click "Synthesize Selector" button
- System invokes appropriate SpyTial-Core API
- Processing indicator (typically <1 second)

### Step 4: Results
- Display synthesized expression
- Show per-instance match results:
  - **Exact Match**: Selector matches exactly the selected atoms/pairs (green)
  - **Partial Match**: Some matches missing or extras included (yellow)
- **For Unary**: Visual diff of atom matches
- **For Binary**: Visual diff of pair matches with arrows
- Actions: Accept (insert into spec) or Reject (try again)

## Architecture

### State Management (`/state/synthesis/`)
- **synthesis.ts**: Core state types and interfaces
  - `SelectorType`: 'unary' | 'binary'
  - `SynthesisExample`: Captures selections per instance
    - `selectedAtomIds`: For unary selectors
    - `selectedPairs`: For binary selectors ([string, string][])
  - `SynthesisResult`: Synthesized selector with match data
    - `matchesByInstance`: For unary results
    - `pairMatchesByInstance`: For binary results
  - `SynthesisState`: Overall workflow state
- **synthesisReducers.ts**: Redux reducers for all synthesis actions
  - `enterSynthesisMode`: Accepts `selectorType` parameter
  - `updateSynthesisExample`: Handles both atom and pair updates
- **synthesisSlice.ts**: Redux toolkit slice
- **synthesisSelectors.ts**: Memoized selectors
  - `selectCanSynthesize`: Checks appropriate field based on type
  - `selectSynthesisSelectorType`: Current selector type
- Integrated into main store as `state.synthesis`

### UI Components (`/components/AppDrawer/graph/synthesis/`)
- **SynthesisModePanel.tsx**: Main orchestrator
  - Progress tracking
  - Step navigation
  - Conditional synthesis API calls (unary vs binary)
  - Conditional rendering of example collection components
  - Error handling
  
- **SynthesisSetupStep.tsx**: Initial configuration
  - **Radio group**: Select unary or binary
  - Number of instances selector (2-10)
  - Instance batch loading
  - Type-specific workflow explanations
  
- **SynthesisExampleStep.tsx**: Unary example collection
  - Atom selection interface
  - Per-instance tracking
  - Checkbox visual feedback
  
- **BinaryExampleStep.tsx**: Binary example collection
  - Two-click pair selection workflow
  - Purple highlight for first atom
  - Pair list display with arrows
  - Per-instance tracking
  
- **SynthesisResultStep.tsx**: Results display
  - Synthesized selector preview
  - Match comparison across instances
  - **Unary**: Atom badge diffs
  - **Binary**: Pair badge diffs with arrows
  - Exact vs partial match indicators
  - Accept/reject actions

### Integration
- **GraphLayoutDrawer.tsx**: Entry point
  - "Synthesize Selector" button
  - Mode switching (editor ↔ synthesis)
  - CnD spec integration

- **SpyTialGraph.tsx**: Type declarations
  - Extended `window.CndCore` with synthesis APIs:
    - `synthesizeAtomSelector()`
    - `synthesizeAtomSelectorWithExplanation()`
    - `synthesizeBinarySelector()`
  - `SGraphQueryEvaluator` for evaluation

## User Workflow

### 1. Enter Synthesis Mode
- User clicks "Synthesize Selector" in Layout Drawer
- Prompted to choose number of instances (default: 3)
- System loads N instances from Alloy XML

### 2. Collect Examples
- For each instance (1 to N):
  - User selects atoms that should match the selector
  - Can select multiple atoms per instance
  - Progress bar shows completion status
  - Navigation: Previous/Next buttons

### 3. Synthesize
- After all N examples collected:
  - "Synthesize Selector" button enabled
  - Calls `CndCore.synthesizeAtomSelectorWithExplanation()`
  - Generates selector expression (e.g., `Student & Adult`)

### 4. Review Results
- Shows synthesized selector prominently
- Displays matches per instance:
  - ✓ **Exact**: Matches exactly what user selected
  - ⚠ **Partial**: Matches some atoms, but not all
  - Shows extra matches that weren't selected
- Explanation/provenance available

### 5. Accept or Reject
- **Accept**: Inserts selector into CnD spec as comment
- **Reject**: Exits synthesis mode, can try again
- Selector ready to use in constraints/directives

## Key Features

### Multi-Instance Analysis
- Loads N instances upfront (batch loading)
- Ensures selector generalizes across multiple examples
- Prevents overfitting to single instance

### Progressive Disclosure
- Step-by-step workflow
- Clear progress indicators
- Contextual instructions at each step

### Diff Visualization
- Shows what user selected vs what selector matches
- Highlights discrepancies
- Helps user understand selector behavior

### Error Handling
- Synthesis failures gracefully handled
- Clear error messages
- Allows retry

## Technical Details

### APIs Used
```typescript
// From SpyTial-Core (window.CndCore)
synthesizeAtomSelectorWithExplanation(
  examples: Array<{
    atoms: any[];
    dataInstance: AlloyDataInstance;
  }>,
  maxDepth?: number
): {
  expression: string;
  examples: Array<{ why: any }>;
}

// Evaluation for verification
SGraphQueryEvaluator.evaluate(expression: string)
```

### Redux Actions
- `enterSynthesisMode(numInstances)` - Start workflow
- `exitSynthesisMode()` - Cancel/exit
- `synthesisInstancesLoaded(instances)` - Batch load complete
- `addSynthesisExample(example)` - User confirms selection
- `updateSynthesisExample(instanceIndex, atomIds)` - Modify selection
- `setSynthesisResult(result)` - Synthesis complete
- `setSynthesisError(error)` - Handle failures
- `synthesisStepBack()` - Navigate backward

### State Shape
```typescript
synthesis: {
  isActive: boolean;
  numInstances: number;
  currentStep: number; // 0=setup, 1-N=collection, N+1=results
  examples: SynthesisExample[];
  loadedInstances: AlloyDataInstance[];
  result: SynthesisResult | null;
  error: string | null;
  isLoading: boolean;
}
```

## Future Enhancements

### Potential Additions
1. **Binary selectors**: Support for relation/edge synthesis
2. **Negative examples**: "Don't match these atoms"
3. **Interactive refinement**: Adjust synthesis parameters
4. **Selector library**: Save/reuse common selectors
5. **Visual graph selection**: Click atoms directly in rendered graph
6. **Batch synthesis**: Generate multiple selectors at once
7. **Export/import**: Share synthesis examples

### UX Improvements
1. **Instance preview**: Show graph previews during selection
2. **Undo/redo**: Per-instance selection history
3. **Keyboard shortcuts**: Fast navigation
4. **Synthesis hints**: Suggest when synthesis might help
5. **Performance**: Handle larger instance counts (>10)

## Testing Considerations

### Test Scenarios
- [ ] Load 2, 5, 10 instances successfully
- [ ] Select atoms across all instances
- [ ] Successful synthesis with exact matches
- [ ] Partial matches handled correctly
- [ ] Synthesis failure error handling
- [ ] Exit mode at each step
- [ ] Navigate backward through steps
- [ ] Accept selector and verify CnD spec update
- [ ] Reject and retry workflow

### Edge Cases
- No atoms in instance
- All atoms selected
- Empty selection in one instance
- Synthesis times out
- CndCore not available
- Invalid Alloy XML

## Documentation

User-facing documentation should cover:
1. When to use synthesis (complex selectors)
2. How many instances to use (3-5 typical)
3. What makes good examples (diverse, representative)
4. How to read synthesis results (match accuracy)
5. Using synthesized selectors in specs

## Performance Notes
- Synthesis complexity: O(grammar_size^maxDepth)
- Default maxDepth=3 is reasonable for most cases
- Larger maxDepth may timeout (consider async with progress)
- Instance loading is synchronous (could parallelize)

---

**Status**: ✅ Fully implemented, ready for testing
**Branch**: `diff` (or appropriate feature branch)
**Next Steps**: Integration testing, user documentation, demo video
